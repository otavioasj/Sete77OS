"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LineChart,
  LogOut,
  Megaphone,
  PlugZap,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Metric = {
  label: string;
  value: string;
  helper: string;
  tone: "green" | "amber" | "red" | "blue";
};

type MetaAdAccount = {
  id: string;
  account_id?: string;
  name: string;
  account_status?: number;
  currency?: string;
  business?: { id: string; name: string };
};

type MetaPage = {
  id: string;
  name: string;
  category?: string;
  instagram_business_account?: { id: string; username?: string; name?: string };
};

type ClientRecord = {
  id: string;
  name: string;
  source: string;
  meta_ad_account_id?: string | null;
  created_at: string;
};

type MetaAssets = {
  connected: boolean;
  businesses: { id: string; name: string; verification_status?: string }[];
  adAccounts: MetaAdAccount[];
  pages: MetaPage[];
};

type ClientSummary = {
  client: ClientRecord;
  campaigns: { id: string; name: string; status?: string; effective_status?: string; objective?: string; meta_campaign_id?: string }[];
  metrics: {
    campaign_external_id?: string | null;
    spend: number;
    leads: number;
    reach: number;
    clicks: number;
    impressions: number;
    raw_json?: { actions?: { action_type?: string; value?: string | number }[] } | null;
  }[];
  syncRuns: { id: string; status: string; started_at: string; campaigns_synced: number; metrics_synced: number; error?: string }[];
  totals: {
    spend: number;
    leads: number;
    conversations: number;
    metaResults: number;
    resultLabel: string;
    reach: number;
    clicks: number;
    impressions: number;
    cpl: number;
    costPerResult: number;
    cpm: number;
    ctr: number;
  };
};

type SyncProgress = {
  clientId: string;
  percent: number;
  label: string;
  status: "running" | "success" | "error";
};

type DatePreset = "last_30d" | "last_7d" | "maximum" | "today" | "yesterday" | "custom";

type CampaignPerformance = ClientSummary["campaigns"][number] & {
  totals: ClientSummary["totals"];
  recommendation: string;
  tone: "green" | "amber" | "red" | "blue";
};

type AiPriority = {
  campaign: CampaignPerformance;
  title: string;
  action: string;
  impact: string;
  severity: 1 | 2 | 3;
  tone: CampaignPerformance["tone"];
};

type AiRecommendation = {
  id: string;
  content: string;
  model: string;
  period: string;
  created_at: string;
};

type ActionStatus = "open" | "approved" | "rejected" | "done";

type ActionItem = {
  id: string;
  period: string;
  campaign_external_id: string;
  campaign_name: string;
  title: string;
  action: string;
  impact: string;
  severity: number;
  tone: string;
  status: ActionStatus;
  updated_at: string;
};

const datePresetLabels: Record<DatePreset, string> = {
  last_30d: "Ultimos 30 dias",
  last_7d: "Ultimos 7 dias",
  maximum: "Maximo",
  today: "Hoje",
  yesterday: "Ontem",
  custom: "Personalizado",
};

const metrics: Metric[] = [
  { label: "Investimento monitorado", value: "R$ 0,00", helper: "aguardando Meta Ads", tone: "blue" },
  { label: "Leads rastreados", value: "0", helper: "WhatsApp e formularios", tone: "green" },
  { label: "CPL medio", value: "R$ 0,00", helper: "meta por cliente", tone: "amber" },
  { label: "Risco de desperdicio", value: "0", helper: "sem campanhas conectadas", tone: "red" }
];

const navItems = [
  { label: "Visao geral", icon: LayoutDashboard },
  { label: "Clientes", icon: Users },
  { label: "Campanhas", icon: Megaphone },
  { label: "Otimizacao IA", icon: Bot },
  { label: "Relatorios", icon: BarChart3 },
  { label: "Integracoes", icon: PlugZap },
  { label: "Configuracoes", icon: Settings }
];

function readApiError(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "Erro na API.";
  const detail = "detail" in data ? (data as { detail?: unknown }).detail : data;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => readApiError(item))
      .filter(Boolean)
      .join(" | ");
  }
  if (detail && typeof detail === "object") {
    const error = "error" in detail ? (detail as { error?: unknown }).error : undefined;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error) {
      return String((error as { message?: unknown }).message || "Erro na API.");
    }
    if ("message" in detail) {
      return String((detail as { message?: unknown }).message || "Erro na API.");
    }
    try {
      return JSON.stringify(detail);
    } catch {
      return "Erro na API.";
    }
  }
  return "Erro na API.";
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionTotal(actions: { action_type?: string; value?: string | number }[] | undefined, actionTypes: string[]) {
  return (actions ?? []).reduce((total, action) => {
    return actionTypes.includes(action.action_type ?? "") ? total + numberValue(action.value) : total;
  }, 0);
}

function calculateTotals(rows: ClientSummary["metrics"]): ClientSummary["totals"] {
  const spend = rows.reduce((total, row) => total + numberValue(row.spend), 0);
  const leads = rows.reduce((total, row) => total + numberValue(row.leads), 0);
  const conversations = rows.reduce(
    (total, row) => total + actionTotal(row.raw_json?.actions, ["onsite_conversion.messaging_conversation_started_7d"]),
    0
  );
  const clicks = rows.reduce((total, row) => total + numberValue(row.clicks), 0);
  const impressions = rows.reduce((total, row) => total + numberValue(row.impressions), 0);
  const reach = rows.reduce((total, row) => total + numberValue(row.reach), 0);
  const linkClicks = rows.reduce((total, row) => total + actionTotal(row.raw_json?.actions, ["link_click"]), 0);
  const metaResults = conversations || leads || linkClicks;
  const resultLabel = conversations ? "Conversas" : leads ? "Leads" : linkClicks ? "Cliques no link" : "Resultados";

  return {
    spend,
    leads,
    conversations,
    metaResults,
    resultLabel,
    reach,
    clicks,
    impressions,
    cpl: leads ? spend / leads : 0,
    costPerResult: metaResults ? spend / metaResults : 0,
    cpm: impressions ? (spend / impressions) * 1000 : 0,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
  };
}

function campaignRecommendation(totals: ClientSummary["totals"], status?: string): { text: string; tone: CampaignPerformance["tone"] } {
  const normalizedStatus = (status ?? "").toUpperCase();
  if (!totals.spend && normalizedStatus !== "ACTIVE") return { text: "Sem dados no periodo", tone: "blue" };
  if (totals.spend > 0 && !totals.metaResults) return { text: "Revisar: gasto sem resultado", tone: "red" };
  if (totals.costPerResult > 0 && totals.costPerResult <= 8 && totals.metaResults >= 10) return { text: "Boa para escalar", tone: "green" };
  if (totals.ctr > 0 && totals.ctr < 0.8) return { text: "Criativo com baixa resposta", tone: "amber" };
  if (normalizedStatus !== "ACTIVE" && totals.metaResults > 0) return { text: "Historico bom, avaliar reativar", tone: "amber" };
  return { text: "Monitorar desempenho", tone: "blue" };
}

function buildAiPriorities(campaigns: CampaignPerformance[]): AiPriority[] {
  const priorities: AiPriority[] = [];
  campaigns.forEach((campaign) => {
    const status = (campaign.effective_status ?? campaign.status ?? "").toUpperCase();
    const spend = campaign.totals.spend;
    const resultLabel = campaign.totals.resultLabel.toLowerCase();
    if (spend > 0 && !campaign.totals.metaResults) {
      priorities.push({
        campaign,
        title: "Gasto sem resultado",
        action: "Pausar ou revisar objetivo, criativo e publico antes de aumentar verba.",
        impact: `${spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} gastos sem ${resultLabel}.`,
        severity: 3,
        tone: "red",
      });
      return;
    }
    if (campaign.totals.costPerResult > 0 && campaign.totals.costPerResult <= 8 && campaign.totals.metaResults >= 10 && status === "ACTIVE") {
      priorities.push({
        campaign,
        title: "Potencial de escala",
        action: "Aumentar orçamento de forma gradual e acompanhar custo por resultado.",
        impact: `${campaign.totals.metaResults} ${resultLabel} a ${campaign.totals.costPerResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
        severity: 1,
        tone: "green",
      });
      return;
    }
    if (campaign.totals.ctr > 0 && campaign.totals.ctr < 0.8 && spend > 0) {
      priorities.push({
        campaign,
        title: "Baixa resposta criativa",
        action: "Testar novo gancho, imagem/video e primeira linha do anuncio.",
        impact: `CTR de ${campaign.totals.ctr.toFixed(2)}% com ${campaign.totals.impressions.toLocaleString("pt-BR")} impressoes.`,
        severity: 2,
        tone: "amber",
      });
      return;
    }
    if (status !== "ACTIVE" && campaign.totals.metaResults >= 5) {
      priorities.push({
        campaign,
        title: "Historico aproveitavel",
        action: "Avaliar reativacao ou duplicar estrutura vencedora em nova campanha.",
        impact: `${campaign.totals.metaResults} ${resultLabel} no periodo analisado.`,
        severity: 2,
        tone: "amber",
      });
    }
  });
  return priorities.sort((a, b) => b.severity - a.severity || b.campaign.totals.spend - a.campaign.totals.spend);
}

function actionItemKey(period: string, campaignExternalId: string | undefined, title: string) {
  return `${period}::${campaignExternalId ?? ""}::${title}`;
}

function actionStatusLabel(status?: ActionStatus) {
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  if (status === "done") return "Concluida";
  return "Pendente";
}

function actionStatusTimestamp(item: ActionItem) {
  const date = new Date(item.updated_at);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR");
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [assets, setAssets] = useState<MetaAssets | null>(null);
  const [apiMessage, setApiMessage] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [activeView, setActiveView] = useState("Visao geral");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSummary, setClientSummary] = useState<ClientSummary | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountsOpen, setAccountsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>("last_30d");
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [aiRecommendationGenerating, setAiRecommendationGenerating] = useState(false);
  const [aiRecommendationError, setAiRecommendationError] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSavingKey, setActionSavingKey] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const firstName = useMemo(() => {
    const value = session?.user.email?.split("@")[0] ?? "Lima";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }, [session]);

  const connectedAccountIds = useMemo(
    () => new Set(clients.map((client) => client.meta_ad_account_id).filter(Boolean)),
    [clients]
  );

  const filteredAdAccounts = useMemo(() => {
    const search = accountSearch.trim().toLowerCase();
    const accounts = assets?.adAccounts ?? [];
    if (!search) return accounts;
    return accounts.filter((account) => {
      const businessName = account.business?.name ?? "";
      return `${account.name} ${account.id} ${account.account_id ?? ""} ${businessName}`.toLowerCase().includes(search);
    });
  }, [accountSearch, assets?.adAccounts]);

  const filteredCampaigns = useMemo(() => {
    const search = campaignSearch.trim().toLowerCase();
    return (clientSummary?.campaigns ?? []).filter((campaign) => {
      const status = (campaign.effective_status ?? campaign.status ?? "").toUpperCase();
      const isActive = status === "ACTIVE";
      const matchesStatus =
        campaignStatusFilter === "all" ||
        (campaignStatusFilter === "active" && isActive) ||
        (campaignStatusFilter === "inactive" && !isActive);
      const matchesSearch = !search || `${campaign.name} ${campaign.objective ?? ""} ${status}`.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [campaignSearch, campaignStatusFilter, clientSummary?.campaigns]);

  const displayedTotals = useMemo(() => {
    if (!clientSummary) return null;
    const selectedIds = new Set(selectedCampaignIds);
    if (!selectedIds.size || selectedIds.size === clientSummary.campaigns.length) {
      const hasCampaignFilter = campaignStatusFilter !== "all" || Boolean(campaignSearch.trim());
      if (!hasCampaignFilter) return clientSummary.totals;
      const visibleCampaignIds = new Set(filteredCampaigns.map((campaign) => campaign.meta_campaign_id).filter(Boolean));
      return calculateTotals(clientSummary.metrics.filter((row) => visibleCampaignIds.has(row.campaign_external_id ?? "")));
    }
    return calculateTotals(clientSummary.metrics.filter((row) => selectedIds.has(row.campaign_external_id ?? "")));
  }, [campaignSearch, campaignStatusFilter, clientSummary, filteredCampaigns, selectedCampaignIds]);

  const campaignRows = useMemo<CampaignPerformance[]>(() => {
    if (!clientSummary) return [];
    return filteredCampaigns.map((campaign) => {
      const rows = clientSummary.metrics.filter((row) => row.campaign_external_id === campaign.meta_campaign_id);
      const totals = calculateTotals(rows);
      const recommendation = campaignRecommendation(totals, campaign.effective_status ?? campaign.status);
      return { ...campaign, totals, recommendation: recommendation.text, tone: recommendation.tone };
    });
  }, [clientSummary, filteredCampaigns]);

  const aiPriorities = useMemo(() => buildAiPriorities(campaignRows), [campaignRows]);

  const actionItemByKey = useMemo(() => {
    const items = new Map<string, ActionItem>();
    actionItems.forEach((item) => {
      items.set(actionItemKey(item.period, item.campaign_external_id, item.title), item);
    });
    return items;
  }, [actionItems]);

  const actionStats = useMemo(() => {
    return actionItems.reduce(
      (stats, item) => {
        stats.total += 1;
        stats[item.status] += 1;
        return stats;
      },
      { total: 0, open: 0, approved: 0, rejected: 0, done: 0 } as Record<ActionStatus | "total", number>
    );
  }, [actionItems]);

  const latestActionItems = useMemo(() => actionItems.slice(0, 5), [actionItems]);

  const selectedCampaignCount = selectedCampaignIds.length;

  function applyCampaignStatusFilter(nextFilter: "all" | "active" | "inactive") {
    setCampaignStatusFilter(nextFilter);
    if (!clientSummary) return;
    const search = campaignSearch.trim().toLowerCase();
    const nextCampaigns = clientSummary.campaigns.filter((campaign) => {
      const status = (campaign.effective_status ?? campaign.status ?? "").toUpperCase();
      const isActive = status === "ACTIVE";
      const matchesStatus =
        nextFilter === "all" ||
        (nextFilter === "active" && isActive) ||
        (nextFilter === "inactive" && !isActive);
      const matchesSearch = !search || `${campaign.name} ${campaign.objective ?? ""} ${status}`.toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
    setSelectedCampaignIds(nextCampaigns.map((campaign) => campaign.meta_campaign_id).filter((id): id is string => Boolean(id)));
  }

  function periodSearchParams(preset = datePreset) {
    const params = new URLSearchParams({ date_preset: preset });
    if (preset === "custom") {
      if (customSince) params.set("since", customSince);
      if (customUntil) params.set("until", customUntil);
    }
    return params.toString();
  }

  function periodKey(preset = datePreset) {
    return preset === "custom" ? `custom:${customSince}:${customUntil}` : preset;
  }

  function periodLabel(preset = datePreset) {
    return preset === "custom" ? `${customSince} a ${customUntil}` : datePresetLabels[preset];
  }

  function syncPeriodPayload() {
    return {
      date_preset: datePreset,
      since: datePreset === "custom" ? customSince || null : null,
      until: datePreset === "custom" ? customUntil || null : null,
    };
  }

  async function changeDatePreset(nextPreset: DatePreset) {
    setDatePreset(nextPreset);
    if (selectedClientId && nextPreset !== "custom") {
      await loadClientSummary(selectedClientId, nextPreset);
    }
  }

  useEffect(() => {
    if (!session) return;
    void refreshWorkspace(session);
  }, [session]);

  async function apiFetch(path: string, init?: RequestInit) {
    if (!session?.access_token) throw new Error("Sessao expirada.");
    const response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init?.headers ?? {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(readApiError(data));
    }
    return data;
  }

  async function refreshWorkspace(activeSession = session) {
    if (!activeSession?.access_token) return;
    setApiLoading(true);
    setApiMessage("");
    try {
      const [clientsData, assetsData] = await Promise.all([
        fetch("/api/clients", {
          headers: { Authorization: `Bearer ${activeSession.access_token}` }
        }).then((response) => response.json()),
        fetch("/api/meta/assets", {
          headers: { Authorization: `Bearer ${activeSession.access_token}` }
        }).then((response) => response.json())
      ]);
      setClients(clientsData.clients ?? []);
      setAssets({
        connected: Boolean(assetsData.connected),
        businesses: assetsData.businesses ?? [],
        adAccounts: assetsData.adAccounts ?? [],
        pages: assetsData.pages ?? []
      });
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "Nao foi possivel carregar dados.");
    } finally {
      setApiLoading(false);
    }
  }

  async function connectMeta() {
    setApiLoading(true);
    setApiMessage("");
    try {
      const data = await apiFetch("/meta/oauth/start");
      window.location.href = data.url;
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "Nao foi possivel iniciar conexao Meta.");
      setApiLoading(false);
    }
  }

  async function createClientFromAdAccount(account: MetaAdAccount) {
    setApiLoading(true);
    setApiMessage("");
    try {
      const result = await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          name: account.name,
          source: "meta",
          meta_ad_account_id: account.id
        })
      });
      setApiMessage(result.alreadyExists ? "Cliente ja estava cadastrado." : "Cliente criado.");
      await refreshWorkspace();
      setActiveView("Clientes");
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "Nao foi possivel criar cliente.");
    } finally {
      setApiLoading(false);
    }
  }

  async function loadClientSummary(clientId: string, preset = datePreset) {
    setSelectedClientId(clientId);
    setApiLoading(true);
    setApiMessage("");
    setAiRecommendation(null);
    setAiRecommendationError("");
    try {
      const data = await apiFetch(`/meta/summary/${clientId}?${periodSearchParams(preset)}`);
      setClientSummary(data);
      setSelectedCampaignIds((data.campaigns ?? []).map((campaign: ClientSummary["campaigns"][number]) => campaign.meta_campaign_id).filter(Boolean));
      setCampaignStatusFilter("all");
      setCampaignSearch("");
      setHistoryOpen(false);
      void loadAiRecommendation(clientId, preset);
      void loadActionItems(clientId, preset);
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "Nao foi possivel carregar o cliente.");
    } finally {
      setApiLoading(false);
    }
  }

  async function loadAiRecommendation(clientId: string, preset = datePreset) {
    setAiRecommendationLoading(true);
    try {
      const data = await apiFetch(`/optimize/${clientId}?period=${encodeURIComponent(periodKey(preset))}`);
      setAiRecommendation(data.recommendation ?? null);
    } catch {
      setAiRecommendation(null);
    } finally {
      setAiRecommendationLoading(false);
    }
  }

  async function loadActionItems(clientId: string, preset = datePreset) {
    try {
      const data = await apiFetch(`/actions/${clientId}?period=${encodeURIComponent(periodKey(preset))}`);
      setActionItems(data.actions ?? []);
      setActionMessage("");
    } catch (error) {
      setActionItems([]);
      setActionMessage(error instanceof Error ? error.message : "Nao foi possivel carregar a central de acoes.");
    }
  }

  async function saveActionDecision(priority: AiPriority, status: ActionStatus) {
    if (!selectedClientId) return;
    const key = actionItemKey(periodKey(), priority.campaign.meta_campaign_id, priority.title);
    setActionSavingKey(key);
    setActionMessage("");
    try {
      const data = await apiFetch(`/actions/${selectedClientId}`, {
        method: "POST",
        body: JSON.stringify({
          period: periodKey(),
          campaign_external_id: priority.campaign.meta_campaign_id ?? "",
          campaign_name: priority.campaign.name,
          title: priority.title,
          action: priority.action,
          impact: priority.impact,
          severity: priority.severity,
          tone: priority.tone,
          status,
        }),
      });
      const saved = data.action as ActionItem;
      setActionItems((current) => {
        const next = current.filter((item) => actionItemKey(item.period, item.campaign_external_id, item.title) !== key);
        return [saved, ...next];
      });
      setActionMessage(`Acao ${actionStatusLabel(status).toLowerCase()} registrada.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Nao foi possivel salvar a decisao.");
    } finally {
      setActionSavingKey("");
    }
  }

  async function generateAiRecommendation() {
    if (!selectedClientId || !clientSummary || !displayedTotals) return;
    setAiRecommendationGenerating(true);
    setAiRecommendationError("");
    try {
      const data = await apiFetch(`/optimize/${selectedClientId}`, {
        method: "POST",
        body: JSON.stringify({
          period: periodKey(),
          period_label: periodLabel(),
          client_name: clientSummary.client.name,
          totals: {
            spend: displayedTotals.spend,
            metaResults: displayedTotals.metaResults,
            resultLabel: displayedTotals.resultLabel,
            costPerResult: displayedTotals.costPerResult,
            ctr: displayedTotals.ctr,
            cpm: displayedTotals.cpm,
            cpl: displayedTotals.cpl,
            reach: displayedTotals.reach,
            clicks: displayedTotals.clicks,
            impressions: displayedTotals.impressions
          },
          priorities: aiPriorities.map((priority) => ({
            campaign_name: priority.campaign.name,
            title: priority.title,
            action: priority.action,
            impact: priority.impact,
            severity: priority.severity
          }))
        })
      });
      setAiRecommendation(data.recommendation ?? null);
    } catch (error) {
      setAiRecommendationError(error instanceof Error ? error.message : "Nao foi possivel gerar o plano de acao.");
    } finally {
      setAiRecommendationGenerating(false);
    }
  }

  async function syncClient(clientId: string, campaignIds: string[] = []) {
    setSelectedClientId(clientId);
    setApiLoading(true);
    setSyncProgress({ clientId, percent: 8, label: "Preparando sincronizacao", status: "running" });
    setApiMessage("Sincronizando Meta Ads...");
    const steps = [
      { percent: 18, label: "Validando conexao Meta" },
      { percent: 34, label: "Buscando campanhas" },
      { percent: 52, label: "Lendo metricas dos ultimos 30 dias" },
      { percent: 72, label: "Salvando dados no Supabase" },
      { percent: 88, label: "Consolidando resumo" },
    ];
    let stepIndex = 0;
    const progressTimer = window.setInterval(() => {
      setSyncProgress((current) => {
        if (!current || current.clientId !== clientId) return current;
        const next = steps[Math.min(stepIndex, steps.length - 1)];
        stepIndex += 1;
        if (current.percent >= 92) return current;
        return {
          clientId,
          percent: Math.max(current.percent + 1, next.percent),
          label: next.label,
          status: "running",
        };
      });
    }, 900);
    try {
      const result = await apiFetch(`/meta/sync/${clientId}`, {
        method: "POST",
        body: JSON.stringify({ campaign_ids: campaignIds, ...syncPeriodPayload() }),
      });
      window.clearInterval(progressTimer);
      setSyncProgress({ clientId, percent: 100, label: "Sincronizacao concluida", status: "success" });
      setApiMessage(`Sincronizacao concluida: ${result.campaignsSynced} campanhas e ${result.metricsSynced} metricas.`);
      await refreshWorkspace();
      await loadClientSummary(clientId);
    } catch (error) {
      window.clearInterval(progressTimer);
      const errorMessage = error instanceof Error ? error.message : "Nao foi possivel sincronizar.";
      setSyncProgress((current) =>
        current && current.clientId === clientId
          ? { ...current, percent: Math.max(current.percent, 100), label: `Erro: ${errorMessage}`, status: "error" }
          : { clientId, percent: 100, label: `Erro: ${errorMessage}`, status: "error" }
      );
      setApiMessage(errorMessage);
    } finally {
      setApiLoading(false);
      window.setTimeout(() => {
        setSyncProgress((current) => current?.clientId === clientId && current.status === "success" ? null : current);
      }, 2400);
    }
  }

  async function submitAuth() {
    setLoading(true);
    setMessage("");

    const action =
      mode === "signin"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

    const { error } = await action;
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(mode === "signin" ? "Login feito." : "Conta criada. Confira o email se o Supabase pedir confirmacao.");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const periodControls = (
    <div className="period-toolbar">
      <label className="select-field">
        Periodo
        <select value={datePreset} onChange={(event) => changeDatePreset(event.target.value as DatePreset)}>
          <option value="last_30d">{datePresetLabels.last_30d}</option>
          <option value="last_7d">{datePresetLabels.last_7d}</option>
          <option value="maximum">{datePresetLabels.maximum}</option>
          <option value="today">{datePresetLabels.today}</option>
          <option value="yesterday">{datePresetLabels.yesterday}</option>
          <option value="custom">{datePresetLabels.custom}</option>
        </select>
      </label>
      {datePreset === "custom" ? (
        <>
          <label className="date-field">
            De
            <input type="date" value={customSince} onChange={(event) => setCustomSince(event.target.value)} />
          </label>
          <label className="date-field">
            Ate
            <input type="date" value={customUntil} onChange={(event) => setCustomUntil(event.target.value)} />
          </label>
          <button className="ghost-button" onClick={() => selectedClientId && loadClientSummary(selectedClientId)} disabled={apiLoading || !customSince || !customUntil}>
            Aplicar
          </button>
        </>
      ) : null}
    </div>
  );

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-brand">
          <div className="brand-mark">C</div>
          <p className="eyebrow">Creative Campaign OS</p>
          <h1>O painel de decisao para gestor de trafego vender mais tempo.</h1>
          <p className="auth-copy">
            Conecte Meta Ads, Google Ads, WhatsApp e IA em um fluxo simples: diagnostico, recomendacao, relatorio e acao.
          </p>
          <div className="auth-proof">
            <span><ShieldCheck size={18} /> Supabase conectado</span>
            <span><Sparkles size={18} /> IA pronta para analise</span>
            <span><Gauge size={18} /> Base SaaS escalavel</span>
          </div>
        </section>

        <section className="auth-card">
          <div>
            <p className="eyebrow">Acesso</p>
            <h2>{mode === "signin" ? "Entrar no painel" : "Criar primeira conta"}</h2>
          </div>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@creative.com" />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="minimo 6 caracteres"
            />
          </label>
          <button className="primary-button" onClick={submitAuth} disabled={loading || !email || !password}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
            <ChevronRight size={18} />
          </button>
          <button className="link-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Ainda nao tenho conta" : "Ja tenho conta"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">C</div>
          <div>
            <strong>Creative</strong>
            <span>Campaign OS</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={activeView === item.label ? "nav-item active" : "nav-item"}
              onClick={() => setActiveView(item.label)}
              title={item.label}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <CheckCircle2 size={18} />
          <div>
            <strong>Supabase ativo</strong>
            <span>Auth e banco conectados</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Bom trabalho, {firstName}</p>
            <h1>{activeView}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button"><Search size={18} /> Buscar</button>
            <button className="ghost-button" onClick={signOut}><LogOut size={18} /> Sair</button>
          </div>
        </header>

        {activeView === "Visao geral" ? (
          <>
          <section className="hero-panel">
          <div>
            <p className="eyebrow">Prioridade da semana</p>
            <h2>Conectar Meta Ads e transformar dados em decisoes diarias.</h2>
            <p>
              A V1 ja nasce com login, multi-cliente, metricas, recomendacoes, relatorios e logs de acao. O proximo passo e trazer dados reais da Meta.
            </p>
          </div>
          <div className="hero-actions">
            <button className="primary-button" onClick={connectMeta} disabled={apiLoading}>
              <PlugZap size={18} /> Conectar Meta Ads
            </button>
            <button className="secondary-button"><Target size={18} /> Criar cliente</button>
          </div>
          </section>

          <section className="metric-grid">
          {metrics.map((metric) => (
            <article className={`metric-card ${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.helper}</small>
            </article>
          ))}
          </section>
          </>
        ) : null}

        {activeView === "Clientes" ? (
          <section className="panel table-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Clientes</p>
                <h3>{clients.length} clientes cadastrados</h3>
              </div>
              <button className="ghost-button" onClick={() => refreshWorkspace()} disabled={apiLoading}>
                <Activity size={18} /> Atualizar
              </button>
            </div>
            {apiMessage ? <p className="form-message">{apiMessage}</p> : null}
            {syncProgress ? (
              <div className={`sync-progress ${syncProgress.status}`}>
                <div className="sync-progress-head">
                  <strong>{clients.find((client) => client.id === syncProgress.clientId)?.name ?? "Cliente"}</strong>
                  <span>{syncProgress.percent}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${syncProgress.percent}%` }} />
                </div>
                <small>{syncProgress.label}</small>
              </div>
            ) : null}
            <div className="data-table">
              <div className="data-row header">
                <span>Cliente</span>
                <span>Origem</span>
                <span>Conta Meta</span>
                <span>Criado em</span>
                <span>Acoes</span>
              </div>
              {clients.map((client) => (
                <div className="data-row" key={client.id}>
                  <strong>{client.name}</strong>
                  <span>{client.source === "meta" ? "Meta Ads" : "Manual"}</span>
                  <span>{client.meta_ad_account_id ?? "-"}</span>
                  <span>{new Date(client.created_at).toLocaleDateString("pt-BR")}</span>
                  <span className="row-actions">
                    <button className="ghost-button" onClick={() => loadClientSummary(client.id)} disabled={apiLoading}>
                      Ver
                    </button>
                    <button className="ghost-button" onClick={() => syncClient(client.id)} disabled={apiLoading || !client.meta_ad_account_id}>
                      {syncProgress?.clientId === client.id ? `${syncProgress.percent}%` : "Sincronizar"}
                    </button>
                  </span>
                </div>
              ))}
              {!clients.length ? <p className="muted">Nenhum cliente cadastrado ainda.</p> : null}
            </div>
          </section>
        ) : null}

        {activeView === "Clientes" && clientSummary ? (
          <section className="content-grid">
            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Resumo Meta</p>
                  <h3>{clientSummary.client.name}</h3>
                  {campaignStatusFilter !== "all" || campaignSearch.trim() || selectedCampaignCount !== clientSummary.campaigns.length ? (
                    <span className="summary-filter-note">Resumo acompanha campanhas selecionadas e filtro atual</span>
                  ) : null}
                </div>
                <LineChart size={21} />
              </div>
              {periodControls}
              <div className="metric-grid compact">
                <article className="metric-card green">
                  <span>Resultados</span>
                  <strong>{displayedTotals?.metaResults ?? 0}</strong>
                  <small>{displayedTotals?.resultLabel ?? "Resultados"}</small>
                </article>
                <article className="metric-card amber">
                  <span>Custo por resultado</span>
                  <strong>{(displayedTotals?.costPerResult ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  <small>{displayedTotals?.resultLabel ?? "Resultados"}</small>
                </article>
                <article className="metric-card blue">
                  <span>Valor gasto</span>
                  <strong>{(displayedTotals?.spend ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  <small>{datePresetLabels[datePreset]}</small>
                </article>
                <article className="metric-card green">
                  <span>Conversas</span>
                  <strong>{displayedTotals?.conversations ?? 0}</strong>
                  <small>WhatsApp / mensagens</small>
                </article>
                <article className="metric-card amber">
                  <span>Leads</span>
                  <strong>{displayedTotals?.leads ?? 0}</strong>
                  <small>formularios</small>
                </article>
                <article className="metric-card blue">
                  <span>Alcance</span>
                  <strong>{(displayedTotals?.reach ?? 0).toLocaleString("pt-BR")}</strong>
                  <small>{(displayedTotals?.impressions ?? 0).toLocaleString("pt-BR")} impressoes</small>
                </article>
                <article className="metric-card red">
                  <span>CPM</span>
                  <strong>{(displayedTotals?.cpm ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  <small>custo por 1.000 impressoes</small>
                </article>
                <article className="metric-card red">
                  <span>CTR / Cliques</span>
                  <strong>{(displayedTotals?.ctr ?? 0).toFixed(2)}%</strong>
                  <small>{(displayedTotals?.clicks ?? 0).toLocaleString("pt-BR")} cliques</small>
                </article>
              </div>
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Sincronizacoes</p>
                  <h3>Historico</h3>
                </div>
                <button className="icon-button" onClick={() => setHistoryOpen((open) => !open)} title={historyOpen ? "Fechar historico" : "Abrir historico"}>
                  <ChevronRight size={19} className={historyOpen ? "chevron open" : "chevron"} />
                </button>
              </div>
              {historyOpen ? (
                <div className="compact-list">
                  {clientSummary.syncRuns.map((run) => (
                    <div key={run.id}>
                      <strong>{run.status}</strong>
                      <span>{run.campaigns_synced} campanhas - {run.metrics_synced} metricas</span>
                      {run.error ? <small>{run.error}</small> : null}
                    </div>
                  ))}
                  {!clientSummary.syncRuns.length ? <p className="muted">Nenhuma sincronizacao registrada.</p> : null}
                </div>
              ) : (
                <p className="muted compact-muted">
                  {clientSummary.syncRuns[0]
                    ? `${clientSummary.syncRuns[0].status} - ${clientSummary.syncRuns[0].campaigns_synced} campanhas, ${clientSummary.syncRuns[0].metrics_synced} metricas`
                    : "Nenhuma sincronizacao registrada."}
                </p>
              )}
            </article>

            <article className="panel wide">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Campanhas</p>
                  <h3>{filteredCampaigns.length} de {clientSummary.campaigns.length} campanhas</h3>
                </div>
                <button
                  className="ghost-button"
                  onClick={() => syncClient(clientSummary.client.id, selectedCampaignIds)}
                  disabled={apiLoading || !selectedCampaignCount}
                >
                  <Activity size={17} /> Sincronizar selecionadas
                </button>
              </div>
              <div className="campaign-toolbar">
                <label className="search-field">
                  <Search size={16} />
                  <input value={campaignSearch} onChange={(event) => setCampaignSearch(event.target.value)} placeholder="Pesquisar campanha" />
                </label>
                <div className="segmented-control" aria-label="Filtro de status">
                  <button className={campaignStatusFilter === "all" ? "active" : ""} onClick={() => applyCampaignStatusFilter("all")}>Todas</button>
                  <button className={campaignStatusFilter === "active" ? "active" : ""} onClick={() => applyCampaignStatusFilter("active")}>Ativas</button>
                  <button className={campaignStatusFilter === "inactive" ? "active" : ""} onClick={() => applyCampaignStatusFilter("inactive")}>Inativas</button>
                </div>
                <div className="selection-actions">
                  <span>{selectedCampaignCount} selecionadas</span>
                  <button
                    className="link-button"
                    onClick={() => setSelectedCampaignIds(filteredCampaigns.map((campaign) => campaign.meta_campaign_id).filter((id): id is string => Boolean(id)))}
                  >
                    Marcar visiveis
                  </button>
                  <button className="link-button" onClick={() => setSelectedCampaignIds([])}>
                    Limpar
                  </button>
                </div>
              </div>
              <div className="compact-list">
                {filteredCampaigns.map((campaign) => {
                  const metaCampaignId = campaign.meta_campaign_id ?? "";
                  const checked = Boolean(metaCampaignId && selectedCampaignIds.includes(metaCampaignId));
                  return (
                  <div className="selectable-row" key={campaign.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!metaCampaignId}
                        onChange={(event) => {
                          setSelectedCampaignIds((current) =>
                            event.target.checked
                              ? Array.from(new Set([...current, metaCampaignId]))
                              : current.filter((id) => id !== metaCampaignId)
                          );
                        }}
                      />
                      <span>
                        <strong>{campaign.name}</strong>
                        <small>{campaign.effective_status ?? campaign.status ?? "sem status"} {campaign.objective ? `- ${campaign.objective}` : ""}</small>
                      </span>
                    </label>
                  </div>
                  );
                })}
                {!clientSummary.campaigns.length ? <p className="muted">Sincronize o cliente para carregar campanhas.</p> : null}
                {clientSummary.campaigns.length > 0 && !filteredCampaigns.length ? <p className="muted">Nenhuma campanha encontrada com esse filtro.</p> : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "Integracoes" ? (
          <section className="content-grid">
          <article className="panel wide">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Meta Ads</p>
                <h3>{filteredAdAccounts.length} de {assets?.adAccounts.length ?? 0} contas</h3>
              </div>
              <button className="icon-button" onClick={() => setAccountsOpen((open) => !open)} title={accountsOpen ? "Fechar contas" : "Abrir contas"}>
                <ChevronRight size={19} className={accountsOpen ? "chevron open" : "chevron"} />
              </button>
            </div>
            {apiMessage ? <p className="form-message">{apiMessage}</p> : null}
            {!assets?.connected ? (
              <div className="empty-state">
                <p className="muted">Conecte pelo Facebook para carregar BMs, contas de anuncio, paginas e Instagram.</p>
                <button className="primary-button" onClick={connectMeta} disabled={apiLoading}>
                  <PlugZap size={18} /> Entrar com Facebook
                </button>
              </div>
            ) : (
              <>
                <label className="search-field account-search">
                  <Search size={16} />
                  <input value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Pesquisar conta, BM ou ID" />
                </label>
                {accountsOpen ? (
                  <div className="asset-list collapsible-list">
                    {filteredAdAccounts.map((account) => (
                      <div className="asset-row" key={account.id}>
                      <div>
                          <strong>{account.name}</strong>
                          <p>{account.id} {account.currency ? `- ${account.currency}` : ""}</p>
                          {account.business ? <small>{account.business.name}</small> : null}
                        </div>
                        <button
                          className="ghost-button"
                          onClick={() => createClientFromAdAccount(account)}
                          disabled={apiLoading || connectedAccountIds.has(account.id)}
                        >
                          <Users size={17} /> {connectedAccountIds.has(account.id) ? "Cliente criado" : "Criar cliente"}
                        </button>
                      </div>
                    ))}
                    {!filteredAdAccounts.length ? <p className="muted">Nenhuma conta encontrada.</p> : null}
                  </div>
                ) : (
                  <p className="muted compact-muted">Lista recolhida. Use a busca e abra quando quiser selecionar uma conta.</p>
                )}
              </>
            )}
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Clientes</p>
                <h3>{clients.length} cadastrados</h3>
              </div>
              <Users size={21} />
            </div>
            <div className="compact-list">
              {clients.slice(0, 8).map((client) => (
                <div key={client.id}>
                  <strong>{client.name}</strong>
                  <span>{client.source === "meta" ? "Meta Ads" : "Manual"}</span>
                </div>
              ))}
              {!clients.length ? <p className="muted">Crie clientes a partir das contas Meta conectadas.</p> : null}
            </div>
          </article>
          </section>
        ) : null}

        {activeView === "Campanhas" ? (
          <section className="panel table-panel campaigns-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Campanhas</p>
                <h3>{clientSummary ? `${campaignRows.length} campanhas analisadas` : "Selecione um cliente"}</h3>
              </div>
              <button className="ghost-button" onClick={() => selectedClientId && syncClient(selectedClientId)} disabled={apiLoading || !selectedClientId}>
                <Activity size={18} /> Sincronizar Meta
              </button>
            </div>
            <div className="campaigns-controls">
              <label className="select-field">
                Cliente
                <select value={selectedClientId} onChange={(event) => event.target.value && loadClientSummary(event.target.value)}>
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
              {periodControls}
            </div>
            {apiMessage ? <p className="form-message">{apiMessage}</p> : null}
            {clientSummary ? (
              <>
                <div className="campaign-toolbar">
                  <label className="search-field">
                    <Search size={16} />
                    <input value={campaignSearch} onChange={(event) => setCampaignSearch(event.target.value)} placeholder="Pesquisar campanha" />
                  </label>
                  <div className="segmented-control" aria-label="Filtro de status">
                    <button className={campaignStatusFilter === "all" ? "active" : ""} onClick={() => applyCampaignStatusFilter("all")}>Todas</button>
                    <button className={campaignStatusFilter === "active" ? "active" : ""} onClick={() => applyCampaignStatusFilter("active")}>Ativas</button>
                    <button className={campaignStatusFilter === "inactive" ? "active" : ""} onClick={() => applyCampaignStatusFilter("inactive")}>Inativas</button>
                  </div>
                  <button className="ghost-button" onClick={() => syncClient(clientSummary.client.id, selectedCampaignIds)} disabled={apiLoading || !selectedCampaignCount}>
                    <Activity size={17} /> Sincronizar selecionadas
                  </button>
                </div>
                <div className="campaign-performance-table">
                  <div className="campaign-performance-row header">
                    <span>Campanha</span>
                    <span>Status</span>
                    <span>Gasto</span>
                    <span>Resultados</span>
                    <span>Custo</span>
                    <span>Conversas</span>
                    <span>Leads</span>
                    <span>CTR</span>
                    <span>CPM</span>
                    <span>Analise</span>
                  </div>
                  {campaignRows.map((campaign) => (
                    <div className="campaign-performance-row" key={campaign.id}>
                      <strong>{campaign.name}</strong>
                      <span>{campaign.effective_status ?? campaign.status ?? "-"}</span>
                      <span>{campaign.totals.spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      <span>{campaign.totals.metaResults} {campaign.totals.resultLabel}</span>
                      <span>{campaign.totals.costPerResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      <span>{campaign.totals.conversations.toLocaleString("pt-BR")}</span>
                      <span>{campaign.totals.leads.toLocaleString("pt-BR")}</span>
                      <span>{campaign.totals.ctr.toFixed(2)}%</span>
                      <span>{campaign.totals.cpm.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      <span className={`insight-pill ${campaign.tone}`}>{campaign.recommendation}</span>
                    </div>
                  ))}
                  {!campaignRows.length ? <p className="muted">Nenhuma campanha encontrada para o filtro atual.</p> : null}
                </div>
              </>
            ) : (
              <p className="muted compact-muted">Abra um cliente na aba Clientes ou escolha acima para carregar campanhas e metricas.</p>
            )}
          </section>
        ) : null}

        {activeView === "Otimizacao IA" ? (
          <section className="content-grid">
            <article className="panel wide ai-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Otimizacao IA</p>
                  <h3>{clientSummary ? clientSummary.client.name : "Diagnostico por cliente"}</h3>
                </div>
                <Bot size={22} />
              </div>
              <div className="campaigns-controls">
                <label className="select-field">
                  Cliente
                  <select value={selectedClientId} onChange={(event) => event.target.value && loadClientSummary(event.target.value)}>
                    <option value="">Selecione</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                {periodControls}
              </div>
              {!clientSummary ? (
                <p className="muted compact-muted">Selecione um cliente para gerar prioridades com base nas campanhas sincronizadas.</p>
              ) : (
                <>
                  <div className="ai-summary-grid">
                    <div>
                      <span>Prioridades</span>
                      <strong>{aiPriorities.length}</strong>
                    </div>
                    <div>
                      <span>Gasto analisado</span>
                      <strong>{(displayedTotals?.spend ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                    <div>
                      <span>Resultados</span>
                      <strong>{displayedTotals?.metaResults ?? 0}</strong>
                    </div>
                    <div>
                      <span>Custo medio</span>
                      <strong>{(displayedTotals?.costPerResult ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                    </div>
                  </div>
                  <div className="ai-priority-list">
                    {actionMessage ? <p className="form-message">{actionMessage}</p> : null}
                    {aiPriorities.map((priority) => {
                      const itemKey = actionItemKey(periodKey(), priority.campaign.meta_campaign_id, priority.title);
                      const savedAction = actionItemByKey.get(itemKey);
                      const isSaving = actionSavingKey === itemKey;
                      return (
                        <article className={`ai-priority ${priority.tone}`} key={`${priority.campaign.id}-${priority.title}`}>
                          <div>
                            <span>{priority.title}</span>
                            <strong>{priority.campaign.name}</strong>
                            <p>{priority.impact}</p>
                            <div className={`action-status ${savedAction?.status ?? "open"}`}>
                              {savedAction?.status === "done" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                              {actionStatusLabel(savedAction?.status)}
                            </div>
                          </div>
                          <div>
                            <small>Acao sugerida</small>
                            <p>{priority.action}</p>
                            <div className="action-buttons">
                              <button className="ghost-button" onClick={() => saveActionDecision(priority, "approved")} disabled={isSaving}>
                                Aprovar
                              </button>
                              <button className="ghost-button" onClick={() => saveActionDecision(priority, "rejected")} disabled={isSaving}>
                                Rejeitar
                              </button>
                              <button className="ghost-button" onClick={() => saveActionDecision(priority, "done")} disabled={isSaving}>
                                Concluir
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                    {!aiPriorities.length ? <p className="muted">Nenhuma prioridade critica encontrada para o filtro atual.</p> : null}
                  </div>

                  <div className="ai-plan">
                    <div className="ai-plan-head">
                      <div>
                        <span>Plano de acao com IA</span>
                        {aiRecommendation ? (
                          <strong>Gerado em {new Date(aiRecommendation.created_at).toLocaleString("pt-BR")}</strong>
                        ) : null}
                      </div>
                      <button className="secondary-button" onClick={generateAiRecommendation} disabled={aiRecommendationGenerating}>
                        <Sparkles size={16} />
                        {aiRecommendationGenerating ? "Gerando..." : aiRecommendation ? "Atualizar plano" : "Gerar plano de acao"}
                      </button>
                    </div>
                    {aiRecommendationError ? <p className="ai-plan-error">{aiRecommendationError}</p> : null}
                    {aiRecommendation ? (
                      <div className="ai-plan-body">
                        {aiRecommendation.content.split(/\n{2,}/).map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>
                    ) : aiRecommendationLoading ? (
                      <p className="muted compact-muted">Verificando plano salvo...</p>
                    ) : !aiRecommendationGenerating ? (
                      <p className="muted compact-muted">Gere um plano de acao consultivo em cima das prioridades acima.</p>
                    ) : null}
                  </div>
                </>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Central de acoes</p>
                  <h3>Historico do periodo</h3>
                </div>
                <CheckCircle2 size={21} />
              </div>
              <div className="action-stat-grid">
                <div>
                  <span>Pendentes</span>
                  <strong>{actionStats.open}</strong>
                </div>
                <div>
                  <span>Aprovadas</span>
                  <strong>{actionStats.approved}</strong>
                </div>
                <div>
                  <span>Concluidas</span>
                  <strong>{actionStats.done}</strong>
                </div>
                <div>
                  <span>Rejeitadas</span>
                  <strong>{actionStats.rejected}</strong>
                </div>
              </div>
              <div className="action-history-list">
                {latestActionItems.map((item) => (
                  <div className="action-history-item" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.campaign_name}</span>
                    </div>
                    <div className={`action-status ${item.status}`}>
                      {item.status === "done" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      {actionStatusLabel(item.status)}
                    </div>
                    <small>{actionStatusTimestamp(item)}</small>
                  </div>
                ))}
                {!latestActionItems.length ? (
                  <p className="muted compact-muted">As decisoes aprovadas, rejeitadas ou concluidas aparecem aqui.</p>
                ) : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeView === "Visao geral" ? (
          <section className="content-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Financeiro</p>
                <h3>Saldo e custo</h3>
              </div>
              <CreditCard size={21} />
            </div>
            <div className="mini-chart">
              <span style={{ height: "42%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "36%" }} />
              <span style={{ height: "82%" }} />
              <span style={{ height: "55%" }} />
            </div>
          </article>

          <article className="panel wide">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Paginas e Instagram</p>
                <h3>Canais disponiveis</h3>
              </div>
              <Activity size={21} />
            </div>
            <div className="channel-grid">
              {(assets?.pages ?? []).map((page) => (
                <div className="channel-item" key={page.id}>
                  <strong>{page.name}</strong>
                  <span>{page.category ?? "Pagina"}</span>
                  {page.instagram_business_account ? <small>@{page.instagram_business_account.username ?? page.instagram_business_account.id}</small> : null}
                </div>
              ))}
              {assets?.connected && !assets.pages.length ? <p className="muted">Nenhuma pagina retornada pela Meta.</p> : null}
              {!assets?.connected ? <p className="muted">Os canais aparecem depois da conexao com Facebook.</p> : null}
            </div>
          </article>
          </section>
        ) : null}

        {activeView === "Relatorios" ? (
          <section className="panel table-panel report-panel">
            <div className="panel-head report-toolbar">
              <div>
                <p className="eyebrow">Relatorio executivo</p>
                <h3>{clientSummary ? clientSummary.client.name : "Selecione um cliente"}</h3>
              </div>
              <div className="topbar-actions">
                <button className="ghost-button" onClick={() => selectedClientId && syncClient(selectedClientId)} disabled={apiLoading || !selectedClientId}>
                  <Activity size={18} /> Sincronizar
                </button>
                <button className="ghost-button" onClick={() => window.print()} disabled={!clientSummary}>
                  <BarChart3 size={18} /> Imprimir
                </button>
              </div>
            </div>
            <div className="campaigns-controls no-print">
              <label className="select-field">
                Cliente
                <select value={selectedClientId} onChange={(event) => event.target.value && loadClientSummary(event.target.value)}>
                  <option value="">Selecione</option>
                  {clients.map((client) => (
                    <option value={client.id} key={client.id}>{client.name}</option>
                  ))}
                </select>
              </label>
              {periodControls}
            </div>
            {apiMessage ? <p className="form-message no-print">{apiMessage}</p> : null}
            {!clientSummary || !displayedTotals ? (
              <p className="muted compact-muted">Escolha um cliente para montar o relatorio com dados sincronizados, recomendacoes e acoes registradas.</p>
            ) : (
              <div className="report-document">
                <div className="report-cover">
                  <div>
                    <p className="eyebrow">Creative Campaign OS</p>
                    <h2>{clientSummary.client.name}</h2>
                    <span>{periodLabel()} - gerado em {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                  <div className="brand-mark small">C</div>
                </div>

                <div className="report-metrics">
                  <div>
                    <span>Investimento</span>
                    <strong>{displayedTotals.spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  </div>
                  <div>
                    <span>{displayedTotals.resultLabel}</span>
                    <strong>{displayedTotals.metaResults.toLocaleString("pt-BR")}</strong>
                  </div>
                  <div>
                    <span>Custo medio</span>
                    <strong>{displayedTotals.costPerResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                  </div>
                  <div>
                    <span>CTR</span>
                    <strong>{displayedTotals.ctr.toFixed(2)}%</strong>
                  </div>
                </div>

                <section className="report-section">
                  <div className="report-section-head">
                    <p className="eyebrow">Resumo</p>
                    <h3>Leitura do periodo</h3>
                  </div>
                  {aiRecommendation ? (
                    <div className="report-copy">
                      {aiRecommendation.content.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Gere o plano de acao na aba Otimizacao IA para incluir uma leitura consultiva neste relatorio.</p>
                  )}
                </section>

                <section className="report-section">
                  <div className="report-section-head">
                    <p className="eyebrow">Trabalho executado</p>
                    <h3>Acoes e decisoes</h3>
                  </div>
                  <div className="report-action-grid">
                    {actionItems.map((item) => (
                      <div className="report-action-item" key={item.id}>
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.campaign_name}</span>
                        </div>
                        <p>{item.action}</p>
                        <div className={`action-status ${item.status}`}>{actionStatusLabel(item.status)}</div>
                      </div>
                    ))}
                    {!actionItems.length ? <p className="muted">Nenhuma acao registrada para este periodo.</p> : null}
                  </div>
                </section>

                <section className="report-section">
                  <div className="report-section-head">
                    <p className="eyebrow">Campanhas</p>
                    <h3>Principais leituras</h3>
                  </div>
                  <div className="report-campaign-list">
                    {campaignRows.slice(0, 8).map((campaign) => (
                      <div className="report-campaign-item" key={campaign.id}>
                        <strong>{campaign.name}</strong>
                        <span>{campaign.totals.spend.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} - {campaign.totals.metaResults} {campaign.totals.resultLabel}</span>
                        <small>{campaign.recommendation}</small>
                      </div>
                    ))}
                    {!campaignRows.length ? <p className="muted">Nenhuma campanha encontrada para o filtro atual.</p> : null}
                  </div>
                </section>
              </div>
            )}
          </section>
        ) : null}

        {!["Visao geral", "Clientes", "Campanhas", "Otimizacao IA", "Integracoes", "Relatorios"].includes(activeView) ? (
          <section className="panel table-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Em desenvolvimento</p>
                <h3>{activeView}</h3>
              </div>
              <Settings size={21} />
            </div>
            <p className="muted">Esta area sera habilitada na proxima etapa, depois da sincronizacao de campanhas e metricas.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
