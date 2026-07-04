import axios from "axios";

import type {
  Alert,
  AlertDetail,
  AnalyticsResponse,
  CustomerDetail,
  Customer,
  DashboardResponse,
  DemoModeStatus,
  DemoScenario,
  DemoTriggerResponse,
  PaginatedResponse,
  Rule,
  Transaction,
} from "@/types";

// `||` (not `??`) so an env var that is defined-but-empty at build time still
// falls back to the same-origin relative path instead of producing "".
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// The hosted demo backend runs on a free tier that can go to sleep after a
// period of inactivity and take up to ~60s to wake on the next request. A
// network-level failure (no HTTP response) is the signature of that cold start,
// so we retry with backoff before surfacing the error to the UI.
//
// Retries are restricted to safe, idempotent GET requests: re-sending a POST
// (login, alert actions, demo triggers) after a lost/timed-out response would
// duplicate server-side writes, so mutations fail fast to their own error UI.
const MAX_WAKE_RETRIES = 6;
const wakeListeners = new Set<(waking: boolean) => void>();

// Ref-count of GETs currently sleeping between wake retries. The banner shows
// while any request is retrying (0 -> 1) and hides only when the last one
// settles (-> 0), so concurrent pollers can't flap it on and off.
let wakingCount = 0;

export function onBackendWaking(listener: (waking: boolean) => void): () => void {
  wakeListeners.add(listener);
  return () => wakeListeners.delete(listener);
}

function setWaking(delta: number) {
  const was = wakingCount > 0;
  wakingCount = Math.max(0, wakingCount + delta);
  const now = wakingCount > 0;
  if (was !== now) wakeListeners.forEach((listener) => listener(now));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      const loginPath = `${import.meta.env.BASE_URL}login`;
      if (!window.location.pathname.startsWith(loginPath)) {
        window.location.href = loginPath;
      }
      return Promise.reject(error);
    }

    const config = error.config;
    const method = (config?.method ?? "get").toLowerCase();
    const isNetworkFailure = !error.response;
    const isRetriable = isNetworkFailure && method === "get" && config;

    if (isRetriable && (config.__wakeRetryCount ?? 0) < MAX_WAKE_RETRIES) {
      config.__wakeRetryCount = (config.__wakeRetryCount ?? 0) + 1;
      setWaking(+1);
      try {
        await sleep(Math.min(2000 * config.__wakeRetryCount, 10_000));
        return await api(config);
      } finally {
        setWaking(-1);
      }
    }

    return Promise.reject(error);
  }
);

export interface LoginResult {
  token: string;
  username: string;
  full_name: string;
  role: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResult>("/auth/login", { username, password }).then((r) => r.data),
  logout: () => api.post("/auth/logout"),
};

export const dashboardApi = {
  get: () => api.get<DashboardResponse>("/dashboard").then((r) => r.data),
};

export interface TransactionFilters {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  is_fraud?: boolean;
  min_risk?: number;
  max_risk?: number;
  transaction_type?: string;
  country?: string;
  customer_id?: number;
  date_from?: string;
  date_to?: string;
}

export const transactionsApi = {
  list: (filters: TransactionFilters) =>
    api.get<PaginatedResponse<Transaction>>("/transactions", { params: filters }).then((r) => r.data),
  get: (id: number) => api.get<Transaction>(`/transactions/${id}`).then((r) => r.data),
  exportCsv: async (filters: TransactionFilters) => {
    // timeout: 0 — a large CSV export can legitimately take longer than the
    // default 15s request timeout; don't abort (and don't trigger wake-retry).
    const response = await api.get("/transactions/export", { params: filters, responseType: "blob", timeout: 0 });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "transactions_export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const customersApi = {
  list: (params: { page?: number; page_size?: number; search?: string; risk_segment?: string }) =>
    api.get<PaginatedResponse<Customer>>("/customers", { params }).then((r) => r.data),
  get: (id: number) => api.get<CustomerDetail>(`/customers/${id}`).then((r) => r.data),
  transactions: (id: number, params: { page?: number; page_size?: number }) =>
    api.get<PaginatedResponse<Transaction>>(`/customers/${id}/transactions`, { params }).then((r) => r.data),
};

export const rulesApi = {
  list: () => api.get<Rule[]>("/rules").then((r) => r.data),
  update: (id: number, payload: Partial<Pick<Rule, "weight" | "threshold" | "enabled" | "priority">>) =>
    api.patch<Rule>(`/rules/${id}`, payload).then((r) => r.data),
};

export const alertsApi = {
  list: (params: { page?: number; page_size?: number; status?: string; severity?: string; customer_id?: number }) =>
    api.get<PaginatedResponse<Alert>>("/alerts", { params }).then((r) => r.data),
  get: (id: number) => api.get<AlertDetail>(`/alerts/${id}`).then((r) => r.data),
  assign: (id: number, investigator: string) =>
    api.post<Alert>(`/alerts/${id}/assign`, { investigator }).then((r) => r.data),
  investigate: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/investigate`, { investigator, notes }).then((r) => r.data),
  approve: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/approve`, { investigator, notes }).then((r) => r.data),
  block: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/block`, { investigator, notes }).then((r) => r.data),
  markSafe: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/mark-safe`, { investigator, notes }).then((r) => r.data),
  addNote: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/notes`, { investigator, notes }).then((r) => r.data),
  close: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/close`, { investigator, notes }).then((r) => r.data),
  escalate: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/escalate`, { investigator, notes }).then((r) => r.data),
  freezeAccount: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/freeze-account`, { investigator, notes }).then((r) => r.data),
  requestVerification: (id: number, investigator: string, notes: string) =>
    api.post<Alert>(`/alerts/${id}/request-verification`, { investigator, notes }).then((r) => r.data),
  downloadReport: async (id: number, alertRef: string) => {
    // Open a blank tab synchronously (before the await) so mobile popup blockers
    // don't treat the later navigation as an unsolicited popup.
    const viewerTab = window.open("", "_blank");
    try {
      const response = await api.get(`/alerts/${id}/report`, { responseType: "blob", timeout: 0 });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      if (viewerTab) {
        // Render inline via the browser's native PDF viewer. Forcing an OS-level
        // file download here is unreliable on mobile: some Android browsers save
        // blob downloads without the correct file type in the Downloads metadata,
        // so re-opening the saved file launches a plain-text viewer instead of a
        // PDF reader. Viewing in-browser sidesteps that OS handoff entirely, and
        // the browser's own viewer still offers a save/download button.
        viewerTab.location.href = url;
      } else {
        // Popup blocked — fall back to a direct download.
        const link = document.createElement("a");
        link.href = url;
        link.download = `${alertRef}_investigation_report.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      viewerTab?.close();
      throw err;
    }
  },
};

export const analyticsApi = {
  get: (hours = 24) => api.get<AnalyticsResponse>("/analytics", { params: { hours } }).then((r) => r.data),
};

export const demoApi = {
  scenarios: () => api.get<DemoScenario[]>("/demo/scenarios").then((r) => r.data),
  trigger: (code: string) => api.post<DemoTriggerResponse>(`/demo/trigger/${code}`).then((r) => r.data),
  getMode: () => api.get<DemoModeStatus>("/demo/mode").then((r) => r.data),
  setMode: (enabled: boolean) => api.post<DemoModeStatus>("/demo/mode", { enabled }).then((r) => r.data),
};
