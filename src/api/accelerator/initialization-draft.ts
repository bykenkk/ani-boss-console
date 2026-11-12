import { createIdempotencyScope } from "@/lib/idempotency";
import type { CreateInitializationInput, InitializationOperation } from "./types-group-policy";

interface InitializationDraft {
  input: CreateInitializationInput;
  request: CreateInitializationInput & { idempotency_key: string };
  operation_id?: string;
}
const memory = new Map<string, InitializationDraft>();
const scope = createIdempotencyScope("gpu-initialization", ["POST"]);
function storageKey(principal: string, connection: string) {
  if (!principal) throw new Error("未取得平台主体，无法保存初始化意图");
  return `gpu-initialization:${encodeURIComponent(principal)}:${encodeURIComponent(connection)}`;
}
function load(key: string): InitializationDraft | undefined {
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as InitializationDraft;
    if (!parsed.input?.connection_ref || !parsed.request?.idempotency_key) return undefined;
    const { idempotency_key: _key, ...body } = parsed.request;
    if (JSON.stringify(parsed.input) !== JSON.stringify(body)) return undefined;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return undefined;
  }
}
function save(key: string, draft: InitializationDraft) {
  // Persist before sending: a reload after a lost response must reuse exact bytes and key.
  localStorage.setItem(key, JSON.stringify(draft));
  memory.set(key, draft);
}
export function readInitializationDraft(principal: string, connection: string) {
  const draft = load(storageKey(principal, connection));
  return draft?.input.connection_ref === connection
    ? {
        input: JSON.parse(JSON.stringify(draft.input)) as CreateInitializationInput,
        operation_id: draft.operation_id,
      }
    : undefined;
}
export function initializationRequest(principal: string, input: CreateInitializationInput) {
  const key = storageKey(principal, input.connection_ref);
  const previous = load(key);
  if (previous) {
    if (JSON.stringify(previous.input) !== JSON.stringify(input))
      throw new Error("已有初始化意图。请先恢复原提交，或明确开始新意图");
    return previous.request;
  }
  const snapshot: CreateInitializationInput = JSON.parse(JSON.stringify(input));
  const request = scope.withKey({ ...snapshot }, [principal, input.connection_ref]);
  save(key, { input: snapshot, request });
  return request;
}
export function rememberInitializationOperation(
  principal: string,
  connection: string,
  operation: InitializationOperation,
) {
  const key = storageKey(principal, connection);
  const draft = load(key);
  if (draft) {
    const updated = { ...draft, operation_id: operation.operation_id };
    try {
      save(key, updated);
    } catch {
      // The accepted response is already known. Keep it in this session; the
      // persisted original request can still recover it after a reload.
      memory.set(key, updated);
    }
  }
}
export function beginNewInitializationIntent(principal: string, connection: string) {
  const key = storageKey(principal, connection);
  localStorage.removeItem(key);
  memory.delete(key);
  scope.reset([principal, connection]);
}
