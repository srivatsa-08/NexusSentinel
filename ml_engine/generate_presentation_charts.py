"""Generate presentation-ready evaluation charts comparing Phase 1 and Phase 2."""

from __future__ import annotations

import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
METRICS_PATH = ARTIFACTS_DIR / "metrics_phase2.json"
CHARTS_DIR = Path(__file__).resolve().parent / "presentation_charts"


def generate_charts() -> list[Path]:
    CHARTS_DIR.mkdir(parents=True, exist_ok=True)
    with METRICS_PATH.open("r", encoding="utf-8") as f:
        metrics = json.load(f)

    p1 = metrics["phase1_fallback_on_phase2_val"]
    p2 = metrics["phase2_model"]

    saved_paths: list[Path] = []

    # Chart 1: False Positives Comparison (89 vs 4)
    fig, ax = plt.subplots(figsize=(7, 4.5))
    categories = ["Legitimate Backup", "Legitimate Compression", "Total False Positives"]
    p1_vals = [
        p1["scenario_breakdown"]["backup"]["false_positives"],
        p1["scenario_breakdown"]["compression"]["false_positives"],
        p1["confusion_matrix"]["fp"],
    ]
    p2_vals = [
        p2["scenario_breakdown"]["backup"]["false_positives"],
        p2["scenario_breakdown"]["compression"]["false_positives"],
        p2["confusion_matrix"]["fp"],
    ]

    x = np.arange(len(categories))
    width = 0.35

    rects1 = ax.bar(x - width/2, p1_vals, width, label="Phase 1 Baseline", color="#E57373")
    rects2 = ax.bar(x + width/2, p2_vals, width, label="Phase 2 Robust Model", color="#4CAF50")

    ax.set_ylabel("False Positive Count (out of 400 Benign Records)")
    ax.set_title("Drastic False-Positive Reduction: 89 to 4 (-95.5%)", fontsize=13, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(categories, fontsize=10)
    ax.legend(frameon=True)
    ax.grid(axis="y", linestyle="--", alpha=0.6)

    ax.bar_label(rects1, padding=3, fontweight="bold")
    ax.bar_label(rects2, padding=3, fontweight="bold")

    fig.tight_layout()
    chart1_path = CHARTS_DIR / "fp_reduction_comparison.png"
    fig.savefig(chart1_path, dpi=200)
    plt.close(fig)
    saved_paths.append(chart1_path)

    # Chart 2: Core Metrics Comparison
    fig, ax = plt.subplots(figsize=(8, 4.5))
    metrics_names = ["Precision", "Recall", "F1 Score", "1 - FPR (Specificity)"]
    p1_scores = [p1["precision"], p1["recall"], p1["f1_score"], 1.0 - p1["false_positive_rate"]]
    p2_scores = [p2["precision"], p2["recall"], p2["f1_score"], 1.0 - p2["false_positive_rate"]]

    x = np.arange(len(metrics_names))
    rects1 = ax.bar(x - width/2, p1_scores, width, label="Phase 1 Baseline", color="#90CAF9")
    rects2 = ax.bar(x + width/2, p2_scores, width, label="Phase 2 Robust Model", color="#1E88E5")

    ax.set_ylabel("Score (0.0 to 1.0)")
    ax.set_title("Classification Metric Improvements on Independent Validation Data", fontsize=12, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(metrics_names, fontsize=10)
    ax.set_ylim(0, 1.15)
    ax.legend(frameon=True)
    ax.grid(axis="y", linestyle="--", alpha=0.6)

    for r in rects1:
        h = r.get_height()
        ax.annotate(f"{h:.3f}", xy=(r.get_x() + r.get_width() / 2, h), xytext=(0, 3),
                    textcoords="offset points", ha="center", va="bottom", fontsize=9)
    for r in rects2:
        h = r.get_height()
        ax.annotate(f"{h:.3f}", xy=(r.get_x() + r.get_width() / 2, h), xytext=(0, 3),
                    textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")

    fig.tight_layout()
    chart2_path = CHARTS_DIR / "core_metrics_comparison.png"
    fig.savefig(chart2_path, dpi=200)
    plt.close(fig)
    saved_paths.append(chart2_path)

    return saved_paths


if __name__ == "__main__":
    paths = generate_charts()
    for p in paths:
        print("Generated chart:", p)

