from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError

from ..auth import CurrentUser, get_current_user
from ..config import Settings, get_settings
from ..supabase_client import get_supabase_admin


router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


def _graph_url(settings: Settings, path: str) -> str:
    return f"https://graph.facebook.com/{settings.meta_api_version}/{path.lstrip('/')}"


def _error_message(detail: Any) -> str:
    if isinstance(detail, dict):
        error = detail.get("error")
        if isinstance(error, dict):
            return str(error.get("message") or error)
        return str(detail.get("message") or detail)
    return str(detail)


def _is_meta_rate_limit(detail: Any) -> bool:
    if not isinstance(detail, dict):
        return False
    error = detail.get("error")
    if not isinstance(error, dict):
        return False
    return str(error.get("code")) == "4" or "Application request limit reached" in str(error.get("message") or "")


async def _graph_get_all(path: str, access_token: str, fields: str | None = None) -> list[dict[str, Any]]:
    settings = get_settings()
    query: dict[str, str] = {"access_token": access_token, "limit": "100"}
    if fields:
        query["fields"] = fields

    rows: list[dict[str, Any]] = []
    url = _graph_url(settings, path)
    async with httpx.AsyncClient(timeout=30) as client:
        while url:
            response = await client.get(url, params=query)
            query = {}
            if response.status_code >= 400:
                detail = response.json()
                if _is_meta_rate_limit(detail):
                    raise HTTPException(
                        status_code=429,
                        detail="A Meta limitou temporariamente as chamadas do app. Aguarde alguns minutos e tente Atualizar WhatsApp novamente.",
                    )
                raise HTTPException(status_code=502, detail=_error_message(detail))
            data = response.json()
            rows.extend(data.get("data", []))
            url = data.get("paging", {}).get("next", "")
    return rows


def _update_or_insert(client, table: str, match: dict[str, Any], row: dict[str, Any]) -> dict[str, Any]:
    existing = client.table(table).select("id").match(match).limit(1).execute()
    if existing.data:
        result = client.table(table).update(row).eq("id", existing.data[0]["id"]).execute()
    else:
        result = client.table(table).insert({**match, **row}).execute()
    return (result.data or [{}])[0]


def _empty_status(schema_ready: bool, meta_connected: bool, message: str) -> dict[str, object]:
    return {
        "ok": True,
        "schemaReady": schema_ready,
        "connected": meta_connected,
        "source": "meta",
        "businessAccounts": [],
        "phoneNumbers": [],
        "pages": [],
        "linkedClients": [],
        "message": message,
    }


def _cached_whatsapp_assets(admin, user_id: str) -> dict[str, list[dict[str, Any]]]:
    business_accounts = (
        admin.table("whatsapp_business_accounts")
        .select("waba_id,business_id,name,ownership_type,timezone_id,currency,created_at,updated_at")
        .eq("owner_id", user_id)
        .order("name")
        .execute()
    )
    phone_numbers = (
        admin.table("whatsapp_phone_numbers")
        .select("waba_id,phone_number_id,display_phone_number,verified_name,quality_rating,platform_type,code_verification_status,updated_at")
        .eq("owner_id", user_id)
        .order("display_phone_number")
        .execute()
    )
    return {
        "businessAccounts": business_accounts.data or [],
        "phoneNumbers": phone_numbers.data or [],
    }


def _has_recent_whatsapp_cache(assets: dict[str, list[dict[str, Any]]]) -> bool:
    rows = [*assets.get("businessAccounts", []), *assets.get("phoneNumbers", [])]
    if not rows:
        return False
    latest: datetime | None = None
    for row in rows:
        updated_at = row.get("updated_at")
        if not updated_at:
            continue
        try:
            parsed = datetime.fromisoformat(str(updated_at).replace("Z", "+00:00"))
        except ValueError:
            continue
        latest = parsed if latest is None or parsed > latest else latest
    return bool(latest and latest >= datetime.now(UTC) - timedelta(minutes=15))


@router.get("/status")
def whatsapp_status(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, object]:
    admin = get_supabase_admin()
    meta_connection = (
        admin.table("meta_connections")
        .select("id,created_at")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    meta_connected = bool(meta_connection.data)
    try:
        pages = (
            admin.table("meta_pages")
            .select("meta_page_id,name,category,meta_instagram_account_id,instagram_username,created_at")
            .eq("owner_id", user.id)
            .order("name")
            .execute()
        )
        assets = _cached_whatsapp_assets(admin, user.id)
        clients = (
            admin.table("clients")
            .select("id,name,meta_page_id,meta_instagram_account_id")
            .eq("owner_id", user.id)
            .execute()
        )
    except APIError:
        return _empty_status(
            False,
            meta_connected,
            "Aplique o schema de WhatsApp no Supabase para salvar contas e numeros.",
        )

    linked_clients = [client for client in (clients.data or []) if client.get("meta_page_id")]
    return {
        "ok": True,
        "schemaReady": True,
        "connected": meta_connected,
        "source": "meta",
        "businessAccounts": assets["businessAccounts"],
        "phoneNumbers": assets["phoneNumbers"],
        "pages": pages.data or [],
        "linkedClients": linked_clients,
        "message": "WhatsApp fica conectado pela Meta. Atualize para buscar WABAs e numeros do Business Manager.",
    }


@router.post("/refresh")
async def refresh_whatsapp_assets(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, object]:
    admin = get_supabase_admin()
    connection = (
        admin.table("meta_connections")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not connection.data:
        raise HTTPException(status_code=400, detail="Conecte a Meta antes de atualizar WhatsApp.")

    try:
        cached_assets = _cached_whatsapp_assets(admin, user.id)
        if _has_recent_whatsapp_cache(cached_assets):
            return {
                "ok": True,
                "cached": True,
                "businessAccountsSynced": len(cached_assets["businessAccounts"]),
                "phoneNumbersSynced": len(cached_assets["phoneNumbers"]),
                "businessAccounts": cached_assets["businessAccounts"],
                "phoneNumbers": cached_assets["phoneNumbers"],
                "message": "Dados WhatsApp recentes reutilizados para evitar limite temporario da Meta.",
            }
    except APIError:
        pass

    token = connection.data[0]["access_token"]
    try:
        businesses = await _graph_get_all("me/businesses", token, fields="id,name,verification_status")
    except HTTPException as exc:
        if exc.status_code == 429:
            raise exc
        raise HTTPException(status_code=502, detail=_error_message(exc.detail)) from exc
    saved_wabas: list[dict[str, Any]] = []
    saved_numbers: list[dict[str, Any]] = []
    seen_wabas: set[str] = set()

    for business in businesses:
        business_id = business.get("id")
        if not business_id:
            continue
        for edge, ownership_type in (
            ("owned_whatsapp_business_accounts", "owned"),
            ("client_whatsapp_business_accounts", "client"),
        ):
            try:
                wabas = await _graph_get_all(
                    f"{business_id}/{edge}",
                    token,
                    fields="id,name,timezone_id,currency,message_template_namespace",
                )
            except HTTPException:
                continue
            for waba in wabas:
                waba_id = str(waba.get("id") or "")
                if not waba_id or waba_id in seen_wabas:
                    continue
                seen_wabas.add(waba_id)
                saved_waba = _update_or_insert(
                    admin,
                    "whatsapp_business_accounts",
                    {"owner_id": user.id, "waba_id": waba_id},
                    {
                        "business_id": business_id,
                        "name": waba.get("name") or f"WhatsApp Business {waba_id}",
                        "ownership_type": ownership_type,
                        "timezone_id": waba.get("timezone_id"),
                        "currency": waba.get("currency"),
                        "message_template_namespace": waba.get("message_template_namespace"),
                        "raw": {**waba, "business": business, "edge": edge},
                        "updated_at": datetime.now(UTC).isoformat(),
                    },
                )
                saved_wabas.append(saved_waba)
                try:
                    phone_numbers = await _graph_get_all(
                        f"{waba_id}/phone_numbers",
                        token,
                        fields="id,display_phone_number,verified_name,quality_rating,platform_type,code_verification_status",
                    )
                except HTTPException:
                    continue
                for number in phone_numbers:
                    phone_number_id = str(number.get("id") or "")
                    if not phone_number_id:
                        continue
                    saved_number = _update_or_insert(
                        admin,
                        "whatsapp_phone_numbers",
                        {"owner_id": user.id, "phone_number_id": phone_number_id},
                        {
                            "waba_id": waba_id,
                            "display_phone_number": number.get("display_phone_number") or "",
                            "verified_name": number.get("verified_name") or "",
                            "quality_rating": number.get("quality_rating"),
                            "platform_type": number.get("platform_type"),
                            "code_verification_status": number.get("code_verification_status"),
                            "raw": number,
                            "updated_at": datetime.now(UTC).isoformat(),
                        },
                    )
                    saved_numbers.append(saved_number)

    return {
        "ok": True,
        "businessAccountsSynced": len(saved_wabas),
        "phoneNumbersSynced": len(saved_numbers),
        "businessAccounts": saved_wabas,
        "phoneNumbers": saved_numbers,
    }
