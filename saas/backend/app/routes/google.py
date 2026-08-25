from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Annotated, Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from postgrest.exceptions import APIError

from ..auth import CurrentUser, get_current_user
from ..config import Settings, get_settings
from ..supabase_client import get_supabase_admin


router = APIRouter(prefix="/google-ads", tags=["google-ads"])


def _redirect_uri(settings: Settings) -> str:
    return f"{settings.app_url.rstrip('/')}/api/google-ads/oauth/callback"


def _sign_state(payload: dict[str, Any], secret: str) -> str:
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"


def _read_state(state: str, secret: str) -> dict[str, Any]:
    try:
        body, signature = state.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="State invalido.") from exc

    expected = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=400, detail="State invalido.")

    padded = body + "=" * (-len(body) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    if int(payload.get("exp", 0)) < int(time.time()):
        raise HTTPException(status_code=400, detail="State expirado.")
    return payload


def _missing_google_settings(settings: Settings) -> list[str]:
    return [
        name
        for name, value in {
            "GOOGLE_ADS_CLIENT_ID": settings.google_ads_client_id,
            "GOOGLE_ADS_CLIENT_SECRET": settings.google_ads_client_secret,
            "GOOGLE_ADS_DEVELOPER_TOKEN": settings.google_ads_developer_token,
            "SUPABASE_SECRET_KEY": settings.supabase_secret_key,
        }.items()
        if not value
    ]


def _require_google_settings(settings: Settings) -> None:
    missing = _missing_google_settings(settings)
    if missing:
        raise HTTPException(status_code=500, detail=f"Configure: {', '.join(missing)}.")


@router.get("/status")
def google_ads_status(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, object]:
    settings = get_settings()
    missing = _missing_google_settings(settings)
    admin = get_supabase_admin()
    try:
        connection = (
            admin.table("google_ads_connections")
            .select("id,google_user_email,scopes,created_at,updated_at")
            .eq("owner_id", user.id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        accounts = (
            admin.table("google_ads_customer_accounts")
            .select("customer_id,descriptive_name,currency_code,time_zone,manager,created_at")
            .eq("owner_id", user.id)
            .order("descriptive_name")
            .execute()
        )
        schema_ready = True
    except APIError:
        connection = None
        accounts = None
        schema_ready = False
    return {
        "ok": True,
        "schemaReady": schema_ready,
        "configured": not missing,
        "missing": [*missing, *([] if schema_ready else ["SUPABASE_SCHEMA_GOOGLE_ADS"])],
        "connected": bool(connection and connection.data),
        "connection": ((connection.data or [None])[0] if connection else None),
        "accounts": accounts.data if accounts else [],
    }


@router.get("/oauth/start")
def start_google_ads_oauth(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, str]:
    settings = get_settings()
    _require_google_settings(settings)
    state = _sign_state(
        {
            "user_id": user.id,
            "nonce": secrets.token_urlsafe(16),
            "exp": int(time.time()) + 600,
        },
        settings.google_ads_client_secret,
    )
    params = {
        "client_id": settings.google_ads_client_id,
        "redirect_uri": _redirect_uri(settings),
        "response_type": "code",
        "scope": " ".join(settings.google_ads_scope_list),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"}


@router.get("/oauth/callback")
async def google_ads_oauth_callback(
    code: str = Query(default=""),
    state: str = Query(default=""),
    error: str = Query(default=""),
    error_description: str = Query(default=""),
) -> RedirectResponse:
    settings = get_settings()
    _require_google_settings(settings)
    frontend_url = settings.app_url.rstrip("/")

    if error:
        return RedirectResponse(f"{frontend_url}/?google_ads=error&message={urlencode({'m': error_description or error})}")

    payload = _read_state(state, settings.google_ads_client_secret)
    user_id = payload["user_id"]

    async with httpx.AsyncClient(timeout=20) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_ads_client_id,
                "client_secret": settings.google_ads_client_secret,
                "redirect_uri": _redirect_uri(settings),
                "grant_type": "authorization_code",
                "code": code,
            },
        )
        if token_response.status_code >= 400:
            return RedirectResponse(f"{frontend_url}/?google_ads=error")

        token_data = token_response.json()
        profile_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )

    profile = profile_response.json() if profile_response.status_code == 200 else {}
    admin = get_supabase_admin()
    admin.table("google_ads_connections").upsert(
        {
            "owner_id": user_id,
            "google_user_id": profile.get("id") or "",
            "google_user_email": profile.get("email") or "",
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token", ""),
            "expires_at": None,
            "scopes": settings.google_ads_scope_list,
        },
        on_conflict="owner_id,google_user_id",
    ).execute()

    return RedirectResponse(f"{frontend_url}/?google_ads=connected")
