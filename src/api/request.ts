import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import {
  authStore,
  clearAuthSession,
  getAuthState,
  getAuthSessionRevision,
  updateAccessToken,
} from "@/stores/auth";

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
  aniSessionRevision?: number;
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
  readonly code?: string;
  readonly requestId?: string;
  readonly request_id?: string;
  readonly details?: Record<string, unknown>;
  readonly config?: AxiosRequestConfig;
  readonly response?: AxiosResponse<unknown>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
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

let refreshRequest: { revision: number; promise: Promise<AuthTokens> } | undefined;
let csrfRequest: { revision: number; promise: Promise<string> } | undefined;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let sessionController = new AbortController();
let activeRevision = getAuthSessionRevision();
let authPaused = false;
let authStartup: Promise<void> | undefined;

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
  const requestId =
    (typeof payload?.request_id === "string" && payload.request_id) ||
    (typeof metadata?.request_id === "string" && metadata.request_id) ||
    undefined;
  const details =
    payload?.details && typeof payload.details === "object"
      ? (payload.details as Record<string, unknown>)
      : undefined;

  return new ApiError(message, {
    status: error.response?.status,
    code:
      typeof payload?.code === "string"
        ? payload.code
        : typeof payload?.reason === "string"
          ? payload.reason
          : error.code,
    requestId,
    details,
    config: error.config,
    response: error.response,
    cause: error,
  });
}

function assertSessionRevision(revision: number): void {
  if (getAuthSessionRevision() !== revision) {
    throw new axios.CanceledError("登录会话已变更");
  }
}

function getCsrfToken(revision: number): Promise<string> {
  assertSessionRevision(revision);
  if (csrfRequest?.revision === revision) return csrfRequest.promise;
  const promise = refreshAxios
    .post<{ csrf_token: string }>(
      "/auth/csrf",
      { application: AUTH_APPLICATION },
      { signal: sessionController.signal },
    )
    .then(({ data }) => {
      assertSessionRevision(revision);
      if (typeof data?.csrf_token !== "string" || !data.csrf_token.trim()) {
        throw new Error("认证响应缺少 csrf_token");
      }
      return data.csrf_token;
    })
    .catch((error: unknown) => {
      if (csrfRequest?.promise === promise) csrfRequest = undefined;
      throw error;
    });
  csrfRequest = { revision, promise };
  return promise;
}

async function requestTokenRefresh(revision: number): Promise<AuthTokens> {
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const csrfToken = await getCsrfToken(revision);
      assertSessionRevision(revision);
      if (authPaused) throw new axios.CanceledError("认证会话续期已暂停");
      try {
        const response = await refreshAxios.post<AuthTokenResponse>(
          "/auth/refresh",
          { application: AUTH_APPLICATION },
          { headers: { "X-CSRF-Token": csrfToken }, signal: sessionController.signal },
        );
        return normalizeAuthTokens(response.data);
      } catch (error) {
        assertSessionRevision(revision);
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

function refreshAccessToken(revision: number): Promise<AuthTokens> {
  if (authPaused) return Promise.reject(new axios.CanceledError("认证会话续期已暂停"));
  if (refreshRequest?.revision === revision) return refreshRequest.promise;
  const promise = requestTokenRefresh(revision)
    .then((refreshed) => {
      assertSessionRevision(revision);
      if (authPaused) throw new axios.CanceledError("认证会话续期已暂停");
      updateAccessToken(refreshed);
      return refreshed;
    })
    .catch((error: unknown) => {
      assertSessionRevision(revision);
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
      if (refreshRequest?.promise === promise) refreshRequest = undefined;
    });
  refreshRequest = { revision, promise };
  return promise;
}

function installAuthInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config) => {
    const requestConfig = config as AniRequestConfig;
    if (requestConfig.aniAuth === "public") return config;
    const revision = getAuthSessionRevision();
    if (
      requestConfig.aniSessionRevision !== undefined &&
      requestConfig.aniSessionRevision !== revision
    ) {
      throw new axios.CanceledError("登录会话已变更");
    }
    requestConfig.aniSessionRevision = revision;
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
      const revision = getAuthSessionRevision();
      if (config.aniSessionRevision !== revision) throw toApiError(error);
      const tokens = getAuthState().tokens;
      if (!tokens || config.aniRetried) {
        expireAuthSession();
        throw toApiError(error);
      }

      config.aniRetried = true;
      // 同批请求的迟到 401 直接使用已经刷新的令牌，避免再次轮换 Cookie。
      if (config.headers.get("Authorization") === `Bearer ${tokens.access_token}`) {
        await refreshAccessToken(revision);
      }
      if (getAuthSessionRevision() !== revision) {
        throw new axios.CanceledError("登录会话已变更");
      }
      // 重试请求自身的业务/网络错误不能被当成刷新失败而清空登录态。
      return instance.request(config);
    },
  );
}

function scheduleAuthRefresh(retryDelay?: number): void {
  if (typeof window === "undefined") return;
  clearTimeout(refreshTimer);
  const revision = getAuthSessionRevision();
  if (revision !== activeRevision) {
    sessionController.abort();
    sessionController = new AbortController();
    activeRevision = revision;
    csrfRequest = undefined;
  }
  const state = getAuthState();
  if (!state.tokens || authPaused) return;
  if (state.accessTokenExpiresAt === null) return;

  const lifetime = (state.tokens.expires_in ?? 0) * 1000;
  const margin = Math.min(60_000, Math.max(0, lifetime * 0.1));
  const delay = retryDelay ?? Math.max(0, state.accessTokenExpiresAt - Date.now() - margin);
  refreshTimer = setTimeout(
    () => {
      void refreshAccessToken(revision).catch(() => {
        // 短暂断网/5xx 保留会话，延后重试，避免过期定时器形成忙循环。
        if (!authPaused && getAuthSessionRevision() === revision && getAuthState().tokens) {
          scheduleAuthRefresh(30_000);
        }
      });
    },
    Math.min(delay, 2_147_483_647),
  );
}

export async function initializeCsrfToken(): Promise<string> {
  try {
    return await getCsrfToken(getAuthSessionRevision());
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw toApiError(error);
  }
}

// 先停止新刷新，再等待已发出的 Cookie 轮换完成，随后登录/登出使用最新 Cookie。
export async function pauseSessionRefresh(): Promise<void> {
  authPaused = true;
  clearTimeout(refreshTimer);
  await refreshRequest?.promise.catch(() => undefined);
  await csrfRequest?.promise.catch(() => undefined);
  csrfRequest = undefined;
}

export function resumeSessionRefresh(): void {
  authPaused = false;
  scheduleAuthRefresh();
}

export function startAuthSession(): Promise<void> {
  authStartup ??= refreshAccessToken(getAuthSessionRevision())
    .then(() => undefined)
    .catch(() => clearAuthSession());
  return authStartup;
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
  scheduleAuthRefresh();
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeAuthRefresh();
    clearTimeout(refreshTimer);
    sessionController.abort();
  });
}
