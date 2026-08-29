"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  AdAccount,
  AISummary,
  AuditEntry,
  Campaign,
  NavSection,
  RuleAlert,
  SyncResult,
} from "@/lib/types";

import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import CampaignsView from "./CampaignsView";
import AnalysisView from "./AnalysisView";
import AuditView from "./AuditView";

type Props = {
  userEmail: string;
  onLogout: () => void;
};

export default function AppShell({ userEmail, onLogout }: Props) {
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
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---- load accounts ---- */
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
    loadAccounts();
  }, [loadAccounts]);

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
    if (selectedAccount) loadCampaigns();
  }, [selectedAccount, loadCampaigns]);

  /* ---- Meta OAuth ---- */
  const handleMetaConnect = useCallback(async () => {
    try {
      const data = await apiFetch<{ url: string }>("/auth/meta/login");
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao conectar Meta");
    }
  }, []);

  /* ---- Sync ---- */
  const handleSync = useCallback(async () => {
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
  }, [selectedAccount, loadCampaigns]);

  /* ---- Evaluate ---- */
  const handleEvaluate = useCallback(async () => {
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
  }, [selectedAccount]);

  /* ---- AI Summary ---- */
  const handleSummary = useCallback(async () => {
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
  }, [selectedAccount]);

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
    if (section === "audit") loadAuditLog();
  }, [section, loadAuditLog]);

  /* ---- Campaign actions ---- */
  const handleCampaignAction = useCallback(
    async (campaignId: string, action: "activate" | "pause") => {
      setActionLoading(campaignId);
      try {
        await apiFetch(`/campaigns/${campaignId}/${action}`, { method: "POST" });
        await loadCampaigns();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Erro na ação");
      } finally {
        setActionLoading(null);
      }
    },
    [loadCampaigns]
  );

  /* ---- Logout resets all state ---- */
  const handleLogout = useCallback(() => {
    setAccounts([]);
    setCampaigns([]);
    setAlerts([]);
    setAiSummary(null);
    setAuditLog([]);
    setSelectedAccount("");
    setMetaConnected(false);
    onLogout();
  }, [onLogout]);

  /* ---- derived ---- */
  const currentAccountName = useMemo(() => {
    const acc = accounts.find((a) => a.external_id === selectedAccount);
    return acc?.name || selectedAccount;
  }, [accounts, selectedAccount]);

  return (
    <div className={`app-shell${sidebarOpen ? "" : " sidebar-collapsed"}`}>
      <Sidebar
        section={section}
        setSection={setSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      <main className="workspace">
        {section === "dashboard" && (
          <Dashboard
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            campaigns={campaigns}
            metaConnected={metaConnected}
            loadingAccounts={loadingAccounts}
            syncing={syncing}
            syncResult={syncResult}
            onRefresh={loadAccounts}
            onMetaConnect={handleMetaConnect}
            onSync={handleSync}
            onGoToAnalysis={() => setSection("analysis")}
          />
        )}

        {section === "campaigns" && (
          <CampaignsView
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            campaigns={campaigns}
            loadingCampaigns={loadingCampaigns}
            syncing={syncing}
            syncResult={syncResult}
            actionLoading={actionLoading}
            onSync={handleSync}
            onCampaignAction={handleCampaignAction}
            onGoToDashboard={() => setSection("dashboard")}
          />
        )}

        {section === "analysis" && (
          <AnalysisView
            accounts={accounts}
            selectedAccount={selectedAccount}
            setSelectedAccount={setSelectedAccount}
            currentAccountName={currentAccountName}
            alerts={alerts}
            aiSummary={aiSummary}
            evaluating={evaluating}
            summarizing={summarizing}
            onEvaluate={handleEvaluate}
            onSummary={handleSummary}
            onGoToDashboard={() => setSection("dashboard")}
          />
        )}

        {section === "audit" && (
          <AuditView
            auditLog={auditLog}
            loadingAudit={loadingAudit}
            onRefresh={loadAuditLog}
          />
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
