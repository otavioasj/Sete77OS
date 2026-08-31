"""Agent tools — thin async wrappers the WhatsApp agent calls to act on Meta
ad accounts: list/select accounts, pull KPI summaries, pause campaigns."""

from __future__ import annotations

from dataclasses import dataclass

from app.agent.conversation import link_ad_account
from app.core.kpis import summarize_kpis
from app.meta.client import MetaAdsClient
from app.shared.exceptions import DraftValidationError, NotFoundError

# action_type substrings (Meta insights "actions" array) counted as leads.
LEAD_ACTION_TERMS = ("lead", "messaging_conversation_started")


@dataclass
class ToolContext:
    """Everything a tool needs, assembled once per agent turn."""

    supabase: object
    settings: object
    user_id: str
    conversation_id: str
    ad_account_id: str | None


async def listar_contas(ctx: ToolContext) -> dict:
    rows = (
        ctx.supabase.table("ad_accounts")
        .select("id,name,external_id")
        .eq("client_id", ctx.user_id)
        .execute()
        .data
    )
    return {"contas": rows}


async def selecionar_conta(ctx: ToolContext, *, conta: str) -> dict:
    """Resolve the user's answer (a number from the listed order, or a
    name/partial name) to an ad_account_id, and link it to the conversation."""
    rows = (
        ctx.supabase.table("ad_accounts")
        .select("id,name,external_id")
        .eq("client_id", ctx.user_id)
        .execute()
        .data
    )
    if not rows:
        raise NotFoundError("Nenhuma conta de anúncio encontrada.")

    chosen = None
    if conta.strip().isdigit():
        idx = int(conta.strip()) - 1
        if 0 <= idx < len(rows):
            chosen = rows[idx]
    else:
        matches = [r for r in rows if conta.lower() in r["name"].lower()]
        if len(matches) == 1:
            chosen = matches[0]
        elif len(matches) > 1:
            names = ", ".join(m["name"] for m in matches)
            raise DraftValidationError(f"Encontrei mais de uma conta com esse nome ({names}). Qual delas?")

    if chosen is None:
        raise NotFoundError(f"Não encontrei a conta '{conta}'. Tente o número da lista ou o nome exato.")

    await link_ad_account(ctx.supabase, ctx.conversation_id, chosen["id"])
    return {"ad_account_id": chosen["id"], "name": chosen["name"]}


def _normalize_insight_row(row: dict) -> dict:
    """Map a raw Meta insights row (actions array, string numerics) to the
    flat shape `summarize_kpis` expects."""
    return {
        "campaign": row.get("campaign_name", "?"),
        "spend": row.get("spend", 0),
        "leads": MetaAdsClient._extract_metric(row.get("actions"), LEAD_ACTION_TERMS),
        "clicks": row.get("clicks", 0),
        "impressions": row.get("impressions", 0),
    }


async def consultar_metricas(ctx: ToolContext, meta_client: MetaAdsClient) -> dict:
    insights = await meta_client.get_insights(meta_client.act_id)
    normalized = [_normalize_insight_row(row) for row in insights]
    kpis = summarize_kpis(normalized)
    return {
        "total_spend": kpis.total_spend,
        "total_leads": kpis.total_leads,
        "cpl_medio": kpis.cpl_medio,
        "ctr_medio": kpis.ctr_medio,
        "tendencia": kpis.tendencia,
    }


async def pausar_campanha(ctx: ToolContext, meta_client: MetaAdsClient, *, campanha_id: str) -> dict:
    await meta_client.update_status(campanha_id, "PAUSED")
    return {"campanha_id": campanha_id, "status": "PAUSED"}
