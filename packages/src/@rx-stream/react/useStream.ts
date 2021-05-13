import { useCallback, useEffect, useRef, useState } from 'react';
import { BehaviorSubject, Observable, Subject, Subscription } from 'rxjs';
import { AbortStream } from './errors';

export enum StreamStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  ERROR = 'ERROR',
  READY = 'READY',
}

export interface StreamReady {
  status: StreamStatus.READY;
}

export interface StreamInProgress<Value> {
  status: StreamStatus.IN_PROGRESS;
  value: Value;
  abort: () => void;
}

export interface StreamDone<Value> {
  status: StreamStatus.DONE;
  value: Value;
  clear: () => void;
}

export interface StreamError {
  status: StreamStatus.ERROR;
  error: unknown;
  clear: () => void;
}

export type StreamResult<Result> =
  | StreamReady
  | StreamInProgress<Result>
  | StreamDone<Result>
  | StreamError;

export type StreamReturn<Params, Result> = [
  (params: Params) => Observable<Result>,
  StreamResult<Result>,
];

const ready: StreamReady = {
  status: StreamStatus.READY,
};

export function useStream<Params, Value>(
  fn: (params: Params) => Observable<Value>,
  transferOnUnmount?: (stream: Observable<StreamResult<Value>>) => void,
): StreamReturn<Params, Value> {
  const [result, setResult] = useState<StreamResult<Value>>(() => ready);

  const subscriptionRef = useRef<Subscription | undefined>(undefined);
  const subscriberRef = useRef<Subject<Value> | undefined>(undefined);

  const unmountedRef = useRef<boolean>(false);
  const transferOnUnmountRef = useRef(transferOnUnmount);
  const unmountCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    transferOnUnmountRef.current = transferOnUnmount;
  }, [transferOnUnmount]);

  const fetch = useCallback(
    (params: Params) => {
      if (unmountedRef.current) {
        throw new Error(`Do not call this after unmounted!`);
      }

      const subscriber = new Subject<Value>();

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      if (subscriberRef.current) {
        subscriberRef.current.unsubscribe();
      }

      let latestValue: Value;
      let transferedStream: BehaviorSubject<StreamResult<Value>> | null;

      function updateResult(nextValue: StreamResult<Value>) {
        if (unmountedRef.current && transferedStream) {
          transferedStream.next(nextValue);
        } else {
          setResult(nextValue);
        }
      }

      const subscription = fn(params).subscribe({
        next: (value) => {
          subscriber.next(value);

          latestValue = value;

          updateResult({
            status: StreamStatus.IN_PROGRESS,
            value,
            abort: () => {
              updateResult(ready);

              subscriber.complete();
              subscriber.unsubscribe();

              subscription.unsubscribe();
            },
          });
        },
        error: (error) => {
          subscriber.error(error);

          if (error instanceof AbortStream) {
            updateResult({
              status: StreamStatus.READY,
            });
          } else {
            updateResult({
              status: StreamStatus.ERROR,
              error,
              clear: () => updateResult(ready),
            });
          }

          transferedStream?.error(error);
          transferedStream?.unsubscribe();
          transferedStream = null;
          unmountCallbackRef.current = null;

          subscriptionRef.current = undefined;
          subscriberRef.current = undefined;
          subscriber.unsubscribe();
          subscription.unsubscribe();
        },
        complete: () => {
          subscriber.complete();

          updateResult({
            status: StreamStatus.DONE,
            value: latestValue,
            clear: () => updateResult(ready),
          });

          transferedStream?.complete();
          transferedStream?.unsubscribe();
          transferedStream = null;
          unmountCallbackRef.current = null;

          subscriptionRef.current = undefined;
          subscriberRef.current = undefined;
          subscriber.unsubscribe();
          subscription.unsubscribe();
        },
      });

      subscriberRef.current = subscriber;
      subscriptionRef.current = subscription;

      unmountCallbackRef.current = () => {
        if (transferOnUnmountRef.current) {
          transferedStream = new BehaviorSubject<StreamResult<Value>>({
            status: StreamStatus.IN_PROGRESS,
            value: latestValue,
            abort: () => {
              updateResult(ready);

              subscriber.complete();
              subscriber.unsubscribe();

              subscription.unsubscribe();

              transferedStream?.complete();
              transferedStream?.unsubscribe();
              transferedStream = null;
              unmountCallbackRef.current = null;
            },
          });
          transferOnUnmountRef.current(transferedStream);
        } else {
          if (!subscriber.closed) subscriber.complete();
          subscriptionRef.current = undefined;
          subscriberRef.current = undefined;
          subscriber.unsubscribe();
          subscription.unsubscribe();
        }
      };

      return subscriber.asObservable();
    },
    [fn],
  );

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      unmountCallbackRef.current?.();
    };
  }, []);

  return [fetch, result];
}
