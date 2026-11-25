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
  HardDrive,
  Lock,
  Upload,
  Download,
  ArrowRight,
  Clock,
  Cpu
} from "lucide-react";
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
  resetWorkspaceSimulation
} from "./services/api";

const SecurityTopology3D = lazy(() => import("./components/SecurityTopology3D"));

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
  const [virtualFiles, setVirtualFiles] = useState(INITIAL_VIRTUAL_FILES);
  const [monitorStatus, setMonitorStatus] = useState({
    status: "stopped",
    processed_count: 0,
    total_sequence: 6,
    duration_seconds: 0
  });
  const fileInputRef = useRef(null);
  const isFetchingRef = useRef(false);

  const loadStaticAnalytics = async () => {
    const [metRes, ewRes] = await Promise.all([
      fetchMetrics().catch(() => null),
      fetchEarlyWarningMetrics().catch(() => null)
    ]);
    setMetrics(metRes);
    setEarlyWarning(ewRes);
  };

  const loadAllData = async () => {
    if (isFetchingRef.current) return;
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
          setVirtualFiles((prev) =>
            prev.map((f, i) =>
              i % 2 === 0
                ? {
                    ...f,
                    state: "simulated_encrypted",
                    name: f.name.endsWith(".locked") ? f.name : `${f.name}.locked`
                  }
                : { ...f, state: "simulated_altered" }
            )
          );
        }
      }
    } catch {
      setStatusBanner({ type: "error", text: "Failed to synchronize with backend." });
    } finally {
      isFetchingRef.current = false;
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
      const res = await triggerDemoScenario(scenario, selectedEndpointId);
      await loadAllData();
      if (res.assessment) setSelectedAssessment(res.assessment);
      if (res.incident) setSelectedIncidentId(res.incident.incident_id);
      if (scenario !== "suspicious") {
        setVirtualFiles(INITIAL_VIRTUAL_FILES);
      }
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
      await resetDemo();
      setSelectedAssessment(null);
      setBatchResult(null);
      setVirtualFiles(INITIAL_VIRTUAL_FILES);
      setStatusBanner({ type: "ok", text: "Simulated environment reset to monitoring posture." });
      await loadAllData();
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
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/60 border border-cyan-800/50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wide text-slate-100">Nexus Sentinel</h1>
              <span className="text-[10px] text-cyan-400 font-mono">DEFENSIVE PROTOTYPE</span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: "overview", label: "Overview", icon: Activity },
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
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[9px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  {typeof item.count === "number" && (
                    <span
                      className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.warn
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-300"
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

        <div className="p-4 border-t border-slate-800 bg-slate-900/70">
          <div className="flex items-center space-x-2 text-[11px] text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-mono uppercase font-semibold">Simulation Mode</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-snug">
            Synthetic tabular observations only. Endpoint isolation and containment are simulated.
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-14 border-b border-slate-800 bg-slate-900/40 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold text-slate-100">
              {activeTab === "simlab" ? "Simulation Lab" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <span className="text-slate-700">|</span>
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${health.status === "ok" ? "bg-emerald-400" : "bg-rose-500"}`} />
              <span className="text-[11px] font-mono text-slate-400">
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
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded border border-slate-700 transition capitalize disabled:opacity-50"
              >
                {sc}
              </button>
            ))}
            <button
              onClick={() => handleScenarioTrigger("suspicious")}
              disabled={actionLoading}
              className="text-xs bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 px-2.5 py-1.5 rounded border border-rose-800/60 transition font-medium disabled:opacity-50"
            >
              Suspicious
            </button>
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1.5 rounded border border-cyan-800/50 transition flex items-center space-x-1 disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-5 max-w-7xl w-full mx-auto">
          {health.status !== "ok" && (
            <div className="p-3.5 bg-rose-950/20 border border-rose-800/50 rounded-lg flex items-center space-x-3 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                Backend offline at <code className="font-mono text-cyan-300">http://localhost:8000</code>. Start with{" "}
                <code className="font-mono text-cyan-300">uvicorn backend.main:app --port 8000</code>.
              </span>
            </div>
          )}

          {statusBanner && (
            <div
              className={`px-3.5 py-2 rounded-md border text-xs flex items-center justify-between ${
                statusBanner.type === "error"
                  ? "bg-rose-950/30 border-rose-800/50 text-rose-200"
                  : statusBanner.type === "alert"
                  ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                  : "bg-cyan-950/30 border-cyan-800/50 text-cyan-200"
              }`}
            >
              <span>{statusBanner.text}</span>
              <button onClick={() => setStatusBanner(null)} className="text-[11px] opacity-70 hover:opacity-100">
                Dismiss
              </button>
            </div>
          )}

          {/* OVERVIEW (SECURITY OPERATIONS CENTER) */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* System Health & Protection Status */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-slate-100">Security Operations Center</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      Model: {health.model_version || "rf-phase2-v1"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                    <span>Backend: <strong className={health.components?.backend === "ok" ? "text-emerald-400" : "text-rose-400"}>{health.components?.backend || health.status}</strong></span>
                    <span>DB: <strong className={health.components?.database === "ok" ? "text-emerald-400" : "text-rose-400"}>{health.components?.database || "--"}</strong></span>
                    <span>ML: <strong className={health.components?.ml_engine === "ok" ? "text-emerald-400" : "text-rose-400"}>{health.components?.ml_engine || "--"}</strong></span>
                    <span>Gateway: <strong className="text-cyan-300">{health.components?.gateway || "active"}</strong></span>
                    <span>Monitor: <strong className="text-cyan-300 uppercase">{monitorStatus.status}</strong></span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab("simlab")}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded transition flex items-center space-x-1"
                  >
                    <span>Simulation Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveTab("gateway")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                  >
                    Gateway
                  </button>
                  <button
                    onClick={() => setActiveTab("incidents")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                  >
                    Incidents ({incidents.length})
                  </button>
                </div>
              </div>

              {/* 3D Network Topology & Protection Core */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Live 3D Network Topology & Protection Core
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Click any virtual workstation node to inspect its file workspace. Drag to orbit, scroll to zoom.
                    </p>
                  </div>
                  <button
                    onClick={() => setLowPerfMode((v) => !v)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded border border-slate-700"
                  >
                    {lowPerfMode ? "Enable 3D View" : "Low-Perf 2D Mode"}
                  </button>
                </div>
                <Suspense
                  fallback={
                    <div className="h-72 flex items-center justify-center text-xs text-slate-500 font-mono bg-slate-950 border border-slate-800 rounded-lg">
                      Loading 3D Security Topology...
                    </div>
                  }
                >
                  <SecurityTopology3D
                    endpoints={endpoints}
                    selectedEndpointId={selectedEndpointId}
                    onSelectEndpoint={(id) => {
                      setSelectedEndpointId(id);
                      setActiveTab("endpoints");
                    }}
                    gateway={gateway}
                    replayIncident={replayPlaying ? activeIncident : null}
                    replayStep={replayStep}
                    lowPerfMode={lowPerfMode}
                  />
                </Suspense>
              </div>

              {/* Core SOC Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400">Assessments / Incidents</span>
                  <div className="text-xl font-bold text-slate-100 mt-1 font-mono">
                    {assessments.length} <span className="text-amber-400 text-sm">/ {incidents.length} inc</span>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400">Obs-Level FPR (n=400)</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {p2 ? `${(p2.false_positive_rate * 100).toFixed(2)}%` : "--"}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400">Seq Control FA (n=60)</span>
                  <div className="text-xl font-bold text-cyan-300 mt-1 font-mono">
                    {earlyWarning ? `${(earlyWarning.benign_control_false_alarm_rate * 100).toFixed(1)}%` : "--"}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400">Early Detection (n=60)</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    {earlyWarning ? `${(earlyWarning.early_detection_rate * 100).toFixed(1)}%` : "--"}
                  </div>
                </div>
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400">Gateway Avoided / Latency</span>
                  <div className="text-xl font-bold text-cyan-300 mt-1 font-mono">
                    {gateway ? gateway.avoided_assessments : 0}{" "}
                    <span className="text-slate-400 text-xs">
                      ({earlyWarning ? `${earlyWarning.latency_median_ms}ms` : "--"})
                    </span>
                  </div>
                </div>
              </div>

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
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                    Risk Score History
                  </h3>
                  {chartData.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-800 rounded gap-2">
                      <span>No assessments recorded yet.</span>
                      <button
                        onClick={() => handleScenarioTrigger("normal")}
                        className="text-cyan-400 hover:text-cyan-300 underline"
                      >
                        Run Normal Scenario
                      </button>
                    </div>
                  ) : (
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                          <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }} />
                          <Line type="monotone" dataKey="risk_score" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                    Recent Assessments
                  </h3>
                  {assessments.length === 0 ? (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
                      Empty observation feed.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Score</th>
                            <th className="pb-2">Label</th>
                            <th className="pb-2">Time (UTC)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {assessments.slice(0, 5).map((a) => (
                            <tr key={a.assessment_id} className="hover:bg-slate-800/30">
                              <td className="py-2 font-mono text-cyan-400">{a.assessment_id}</td>
                              <td className="py-2 font-mono font-semibold">
                                {a.risk_score !== null ? a.risk_score : "null"}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                                    a.label === "suspicious"
                                      ? "bg-rose-950/60 text-rose-300 border border-rose-800/50"
                                      : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                                  }`}
                                >
                                  {a.label}
                                </span>
                              </td>
                              <td className="py-2 font-mono text-slate-400">{a.timestamp.substring(11, 19)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* WORKSPACE PROTECTION CENTER */}
          {activeTab === "workspace" && workspaceStatus && (
            <div className="space-y-5">
              {/* Controls & Status */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Workspace Protection Center ({workspaceStatus.workspace_path})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Monitor: <strong className="text-emerald-400 font-mono uppercase">{workspaceStatus.monitoring_status}</strong> |{" "}
                    Harness: <strong className="text-cyan-300 font-mono uppercase">{workspaceStatus.harness_state?.status || "idle"}</strong> |{" "}
                    Telemetry: <strong className="text-amber-300 font-mono">{workspaceStatus.telemetry_status}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded transition disabled:opacity-50"
                  >
                    Run Test Script
                  </button>
                  <button
                    onClick={async () => {
                      setWorkspaceStatus(await stopWorkspaceTest());
                    }}
                    className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 text-xs rounded border border-rose-800/60"
                  >
                    Stop Test
                  </button>
                  <button
                    onClick={async () => {
                      setWorkspaceStatus(await fetchWorkspaceStatus());
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700"
                  >
                    Refresh Workspace
                  </button>
                  <button
                    onClick={async () => {
                      setWorkspaceStatus(await resetWorkspaceSimulation());
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-cyan-800/50"
                  >
                    Reset Simulation
                  </button>
                </div>
              </div>

              {/* Containment & Latency Summary */}
              {workspaceStatus.harness_state && (
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">Observations</span>
                    <span className="text-lg font-bold text-slate-100">{workspaceStatus.harness_state.observations_processed}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">AI Risk Score</span>
                    <span className={`text-lg font-bold ${(workspaceStatus.harness_state.latest_assessment?.risk_score ?? 0) >= 50 ? "text-rose-400" : "text-emerald-400"}`}>
                      {workspaceStatus.harness_state.latest_assessment?.risk_score ?? "--"}/100
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">Detection Latency</span>
                    <span className="text-lg font-bold text-cyan-300">
                      {workspaceStatus.harness_state.measured_detection_latency_ms ?? "--"} ms
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">Virtually Affected</span>
                    <span className="text-lg font-bold text-rose-400">{workspaceStatus.harness_state.virtually_affected_count}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">Unaffected Files</span>
                    <span className="text-lg font-bold text-emerald-400">{workspaceStatus.harness_state.unaffected_count}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <span className="text-[11px] text-slate-400 block font-sans">Containment</span>
                    <span className="text-sm font-bold text-purple-300 uppercase">
                      {workspaceStatus.harness_state.containment_timestamp ? "SIM_ISOLATED" : "MONITORING"}
                    </span>
                  </div>
                </div>
              )}

              {/* Live File Explorer */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Live File Explorer ({workspaceStatus.file_count} Actual Files in demo_workspace/)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Real files on disk are never encrypted or modified.
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto border border-slate-800 rounded bg-slate-950">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                      <tr>
                        <th className="p-2">Filename</th>
                        <th className="p-2">Ext</th>
                        <th className="p-2">Size</th>
                        <th className="p-2">Last Modified (UTC)</th>
                        <th className="p-2">Observed Activity</th>
                        <th className="p-2">Simulated Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                      {(workspaceStatus.files || []).map((f) => (
                        <tr key={f.filename}>
                          <td className="p-2 text-slate-200">{f.filename}</td>
                          <td className="p-2 text-slate-400">{f.extension}</td>
                          <td className="p-2 text-slate-400">{f.size_bytes} B</td>
                          <td className="p-2 text-slate-500">{f.last_modified.substring(0, 19)}Z</td>
                          <td className="p-2 text-cyan-300">{f.observed_activity}</td>
                          <td className="p-2">
                            <span
                              className={
                                f.simulated_status === "simulated_encrypted"
                                  ? "text-rose-400 font-semibold"
                                  : f.simulated_status === "simulated_altered"
                                  ? "text-amber-400"
                                  : f.simulated_status === "simulated_contained"
                                  ? "text-purple-300"
                                  : "text-emerald-400"
                              }
                            >
                              {f.simulated_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity Feed & Unavailable Features */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg max-h-48 overflow-y-auto">
                  <span className="text-[11px] font-mono text-slate-400 uppercase block mb-2">
                    Recent Observed & Synthetic Events
                  </span>
                  {workspaceStatus.recent_events?.length > 0 ? (
                    workspaceStatus.recent_events.slice(0, 10).map((ev, i) => (
                      <div key={i} className="font-mono text-[11px] text-slate-300 flex justify-between py-1 border-b border-slate-800/50">
                        <span>[{ev.event_type}] {ev.filename}</span>
                        <span className="text-slate-500">{ev.telemetry_source}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      No events yet. Edit a file in demo_workspace/ or click Run Test Script.
                    </span>
                  )}
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] font-mono text-amber-300 uppercase block mb-2">
                    Unavailable Measurements (Not Fabricated)
                  </span>
                  <ul className="space-y-1 text-xs font-mono text-slate-400">
                    {(workspaceStatus.unavailable_features || []).map((u, i) => (
                      <li key={i}>• {u}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION LAB */}
          {activeTab === "simlab" && (
            <div className="space-y-5">
              {/* Continuous Virtual Monitoring Controls */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Continuous Virtual Monitoring (Synthetic Replay)</h3>
                  <p className="text-xs text-slate-400">
                    Sequential replay of harmless synthetic observations. Status:{" "}
                    <span className="font-mono text-cyan-300 uppercase">{monitorStatus.status}</span> | Processed:{" "}
                    <span className="font-mono text-slate-200">{monitorStatus.processed_count}</span> | Duration:{" "}
                    <span className="font-mono text-slate-200">{monitorStatus.duration_seconds}s</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleMonitorAction(startMonitor)}
                    disabled={actionLoading || monitorStatus.status === "running"}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded transition disabled:opacity-40"
                  >
                    Start
                  </button>
                  <button
                    onClick={() => handleMonitorAction(pauseMonitor)}
                    disabled={actionLoading || monitorStatus.status !== "running"}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition disabled:opacity-40"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleMonitorAction(resumeMonitor)}
                    disabled={actionLoading || monitorStatus.status !== "paused"}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-cyan-800/50 transition disabled:opacity-40"
                  >
                    Resume
                  </button>
                  <button
                    onClick={() => handleMonitorAction(stopMonitor)}
                    disabled={actionLoading || monitorStatus.status === "stopped"}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-200 text-xs rounded border border-rose-800/60 transition disabled:opacity-40"
                  >
                    Stop
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700 transition disabled:opacity-40"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Scenario Controls & File Picker */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Synthetic Telemetry & Scenario Runner</h3>
                  <p className="text-xs text-slate-400">
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
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 text-xs rounded border border-cyan-800/50 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV/JSON</span>
                  </button>
                  <a
                    href={getSampleDatasetUrl("csv")}
                    download="synthetic_telemetry_sample.csv"
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sample CSV</span>
                  </a>
                  <a
                    href={getSampleDatasetUrl("json")}
                    download="synthetic_telemetry_sample.json"
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Sample JSON</span>
                  </a>
                </div>
              </div>

              {/* Virtual Workspace + Prominent Assessment Result */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span>Virtual In-Memory Workspace (Simulated Host: demo-01)</span>
                    </h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                      {endpoints[0]?.status || "monitoring"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {virtualFiles.map((file) => (
                      <div
                        key={file.id}
                        className={`p-2.5 rounded border text-xs transition-colors ${
                          file.state === "simulated_encrypted"
                            ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                            : file.state === "simulated_altered"
                            ? "bg-amber-950/30 border-amber-800/50 text-amber-200"
                            : "bg-slate-950 border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 truncate font-mono text-[11px]">
                          {file.state === "simulated_encrypted" ? (
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                          <span>ΔH: {file.entropy}</span>
                          <span>{file.state === "simulated_encrypted" ? "SIM_LOCKED" : "INTACT"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prominent Detection Result */}
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Latest Assessment
                    </span>
                    {selectedAssessment && (
                      <span className="text-[11px] font-mono text-cyan-400">{selectedAssessment.assessment_id}</span>
                    )}
                  </div>
                  {selectedAssessment ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Risk Score</span>
                          <span
                            className={`text-2xl font-bold font-mono ${
                              selectedAssessment.risk_score >= 50 ? "text-rose-400" : "text-emerald-400"
                            }`}
                          >
                            {selectedAssessment.risk_score !== null ? `${selectedAssessment.risk_score}/100` : "null"}
                          </span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-semibold ${
                            selectedAssessment.label === "suspicious"
                              ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                              : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                          }`}
                        >
                          {selectedAssessment.label}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                        <span>Model: {selectedAssessment.model_version || "rf-phase2-v1"}</span>
                        <span>Time: {selectedAssessment.processing_time_ms ?? "--"} ms</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] text-slate-400 font-medium">Model & Heuristic Explanations:</span>
                        <div className="max-h-28 overflow-y-auto space-y-1">
                          {selectedAssessment.indicators.map((ind, i) => (
                            <div key={i} className="text-[11px] font-mono text-cyan-300 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              {ind}
                            </div>
                          ))}
                        </div>
                      </div>
                      {selectedAssessment.timeline && (
                        <div className="border-l-2 border-slate-800 pl-2.5 space-y-1">
                          {selectedAssessment.timeline.map((ev, i) => (
                            <div key={i} className="text-[11px]">
                              <span className="text-slate-300">{ev.event}</span>
                              <span className="text-slate-500 font-mono ml-1.5">(+{ev.elapsed_ms} ms)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-500">
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
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
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
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline"
                    >
                      Fill Example Batch
                    </button>
                  </div>
                  <textarea
                    value={importedData}
                    onChange={(e) => setImportedData(e.target.value)}
                    placeholder="Paste synthetic CSV or JSON records, or use Upload CSV/JSON above..."
                    className="w-full h-36 p-2.5 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                  <button
                    onClick={handleBatchImport}
                    disabled={actionLoading}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Batch Assessment</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider block">
                    Batch Assessment Summary
                  </span>
                  {batchResult ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-center font-mono">
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block">TOTAL</span>
                          <span className="text-sm font-bold">{batchResult.total}</span>
                        </div>
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-emerald-400 block">NORMAL</span>
                          <span className="text-sm font-bold text-emerald-400">{batchResult.normal_count}</span>
                        </div>
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-rose-400 block">SUSPICIOUS</span>
                          <span className="text-sm font-bold text-rose-400">{batchResult.suspicious_count}</span>
                        </div>
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-slate-400 block">INVALID</span>
                          <span className="text-sm font-bold text-slate-400">{batchResult.invalid_count}</span>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                        <span>Total: {batchResult.total_processing_time_ms} ms</span>
                        <span>Avg: {batchResult.avg_latency_ms} ms/record</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded bg-slate-950">
                        {batchResult.assessments.map((item, idx) => (
                          <div key={idx} className="px-2.5 py-1.5 flex justify-between text-xs font-mono">
                            <span className="text-slate-400">#{idx + 1}</span>
                            <span>Score: {item.risk_score !== null ? item.risk_score : "null"}</span>
                            <span className={item.label === "suspicious" ? "text-rose-400" : item.label === "normal" ? "text-emerald-400" : "text-slate-500"}>
                              {item.label.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
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
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Gateway Protection (Simulated Pre-AI Admission Control)
                  </h3>
                  <p className="text-xs text-slate-400">
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
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition disabled:opacity-50"
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
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-cyan-800/50 transition disabled:opacity-50"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Custom Bulk Simulation Controls */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider">Custom Bulk Simulation:</span>
                  <select
                    value={bulkProfile}
                    onChange={(e) => setBulkProfile(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
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
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
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
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs transition disabled:opacity-50"
                  >
                    Run Custom Bulk
                  </button>
                </div>
                {gateway?.bulk_processing_duration_ms !== undefined && (
                  <span className="text-[11px] font-mono text-cyan-300">
                    Last Bulk: {gateway.bulk_requested_count} reqs in {gateway.bulk_processing_duration_ms} ms
                  </span>
                )}
              </div>

              {gateway ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Total Requests</span>
                      <span className="text-xl font-bold font-mono text-slate-100">{gateway.total_requests}</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Accepted</span>
                      <span className="text-xl font-bold font-mono text-emerald-400">{gateway.accepted_requests}</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Restricted (Throttled/Rejected)</span>
                      <span className="text-xl font-bold font-mono text-rose-400">
                        {gateway.throttled_requests + gateway.rejected_requests}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">AI Assessments Avoided</span>
                      <span className="text-xl font-bold font-mono text-cyan-300">{gateway.avoided_assessments}</span>
                    </div>
                    <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <span className="text-[11px] text-slate-400 block">Est. CPU Saved (Local RF)</span>
                      <span className="text-xl font-bold font-mono text-cyan-300">{gateway.estimated_cpu_saved_ms} ms</span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        GW: {gateway.measured_avg_gateway_latency_ms} ms/req
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-200 uppercase tracking-wider">
                        Bounded Processing Queue Utilization
                      </span>
                      <span className="font-mono text-cyan-300">
                        {gateway.queue_depth} / {gateway.queue_capacity} ({gateway.queue_utilization_pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-cyan-500 transition-all"
                        style={{ width: `${gateway.queue_utilization_pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">{gateway.estimation_note}</p>
                  </div>

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
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }} />
                            <Bar dataKey="count" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                        Simulated Uploader Activity
                      </h3>
                      {gateway.uploaders.length === 0 ? (
                        <div className="h-44 flex items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded">
                          No simulated uploaders yet. Trigger a gateway scenario above.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-44 overflow-y-auto">
                          {gateway.uploaders.map((u) => (
                            <div key={u.uploader_id} className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="text-cyan-300 font-semibold">{u.uploader_id}</span>
                                <span className="text-slate-500 ml-2">({u.fictional_ip})</span>
                              </div>
                              <span className="text-slate-300">
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

                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                      Recent Gateway Decision Explanations
                    </h3>
                    {gateway.recent_decisions.length === 0 ? (
                      <p className="text-xs text-slate-500">No gateway decisions recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {gateway.recent_decisions.slice(0, 8).map((d, idx) => (
                          <div key={idx} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs">
                            <span className="font-mono text-cyan-400">{d.uploader_id}</span>
                            <span className="text-slate-300 truncate max-w-lg">{d.reason}</span>
                            <span
                              className={`font-mono uppercase text-[10px] px-2 py-0.5 rounded ${
                                d.decision === "accepted"
                                  ? "bg-emerald-950/50 text-emerald-300"
                                  : "bg-rose-950/50 text-rose-300"
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
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Gateway status unavailable. Ensure backend is running.
                </div>
              )}
            </div>
          )}

          {/* ENDPOINTS (PHASE 9 MULTI-ENDPOINT VIRTUAL ORGANIZATION) */}
          {activeTab === "endpoints" && (
            <div className="space-y-5">
              {/* Organization Summary & Filters */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Virtual Organization Endpoints (Simulated)</h3>
                  <p className="text-xs text-slate-400">
                    {endpoints.filter((e) => e.status === "monitoring").length} monitoring |{" "}
                    {endpoints.filter((e) => e.status === "simulated_isolated").length} simulated_isolated |{" "}
                    Target for scenarios: <strong className="font-mono text-cyan-300">{selectedEndpointId}</strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="text"
                    value={epSearch}
                    onChange={(e) => setEpSearch(e.target.value)}
                    placeholder="Search ID or device..."
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  />
                  <select
                    value={epDeptFilter}
                    onChange={(e) => setEpDeptFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
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
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                  >
                    <option value="all">All Statuses</option>
                    <option value="monitoring">monitoring</option>
                    <option value="paused">paused</option>
                    <option value="simulated_isolated">simulated_isolated</option>
                  </select>
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="pb-2">Endpoint ID</th>
                      <th className="pb-2">Device</th>
                      <th className="pb-2">Department</th>
                      <th className="pb-2">Virtual OS</th>
                      <th className="pb-2">Risk Score</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
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
                          className={`cursor-pointer hover:bg-slate-800/40 ${
                            selectedEndpointId === ep.endpoint_id ? "bg-cyan-950/20" : ""
                          }`}
                        >
                          <td className="py-2.5 font-mono text-cyan-300 font-semibold">{ep.endpoint_id}</td>
                          <td className="py-2.5 font-mono text-slate-300">{ep.device_name}</td>
                          <td className="py-2.5 text-slate-300">{ep.department}</td>
                          <td className="py-2.5 text-slate-400">{ep.virtual_os}</td>
                          <td className="py-2.5 font-mono font-bold">
                            <span className={(ep.current_risk_score || 0) >= 50 ? "text-rose-400" : "text-emerald-400"}>
                              {ep.current_risk_score ?? 0}/100
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                                ep.status === "simulated_isolated"
                                  ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                                  : ep.status === "paused"
                                  ? "bg-amber-950/50 text-amber-300 border border-amber-800/50"
                                  : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                              }`}
                            >
                              {ep.status}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await toggleEndpointMonitoring(ep.endpoint_id);
                                await loadAllData();
                              }}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
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
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                        Virtual Workstation File Explorer — {activeEndpoint.endpoint_id} ({activeEndpoint.department})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Harmless metadata records only. Last activity: {activeEndpoint.last_activity || "Baseline"}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-cyan-300">
                      {(activeEndpoint.virtual_files || []).length} virtual files
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-slate-800 rounded bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-950">
                        <tr>
                          <th className="p-2">Filename</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Size</th>
                          <th className="p-2">Last Simulated Activity</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono text-[11px]">
                        {(activeEndpoint.virtual_files || []).map((vf) => (
                          <tr key={vf.file_id}>
                            <td className="p-2 text-slate-200">{vf.filename}</td>
                            <td className="p-2 text-slate-400 font-sans">{vf.file_type}</td>
                            <td className="p-2 text-slate-400">{vf.size}</td>
                            <td className="p-2 text-slate-400 font-sans">{vf.last_activity}</td>
                            <td className="p-2">
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
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Incident Investigation Center (Simulated)</h3>
                  <p className="text-xs text-slate-400">
                    Select an incident to inspect AI attributions, replay stored timeline, or resolve simulated containment.
                  </p>
                </div>
                <input
                  type="text"
                  value={incSearch}
                  onChange={(e) => setIncSearch(e.target.value)}
                  placeholder="Search incident or endpoint..."
                  className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 text-xs"
                />
              </div>

              {incidents.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/60 border border-dashed border-slate-800 rounded-lg space-y-2">
                  <p className="text-xs text-slate-400">No simulated incidents recorded. All 5 virtual endpoints are monitoring.</p>
                  <button
                    onClick={() => handleScenarioTrigger("suspicious")}
                    className="text-xs text-rose-300 hover:text-rose-200 underline"
                  >
                    Trigger Suspicious Scenario on {selectedEndpointId}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Incident List */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-2 max-h-[600px] overflow-y-auto">
                    <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider block mb-2">
                      Recorded Incidents ({incidents.length})
                    </span>
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
                        <button
                          key={inc.incident_id}
                          onClick={() => {
                            setSelectedIncidentId(inc.incident_id);
                            setAdminNotes(inc.admin_notes || "");
                            setReplayPlaying(false);
                            setReplayStep(0);
                          }}
                          className={`w-full text-left p-3 rounded border transition ${
                            activeIncident?.incident_id === inc.incident_id
                              ? "bg-rose-950/30 border-rose-700"
                              : "bg-slate-950 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-rose-300 font-bold">{inc.incident_id}</span>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {inc.investigation_status || "open"}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                            <span>{inc.endpoint_id}</span>
                            <span>Score: {inc.risk_score ?? "--"}/100</span>
                          </div>
                        </button>
                      ))}
                  </div>

                  {/* Dedicated Investigation Workspace */}
                  {activeIncident && (
                    <div className="lg:col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
                      {/* A. Incident Overview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-sm font-bold font-mono text-rose-300">
                            {activeIncident.incident_id} — {activeIncident.endpoint_id}
                          </h4>
                          <p className="text-xs text-slate-400">
                            Severity: <strong className="uppercase text-rose-300">{activeIncident.severity}</strong> | Model:{" "}
                            <span className="font-mono">{activeIncident.model_version || "rf-phase2-v1"}</span> | Latency:{" "}
                            <span className="font-mono">{activeIncident.processing_time_ms ?? "--"} ms</span>
                          </p>
                        </div>
                        <a
                          href={getIncidentReportUrl(activeIncident.incident_id)}
                          download={`${activeIncident.incident_id}_report.md`}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-cyan-800/50 flex items-center space-x-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report</span>
                        </a>
                      </div>

                      {/* B. Behaviour Timeline & Incident Replay */}
                      {activeIncident.timeline && activeIncident.timeline.length > 0 && (
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-200 uppercase">
                              Stored Incident Replay ({replayStep + 1}/{activeIncident.timeline.length})
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => setReplayPlaying((p) => !p)}
                                className="px-2 py-1 bg-cyan-600 text-slate-950 font-semibold text-[11px] rounded"
                              >
                                {replayPlaying ? "Pause" : "Play"}
                              </button>
                              <button
                                onClick={() => {
                                  setReplayPlaying(false);
                                  setReplayStep(0);
                                }}
                                className="px-2 py-1 bg-slate-800 text-slate-200 text-[11px] rounded border border-slate-700"
                              >
                                Restart
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1 border-l-2 border-rose-800 pl-3 text-xs">
                            {activeIncident.timeline.slice(0, replayStep + 1).map((ev, i) => (
                              <div key={i}>
                                <span className="text-slate-200">{ev.event}</span>
                                <span className="text-[11px] font-mono text-slate-500 ml-2">(+{ev.elapsed_ms} ms)</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* C. AI Intelligence */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                          <span className="text-[11px] font-semibold text-cyan-300 uppercase block">Model-Derived Explanations</span>
                          {(activeIncident.explanations?.model_derived || []).map((m, i) => (
                            <div key={i} className="font-mono text-[11px] text-slate-300">{m}</div>
                          ))}
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                          <span className="text-[11px] font-semibold text-amber-300 uppercase block">Heuristic Explanations</span>
                          {(activeIncident.explanations?.heuristic || []).map((h, i) => (
                            <div key={i} className="font-mono text-[11px] text-slate-300">{h}</div>
                          ))}
                        </div>
                      </div>

                      {/* E. Response & Recovery */}
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-3">
                        <span className="text-xs font-semibold text-slate-200 uppercase block">
                          Simulated Response & Recovery
                        </span>
                        <textarea
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add administrator investigation notes..."
                          className="w-full h-16 p-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              await reviewIncident(activeIncident.incident_id, adminNotes);
                              await loadAllData();
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-cyan-800/50"
                          >
                            Mark as Reviewed
                          </button>
                          <button
                            onClick={async () => {
                              await resolveIncident(activeIncident.incident_id, adminNotes);
                              await loadAllData();
                            }}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-slate-950 font-semibold text-xs rounded"
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
            <div className="space-y-5">
              {p2 ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    {[
                      { label: "Accuracy", val: `${p2Accuracy.toFixed(2)}%` },
                      { label: "Precision", val: `${(p2.precision * 100).toFixed(2)}%` },
                      { label: "Recall", val: `${(p2.recall * 100).toFixed(2)}%` },
                      { label: "F1 Score", val: `${(p2.f1_score * 100).toFixed(2)}%` },
                      { label: "FPR", val: `${(p2.false_positive_rate * 100).toFixed(2)}%` },
                      { label: "Inference Latency", val: `${metrics.single_call_latency_ms} ms` }
                    ].map((m) => (
                      <div key={m.label} className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg">
                        <span className="text-[11px] text-slate-400 block">{m.label}</span>
                        <span className="text-lg font-bold font-mono text-cyan-300">{m.val}</span>
                      </div>
                    ))}
                  </div>

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
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                        Confusion Matrix (val_phase2.csv, n=600)
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-center font-mono text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-slate-400">True Negatives (TN)</span>
                          <div className="text-xl font-bold text-emerald-400 mt-1">{p2.confusion_matrix.tn}</div>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-slate-400">False Positives (FP)</span>
                          <div className="text-xl font-bold text-rose-400 mt-1">{p2.confusion_matrix.fp}</div>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-slate-400">False Negatives (FN)</span>
                          <div className="text-xl font-bold text-rose-400 mt-1">{p2.confusion_matrix.fn}</div>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-slate-400">True Positives (TP)</span>
                          <div className="text-xl font-bold text-emerald-400 mt-1">{p2.confusion_matrix.tp}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                      <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                        False-Positive Reduction: Phase 1 (89) vs Phase 2 (4)
                      </h3>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fpComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                            <YAxis stroke="#64748b" fontSize={11} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            <Bar dataKey="Phase 1 Baseline" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Phase 2 Model" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {earlyWarning && (
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                          Early-Warning Simulation Evaluation ({earlyWarning.total_sequences} Independent Sequences)
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          Seed: {earlyWarning.evaluation_seed} | Overlap: {earlyWarning.train_val_exact_overlap}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[11px] text-slate-400 block font-sans">Attack Outcomes (n={earlyWarning.attack_sequences})</span>
                          <span className="text-base font-bold text-emerald-400">
                            Early {earlyWarning.early_detections}/{earlyWarning.attack_sequences}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Late: {earlyWarning.late_detections} | Missed: {earlyWarning.missed_detections} | Premature: {earlyWarning.premature_alerts}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[11px] text-slate-400 block font-sans">Benign Control FA (n={earlyWarning.benign_control_sequences})</span>
                          <span className="text-base font-bold text-cyan-300">
                            {earlyWarning.benign_control_false_alarms}/{earlyWarning.benign_control_sequences}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Rate: {(earlyWarning.benign_control_false_alarm_rate * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[11px] text-slate-400 block font-sans">Time to First Alert (Sim)</span>
                          <span className="text-base font-bold text-slate-200">
                            Med {earlyWarning.median_time_to_first_alert_sim_s}s
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            p95: {earlyWarning.p95_time_to_first_alert_sim_s}s
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[11px] text-slate-400 block font-sans">Warm Latency (100 calls)</span>
                          <span className="text-base font-bold text-slate-200">{earlyWarning.latency_mean_ms} ms</span>
                          <span className="text-[10px] text-slate-500 block">
                            Med {earlyWarning.latency_median_ms} | p95 {earlyWarning.latency_p95_ms}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[11px] text-slate-400 block font-sans">Peak Traced Memory</span>
                          <span className="text-base font-bold text-slate-200">{earlyWarning.peak_traced_memory_mb} MB</span>
                          <span className="text-[10px] text-slate-500 block">tracemalloc (separate)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  Evaluation metrics unavailable. Ensure backend is running at http://localhost:8000.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
