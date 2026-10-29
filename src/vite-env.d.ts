/// <reference types="vite/client" />

import "@tanstack/react-query";

export type QueryErrorNotificationMeta = {
  id: string;
  action: string;
  fallback?: string;
};

type MutationFeedbackBase = {
  action: string;
  successText?: string;
  successDescription?: string;
  errorFallback?: string;
};

export type MutationFeedbackOptions =
  | (MutationFeedbackBase & {
      channel: "message";
    })
  | (MutationFeedbackBase & {
      channel: "notification";
      id: string;
    });

export type MutationFeedbackMeta =
  | MutationFeedbackOptions
  | ((variables: unknown) => MutationFeedbackOptions);

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      errorNotification?: QueryErrorNotificationMeta;
    };
    mutationMeta: {
      feedback?: MutationFeedbackMeta;
    };
  }
}
