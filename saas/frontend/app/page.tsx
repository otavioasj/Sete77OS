"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Calculator,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileDown,
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
  monthly_budget?: number | null;
  target_cpl?: number | null;
  account_manager?: string | null;
  business_goal?: string | null;
  qualified_lead_definition?: string | null;
  created_at: string;
};

type MetaAssets = {
  connected: boolean;
  businesses: { id: string; name: string; verification_status?: string }[];
  adAccounts: MetaAdAccount[];
  pages: MetaPage[];
};

type CampaignMetric = {
  campaign_external_id?: string | null;
  campaign_name?: string | null;
  campaign?: string | null;
  platform?: string | null;
  ad_group?: string | null;
  ad_name?: string | null;
  metric_date?: string | null;
  spend: number;
  leads: number;
  reach: number;
  clicks: number;
  inline_link_clicks?: number;
  impressions: number;
  raw_json?: {
    actions?: { action_type?: string; value?: string | number }[];
    action_values?: { action_type?: string; value?: string | number }[];
    purchase_roas?: { action_type?: string; value?: string | number }[];
    frequency?: string | number;
  } | null;
};

type ClientSummary = {
  client: ClientRecord;
  campaigns: { id: string; name: string; status?: string; effective_status?: string; objective?: string; meta_campaign_id?: string }[];
  metrics: CampaignMetric[];
  previousMetrics?: CampaignMetric[];
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

type ReportType = "executive" | "leads" | "campaigns" | "creative" | "platform";

type ReportTableRow = {
  label: string;
  secondary?: string;
  spend: number;
  leads: number;
  results: number;
  resultLabel: string;
  clicks: number;
  impressions: number;
  costPerResult: number;
  cpl: number;
  ctr: number;
  cpm: number;
};

type MetricRow = ClientSummary["metrics"][number];

type OptimizationMetric = {
  key: string;
  label: string;
  value: number;
  previous: number;
  format: "number" | "currency" | "percent" | "ratio";
  lowerIsBetter?: boolean;
  helper: string;
};

const datePresetLabels: Record<DatePreset, string> = {
  last_30d: "Ultimos 30 dias",
  last_7d: "Ultimos 7 dias",
  maximum: "Maximo",
  today: "Hoje",
  yesterday: "Ontem",
  custom: "Personalizado",
};

const reportTypeLabels: Record<ReportType, string> = {
  executive: "Executivo",
  leads: "Leads",
  campaigns: "Campanhas",
  creative: "Criativos",
  platform: "Plataformas",
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
  { label: "Calculadora", icon: Calculator },
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

const optimizationActionTypes = {
  landingPageViews: ["landing_page_view", "omni_landing_page_view"],
  addToCart: ["add_to_cart", "omni_add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"],
  initiateCheckout: ["initiate_checkout", "omni_initiated_checkout", "offsite_conversion.fb_pixel_initiate_checkout"],
  purchase: ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"],
};

function actionValueTotal(actions: { action_type?: string; value?: string | number }[] | undefined, actionTypes: string[]) {
  return actionTotal(actions, actionTypes);
}

function averageFrequency(rows: ClientSummary["metrics"]) {
  const weighted = rows.reduce(
    (acc, row) => {
      const impressions = numberValue(row.impressions);
      const frequency = numberValue(row.raw_json?.frequency);
      if (!impressions || !frequency) return acc;
      return { total: acc.total + frequency * impressions, impressions: acc.impressions + impressions };
    },
    { total: 0, impressions: 0 }
  );
  return weighted.impressions ? weighted.total / weighted.impressions : 0;
}

function buildOptimizationMetrics(rows: ClientSummary["metrics"], previousRows: ClientSummary["metrics"] = []): OptimizationMetric[] {
  const currentTotals = calculateTotals(rows);
  const previousTotals = calculateTotals(previousRows);
  const metricValue = (metricRows: ClientSummary["metrics"], kind: keyof typeof optimizationActionTypes) =>
    metricRows.reduce((total, row) => total + actionValueTotal(row.raw_json?.actions, optimizationActionTypes[kind]), 0);
  const metricActionValue = (metricRows: ClientSummary["metrics"], kind: keyof typeof optimizationActionTypes) =>
    metricRows.reduce((total, row) => total + actionValueTotal(row.raw_json?.action_values, optimizationActionTypes[kind]), 0);
  const current = {
    landingPageViews: metricValue(rows, "landingPageViews"),
    addToCart: metricValue(rows, "addToCart"),
    initiateCheckout: metricValue(rows, "initiateCheckout"),
    purchases: metricValue(rows, "purchase"),
    purchaseValue: metricActionValue(rows, "purchase"),
    frequency: averageFrequency(rows),
  };
  const previous = {
    landingPageViews: metricValue(previousRows, "landingPageViews"),
    addToCart: metricValue(previousRows, "addToCart"),
    initiateCheckout: metricValue(previousRows, "initiateCheckout"),
    purchases: metricValue(previousRows, "purchase"),
    purchaseValue: metricActionValue(previousRows, "purchase"),
    frequency: averageFrequency(previousRows),
  };
  const roas = current.purchaseValue && currentTotals.spend ? current.purchaseValue / currentTotals.spend : 0;
  const previousRoas = previous.purchaseValue && previousTotals.spend ? previous.purchaseValue / previousTotals.spend : 0;
  return [
    { key: "spend", label: "Valor gasto", value: currentTotals.spend, previous: previousTotals.spend, format: "currency", helper: "investimento no periodo" },
    { key: "impressions", label: "Impressoes totais", value: currentTotals.impressions, previous: previousTotals.impressions, format: "number", helper: "volume de entrega" },
    { key: "reach", label: "Alcance", value: currentTotals.reach, previous: previousTotals.reach, format: "number", helper: "pessoas alcancadas" },
    { key: "cpm", label: "CPM", value: currentTotals.cpm, previous: previousTotals.cpm, format: "currency", lowerIsBetter: true, helper: "checklist: concorrencia, posicionamento, criativo e escala" },
    { key: "clicks", label: "Cliques", value: currentTotals.clicks, previous: previousTotals.clicks, format: "number", helper: "volume de trafego" },
    { key: "ctr", label: "CTR", value: currentTotals.ctr, previous: previousTotals.ctr, format: "percent", helper: "checklist: criativo, copy, publico e posicionamentos" },
    { key: "frequency", label: "Frequencia", value: current.frequency, previous: previous.frequency, format: "ratio", lowerIsBetter: true, helper: "checklist: saturacao e publico pequeno" },
    { key: "landing_page_views", label: "Visualizacoes da landing page", value: current.landingPageViews, previous: previous.landingPageViews, format: "number", helper: "base para connect rate" },
    { key: "cost_lpv", label: "Custo por visualizacao da landing page", value: current.landingPageViews ? currentTotals.spend / current.landingPageViews : 0, previous: previous.landingPageViews ? previousTotals.spend / previous.landingPageViews : 0, format: "currency", lowerIsBetter: true, helper: "checklist: CTA e velocidade da pagina" },
    { key: "connect_rate", label: "Connect rate", value: currentTotals.clicks ? (current.landingPageViews / currentTotals.clicks) * 100 : 0, previous: previousTotals.clicks ? (previous.landingPageViews / previousTotals.clicks) * 100 : 0, format: "percent", helper: "LP views divididas por cliques" },
    { key: "leads", label: "Leads", value: currentTotals.leads, previous: previousTotals.leads, format: "number", helper: "formularios e eventos de lead" },
    { key: "cpl", label: "CPL", value: currentTotals.cpl, previous: previousTotals.cpl, format: "currency", lowerIsBetter: true, helper: "checklist: qualidade, formulario e segmentacao" },
    { key: "lead_rate", label: "Taxa de conversao em lead", value: current.landingPageViews ? (currentTotals.leads / current.landingPageViews) * 100 : 0, previous: previous.landingPageViews ? (previousTotals.leads / previous.landingPageViews) * 100 : 0, format: "percent", helper: "leads divididos por LP views" },
    { key: "conversations", label: "Conversas", value: currentTotals.conversations, previous: previousTotals.conversations, format: "number", helper: "WhatsApp e mensagens iniciadas" },
    { key: "add_to_cart", label: "Adicoes ao carrinho", value: current.addToCart, previous: previous.addToCart, format: "number", helper: "evento de meio de funil" },
    { key: "cost_add_to_cart", label: "Custo por adicao ao carrinho", value: current.addToCart ? currentTotals.spend / current.addToCart : 0, previous: previous.addToCart ? previousTotals.spend / previous.addToCart : 0, format: "currency", lowerIsBetter: true, helper: "e-commerce: eficiencia no carrinho" },
    { key: "checkout", label: "Finalizacoes de compra iniciadas", value: current.initiateCheckout, previous: previous.initiateCheckout, format: "number", helper: "evento de fundo de funil" },
    { key: "cost_checkout", label: "Custo por finalizacao iniciada", value: current.initiateCheckout ? currentTotals.spend / current.initiateCheckout : 0, previous: previous.initiateCheckout ? previousTotals.spend / previous.initiateCheckout : 0, format: "currency", lowerIsBetter: true, helper: "eficiencia ate checkout" },
    { key: "purchases", label: "Compras", value: current.purchases, previous: previous.purchases, format: "number", helper: "conversoes de compra" },
    { key: "cost_purchase", label: "Custo por compra", value: current.purchases ? currentTotals.spend / current.purchases : 0, previous: previous.purchases ? previousTotals.spend / previous.purchases : 0, format: "currency", lowerIsBetter: true, helper: "CPA de compra" },
    { key: "purchase_value", label: "Valor total das compras", value: current.purchaseValue, previous: previous.purchaseValue, format: "currency", helper: "receita atribuida pela Meta" },
    { key: "roas", label: "ROAS", value: roas, previous: previousRoas, format: "ratio", helper: "receita dividida por investimento" },
  ];
}

function metricDelta(metric: OptimizationMetric) {
  if (!metric.previous) return null;
  return ((metric.value - metric.previous) / Math.abs(metric.previous)) * 100;
}

function formatOptimizationValue(metric: OptimizationMetric, value = metric.value) {
  if (metric.format === "currency") return formatCurrency(value);
  if (metric.format === "percent") return formatPercent(value);
  if (metric.format === "ratio") return numberValue(value).toFixed(2).replace(".", ",");
  return formatNumber(value);
}

function metricTone(metric: OptimizationMetric) {
  const delta = metricDelta(metric);
  if (delta === null || Math.abs(delta) < 0.01) return "blue";
  const improved = metric.lowerIsBetter ? delta < 0 : delta > 0;
  return improved ? "green" : "red";
}

function formatCurrency(value: number) {
  return numberValue(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number) {
  return numberValue(value).toLocaleString("pt-BR");
}

function formatPercent(value: number) {
  return `${numberValue(value).toFixed(2)}%`;
}

function excelNumber(value: number) {
  return numberValue(value).toFixed(2).replace(".", ",");
}

function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadTextFile(fileName: string, content: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function campaignNameForMetric(row: MetricRow, campaigns: ClientSummary["campaigns"]) {
  return (
    row.campaign_name ||
    row.campaign ||
    campaigns.find((campaign) => campaign.meta_campaign_id === row.campaign_external_id)?.name ||
    row.campaign_external_id ||
    "Campanha sem nome"
  );
}

function aggregateMetricRows(
  rows: ClientSummary["metrics"],
  groupLabel: (row: MetricRow) => string,
  secondaryLabel?: (row: MetricRow) => string
): ReportTableRow[] {
  const grouped = new Map<string, { label: string; secondary?: string; rows: ClientSummary["metrics"] }>();
  rows.forEach((row) => {
    const label = groupLabel(row).trim() || "Nao informado";
    const secondary = secondaryLabel?.(row).trim();
    const key = `${label}::${secondary ?? ""}`;
    const current = grouped.get(key) ?? { label, secondary, rows: [] };
    current.rows.push(row);
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((group) => {
      const totals = calculateTotals(group.rows);
      return {
        label: group.label,
        secondary: group.secondary,
        spend: totals.spend,
        leads: totals.leads,
        results: totals.metaResults,
        resultLabel: totals.resultLabel,
        clicks: totals.clicks,
        impressions: totals.impressions,
        costPerResult: totals.costPerResult,
        cpl: totals.cpl,
        ctr: totals.ctr,
        cpm: totals.cpm,
      };
    })
    .sort((a, b) => b.results - a.results || b.spend - a.spend);
}

function reportTableToCsv(rows: ReportTableRow[]) {
  const header = ["Nome", "Detalhe", "Investimento", "Leads", "Resultados", "Tipo de resultado", "Cliques", "Impressoes", "Custo por resultado", "CPL", "CTR", "CPM"];
  const body = rows.map((row) => [
    row.label,
    row.secondary ?? "",
    excelNumber(row.spend),
    row.leads,
    row.results,
    row.resultLabel,
    row.clicks,
    row.impressions,
    excelNumber(row.costPerResult),
    excelNumber(row.cpl),
    excelNumber(row.ctr),
    excelNumber(row.cpm),
  ]);
  return [header, ...body].map((line) => line.map(csvEscape).join(";")).join("\n");
}

function leadsReportToCsv(rows: ClientSummary["metrics"], campaigns: ClientSummary["campaigns"]) {
  const header = ["Data", "Campanha", "Leads", "Conversas", "Resultados", "Investimento", "Custo por resultado", "Cliques", "Impressoes"];
  const body = rows
    .map((row) => {
      const totals = calculateTotals([row]);
      return [
        row.metric_date ?? "",
        campaignNameForMetric(row, campaigns),
        row.leads,
        totals.conversations,
        totals.metaResults,
        excelNumber(row.spend),
        excelNumber(totals.costPerResult),
        row.clicks,
        row.impressions,
      ];
    })
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return [header, ...body].map((line) => line.map(csvEscape).join(";")).join("\n");
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

function decimalInputValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function aiPlanActionLines(content: string) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean);
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
  const [reportType, setReportType] = useState<ReportType>("executive");
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [aiRecommendationLoading, setAiRecommendationLoading] = useState(false);
  const [aiRecommendationGenerating, setAiRecommendationGenerating] = useState(false);
  const [aiAnalysisRunning, setAiAnalysisRunning] = useState(false);
  const [aiRecommendationError, setAiRecommendationError] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [actionMessage, setActionMessage] = useState("");
  const [actionSavingKey, setActionSavingKey] = useState("");
  const [manualActionForm, setManualActionForm] = useState({ title: "", action: "" });
  const [manualActionSaving, setManualActionSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    monthly_budget: "",
    target_cpl: "",
    account_manager: "",
    business_goal: "",
    qualified_lead_definition: "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [calculatorForm, setCalculatorForm] = useState({
    budget: "",
    cpl: "",
    ticket: "",
    closeRate: "10",
    margin: "30",
    revenueGoal: "",
  });

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

  const displayedMetricRows = useMemo(() => {
    if (!clientSummary) return [];
    const selectedIds = new Set(selectedCampaignIds);
    if (!selectedIds.size || selectedIds.size === clientSummary.campaigns.length) {
      const hasCampaignFilter = campaignStatusFilter !== "all" || Boolean(campaignSearch.trim());
      if (!hasCampaignFilter) return clientSummary.metrics;
      const visibleCampaignIds = new Set(filteredCampaigns.map((campaign) => campaign.meta_campaign_id).filter(Boolean));
      return clientSummary.metrics.filter((row) => visibleCampaignIds.has(row.campaign_external_id ?? ""));
    }
    return clientSummary.metrics.filter((row) => selectedIds.has(row.campaign_external_id ?? ""));
  }, [campaignSearch, campaignStatusFilter, clientSummary, filteredCampaigns, selectedCampaignIds]);

  const previousDisplayedMetricRows = useMemo(() => {
    if (!clientSummary?.previousMetrics) return [];
    const selectedIds = new Set(selectedCampaignIds);
    if (!selectedIds.size || selectedIds.size === clientSummary.campaigns.length) {
      const hasCampaignFilter = campaignStatusFilter !== "all" || Boolean(campaignSearch.trim());
      if (!hasCampaignFilter) return clientSummary.previousMetrics;
      const visibleCampaignIds = new Set(filteredCampaigns.map((campaign) => campaign.meta_campaign_id).filter(Boolean));
      return clientSummary.previousMetrics.filter((row) => visibleCampaignIds.has(row.campaign_external_id ?? ""));
    }
    return clientSummary.previousMetrics.filter((row) => selectedIds.has(row.campaign_external_id ?? ""));
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

  const reportRows = useMemo<ReportTableRow[]>(() => {
    if (!clientSummary) return [];
    if (reportType === "campaigns") {
      return aggregateMetricRows(displayedMetricRows, (row) => campaignNameForMetric(row, clientSummary.campaigns));
    }
    if (reportType === "creative") {
      return aggregateMetricRows(
        displayedMetricRows,
        (row) => row.ad_name || "Criativo nao informado",
        (row) => campaignNameForMetric(row, clientSummary.campaigns)
      );
    }
    if (reportType === "platform") {
      return aggregateMetricRows(displayedMetricRows, (row) => (row.platform === "meta_ads" ? "Meta Ads" : row.platform || "Plataforma nao informada"));
    }
    return [];
  }, [clientSummary, displayedMetricRows, reportType]);

  const reportInsight = useMemo(() => {
    if (!reportRows.length) return null;
    const bestByResult = reportRows[0];
    const inefficientRows = reportRows.filter((row) => row.spend > 0 && (!row.results || row.costPerResult > 0));
    const worstByResult = [...inefficientRows].sort((a, b) => {
      if (!a.results && b.results) return -1;
      if (a.results && !b.results) return 1;
      return b.costPerResult - a.costPerResult || b.spend - a.spend;
    })[0];
    return { bestByResult, worstByResult };
  }, [reportRows]);

  const overviewTotals = displayedTotals ?? clientSummary?.totals ?? calculateTotals([]);

  const overviewCards = useMemo<Metric[]>(() => {
    if (!clientSummary) {
      return [
        { label: "Clientes conectados", value: String(clients.length), helper: "contas no workspace", tone: "blue" },
        { label: "Meta Ads", value: assets?.connected ? "Ativo" : "Pendente", helper: assets?.connected ? "integracao conectada" : "aguardando permissao", tone: assets?.connected ? "green" : "amber" },
        { label: "Campanhas analisadas", value: "0", helper: "selecione um cliente", tone: "amber" },
        { label: "IA consultiva", value: "Pronta", helper: "analise manual disponivel", tone: "green" },
      ];
    }
    return [
      { label: "Investimento", value: formatCurrency(overviewTotals.spend), helper: periodLabel(), tone: "blue" },
      { label: overviewTotals.resultLabel, value: formatNumber(overviewTotals.metaResults), helper: `${formatNumber(overviewTotals.leads)} leads rastreados`, tone: "green" },
      { label: "Custo medio", value: formatCurrency(overviewTotals.costPerResult), helper: "por resultado principal", tone: overviewTotals.costPerResult && overviewTotals.costPerResult > 20 ? "amber" : "green" },
      { label: "CTR", value: formatPercent(overviewTotals.ctr), helper: `${formatNumber(overviewTotals.impressions)} impressoes`, tone: overviewTotals.ctr && overviewTotals.ctr < 0.8 ? "red" : "blue" },
    ];
  }, [assets?.connected, clientSummary, clients.length, overviewTotals, periodLabel]);

  const overviewTrendRows = useMemo(() => {
    const grouped = new Map<string, ClientSummary["metrics"]>();
    displayedMetricRows.forEach((row) => {
      const key = row.metric_date ?? row.campaign_external_id ?? "sem-data";
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    return Array.from(grouped.entries())
      .map(([date, rows]) => ({ date, totals: calculateTotals(rows) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [displayedMetricRows]);

  const overviewTrendMax = Math.max(
    1,
    ...overviewTrendRows.map((row) => row.totals.spend),
    ...overviewTrendRows.map((row) => row.totals.metaResults)
  );

  const overviewPlatformRows = useMemo(
    () => aggregateMetricRows(displayedMetricRows, (row) => (row.platform === "meta_ads" ? "Meta Ads" : row.platform || "Plataforma nao informada")),
    [displayedMetricRows]
  );

  const overviewCreativeRows = useMemo(
    () => aggregateMetricRows(displayedMetricRows, (row) => row.ad_name || "Criativo nao informado", (row) => row.ad_group || row.campaign_name || row.campaign || "").slice(0, 4),
    [displayedMetricRows]
  );

  const optimizationMetrics = useMemo(
    () => buildOptimizationMetrics(displayedMetricRows, previousDisplayedMetricRows),
    [displayedMetricRows, previousDisplayedMetricRows]
  );

  const optimizationDiagnostics = useMemo(() => {
    const byKey = new Map(optimizationMetrics.map((metric) => [metric.key, metric]));
    const diagnostics: { title: string; detail: string; action: string; tone: CampaignPerformance["tone"] }[] = [];
    const cpm = byKey.get("cpm");
    const ctr = byKey.get("ctr");
    const frequency = byKey.get("frequency");
    const connectRate = byKey.get("connect_rate");
    const leadRate = byKey.get("lead_rate");
    const cpl = byKey.get("cpl");
    if (cpm && metricTone(cpm) === "red") {
      diagnostics.push({
        title: "CPM piorou",
        detail: "Checklist: concorrencia, posicionamento concorrido, criativo fraco ou escala de orcamento podem elevar o custo de entrega.",
        action: "Testar novos publicos, posicionamentos e formatos antes de aumentar verba.",
        tone: "amber",
      });
    }
    if (ctr && ctr.value > 0 && (ctr.value < 0.8 || metricTone(ctr) === "red")) {
      diagnostics.push({
        title: "CTR pede atencao",
        detail: "Checklist: criativo, copy, regioes, horarios, formatos e publico precisam ser revisitados.",
        action: "Subir novos criativos com AIDA/PAS, CTA claro e formatos adequados aos posicionamentos.",
        tone: "red",
      });
    }
    if ((frequency?.value ?? 0) >= 3 || (frequency && metricTone(frequency) === "red")) {
      diagnostics.push({
        title: "Possivel saturacao",
        detail: "Checklist: frequencia alta costuma indicar publico pequeno, criativo cansado ou falta de formatos.",
        action: "Expandir publico, alternar criativos e testar video, imagem e carrossel.",
        tone: "amber",
      });
    }
    if ((connectRate?.value ?? 0) > 0 && (connectRate?.value ?? 0) < 55) {
      diagnostics.push({
        title: "Connect rate baixo",
        detail: "Checklist: a jornada pos-clique pode nao estar clara ou a pagina pode estar lenta.",
        action: "Conferir CTA do anuncio, promessa da landing page e velocidade no PageSpeed/GTmetrix.",
        tone: "amber",
      });
    }
    if ((leadRate?.value ?? 0) > 0 && (leadRate?.value ?? 0) < 4) {
      diagnostics.push({
        title: "Conversao da pagina baixa",
        detail: "Checklist: oferta, formulario, layout e CTA podem estar impedindo conversao.",
        action: "Simplificar formulario, destacar proposta de valor e testar versoes de CTA.",
        tone: "red",
      });
    }
    if (cpl && metricTone(cpl) === "red") {
      diagnostics.push({
        title: "CPL piorou",
        detail: "Checklist: revisar qualidade do lead, segmentacao, formulario e alinhamento com vendas.",
        action: "Aplicar score de lead e redistribuir verba para campanhas com melhor qualidade.",
        tone: "red",
      });
    }
    return diagnostics.slice(0, 5);
  }, [optimizationMetrics]);

  useEffect(() => {
    if (!clientSummary) return;
    setCalculatorForm((current) => ({
      ...current,
      budget: String(clientSummary.client.monthly_budget || Math.round(overviewTotals.spend) || ""),
      cpl: String(clientSummary.client.target_cpl || Math.round(overviewTotals.costPerResult) || ""),
    }));
  }, [clientSummary?.client.id]);

  const calculatorResult = useMemo(() => {
    const budget = decimalInputValue(calculatorForm.budget);
    const cpl = decimalInputValue(calculatorForm.cpl);
    const ticket = decimalInputValue(calculatorForm.ticket);
    const closeRate = decimalInputValue(calculatorForm.closeRate) / 100;
    const margin = decimalInputValue(calculatorForm.margin) / 100;
    const revenueGoal = decimalInputValue(calculatorForm.revenueGoal);
    const expectedLeads = cpl ? budget / cpl : 0;
    const expectedSales = expectedLeads * closeRate;
    const expectedRevenue = expectedSales * ticket;
    const expectedProfit = expectedRevenue * margin - budget;
    const roas = budget ? expectedRevenue / budget : 0;
    const breakEvenCpl = ticket && closeRate && margin ? ticket * closeRate * margin : 0;
    const goalSales = ticket ? revenueGoal / ticket : 0;
    const goalLeads = closeRate ? goalSales / closeRate : 0;
    const budgetForGoal = goalLeads * cpl;
    return { budget, cpl, ticket, closeRate, margin, revenueGoal, expectedLeads, expectedSales, expectedRevenue, expectedProfit, roas, breakEvenCpl, goalSales, goalLeads, budgetForGoal };
  }, [calculatorForm]);

  const aiPriorities = useMemo(() => buildAiPriorities(campaignRows), [campaignRows]);

  const overviewAiInsights = useMemo(() => {
    if (aiPriorities.length) {
      return aiPriorities.slice(0, 3).map((priority) => ({
        title: priority.title,
        campaign: priority.campaign.name,
        detail: priority.impact,
        action: priority.action,
        tone: priority.tone,
      }));
    }
    if (campaignRows.length) {
      return campaignRows.slice(0, 3).map((campaign) => ({
        title: campaign.recommendation,
        campaign: campaign.name,
        detail: `${formatNumber(campaign.totals.metaResults)} ${campaign.totals.resultLabel} com ${formatCurrency(campaign.totals.spend)} investidos.`,
        action: "Manter monitoramento e comparar com o proximo periodo.",
        tone: campaign.tone,
      }));
    }
    return [
      {
        title: "Dados ainda nao carregados",
        campaign: "Workspace",
        detail: "Selecione um cliente e sincronize as campanhas para liberar diagnosticos acionaveis.",
        action: "Conectar Meta Ads ou abrir um cliente existente.",
        tone: "blue" as CampaignPerformance["tone"],
      },
    ];
  }, [aiPriorities, campaignRows]);

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

  const aiPlanActions = useMemo(
    () => (aiRecommendation ? aiPlanActionLines(aiRecommendation.content) : []),
    [aiRecommendation]
  );

  const selectedCampaignCount = selectedCampaignIds.length;

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? clientSummary?.client ?? null,
    [clientSummary?.client, clients, selectedClientId]
  );

  useEffect(() => {
    if (!selectedClient) return;
    setSettingsForm({
      name: selectedClient.name ?? "",
      monthly_budget: selectedClient.monthly_budget ? String(selectedClient.monthly_budget) : "",
      target_cpl: selectedClient.target_cpl ? String(selectedClient.target_cpl) : "",
      account_manager: selectedClient.account_manager ?? "",
      business_goal: selectedClient.business_goal ?? "",
      qualified_lead_definition: selectedClient.qualified_lead_definition ?? "",
    });
    setSettingsMessage("");
  }, [selectedClient]);

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

  async function saveClientSettings() {
    if (!selectedClientId) return;
    setSettingsSaving(true);
    setSettingsMessage("");
    try {
      const payload = {
        name: settingsForm.name.trim(),
        monthly_budget: decimalInputValue(settingsForm.monthly_budget),
        target_cpl: decimalInputValue(settingsForm.target_cpl),
        account_manager: settingsForm.account_manager.trim(),
        business_goal: settingsForm.business_goal.trim(),
        qualified_lead_definition: settingsForm.qualified_lead_definition.trim(),
      };
      const data = await apiFetch(`/clients/${selectedClientId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const updated = data.client as ClientRecord;
      setClients((current) => current.map((client) => (client.id === updated.id ? updated : client)));
      setClientSummary((current) => (current && current.client.id === updated.id ? { ...current, client: updated } : current));
      setSettingsMessage("Configuracoes salvas.");
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : "Nao foi possivel salvar as configuracoes.");
    } finally {
      setSettingsSaving(false);
    }
  }

  function downloadCurrentReport() {
    if (!clientSummary || !displayedTotals) return;
    const safeClient = clientSummary.client.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const safePeriod = periodKey().replace(/[^a-z0-9:-]+/gi, "-");
    const fileName = `relatorio-${safeClient || "cliente"}-${reportType}-${safePeriod}.csv`;
    let csv = "";

    if (reportType === "executive") {
      const rows: ReportTableRow[] = [
        {
          label: "Resumo executivo",
          secondary: periodLabel(),
          spend: displayedTotals.spend,
          leads: displayedTotals.leads,
          results: displayedTotals.metaResults,
          resultLabel: displayedTotals.resultLabel,
          clicks: displayedTotals.clicks,
          impressions: displayedTotals.impressions,
          costPerResult: displayedTotals.costPerResult,
          cpl: displayedTotals.cpl,
          ctr: displayedTotals.ctr,
          cpm: displayedTotals.cpm,
        },
        ...aggregateMetricRows(displayedMetricRows, (row) => campaignNameForMetric(row, clientSummary.campaigns)).slice(0, 20),
      ];
      csv = reportTableToCsv(rows);
    } else if (reportType === "leads") {
      csv = leadsReportToCsv(displayedMetricRows, clientSummary.campaigns);
    } else {
      csv = reportTableToCsv(reportRows);
    }

    downloadTextFile(fileName, `\uFEFF${csv}`);
  }

  async function loadClientSummary(clientId: string, preset = datePreset): Promise<ClientSummary | null> {
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
      await loadAiRecommendation(clientId, preset);
      await loadActionItems(clientId, preset);
      return data as ClientSummary;
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : "Nao foi possivel carregar o cliente.");
      return null;
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

  async function saveManualAction() {
    if (!selectedClientId || !manualActionForm.title.trim() || !manualActionForm.action.trim()) return;
    setManualActionSaving(true);
    setActionMessage("");
    try {
      const data = await apiFetch(`/actions/${selectedClientId}`, {
        method: "POST",
        body: JSON.stringify({
          period: periodKey(),
          campaign_external_id: `manual:${Date.now()}`,
          campaign_name: "Conta",
          title: manualActionForm.title.trim(),
          action: manualActionForm.action.trim(),
          impact: "Acao operacional registrada manualmente.",
          severity: 1,
          tone: "blue",
          status: "done",
        }),
      });
      const saved = data.action as ActionItem;
      setActionItems((current) => [saved, ...current]);
      setManualActionForm({ title: "", action: "" });
      setActionMessage("Acao manual registrada.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Nao foi possivel registrar a acao manual.");
    } finally {
      setManualActionSaving(false);
    }
  }

  async function savePlanAction(action: string, index: number) {
    if (!selectedClientId || !aiRecommendation) return;
    const title = action.length > 90 ? `${action.slice(0, 87)}...` : action;
    const key = actionItemKey(periodKey(), `ai-plan:${aiRecommendation.id}:${index}`, title);
    setActionSavingKey(key);
    setActionMessage("");
    try {
      const data = await apiFetch(`/actions/${selectedClientId}`, {
        method: "POST",
        body: JSON.stringify({
          period: periodKey(),
          campaign_external_id: `ai-plan:${aiRecommendation.id}:${index}`,
          campaign_name: "Plano IA",
          title,
          action,
          impact: "Acao derivada do plano consultivo da IA.",
          severity: 1,
          tone: "blue",
          status: "approved",
        }),
      });
      const saved = data.action as ActionItem;
      setActionItems((current) => {
        const next = current.filter((item) => actionItemKey(item.period, item.campaign_external_id, item.title) !== key);
        return [saved, ...next];
      });
      setActionMessage("Item do plano enviado para a Central de Acoes.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o item do plano.");
    } finally {
      setActionSavingKey("");
    }
  }

  async function generateAiRecommendation(summary = clientSummary, totals = displayedTotals, priorities = aiPriorities) {
    if (!selectedClientId || !summary || !totals) return null;
    setAiRecommendationGenerating(true);
    setAiRecommendationError("");
    try {
      const data = await apiFetch(`/optimize/${selectedClientId}`, {
        method: "POST",
        body: JSON.stringify({
          period: periodKey(),
          period_label: periodLabel(),
          client_name: summary.client.name,
          client_context: {
            monthly_budget: summary.client.monthly_budget ?? 0,
            target_cpl: summary.client.target_cpl ?? 0,
            account_manager: summary.client.account_manager ?? "",
            business_goal: summary.client.business_goal ?? "",
            qualified_lead_definition: summary.client.qualified_lead_definition ?? "",
          },
          totals: {
            spend: totals.spend,
            metaResults: totals.metaResults,
            resultLabel: totals.resultLabel,
            costPerResult: totals.costPerResult,
            ctr: totals.ctr,
            cpm: totals.cpm,
            cpl: totals.cpl,
            reach: totals.reach,
            clicks: totals.clicks,
            impressions: totals.impressions
          },
          priorities: priorities.map((priority) => ({
            campaign_name: priority.campaign.name,
            title: priority.title,
            action: priority.action,
            impact: priority.impact,
            severity: priority.severity
          }))
        })
      });
      setAiRecommendation(data.recommendation ?? null);
      return data.recommendation ?? null;
    } catch (error) {
      setAiRecommendationError(error instanceof Error ? error.message : "Nao foi possivel gerar o plano de acao.");
      return null;
    } finally {
      setAiRecommendationGenerating(false);
    }
  }

  async function syncClient(clientId: string, campaignIds: string[] = []): Promise<ClientSummary | null> {
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
      return await loadClientSummary(clientId);
    } catch (error) {
      window.clearInterval(progressTimer);
      const errorMessage = error instanceof Error ? error.message : "Nao foi possivel sincronizar.";
      setSyncProgress((current) =>
        current && current.clientId === clientId
          ? { ...current, percent: Math.max(current.percent, 100), label: `Erro: ${errorMessage}`, status: "error" }
          : { clientId, percent: 100, label: `Erro: ${errorMessage}`, status: "error" }
      );
      setApiMessage(errorMessage);
      return null;
    } finally {
      setApiLoading(false);
      window.setTimeout(() => {
        setSyncProgress((current) => current?.clientId === clientId && current.status === "success" ? null : current);
      }, 2400);
    }
  }

  async function requestAiAnalysis() {
    if (!selectedClientId) return;
    setAiAnalysisRunning(true);
    setAiRecommendationError("");
    setApiMessage("Atualizando dados e solicitando analise da IA...");
    try {
      const freshSummary = await syncClient(selectedClientId);
      const summaryForAnalysis = freshSummary ?? clientSummary ?? (await loadClientSummary(selectedClientId));
      if (!summaryForAnalysis) {
        setAiRecommendationError("Selecione um cliente com dados sincronizados antes de solicitar a analise.");
        return;
      }
      const prioritiesForAnalysis = buildAiPriorities(
        summaryForAnalysis.campaigns.map((campaign) => {
          const rows = summaryForAnalysis.metrics.filter((row) => row.campaign_external_id === campaign.meta_campaign_id);
          const totals = calculateTotals(rows);
          const recommendation = campaignRecommendation(totals, campaign.effective_status ?? campaign.status);
          return { ...campaign, totals, recommendation: recommendation.text, tone: recommendation.tone };
        })
      );
      const recommendation = await generateAiRecommendation(summaryForAnalysis, summaryForAnalysis.totals, prioritiesForAnalysis);
      if (recommendation) {
        setApiMessage("Analise da IA atualizada.");
      }
    } finally {
      setAiAnalysisRunning(false);
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
          <img className="brand-logo" src="/creative-mark.png" alt="Creative Marketing" />
          <p className="eyebrow">CREATIVE ADS</p>
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
          <img className="brand-logo small" src="/creative-mark.png" alt="Creative Marketing" />
          <div>
            <strong>Creative</strong>
            <span>Ads</span>
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
            <section className="hero-panel command-hero">
              <img className="hero-logo" src="/creative-logo.png" alt="Creative Marketing" />
              <div>
                <p className="eyebrow">Creative Ads 2.0</p>
                <h2>Central de decisao para anuncios, IA e plano de acao.</h2>
                <p>
                  Acompanhe investimento, resultado, campanhas que puxam crescimento e alertas acionaveis em uma unica tela.
                </p>
              </div>
              <div className="hero-actions">
                <label className="hero-select">
                  Cliente
                  <select value={selectedClientId} onChange={(event) => event.target.value && loadClientSummary(event.target.value)}>
                    <option value="">Selecione</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <button className="primary-button" onClick={() => selectedClientId ? syncClient(selectedClientId) : connectMeta()} disabled={apiLoading}>
                  <PlugZap size={18} /> {selectedClientId ? "Sincronizar" : "Conectar Meta Ads"}
                </button>
              </div>
            </section>

            <section className="metric-grid command-metrics">
              {overviewCards.map((metric) => (
                <article className={`metric-card ${metric.tone}`} key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.helper}</small>
                </article>
              ))}
            </section>

            <section className="command-grid">
              <article className="panel command-main">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Performance</p>
                    <h3>{clientSummary ? clientSummary.client.name : "Selecione um cliente para ver dados reais"}</h3>
                  </div>
                  {periodControls}
                </div>
                <div className="trend-chart">
                  {overviewTrendRows.length ? (
                    overviewTrendRows.map((row) => (
                      <div className="trend-column" key={row.date}>
                        <span className="trend-spend" style={{ height: `${Math.max(8, (row.totals.spend / overviewTrendMax) * 100)}%` }} />
                        <span className="trend-results" style={{ height: `${Math.max(8, (row.totals.metaResults / overviewTrendMax) * 100)}%` }} />
                        <small>{row.date.slice(5) || row.date}</small>
                      </div>
                    ))
                  ) : (
                    <p className="muted compact-muted">Sincronize um cliente para carregar a tendencia de investimento e resultados.</p>
                  )}
                </div>
                <div className="chart-legend">
                  <span><i className="spend" /> Investimento</span>
                  <span><i className="results" /> Resultados</span>
                </div>
              </article>

              <aside className="panel ai-command-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">AI insights</p>
                    <h3>Alertas acionaveis</h3>
                  </div>
                  <Sparkles size={21} />
                </div>
                <div className="command-insight-list">
                  {overviewAiInsights.map((insight, index) => (
                    <article className={`command-insight ${insight.tone}`} key={`${insight.title}-${index}`}>
                      <span>{insight.campaign}</span>
                      <strong>{insight.title}</strong>
                      <p>{insight.detail}</p>
                      <button className="link-button" onClick={() => setActiveView("Otimizacao IA")}>
                        Aplicar sugestao <ChevronRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
              </aside>
            </section>

            <section className="command-grid lower">
              <article className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Campanhas</p>
                    <h3>Ranking operacional</h3>
                  </div>
                  <BarChart3 size={21} />
                </div>
                <div className="command-ranking">
                  {campaignRows.slice(0, 5).map((campaign) => (
                    <div className="ranking-row" key={campaign.id}>
                      <strong>{campaign.name}</strong>
                      <span>{formatCurrency(campaign.totals.spend)}</span>
                      <span>{formatNumber(campaign.totals.metaResults)} {campaign.totals.resultLabel}</span>
                      <small>{campaign.recommendation}</small>
                    </div>
                  ))}
                  {!campaignRows.length ? <p className="muted compact-muted">Nenhuma campanha carregada para o periodo.</p> : null}
                </div>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Plataformas</p>
                    <h3>Onde o resultado nasceu</h3>
                  </div>
                  <Activity size={21} />
                </div>
                <div className="platform-stack">
                  {(overviewPlatformRows.length ? overviewPlatformRows : [{ label: "Meta Ads", spend: 0, leads: 0, results: 0, resultLabel: "Resultados", clicks: 0, impressions: 0, costPerResult: 0, cpl: 0, ctr: 0, cpm: 0 }]).map((row) => (
                    <div className="platform-row" key={row.label}>
                      <div>
                        <strong>{row.label}</strong>
                        <span>{formatNumber(row.results)} {row.resultLabel}</span>
                      </div>
                      <small>{formatCurrency(row.spend)}</small>
                    </div>
                  ))}
                  {["Google Ads", "TikTok Ads", "LinkedIn Ads"].map((platform) => (
                    <div className="platform-row muted-row" key={platform}>
                      <div>
                        <strong>{platform}</strong>
                        <span>Nao conectado</span>
                      </div>
                      <small>Em breve</small>
                    </div>
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">Criativos</p>
                    <h3>Mapa de resposta</h3>
                  </div>
                  <Target size={21} />
                </div>
                <div className="creative-heatmap">
                  {(overviewCreativeRows.length ? overviewCreativeRows : [{ label: "Criativo nao informado", secondary: "Meta Ads", spend: 0, leads: 0, results: 0, resultLabel: "Resultados", clicks: 0, impressions: 0, costPerResult: 0, cpl: 0, ctr: 0, cpm: 0 }]).map((row) => (
                    <div className="creative-row" key={`${row.label}-${row.secondary ?? ""}`}>
                      <span>{row.label}</span>
                      <div className="heat-cells">
                        {[row.ctr, row.results, row.costPerResult ? Math.max(1, 40 - row.costPerResult) : 0].map((value, index) => (
                          <i key={index} style={{ opacity: Math.min(1, 0.18 + numberValue(value) / 40) }} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {overviewCreativeRows.every((row) => row.label === "Criativo nao informado") ? (
                    <p className="muted">Para abrir performance real de criativo, precisamos sincronizar insights por anuncio.</p>
                  ) : null}
                </div>
              </article>

              <article className="panel reasoning-panel">
                <div className="panel-head">
                  <div>
                    <p className="eyebrow">IA consultiva</p>
                    <h3>Cadeia de decisao</h3>
                  </div>
                  <Bot size={21} />
                </div>
                <div className="reasoning-chain">
                  <div><strong>{displayedMetricRows.length || 0}</strong><span>linhas de dados</span></div>
                  <div><strong>{aiPriorities.length || campaignRows.length}</strong><span>padroes detectados</span></div>
                  <div><strong>{actionItems.length}</strong><span>acoes registradas</span></div>
                  <div><strong>{aiRecommendation ? "Ativa" : "Pendente"}</strong><span>analise IA</span></div>
                </div>
              </article>
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
                <button className="primary-button" onClick={requestAiAnalysis} disabled={!selectedClientId || aiAnalysisRunning || apiLoading || aiRecommendationGenerating}>
                  <Bot size={18} /> {aiAnalysisRunning ? "Analisando..." : "Solicitar analise"}
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

                  <div className="optimization-board">
                    <div className="optimization-board-head">
                      <div>
                        <span>Metricas de otimizacao</span>
                        <strong>Atual vs periodo anterior</strong>
                      </div>
                      <small>Baseado na checklist de Leads & Anuncios</small>
                    </div>
                    <div className="optimization-metric-grid">
                      {optimizationMetrics.map((metric) => {
                        const delta = metricDelta(metric);
                        const tone = metricTone(metric);
                        return (
                          <article className={`optimization-metric ${tone}`} key={metric.key}>
                            <span>{metric.label}</span>
                            <strong>{formatOptimizationValue(metric)}</strong>
                            <div className="metric-previous">
                              <small>{formatOptimizationValue(metric, metric.previous)} no periodo anterior</small>
                              {delta === null ? (
                                <em>sem base</em>
                              ) : (
                                <em>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)}%</em>
                              )}
                            </div>
                            <p>{metric.helper}</p>
                          </article>
                        );
                      })}
                    </div>
                    <div className="optimization-diagnostics">
                      <span>Diagnosticos automaticos</span>
                      {optimizationDiagnostics.map((diagnostic) => (
                        <article className={`checklist-diagnostic ${diagnostic.tone}`} key={diagnostic.title}>
                          <strong>{diagnostic.title}</strong>
                          <p>{diagnostic.detail}</p>
                          <small>{diagnostic.action}</small>
                        </article>
                      ))}
                      {!optimizationDiagnostics.length ? <p className="muted">Nenhum alerta critico detectado nas metricas comparadas.</p> : null}
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
                      <button className="secondary-button" onClick={() => generateAiRecommendation()} disabled={aiRecommendationGenerating}>
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
                        {aiPlanActions.length ? (
                          <div className="ai-plan-action-list">
                            <span>Enviar itens para a Central de Acoes</span>
                            {aiPlanActions.map((action, index) => {
                              const title = action.length > 90 ? `${action.slice(0, 87)}...` : action;
                              const key = actionItemKey(periodKey(), `ai-plan:${aiRecommendation.id}:${index}`, title);
                              const savedAction = actionItemByKey.get(key);
                              return (
                                <div className="ai-plan-action-row" key={key}>
                                  <p>{action}</p>
                                  {savedAction ? (
                                    <div className={`action-status ${savedAction.status}`}>{actionStatusLabel(savedAction.status)}</div>
                                  ) : (
                                    <button className="ghost-button" onClick={() => savePlanAction(action, index)} disabled={actionSavingKey === key}>
                                      Adicionar
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
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
              <div className="manual-action-form">
                <span>Registrar acao manual</span>
                <input
                  value={manualActionForm.title}
                  onChange={(event) => setManualActionForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Ex.: Ajuste de publico"
                />
                <textarea
                  value={manualActionForm.action}
                  onChange={(event) => setManualActionForm((current) => ({ ...current, action: event.target.value }))}
                  placeholder="Descreva o que foi feito."
                />
                <button
                  className="ghost-button"
                  onClick={saveManualAction}
                  disabled={manualActionSaving || !selectedClientId || !manualActionForm.title.trim() || !manualActionForm.action.trim()}
                >
                  <CheckCircle2 size={16} /> {manualActionSaving ? "Registrando..." : "Registrar"}
                </button>
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

        {activeView === "Calculadora" ? (
          <section className="panel calculator-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Calculadora</p>
                <h3>Planejamento de campanhas e metas</h3>
              </div>
              <div className="topbar-actions">
                <button className="ghost-button" onClick={() => window.open("https://calculadora.lucashabiel.com.br/", "_blank", "noopener,noreferrer")}>
                  <Calculator size={18} /> Abrir em nova guia
                </button>
              </div>
            </div>
            <div className="calculator-context">
              <div>
                <strong>Para empresarios</strong>
                <span>Simule verba, meta de leads, taxa de conversao e retorno antes de investir.</span>
              </div>
              <div>
                <strong>Para gestores</strong>
                <span>Use os numeros da aba Otimizacao IA para defender escala, corte de verba ou novo teste.</span>
              </div>
              <div>
                <strong>Fluxo recomendado</strong>
                <span>Analise metricas, calcule meta viavel e registre a decisao na Central de Acoes.</span>
              </div>
            </div>
            <div className="native-calculator">
              <div className="native-calculator-head">
                <div>
                  <p className="eyebrow">Calculadora Creative</p>
                  <h3>{clientSummary ? clientSummary.client.name : "Use dados reais de um cliente"}</h3>
                </div>
                <label className="select-field">
                  Cliente
                  <select value={selectedClientId} onChange={(event) => event.target.value && loadClientSummary(event.target.value)}>
                    <option value="">Selecione</option>
                    {clients.map((client) => (
                      <option value={client.id} key={client.id}>{client.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="calculator-input-grid">
                <label>
                  Orcamento para midia
                  <input inputMode="decimal" value={calculatorForm.budget} onChange={(event) => setCalculatorForm((current) => ({ ...current, budget: event.target.value }))} placeholder="0,00" />
                </label>
                <label>
                  CPL esperado
                  <input inputMode="decimal" value={calculatorForm.cpl} onChange={(event) => setCalculatorForm((current) => ({ ...current, cpl: event.target.value }))} placeholder="0,00" />
                </label>
                <label>
                  Ticket medio
                  <input inputMode="decimal" value={calculatorForm.ticket} onChange={(event) => setCalculatorForm((current) => ({ ...current, ticket: event.target.value }))} placeholder="0,00" />
                </label>
                <label>
                  Taxa de fechamento %
                  <input inputMode="decimal" value={calculatorForm.closeRate} onChange={(event) => setCalculatorForm((current) => ({ ...current, closeRate: event.target.value }))} placeholder="10" />
                </label>
                <label>
                  Margem %
                  <input inputMode="decimal" value={calculatorForm.margin} onChange={(event) => setCalculatorForm((current) => ({ ...current, margin: event.target.value }))} placeholder="30" />
                </label>
                <label>
                  Meta de faturamento
                  <input inputMode="decimal" value={calculatorForm.revenueGoal} onChange={(event) => setCalculatorForm((current) => ({ ...current, revenueGoal: event.target.value }))} placeholder="0,00" />
                </label>
              </div>
              <div className="calculator-result-grid">
                <div>
                  <span>Leads previstos</span>
                  <strong>{formatNumber(calculatorResult.expectedLeads)}</strong>
                  <small>orcamento dividido pelo CPL</small>
                </div>
                <div>
                  <span>Vendas previstas</span>
                  <strong>{formatNumber(calculatorResult.expectedSales)}</strong>
                  <small>leads x taxa de fechamento</small>
                </div>
                <div>
                  <span>Faturamento previsto</span>
                  <strong>{formatCurrency(calculatorResult.expectedRevenue)}</strong>
                  <small>vendas x ticket medio</small>
                </div>
                <div>
                  <span>ROAS previsto</span>
                  <strong>{calculatorResult.roas.toFixed(2).replace(".", ",")}</strong>
                  <small>faturamento dividido pela verba</small>
                </div>
                <div>
                  <span>CPL limite</span>
                  <strong>{formatCurrency(calculatorResult.breakEvenCpl)}</strong>
                  <small>ponto de equilibrio pela margem</small>
                </div>
                <div>
                  <span>Verba para meta</span>
                  <strong>{formatCurrency(calculatorResult.budgetForGoal)}</strong>
                  <small>{formatNumber(calculatorResult.goalLeads)} leads necessarios</small>
                </div>
              </div>
              <div className={`calculator-decision ${calculatorResult.expectedProfit >= 0 ? "green" : "red"}`}>
                <strong>{calculatorResult.expectedProfit >= 0 ? "Cenario lucrativo" : "Cenario precisa de ajuste"}</strong>
                <span>
                  Lucro estimado depois da midia: {formatCurrency(calculatorResult.expectedProfit)}.
                  {calculatorResult.breakEvenCpl ? ` CPL precisa ficar ate ${formatCurrency(calculatorResult.breakEvenCpl)} para empatar na margem informada.` : " Informe ticket e margem para calcular o CPL limite."}
                </span>
              </div>
            </div>
            <div className="calculator-frame-wrap">
              <iframe
                className="calculator-frame"
                src="https://calculadora.lucashabiel.com.br/"
                title="Calculadora de campanhas"
                loading="lazy"
              />
            </div>
          </section>
        ) : null}

        {activeView === "Relatorios" ? (
          <section className="panel table-panel report-panel">
            <div className="panel-head report-toolbar">
              <div>
                <p className="eyebrow">Relatorios</p>
                <h3>{clientSummary ? clientSummary.client.name : "Selecione um cliente"}</h3>
              </div>
              <div className="topbar-actions">
                <button className="ghost-button" onClick={() => selectedClientId && syncClient(selectedClientId)} disabled={apiLoading || !selectedClientId}>
                  <Activity size={18} /> Sincronizar
                </button>
                <button className="ghost-button" onClick={downloadCurrentReport} disabled={!clientSummary}>
                  <FileDown size={18} /> Baixar Excel
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
            <div className="report-format-tabs no-print">
              {(Object.keys(reportTypeLabels) as ReportType[]).map((type) => (
                <button
                  className={reportType === type ? "active" : ""}
                  key={type}
                  onClick={() => setReportType(type)}
                >
                  {reportTypeLabels[type]}
                </button>
              ))}
            </div>
            {apiMessage ? <p className="form-message no-print">{apiMessage}</p> : null}
            {!clientSummary || !displayedTotals ? (
              <p className="muted compact-muted">Escolha um cliente para montar o relatorio com dados sincronizados, recomendacoes e acoes registradas.</p>
            ) : (
              <div className="report-document">
                <div className="report-cover">
                  <div>
                    <p className="eyebrow">CREATIVE ADS</p>
                    <h2>{clientSummary.client.name}</h2>
                    <span>{periodLabel()} - gerado em {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                  <img className="brand-logo small" src="/creative-mark.png" alt="Creative Marketing" />
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

                {reportType === "executive" ? (
                  <>
                    <section className="report-section">
                      <div className="report-section-head">
                        <p className="eyebrow">Metas do cliente</p>
                        <h3>Contexto usado na leitura</h3>
                      </div>
                      <div className="report-context-grid">
                        <div>
                          <span>Orcamento mensal</span>
                          <strong>{formatCurrency(clientSummary.client.monthly_budget ?? 0)}</strong>
                        </div>
                        <div>
                          <span>CPL alvo</span>
                          <strong>{formatCurrency(clientSummary.client.target_cpl ?? 0)}</strong>
                        </div>
                        <div>
                          <span>Responsavel</span>
                          <strong>{clientSummary.client.account_manager || "-"}</strong>
                        </div>
                      </div>
                      <div className="report-context-copy">
                        <div>
                          <strong>Objetivo comercial</strong>
                          <p>{clientSummary.client.business_goal || "Nao informado."}</p>
                        </div>
                        <div>
                          <strong>Lead qualificado</strong>
                          <p>{clientSummary.client.qualified_lead_definition || "Nao informado."}</p>
                        </div>
                      </div>
                    </section>

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
                            <span>{formatCurrency(campaign.totals.spend)} - {campaign.totals.metaResults} {campaign.totals.resultLabel}</span>
                            <small>{campaign.recommendation}</small>
                          </div>
                        ))}
                        {!campaignRows.length ? <p className="muted">Nenhuma campanha encontrada para o filtro atual.</p> : null}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="report-section">
                    <div className="report-section-head">
                      <p className="eyebrow">{reportTypeLabels[reportType]}</p>
                      <h3>
                        {reportType === "leads" ? "Leads gerados por dia e campanha" : "O que puxou mais e menos resultado"}
                      </h3>
                    </div>
                    {reportType !== "leads" && reportInsight ? (
                      <div className="report-insight-grid">
                        <div>
                          <span>Mais puxou resultado</span>
                          <strong>{reportInsight.bestByResult.label}</strong>
                          <p>{formatNumber(reportInsight.bestByResult.results)} {reportInsight.bestByResult.resultLabel} com {formatCurrency(reportInsight.bestByResult.spend)} investidos.</p>
                        </div>
                        <div>
                          <span>Menos eficiente</span>
                          <strong>{reportInsight.worstByResult?.label ?? "-"}</strong>
                          <p>{reportInsight.worstByResult ? `${formatNumber(reportInsight.worstByResult.results)} resultados a ${formatCurrency(reportInsight.worstByResult.costPerResult)}` : "Sem base suficiente no periodo."}</p>
                        </div>
                      </div>
                    ) : null}
                    {reportType === "creative" && reportRows.every((row) => row.label === "Criativo nao informado") ? (
                      <p className="muted">A sincronizacao atual esta em nivel de campanha. Para performance real de criativo/modelo, o proximo passo e ativar insights por anuncio na integracao da Meta.</p>
                    ) : null}
                    {reportType === "leads" ? (
                      <div className="report-data-table leads">
                        <div className="report-data-row header">
                          <span>Data</span>
                          <span>Campanha</span>
                          <span>Leads</span>
                          <span>Conversas</span>
                          <span>Investimento</span>
                          <span>Custo</span>
                        </div>
                        {displayedMetricRows.map((row, index) => {
                          const totals = calculateTotals([row]);
                          return (
                            <div className="report-data-row" key={`${row.campaign_external_id}-${row.metric_date}-${index}`}>
                              <span>{row.metric_date ?? "-"}</span>
                              <strong>{campaignNameForMetric(row, clientSummary.campaigns)}</strong>
                              <span>{formatNumber(row.leads)}</span>
                              <span>{formatNumber(totals.conversations)}</span>
                              <span>{formatCurrency(row.spend)}</span>
                              <span>{formatCurrency(totals.costPerResult)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="report-data-table">
                        <div className="report-data-row header">
                          <span>Nome</span>
                          <span>Investimento</span>
                          <span>Leads</span>
                          <span>Resultados</span>
                          <span>Custo</span>
                          <span>CTR</span>
                        </div>
                        {reportRows.map((row) => (
                          <div className="report-data-row" key={`${row.label}-${row.secondary ?? ""}`}>
                            <strong>
                              {row.label}
                              {row.secondary ? <small>{row.secondary}</small> : null}
                            </strong>
                            <span>{formatCurrency(row.spend)}</span>
                            <span>{formatNumber(row.leads)}</span>
                            <span>{formatNumber(row.results)} {row.resultLabel}</span>
                            <span>{formatCurrency(row.costPerResult)}</span>
                            <span>{formatPercent(row.ctr)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {reportType !== "leads" && !reportRows.length ? <p className="muted">Nenhum dado encontrado para este formato no periodo.</p> : null}
                    {reportType === "leads" && !displayedMetricRows.length ? <p className="muted">Nenhum lead encontrado para este periodo.</p> : null}
                  </section>
                )}
              </div>
            )}
          </section>
        ) : null}

        {activeView === "Configuracoes" ? (
          <section className="content-grid">
            <article className="panel wide settings-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Configuracoes</p>
                  <h3>{selectedClient ? selectedClient.name : "Metas por cliente"}</h3>
                </div>
                <Settings size={22} />
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
              </div>
              {!selectedClient ? (
                <p className="muted compact-muted">Selecione um cliente para configurar metas comerciais, limites e contexto de qualidade.</p>
              ) : (
                <div className="settings-form">
                  <label>
                    Nome do cliente
                    <input
                      value={settingsForm.name}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    Responsavel
                    <input
                      value={settingsForm.account_manager}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, account_manager: event.target.value }))}
                      placeholder="Pessoa responsavel pela conta"
                    />
                  </label>
                  <label>
                    Orcamento mensal
                    <input
                      inputMode="decimal"
                      value={settingsForm.monthly_budget}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, monthly_budget: event.target.value }))}
                      placeholder="0,00"
                    />
                  </label>
                  <label>
                    CPL alvo
                    <input
                      inputMode="decimal"
                      value={settingsForm.target_cpl}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, target_cpl: event.target.value }))}
                      placeholder="0,00"
                    />
                  </label>
                  <label className="full">
                    Objetivo comercial
                    <input
                      value={settingsForm.business_goal}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, business_goal: event.target.value }))}
                      placeholder="Ex.: gerar leads para WhatsApp, visitas ao stand, formularios qualificados"
                    />
                  </label>
                  <label className="full">
                    Lead qualificado
                    <textarea
                      value={settingsForm.qualified_lead_definition}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, qualified_lead_definition: event.target.value }))}
                      placeholder="Descreva o que diferencia um lead bom de um lead ruim para este cliente."
                    />
                  </label>
                  <div className="settings-actions full">
                    <button className="primary-button" onClick={saveClientSettings} disabled={settingsSaving || !settingsForm.name.trim()}>
                      <CheckCircle2 size={18} /> {settingsSaving ? "Salvando..." : "Salvar configuracoes"}
                    </button>
                    {settingsMessage ? <p className="form-message">{settingsMessage}</p> : null}
                  </div>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Contexto</p>
                  <h3>Uso nas analises</h3>
                </div>
                <Target size={21} />
              </div>
              <div className="settings-summary">
                <div>
                  <span>Orcamento mensal</span>
                  <strong>{(selectedClient?.monthly_budget ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </div>
                <div>
                  <span>CPL alvo</span>
                  <strong>{(selectedClient?.target_cpl ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
                </div>
                <div>
                  <span>Responsavel</span>
                  <strong>{selectedClient?.account_manager || "-"}</strong>
                </div>
              </div>
              <p className="muted compact-muted">Essas metas orientam relatorios, prioridades e proximos criterios de automacao.</p>
            </article>
          </section>
        ) : null}

        {!["Visao geral", "Clientes", "Campanhas", "Otimizacao IA", "Calculadora", "Integracoes", "Relatorios", "Configuracoes"].includes(activeView) ? (
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
