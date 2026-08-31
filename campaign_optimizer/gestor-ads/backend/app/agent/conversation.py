# app/agent/conversation.py
from __future__ import annotations

from datetime import datetime, timezone


async def get_or_create_conversation(supabase, channel: str, channel_user_id: str) -> dict:
    """Find the conversation for this channel+user, or create a fresh one
    (owner_id/ad_account_id null until onboarding links them)."""
    existing = (
        supabase.table("conversations")
        .select("*")
        .eq("channel", channel)
        .eq("channel_user_id", channel_user_id)
        .execute()
        .data
    )
    if existing:
        return existing[0]

    row = (
        supabase.table("conversations")
        .insert({"channel": channel, "channel_user_id": channel_user_id, "owner_id": None})
        .execute()
        .data[0]
    )
    return row


async def record_message(
    supabase,
    conversation_id: str,
    papel: str,
    conteudo: str,
    *,
    media_url: str | None = None,
    transcricao: str | None = None,
    modelo_usado: str | None = None,
    tokens_input: int = 0,
    tokens_output: int = 0,
) -> None:
    supabase.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "papel": papel,
            "conteudo": conteudo,
            "media_url": media_url,
            "transcricao": transcricao,
            "modelo_usado": modelo_usado,
            "tokens_input": tokens_input,
            "tokens_output": tokens_output,
        }
    ).execute()


async def update_memory(
    supabase,
    conversation_id: str,
    *,
    resumo_memoria: str | None = None,
    memoria_negocio: dict | None = None,
) -> None:
    payload: dict = {"atualizado_em": datetime.now(timezone.utc).isoformat()}
    if resumo_memoria is not None:
        payload["resumo_memoria"] = resumo_memoria
    if memoria_negocio is not None:
        payload["memoria_negocio"] = memoria_negocio
    supabase.table("conversations").update(payload).eq("id", conversation_id).execute()


async def link_ad_account(supabase, conversation_id: str, ad_account_id: str) -> None:
    supabase.table("conversations").update({"ad_account_id": ad_account_id}).eq("id", conversation_id).execute()
