from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from supabase import Client

from app.analysis.schemas import (
    AuditLogOut,
    CreativeOut,
    EvaluateRequest,
    EvaluateResponse,
    RuleResultOut,
    SummaryRequest,
    SummaryResponse,
)
from app.auth.models import User
from app.config import Settings, get_settings
from app.core.analysis import analyze_performance
from app.core.kpis import summarize_kpis
from app.core.rules import AccountThresholds, evaluate
from app.dependencies import get_current_user, get_supabase

router = APIRouter(prefix="/api", tags=["analysis"])


def _get_account_thresholds(acc: dict) -> AccountThresholds:
    """Build thresholds from ad_account row.

    Schema note: ad_accounts may NOT have threshold columns (target_cpl, etc.).
    Falls back to AccountThresholds defaults when columns are absent.
    """
    return AccountThresholds(
        target_cpl=float(acc.get("target_cpl") or 0),
        waste_limit=float(acc.get("waste_limit") or 100),
        min_ctr=float(acc.get("min_ctr") or 0.8),
        max_frequency=float(acc.get("max_frequency") or 3.0),
    )


def _build_metrics(campaigns: list[dict], supabase: Client, user_id: str) -> list[dict]:
    """Fetch campaign_daily_metrics and enrich with campaign name + meta_entity_id.

    Schema adaptation: campaigns uses `name` (not `nome`),
    campaign_daily_metrics uses `owner_id` (not `user_id`).
    """
    metrics: list[dict] = []
    for camp in campaigns:
        rows = (
            supabase.table("campaign_daily_metrics")
            .select("*")
            .eq("campaign_id", camp["id"])
            .eq("owner_id", user_id)
            .execute()
            .data
        )
        for r in rows:
            r["campaign"] = camp.get("name", "Campanha sem nome")
            r["meta_entity_id"] = camp.get("meta_campaign_id")
            r["entity_level"] = "campaign"
            r["entity_name"] = camp.get("name", "Campanha sem nome")
        metrics.extend(rows)
    return metrics


@router.post("/analysis/evaluate", response_model=EvaluateResponse)
async def run_evaluation(
    body: EvaluateRequest,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Get account — schema: client_id + external_id
    acc = (
        supabase.table("ad_accounts")
        .select("id")
        .eq("client_id", user.id)
        .eq("external_id", body.act_id)
        .single()
        .execute()
        .data
    )
    thresholds = _get_account_thresholds(acc)

    # Get campaigns — schema: owner_id, name, meta_campaign_id
    campaigns = (
        supabase.table("campaigns")
        .select("id, name, meta_campaign_id")
        .eq("ad_account_id", acc["id"])
        .eq("owner_id", user.id)
        .execute()
        .data
    )

    metrics = _build_metrics(campaigns, supabase, user.id)
    alerts = evaluate(metrics, thresholds)

    return EvaluateResponse(
        alerts=[
            RuleResultOut(
                severity=a.severity,
                rule_name=a.rule_name,
                action=a.action,
                campaign=a.campaign,
                reason=a.reason,
                should_pause=a.should_pause,
                meta_entity_id=a.meta_entity_id,
            )
            for a in alerts
        ],
        total=len(alerts),
    )


@router.post("/analysis/summary", response_model=SummaryResponse)
async def run_summary(
    body: SummaryRequest,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
    settings: Settings = Depends(get_settings),
):
    # Get account — schema: client_id + external_id
    acc = (
        supabase.table("ad_accounts")
        .select("id")
        .eq("client_id", user.id)
        .eq("external_id", body.act_id)
        .single()
        .execute()
        .data
    )
    thresholds = _get_account_thresholds(acc)

    # Get campaigns — schema: owner_id, name
    campaigns = (
        supabase.table("campaigns")
        .select("id, name, meta_campaign_id")
        .eq("ad_account_id", acc["id"])
        .eq("owner_id", user.id)
        .execute()
        .data
    )

    metrics = _build_metrics(campaigns, supabase, user.id)

    result = await analyze_performance(
        metrics=metrics,
        thresholds=thresholds,
        nivel_tecnico=body.nivel_tecnico,
        anthropic_api_key=settings.anthropic_api_key,
    )

    kpis = summarize_kpis(metrics)

    return SummaryResponse(
        resumo=result.resumo,
        recomendacoes=result.recomendacoes,
        acoes=result.acoes,
        kpis={
            "total_spend": kpis.total_spend,
            "total_leads": kpis.total_leads,
            "cpl_medio": kpis.cpl_medio,
            "ctr_medio": kpis.ctr_medio,
            "tendencia": kpis.tendencia,
            "melhor_campanha": kpis.melhor_campanha,
            "pior_campanha": kpis.pior_campanha,
        },
    )


# === Creatives ===


@router.post("/creatives/upload", response_model=CreativeOut)
async def upload_creative(
    act_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Schema: client_id + external_id
    acc = (
        supabase.table("ad_accounts")
        .select("id")
        .eq("client_id", user.id)
        .eq("external_id", act_id)
        .single()
        .execute()
        .data
    )

    content_type = file.content_type or ""
    tipo = "video" if "video" in content_type else "image"
    file_bytes = await file.read()

    # Upload to Supabase Storage
    storage_path = f"{user.id}/{acc['id']}/{file.filename}"
    supabase.storage.from_("creatives").upload(storage_path, file_bytes)

    # Schema: owner_id (not user_id)
    row = (
        supabase.table("creatives")
        .insert(
            {
                "owner_id": user.id,
                "ad_account_id": acc["id"],
                "tipo": tipo,
                "storage_path": storage_path,
            }
        )
        .execute()
        .data[0]
    )

    return CreativeOut(
        id=row["id"],
        tipo=row["tipo"],
        storage_path=row["storage_path"],
        meta_hash=row.get("meta_hash"),
        meta_video_id=row.get("meta_video_id"),
    )


@router.get("/creatives", response_model=list[CreativeOut])
async def list_creatives(
    act_id: str | None = None,
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Schema: owner_id (not user_id)
    query = supabase.table("creatives").select("*").eq("owner_id", user.id)
    if act_id:
        # Schema: client_id + external_id
        acc = (
            supabase.table("ad_accounts")
            .select("id")
            .eq("client_id", user.id)
            .eq("external_id", act_id)
            .single()
            .execute()
            .data
        )
        query = query.eq("ad_account_id", acc["id"])
    rows = query.execute().data
    return [
        CreativeOut(
            id=r["id"],
            tipo=r["tipo"],
            storage_path=r["storage_path"],
            meta_hash=r.get("meta_hash"),
            meta_video_id=r.get("meta_video_id"),
        )
        for r in rows
    ]


# === Audit Log ===


@router.get("/audit-log", response_model=list[AuditLogOut])
async def list_audit_log(
    entidade: str | None = None,
    limit: int = Query(default=50, le=200),
    user: User = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    # Schema: owner_id (not user_id), criado_em exists
    query = (
        supabase.table("audit_log")
        .select("id, acao, entidade, entidade_id, criado_em")
        .eq("owner_id", user.id)
        .order("criado_em", desc=True)
        .limit(limit)
    )
    if entidade:
        query = query.eq("entidade", entidade)
    rows = query.execute().data
    return rows
