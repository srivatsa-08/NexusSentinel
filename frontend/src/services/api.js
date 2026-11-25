import axios from "axios";

export const API_BASE = "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

export const fetchHealth = async () => (await api.get("/health")).data;
export const fetchEndpoints = async () => (await api.get("/endpoints")).data;
export const fetchAssessments = async () => (await api.get("/assessments")).data;
export const fetchIncidents = async () => (await api.get("/incidents")).data;
export const fetchMetrics = async () => (await api.get("/metrics")).data;

export const triggerDemoScenario = async (scenario) =>
  (await api.post("/demo/start", { scenario })).data;

export const resetDemo = async () => (await api.post("/demo/reset")).data;

