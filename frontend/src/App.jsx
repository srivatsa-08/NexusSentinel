import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import {
  ShieldAlert,
  Activity,
  Server,
  BarChart3,
  AlertTriangle,
  RotateCcw,
  Play,
  CheckCircle2,
  AlertCircle,
  Terminal,
  FileCode,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  File,
  FolderPlus,
  Search,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Lock,
  Upload,
  Download,
  ArrowRight,
  Clock,
  Cpu,
  ShieldCheck,
  Zap
} from "lucide-react";
import PrismBackground from "./components/PrismBackground";
import InteractiveCard from "./components/InteractiveCard";
import AnalyticsSection from "./components/AnalyticsSection";
import { REPORT_TYPES, buildReportData, downloadFinTechPdf } from "./utils/fintechPdfReport";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";
import {
  fetchHealth,
  fetchEndpoints,
  fetchAssessments,
  fetchIncidents,
  fetchMetrics,
  triggerDemoScenario,
  resetDemo,
  runBatchAssessment,
  getSampleDatasetUrl,
  fetchMonitorStatus,
  startMonitor,
  pauseMonitor,
  resumeMonitor,
  stopMonitor,
  stepMonitor,
  fetchEarlyWarningMetrics,
  fetchGatewayStatus,
  simulateGatewayScenario,
  simulateGatewayBulk,
  resetGateway,
  toggleEndpointMonitoring,
  reviewIncident,
  resolveIncident,
  getIncidentReportUrl,
  fetchWorkspaceStatus,
  runWorkspaceTest,
  stopWorkspaceTest,
  resetWorkspaceSimulation,
  importWorkspaceFolder,
  renameWorkspaceFile,
  previewWorkspaceFile,
  clearWorkspace
} from "./services/api";

const SecurityTopology3D = lazy(() => import("./components/SecurityTopology3D"));
const SentinelIntelligenceCore = lazy(() => import("./components/SentinelIntelligenceCore"));

function getFileIcon(ext = "") {
  const e = ext.toLowerCase().replace(/^\./, "");
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(e)) return FileImage;
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(e)) return FileVideo;
  if (["mp3", "wav", "flac", "ogg", "aac"].includes(e)) return FileAudio;
  if (["zip", "rar", "7z", "tar", "gz"].includes(e)) return FileArchive;
  if (["xlsx", "xls", "ods", "csv"].includes(e)) return FileSpreadsheet;
  if (["py", "js", "jsx", "ts", "tsx", "json", "yaml", "yml", "html", "css", "sh"].includes(e)) return FileCode;
  if (["pdf", "doc", "docx", "odt", "ppt", "pptx", "odp", "txt", "md"].includes(e)) return FileText;
  return File;
}

const INITIAL_VIRTUAL_FILES = [
  { id: 1, name: "financial_ledger_2026.xlsx", state: "intact", entropy: 0.22 },
  { id: 2, name: "customer_contracts.pdf", state: "intact", entropy: 0.35 },
  { id: 3, name: "db_backup_quarterly.tar", state: "intact", entropy: 0.58 },
  { id: 4, name: "source_code_repo.zip", state: "intact", entropy: 2.10 },
  { id: 5, name: "employee_records.csv", state: "intact", entropy: 0.18 },
  { id: 6, name: "executive_briefing.docx", state: "intact", entropy: 0.29 }
];

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState({ status: "checking" });
  const [endpoints, setEndpoints] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [earlyWarning, setEarlyWarning] = useState(null);
  const [gateway, setGateway] = useState(null);
  const [workspaceStatus, setWorkspaceStatus] = useState(null);
  const [wsPreview, setWsPreview] = useState(null);
  const [wsMeta, setWsMeta] = useState(null);
  const [wsSearch, setWsSearch] = useState("");
  const [wsShowExplain, setWsShowExplain] = useState(false);
  const folderInputRef = useRef(null);
  const [bulkProfile, setBulkProfile] = useState("excessive_requests");
  const [bulkCount, setBulkCount] = useState(12);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  // Simulation Lab states
  const [importedData, setImportedData] = useState("");
  const [batchResult, setBatchResult] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState("FIN-001");
  const [epSearch, setEpSearch] = useState("");
  const [epDeptFilter, setEpDeptFilter] = useState("all");
  const [epStatusFilter, setEpStatusFilter] = useState("all");
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [incSearch, setIncSearch] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [replayStep, setReplayStep] = useState(0);
  const [lowPerfMode, setLowPerfMode] = useState(false);
  const [reportType, setReportType] = useState("comprehensive");
  const [reportPreviewData, setReportPreviewData] = useState(null);
  const [virtualFiles, setVirtualFiles] = useState(INITIAL_VIRTUAL_FILES);
  const [monitorStatus, setMonitorStatus] = useState({
    status: "stopped",
    processed_count: 0,
    total_sequence: 6,
    duration_seconds: 0
  });
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false);
  const syncEpochRef = useRef(0);

  const loadStaticAnalytics = async () => {
    const [metRes, ewRes] = await Promise.all([
      fetchMetrics().catch(() => null),
      fetchEarlyWarningMetrics().catch(() => null)
    ]);
    setMetrics(metRes);
    setEarlyWarning(ewRes);
  };

  const loadAllData = async ({ force = false } = {}) => {
    if (isFetchingRef.current && !force) return;
    const myEpoch = syncEpochRef.current;
    isFetchingRef.current = true;
    try {
      const [hRes, epRes, asRes, incRes, monRes, gwRes, wsRes] = await Promise.all([
        fetchHealth().catch(() => ({ status: "offline" })),
        fetchEndpoints().catch(() => ({ items: [] })),
        fetchAssessments().catch(() => ({ items: [] })),
        fetchIncidents().catch(() => ({ items: [] })),
        fetchMonitorStatus().catch(() => ({ status: "stopped", processed_count: 0, total_sequence: 6, duration_seconds: 0 })),
        fetchGatewayStatus().catch(() => null),
        fetchWorkspaceStatus().catch(() => null)
      ]);
      // Discard stale polling responses if a reset or scenario trigger happened while in-flight
      if (myEpoch !== syncEpochRef.current) return;

      setHealth(hRes);
      setEndpoints(epRes.items || []);
      const loadedAssessments = asRes.items || [];
      setAssessments(loadedAssessments);
      setIncidents(incRes.items || []);
      setMonitorStatus(monRes);
      setGateway(gwRes);
      setWorkspaceStatus(wsRes);

      if (loadedAssessments.length > 0) {
        setSelectedAssessment((prev) => prev || loadedAssessments[0]);
        if (loadedAssessments[0].label === "suspicious") {
          setVirtualFiles(
            INITIAL_VIRTUAL_FILES.map((f, i) =>
              i % 2 === 0
                ? {
                    ...f,
                    state: "simulated_encrypted",
                    name: `${f.name}.locked`
                  }
                : { ...f, state: "simulated_altered" }
            )
          );
        } else {
          setVirtualFiles(INITIAL_VIRTUAL_FILES);
        }
      } else {
        setSelectedAssessment(null);
        setVirtualFiles(INITIAL_VIRTUAL_FILES);
      }
    } catch {
      if (myEpoch === syncEpochRef.current) {
        setStatusBanner({ type: "error", text: "Failed to synchronize with backend." });
      }
    } finally {
      if (myEpoch === syncEpochRef.current) {
        isFetchingRef.current = false;
      }
    }
  };

  useEffect(() => {
    loadStaticAnalytics();
    loadAllData();
    const interval = setInterval(loadAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (monitorStatus.status !== "running") return;
    const stepInterval = setInterval(async () => {
      try {
        const res = await stepMonitor();
        if (res.monitor) setMonitorStatus(res.monitor);
        if (res.assessment) setSelectedAssessment(res.assessment);
        await loadAllData();
      } catch {
        // Ignore transient step errors if stopped/paused concurrently
      }
    }, 2000);
    return () => clearInterval(stepInterval);
  }, [monitorStatus.status]);

  const handleMonitorAction = async (actionFn) => {
    try {
      setActionLoading(true);
      const mon = await actionFn();
      setMonitorStatus(mon);
      await loadAllData();
    } catch (err) {
      setStatusBanner({ type: "error", text: err.response?.data?.detail || err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleScenarioTrigger = async (scenario) => {
    try {
      setActionLoading(true);
      setStatusBanner(null);
      syncEpochRef.current += 1;
      if (scenario !== "suspicious") {
        setVirtualFiles(INITIAL_VIRTUAL_FILES);
      }
      const res = await triggerDemoScenario(scenario, selectedEndpointId);
      if (res.assessment) setSelectedAssessment(res.assessment);
      if (res.incident) setSelectedIncidentId(res.incident.incident_id);
      await loadAllData({ force: true });
      setStatusBanner({
        type: res.assessment?.label === "suspicious" ? "alert" : "ok",
        text: `[${selectedEndpointId}] Scenario '${scenario}' assessed: ${res.assessment?.label?.toUpperCase()} (score ${res.assessment?.risk_score}/100)`
      });
    } catch (err) {
      setStatusBanner({
        type: "error",
        text: err.response?.data?.detail || err.message
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setActionLoading(true);
      syncEpochRef.current += 1;
      await Promise.all([
        resetDemo(),
        stopWorkspaceTest().catch(() => null),
        resetWorkspaceSimulation().catch(() => null)
      ]);
      setSelectedAssessment(null);
      setSelectedIncidentId(null);
      setBatchResult(null);
      setWsPreview(null);
      setWsMeta(null);
      setVirtualFiles(INITIAL_VIRTUAL_FILES);
      setStatusBanner({ type: "ok", text: "Simulated environment reset to monitoring posture." });
      await loadAllData({ force: true });
    } catch (err) {
      setStatusBanner({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
      setStatusBanner({ type: "error", text: "Only .csv or .json synthetic telemetry files are supported." });
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setImportedData(String(evt.target?.result || ""));
      setStatusBanner({ type: "ok", text: `Loaded synthetic telemetry file: ${file.name}` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleBatchImport = async () => {
    if (!importedData.trim()) {
      setStatusBanner({ type: "error", text: "Paste or import synthetic CSV/JSON records first." });
      return;
    }
    let records = [];
    try {
      const trimmed = importedData.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(",").map((h) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(",").map((v) => v.trim());
            const obj = {};
            headers.forEach((h, idx) => {
              const num = Number(vals[idx]);
              obj[h] = vals[idx] !== "" && !isNaN(num) ? num : vals[idx];
            });
            records.push(obj);
          }
        }
      }
      if (records.length === 0) {
        setStatusBanner({ type: "error", text: "No valid telemetry records found." });
        return;
      }
      setActionLoading(true);
      const summary = await runBatchAssessment(records);
      setBatchResult(summary);
      setStatusBanner({
        type: "ok",
        text: `Batch complete: ${summary.normal_count} normal, ${summary.suspicious_count} suspicious, ${summary.invalid_count} invalid.`
      });
      await loadAllData();
    } catch (err) {
      setStatusBanner({ type: "error", text: `Parse/batch error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const chartData = [...assessments].reverse().map((a, idx) => ({
    name: `#${idx + 1}`,
    risk_score: a.risk_score !== null ? a.risk_score : 0
  }));

  const p2 = metrics?.phase2_model;
  const p1 = metrics?.phase1_fallback_on_phase2_val;
  const p2Accuracy = p2
    ? ((p2.confusion_matrix.tp + p2.confusion_matrix.tn) / p2.validation_samples) * 100
    : null;

  const fpComparisonData =
    p1 && p2
      ? [
          {
            category: "Backup",
            "Phase 1 Baseline": p1.scenario_breakdown.backup.false_positives,
            "Phase 2 Model": p2.scenario_breakdown.backup.false_positives
          },
          {
            category: "Compression",
            "Phase 1 Baseline": p1.scenario_breakdown.compression.false_positives,
            "Phase 2 Model": p2.scenario_breakdown.compression.false_positives
          },
          {
            category: "Total FP",
            "Phase 1 Baseline": p1.confusion_matrix.fp,
            "Phase 2 Model": p2.confusion_matrix.fp
          }
        ]
      : [];

  const assessmentById = Object.fromEntries(assessments.map((a) => [a.assessment_id, a]));
  const activeEndpoint = endpoints.find((e) => e.endpoint_id === selectedEndpointId) || endpoints[0];
  const activeIncident = incidents.find((i) => i.incident_id === selectedIncidentId) || incidents[0] || null;

  useEffect(() => {
    if (!replayPlaying || !activeIncident?.timeline?.length) return;
    const timer = setInterval(() => {
      setReplayStep((prev) => {
        if (prev + 1 >= activeIncident.timeline.length) {
          setReplayPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [replayPlaying, activeIncident?.incident_id]);

  return (
    <div className="ns-cursor-spotlight relative flex h-screen bg-[#08050F] text-[#F5EDFF] overflow-hidden font-sans">
      <PrismBackground />
      {/* Sidebar */}
      <aside className="relative z-10 w-60 bg-[#160D26]/12 backdrop-blur-[5px] backdrop-saturate-125 border-r border-purple-300/12 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-purple-300/12 flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#29193E] to-[#160D26] border border-[#E8BB65]/45 rounded-lg shadow-[0_0_16px_-4px_rgba(232,187,101,0.35)]">
              <ShieldAlert className="w-5 h-5 text-[#E8BB65]" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide text-[#F3E8FF]">
                Nexus <span className="text-[#E8BB65]">Sentinel</span>
              </h1>
              <span className="text-[10px] text-[#AD98C5] font-mono tracking-widest">INTELLIGENCE SYSTEM</span>
            </div>
          </div>

          <nav className="p-3 space-y-1 nav-group">
            {[
              { id: "overview", label: "Command Center", icon: Activity },
              { id: "simlab", label: "Simulation Lab", icon: Terminal, badge: "DEMO" },
              { id: "workspace", label: "Workspace Monitor", icon: HardDrive },
              { id: "gateway", label: "Gateway Protection", icon: Cpu },
              { id: "endpoints", label: "Endpoints", icon: Server, count: endpoints.length },
              { id: "incidents", label: "Incidents", icon: AlertTriangle, count: incidents.length, warn: incidents.length > 0 },
              { id: "analytics", label: "Model Analytics", icon: BarChart3 }
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium active:scale-[0.98] ${
                    active
                      ? "sidebar-active"
                      : "text-[#AD98C5] hover:text-[#F5EDFF] hover:bg-[#211334]/70 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#E8BB65]" : ""}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] font-mono bg-[#2E1065] text-[#E9D5FF] border border-purple-600/50 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && (
                    <span
                      className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.warn
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-[#211334] text-[#C084FC]"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-purple-300/12 bg-[#160D26]/20">
          <div className="flex items-center space-x-2 text-[11px] text-[#E9D5FF] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse"></span>
            <span className="font-mono uppercase font-semibold tracking-wider">Simulation Mode</span>
          </div>
          <p className="text-[11px] text-[#AD98C5] leading-snug">
            Synthetic tabular observations only. Endpoint isolation and containment are simulated.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 border-b border-purple-300/12 bg-[#160D26]/12 backdrop-blur-[5px] backdrop-saturate-125 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold text-[#F5EDFF] tracking-tight">
              {activeTab === "overview" ? "Command Center" : activeTab === "simlab" ? "Simulation Lab" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <span className="text-purple-800">|</span>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${health.status === "ok" ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-500"}`} />
              <span className="text-[11px] font-mono text-[#AD98C5]">
                API {health.status === "ok" ? "ONLINE (:8000)" : "OFFLINE"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {["normal", "backup", "compression"].map((sc) => (
              <button
                key={sc}
                onClick={() => handleScenarioTrigger(sc)}
                disabled={actionLoading}
                className="ns-btn ns-btn-ghost capitalize"
              >
                {sc}
              </button>
            ))}
            <button
              onClick={() => handleScenarioTrigger("suspicious")}
              disabled={actionLoading}
              className="ns-btn ns-btn-danger font-medium"
            >
              Suspicious
            </button>
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="ns-btn ns-btn-folder"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        <div key={activeTab} className="p-6 space-y-5 max-w-7xl w-full mx-auto transition-opacity duration-200">
          {health.status !== "ok" && (
            <div className="p-3.5 bg-rose-950/30 border border-rose-800/50 rounded-xl flex items-center space-x-3 text-rose-200 text-xs backdrop-blur-md">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                Backend offline at <code className="font-mono text-[#C084FC]">http://localhost:8000</code>. Start with{" "}
                <code className="font-mono text-[#C084FC]">uvicorn backend.main:app --port 8000</code>.
              </span>
            </div>
          )}

          {statusBanner && (
            <div
              className={`px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between backdrop-blur-md ${
                statusBanner.type === "error"
                  ? "bg-rose-950/35 border-rose-800/50 text-rose-200"
                  : statusBanner.type === "alert"
                  ? "bg-amber-950/35 border-amber-800/50 text-amber-200"
                  : "bg-[#2E1065]/40 border-purple-500/40 text-[#E9D5FF]"
              }`}
            >
              <span>{statusBanner.text}</span>
              <button onClick={() => setStatusBanner(null)} className="text-[11px] opacity-70 hover:opacity-100 underline ml-4">
                Dismiss
              </button>
            </div>
          )}

          {/* OVERVIEW (ASYMMETRIC BENTO-GRID COMMAND CENTER) */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left 32% (4 cols): JARVIS Sentinel Intelligence Core + System Health */}
              <div className="lg:col-span-4 space-y-4">
                <InteractiveCard noPerspective className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="ns-section-title">01 / SENTINEL INTELLIGENCE CORE</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#29193E] text-[#FFE3A5] border border-[#E8BB65]/40">
                      {health.model_version || "rf-phase2-v1"}
                    </span>
                  </div>
                  <Suspense
                    fallback={
                      <div className="h-[300px] flex flex-col items-center justify-center gap-2 text-xs text-[#E8BB65] font-mono">
                        <div className="w-7 h-7 rounded-full border-2 border-[#B88635]/30 border-t-[#E8BB65] animate-spin" />
                        <span>Initializing Sentinel Core...</span>
                      </div>
                    }
                  >
                    <SentinelIntelligenceCore
                      hasIncident={incidents.length > 0}
                      onInspect={() => setActiveTab("analytics")}
                    />
                  </Suspense>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#AD98C5] pt-2 border-t border-purple-300/12">
                    <span>Backend: <strong className="text-emerald-400">{health.components?.backend || health.status}</strong></span>
                    <span>DB: <strong className="text-emerald-400">{health.components?.database || "--"}</strong></span>
                    <span>ML: <strong className="text-emerald-400">{health.components?.ml_engine || "--"}</strong></span>
                    <span>Gateway: <strong className="text-[#E8BB65]">{health.components?.gateway || "active"}</strong></span>
                  </div>
                </InteractiveCard>
              </div>

              {/* Right 68% (8 cols): Asymmetric Bento Grid */}
              <div className="lg:col-span-8 bento-grid grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Top Row: 3 compact cards */}
                <InteractiveCard onClick={() => setActiveTab("workspace")} className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="ns-section-title">Workspace</span>
                    <div className="p-1.5 rounded-lg bg-[#29193E] border border-[#E8BB65]/35">
                      <HardDrive className="w-3.5 h-3.5 text-[#E8BB65]" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#F3E8FF] mt-2 font-mono">
                    {workspaceStatus?.file_count ?? 0} <span className="text-xs font-normal text-[#AD98C5]">Files</span>
                  </div>
                  <p className="text-[11px] text-[#AD98C5] mt-1.5 flex items-center justify-between">
                    <span>Monitor: <strong className="font-mono text-emerald-400">{workspaceStatus?.monitoring_status || "active"}</strong></span>
                    <ArrowRight className="w-3 h-3 text-[#E8BB65]" />
                  </p>
                </InteractiveCard>

                <InteractiveCard onClick={() => setActiveTab("gateway")} className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="ns-section-title">Gateway</span>
                    <div className="p-1.5 rounded-lg bg-[#29193E] border border-[#E8BB65]/35">
                      <Zap className="w-3.5 h-3.5 text-[#E8BB65]" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#F3E8FF] mt-2 font-mono">
                    {gateway?.avoided_assessments ?? 0} <span className="text-xs font-normal text-[#AD98C5]">Avoided</span>
                  </div>
                  <p className="text-[11px] text-[#AD98C5] mt-1.5 flex items-center justify-between">
                    <span>Accepted: <strong className="font-mono text-[#FFE3A5]">{gateway?.accepted_requests ?? 0}</strong></span>
                    <ArrowRight className="w-3 h-3 text-[#E8BB65]" />
                  </p>
                </InteractiveCard>

                <InteractiveCard onClick={() => setActiveTab("incidents")} className="p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="ns-section-title">Incidents</span>
                    <div className={`p-1.5 rounded-lg border ${incidents.length > 0 ? "bg-rose-500/20 border-rose-500/40" : "bg-[#29193E] border-[#E8BB65]/35"}`}>
                      <ShieldCheck className={`w-3.5 h-3.5 ${incidents.length > 0 ? "text-rose-400" : "text-[#E8BB65]"}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold mt-2 font-mono ${incidents.length > 0 ? "text-amber-300" : "text-[#F3E8FF]"}`}>
                    {incidents.length} <span className="text-xs font-normal text-[#AD98C5]">Active</span>
                  </div>
                  <p className="text-[11px] text-[#AD98C5] mt-1.5 flex items-center justify-between">
                    <span>Endpoints: <strong className="font-mono text-[#FFE3A5]">{endpoints.length} virtual</strong></span>
                    <ArrowRight className="w-3 h-3 text-[#E8BB65]" />
                  </p>
                </InteractiveCard>

                {/* Middle Row: Differently sized cards (2 cols + 1 col) */}
                <InteractiveCard onClick={() => setActiveTab("simlab")} className="md:col-span-2 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="ns-section-title">Behavioural Analysis — Risk Trajectory</span>
                    <span className="text-[11px] font-mono text-[#AD98C5]">
                      {assessments.length} assessments
                    </span>
                  </div>
                  {chartData.length === 0 ? (
                    <div className="h-36 flex flex-col items-center justify-center gap-2 text-xs text-[#AD98C5] border border-dashed border-purple-800/50 rounded-lg bg-[#09060E]/45">
                      <span>No telemetry assessments recorded yet.</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScenarioTrigger("normal");
                        }}
                        className="ns-btn ns-btn-primary text-[11px]"
                      >
                        Run Baseline Sample
                      </button>
                    </div>
                  ) : (
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#29193E" />
                          <XAxis dataKey="name" stroke="#AD98C5" fontSize={10} />
                          <YAxis stroke="#AD98C5" domain={[0, 100]} fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: "#10091C", borderColor: "#B88635", fontSize: "11px" }} />
                          <Line type="monotone" dataKey="risk_score" stroke="#E8BB65" strokeWidth={2.5} dot={{ r: 3, fill: "#FFE3A5" }} activeDot={{ r: 5, fill: "#FFE3A5" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </InteractiveCard>

                <InteractiveCard onClick={() => setActiveTab("analytics")} className="p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="ns-section-title">Model</span>
                      <BarChart3 className="w-3.5 h-3.5 text-[#E8BB65]" />
                    </div>
                    <div className="text-2xl font-bold text-[#E8BB65] mt-2 font-mono">
                      {p2 ? `${(p2.f1_score * 100).toFixed(2)}%` : "--"}
                    </div>
                    <span className="text-[11px] text-[#AD98C5]">F1 Score (Phase 2 RF)</span>
                  </div>
                  <div className="pt-3 border-t border-purple-300/12 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[#AD98C5]">Obs FPR:</span>
                      <strong className="text-emerald-400">{p2 ? `${(p2.false_positive_rate * 100).toFixed(2)}%` : "--"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#AD98C5]">Early Det:</span>
                      <strong className="text-[#FFE3A5]">{earlyWarning ? `${(earlyWarning.early_detection_rate * 100).toFixed(1)}%` : "--"}</strong>
                    </div>
                  </div>
                </InteractiveCard>

                {/* Bottom Row: 1 wide card */}
                <InteractiveCard onClick={() => setActiveTab("endpoints")} className="md:col-span-3 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="ns-section-title">Virtual Organization — Endpoint Network</span>
                    <span className="text-[11px] text-[#AD98C5] flex items-center gap-1">
                      Inspect Endpoints <ArrowRight className="w-3 h-3 text-[#E8BB65]" />
                    </span>
                  </div>
                  <div className="relative">
                    <svg className="hidden sm:block absolute inset-x-4 top-1/2 -translate-y-1/2 w-[calc(100%-2rem)] h-4 pointer-events-none opacity-55" preserveAspectRatio="none">
                      <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#B88635" strokeWidth="1" strokeDasharray="4 4" />
                    </svg>
                    <div className="relative grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {endpoints.map((ep) => {
                        const isSelected = ep.endpoint_id === selectedEndpointId;
                        return (
                          <div
                            key={ep.endpoint_id}
                            className={`p-2.5 rounded-lg bg-[#160D26]/14 border text-xs font-mono transition-colors ${
                              isSelected ? "border-[#E8BB65]/80 shadow-[0_0_14px_-4px_rgba(232,187,101,0.45)]" : "border-purple-900/50 hover:border-[#E8BB65]/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-semibold ${isSelected ? "text-[#FFE3A5]" : "text-[#F3E8FF]"}`}>{ep.endpoint_id}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${ep.status === "simulated_isolated" ? "bg-rose-400" : isSelected ? "bg-[#E8BB65]" : "bg-emerald-400"}`} />
                            </div>
                            <div className={ep.status === "simulated_isolated" ? "text-rose-400 text-[10px] mt-1" : "text-emerald-400 text-[10px] mt-1"}>
                              {ep.status} ({ep.current_risk_score ?? 0})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </InteractiveCard>
              </div>
            </div>
          )}

          {/* WORKSPACE PROTECTION CENTER */}
          {activeTab === "workspace" && workspaceStatus && (
            <div className="space-y-5">
              {/* Controls & Status */}
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">
                    Workspace Protection Center ({workspaceStatus.workspace_path})
                  </h3>
                  <p className="text-xs text-[#AD98C5] mt-0.5">
                    Monitor: <strong className="text-emerald-400 font-mono uppercase">{workspaceStatus.monitoring_status}</strong> |{" "}
                    Harness: <strong className="text-[#C084FC] font-mono uppercase">{workspaceStatus.harness_state?.status || "idle"}</strong> |{" "}
                    Telemetry: <strong className="text-amber-300 font-mono">{workspaceStatus.telemetry_status}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={folderInputRef}
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const picked = Array.from(e.target.files || []);
                      if (!picked.length) return;
                      try {
                        setActionLoading(true);
                        const payload = await Promise.all(
                          picked.slice(0, 100).map(
                            (f) =>
                              new Promise((resolve, reject) => {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const b64 = String(reader.result || "").split(",")[1] || "";
                                  resolve({
                                    relative_path: f.webkitRelativePath || f.name,
                                    content_base64: b64
                                  });
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(f);
                              })
                          )
                        );
                        const updated = await importWorkspaceFolder(payload);
                        setWorkspaceStatus(updated);
                        const skippedCount = updated.skipped_files?.length || 0;
                        setStatusBanner({
                          type: skippedCount > 0 ? "alert" : "ok",
                          text: `Imported ${updated.imported_count ?? payload.length} file(s) into demo_workspace/${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}.`
                        });
                      } catch (err) {
                        setStatusBanner({ type: "error", text: err.response?.data?.detail || err.message });
                      } finally {
                        setActionLoading(false);
                        e.target.value = "";
                      }
                    }}
                  />
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>Add Folder</span>
                  </button>
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await runWorkspaceTest(selectedEndpointId);
                        if (res.workspace) setWorkspaceStatus(res.workspace);
                        await loadAllData();
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-primary"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Test Script</span>
                  </button>
                  <button
                    onClick={async () => {
                      setWorkspaceStatus(await stopWorkspaceTest());
                    }}
                    className="ns-btn ns-btn-danger"
                  >
                    Stop Test
                  </button>
                  <button
                    onClick={async () => {
                      setWorkspaceStatus(await fetchWorkspaceStatus());
                    }}
                    className="ns-btn ns-btn-ghost"
                  >
                    Refresh Workspace
                  </button>
                  <button
                    onClick={async () => {
                      syncEpochRef.current += 1;
                      await stopWorkspaceTest().catch(() => null);
                      setWsPreview(null);
                      setWsMeta(null);
                      setVirtualFiles(INITIAL_VIRTUAL_FILES);
                      setWorkspaceStatus(await resetWorkspaceSimulation());
                      await loadAllData({ force: true });
                      setStatusBanner({ type: "ok", text: "Simulation reset; imported and manual files preserved." });
                    }}
                    className="ns-btn ns-btn-folder"
                  >
                    Reset Simulation
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Remove all imported files from demo_workspace/imported/? Original source files are untouched.")) return;
                      setWsPreview(null);
                      setWsMeta(null);
                      setWorkspaceStatus(await clearWorkspace());
                      setStatusBanner({ type: "ok", text: "Imported workspace entries cleared." });
                    }}
                    className="ns-btn ns-btn-ghost text-amber-300 border-amber-700/40"
                  >
                    Clear Workspace
                  </button>
                </div>
              </div>

              {/* Containment & Latency Summary */}
              {workspaceStatus.harness_state && (
                <div className="interactive-group grid grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">Observations</span>
                    <span className="text-lg font-bold font-mono text-[#F5EDFF]">{workspaceStatus.harness_state.observations_processed}</span>
                  </InteractiveCard>
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">AI Risk Score</span>
                    <span className={`text-lg font-bold font-mono ${(workspaceStatus.harness_state.latest_assessment?.risk_score ?? 0) >= 50 ? "text-rose-400" : "text-emerald-400"}`}>
                      {workspaceStatus.harness_state.latest_assessment?.risk_score ?? "--"}/100
                    </span>
                  </InteractiveCard>
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">Detection Latency</span>
                    <span className="text-lg font-bold font-mono text-[#E8BB65]">
                      {workspaceStatus.harness_state.measured_detection_latency_ms ?? "--"} ms
                    </span>
                  </InteractiveCard>
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">Virtually Affected</span>
                    <span className="text-lg font-bold font-mono text-rose-400">{workspaceStatus.harness_state.virtually_affected_count}</span>
                  </InteractiveCard>
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">Unaffected Files</span>
                    <span className="text-lg font-bold font-mono text-emerald-400">{workspaceStatus.harness_state.unaffected_count}</span>
                  </InteractiveCard>
                  <InteractiveCard noPerspective className="p-3">
                    <span className="text-[11px] text-[#AD98C5] block">Containment</span>
                    <span className="text-sm font-bold font-mono text-[#FFE3A5] uppercase">
                      {workspaceStatus.harness_state.containment_timestamp ? "SIM_ISOLATED" : "MONITORING"}
                    </span>
                  </InteractiveCard>
                </div>
              )}

              {/* Live File Explorer */}
              <div className="ns-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h4 className="ns-section-title">
                      Live File Explorer ({workspaceStatus.file_count} Actual Files in demo_workspace/)
                    </h4>
                    <span className="text-[11px] text-[#AD98C5]">
                      Real files on disk are never encrypted or modified during automated tests.
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#AD98C5] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={wsSearch}
                      onChange={(e) => setWsSearch(e.target.value)}
                      placeholder="Filter files or ext..."
                      className="ns-input pl-8 w-52"
                    />
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto border border-purple-300/12 rounded-lg bg-[#160D26]/14">
                  <table className="ns-table">
                    <thead>
                      <tr>
                        <th>Actual Filename</th>
                        <th>Simulated State</th>
                        <th>Ext</th>
                        <th>Size</th>
                        <th>Observed Activity</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-[11px]">
                      {(workspaceStatus.files || [])
                        .filter((f) => {
                          const q = wsSearch.trim().toLowerCase();
                          return (
                            !q ||
                            f.relative_path.toLowerCase().includes(q) ||
                            (f.extension || "").toLowerCase().includes(q) ||
                            (f.simulated_status || "").toLowerCase().includes(q)
                          );
                        })
                        .map((f) => {
                          const Icon = getFileIcon(f.extension);
                          const isThreat =
                            f.simulated_status === "simulated_encrypted" ||
                            f.simulated_status === "simulated_altered";
                          return (
                            <tr
                              key={f.relative_path}
                              className={isThreat ? "ns-row-threat" : "ns-row-safe"}
                            >
                              <td className="text-[#F5EDFF]">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-3.5 h-3.5 text-[#C084FC] shrink-0" />
                                  <span>{f.relative_path}</span>
                                </div>
                              </td>
                              <td>
                                <span
                                  className={
                                    f.simulated_status === "simulated_encrypted"
                                      ? "text-rose-400 font-semibold"
                                      : f.simulated_status === "simulated_altered"
                                      ? "text-amber-400"
                                      : f.simulated_status === "simulated_contained"
                                      ? "text-[#C084FC]"
                                      : "text-emerald-400"
                                  }
                                >
                                  {f.simulated_filename || f.simulated_status}
                                </span>
                              </td>
                              <td className="text-[#AD98C5]">{f.extension}</td>
                              <td className="text-[#AD98C5]">{f.size_bytes} B</td>
                              <td className="text-[#C084FC]">{f.observed_activity}</td>
                              <td className="space-x-2.5 font-sans">
                                <button
                                  onClick={() => setWsMeta(f)}
                                  className="text-[#AD98C5] hover:text-[#E9D5FF] underline"
                                >
                                  Meta
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      setWsPreview(await previewWorkspaceFile(f.relative_path));
                                    } catch (err) {
                                      setStatusBanner({ type: "error", text: err.response?.data?.detail || err.message });
                                    }
                                  }}
                                  className="text-[#AD98C5] hover:text-[#E9D5FF] underline"
                                >
                                  Preview
                                </button>
                                <button
                                  onClick={async () => {
                                    const next = window.prompt("New filename (or new extension):", f.filename);
                                    if (!next || next === f.filename) return;
                                    try {
                                      setWorkspaceStatus(await renameWorkspaceFile(f.relative_path, next));
                                    } catch (err) {
                                      setStatusBanner({ type: "error", text: err.response?.data?.detail || err.message });
                                    }
                                  }}
                                  className="text-[#C084FC] hover:text-[#E9D5FF] underline"
                                >
                                  Rename/Ext
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {(wsPreview || wsMeta) && (
                  <div className="p-3 bg-[#160D26]/16 border border-purple-800/50 rounded-lg text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[#C084FC]">
                        {wsPreview ? `Preview: ${wsPreview.relative_path}` : `Metadata: ${wsMeta.relative_path}`}
                      </span>
                      <button
                        onClick={() => {
                          setWsPreview(null);
                          setWsMeta(null);
                        }}
                        className="text-[#AD98C5] hover:text-[#F5EDFF] underline"
                      >
                        Close
                      </button>
                    </div>
                    {wsPreview ? (
                      <pre className="text-[11px] font-mono text-[#E9D5FF] max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {wsPreview.content}
                      </pre>
                    ) : (
                      <div className="font-mono text-[11px] text-[#E9D5FF]">
                        Original: {wsMeta.original_filename} | Current: {wsMeta.filename} | Size: {wsMeta.size_bytes} B | Modified: {wsMeta.last_modified}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Activity Feed & Collapsible Detection / Unavailable Measurements */}
              <div className="interactive-group grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <InteractiveCard noPerspective className="p-3.5 max-h-56 overflow-y-auto">
                  <span className="ns-section-title block mb-2">
                    Recent Observed & Synthetic Events
                  </span>
                  {workspaceStatus.recent_events?.length > 0 ? (
                    workspaceStatus.recent_events.slice(0, 10).map((ev, i) => (
                      <div key={i} className="font-mono text-[11px] text-[#E9D5FF] flex justify-between py-1.5 border-b border-purple-900/30">
                        <span>[{ev.event_type}] {ev.filename}</span>
                        <span className="text-[#AD98C5]">{ev.telemetry_source}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-[#AD98C5]">
                      No events yet. Edit a file in demo_workspace/ or click Run Test Script.
                    </span>
                  )}
                </InteractiveCard>
                <InteractiveCard noPerspective className="p-3.5 space-y-2">
                  <button
                    type="button"
                    onClick={() => setWsShowExplain((v) => !v)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="ns-section-title text-amber-300">
                      Detection & Measurement Scope ({(workspaceStatus.unavailable_features || []).length} Unavailable)
                    </span>
                    {wsShowExplain ? (
                      <ChevronUp className="w-4 h-4 text-[#C084FC]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#C084FC]" />
                    )}
                  </button>
                  {wsShowExplain ? (
                    <div className="space-y-2 pt-1 border-t border-purple-300/12">
                      {workspaceStatus.harness_state?.latest_assessment?.indicators?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-[#C084FC] block mb-1">
                            Model vs Heuristic Indicators
                          </span>
                          <div className="space-y-1">
                            {workspaceStatus.harness_state.latest_assessment.indicators.map((ind, idx) => (
                              <div key={idx} className="text-[11px] font-mono text-[#E9D5FF] bg-[#160D26]/14 px-2 py-1 rounded border border-purple-300/12">
                                {ind}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-amber-300 block mb-1">
                          Unavailable Measurements (Not Fabricated)
                        </span>
                        <ul className="space-y-1 text-xs font-mono text-[#AD98C5]">
                          {(workspaceStatus.unavailable_features || []).map((u, i) => (
                            <li key={i}>• {u}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#AD98C5]">
                      Click to inspect live model vs heuristic indicators and unmeasured OS-level features.
                    </p>
                  )}
                </InteractiveCard>
              </div>
            </div>
          )}

          {/* SIMULATION LAB */}
          {activeTab === "simlab" && (
            <div className="space-y-5">
              {/* Continuous Virtual Monitoring Controls */}
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">Continuous Virtual Monitoring (Synthetic Replay)</h3>
                  <p className="text-xs text-[#AD98C5] mt-0.5">
                    Sequential replay of harmless synthetic observations. Status:{" "}
                    <span className="ns-badge ns-badge-violet ml-1">{monitorStatus.status}</span>{" "}
                    <span className="ml-2">Processed: <span className="font-mono text-[#F5EDFF]">{monitorStatus.processed_count}</span></span>{" "}
                    <span className="ml-2">Duration: <span className="font-mono text-[#F5EDFF]">{monitorStatus.duration_seconds}s</span></span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleMonitorAction(startMonitor)}
                    disabled={actionLoading || monitorStatus.status === "running"}
                    className="ns-btn ns-btn-primary"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleMonitorAction(pauseMonitor)}
                    disabled={actionLoading || monitorStatus.status !== "running"}
                    className="ns-btn ns-btn-ghost"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleMonitorAction(resumeMonitor)}
                    disabled={actionLoading || monitorStatus.status !== "paused"}
                    className="ns-btn ns-btn-folder"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleMonitorAction(stopMonitor)}
                    disabled={actionLoading || monitorStatus.status === "stopped"}
                    className="ns-btn ns-btn-danger"
                  >
                    Stop
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-ghost"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Scenario Controls & File Picker */}
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">Synthetic Telemetry & Scenario Runner</h3>
                  <p className="text-xs text-[#AD98C5]">
                    Upload synthetic CSV/JSON telemetry or trigger built-in scenarios. No executable files or real system changes.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="ns-btn ns-btn-folder"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV/JSON</span>
                  </button>
                  <a
                    href={getSampleDatasetUrl("csv")}
                    download="synthetic_telemetry_sample.csv"
                    className="ns-btn ns-btn-ghost"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sample CSV</span>
                  </a>
                  <a
                    href={getSampleDatasetUrl("json")}
                    download="synthetic_telemetry_sample.json"
                    className="ns-btn ns-btn-ghost"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sample JSON</span>
                  </a>
                </div>
              </div>

              {/* Virtual Workspace + Prominent Assessment Result */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 ns-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="ns-section-title flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-[#C084FC]" />
                      <span>Virtual In-Memory Workspace (Simulated Host: {activeEndpoint?.endpoint_id || "demo-01"})</span>
                    </h3>
                    <span className={`ns-badge ${(activeEndpoint?.status || "monitoring") === "simulated_isolated" ? "ns-badge-red" : "ns-badge-violet"}`}>
                      {activeEndpoint?.status || "monitoring"}
                    </span>
                  </div>
                  <div className="interactive-group grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {virtualFiles.map((file) => (
                      <InteractiveCard
                        key={file.id}
                        noPerspective
                        className={`p-2.5 rounded-lg border text-xs transition-all duration-500 ${
                          file.state === "simulated_encrypted"
                            ? "!bg-rose-950/45 !border-rose-700/65 text-rose-200"
                            : file.state === "simulated_altered"
                            ? "!bg-amber-950/35 !border-amber-700/55 text-amber-200"
                            : "text-[#E9D5FF]"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate font-mono text-[11px]">
                          {file.state === "simulated_encrypted" ? (
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-[#E8BB65] shrink-0" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-[#AD98C5] mt-1.5">
                          <span>ΔH: {file.entropy}</span>
                          <span className={file.state === "simulated_encrypted" ? "text-rose-400" : "text-emerald-400"}>
                            {file.state === "simulated_encrypted" ? "SIM_LOCKED" : "INTACT"}
                          </span>
                        </div>
                      </InteractiveCard>
                    ))}
                  </div>
                </div>

                {/* Prominent Detection Result */}
                <div className="ns-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-300/12 pb-2">
                    <span className="ns-section-title">Latest Assessment</span>
                    {selectedAssessment && (
                      <span className="text-[11px] font-mono text-[#C084FC]">{selectedAssessment.assessment_id}</span>
                    )}
                  </div>
                  {selectedAssessment ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[#AD98C5] block text-[11px]">Risk Score</span>
                          <span
                            className={`text-2xl font-bold font-mono ${
                              selectedAssessment.risk_score >= 50 ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {selectedAssessment.risk_score !== null ? `${selectedAssessment.risk_score}/100` : "null"}
                          </span>
                        </div>
                        <span
                          className={`ns-badge ${
                            selectedAssessment.label === "suspicious" ? "ns-badge-red" : "ns-badge-green"
                          }`}
                        >
                          {selectedAssessment.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-[#AD98C5] bg-[#160D26]/14 p-2 rounded border border-purple-300/12">
                        <span>Model: {selectedAssessment.model_version || "rf-phase2-v1"}</span>
                        <span>Time: {selectedAssessment.processing_time_ms ?? "--"} ms</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#AD98C5] font-medium">Model & Heuristic Explanations:</span>
                        <div className="max-h-28 overflow-y-auto space-y-1">
                          {selectedAssessment.indicators.map((ind, i) => (
                            <div key={i} className="text-[11px] font-mono text-[#E9D5FF] bg-[#160D26]/14 px-2 py-1 rounded border border-purple-300/12">
                              {ind}
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedAssessment.timeline && (
                        <div className="ns-timeline space-y-1">
                          {selectedAssessment.timeline.map((ev, i) => (
                            <div key={i} className="text-[11px] flex items-start gap-2">
                              <span className="ns-timeline-dot" />
                              <div>
                                <span className="text-[#E9D5FF]">{ev.event}</span>
                                <span className="text-[#AD98C5] font-mono ml-1.5">(+{ev.elapsed_ms} ms)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-[#AD98C5]">
                      Trigger a scenario above to inspect live model scoring and timeline.
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Import & Summary */}
              {/* Live Workspace Monitoring (demo_workspace/ + Independent Harness) */}
              {workspaceStatus && (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                        Live Workspace Monitoring ({workspaceStatus.workspace_path})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Status: <strong className="text-emerald-400 font-mono uppercase">{workspaceStatus.monitoring_status}</strong> |{" "}
                        Dummy Files: <strong className="font-mono text-slate-200">{workspaceStatus.file_count}</strong> |{" "}
                        Telemetry: <strong className="font-mono text-cyan-300">{workspaceStatus.telemetry_status}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      Observed Events: {workspaceStatus.measurable_features?.observed_event_count ?? 0} |{" "}
                      Exts: {workspaceStatus.measurable_features?.unique_ext_count ?? 0}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded max-h-32 overflow-y-auto">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                        Recent Observed File Activity (workspace_observer)
                      </span>
                      {workspaceStatus.recent_events?.length > 0 ? (
                        workspaceStatus.recent_events.slice(0, 6).map((ev, i) => (
                          <div key={i} className="font-mono text-[11px] text-slate-300 flex justify-between">
                            <span>[{ev.event_type}] {ev.filename}</span>
                            <span className="text-slate-500">{ev.timestamp.substring(11, 19)}Z</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500">
                          No manual edits yet. Edit or rename a file in demo_workspace/ to observe live events.
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                      <span className="text-[10px] font-mono text-amber-300 uppercase block mb-1">
                        Unavailable Measurements (Not Fabricated)
                      </span>
                      <ul className="space-y-0.5 text-[11px] font-mono text-slate-400">
                        {(workspaceStatus.unavailable_features || []).map((u, i) => (
                          <li key={i}>• {u}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="ns-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="ns-section-title">
                      Batch Telemetry Buffer (CSV / JSON)
                    </span>
                    <button
                      onClick={() =>
                        setImportedData(
                          JSON.stringify(
                            [
                              { file_mod_rate: 12.0, entropy_delta: 0.35, rename_ratio: 0.08, unique_ext_count: 3, burst_io_score: 0.22, shadow_copy_access_flag: 0 },
                              { file_mod_rate: 160.0, entropy_delta: 2.8, rename_ratio: 0.75, unique_ext_count: 18, burst_io_score: 0.88, shadow_copy_access_flag: 1 },
                              { file_mod_rate: -10.0 }
                            ],
                            null,
                            2
                          )
                        )
                      }
                      className="text-xs text-[#C084FC] hover:text-[#E9D5FF] underline"
                    >
                      Fill Example Batch
                    </button>
                  </div>
                  <textarea
                    value={importedData}
                    onChange={(e) => setImportedData(e.target.value)}
                    placeholder="Paste synthetic CSV or JSON records, or use Upload CSV/JSON above..."
                    className="ns-input w-full h-36 p-2.5 font-mono text-xs resize-none"
                  />
                  <button
                    onClick={handleBatchImport}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-primary w-full py-2 justify-center"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Batch Assessment</span>
                  </button>
                </div>

                <div className="ns-card p-4 space-y-3">
                  <span className="ns-section-title block">
                    Batch Assessment Summary
                  </span>
                  {batchResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-center font-mono">
                        <div className="ns-stat p-2">
                          <span className="text-[10px] text-[#AD98C5] block">TOTAL</span>
                          <span className="text-sm font-bold text-[#F5EDFF]">{batchResult.total}</span>
                        </div>
                        <div className="ns-stat p-2">
                          <span className="text-[10px] text-emerald-400 block">NORMAL</span>
                          <span className="text-sm font-bold text-emerald-400">{batchResult.normal_count}</span>
                        </div>
                        <div className="ns-stat p-2">
                          <span className="text-[10px] text-rose-400 block">SUSPICIOUS</span>
                          <span className="text-sm font-bold text-rose-400">{batchResult.suspicious_count}</span>
                        </div>
                        <div className="ns-stat p-2">
                          <span className="text-[10px] text-[#AD98C5] block">INVALID</span>
                          <span className="text-sm font-bold text-[#AD98C5]">{batchResult.invalid_count}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-[#AD98C5] flex justify-between">
                        <span>Total: {batchResult.total_processing_time_ms} ms</span>
                        <span>Avg: {batchResult.avg_latency_ms} ms/record</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto divide-y divide-purple-900/30 border border-purple-300/12 rounded-lg bg-[#160D26]/14">
                        {batchResult.assessments.map((item, idx) => (
                          <div key={idx} className="px-2.5 py-1.5 flex justify-between text-xs font-mono">
                            <span className="text-[#AD98C5]">#{idx + 1}</span>
                            <span>Score: {item.risk_score !== null ? item.risk_score : "null"}</span>
                            <span className={item.label === "suspicious" ? "text-rose-400" : item.label === "normal" ? "text-emerald-400" : "text-[#AD98C5]"}>
                              {item.label.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-[#AD98C5] border border-dashed border-purple-900/50 rounded-lg">
                      Run a batch assessment to inspect normal, suspicious, and invalid counts.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* GATEWAY PROTECTION */}
          {activeTab === "gateway" && (
            <div className="space-y-5">
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">
                    Gateway Protection (Simulated Pre-AI Admission Control)
                  </h3>
                  <p className="text-xs text-[#AD98C5]">
                    Lightweight request quotas and bounded queue before local AI assessment. Decisions are separate from ransomware classification.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "normal_upload", label: "Normal Upload" },
                    { id: "legitimate_bulk", label: "Legitimate Bulk" },
                    { id: "excessive_requests", label: "Excessive Requests" },
                    { id: "recover", label: "Recover" }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          const res = await simulateGatewayScenario(s.id);
                          setGateway(res);
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      disabled={actionLoading}
                      className="ns-btn ns-btn-ghost"
                    >
                      {s.label}
                    </button>
                  ))}
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        setGateway(await resetGateway());
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-folder"
                  >
                    Reset Gateway
                  </button>
                </div>
              </div>

              {/* Custom Bulk Simulation Controls */}
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="ns-section-title">Custom Bulk Simulation:</span>
                  <select
                    value={bulkProfile}
                    onChange={(e) => setBulkProfile(e.target.value)}
                    className="ns-input font-mono text-xs"
                  >
                    <option value="normal_upload">normal_upload</option>
                    <option value="legitimate_bulk">legitimate_bulk</option>
                    <option value="excessive_requests">excessive_requests</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={bulkCount}
                    onChange={(e) => setBulkCount(Number(e.target.value))}
                    className="ns-input w-20 font-mono text-xs"
                  />
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      try {
                        const res = await simulateGatewayBulk(bulkProfile, bulkCount);
                        setGateway(res);
                        setStatusBanner({
                          type: "ok",
                          text: `Custom bulk (${res.bulk_requested_count} ${bulkProfile}) completed in ${res.bulk_processing_duration_ms} ms.`
                        });
                      } catch (err) {
                        setStatusBanner({ type: "error", text: err.response?.data?.detail || err.message });
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="ns-btn ns-btn-primary"
                  >
                    Run Custom Bulk
                  </button>
                </div>
                {gateway?.bulk_processing_duration_ms !== undefined && (
                  <span className="text-[11px] font-mono text-[#C084FC]">
                    Last Bulk: {gateway.bulk_requested_count} reqs in {gateway.bulk_processing_duration_ms} ms
                  </span>
                )}
              </div>

              {gateway ? (
                <>
                  <div className="interactive-group grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <InteractiveCard noPerspective className="p-3">
                      <span className="text-[11px] text-[#AD98C5] block">Total Requests</span>
                      <span className="text-xl font-bold font-mono text-[#F5EDFF]">{gateway.total_requests}</span>
                    </InteractiveCard>
                    <InteractiveCard noPerspective className="p-3">
                      <span className="text-[11px] text-[#AD98C5] block">Accepted</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{gateway.accepted_requests}</span>
                    </InteractiveCard>
                    <InteractiveCard noPerspective className="p-3">
                      <span className="text-[11px] text-[#AD98C5] block">Restricted (Throttled/Rejected)</span>
                      <span className="text-xl font-bold font-mono text-rose-400">
                        {gateway.throttled_requests + gateway.rejected_requests}
                      </span>
                    </InteractiveCard>
                    <InteractiveCard noPerspective className="p-3">
                      <span className="text-[11px] text-[#AD98C5] block">AI Assessments Avoided</span>
                      <span className="text-xl font-bold font-mono text-[#E8BB65]">{gateway.avoided_assessments}</span>
                    </InteractiveCard>
                    <InteractiveCard noPerspective className="p-3">
                      <span className="text-[11px] text-[#AD98C5] block">Est. CPU Saved (Local RF)</span>
                      <span className="text-xl font-bold font-mono text-[#E8BB65]">{gateway.estimated_cpu_saved_ms} ms</span>
                      <span className="text-[10px] text-[#AD98C5] block font-mono">
                        GW: {gateway.measured_avg_gateway_latency_ms} ms/req
                      </span>
                    </InteractiveCard>
                  </div>

                  <div className="ns-card p-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="ns-section-title">
                        Bounded Processing Queue Utilization
                      </span>
                      <span className="font-mono text-[#C084FC]">
                        {gateway.queue_depth} / {gateway.queue_capacity} ({gateway.queue_utilization_pct}%)
                      </span>
                    </div>
                    <div className="ns-progress-track">
                      <div
                        className="ns-progress-fill"
                        style={{ width: `${gateway.queue_utilization_pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-[#AD98C5]">{gateway.estimation_note}</p>
                  </div>

                  {/* Live Workspace Monitoring (demo_workspace/ + Independent Harness) */}
                  {workspaceStatus && (
                    <div className="ns-card p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="ns-section-title">
                            Live Workspace Monitoring ({workspaceStatus.workspace_path})
                          </h3>
                          <p className="text-[11px] text-[#AD98C5] mt-0.5">
                            Status: <strong className="text-emerald-400 font-mono uppercase">{workspaceStatus.monitoring_status}</strong> |{" "}
                            Dummy Files: <strong className="font-mono text-[#F5EDFF]">{workspaceStatus.file_count}</strong> |{" "}
                            Telemetry: <strong className="font-mono text-[#C084FC]">{workspaceStatus.telemetry_status}</strong>
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-[#AD98C5]">
                          Observed Events: {workspaceStatus.measurable_features?.observed_event_count ?? 0} |{" "}
                          Exts: {workspaceStatus.measurable_features?.unique_ext_count ?? 0}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-[#160D26]/14 border border-purple-300/12 rounded-lg max-h-32 overflow-y-auto">
                          <span className="text-[10px] font-mono text-[#AD98C5] uppercase block mb-1">
                            Recent Observed File Activity (workspace_observer)
                          </span>
                          {workspaceStatus.recent_events?.length > 0 ? (
                            workspaceStatus.recent_events.slice(0, 6).map((ev, i) => (
                              <div key={i} className="font-mono text-[11px] text-[#E9D5FF] flex justify-between">
                                <span>[{ev.event_type}] {ev.filename}</span>
                                <span className="text-[#AD98C5]">{ev.timestamp.substring(11, 19)}Z</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-[#AD98C5]">
                              No manual edits yet. Edit or rename a file in demo_workspace/ to observe live events.
                            </span>
                          )}
                        </div>
                        <div className="p-2.5 bg-[#160D26]/14 border border-purple-300/12 rounded-lg">
                          <span className="text-[10px] font-mono text-amber-300 uppercase block mb-1">
                            Unavailable Measurements (Not Fabricated)
                          </span>
                          <ul className="space-y-0.5 text-[11px] font-mono text-[#AD98C5]">
                            {(workspaceStatus.unavailable_features || []).map((u, i) => (
                              <li key={i}>• {u}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="ns-card p-4">
                      <h3 className="ns-section-title mb-3">
                        Request Volume Breakdown
                      </h3>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: "Accepted", count: gateway.accepted_requests },
                              { name: "Throttled", count: gateway.throttled_requests },
                              { name: "Rejected", count: gateway.rejected_requests }
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#29193E" />
                            <XAxis dataKey="name" stroke="#AD98C5" fontSize={11} />
                            <YAxis stroke="#AD98C5" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: "#10091C", borderColor: "#B88635", fontSize: "11px" }} />
                            <Bar dataKey="count" fill="#E8BB65" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="ns-card p-4">
                      <h3 className="ns-section-title mb-3">
                        Simulated Uploader Activity
                      </h3>
                      {gateway.uploaders.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs text-[#AD98C5] border border-dashed border-purple-900/50 rounded-lg">
                          No simulated uploaders yet. Trigger a gateway scenario above.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {gateway.uploaders.map((u) => (
                            <div key={u.uploader_id} className="p-2.5 bg-[#160D26]/14 border border-purple-300/12 rounded-lg flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="text-[#C084FC] font-semibold">{u.uploader_id}</span>
                                <span className="text-[#AD98C5] ml-2">({u.fictional_ip})</span>
                              </div>
                              <span className="text-[#E9D5FF]">
                                Req: {u.request_count} | Rest: {u.restricted_count}
                              </span>
                              <span className={u.status === "simulated_restricted" ? "text-rose-400" : "text-emerald-400"}>
                                {u.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ns-card p-4">
                    <h3 className="ns-section-title mb-3">
                      Recent Gateway Decision Explanations
                    </h3>
                    {gateway.recent_decisions.length === 0 ? (
                      <p className="text-xs text-[#AD98C5]">No gateway decisions recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {gateway.recent_decisions.slice(0, 8).map((d, idx) => (
                          <div key={idx} className="p-2 bg-[#160D26]/14 border border-purple-300/12 rounded-lg flex items-center justify-between text-xs">
                            <span className="font-mono text-[#C084FC]">{d.uploader_id}</span>
                            <span className="text-[#E9D5FF] truncate max-w-lg">{d.reason}</span>
                            <span
                              className={`ns-badge ${
                                d.decision === "accepted" ? "ns-badge-green" : "ns-badge-red"
                              }`}
                            >
                              {d.decision}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="ns-card p-8 text-center text-xs text-[#AD98C5] border-dashed">
                  Gateway status unavailable. Ensure backend is running.
                </div>
              )}
            </div>
          )}

          {/* ENDPOINTS (PHASE 9 MULTI-ENDPOINT VIRTUAL ORGANIZATION) */}
          {activeTab === "endpoints" && (
            <div className="space-y-5">
              {/* Organization Summary & Filters */}
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">Virtual Organization Endpoints (Simulated)</h3>
                  <p className="text-xs text-[#AD98C5] mt-0.5">
                    {endpoints.filter((e) => e.status === "monitoring").length} monitoring |{" "}
                    {endpoints.filter((e) => e.status === "simulated_isolated").length} simulated_isolated |{" "}
                    Target for scenarios: <strong className="font-mono text-[#C084FC]">{selectedEndpointId}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => setLowPerfMode((v) => !v)}
                    className="ns-btn ns-btn-ghost text-[11px]"
                  >
                    {lowPerfMode ? "Enable 3D Topology" : "2D Fallback Mode"}
                  </button>
                  <input
                    type="text"
                    value={epSearch}
                    onChange={(e) => setEpSearch(e.target.value)}
                    placeholder="Search ID or device..."
                    className="ns-input"
                  />
                  <select
                    value={epDeptFilter}
                    onChange={(e) => setEpDeptFilter(e.target.value)}
                    className="ns-input"
                  >
                    <option value="all">All Departments</option>
                    <option value="Finance">Finance</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="IT & Backup">IT & Backup</option>
                    <option value="Administration">Administration</option>
                  </select>
                  <select
                    value={epStatusFilter}
                    onChange={(e) => setEpStatusFilter(e.target.value)}
                    className="ns-input"
                  >
                    <option value="all">All Statuses</option>
                    <option value="monitoring">monitoring</option>
                    <option value="paused">paused</option>
                    <option value="simulated_isolated">simulated_isolated</option>
                  </select>
                </div>
              </div>

              {/* Interactive 3D Network Topology */}
              <div className="ns-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="ns-section-title">Interactive Endpoint Network Topology</span>
                  <span className="text-[11px] text-[#AD98C5]">Hover a node to highlight connections • Click to inspect</span>
                </div>
                <Suspense
                  fallback={
                    <div className="h-72 flex items-center justify-center text-xs text-[#C084FC] font-mono">
                      Loading 3D Topology...
                    </div>
                  }
                >
                  <SecurityTopology3D
                    endpoints={endpoints}
                    selectedEndpointId={selectedEndpointId}
                    onSelectEndpoint={setSelectedEndpointId}
                    gateway={gateway}
                    lowPerfMode={lowPerfMode}
                  />
                </Suspense>
              </div>

              {/* Endpoints Table */}
              <div className="ns-card p-4 overflow-x-auto">
                <table className="ns-table">
                  <thead>
                    <tr>
                      <th>Endpoint ID</th>
                      <th>Device</th>
                      <th>Department</th>
                      <th>Virtual OS</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoints
                      .filter((ep) => {
                        const q = epSearch.toLowerCase();
                        const matchQ =
                          !q ||
                          ep.endpoint_id.toLowerCase().includes(q) ||
                          (ep.device_name || "").toLowerCase().includes(q);
                        const matchDept = epDeptFilter === "all" || ep.department === epDeptFilter;
                        const matchStatus = epStatusFilter === "all" || ep.status === epStatusFilter;
                        return matchQ && matchDept && matchStatus;
                      })
                      .map((ep) => (
                        <tr
                          key={ep.endpoint_id}
                          onClick={() => setSelectedEndpointId(ep.endpoint_id)}
                          className={`cursor-pointer ${
                            selectedEndpointId === ep.endpoint_id ? "bg-[#2E1065]/30" : ""
                          }`}
                        >
                          <td className="font-mono text-[#C084FC] font-semibold">{ep.endpoint_id}</td>
                          <td className="font-mono text-[#F5EDFF]">{ep.device_name}</td>
                          <td className="text-[#E9D5FF]">{ep.department}</td>
                          <td className="text-[#AD98C5]">{ep.virtual_os}</td>
                          <td className="font-mono font-bold">
                            <span className={(ep.current_risk_score || 0) >= 50 ? "text-rose-400" : "text-emerald-400"}>
                              {ep.current_risk_score ?? 0}/100
                            </span>
                          </td>
                          <td>
                            <span
                              className={`ns-badge ${
                                ep.status === "simulated_isolated"
                                  ? "ns-badge-red"
                                  : ep.status === "paused"
                                  ? "ns-badge-amber"
                                  : "ns-badge-green"
                              }`}
                            >
                              {ep.status}
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await toggleEndpointMonitoring(ep.endpoint_id);
                                await loadAllData();
                              }}
                              className="text-[11px] text-[#C084FC] hover:text-[#E9D5FF] underline"
                            >
                              {ep.status === "monitoring" ? "Pause" : "Resume/Restore"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Selected Endpoint File Explorer */}
              {activeEndpoint && (
                <div className="ns-card p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="ns-section-title">
                        Virtual Workstation File Explorer — {activeEndpoint.endpoint_id} ({activeEndpoint.department})
                      </h3>
                      <p className="text-[11px] text-[#AD98C5] mt-0.5">
                        Harmless metadata records only. Last activity: {activeEndpoint.last_activity || "Baseline"}
                      </p>
                    </div>
                    <span className="ns-badge ns-badge-violet">
                      {(activeEndpoint.virtual_files || []).length} virtual files
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-purple-300/12 rounded-lg bg-[#160D26]/14">
                    <table className="ns-table">
                      <thead>
                        <tr>
                          <th>Filename</th>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Last Simulated Activity</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {(activeEndpoint.virtual_files || []).map((vf) => (
                          <tr key={vf.file_id}>
                            <td className="text-[#F5EDFF]">{vf.filename}</td>
                            <td className="text-[#AD98C5] font-sans">{vf.file_type}</td>
                            <td className="text-[#AD98C5]">{vf.size}</td>
                            <td className="text-[#AD98C5] font-sans">{vf.last_activity}</td>
                            <td>
                              <span
                                className={
                                  vf.status === "simulated_encrypted"
                                    ? "text-rose-400 font-semibold"
                                    : vf.status === "simulated_altered"
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                                }
                              >
                                {vf.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INCIDENTS (PHASE 10 ADVANCED INVESTIGATION CENTER) */}
          {activeTab === "incidents" && (
            <div className="space-y-5">
              <div className="ns-card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#F5EDFF]">Incident Investigation Center (Simulated)</h3>
                  <p className="text-xs text-[#AD98C5]">
                    Select an incident to inspect AI attributions, replay stored timeline, or resolve simulated containment.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    aria-label="Select FinTech PDF Report Type"
                    className="ns-input text-xs"
                  >
                    {REPORT_TYPES.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setReportPreviewData(
                        buildReportData(reportType, {
                          health,
                          endpoints,
                          assessments,
                          incidents,
                          activeIncident,
                          workspaceStatus,
                          gateway,
                          metrics,
                          earlyWarning,
                        })
                      )
                    }
                    className="ns-btn ns-btn-folder"
                  >
                    Preview Report
                  </button>
                  <button
                    onClick={() => {
                      const rpt = downloadFinTechPdf(reportType, {
                        health,
                        endpoints,
                        assessments,
                        incidents,
                        activeIncident,
                        workspaceStatus,
                        gateway,
                        metrics,
                        earlyWarning,
                      });
                      setStatusBanner({
                        type: "ok",
                        text: `Generated and downloaded ${rpt.reportId}.pdf (${rpt.title}).`,
                      });
                    }}
                    className="ns-btn ns-btn-primary"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                  <input
                    type="text"
                    value={incSearch}
                    onChange={(e) => setIncSearch(e.target.value)}
                    placeholder="Search incident or endpoint..."
                    className="ns-input w-48"
                  />
                </div>
              </div>

              {incidents.length === 0 ? (
                <div className="ns-card p-8 text-center border-dashed space-y-3">
                  <p className="text-xs text-[#AD98C5]">No simulated incidents recorded. All {endpoints.length} virtual endpoints are monitoring.</p>
                  <button
                    onClick={() => handleScenarioTrigger("suspicious")}
                    className="ns-btn ns-btn-danger"
                  >
                    Trigger Suspicious Scenario on {selectedEndpointId}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Incident List */}
                  <div className="ns-card p-4 space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="ns-section-title block mb-2">
                      Recorded Incidents ({incidents.length})
                    </span>
                    <div className="interactive-group space-y-2">
                    {incidents
                      .filter((inc) => {
                        const q = incSearch.toLowerCase();
                        return (
                          !q ||
                          inc.incident_id.toLowerCase().includes(q) ||
                          inc.endpoint_id.toLowerCase().includes(q)
                        );
                      })
                      .map((inc) => (
                        <InteractiveCard
                          key={inc.incident_id}
                          noPerspective
                          onClick={() => {
                            setSelectedIncidentId(inc.incident_id);
                            setAdminNotes(inc.admin_notes || "");
                            setReplayPlaying(false);
                            setReplayStep(0);
                          }}
                          className={`w-full text-left p-3 rounded-lg border ${
                            activeIncident?.incident_id === inc.incident_id
                              ? "!bg-[#29193E]/70 !border-[#E8BB65]/80 shadow-[0_0_14px_-4px_rgba(232,187,101,0.35)]"
                              : ""
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-rose-300 font-bold">{inc.incident_id}</span>
                            <span className="ns-badge ns-badge-violet">
                              {inc.investigation_status || "open"}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#AD98C5] mt-1.5 font-mono">
                            <span>{inc.endpoint_id}</span>
                            <span>Score: {inc.risk_score ?? "--"}/100</span>
                          </div>
                        </InteractiveCard>
                      ))}
                    </div>
                  </div>

                  {/* Dedicated Investigation Workspace */}
                  {activeIncident && (
                    <div className="lg:col-span-2 ns-card p-5 space-y-4">
                      {/* A. Incident Overview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-purple-300/12 pb-3">
                        <div>
                          <h4 className="text-sm font-bold font-mono text-rose-300">
                            {activeIncident.incident_id} — {activeIncident.endpoint_id}
                          </h4>
                          <p className="text-xs text-[#AD98C5] mt-0.5">
                            Severity: <strong className="uppercase text-rose-300">{activeIncident.severity}</strong> | Model:{" "}
                            <span className="font-mono text-[#E9D5FF]">{activeIncident.model_version || "rf-phase2-v1"}</span> | Latency:{" "}
                            <span className="font-mono text-[#C084FC]">{activeIncident.processing_time_ms ?? "--"} ms</span>
                          </p>
                        </div>
                        <a
                          href={getIncidentReportUrl(activeIncident.incident_id)}
                          download={`${activeIncident.incident_id}_report.md`}
                          className="ns-btn ns-btn-folder"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report</span>
                        </a>
                      </div>

                      {/* B. Behaviour Timeline & Incident Replay */}
                      {activeIncident.timeline && activeIncident.timeline.length > 0 && (
                        <div className="p-3.5 bg-[#160D26]/14 border border-purple-300/12 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="ns-section-title">
                              Stored Incident Replay ({replayStep + 1}/{activeIncident.timeline.length})
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setReplayPlaying((p) => !p)}
                                className="ns-btn ns-btn-primary text-[11px] py-1 px-2.5"
                              >
                                {replayPlaying ? "Pause" : "Play"}
                              </button>
                              <button
                                onClick={() => {
                                  setReplayPlaying(false);
                                  setReplayStep(0);
                                }}
                                className="ns-btn ns-btn-ghost text-[11px] py-1 px-2.5"
                              >
                                Restart
                              </button>
                            </div>
                          </div>
                          <div className="ns-timeline space-y-2 text-xs">
                            {activeIncident.timeline.slice(0, replayStep + 1).map((ev, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="ns-timeline-dot" />
                                <div>
                                  <span className="text-[#F5EDFF]">{ev.event}</span>
                                  <span className="text-[11px] font-mono text-[#AD98C5] ml-2">(+{ev.elapsed_ms} ms)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* C. AI Intelligence */}
                      <div className="interactive-group grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <InteractiveCard noPerspective className="p-3 space-y-1.5">
                          <span className="text-[11px] font-semibold text-[#E8BB65] uppercase block">Model-Derived Explanations</span>
                          {(activeIncident.explanations?.model_derived || []).map((m, i) => (
                            <div key={i} className="font-mono text-[11px] text-[#E9D5FF]">{m}</div>
                          ))}
                        </InteractiveCard>
                        <InteractiveCard noPerspective className="p-3 space-y-1.5">
                          <span className="text-[11px] font-semibold text-amber-300 uppercase block">Heuristic Explanations</span>
                          {(activeIncident.explanations?.heuristic || []).map((h, i) => (
                            <div key={i} className="font-mono text-[11px] text-[#E9D5FF]">{h}</div>
                          ))}
                        </InteractiveCard>
                      </div>

                      {/* E. Response & Recovery */}
                      <div className="p-3.5 bg-[#160D26]/14 border border-purple-300/12 rounded-lg space-y-3">
                        <span className="ns-section-title block">
                          Simulated Response & Recovery
                        </span>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add administrator investigation notes..."
                          className="ns-input w-full h-16 p-2"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              await reviewIncident(activeIncident.incident_id, adminNotes);
                              await loadAllData();
                            }}
                            className="ns-btn ns-btn-folder"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={async () => {
                              await resolveIncident(activeIncident.incident_id, adminNotes);
                              await loadAllData();
                            }}
                            className="ns-btn ns-btn-primary"
                          >
                            Resolve & Restore Endpoint Monitoring
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODEL ANALYTICS */}
          {activeTab === "analytics" && (
            <AnalyticsSection
              p2={p2}
              p1={p1}
              p2Accuracy={p2Accuracy}
              metrics={metrics}
              earlyWarning={earlyWarning}
              fpComparisonData={fpComparisonData}
              workspaceStatus={workspaceStatus}
            />
          )}
        </div>
      </main>

      {/* FinTech Report Preview Modal */}
      {reportPreviewData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-[#181026] rounded-xl shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-[#B88635]">
            <div className="bg-[#2E1065] text-white px-6 py-4 flex items-center justify-between border-b-2 border-[#B88635]">
              <div>
                <div className="text-xs font-mono text-[#E8BB65] tracking-wider">
                  NEXUS SENTINEL · {reportPreviewData.reportId}
                </div>
                <h3 className="text-base font-bold">{reportPreviewData.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    downloadFinTechPdf(reportPreviewData.reportType, {
                      health,
                      endpoints,
                      assessments,
                      incidents,
                      activeIncident,
                      workspaceStatus,
                      gateway,
                      metrics,
                      earlyWarning,
                    });
                  }}
                  className="px-3 py-1.5 bg-[#E8BB65] text-[#181026] font-semibold text-xs rounded hover:bg-[#FFE3A5] transition"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => setReportPreviewData(null)}
                  className="px-3 py-1.5 bg-white/15 text-white text-xs rounded hover:bg-white/25 transition"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 text-xs leading-relaxed">
              {reportPreviewData.sections.map((sec, idx) => (
                <div key={sec.id} className="space-y-2">
                  <h4 className="text-sm font-bold text-[#2E1065] border-b border-[#B88635]/60 pb-1">
                    {String(idx + 1).padStart(2, "0")} — {sec.title}
                  </h4>
                  {sec.paragraphs?.map((p, i) => (
                    <p key={i} className="text-[#181026]">{p}</p>
                  ))}
                  {sec.table && sec.table.body.length > 0 && (
                    <div className="overflow-x-auto border border-purple-200 rounded">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#2E1065] text-white">
                          <tr>
                            {sec.table.head[0].map((h, hi) => (
                              <th key={hi} className="p-2">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-100">
                          {sec.table.body.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 1 ? "bg-[#F5F0FF]" : "bg-white"}>
                              {row.map((cell, ci) => (
                                <td key={ci} className="p-2">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
