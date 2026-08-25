from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from ..auth import CurrentUser, get_current_user
from ..supabase_client import get_supabase_admin


router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


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
    pages = (
        admin.table("meta_pages")
        .select("meta_page_id,name,category,meta_instagram_account_id,instagram_username,created_at")
        .eq("owner_id", user.id)
        .order("name")
        .execute()
    )
    clients = (
        admin.table("clients")
        .select("id,name,meta_page_id,meta_instagram_account_id")
        .eq("owner_id", user.id)
        .execute()
    )
    linked_clients = [client for client in (clients.data or []) if client.get("meta_page_id")]
    return {
        "ok": True,
        "connected": bool(meta_connection.data),
        "source": "meta",
        "pages": pages.data or [],
        "linkedClients": linked_clients,
        "message": "WhatsApp e mensagens sao lidos pelas acoes de conversa da Meta Ads quando a campanha envia para mensagens.",
    }
