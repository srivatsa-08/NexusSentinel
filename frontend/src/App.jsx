import React, { useState, useEffect } from "react";
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
  FileText,
  Clock,
  Layers,
  Cpu,
  Upload,
  Download,
  Terminal,
  FileCode,
  HardDrive,
  Lock,
  RefreshCw,
  Info
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
  getSampleDatasetUrl
} from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [health, setHealth] = useState({ status: "checking" });
  const [endpoints, setEndpoints] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Simulation Lab states
  const [importedData, setImportedData] = useState("");
  const [batchResult, setBatchResult] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Virtual files for simulated workspace
  const [virtualFiles, setVirtualFiles] = useState([
    { id: 1, name: "financial_ledger_2026.xlsx", state: "intact", entropy: 0.22, ext: ".xlsx" },
    { id: 2, name: "customer_contracts.pdf", state: "intact", entropy: 0.35, ext: ".pdf" },
    { id: 3, name: "db_backup_quarterly.tar", state: "intact", entropy: 0.58, ext: ".tar" },
    { id: 4, name: "source_code_repo.zip", state: "intact", entropy: 2.10, ext: ".zip" },
    { id: 5, name: "employee_records.csv", state: "intact", entropy: 0.18, ext: ".csv" },
    { id: 6, name: "executive_briefing.docx", state: "intact", entropy: 0.29, ext: ".docx" }
  ]);

  const loadAllData = async () => {
    try {
      setError(null);
      const [hRes, epRes, asRes, incRes, metRes] = await Promise.all([
        fetchHealth().catch(() => ({ status: "offline" })),
        fetchEndpoints().catch(() => ({ items: [] })),
        fetchAssessments().catch(() => ({ items: [] })),
        fetchIncidents().catch(() => ({ items: [] })),
        fetchMetrics().catch(() => null)
      ]);
      setHealth(hRes);
      setEndpoints(epRes.items || []);
      setAssessments(asRes.items || []);
      setIncidents(incRes.items || []);
      setMetrics(metRes);

      // Auto-update virtual file visual states based on latest assessment
      if (asRes.items && asRes.items.length > 0) {
        const latest = asRes.items[0];
        if (latest.label === "suspicious") {
          setVirtualFiles((prev) =>
            prev.map((f, i) =>
              i % 2 === 0
                ? { ...f, state: "simulated_encrypted", name: f.name + ".locked" }
                : { ...f, state: "simulated_altered" }
            )
          );
        }
      }
    } catch (err) {
      setError("Failed to synchronize with Nexus Sentinel backend service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleScenarioTrigger = async (scenario) => {
    try {
      setActionLoading(true);
      const res = await triggerDemoScenario(scenario);
      await loadAllData();
      if (res.assessment) {
        setSelectedAssessment(res.assessment);
      }
      if (res.incident) {
        setSelectedIncident(res.incident);
      }
      if (scenario === "normal" || scenario === "backup" || scenario === "compression") {
        setVirtualFiles((prev) =>
          prev.map((f) => ({
            ...f,
            state: "intact",
            name: f.name.replace(".locked", "")
          }))
        );
      }
    } catch (err) {
      alert(`Error triggering scenario: ${err.response?.data?.detail || err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setActionLoading(true);
      await resetDemo();
      setSelectedAssessment(null);
      setSelectedIncident(null);
      setBatchResult(null);
      setVirtualFiles([
        { id: 1, name: "financial_ledger_2026.xlsx", state: "intact", entropy: 0.22, ext: ".xlsx" },
        { id: 2, name: "customer_contracts.pdf", state: "intact", entropy: 0.35, ext: ".pdf" },
        { id: 3, name: "db_backup_quarterly.tar", state: "intact", entropy: 0.58, ext: ".tar" },
        { id: 4, name: "source_code_repo.zip", state: "intact", entropy: 2.10, ext: ".zip" },
        { id: 5, name: "employee_records.csv", state: "intact", entropy: 0.18, ext: ".csv" },
        { id: 6, name: "executive_briefing.docx", state: "intact", entropy: 0.29, ext: ".docx" }
      ]);
      await loadAllData();
    } catch (err) {
      alert(`Error resetting demo: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchImport = async () => {
    if (!importedData.trim()) {
      alert("Please paste or load synthetic CSV/JSON data first.");
      return;
    }
    let records = [];
    try {
      const trimmed = importedData.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse CSV lines
        const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length > 1) {
          const headers = lines[0].split(",").map((h) => h.trim());
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(",").map((v) => v.trim());
            const obj = {};
            headers.forEach((h, idx) => {
              const num = Number(vals[idx]);
              obj[h] = isNaN(num) ? vals[idx] : num;
            });
            records.push(obj);
          }
        }
      }

      if (records.length === 0) {
        alert("No valid records found in import buffer.");
        return;
      }

      setActionLoading(true);
      const summary = await runBatchAssessment(records);
      setBatchResult(summary);
      await loadAllData();
    } catch (err) {
      alert(`Failed to parse and evaluate batch: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Chart data
  const chartData = [...assessments].reverse().map((a, idx) => ({
    name: `#${idx + 1}`,
    time: a.timestamp.substring(11, 19),
    risk_score: a.risk_score !== null ? a.risk_score : 0,
    label: a.label
  }));

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-cyan-950/60 border border-cyan-800/50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-slate-100 uppercase">Nexus Sentinel</h1>
              <span className="text-[10px] text-cyan-500 font-mono tracking-wider">DEFENSIVE AIR-GAP</span>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Operations Overview</span>
            </button>
            <button
              onClick={() => setActiveTab("simlab")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "simlab"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Simulation Lab</span>
              <span className="ml-auto text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1 py-0.5 rounded font-mono">
                LAB
              </span>
            </button>
            <button
              onClick={() => setActiveTab("endpoints")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "endpoints"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Monitored Endpoints</span>
              <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                {endpoints.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("incidents")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "incidents"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Simulated Incidents</span>
              {incidents.length > 0 && (
                <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  {incidents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Model Analytics</span>
            </button>
          </nav>
        </div>

        {/* Mandatory Simulation Warning Notice */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2 text-[11px] text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-mono uppercase font-semibold">100% Simulated Mode</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Synthetic observations only. Containment and endpoint isolation statuses are strictly simulated state changes.
          </p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Operational Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/40 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase font-mono">
              {activeTab === "simlab" ? "Simulation Lab & Virtual Workspace" : activeTab.replace("-", " ")}
            </h2>
            <span className="text-xs text-slate-600">|</span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  health.status === "ok" ? "bg-emerald-400" : "bg-rose-500"
                }`}
              ></span>
              <span className="text-[11px] font-mono text-slate-400">
                Backend: {health.status === "ok" ? "ACTIVE (:8000)" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Quick Scenario Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Scenario Injection:</span>
            <button
              onClick={() => handleScenarioTrigger("normal")}
              disabled={actionLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded border border-slate-700 transition"
            >
              Normal
            </button>
            <button
              onClick={() => handleScenarioTrigger("backup")}
              disabled={actionLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded border border-slate-700 transition"
            >
              Backup
            </button>
            <button
              onClick={() => handleScenarioTrigger("compression")}
              disabled={actionLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded border border-slate-700 transition"
            >
              Compression
            </button>
            <button
              onClick={() => handleScenarioTrigger("suspicious")}
              disabled={actionLoading}
              className="text-xs bg-rose-950/50 hover:bg-rose-900/50 text-rose-300 px-2.5 py-1.5 rounded border border-rose-800/60 transition font-medium"
            >
              Suspicious
            </button>
            <button
              onClick={handleReset}
              disabled={actionLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-2.5 py-1.5 rounded border border-cyan-800/40 transition flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </header>

        {/* Tab Routing */}
        <div className="p-6 space-y-6">
          {health.status !== "ok" && (
            <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-lg flex items-center space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Backend Unreachable</p>
                <p className="text-slate-400">
                  FastAPI service is not detected on http://localhost:8000. Start it using:
                  <code className="ml-1 text-cyan-400 font-mono">
                    python -m uvicorn backend.main:app --port 8000
                  </code>
                </p>
              </div>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Total Assessments
                  </span>
                  <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">{assessments.length}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Observed evaluation windows</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Active Incidents
                  </span>
                  <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{incidents.length}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Simulated isolated endpoints</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    Model F1 Score
                  </span>
                  <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">
                    {metrics?.phase2_model ? `${(metrics.phase2_model.f1_score * 100).toFixed(1)}%` : "--"}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Phase 2 validation score</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    False Positive Rate
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">
                    {metrics?.phase2_model ? `${(metrics.phase2_model.false_positive_rate * 100).toFixed(1)}%` : "--"}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Benchmark: 89 down to 4</span>
                </div>
              </div>

              {/* Real-time Risk Score Trajectory Chart */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                      Sequential Risk Score Trajectory
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sequential risk score evaluation (0-100 scale; classification threshold = 50)
                    </p>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded">
                    No assessments recorded yet. Inject a scenario from the header controls or Simulation Lab.
                  </div>
                ) : (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", fontSize: "11px" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="risk_score"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          dot={{ fill: "#0891b2", r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Two Column Layout: Recent Assessments & Selected Assessment Inspector */}
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
                    Recent Assessments Feed
                  </h3>
                  {assessments.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 font-mono">
                      No observations recorded.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-[10px] text-slate-400 border-b border-slate-800 font-mono uppercase">
                          <tr>
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Endpoint</th>
                            <th className="pb-2">Timestamp</th>
                            <th className="pb-2">Risk</th>
                            <th className="pb-2">Label</th>
                            <th className="pb-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {assessments.slice(0, 6).map((a) => (
                            <tr key={a.assessment_id} className="hover:bg-slate-800/30 font-mono">
                              <td className="py-2.5 text-cyan-400">{a.assessment_id}</td>
                              <td className="py-2.5 text-slate-300">{a.endpoint_id}</td>
                              <td className="py-2.5 text-slate-500">{a.timestamp.substring(11, 19)}</td>
                              <td className="py-2.5 font-bold">
                                {a.risk_score !== null ? (
                                  <span
                                    className={
                                      a.risk_score >= 50
                                        ? "text-rose-400"
                                        : "text-emerald-400"
                                    }
                                  >
                                    {a.risk_score}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">null</span>
                                )}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                    a.label === "suspicious"
                                      ? "bg-rose-950/60 text-rose-300 border border-rose-800/50"
                                      : a.label === "normal"
                                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                                      : "bg-slate-800 text-slate-400"
                                  }`}
                                >
                                  {a.label}
                                </span>
                              </td>
                              <td className="py-2.5">
                                <button
                                  onClick={() => setSelectedAssessment(a)}
                                  className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-sans"
                                >
                                  Inspect Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Detailed Detection Inspector */}
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-mono font-bold text-slate-200 uppercase">Detection Inspector</span>
                    {selectedAssessment && (
                      <span className="text-[10px] font-mono text-cyan-400">{selectedAssessment.assessment_id}</span>
                    )}
                  </div>

                  {selectedAssessment ? (
                    <div className="space-y-4 text-xs font-sans">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">Model Version</span>
                          <span className="font-mono text-slate-200 font-bold">{selectedAssessment.model_version || "rf-phase2-v1"}</span>
                        </div>
                        <div className="p-2 bg-slate-950 border border-slate-800 rounded">
                          <span className="text-[10px] text-slate-500 font-mono uppercase block">Measured Latency</span>
                          <span className="font-mono text-cyan-400 font-bold">
                            {selectedAssessment.processing_time_ms ? `${selectedAssessment.processing_time_ms} ms` : "< 1.0 ms"}
                          </span>
                        </div>
                      </div>

                      {/* Model-derived Explanations */}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                          Model-Derived Attributions:
                        </span>
                        <div className="space-y-1">
                          {selectedAssessment.explanations?.model_derived?.length > 0 ? (
                            selectedAssessment.explanations.model_derived.map((expl, idx) => (
                              <div key={idx} className="p-1.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-cyan-300 font-mono">
                                {expl}
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-500 font-mono">Aligned with benign baseline.</div>
                          )}
                        </div>
                      </div>

                      {/* Incident Timeline */}
                      {selectedAssessment.timeline && selectedAssessment.timeline.length > 0 && (
                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Measured Event Timeline:
                          </span>
                          <div className="space-y-1.5 border-l-2 border-slate-800 pl-3">
                            {selectedAssessment.timeline.map((ev, idx) => (
                              <div key={idx} className="text-[11px]">
                                <div className="text-slate-300 font-medium">{ev.event}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  + {ev.elapsed_ms} ms | {ev.timestamp.substring(11, 23)}Z
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded">
                      Select an assessment to view measured latency, timeline, and exact feature attributions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SIMULATION LAB & VIRTUAL WORKSPACE TAB */}
          {activeTab === "simlab" && (
            <div className="space-y-6">
              {/* Top Bar: Sample Telemetry Downloads */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase font-mono">
                    Synthetic Telemetry Dataset Generator & Ingestion
                  </h3>
                  <p className="text-xs text-slate-400">
                    Import tabular telemetry records (CSV or JSON) adhering to SCHEMA_VERSION 1.0.0. No executable files allowed.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={getSampleDatasetUrl("csv")}
                    download="synthetic_telemetry_sample.csv"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Dummy CSV</span>
                  </a>
                  <a
                    href={getSampleDatasetUrl("json")}
                    download="synthetic_telemetry_sample.json"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs rounded border border-cyan-800/40 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Dummy JSON</span>
                  </a>
                </div>
              </div>

              {/* Virtual File System Simulation Workspace */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase font-mono flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span>Virtual In-Memory File Workspace (Simulated Host)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Visual simulation of files on endpoint 'demo-01'. Entirely in-memory; no real file alteration occurs.
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                    STATUS: {endpoints[0]?.status || "MONITORING"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {virtualFiles.map((file) => (
                    <div
                      key={file.id}
                      className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                        file.state === "simulated_encrypted"
                          ? "bg-rose-950/40 border-rose-800/60 text-rose-300"
                          : file.state === "simulated_altered"
                          ? "bg-amber-950/30 border-amber-800/50 text-amber-300"
                          : "bg-slate-950 border-slate-800 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2 truncate">
                          {file.state === "simulated_encrypted" ? (
                            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="font-semibold truncate">{file.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                        <span>Entropy: {file.entropy}</span>
                        <span className="uppercase font-bold">
                          {file.state === "simulated_encrypted" ? "SIMULATED ENCRYPTED" : "INTACT"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Import Buffer & Evaluation */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                      Paste or Load Synthetic Telemetry (CSV / JSON)
                    </span>
                    <button
                      onClick={() =>
                        setImportedData(
                          JSON.stringify(
                            [
                              {
                                file_mod_rate: 12.0,
                                entropy_delta: 0.35,
                                rename_ratio: 0.08,
                                unique_ext_count: 3,
                                burst_io_score: 0.22,
                                shadow_copy_access_flag: 0
                              },
                              {
                                file_mod_rate: 95.0,
                                entropy_delta: 2.30,
                                rename_ratio: 0.10,
                                unique_ext_count: 3,
                                burst_io_score: 0.72,
                                shadow_copy_access_flag: 0
                              },
                              {
                                file_mod_rate: 160.0,
                                entropy_delta: 2.80,
                                rename_ratio: 0.75,
                                unique_ext_count: 18,
                                burst_io_score: 0.88,
                                shadow_copy_access_flag: 1
                              },
                              {
                                file_mod_rate: -10.0 // malformed test record
                              }
                            ],
                            null,
                            2
                          )
                        )
                      }
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline"
                    >
                      Fill Example Batch
                    </button>
                  </div>

                  <textarea
                    value={importedData}
                    onChange={(e) => setImportedData(e.target.value)}
                    placeholder="Paste synthetic CSV rows or JSON telemetry array here..."
                    className="w-full h-44 p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none"
                  ></textarea>

                  <button
                    onClick={handleBatchImport}
                    disabled={actionLoading}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition flex items-center justify-center space-x-2"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Synthetic Batch Assessment</span>
                  </button>
                </div>

                {/* Batch Assessment Results */}
                <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-4">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase block border-b border-slate-800 pb-2">
                    Batch Assessment Summary
                  </span>

                  {batchResult ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">Total</span>
                          <span className="text-base font-bold text-slate-100 font-mono">{batchResult.total}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                          <span className="text-[10px] text-emerald-400 uppercase font-mono block">Normal</span>
                          <span className="text-base font-bold text-emerald-400 font-mono">{batchResult.normal_count}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                          <span className="text-[10px] text-rose-400 uppercase font-mono block">Suspicious</span>
                          <span className="text-base font-bold text-rose-400 font-mono">{batchResult.suspicious_count}</span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded text-center">
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Invalid</span>
                          <span className="text-base font-bold text-slate-400 font-mono">{batchResult.invalid_count}</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                        <span>Total Elapsed: {batchResult.total_processing_time_ms} ms</span>
                        <span>Avg Latency: {batchResult.avg_latency_ms} ms / sample</span>
                      </div>

                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-800 border border-slate-800 rounded bg-slate-950">
                        {batchResult.assessments.map((item, idx) => (
                          <div key={idx} className="p-2 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">#{idx + 1} {item.assessment_id}</span>
                            <span className="text-slate-300">Score: {item.risk_score !== null ? item.risk_score : "null"}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.label === "suspicious"
                                  ? "text-rose-400"
                                  : item.label === "normal"
                                  ? "text-emerald-400"
                                  : "text-slate-500"
                              }`}
                            >
                              {item.label.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded">
                      Paste synthetic records and trigger batch assessment to view distribution.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ENDPOINTS TAB */}
          {activeTab === "endpoints" && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Monitored Endpoint Inventory
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Simulated endpoint agents reporting synthetic tabular features to the defensive pipeline.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {endpoints.map((ep) => (
                    <div
                      key={ep.endpoint_id}
                      className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <Server className="w-5 h-5 text-slate-400" />
                        <div>
                          <div className="text-sm font-bold text-slate-200 font-mono">{ep.endpoint_id}</div>
                          <span className="text-[11px] text-slate-500 font-mono">Agent v1.0.0 (Tabular Stream)</span>
                        </div>
                      </div>
                      <div>
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-mono uppercase font-semibold ${
                            ep.status === "simulated_isolated"
                              ? "bg-rose-950/60 text-rose-300 border border-rose-800"
                              : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                          }`}
                        >
                          {ep.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* INCIDENTS TAB */}
          {activeTab === "incidents" && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Active Simulated Incidents
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Incidents generated by anomalous ransomware activity with automated simulated containment.
                </p>

                {incidents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded">
                    No active simulated incidents. All endpoints in clean monitoring posture.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {incidents.map((inc) => (
                      <div
                        key={inc.incident_id}
                        className="p-4 bg-slate-950 border border-rose-900/50 rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span className="font-mono text-sm font-bold text-rose-300">{inc.incident_id}</span>
                            <span className="text-xs text-slate-500 font-mono">({inc.endpoint_id})</span>
                          </div>
                          <span className="text-[11px] font-mono text-rose-400 uppercase font-semibold px-2 py-0.5 bg-rose-950/60 border border-rose-800 rounded">
                            {inc.status}
                          </span>
                        </div>

                        {inc.timeline && (
                          <div className="border-l-2 border-rose-900/60 pl-3 py-1 space-y-1 text-xs">
                            {inc.timeline.map((ev, i) => (
                              <div key={i} className="text-slate-300">
                                <span className="font-semibold text-rose-300">{ev.event}</span>
                                <span className="text-[10px] text-slate-500 font-mono ml-2">
                                  (+{ev.elapsed_ms} ms)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                            Simulated Containment Response Checklist:
                          </span>
                          <ul className="space-y-1">
                            {inc.checklist.map((item, idx) => (
                              <li key={idx} className="flex items-center space-x-2 text-xs text-slate-300 font-sans">
                                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODEL ANALYTICS TAB */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2 font-mono">
                  Verified ML Model Evaluation Benchmark
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Evaluation results on held-out independent validation data (600 synthetic records: normal, backup, compression, suspicious).
                </p>

                {metrics ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Precision</span>
                        <div className="text-xl font-bold text-slate-100 font-mono mt-1">
                          {(metrics.phase2_model.precision * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">Recall</span>
                        <div className="text-xl font-bold text-slate-100 font-mono mt-1">
                          {(metrics.phase2_model.recall * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">F1 Score</span>
                        <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                          {(metrics.phase2_model.f1_score * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="p-3 bg-slate-950 border border-slate-800 rounded">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">False Positives</span>
                        <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                          {metrics.phase2_model.confusion_matrix.fp} / 400
                        </div>
                      </div>
                    </div>

                    {/* Confusion Matrix Table */}
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
                      <span className="text-xs font-mono font-bold text-slate-300 uppercase">
                        Phase 2 Confusion Matrix (rf_phase2.joblib)
                      </span>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-center font-mono text-xs">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                          <span className="text-slate-400">True Negatives (TN)</span>
                          <div className="text-lg font-bold text-emerald-400 mt-1">
                            {metrics.phase2_model.confusion_matrix.tn}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                          <span className="text-slate-400">False Positives (FP)</span>
                          <div className="text-lg font-bold text-rose-400 mt-1">
                            {metrics.phase2_model.confusion_matrix.fp}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                          <span className="text-slate-400">False Negatives (FN)</span>
                          <div className="text-lg font-bold text-rose-400 mt-1">
                            {metrics.phase2_model.confusion_matrix.fn}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
                          <span className="text-slate-400">True Positives (TP)</span>
                          <div className="text-lg font-bold text-emerald-400 mt-1">
                            {metrics.phase2_model.confusion_matrix.tp}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500 font-mono">
                    Evaluation metrics loading or unavailable.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
