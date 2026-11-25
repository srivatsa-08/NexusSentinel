# Nexus Sentinel: Sample Security Incident Report
**Document Classification:** Simulated Demonstration Record  
**Notice:** All observations, assessments, and actions in this report are 100% synthetic. No actual filesystem modification, live malware execution, or true network isolation has taken place.

---

### 1. Incident Overview

| Field | Value | Description |
| :--- | :--- | :--- |
| **Incident ID** | `i-synth-2026-0042` | Unique simulated incident tracker |
| **Assessment ID** | `a-synth-9102` | Unique assessment link |
| **Endpoint Identifier** | `sim-endpoint-finance-03` | Monitored synthetic host |
| **Assessment Timestamp** | `2026-11-25T13:45:00Z` | UTC ISO-8601 observation window timestamp |
| **Risk Score** | **99 / 100** | Model-derived suspicious score (0–100 scale; uncalibrated) |
| **Classification** | **`suspicious`** | Early-warning defensive trigger |
| **Containment Status** | **`simulated_isolated`** | Endpoint placed in synthetic restricted state |
| **Model Engine Version** | `rf-phase2-v1` (Schema `1.0.0`) | Deployed lightweight Random Forest tabular artifact |
| **Simulated Flag** | `true` | Mandatory flag confirming synthetic context |

---

### 2. Explainable AI & Indicators

The system combines local feature perturbation analysis with heuristic thresholds to ensure full transparency for SOC analysts.

#### A. Model-Derived Attributions (Perturbation vs Benign Median)
*How the machine learning model calculated the risk score:*
1. **`unique_ext_count`**: Increases suspicious score by **+38.0 points** compared to the benign median (touched 18 distinct extensions in a single observation window).
2. **`rename_ratio`**: Increases suspicious score by **+35.6 points** compared to the benign median (75% of file operations were rename events, typical of ransomware extension alteration).
3. **`entropy_delta`**: Increases suspicious score by **+13.5 points** compared to the benign median (entropy shift of 2.80 indicated widespread high-entropy encrypted payloads).

#### B. Rule-Based Heuristic Indicators
*Static defensive thresholds breached:*
- `heuristic: elevated entropy delta (>= 1.5)`
- `heuristic: elevated file rename ratio (>= 0.45)`
- `heuristic: broad extension diversity (>= 10)`
- `heuristic: high file modification rate (>= 80/min)`
- `heuristic: sustained I/O burst (>= 0.70)`
- `heuristic: shadow copy access pattern (flag == 1)`

---

### 3. Response Checklist (Simulated Automated Containment)

- [x] **Simulated Host Isolation:** `sim-endpoint-finance-03` status flagged as `simulated_isolated` in security posture directory.
- [x] **SOC Alert Notification:** Dispatched synthetic assessment record to incident triage queue.
- [ ] **Snapshot Verification:** Validate snapshot integrity prior to the `2026-11-25T13:45:00Z` observation window.
- [ ] **Process Triage Review:** Review parent process IDs associated with burst rename events.
- [ ] **Remediation Sign-off:** Confirm environment safety before executing simulated un-isolation (`POST /api/v1/demo/reset`).
