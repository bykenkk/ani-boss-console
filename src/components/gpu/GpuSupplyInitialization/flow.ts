import type { CreateInitializationInput } from "@/api/accelerator";

interface InitializationFlowDraft {
  input: CreateInitializationInput;
  operation_id?: string;
}
interface InitializationFlowState {
  tab: string;
  providerRef: string;
  operationId: string;
  submittedOperationId: string;
  pending?: CreateInitializationInput;
  rejectedReason?: string;
}
type InitializationFlowAction =
  | { type: "tab"; tab: string }
  | { type: "provider"; providerRef: string; continue?: boolean }
  | { type: "submitting"; input: CreateInitializationInput }
  | { type: "rejected"; reason: string }
  | { type: "accepted"; operationId: string }
  | { type: "view-operation"; operationId: string }
  | { type: "new-intent-confirmed" };

export function restoreInitializationFlow(
  draft?: InitializationFlowDraft,
): InitializationFlowState {
  return {
    tab: draft?.operation_id ? "operation" : draft ? "group" : "supply",
    providerRef: "",
    operationId: draft?.operation_id ?? "",
    submittedOperationId: draft?.operation_id ?? "",
    pending: draft?.operation_id ? undefined : draft?.input,
  };
}

export function initializationFlowReducer(
  state: InitializationFlowState,
  action: InitializationFlowAction,
): InitializationFlowState {
  switch (action.type) {
    case "tab":
      return { ...state, tab: action.tab };
    case "provider":
      // Selecting another registered supply never changes a frozen submission.
      return {
        ...state,
        providerRef: action.providerRef,
        tab: action.continue ? "group" : state.tab,
      };
    case "submitting":
      return { ...state, pending: action.input, rejectedReason: undefined };
    case "rejected":
      return { ...state, rejectedReason: action.reason };
    case "accepted":
      return {
        ...state,
        pending: undefined,
        operationId: action.operationId,
        submittedOperationId: action.operationId,
        tab: "operation",
      };
    case "view-operation":
      // Reading an existing task is independent of the current submission intent.
      return { ...state, operationId: action.operationId, tab: "operation" };
    case "new-intent-confirmed":
      return {
        ...state,
        pending: undefined,
        rejectedReason: undefined,
        submittedOperationId: "",
        tab: "group",
      };
  }
}

export function initializationFlowHasSubmission(state: InitializationFlowState) {
  return Boolean(state.pending || state.submittedOperationId);
}
