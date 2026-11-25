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
  resetDemo
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

  const loadAllData = async () => {
    try {
      setError(null);
      const [hRes, epRes, asRes, incRes, metRes] = await Promise.all([
        fetchHealth().catch(() => ({ status: "offline" })),
        fetchEndpoints().catch(() => ({ items: [] })),
        fetchAssessments().catch(() => ({ items: [] })),
        fetchIncidents().catch(() => ({ items: [] })),
        fetchMetrics().catch(() => null),
      ]);
      setHealth(hRes);
      setEndpoints(epRes.items || []);
      setAssessments(asRes.items || []);
      setIncidents(incRes.items || []);
      setMetrics(metRes);
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
      await triggerDemoScenario(scenario);
      await loadAllData();
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
      await loadAllData();
    } catch (err) {
      alert(`Error resetting demo: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Prepare chart data from assessments
  const chartData = [...assessments].reverse().map((a, idx) => ({
    name: `#${idx + 1}`,
    time: a.timestamp.substring(11, 19),
    risk_score: a.risk_score !== null ? a.risk_score : 0,
    label: a.label
  }));

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
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
              onClick={() => setActiveTab("endpoints")}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === "endpoints"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Server className="w-4 h-4" />
              <span>Monitored Endpoints</span>
              <span className="ml-auto text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
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
                <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
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

        {/* System Simulation Warning Banner */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2 text-[11px] text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-mono uppercase font-semibold">Simulation Mode</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Synthetic observations only. Containment and isolation statuses are strictly simulated.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header Bar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/40 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-semibold tracking-wide text-slate-200 capitalize">
              {activeTab.replace("-", " ")}
            </h2>
            <span className="text-xs text-slate-500">|</span>
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  health.status === "ok" ? "bg-emerald-400" : "bg-rose-500"
                }`}
              ></span>
              <span className="text-[11px] font-mono text-slate-400">
                Backend: {health.status === "ok" ? "ONLINE (8000)" : "OFFLINE"}
              </span>
            </div>
          </div>

          {/* Quick Demo Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono mr-1">Inject Scenario:</span>
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
              className="text-xs bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 px-2.5 py-1.5 rounded border border-rose-800/50 transition font-medium"
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

        {/* View Routing */}
        <div className="p-6 space-y-6">
          {health.status !== "ok" && (
            <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-lg flex items-center space-x-3 text-rose-300 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Backend Unreachable</p>
                <p className="text-slate-400">
                  Ensure the FastAPI backend is running at http://localhost:8000. Start it with:
                  <code className="ml-1 text-cyan-400 font-mono">
                    python -m uvicorn backend.main:app --port 8000
                  </code>
                </p>
              </div>
            </div>
          )}

          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                    Total Assessments
                  </span>
                  <div className="text-2xl font-bold text-slate-100 mt-1">{assessments.length}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Observed evaluation windows</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                    Active Incidents
                  </span>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{incidents.length}</div>
                  <span className="text-[10px] text-slate-500 font-mono">Simulated isolated endpoints</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                    Model F1 Score
                  </span>
                  <div className="text-2xl font-bold text-cyan-400 mt-1">
                    {metrics?.phase2_model ? `${(metrics.phase2_model.f1_score * 100).toFixed(1)}%` : "--"}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Phase 2 validation score</span>
                </div>
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg">
                  <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                    False Positive Rate
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">
                    {metrics?.phase2_model ? `${(metrics.phase2_model.false_positive_rate * 100).toFixed(1)}%` : "--"}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Benchmark: 89 down to 4</span>
                </div>
              </div>

              {/* Real-time Risk Score Trajectory Chart */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                      Assessment Risk Score History
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Sequential risk score evaluation (0-100 scale; threshold = 50)
                    </p>
                  </div>
                </div>

                {chartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded">
                    No assessments recorded yet. Use the demo injection buttons above.
                  </div>
                ) : (
                  <div className="h-56">
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

              {/* Recent Assessments Table */}
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
                  Recent Assessments Table
                </h3>
                {assessments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500 font-mono">
                    Empty observation feed.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[11px] text-slate-400 border-b border-slate-800 font-mono uppercase">
                        <tr>
                          <th className="pb-2">ID</th>
                          <th className="pb-2">Endpoint</th>
                          <th className="pb-2">Timestamp</th>
                          <th className="pb-2">Risk Score</th>
                          <th className="pb-2">Label</th>
                          <th className="pb-2">Primary Explanation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {assessments.slice(0, 5).map((a) => (
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
                            <td className="py-2.5 text-slate-400 truncate max-w-xs font-sans text-[11px]">
                              {a.indicators[0] || "No anomaly detected"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "endpoints" && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
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
                          <span className="text-[11px] text-slate-500 font-mono">Agent v1.0.0 (Tabular)</span>
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

          {activeTab === "incidents" && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
                  Active Simulated Incidents
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Incidents triggered by high-confidence anomalous ransomware activity.
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

                        <div>
                          <span className="text-[11px] font-mono uppercase text-slate-400">Response Checklist:</span>
                          <ul className="mt-1 space-y-1">
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

          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-lg">
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-2">
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
