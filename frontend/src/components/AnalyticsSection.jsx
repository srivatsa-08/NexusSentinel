import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Activity,
  Clock,
  Cpu,
  FileEdit,
  FilePlus2,
  FileWarning,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import InteractiveCard from "./InteractiveCard";

function RadialGauge({ valuePct, color = "#E8BB65", size = 62, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(valuePct) || 0));
  const offset = circ - (clamped / 100) * circ;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(216, 180, 254, 0.14)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
}

export default function AnalyticsSection({
  p2,
  p1,
  p2Accuracy,
  metrics,
  earlyWarning,
  fpComparisonData,
  workspaceStatus,
}) {
  const [selectedMetric, setSelectedMetric] = useState(null);

  if (!p2) {
    return (
      <div className="ns-card p-8 text-center text-xs text-[#AD98C5] border-dashed">
        Evaluation metrics unavailable. Ensure backend is running at http://localhost:8000.
      </div>
    );
  }

  const radialMetrics = [
    {
      id: "acc",
      label: "Accuracy",
      pct: p2Accuracy,
      val: `${p2Accuracy.toFixed(2)}%`,
      color: "#E8BB65",
      desc: "Overall share of synthetic validation samples (n=600) classified correctly.",
    },
    {
      id: "prec",
      label: "Precision",
      pct: p2.precision * 100,
      val: `${(p2.precision * 100).toFixed(2)}%`,
      color: "#FFE3A5",
      desc: "Share of predicted suspicious events that were true synthetic attacks.",
    },
    {
      id: "rec",
      label: "Recall",
      pct: p2.recall * 100,
      val: `${(p2.recall * 100).toFixed(2)}%`,
      color: "#A855F7",
      desc: "Share of actual synthetic attacks successfully detected by the model.",
    },
    {
      id: "f1",
      label: "F1 Score",
      pct: p2.f1_score * 100,
      val: `${(p2.f1_score * 100).toFixed(2)}%`,
      color: "#E8BB65",
      desc: "Harmonic mean of Precision and Recall on val_phase2.csv.",
    },
  ];

  const fpReductionPct =
    p1?.confusion_matrix?.fp > 0
      ? (((p1.confusion_matrix.fp - p2.confusion_matrix.fp) / p1.confusion_matrix.fp) * 100).toFixed(1)
      : "0.0";

  const totalSamples = Math.max(
    1,
    p2.confusion_matrix.tn + p2.confusion_matrix.fp + p2.confusion_matrix.fn + p2.confusion_matrix.tp
  );

  const cmCells = [
    {
      key: "tn",
      label: "True Negatives (TN)",
      val: p2.confusion_matrix.tn,
      row: "Actual Normal",
      col: "Pred Normal",
      tone: "purple",
      tip: "Benign backup/compression/normal activity correctly classified as normal.",
    },
    {
      key: "fp",
      label: "False Positives (FP)",
      val: p2.confusion_matrix.fp,
      row: "Actual Normal",
      col: "Pred Suspicious",
      tone: "rose",
      tip: "Benign activity incorrectly flagged as suspicious.",
    },
    {
      key: "fn",
      label: "False Negatives (FN)",
      val: p2.confusion_matrix.fn,
      row: "Actual Suspicious",
      col: "Pred Normal",
      tone: "rose",
      tip: "Suspicious activity missed by the classifier.",
    },
    {
      key: "tp",
      label: "True Positives (TP)",
      val: p2.confusion_matrix.tp,
      row: "Actual Suspicious",
      col: "Pred Suspicious",
      tone: "gold",
      tip: "Ransomware-like activity correctly detected.",
    },
  ];

  return (
    <div className="space-y-5">
      {/* 1. Performance Metrics: 4 Radial Cards + 2 Technical Cards */}
      <div className="interactive-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {radialMetrics.map((m) => (
          <InteractiveCard
            key={m.id}
            noPerspective
            title={m.desc}
            onClick={() => setSelectedMetric(selectedMetric?.id === m.id ? null : m)}
            className="p-3.5 flex items-center justify-between gap-2"
          >
            <div>
              <span className="text-[11px] text-[#AD98C5] block">{m.label}</span>
              <span className="text-lg font-bold font-mono text-[#E8BB65] mt-0.5 block">{m.val}</span>
              <span className="text-[10px] text-[#AD98C5]/80">val_phase2</span>
            </div>
            <RadialGauge valuePct={m.pct} color={m.color} />
          </InteractiveCard>
        ))}

        <InteractiveCard
          noPerspective
          title="Observation-level false-positive rate on synthetic validation."
          className="p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#AD98C5]">False Positive Rate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-bold font-mono text-emerald-400">
            {(p2.false_positive_rate * 100).toFixed(2)}%
          </span>
          <div className="ns-progress-track">
            <div className="ns-progress-fill" style={{ width: `${Math.min(100, p2.false_positive_rate * 100 * 5)}%` }} />
          </div>
        </InteractiveCard>

        <InteractiveCard
          noPerspective
          title="Measured single-call Random Forest inference latency."
          className="p-3.5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#AD98C5]">Inference Latency</span>
            <Clock className="w-3.5 h-3.5 text-[#E8BB65]" />
          </div>
          <span className="text-lg font-bold font-mono text-[#E8BB65]">
            {metrics?.single_call_latency_ms ?? "--"} ms
          </span>
          <span className="text-[10px] text-[#AD98C5]">Local RF single-call</span>
        </InteractiveCard>
      </div>

      {selectedMetric && (
        <div className="ns-card px-4 py-2.5 text-xs flex items-center justify-between border border-[#E8BB65]/40">
          <span>
            <strong className="text-[#E8BB65]">{selectedMetric.label} ({selectedMetric.val}):</strong>{" "}
            <span className="text-[#F3E8FF]">{selectedMetric.desc}</span>
          </span>
          <button
            onClick={() => setSelectedMetric(null)}
            className="text-[11px] text-[#AD98C5] hover:text-white underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. 2x2 Confusion Matrix Heatmap + Horizontal FP Reduction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="ns-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="ns-section-title">2×2 Confusion Matrix Heatmap (n={totalSamples})</h3>
            <span className="text-[10px] text-[#AD98C5]">Synthetic val_phase2.csv</span>
          </div>

          <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center text-[10px] text-[#AD98C5]">
            <div />
            <div className="text-center font-semibold uppercase tracking-wider">Pred Normal</div>
            <div className="text-center font-semibold uppercase tracking-wider">Pred Suspicious</div>

            <div className="font-semibold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180 text-center">
              Actual Normal
            </div>
            {cmCells.slice(0, 2).map((c) => (
              <InteractiveCard
                key={c.key}
                noPerspective
                title={c.tip}
                className={`p-3.5 text-center border ${
                  c.tone === "purple"
                    ? "!bg-[#7C3AED]/20 !border-[#A855F7]/45"
                    : "!bg-rose-950/30 !border-rose-500/35"
                }`}
              >
                <span className="text-[11px] text-[#AD98C5] block">{c.label}</span>
                <div className={`text-2xl font-bold font-mono mt-1 ${c.tone === "purple" ? "text-[#E9D5FF]" : "text-rose-400"}`}>
                  {c.val}
                </div>
                <span className="text-[10px] text-[#AD98C5]">
                  {((c.val / totalSamples) * 100).toFixed(1)}%
                </span>
              </InteractiveCard>
            ))}

            <div className="font-semibold uppercase tracking-wider [writing-mode:vertical-lr] rotate-180 text-center">
              Actual Suspicious
            </div>
            {cmCells.slice(2, 4).map((c) => (
              <InteractiveCard
                key={c.key}
                noPerspective
                title={c.tip}
                className={`p-3.5 text-center border ${
                  c.tone === "gold"
                    ? "!bg-[#B88635]/20 !border-[#E8BB65]/55"
                    : "!bg-rose-950/30 !border-rose-500/35"
                }`}
              >
                <span className="text-[11px] text-[#AD98C5] block">{c.label}</span>
                <div className={`text-2xl font-bold font-mono mt-1 ${c.tone === "gold" ? "text-[#FFE3A5]" : "text-rose-400"}`}>
                  {c.val}
                </div>
                <span className="text-[10px] text-[#AD98C5]">
                  {((c.val / totalSamples) * 100).toFixed(1)}%
                </span>
              </InteractiveCard>
            ))}
          </div>
        </div>

        <InteractiveCard noPerspective className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="ns-section-title">False-Positive Reduction</h3>
              <p className="text-[11px] text-[#AD98C5] mt-0.5">
                Phase 1 Baseline ({p1?.confusion_matrix?.fp ?? 89} FP) vs Phase 2 Model ({p2.confusion_matrix.fp} FP)
              </p>
            </div>
            <span className="ns-badge bg-[#B88635]/20 border border-[#E8BB65]/50 text-[#FFE3A5]">
              -{fpReductionPct}% FP
            </span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fpComparisonData} layout="vertical" margin={{ left: 10, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(216,180,254,0.12)" />
                <XAxis type="number" stroke="#AD98C5" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="#AD98C5" fontSize={11} width={88} />
                <Tooltip contentStyle={{ backgroundColor: "rgba(16,9,28,0.92)", borderColor: "#B88635", fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="Phase 1 Baseline" fill="#7C3AED" activeBar={{ fill: "#A855F7" }} radius={[0, 6, 6, 0]} />
                <Bar dataKey="Phase 2 Model" fill="#E8BB65" activeBar={{ fill: "#FFE3A5" }} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </InteractiveCard>
      </div>

      {/* 3. Early-Warning Evaluation (Radial + Simulated Timing vs Measured Latency/Memory) */}
      {earlyWarning && (
        <div className="ns-card p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="ns-section-title">
              Early-Warning Simulation Evaluation ({earlyWarning.total_sequences} Independent Sequences)
            </h3>
            <span className="text-[11px] font-mono text-[#AD98C5]">
              Seed: {earlyWarning.evaluation_seed} | Train/Val Overlap: {earlyWarning.train_val_exact_overlap}
            </span>
          </div>

          <div className="interactive-group grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <InteractiveCard
              noPerspective
              title="Simulated early detection rate across attack sequences"
              className="p-3.5 flex items-center justify-between gap-2"
            >
              <div>
                <span className="text-[11px] text-[#AD98C5] block">Early Detection</span>
                <span className="text-lg font-bold font-mono text-emerald-400">
                  {(earlyWarning.early_detection_rate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#AD98C5] block">
                  Early {earlyWarning.early_detections}/{earlyWarning.attack_sequences}
                </span>
              </div>
              <RadialGauge valuePct={earlyWarning.early_detection_rate * 100} color="#34D399" size={56} />
            </InteractiveCard>

            <InteractiveCard noPerspective title="Sequence-level outcomes" className="p-3.5 space-y-1">
              <span className="text-[11px] text-[#AD98C5] block">Sequence Outcomes</span>
              <div className="text-[11px] font-mono text-[#F3E8FF] space-y-0.5">
                <div>Late: <strong className="text-amber-300">{earlyWarning.late_detections}</strong> | Missed: <strong className="text-rose-400">{earlyWarning.missed_detections}</strong></div>
                <div>Premature Alerts: <strong className="text-[#E8BB65]">{earlyWarning.premature_alerts}</strong></div>
              </div>
            </InteractiveCard>

            <InteractiveCard noPerspective title="Benign control false-alarm rate" className="p-3.5">
              <span className="text-[11px] text-[#AD98C5] block">Benign Control FA</span>
              <span className="text-lg font-bold font-mono text-[#E8BB65]">
                {(earlyWarning.benign_control_false_alarm_rate * 100).toFixed(2)}%
              </span>
              <span className="text-[10px] text-[#AD98C5] block">
                {earlyWarning.benign_control_false_alarms}/{earlyWarning.benign_control_sequences} sequences
              </span>
            </InteractiveCard>

            <InteractiveCard noPerspective title="Simulated elapsed time until first alert (distinct from inference latency)" className="p-3.5">
              <span className="text-[11px] text-[#AD98C5] block">Simulated Alert Timing</span>
              <span className="text-base font-bold font-mono text-[#F3E8FF]">
                Med {earlyWarning.median_time_to_first_alert_sim_s}s
              </span>
              <span className="text-[10px] text-[#AD98C5] block">
                p95: {earlyWarning.p95_time_to_first_alert_sim_s}s (simulated)
              </span>
            </InteractiveCard>

            <InteractiveCard noPerspective title="Measured warm inference latency and peak traced memory" className="p-3.5">
              <span className="text-[11px] text-[#AD98C5] block">Measured Latency & RAM</span>
              <span className="text-base font-bold font-mono text-[#E8BB65]">{earlyWarning.latency_mean_ms} ms</span>
              <span className="text-[10px] text-[#AD98C5] block">
                p95: {earlyWarning.latency_p95_ms} ms · {earlyWarning.peak_traced_memory_mb} MB
              </span>
            </InteractiveCard>
          </div>
        </div>
      )}

      {/* 4. Structured Workspace Activity Timeline */}
      {workspaceStatus && (
        <div className="ns-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="ns-section-title">
                Workspace Activity Timeline ({workspaceStatus.workspace_path})
              </h3>
              <p className="text-[11px] text-[#AD98C5] mt-0.5">
                Monitor: <strong className="text-emerald-400 uppercase">{workspaceStatus.monitoring_status}</strong> ·{" "}
                Files: <strong className="text-[#F3E8FF]">{workspaceStatus.file_count}</strong> ·{" "}
                Telemetry: <strong className="text-[#E8BB65]">{workspaceStatus.telemetry_status}</strong>
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#AD98C5]">
              Observed Events: {workspaceStatus.measurable_features?.observed_event_count ?? 0} · Exts:{" "}
              {workspaceStatus.measurable_features?.unique_ext_count ?? 0}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-[#160D26]/14 border border-purple-300/12 rounded-lg max-h-48 overflow-y-auto">
              <span className="text-[10px] font-semibold text-[#E8BB65] uppercase tracking-wider block mb-2">
                Chronological Event Timeline
              </span>
              {workspaceStatus.recent_events?.length > 0 ? (
                <div className="ns-timeline space-y-2">
                  {workspaceStatus.recent_events.slice(0, 8).map((ev, i) => {
                    const isSynth = String(ev.telemetry_source || "").includes("synthetic");
                    const EvIcon =
                      ev.event_type === "created"
                        ? FilePlus2
                        : ev.event_type === "modified"
                        ? FileEdit
                        : isSynth
                        ? ShieldAlert
                        : Activity;
                    return (
                      <div key={i} className="flex items-start gap-2 text-[11px]">
                        <span className="ns-timeline-dot" />
                        <EvIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSynth ? "text-rose-400" : "text-[#E8BB65]"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <span className="font-mono text-[#F3E8FF] truncate">
                              [{ev.event_type}] {ev.filename}
                            </span>
                            <span className="font-mono text-[#AD98C5] shrink-0">
                              {ev.timestamp?.substring(11, 19)}Z
                            </span>
                          </div>
                          <span className={`text-[10px] ${isSynth ? "text-rose-300" : "text-emerald-400"}`}>
                            {isSynth ? "Synthetic Telemetry" : "Observed File Activity (workspace_observer)"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-[11px] text-[#AD98C5]">
                  No manual edits yet. Edit or rename a file in demo_workspace/ to observe live events.
                </span>
              )}
            </div>

            <div className="p-3 bg-[#160D26]/14 border border-purple-300/12 rounded-lg">
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <FileWarning className="w-3.5 h-3.5" />
                Unavailable Measurements (Not Fabricated)
              </span>
              <ul className="space-y-1 text-[11px] font-mono text-[#AD98C5]">
                {(workspaceStatus.unavailable_features || []).map((u, i) => (
                  <li key={i}>• {u}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
