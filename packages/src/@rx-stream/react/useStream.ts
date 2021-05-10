import { useCallback, useRef, useState } from 'react';
import { Observable, Subject, Subscription } from 'rxjs';
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
): StreamReturn<Params, Value> {
  const [result, setResult] = useState<StreamResult<Value>>(() => ready);

  const subscriptionRef = useRef<Subscription | undefined>(undefined);
  const subscriberRef = useRef<Subject<Value> | undefined>(undefined);

  const fetch = useCallback(
    (params: Params) => {
      const subscriber = new Subject<Value>();

      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      if (subscriberRef.current) {
        subscriberRef.current.unsubscribe();
      }

      let latestValue: Value;

      const subscription = fn(params).subscribe({
        next: (value) => {
          subscriber.next(value);

          latestValue = value;

          setResult({
            status: StreamStatus.IN_PROGRESS,
            value,
          });
        },
        error: (error) => {
          subscriber.error(error);

          if (error instanceof AbortStream) {
            setResult({
              status: StreamStatus.READY,
            });
          } else {
            setResult({
              status: StreamStatus.ERROR,
              error,
              clear: () => setResult(ready),
            });
          }

          subscriptionRef.current = undefined;
          subscriberRef.current = undefined;
          subscriber.unsubscribe();
          subscription.unsubscribe();
        },
        complete: () => {
          subscriber.complete();

          setResult({
            status: StreamStatus.DONE,
            value: latestValue,
            clear: () => setResult(ready),
          });

          subscriptionRef.current = undefined;
          subscriberRef.current = undefined;
          subscriber.unsubscribe();
          subscription.unsubscribe();
        },
      });

      subscriberRef.current = subscriber;
      subscriptionRef.current = subscription;

      return subscriber.asObservable();
    },
    [fn],
  );

  return [fetch, result];
}
