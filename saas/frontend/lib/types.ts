/* ======================================================================
   Shared types — Gestor Ads frontend
   ====================================================================== */

export type AuthData = {
  access_token: string;
  user_id: string;
  email: string;
};

export type AdAccount = {
  id: string;
  external_id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
};

export type Campaign = {
  id: string;
  meta_campaign_id?: string;
  name: string;
  objective?: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
};

export type RuleAlert = {
  severity: string;
  rule_name: string;
  action: string;
  campaign: string;
  reason: string;
  should_pause: boolean;
  meta_entity_id?: string;
};

export type SummaryKpis = {
  total_spend: number;
  total_leads: number;
  cpl_medio: number;
  ctr_medio: number;
  tendencia: string;
  melhor_campanha: string;
  pior_campanha: string;
};

export type AISummary = {
  resumo: string;
  recomendacoes: string[];
  acoes: string[];
  kpis: SummaryKpis;
};

export type AuditEntry = {
  id: string;
  acao: string;
  entidade: string;
  entidade_id?: string;
  criado_em: string;
};

export type SyncResult = {
  campaigns_synced: number;
  metrics_upserted: number;
  errors: { campaign: string; error: string }[];
};

export type NavSection = "dashboard" | "campaigns" | "analysis" | "audit";
