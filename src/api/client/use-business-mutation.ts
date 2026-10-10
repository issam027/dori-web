import { useMemo, useRef } from 'react';
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { i18n } from '@/core/i18n/i18n';
import { NormalizedApiError } from '@/core/errors/normalized-api-error';
import { presentError, type ErrorPresentation } from '@/core/notifications/error-presentation';
import { notify } from '@/core/notifications/notification-store';

type MutationNotice = {
  titleKey: string;
  messageKey?: string;
};

type BusinessMutationOptions<TData, TVariables, TContext = unknown> = Omit<
  UseMutationOptions<TData, Error, TVariables, TContext>,
  'mutationFn' | 'meta'
> & {
  mutationFn: (variables: TVariables) => Promise<TData>;
  expectedErrorStatuses?: readonly number[];
  invalidate?: (data: TData, variables: TVariables) => unknown;
  invalidateOnConflict?: (error: NormalizedApiError, variables: TVariables) => unknown;
  successNotice?: MutationNotice | ((data: TData, variables: TVariables) => MutationNotice | undefined);
};

export type BusinessMutationResult<TData, TVariables, TContext = unknown> = UseMutationResult<
  TData,
  Error,
  TVariables,
  TContext
> & {
  execute: (variables: TVariables) => Promise<TData>;
  run: (variables: TVariables) => void;
  errorPresentation?: ErrorPresentation;
};

export function useBusinessMutation<TData, TVariables, TContext = unknown>(
  options: BusinessMutationOptions<TData, TVariables, TContext>,
): BusinessMutationResult<TData, TVariables, TContext> {
  const execution = useRef<Promise<TData> | null>(null);
  const {
    expectedErrorStatuses = [],
    invalidate,
    invalidateOnConflict,
    successNotice,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;
  const mutation = useMutation<TData, Error, TVariables, TContext>({
    ...mutationOptions,
    mutationFn: options.mutationFn,
    meta: { expectedErrorStatuses },
    onSuccess: async (data, variables, context, mutationContext) => {
      await invalidate?.(data, variables);
      const notice =
        typeof successNotice === 'function' ? successNotice(data, variables) : successNotice;
      if (notice) {
        notify({
          tone: 'success',
          title: i18n.t(notice.titleKey),
          message: notice.messageKey ? i18n.t(notice.messageKey) : undefined,
        });
      }
      await onSuccess?.(data, variables, context, mutationContext);
    },
    onError: async (error, variables, context, mutationContext) => {
      if (error instanceof NormalizedApiError && error.status === 409) {
        await invalidateOnConflict?.(error, variables);
      }
      await onError?.(error, variables, context, mutationContext);
    },
  });
  const execute = (variables: TVariables): Promise<TData> => {
    if (execution.current) return execution.current;
    const pending = mutation.mutateAsync(variables).finally(() => {
      if (execution.current === pending) execution.current = null;
    });
    execution.current = pending;
    return pending;
  };
  const errorPresentation = useMemo(
    () => (mutation.error ? presentError(mutation.error) : undefined),
    [mutation.error],
  );
  const run = (variables: TVariables): void => {
    void execute(variables).catch(() => undefined);
  };

  return { ...mutation, execute, run, errorPresentation };
}
