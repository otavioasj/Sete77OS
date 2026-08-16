from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from postgrest.exceptions import APIError

from ..auth import CurrentUser, get_current_user
from ..supabase_client import get_supabase_admin


router = APIRouter(prefix="/clients", tags=["clients"])


class ClientCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    source: str = "manual"
    meta_ad_account_id: str | None = None
    meta_page_id: str | None = None
    meta_instagram_account_id: str | None = None


def _default_slug(user: CurrentUser) -> str:
    prefix = (user.email or "creative").split("@", 1)[0]
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in prefix).strip("-")
    return f"{cleaned or 'creative'}-{user.id[:8]}"


def _get_or_create_organization_id(client, user: CurrentUser) -> str:
    existing = (
        client.table("organizations")
        .select("id")
        .eq("owner_user_id", user.id)
        .limit(1)
        .execute()
    )
    if existing.data:
        return existing.data[0]["id"]

    name = "Creative"
    if user.email:
        name = user.email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()

    created = (
        client.table("organizations")
        .insert({"name": name, "slug": _default_slug(user), "owner_user_id": user.id})
        .execute()
    )
    if not created.data:
        raise HTTPException(status_code=500, detail="Nao foi possivel criar organizacao.")
    return created.data[0]["id"]


@router.get("")
def list_clients(user: Annotated[CurrentUser, Depends(get_current_user)]) -> dict[str, object]:
    client = get_supabase_admin()
    result = (
        client.table("clients")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"ok": True, "clients": result.data or []}


@router.post("")
def create_client(
    payload: ClientCreate,
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> dict[str, object]:
    client = get_supabase_admin()
    organization_id = _get_or_create_organization_id(client, user)

    if payload.meta_ad_account_id:
        existing = (
            client.table("clients")
            .select("*")
            .eq("owner_id", user.id)
            .eq("meta_ad_account_id", payload.meta_ad_account_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            return {"ok": True, "client": existing.data[0], "alreadyExists": True}

    row = {
        "organization_id": organization_id,
        "owner_id": user.id,
        "name": payload.name,
        "source": payload.source,
        "meta_ad_account_id": payload.meta_ad_account_id,
        "meta_page_id": payload.meta_page_id,
        "meta_instagram_account_id": payload.meta_instagram_account_id,
    }
    try:
        result = client.table("clients").insert(row).execute()
    except APIError as exc:
        raise HTTPException(status_code=500, detail=exc.message) from exc
    if not result.data:
        raise HTTPException(status_code=500, detail="Nao foi possivel criar cliente.")
    return {"ok": True, "client": result.data[0]}
