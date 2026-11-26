import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PURPLE_DARK = [46, 16, 101];   // #2E1065
const PURPLE_MID = [124, 58, 237];   // #7C3AED
const GOLD_ANTIQUE = [184, 134, 53]; // #B88635
const TEXT_DARK = [24, 16, 38];
const TEXT_MUTED = [95, 82, 118];
const BG_LIGHT = [245, 240, 255];

export const REPORT_TYPES = [
  { id: "comprehensive", label: "Comprehensive Security Assessment Report" },
  { id: "incident", label: "Individual Incident Report" },
  { id: "workspace", label: "Workspace Protection Report" },
  { id: "model", label: "AI Model Performance Report" },
  { id: "gateway", label: "Gateway Protection Report" },
];

/**
 * Sanitize untrusted strings (filenames, notes, identifiers) for safe PDF/preview rendering.
 */
export function sanitizeText(val, maxLen = 220) {
  if (val === null || val === undefined) return "--";
  const cleaned = String(val)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .trim();
  if (!cleaned) return "--";
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

const FEATURE_CATALOG = [
  {
    key: "file_mod_rate",
    name: "File Modification Rate",
    relevance: "Rapid bursts of file writes/modifications are characteristic of automated encryption loops.",
    limitation: "Legitimate bulk builds or backups can also elevate modification rates.",
  },
  {
    key: "entropy_delta",
    name: "Entropy Delta (ΔH)",
    relevance: "Measures change in byte-level randomness; encrypted outputs approach high Shannon entropy.",
    limitation: "Compressed archives (.zip, .7z) naturally exhibit high entropy.",
  },
  {
    key: "rename_ratio",
    name: "Rename Ratio",
    relevance: "High proportion of rename operations indicates mass extension appending (e.g. .locked).",
    limitation: "Batch refactoring or asset pipelines can temporarily raise rename ratios.",
  },
  {
    key: "unique_ext_count",
    name: "Unique Extension Count",
    relevance: "Tracks sudden appearance of novel or anomalous file extensions in a short window.",
    limitation: "Mixed-format project folders naturally contain diverse extensions.",
  },
  {
    key: "burst_io_score",
    name: "Burst I/O Score",
    relevance: "Captures sustained, high-intensity I/O bursts typical of ransomware traversal.",
    limitation: "Large media exports or database dumps can produce similar I/O spikes.",
  },
  {
    key: "shadow_copy_access_flag",
    name: "Shadow Copy Access Flag",
    relevance: "Indicates attempted Volume Shadow Copy / backup inhibition (high-severity indicator).",
    limitation: "Not directly measured by the user-space workspace observer; only present in synthetic telemetry.",
  },
];

/**
 * Build structured report data from actual application state (zero fabricated metrics).
 */
export function buildReportData(reportType, state) {
  const {
    health = {},
    endpoints = [],
    assessments = [],
    incidents = [],
    activeIncident = null,
    workspaceStatus = null,
    gateway = null,
    metrics = null,
    earlyWarning = null,
  } = state || {};

  const nowIso = new Date().toISOString();
  const reportId = `NS-RPT-${reportType.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`;
  const titleObj = REPORT_TYPES.find((r) => r.id === reportType) || REPORT_TYPES[0];
  const latestAssessment = assessments[0] || activeIncident || null;
  const p2 = metrics?.phase2_model || null;
  const p1 = metrics?.phase1_fallback_on_phase2_val || null;
  const p2Acc = p2 ? (((p2.confusion_matrix.tp + p2.confusion_matrix.tn) / p2.validation_samples) * 100).toFixed(2) : "--";

  const sections = [];

  // Executive Summary (all reports)
  sections.push({
    id: "exec",
    title: "Executive Summary",
    paragraphs: [
      `This report documents observed telemetry, AI behavioural assessments, and simulated containment states recorded by Nexus Sentinel (${sanitizeText(health.model_version || "rf-phase2-v1")}).`,
      `All assessments in this prototype use synthetic tabular observations or controlled demonstration workspace metadata. Risk scores (0–100) are uncalibrated model/heuristic scores and should not be interpreted as statistically calibrated probabilities.`,
      `Recorded Totals: ${assessments.length} assessment(s), ${incidents.length} active/recorded incident(s), ${endpoints.length} virtual endpoint(s), and ${workspaceStatus?.file_count ?? 0} file(s) in demo_workspace/.`,
    ],
  });

  if (reportType === "comprehensive" || reportType === "incident") {
    const inc = activeIncident || incidents[0] || null;
    sections.push({
      id: "sys",
      title: "System & Model Information",
      table: {
        head: [["Component", "Status / Value"]],
        body: [
          ["Backend API", sanitizeText(health.components?.backend || health.status || "unknown")],
          ["Database", sanitizeText(health.components?.database || "sqlite")],
          ["ML Engine", sanitizeText(health.components?.ml_engine || "active")],
          ["Model Version", sanitizeText(health.model_version || "rf-phase2-v1")],
          ["Gateway Controller", sanitizeText(health.components?.gateway || "active")],
        ],
      },
    });

    sections.push({
      id: "inc",
      title: "Incident Identification & Threat Classification",
      paragraphs: inc
        ? [
            `Incident ID: ${sanitizeText(inc.incident_id)} | Endpoint: ${sanitizeText(inc.endpoint_id)} | Severity: ${sanitizeText(inc.severity).toUpperCase()} | Status: ${sanitizeText(inc.investigation_status || "open")}.`,
            `Risk Score: ${inc.risk_score ?? "--"}/100 (uncalibrated behavioural score). Processing Latency: ${inc.processing_time_ms ?? "--"} ms.`,
          ]
        : [
            "No active simulated incident is currently recorded. All virtual endpoints are in monitoring posture.",
          ],
    });

    sections.push({
      id: "xai",
      title: "Explainable AI & Feature-Level Evidence",
      paragraphs: [
        "Nexus Sentinel separates Random Forest model-derived feature attributions from rule-based heuristic indicators. Missing OS-level telemetry is never fabricated.",
      ],
      table: {
        head: [["Feature", "Relevance", "Interpretation Limitation"]],
        body: FEATURE_CATALOG.map((f) => [f.name, f.relevance, f.limitation]),
      },
    });

    if (inc?.timeline?.length) {
      sections.push({
        id: "timeline",
        title: "Chronological Incident Timeline",
        table: {
          head: [["Event", "Timestamp", "Elapsed (ms)"]],
          body: inc.timeline.map((ev) => [
            sanitizeText(ev.event),
            sanitizeText(ev.timestamp),
            String(ev.elapsed_ms ?? "--"),
          ]),
        },
      });
    }
  }

  if (reportType === "comprehensive" || reportType === "workspace") {
    sections.push({
      id: "ws",
      title: "Workspace Protection & Impact Assessment",
      paragraphs: [
        `Controlled Workspace: ${sanitizeText(workspaceStatus?.workspace_path || "demo_workspace/")} | Monitoring: ${sanitizeText(workspaceStatus?.monitoring_status || "active")} | Harness: ${sanitizeText(workspaceStatus?.harness_state?.status || "idle")}.`,
        "Automated suspicious scenarios apply virtual state overlays only; actual files on disk are never encrypted or modified.",
      ],
      table: {
        head: [["Actual Filename", "Simulated State", "Ext", "Size (B)", "Observed Activity"]],
        body: (workspaceStatus?.files || []).slice(0, 25).map((f) => [
          sanitizeText(f.relative_path, 60),
          sanitizeText(f.simulated_filename || f.simulated_status, 40),
          sanitizeText(f.extension, 12),
          String(f.size_bytes ?? 0),
          sanitizeText(f.observed_activity, 32),
        ]),
      },
    });
  }

  if (reportType === "comprehensive" || reportType === "gateway") {
    sections.push({
      id: "gw",
      title: "Gateway Protection Analysis",
      paragraphs: [
        "Pre-AI admission control enforces bounded request quotas and queue depth before invoking local Random Forest inference.",
      ],
      table: {
        head: [["Metric", "Recorded Value"]],
        body: [
          ["Total Requests", String(gateway?.total_requests ?? 0)],
          ["Accepted Requests", String(gateway?.accepted_requests ?? 0)],
          ["Throttled Requests", String(gateway?.throttled_requests ?? 0)],
          ["Rejected Requests", String(gateway?.rejected_requests ?? 0)],
          ["AI Assessments Avoided", String(gateway?.avoided_assessments ?? 0)],
          ["Estimated CPU Saved (Local RF)", `${gateway?.estimated_cpu_saved_ms ?? 0} ms`],
          ["Queue Utilization", `${gateway?.queue_depth ?? 0} / ${gateway?.queue_capacity ?? 10} (${gateway?.queue_utilization_pct ?? 0}%)`],
        ],
      },
      chart: gateway
        ? {
            title: "Gateway Request Volume Breakdown",
            bars: [
              { label: "Accepted", value: gateway.accepted_requests ?? 0, color: PURPLE_MID },
              { label: "Throttled", value: gateway.throttled_requests ?? 0, color: GOLD_ANTIQUE },
              { label: "Rejected", value: gateway.rejected_requests ?? 0, color: [190, 18, 60] },
            ],
          }
        : null,
    });
  }

  if (reportType === "comprehensive" || reportType === "model") {
    sections.push({
      id: "model",
      title: "AI Model Performance Evaluation (Synthetic Validation)",
      paragraphs: [
        "All benchmark metrics below are measured on synthetic validation datasets (val_phase2.csv, n=600) and simulated early-warning sequences. They do not represent independent real-world production validation.",
        "Note: Single-call inference latency measures local Random Forest prediction time only, distinct from end-to-end workspace detection latency.",
      ],
      table: {
        head: [["Metric", "Phase 2 Model", "Notes"]],
        body: p2
          ? [
              ["Accuracy", `${p2Acc}%`, "Synthetic val_phase2.csv (n=600)"],
              ["Precision", `${(p2.precision * 100).toFixed(2)}%`, "True positives / predicted suspicious"],
              ["Recall", `${(p2.recall * 100).toFixed(2)}%`, "True positives / actual attacks"],
              ["F1 Score", `${(p2.f1_score * 100).toFixed(2)}%`, "Harmonic mean"],
              ["Observation-Level FPR", `${(p2.false_positive_rate * 100).toFixed(2)}%`, `FP=${p2.confusion_matrix.fp}, TN=${p2.confusion_matrix.tn}`],
              ["Inference Latency", `${metrics?.single_call_latency_ms ?? "--"} ms`, "Local RF single-call"],
              ["Early-Warning Rate (Sim)", earlyWarning ? `${(earlyWarning.early_detection_rate * 100).toFixed(1)}%` : "--", "Simulated sequence evaluation"],
              ["Peak Traced Memory", earlyWarning ? `${earlyWarning.peak_traced_memory_mb} MB` : "--", "Isolated tracemalloc benchmark"],
            ]
          : [["Status", "Unavailable", "Ensure backend /api/v1/metrics is reachable."]],
      },
      chart:
        p1 && p2
          ? {
              title: "False-Positive Reduction (Phase 1 Baseline vs Phase 2 Model)",
              bars: [
                { label: "Phase 1 Total FP", value: p1.confusion_matrix.fp, color: PURPLE_MID },
                { label: "Phase 2 Total FP", value: p2.confusion_matrix.fp, color: GOLD_ANTIQUE },
              ],
            }
          : null,
    });
  }

  // FinTech & Regulatory Considerations + Limitations (all reports)
  sections.push({
    id: "fintech",
    title: "Financial Business Impact & Regulatory Considerations",
    paragraphs: [
      "Potential FinTech Implications (Illustrative, not confirmed losses): Rapid file-alteration events on financial workstations can threaten payment availability, accounting ledger integrity, customer PII confidentiality, and backup recoverability.",
      "Regulatory Context: Financial institutions operating under RBI Cyber Security Framework, CERT-In 6-hour incident reporting directives, ISO/IEC 27001, NIST CSF, and PCI DSS should maintain immutable backups, audited containment logs, and human-in-the-loop incident review. Nexus Sentinel is a hackathon prototype and does not claim regulatory compliance or production certification.",
    ],
  });

  sections.push({
    id: "limits",
    title: "Technical Limitations & Conclusions",
    paragraphs: [
      "1. Telemetry Scope: User-space workspace monitoring cannot measure kernel-level shadow copy deletion or process-level entropy without OS drivers; unavailable features are explicitly reported rather than fabricated.",
      "2. Simulated Containment: Endpoint isolation (simulated_isolated) is a logical state flag and does not modify host firewall or OS network interfaces.",
      `3. Conclusion: Nexus Sentinel demonstrates low-latency (${metrics?.single_call_latency_ms ?? "--"} ms) behavioural scoring with reduced false positives on benign backup/compression workloads, paired with bounded gateway admission control.`,
    ],
  });

  return {
    reportId,
    reportType,
    title: titleObj.label,
    generatedAt: nowIso,
    endpointId: sanitizeText(latestAssessment?.endpoint_id || endpoints[0]?.endpoint_id || "FIN-001"),
    classification: sanitizeText(latestAssessment?.label || "monitoring"),
    modelVersion: sanitizeText(health.model_version || "rf-phase2-v1"),
    sections,
  };
}

function drawBarChart(doc, chart, startY) {
  if (!chart?.bars?.length) return startY;
  let y = startY;
  if (y + 52 > 272) {
    doc.addPage();
    y = 22;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...PURPLE_DARK);
  doc.text(chart.title, 14, y);
  y += 5;

  const maxVal = Math.max(1, ...chart.bars.map((b) => b.value));
  const chartW = 140;
  chart.bars.forEach((b) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text(sanitizeText(b.label, 28), 14, y + 4.5);

    const barW = Math.max(2, (b.value / maxVal) * chartW);
    doc.setFillColor(...b.color);
    doc.rect(58, y, barW, 5.5, "F");

    doc.setTextColor(...TEXT_MUTED);
    doc.text(String(b.value), 58 + barW + 3, y + 4.5);
    y += 9;
  });
  return y + 4;
}

/**
 * Generate and download a multi-page A4 FinTech PDF report.
 */
export function downloadFinTechPdf(reportType, state) {
  const data = buildReportData(reportType, state);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── COVER PAGE ───────────────────────────────────────────────
  doc.setFillColor(...PURPLE_DARK);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...GOLD_ANTIQUE);
  doc.rect(0, 28, pageW, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("NEXUS SENTINEL", 14, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(232, 187, 101);
  doc.text("FINANCIAL CYBERSECURITY INTELLIGENCE", 14, 20);

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("CONFIDENTIAL · ILLUSTRATIVE REPORT", 14, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...PURPLE_DARK);
  const titleLines = doc.splitTextToSize(data.title, pageW - 28);
  doc.text(titleLines, 14, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("Behavioural threat detection, simulated containment, and FinTech risk analysis.", 14, 76);

  // Summary metadata cards on cover
  const cards = [
    ["Report ID", data.reportId],
    ["Target Endpoint", data.endpointId],
    ["Latest Classification", data.classification.toUpperCase()],
    ["Model Version", data.modelVersion],
  ];
  cards.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * 92;
    const y = 90 + row * 24;
    doc.setFillColor(...BG_LIGHT);
    doc.roundedRect(x, y, 86, 19, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(k, x + 4, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PURPLE_DARK);
    doc.text(sanitizeText(v, 30), x + 4, y + 14);
  });

  // Table of Contents on Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PURPLE_DARK);
  doc.text("Table of Contents", 14, 150);
  doc.setDrawColor(...GOLD_ANTIQUE);
  doc.line(14, 152.5, pageW - 14, 152.5);

  let tocY = 160;
  data.sections.forEach((sec, idx) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_DARK);
    doc.text(`${String(idx + 1).padStart(2, "0")} — ${sec.title}`, 16, tocY);
    tocY += 7;
  });

  // ── CONTENT PAGES ────────────────────────────────────────────
  doc.addPage();
  let y = 20;

  data.sections.forEach((sec, idx) => {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PURPLE_DARK);
    doc.text(`${String(idx + 1).padStart(2, "0")} — ${sec.title}`, 14, y);
    y += 2.5;
    doc.setDrawColor(...GOLD_ANTIQUE);
    doc.line(14, y, pageW - 14, y);
    y += 6;

    if (sec.paragraphs) {
      sec.paragraphs.forEach((p) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...TEXT_DARK);
        const lines = doc.splitTextToSize(sanitizeText(p, 1200), pageW - 28);
        if (y + lines.length * 4.5 > 272) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines, 14, y);
        y += lines.length * 4.5 + 3;
      });
    }

    if (sec.table && sec.table.body.length > 0) {
      autoTable(doc, {
        startY: y,
        head: sec.table.head,
        body: sec.table.body,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2.2, textColor: TEXT_DARK },
        headStyles: { fillColor: PURPLE_DARK, textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 245, 255] },
        margin: { left: 14, right: 14 },
        showHead: "everyPage",
      });
      y = doc.lastAutoTable.finalY + 7;
    }

    if (sec.chart) {
      y = drawBarChart(doc, sec.chart, y);
    }

    y += 4;
  });

  // ── PAGE NUMBERS & FOOTER ON ALL PAGES ───────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 212, 235);
    doc.line(14, 284, pageW - 14, 284);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(`Nexus Sentinel · ${data.reportId} · ${data.generatedAt.slice(0, 19)}Z`, 14, 289);
    doc.text(`Page ${p} of ${totalPages}`, pageW - 14, 289, { align: "right" });
  }

  doc.save(`${data.reportId.toLowerCase()}.pdf`);
  return data;
}

