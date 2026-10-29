import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { authStore, clearAuthSession, getAuthState, updateAccessToken } from "@/stores/auth";

import type { AuthTokenResponse, AuthTokens } from "@/api/auth/types";
import { normalizeAuthTokens } from "@/api/auth/tokens";

export const CORE_API_BASE = "/api/v1";
export const SERVICES_API_BASE = "/api/v1/svc";
export const ADMIN_API_BASE = "/api/v1/admin";

export type ApiAuthMode = "required" | "public";
export type ApiQueryValue = string | number | boolean | null | undefined;
export type ApiQuery = Record<string, ApiQueryValue | readonly ApiQueryValue[]>;

export interface ApiRequestOptions<TBody = unknown> extends Omit<
  AxiosRequestConfig<TBody>,
  "auth" | "baseURL" | "data" | "params" | "url"
> {
  auth?: ApiAuthMode;
  data?: TBody;
  params?: object;
}

type AniRequestConfig<TBody = unknown> = InternalAxiosRequestConfig<TBody> & {
  aniAuth?: ApiAuthMode;
  aniRetried?: boolean;
  aniSessionSignal?: AbortSignal;
};

type ApiErrorPayload = {
  error?: unknown;
  code?: unknown;
  reason?: unknown;
  metadata?: unknown;
  message?: unknown;
  request_id?: unknown;
  details?: unknown;
  detail?: unknown;
};

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string | number;
  readonly reason?: string;
  readonly requestId?: string;
  readonly request_id?: string;
  readonly details?: Record<string, unknown>;
  readonly config?: AxiosRequestConfig;
  readonly response?: AxiosResponse<unknown>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string | number;
      reason?: string;
      requestId?: string;
      details?: Record<string, unknown>;
      config?: AxiosRequestConfig;
      response?: AxiosResponse<unknown>;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.reason = options.reason;
    this.requestId = options.requestId;
    this.request_id = options.requestId;
    this.details = options.details;
    this.config = options.config;
    this.response = options.response;
  }
}

function serializeParams(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value !== null && value !== undefined) query.append(key, String(value));
    }
  }
  return query.toString();
}

function createApiInstance(baseURL: string): AxiosInstance {
  return axios.create({
    baseURL,
    withCredentials: true,
    paramsSerializer: { serialize: serializeParams },
  });
}

const coreAxios = createApiInstance(CORE_API_BASE);
const servicesAxios = createApiInstance(SERVICES_API_BASE);
const adminAxios = createApiInstance(ADMIN_API_BASE);
const refreshAxios = createApiInstance(CORE_API_BASE);
refreshAxios.defaults.timeout = 15_000;

export const AUTH_APPLICATION = "boss" as const;

let refreshRequest: Promise<AuthTokens> | undefined;
let csrfRequest: Promise<string> | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let sessionController = new AbortController();
let authPaused = false;

function redirectToLogin(): void {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (window.location.pathname.startsWith("/login")) return;
  window.location.assign(`/login?redirect=${encodeURIComponent(current)}`);
}

function expireAuthSession(): void {
  clearAuthSession();
  redirectToLogin();
}

function payloadRecord(value: unknown): ApiErrorPayload | undefined {
  return value && typeof value === "object" ? (value as ApiErrorPayload) : undefined;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) {
    return new ApiError(error instanceof Error ? error.message : "请求失败", { cause: error });
  }

  const responsePayload = payloadRecord(error.response?.data);
  const payload = payloadRecord(responsePayload?.error) ?? responsePayload;
  const message =
    (typeof payload?.message === "string" && payload.message) ||
    (typeof payload?.detail === "string" && payload.detail) ||
    error.message ||
    (error.response ? `HTTP ${error.response.status}` : "网络请求失败");
  const metadata = payloadRecord(payload?.metadata);
  const responseHeaders = error.response?.headers;
  const headerRequestId =
    responseHeaders instanceof AxiosHeaders
      ? responseHeaders.get("X-Request-ID")
      : Object.entries(responseHeaders ?? {}).find(
          ([name]) => name.toLowerCase() === "x-request-id",
        )?.[1];
  const requestId =
    (typeof payload?.request_id === "string" && payload.request_id) ||
    (typeof metadata?.request_id === "string" && metadata.request_id) ||
    (typeof headerRequestId === "string" && headerRequestId) ||
    undefined;
  const details =
    payload?.details && typeof payload.details === "object"
      ? (payload.details as Record<string, unknown>)
      : undefined;

  return new ApiError(message, {
    status: error.response?.status,
    code:
      typeof payload?.code === "string" || typeof payload?.code === "number"
        ? payload.code
        : error.code,
    reason: typeof payload?.reason === "string" ? payload.reason : undefined,
    requestId,
    details,
    config: error.config,
    response: error.response,
    cause: error,
  });
}

function assertActiveSession(signal: AbortSignal): void {
  if (signal.aborted) throw new axios.CanceledError("登录会话已变更");
}

function getCsrfToken(signal: AbortSignal): Promise<string> {
  assertActiveSession(signal);
  if (csrfRequest) return csrfRequest;
  const promise = refreshAxios
    .post<{ csrf_token: string }>("/auth/csrf", { application: AUTH_APPLICATION }, { signal })
    .then(({ data }) => {
      assertActiveSession(signal);
      if (typeof data?.csrf_token !== "string" || !data.csrf_token.trim()) {
        throw new Error("认证响应缺少 csrf_token");
      }
      return data.csrf_token;
    })
    .catch((error: unknown) => {
      if (csrfRequest === promise) csrfRequest = undefined;
      throw error;
    });
  csrfRequest = promise;
  return promise;
}

async function requestTokenRefresh(signal: AbortSignal): Promise<AuthTokens> {
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const csrfToken = await getCsrfToken(signal);
      assertActiveSession(signal);
      if (authPaused) throw new axios.CanceledError("认证会话续期已暂停");
      try {
        const response = await refreshAxios.post<AuthTokenResponse>(
          "/auth/refresh",
          { application: AUTH_APPLICATION },
          { headers: { "X-CSRF-Token": csrfToken }, signal },
        );
        return normalizeAuthTokens(response.data);
      } catch (error) {
        assertActiveSession(signal);
        if (attempt === 0 && axios.isAxiosError(error) && error.response?.status === 403) {
          csrfRequest = undefined;
          continue;
        }
        throw error;
      }
    }
    throw new Error("令牌刷新失败");
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error);
  }
}

function refreshAccessToken(signal = sessionController.signal): Promise<AuthTokens> {
  if (authPaused) return Promise.reject(new axios.CanceledError("认证会话续期已暂停"));
  assertActiveSession(signal);
  if (refreshRequest) return refreshRequest;
  const promise = requestTokenRefresh(signal)
    .then((refreshed) => {
      assertActiveSession(signal);
      if (authPaused) throw new axios.CanceledError("认证会话续期已暂停");
      updateAccessToken(refreshed);
      return refreshed;
    })
    .catch((error: unknown) => {
      assertActiveSession(signal);
      if (
        !authPaused &&
        getAuthState().tokens &&
        !axios.isCancel(error) &&
        [401, 403].includes(toApiError(error).status ?? 0)
      ) {
        expireAuthSession();
      }
      throw error;
    })
    .finally(() => {
      if (refreshRequest === promise) refreshRequest = undefined;
    });
  refreshRequest = promise;
  return promise;
}

function installAuthInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const requestConfig = config as AniRequestConfig;
    if (requestConfig.aniAuth === "public") return config;
    if (requestConfig.aniSessionSignal) assertActiveSession(requestConfig.aniSessionSignal);
    requestConfig.aniSessionSignal ??= sessionController.signal;
    const token = getAuthState().tokens?.access_token;
    if (token) config.headers.set("Authorization", `Bearer ${token}`);
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (axios.isCancel(error)) throw error;
      if (!axios.isAxiosError(error)) throw toApiError(error);
      const config = error.config as AniRequestConfig | undefined;
      if (error.response?.status !== 401 || !config || config.aniAuth === "public") {
        throw toApiError(error);
      }
      if (authPaused) throw new axios.CanceledError("认证会话续期已暂停");
      const signal = config.aniSessionSignal ?? sessionController.signal;
      assertActiveSession(signal);
      const tokens = getAuthState().tokens;
      if (!tokens || config.aniRetried) {
        expireAuthSession();
        throw toApiError(error);
      }

      config.aniRetried = true;
      // 同批请求的迟到 401 直接使用已经刷新的令牌，避免再次轮换 Cookie。
      if (config.headers.get("Authorization") === `Bearer ${tokens.access_token}`) {
        await refreshAccessToken(signal);
      }
      assertActiveSession(signal);
      // 重试请求自身的业务/网络错误不能被当成刷新失败而清空登录态。
      return instance.request(config);
    },
  );
}

function scheduleAuthRefresh(retryDelay?: number): void {
  if (typeof window === "undefined") return;
  clearTimeout(refreshTimer);
  const signal = sessionController.signal;
  const state = getAuthState();
  if (!state.tokens || authPaused) return;
  const lifetime = state.tokens.expires_in;
  if (!lifetime || !Number.isFinite(lifetime) || lifetime <= 0) return;
  const delay = retryDelay ?? Math.max(1000, lifetime * 1000 - Math.min(60_000, lifetime * 100));
  refreshTimer = setTimeout(
    () => {
      void refreshAccessToken(signal).catch(() => {
        // 短暂断网/5xx 保留会话，延后重试，避免过期定时器形成忙循环。
        if (!authPaused && !signal.aborted && getAuthState().tokens) {
          scheduleAuthRefresh(30_000);
        }
      });
    },
    Math.min(delay, 2_147_483_647),
  );
}

export async function initializeCsrfToken(): Promise<string> {
  try {
    return await getCsrfToken(sessionController.signal);
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error);
  }
}

// 先停止新刷新，再等待已发出的 Cookie 轮换完成，随后登录/登出使用最新 Cookie。
export async function pauseSessionRefresh(): Promise<void> {
  authPaused = true;
  clearTimeout(refreshTimer);
  await refreshRequest?.catch(() => undefined);
  await csrfRequest?.catch(() => undefined);
  sessionController.abort();
  sessionController = new AbortController();
  refreshRequest = undefined;
  csrfRequest = undefined;
}

export function resumeSessionRefresh(): void {
  authPaused = false;
  scheduleAuthRefresh();
}

installAuthInterceptors(coreAxios);
installAuthInterceptors(servicesAxios);
installAuthInterceptors(adminAxios);

async function request<TResponse, TBody>(
  instance: AxiosInstance,
  url: string,
  options: ApiRequestOptions<TBody>,
): Promise<TResponse> {
  const { auth = "required", ...axiosOptions } = options;
  try {
    const response = await instance.request<TResponse, AxiosResponse<TResponse>, TBody>({
      ...axiosOptions,
      url,
      aniAuth: auth,
    } as AxiosRequestConfig<TBody> & { aniAuth: ApiAuthMode });
    if (response.status === 204 || response.data === "") return undefined as TResponse;
    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error);
  }
}

export function coreRequest<TResponse, TBody = never>(
  url: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  return request<TResponse, TBody>(coreAxios, url, options);
}

export function servicesRequest<TResponse, TBody = never>(
  url: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  return request<TResponse, TBody>(servicesAxios, url, options);
}

export const externalAxios = axios.create();

export function adminRequest<TResponse, TBody = never>(
  url: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  return request<TResponse, TBody>(adminAxios, url, options);
}

const unsubscribeAuthRefresh = authStore.subscribe((state, previous) => {
  if (state.tokens === previous.tokens) return;
  if (state.tokens) authPaused = false;
  else {
    sessionController.abort();
    sessionController = new AbortController();
    csrfRequest = undefined;
    refreshRequest = undefined;
  }
  scheduleAuthRefresh();
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeAuthRefresh();
    clearTimeout(refreshTimer);
    sessionController.abort();
  });
}

// 同步恢复登录态后，按 Console 相同的 expires_in 规则安排续期。
scheduleAuthRefresh();
if (getAuthState().tokens) {
  const signal = sessionController.signal;
  void initializeCsrfToken().catch((error: unknown) => {
    if (!signal.aborted && !authPaused && [401, 403].includes(toApiError(error).status ?? 0))
      expireAuthSession();
    // 网络故障保留持久化登录态，下次刷新时重新获取证明。
  });
}
