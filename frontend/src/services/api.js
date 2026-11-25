import axios from "axios";

export const API_BASE = "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

export const fetchHealth = async () => (await api.get("/health")).data;
export const fetchEndpoints = async () => (await api.get("/endpoints")).data;
export const fetchAssessments = async () => (await api.get("/assessments")).data;
export const fetchIncidents = async () => (await api.get("/incidents")).data;
export const fetchMetrics = async () => (await api.get("/metrics")).data;

export const triggerDemoScenario = async (scenario) =>
  (await api.post("/demo/start", { scenario })).data;

export const resetDemo = async () => (await api.post("/demo/reset")).data;

export const runBatchAssessment = async (records) =>
  (await api.post("/assessment/batch", { records })).data;

export const getSampleDatasetUrl = (format) =>
  `${API_BASE}/download/sample-dataset/${format}`;

export const fetchMonitorStatus = async () => (await api.get("/monitor/status")).data;
export const startMonitor = async () => (await api.post("/monitor/start")).data;
export const pauseMonitor = async () => (await api.post("/monitor/pause")).data;
export const resumeMonitor = async () => (await api.post("/monitor/resume")).data;
export const stopMonitor = async () => (await api.post("/monitor/stop")).data;
export const stepMonitor = async () => (await api.post("/monitor/step")).data;
export const fetchEarlyWarningMetrics = async () => (await api.get("/monitor/early-warning")).data;
export const fetchGatewayStatus = async () => (await api.get("/gateway/status")).data;
export const simulateGatewayScenario = async (scenario) =>
  (await api.post("/gateway/simulate", { scenario })).data;
export const resetGateway = async () => (await api.post("/gateway/reset")).data;
export const simulateGatewayBulk = async (profile, count) =>
  (await api.post("/gateway/bulk", { profile, count })).data;
