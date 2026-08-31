# app/agent/router.py
from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from supabase import Client

from app.agent.channels.base import IncomingMessage
from app.agent.channels.evolution import EvolutionAdapter
from app.agent.channels.telegram import TelegramAdapter
from app.agent.conversation import get_or_create_conversation, record_message
from app.agent.llm import run_agent_turn
from app.agent.tools import ToolContext
from app.agent.transcription import transcribe_audio
from app.config import Settings, get_settings
from app.dependencies import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["agent"])


def _adapter_for(channel: str, settings: Settings):
    if channel == "telegram":
        return TelegramAdapter(bot_token=settings.telegram_bot_token)
    return EvolutionAdapter(
        base_url=settings.evolution_base_url,
        api_key=settings.evolution_api_key,
        instance=settings.evolution_instance,
    )


async def process_incoming_message(msg: IncomingMessage, settings: Settings, supabase: Client) -> None:
    """Runs off the request/response cycle — this is what BackgroundTasks calls."""
    adapter = _adapter_for(msg.channel, settings)
    conv = await get_or_create_conversation(supabase, msg.channel, msg.channel_user_id)

    texto = msg.text or ""
    if msg.audio_bytes:
        try:
            texto = await transcribe_audio(msg.audio_bytes, settings.openai_api_key)
        except Exception:
            await adapter.send_text(msg.channel_user_id, "Não consegui entender o áudio, pode repetir em texto?")
            return

    if not conv.get("owner_id"):
        from app.auth.meta_oauth import generate_oauth_url

        url = generate_oauth_url(user_id="", conversation_id=conv["id"])
        await adapter.send_text(
            msg.channel_user_id,
            f"Oi! Pra começar, conecte sua conta Meta clicando aqui: {url}",
        )
        return

    await record_message(supabase, conv["id"], "user", texto)

    profile = (
        supabase.table("profiles").select("nivel_tecnico").eq("id", conv["owner_id"]).execute().data
    )
    nivel_tecnico = profile[0]["nivel_tecnico"] if profile else "avancado"

    ctx = ToolContext(
        supabase=supabase,
        settings=settings,
        user_id=conv["owner_id"],
        conversation_id=conv["id"],
        ad_account_id=conv.get("ad_account_id"),
    )

    meta_client = None
    if conv.get("ad_account_id"):
        from app.dependencies import build_meta_client
        from app.auth.models import User

        acc = supabase.table("ad_accounts").select("external_id").eq("id", conv["ad_account_id"]).single().execute().data
        meta_client = await build_meta_client(acc["external_id"], User(id=conv["owner_id"], email=""), supabase, settings)

    result = await run_agent_turn(
        ctx=ctx,
        meta_client=meta_client,
        resumo_memoria=conv.get("resumo_memoria", ""),
        memoria_negocio=conv.get("memoria_negocio", {}),
        historico=[],
        mensagem_atual=texto,
        nivel_tecnico=nivel_tecnico,
        anthropic_api_key=settings.anthropic_api_key,
        anthropic_workspace_id=settings.anthropic_workspace_id,
    )

    await record_message(
        supabase, conv["id"], "assistant", result["resposta"],
        modelo_usado=result["modelo_usado"], tokens_input=result["tokens_input"], tokens_output=result["tokens_output"],
    )
    await adapter.send_text(msg.channel_user_id, result["resposta"])


@router.post("/telegram/webhook")
async def telegram_webhook(
    payload: dict,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    adapter = TelegramAdapter(bot_token=settings.telegram_bot_token)
    msg = await adapter.receive_webhook(payload)
    background_tasks.add_task(process_incoming_message, msg, settings, supabase)
    return {"ok": True}


@router.post("/evolution/webhook")
async def evolution_webhook(
    payload: dict,
    background_tasks: BackgroundTasks,
    settings: Settings = Depends(get_settings),
    supabase: Client = Depends(get_supabase),
):
    adapter = EvolutionAdapter(
        base_url=settings.evolution_base_url, api_key=settings.evolution_api_key, instance=settings.evolution_instance
    )
    msg = await adapter.receive_webhook(payload)
    background_tasks.add_task(process_incoming_message, msg, settings, supabase)
    return {"ok": True}
