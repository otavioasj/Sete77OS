"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  PlugZap,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

/* ======================================================================
   TYPES
   ====================================================================== */

type AuthData = {
  access_token: string;
  user_id: string;
  email: string;
};

type AdAccount = {
  id: string;
  external_id: string;
  name: string;
  currency?: string;
  timezone?: string;
  status?: string;
};

type Campaign = {
  id: string;
  meta_campaign_id?: string;
  name: string;
  objective?: string;
  status: string;
  daily_budget?: number;
  lifetime_budget?: number;
};

type RuleAlert = {
  severity: string;
  rule_name: string;
  action: string;
  campaign: string;
  reason: string;
  should_pause: boolean;
  meta_entity_id?: string;
};

type SummaryKpis = {
  total_spend: number;
  total_leads: number;
  cpl_medio: number;
  ctr_medio: number;
  tendencia: string;
  melhor_campanha: string;
  pior_campanha: string;
};

type AISummary = {
  resumo: string;
  recomendacoes: string[];
  acoes: string[];
  kpis: SummaryKpis;
};

type AuditEntry = {
  id: string;
  acao: string;
  entidade: string;
  entidade_id?: string;
  criado_em: string;
};

type SyncResult = {
  campaigns_synced: number;
  metrics_upserted: number;
  errors: { campaign: string; error: string }[];
};

type NavSection = "dashboard" | "campaigns" | "analysis" | "audit";

/* ======================================================================
   API HELPER
   ====================================================================== */

function getToken(): string | null {
  try {
    return localStorage.getItem("gestor_token");
  } catch {
    return null;
  }
}

function saveAuth(data: AuthData) {
  try {
    localStorage.setItem("gestor_token", data.access_token);
    localStorage.setItem("gestor_email", data.email);
    localStorage.setItem("gestor_user_id", data.user_id);
  } catch {
    /* noop */
  }
}

function clearAuth() {
  try {
    localStorage.removeItem("gestor_token");
    localStorage.removeItem("gestor_email");
    localStorage.removeItem("gestor_user_id");
  } catch {
    /* noop */
  }
}

async function apiFetch<T = unknown>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (opts.body && typeof opts.body === "string")
    headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, { ...opts, headers });

  if (res.status === 401) {
    clearAuth();
    window.location.reload();
    throw new Error("Sessão expirada");
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      (json as { detail?: string }).detail ||
        `Erro ${res.status}`
    );
  }
  return json as T;
}

/* ======================================================================
   FORMATTERS
   ====================================================================== */

const fmt = {
  currency: (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  pct: (v: number) => `${v.toFixed(2)}%`,
  num: (v: number) => v.toLocaleString("pt-BR"),
  date: (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  },
};

/* ======================================================================
   MAIN COMPONENT
   ====================================================================== */

export default function GestorAds() {
  /* ---- auth state ---- */
  const [authed, setAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authNome, setAuthNome] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  /* ---- app state ---- */
  const [section, setSection] = useState<NavSection>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ---- data state ---- */
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [alerts, setAlerts] = useState<RuleAlert[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);

  /* ---- loading flags ---- */
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ---- check token on mount ---- */
  useEffect(() => {
    const token = getToken();
    if (token) setAuthed(true);
    setAuthChecked(true);
  }, []);

  /* ---- load accounts when authed ---- */
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const data = await apiFetch<AdAccount[]>("/accounts");
      if (!mountedRef.current) return;
      setAccounts(data);
      setMetaConnected(data.length > 0);
      if (data.length > 0 && !selectedAccount) {
        setSelectedAccount(data[0].external_id);
      }
    } catch {
      /* silent */
    } finally {
      if (mountedRef.current) setLoadingAccounts(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (authed) loadAccounts();
  }, [authed, loadAccounts]);

  /* ---- load campaigns when account selected ---- */
  const loadCampaigns = useCallback(async () => {
    if (!selectedAccount) return;
    setLoadingCampaigns(true);
    setCampaigns([]);
    try {
      const data = await apiFetch<Campaign[]>(
        `/campaigns?act_id=${selectedAccount}`
      );
      if (mountedRef.current) setCampaigns(data);
    } catch {
      /* silent */
    } finally {
      if (mountedRef.current) setLoadingCampaigns(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (authed && selectedAccount) loadCampaigns();
  }, [authed, selectedAccount, loadCampaigns]);

  /* ---- auth handlers ---- */
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";
      const body: Record<string, string> = {
        email: authEmail,
        password: authPass,
      };
      if (authMode === "register") body.nome = authNome || authEmail.split("@")[0];

      const data = await apiFetch<AuthData>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      saveAuth(data);
      setAuthed(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthed(false);
    setAccounts([]);
    setCampaigns([]);
    setAlerts([]);
    setAiSummary(null);
    setAuditLog([]);
    setSelectedAccount("");
    setMetaConnected(false);
  };

  /* ---- Meta OAuth ---- */
  const handleMetaConnect = async () => {
    try {
      const data = await apiFetch<{ url: string }>("/auth/meta/login");
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao conectar Meta");
    }
  };

  /* ---- Sync ---- */
  const handleSync = async () => {
    if (!selectedAccount) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const data = await apiFetch<SyncResult>("/campaigns/sync", {
        method: "POST",
        body: JSON.stringify({ act_id: selectedAccount }),
      });
      setSyncResult(data);
      await loadCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  /* ---- Evaluate ---- */
  const handleEvaluate = async () => {
    if (!selectedAccount) return;
    setEvaluating(true);
    setAlerts([]);
    try {
      const data = await apiFetch<{ alerts: RuleAlert[]; total: number }>(
        "/analysis/evaluate",
        {
          method: "POST",
          body: JSON.stringify({ act_id: selectedAccount }),
        }
      );
      setAlerts(data.alerts);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro na avaliação");
    } finally {
      setEvaluating(false);
    }
  };

  /* ---- AI Summary ---- */
  const handleSummary = async () => {
    if (!selectedAccount) return;
    setSummarizing(true);
    setAiSummary(null);
    try {
      const data = await apiFetch<AISummary>("/analysis/summary", {
        method: "POST",
        body: JSON.stringify({
          act_id: selectedAccount,
          nivel_tecnico: "intermediario",
        }),
      });
      setAiSummary(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro no resumo IA");
    } finally {
      setSummarizing(false);
    }
  };

  /* ---- Audit log ---- */
  const loadAuditLog = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const data = await apiFetch<AuditEntry[]>("/audit-log?limit=50");
      if (mountedRef.current) setAuditLog(data);
    } catch {
      /* silent */
    } finally {
      if (mountedRef.current) setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (authed && section === "audit") loadAuditLog();
  }, [authed, section, loadAuditLog]);

  /* ---- Campaign actions ---- */
  const handleCampaignAction = async (
    campaignId: string,
    action: "activate" | "pause"
  ) => {
    setActionLoading(campaignId);
    try {
      await apiFetch(`/campaigns/${campaignId}/${action}`, { method: "POST" });
      await loadCampaigns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro na ação");
    } finally {
      setActionLoading(null);
    }
  };

  /* ---- derived ---- */
  const userEmail = useMemo(() => {
    try {
      return localStorage.getItem("gestor_email") || "";
    } catch {
      return "";
    }
  }, [authed]);

  const currentAccount = useMemo(
    () => accounts.find((a) => a.external_id === selectedAccount),
    [accounts, selectedAccount]
  );

  /* ---- nav config ---- */
  const navItems: { key: NavSection; icon: React.ReactNode; label: string }[] =
    [
      {
        key: "dashboard",
        icon: <LayoutDashboard size={20} />,
        label: "Dashboard",
      },
      { key: "campaigns", icon: <Megaphone size={20} />, label: "Campanhas" },
      { key: "analysis", icon: <Sparkles size={20} />, label: "Análise IA" },
      { key: "audit", icon: <ClipboardList size={20} />, label: "Auditoria" },
    ];

  /* ==================================================================
     RENDER — Auth Screen
     ================================================================== */

  if (!authChecked) return null;

  if (!authed) {
    return (
      <div className="auth-shell">
        <div className="auth-brand">
          <p className="eyebrow">Creative Agência Marketing</p>
          <h1>Gestor de Anúncios</h1>
          <p className="auth-copy">
            Gerencie suas campanhas Meta Ads com inteligência artificial.
            Sincronize dados, avalie performance e receba recomendações
            automáticas para otimizar seus resultados.
          </p>
          <div className="auth-proof">
            <span>
              <CheckCircle2 size={16} /> Sync Meta Ads
            </span>
            <span>
              <CheckCircle2 size={16} /> Análise com IA
            </span>
            <span>
              <CheckCircle2 size={16} /> Regras automáticas
            </span>
            <span>
              <CheckCircle2 size={16} /> Auditoria completa
            </span>
          </div>
        </div>

        <div className="auth-card">
          <div className="brand-mark small">C</div>
          <h2>{authMode === "login" ? "Entrar" : "Criar conta"}</h2>

          {authMode === "register" && (
            <label>
              Nome
              <input
                type="text"
                placeholder="Seu nome"
                value={authNome}
                onChange={(e) => setAuthNome(e.target.value)}
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              placeholder="seu@email.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              placeholder="••••••••"
              value={authPass}
              onChange={(e) => setAuthPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
          </label>

          {authError && (
            <p style={{ color: "var(--negative)", margin: 0, fontSize: "0.88rem" }}>
              {authError}
            </p>
          )}

          <button
            className="primary-button"
            onClick={handleAuth}
            disabled={authLoading || !authEmail || !authPass}
          >
            {authLoading
              ? "Aguarde..."
              : authMode === "login"
              ? "Entrar"
              : "Criar conta"}
          </button>

          <button
            className="link-button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthError("");
            }}
          >
            {authMode === "login"
              ? "Não tem conta? Criar agora"
              : "Já tem conta? Entrar"}
          </button>
        </div>
      </div>
    );
  }

  /* ==================================================================
     RENDER — App Shell
     ================================================================== */

  return (
    <div className={`app-shell${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      {/* ---- Sidebar ---- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">C</div>
          <div className="sidebar-brand-copy">
            <strong>CREATIVE ADS</strong>
            <span>Gestor de Anúncios</span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeftOpen size={18} />
            )}
          </button>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item${section === item.key ? " active" : ""}`}
              onClick={() => setSection(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <ShieldCheck size={18} />
          <div>
            <strong>{userEmail}</strong>
            <span>
              <button
                className="link-button"
                style={{
                  color: "inherit",
                  fontSize: "0.76rem",
                  minHeight: "auto",
                  padding: 0,
                }}
                onClick={handleLogout}
              >
                Sair
              </button>
            </span>
          </div>
        </div>
      </aside>

      {/* ---- Workspace ---- */}
      <main className="workspace">
        {/* ============================================================
           DASHBOARD
           ============================================================ */}
        {section === "dashboard" && (
          <>
            <div className="topbar">
              <h1>Dashboard</h1>
              <div className="topbar-actions">
                {accounts.length > 1 && (
                  <div className="select-field">
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.external_id} value={a.external_id}>
                          {a.name || a.external_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button className="ghost-button" onClick={loadAccounts}>
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            {/* Hero panel */}
            <div className="hero-panel">
              <div>
                <p className="eyebrow">Gestor de Anúncios</p>
                <h2>
                  {metaConnected
                    ? `${accounts.length} conta${accounts.length > 1 ? "s" : ""} conectada${accounts.length > 1 ? "s" : ""}`
                    : "Conecte sua conta Meta"}
                </h2>
                <p>
                  {metaConnected
                    ? "Suas contas de anúncios estão conectadas. Sincronize campanhas e analise performance."
                    : "Conecte sua conta Meta Ads para começar a gerenciar campanhas e receber recomendações de IA."}
                </p>
              </div>
              <div className="hero-actions">
                {!metaConnected ? (
                  <button
                    className="secondary-button"
                    onClick={handleMetaConnect}
                  >
                    <PlugZap size={18} /> Conectar Meta Ads
                  </button>
                ) : (
                  <>
                    <button
                      className="secondary-button"
                      onClick={handleSync}
                      disabled={syncing || !selectedAccount}
                    >
                      <RefreshCw
                        size={16}
                        className={syncing ? "spin" : ""}
                      />{" "}
                      {syncing ? "Sincronizando..." : "Sincronizar"}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => setSection("analysis")}
                    >
                      <Sparkles size={16} /> Analisar com IA
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Sync result */}
            {syncResult && (
              <div
                className={`sync-progress ${syncResult.errors.length > 0 ? "error" : "success"}`}
              >
                <div className="sync-progress-head">
                  <div>
                    <strong>Sincronização concluída</strong>
                    <span>
                      {syncResult.campaigns_synced} campanhas ·{" "}
                      {syncResult.metrics_upserted} métricas
                    </span>
                  </div>
                </div>
                <div className="progress-track">
                  <span style={{ width: "100%" }} />
                </div>
                {syncResult.errors.length > 0 && (
                  <small>
                    {syncResult.errors.length} erro(s):{" "}
                    {syncResult.errors.map((e) => e.campaign).join(", ")}
                  </small>
                )}
              </div>
            )}

            {/* Accounts grid */}
            {accounts.length > 0 && (
              <div className="panel">
                <div className="panel-head">
                  <h3>Contas de Anúncios</h3>
                </div>
                <div className="asset-list">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="asset-row"
                      style={{
                        cursor: "pointer",
                        borderLeft:
                          acc.external_id === selectedAccount
                            ? "3px solid var(--flame-2)"
                            : undefined,
                      }}
                      onClick={() => setSelectedAccount(acc.external_id)}
                    >
                      <div>
                        <strong>{acc.name || "Sem nome"}</strong>
                        <small>{acc.external_id}</small>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span
                          className={`insight-pill ${acc.status === "active" ? "green" : "amber"}`}
                        >
                          {acc.status || "—"}
                        </span>
                        {acc.currency && (
                          <small style={{ display: "block", marginTop: 4 }}>
                            {acc.currency} · {acc.timezone || "—"}
                          </small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick campaign summary */}
            {campaigns.length > 0 && (
              <>
                <div className="metric-grid">
                  <div className="metric-card blue">
                    <span>Total campanhas</span>
                    <strong>{campaigns.length}</strong>
                  </div>
                  <div className="metric-card green">
                    <span>Ativas</span>
                    <strong>
                      {campaigns.filter((c) => c.status === "ACTIVE").length}
                    </strong>
                  </div>
                  <div className="metric-card amber">
                    <span>Pausadas</span>
                    <strong>
                      {campaigns.filter((c) => c.status === "PAUSED").length}
                    </strong>
                  </div>
                  <div className="metric-card red">
                    <span>Outras</span>
                    <strong>
                      {
                        campaigns.filter(
                          (c) =>
                            c.status !== "ACTIVE" && c.status !== "PAUSED"
                        ).length
                      }
                    </strong>
                  </div>
                </div>
              </>
            )}

            {/* Empty state if not connected */}
            {!metaConnected && !loadingAccounts && (
              <div className="panel">
                <h3>Primeiros passos</h3>
                <div className="step-list">
                  <div className="step">
                    <span>1</span>
                    <div>
                      <strong>Conectar Meta Ads</strong>
                      <p>
                        Clique em &quot;Conectar Meta Ads&quot; para autorizar o
                        acesso às suas contas de anúncios.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <span>2</span>
                    <div>
                      <strong>Sincronizar campanhas</strong>
                      <p>
                        Após conectar, sincronize para importar campanhas e
                        métricas.
                      </p>
                    </div>
                  </div>
                  <div className="step">
                    <span>3</span>
                    <div>
                      <strong>Analisar com IA</strong>
                      <p>
                        Use a análise inteligente para receber recomendações de
                        otimização.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================
           CAMPAIGNS
           ============================================================ */}
        {section === "campaigns" && (
          <>
            <div className="topbar">
              <h1>Campanhas</h1>
              <div className="topbar-actions">
                {accounts.length > 1 && (
                  <div className="select-field">
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.external_id} value={a.external_id}>
                          {a.name || a.external_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  className="ghost-button"
                  onClick={handleSync}
                  disabled={syncing || !selectedAccount}
                >
                  <RefreshCw size={16} />{" "}
                  {syncing ? "Sincronizando..." : "Sincronizar Meta"}
                </button>
              </div>
            </div>

            {!selectedAccount && (
              <div className="panel">
                <div className="empty-state">
                  <p className="muted">
                    Conecte uma conta Meta Ads no Dashboard para visualizar
                    campanhas.
                  </p>
                  <button
                    className="ghost-button"
                    onClick={() => setSection("dashboard")}
                  >
                    Ir para Dashboard
                  </button>
                </div>
              </div>
            )}

            {/* Sync result */}
            {syncResult && (
              <div
                className={`sync-progress ${syncResult.errors.length > 0 ? "error" : "success"}`}
              >
                <div className="sync-progress-head">
                  <div>
                    <strong>Sincronização concluída</strong>
                    <span>
                      {syncResult.campaigns_synced} campanhas ·{" "}
                      {syncResult.metrics_upserted} métricas
                    </span>
                  </div>
                </div>
                <div className="progress-track">
                  <span style={{ width: "100%" }} />
                </div>
              </div>
            )}

            {/* Campaigns table */}
            {selectedAccount && (
              <div className="panel campaigns-panel">
                <div className="panel-head">
                  <h3>
                    {loadingCampaigns
                      ? "Carregando..."
                      : `${campaigns.length} campanha${campaigns.length !== 1 ? "s" : ""}`}
                  </h3>
                </div>

                {campaigns.length === 0 && !loadingCampaigns && (
                  <div className="empty-state">
                    <p className="muted">
                      Nenhuma campanha encontrada. Sincronize os dados do Meta
                      Ads.
                    </p>
                    <button
                      className="ghost-button"
                      onClick={handleSync}
                      disabled={syncing}
                    >
                      <RefreshCw size={16} /> Sincronizar agora
                    </button>
                  </div>
                )}

                {campaigns.length > 0 && (
                  <div className="campaign-performance-table">
                    <div
                      className="campaign-performance-row header"
                      style={{
                        gridTemplateColumns:
                          "minmax(230px, 1.5fr) 120px 120px 130px 160px",
                        minWidth: 760,
                      }}
                    >
                      <span>Campanha</span>
                      <span>Status</span>
                      <span>Objetivo</span>
                      <span>Orçamento diário</span>
                      <span>Ações</span>
                    </div>
                    {campaigns.map((camp) => (
                      <div
                        key={camp.id}
                        className="campaign-performance-row"
                        style={{
                          gridTemplateColumns:
                            "minmax(230px, 1.5fr) 120px 120px 130px 160px",
                          minWidth: 760,
                        }}
                      >
                        <div>
                          <strong>{camp.name}</strong>
                          {camp.meta_campaign_id && (
                            <small
                              style={{
                                display: "block",
                                color: "var(--text-dim)",
                                fontSize: "0.78rem",
                              }}
                            >
                              {camp.meta_campaign_id}
                            </small>
                          )}
                        </div>
                        <span>
                          <span
                            className={`insight-pill ${
                              camp.status === "ACTIVE"
                                ? "green"
                                : camp.status === "PAUSED"
                                ? "amber"
                                : "red"
                            }`}
                          >
                            {camp.status}
                          </span>
                        </span>
                        <span>{camp.objective || "—"}</span>
                        <span>
                          {camp.daily_budget
                            ? fmt.currency(camp.daily_budget)
                            : "—"}
                        </span>
                        <div className="row-actions">
                          {camp.status === "PAUSED" && (
                            <button
                              className="ghost-button"
                              disabled={actionLoading === camp.id}
                              onClick={() =>
                                handleCampaignAction(camp.id, "activate")
                              }
                            >
                              <Play size={14} /> Ativar
                            </button>
                          )}
                          {camp.status === "ACTIVE" && (
                            <button
                              className="ghost-button"
                              disabled={actionLoading === camp.id}
                              onClick={() =>
                                handleCampaignAction(camp.id, "pause")
                              }
                            >
                              <Pause size={14} /> Pausar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ============================================================
           ANALYSIS
           ============================================================ */}
        {section === "analysis" && (
          <>
            <div className="topbar">
              <h1>Análise IA</h1>
              <div className="topbar-actions">
                {accounts.length > 1 && (
                  <div className="select-field">
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.external_id} value={a.external_id}>
                          {a.name || a.external_id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {!selectedAccount && (
              <div className="panel">
                <div className="empty-state">
                  <p className="muted">
                    Conecte uma conta Meta Ads no Dashboard para análise.
                  </p>
                  <button
                    className="ghost-button"
                    onClick={() => setSection("dashboard")}
                  >
                    Ir para Dashboard
                  </button>
                </div>
              </div>
            )}

            {selectedAccount && (
              <>
                {/* Action buttons */}
                <div className="hero-panel" style={{ minHeight: "auto" }}>
                  <div>
                    <p className="eyebrow">
                      {currentAccount?.name || selectedAccount}
                    </p>
                    <h2>Inteligência de Performance</h2>
                    <p>
                      Avalie suas campanhas com regras automáticas e receba um
                      resumo inteligente com recomendações de otimização.
                    </p>
                  </div>
                  <div className="hero-actions">
                    <button
                      className="secondary-button"
                      onClick={handleEvaluate}
                      disabled={evaluating}
                    >
                      <Target size={16} />{" "}
                      {evaluating ? "Avaliando..." : "Avaliar regras"}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={handleSummary}
                      disabled={summarizing}
                    >
                      <Bot size={16} />{" "}
                      {summarizing ? "Gerando..." : "Resumo IA"}
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="panel">
                    <div className="panel-head">
                      <h3>
                        <AlertTriangle
                          size={18}
                          style={{ marginRight: 8, verticalAlign: "middle" }}
                        />
                        {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
                      </h3>
                    </div>
                    <div className="ai-priority-list">
                      {alerts.map((alert, i) => (
                        <div
                          key={i}
                          className={`ai-priority ${
                            alert.severity === "alta" || alert.severity === "high"
                              ? "red"
                              : alert.severity === "media" ||
                                alert.severity === "medium"
                              ? "amber"
                              : "blue"
                          }`}
                        >
                          <div>
                            <span>{alert.severity.toUpperCase()}</span>
                            <strong>{alert.rule_name}</strong>
                            <p>{alert.reason}</p>
                          </div>
                          <div>
                            <span>Campanha</span>
                            <strong>{alert.campaign}</strong>
                            <p style={{ marginTop: 8 }}>
                              <strong>Ação:</strong> {alert.action}
                            </p>
                            {alert.should_pause && (
                              <span
                                className="insight-pill red"
                                style={{ marginTop: 8, display: "inline-flex" }}
                              >
                                Sugerir pausa
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {alerts.length === 0 && evaluating && (
                  <div className="panel">
                    <div className="empty-state">
                      <p className="muted">Avaliando regras de performance...</p>
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {aiSummary && (
                  <>
                    {/* KPIs */}
                    <div className="metric-grid">
                      <div className="metric-card blue">
                        <span>Investimento total</span>
                        <strong>
                          {fmt.currency(aiSummary.kpis.total_spend)}
                        </strong>
                      </div>
                      <div className="metric-card green">
                        <span>Total de leads</span>
                        <strong>{fmt.num(aiSummary.kpis.total_leads)}</strong>
                      </div>
                      <div className="metric-card amber">
                        <span>CPL médio</span>
                        <strong>
                          {fmt.currency(aiSummary.kpis.cpl_medio)}
                        </strong>
                      </div>
                      <div className="metric-card green">
                        <span>CTR médio</span>
                        <strong>{fmt.pct(aiSummary.kpis.ctr_medio)}</strong>
                      </div>
                    </div>

                    {/* Info cards */}
                    <div
                      className="metric-grid"
                      style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
                    >
                      <div className="metric-card blue">
                        <span>Tendência</span>
                        <strong style={{ fontSize: "1.2rem" }}>
                          {aiSummary.kpis.tendencia}
                        </strong>
                      </div>
                      <div className="metric-card green">
                        <span>Melhor campanha</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {aiSummary.kpis.melhor_campanha || "—"}
                        </strong>
                      </div>
                      <div className="metric-card red">
                        <span>Pior campanha</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {aiSummary.kpis.pior_campanha || "—"}
                        </strong>
                      </div>
                    </div>

                    {/* AI analysis panel */}
                    <div className="panel ai-panel">
                      <div className="panel-head">
                        <h3>
                          <Sparkles
                            size={18}
                            style={{ marginRight: 8, verticalAlign: "middle" }}
                          />
                          Análise Inteligente
                        </h3>
                      </div>

                      <div className="ai-plan" style={{ marginTop: 18 }}>
                        <div className="ai-plan-head">
                          <div>
                            <span>RESUMO</span>
                            <strong>Visão geral da performance</strong>
                          </div>
                        </div>
                        <div className="ai-plan-body">
                          {aiSummary.resumo.split("\n").map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                      </div>

                      {aiSummary.recomendacoes.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                          <h3 style={{ marginBottom: 12 }}>Recomendações</h3>
                          <div className="command-insight-list">
                            {aiSummary.recomendacoes.map((rec, i) => (
                              <div key={i} className="command-insight green">
                                <span>RECOMENDAÇÃO {i + 1}</span>
                                <p>{rec}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiSummary.acoes.length > 0 && (
                        <div style={{ marginTop: 18 }}>
                          <h3 style={{ marginBottom: 12 }}>Ações sugeridas</h3>
                          <div className="ai-plan-action-list">
                            {aiSummary.acoes.map((acao, i) => (
                              <div key={i} className="ai-plan-action-row">
                                <p>
                                  <Zap
                                    size={14}
                                    style={{
                                      marginRight: 6,
                                      verticalAlign: "middle",
                                      color: "var(--flame-2)",
                                    }}
                                  />
                                  {acao}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {summarizing && (
                  <div className="panel">
                    <div className="empty-state">
                      <p className="muted">
                        <Bot
                          size={18}
                          style={{ marginRight: 6, verticalAlign: "middle" }}
                        />
                        Gerando análise com inteligência artificial...
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ============================================================
           AUDIT LOG
           ============================================================ */}
        {section === "audit" && (
          <>
            <div className="topbar">
              <h1>Auditoria</h1>
              <div className="topbar-actions">
                <button
                  className="ghost-button"
                  onClick={loadAuditLog}
                  disabled={loadingAudit}
                >
                  <RefreshCw size={16} /> Atualizar
                </button>
              </div>
            </div>

            <div className="panel table-panel">
              <div className="panel-head">
                <h3>
                  {loadingAudit
                    ? "Carregando..."
                    : `${auditLog.length} registro${auditLog.length !== 1 ? "s" : ""}`}
                </h3>
              </div>

              {auditLog.length === 0 && !loadingAudit && (
                <div className="empty-state">
                  <p className="muted">Nenhum registro de auditoria encontrado.</p>
                </div>
              )}

              {auditLog.length > 0 && (
                <div className="data-table">
                  <div
                    className="data-row header"
                    style={{
                      gridTemplateColumns:
                        "minmax(140px, 0.8fr) minmax(120px, 0.6fr) minmax(180px, 1fr) minmax(180px, 1fr)",
                    }}
                  >
                    <span>Data</span>
                    <span>Ação</span>
                    <span>Entidade</span>
                    <span>ID</span>
                  </div>
                  {auditLog.map((entry) => (
                    <div
                      key={entry.id}
                      className="data-row"
                      style={{
                        gridTemplateColumns:
                          "minmax(140px, 0.8fr) minmax(120px, 0.6fr) minmax(180px, 1fr) minmax(180px, 1fr)",
                      }}
                    >
                      <span>{fmt.date(entry.criado_em)}</span>
                      <strong>{entry.acao}</strong>
                      <span>{entry.entidade}</span>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontFamily: "monospace",
                        }}
                      >
                        {entry.entidade_id || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Global spin animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
