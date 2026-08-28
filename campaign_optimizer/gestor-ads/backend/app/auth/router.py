from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, Query
from supabase import Client

from app.auth.meta_oauth import generate_oauth_url, validate_state
from app.auth.models import (
    AuthResponse,
    LoginRequest,
    MetaCallbackResponse,
    MetaOAuthURL,
    RegisterRequest,
    User,
)
from app.dependencies import get_current_user, get_supabase, get_token_manager
from app.meta.token_manager import TokenManager
from app.shared.exceptions import AppError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
async def register(
    body: RegisterRequest,
    supabase: Client = Depends(get_supabase),
):
    try:
        result = supabase.auth.sign_up(
            {"email": body.email, "password": body.password, "options": {"data": {"nome": body.nome}}}
        )
        if not result.user:
            raise AppError("Erro ao criar conta", meta={"detail": "Supabase signup failed"})
        return AuthResponse(
            access_token=result.session.access_token if result.session else "",
            user_id=str(result.user.id),
            email=result.user.email or body.email,
        )
    except Exception as exc:
        if isinstance(exc, AppError):
            raise
        raise AppError(f"Erro ao criar conta: {exc}")


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    supabase: Client = Depends(get_supabase),
):
    try:
        result = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
        return AuthResponse(
            access_token=result.session.access_token,
            user_id=str(result.user.id),
            email=result.user.email or body.email,
        )
    except Exception as exc:
        raise AppError("Email ou senha incorretos", meta={"detail": str(exc)})


@router.get("/meta/login", response_model=MetaOAuthURL)
async def meta_login(user: User = Depends(get_current_user)):
    url = generate_oauth_url(user.id)
    return MetaOAuthURL(url=url)


@router.get("/meta/callback", response_model=MetaCallbackResponse)
async def meta_callback(
    code: str = Query(...),
    state: str = Query(...),
    supabase: Client = Depends(get_supabase),
    tm: TokenManager = Depends(get_token_manager),
):
    # Validate state token
    try:
        user_id = validate_state(state)
    except ValueError as exc:
        raise AppError(str(exc))

    # Exchange code for long-lived token
    pair = await tm.exchange_code(code)
    encrypted = tm.encrypt(pair.access_token)

    # Get Meta user info
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://graph.facebook.com/v23.0/me",
            params={"access_token": pair.access_token, "fields": "id,name"},
        )
        meta_user = resp.json()

    # Save connection — schema uses owner_id + access_token + expires_at
    supabase.table("meta_connections").upsert(
        {
            "owner_id": user_id,
            "meta_user_id": meta_user["id"],
            "meta_user_name": meta_user.get("name", ""),
            "access_token": encrypted,
            "expires_at": pair.expires_at.isoformat(),
            "scopes": ["ads_management", "ads_read", "business_management", "pages_show_list"],
        },
        on_conflict="owner_id,meta_user_id",
    ).execute()

    # List ad accounts (returned for display; saved to ad_accounts when client is created)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            "https://graph.facebook.com/v23.0/me/adaccounts",
            params={
                "access_token": pair.access_token,
                "fields": "id,name,account_status,currency,timezone_name,business",
            },
        )
        accounts_data = resp.json().get("data", [])

    found_accounts = [
        {"act_id": acc["id"], "nome": acc.get("name", "")}
        for acc in accounts_data
    ]

    return MetaCallbackResponse(
        success=True,
        accounts_found=len(found_accounts),
        accounts=found_accounts,
    )
