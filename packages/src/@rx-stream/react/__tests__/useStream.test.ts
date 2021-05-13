import { pipe } from '@rx-stream/pipe';
import { StreamResult, StreamStatus, useStream } from '@rx-stream/react';
import { AbortStream } from '@rx-stream/react/errors';
import { act, renderHook } from '@testing-library/react-hooks';
import { lastValueFrom, Observable, of, Subscription, timer } from 'rxjs';
import { map } from 'rxjs/operators';

describe('useStream', () => {
  test('simple test', async () => {
    const fn = pipe(
      (n: number) => of(n.toString()),
      (s: string) => Promise.resolve(parseInt(s)),
      (n: number) => n.toString(),
    );

    const { result, waitForNextUpdate } = renderHook(() => useStream(fn));

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](10);
    });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    await waitForNextUpdate();

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.DONE,
      value: '10',
    });

    act(() => {
      if (result.current[1].status === StreamStatus.DONE) {
        result.current[1].clear();
      }
    });

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](20);
    });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    act(() => {
      result.current[0](30);
    });

    await waitForNextUpdate();

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.DONE,
      value: '30',
    });
  });

  test('error case', async () => {
    const fn = pipe(
      (n: number) => of(n.toString()),
      (s: string) =>
        new Promise<number>((_resolve, reject) => {
          return setTimeout(() => {
            reject('TEST ERROR!');
          }, 100);
        }),
      (n: number) => n.toString(),
    );

    const { result, waitForNextUpdate } = renderHook(() => useStream(fn));

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](10);
    });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    await waitForNextUpdate();

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.ERROR,
      error: 'TEST ERROR!',
    });

    act(() => {
      if (result.current[1].status === StreamStatus.ERROR) {
        result.current[1].clear();
      }
    });

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });
  });

  test('abort test', async () => {
    const fn = pipe(
      (n: number) => of(n.toString()),
      (s: string) =>
        new Promise<number>((_resolve, reject) => {
          return setTimeout(() => {
            reject(new AbortStream());
          }, 100);
        }),
      (n: number) => n.toString(),
    );

    const { result, waitForNextUpdate } = renderHook(() => useStream(fn));

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](10);
    });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    await waitForNextUpdate();

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.READY,
    });
  });

  test('transfer on unmount', async () => {
    const fn = pipe(
      (n: number) => timer(500).pipe(map(() => n.toString())),
      (s: string) =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(parseInt(s)), 500),
        ),
      (n: number) => n.toString(),
    );

    let transferedStream: Observable<
      StreamResult<number | string>
    > | null = null;

    const { result, waitForNextUpdate, unmount, waitFor } = renderHook(() =>
      useStream(fn, (stream) => (transferedStream = stream)),
    );

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](10);
    });

    await waitForNextUpdate({ timeout: 1000 });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    unmount();

    await waitFor(() => !!transferedStream, { timeout: 1000 });

    await expect(lastValueFrom(transferedStream!)).resolves.toMatchObject({
      status: StreamStatus.DONE,
      value: '10',
    });
  });

  test('do not call fetch after unmount', async () => {
    const fn = pipe(
      (n: number) => timer(500).pipe(map(() => n.toString())),
      (s: string) =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(parseInt(s)), 500),
        ),
      (n: number) => n.toString(),
    );

    const { result, unmount } = renderHook(() => useStream(fn));

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    unmount();

    expect(() =>
      act(() => {
        result.current[0](10);
      }),
    ).toThrowError();
  });

  test('stop stream on unmount', async () => {
    const fn = pipe(
      (n: number) => timer(500).pipe(map(() => n.toString())),
      (s: string) =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(parseInt(s)), 500),
        ),
      (n: number) => n.toString(),
    );

    const { result, waitForNextUpdate, unmount } = renderHook(() =>
      useStream(fn),
    );

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    let subscription: Subscription | null = null;

    act(() => {
      subscription = result.current[0](10).subscribe();
    });

    await waitForNextUpdate({ timeout: 1000 });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    unmount();

    await new Promise((resolve) =>
      setTimeout(() => {
        expect(subscription!.closed).toBeTruthy();
        resolve(null);
      }, 1000),
    );
  });

  test('back to ready when abort', async () => {
    const fn = pipe(
      (n: number) => timer(500).pipe(map(() => n.toString())),
      (s: string) =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(parseInt(s)), 500),
        ),
      (n: number) => n.toString(),
    );

    const { result, waitForNextUpdate } = renderHook(() => useStream(fn));

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    let subscription: Subscription | null = null;

    act(() => {
      subscription = result.current[0](10).subscribe();
    });

    await waitForNextUpdate({ timeout: 1000 });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    act(() => {
      if (result.current[1].status === StreamStatus.IN_PROGRESS) {
        result.current[1].abort();
      }
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });
        expect(subscription!.closed).toBeTruthy();

        resolve();
      }, 1000);
    });
  });

  test('abort + transfer on unmount', async () => {
    const fn = pipe(
      (n: number) => timer(500).pipe(map(() => n.toString())),
      (s: string) =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(parseInt(s)), 500),
        ),
      (n: number) => n.toString(),
    );

    let transferedStream: Observable<
      StreamResult<number | string>
    > | null = null;

    const { result, waitForNextUpdate, unmount, waitFor } = renderHook(() =>
      useStream(fn, (stream) => (transferedStream = stream)),
    );

    expect(result.current[1]).toMatchObject({ status: StreamStatus.READY });

    act(() => {
      result.current[0](10);
    });

    await waitForNextUpdate({ timeout: 1000 });

    expect(result.current[1]).toMatchObject({
      status: StreamStatus.IN_PROGRESS,
    });

    unmount();

    await waitFor(() => !!transferedStream, { timeout: 1000 });

    const records: any[] = [];

    let completed = false;

    const subscription = transferedStream!.subscribe({
      next: (value) => {
        records.push(value);

        if (value.status === StreamStatus.IN_PROGRESS) {
          value.abort();
        }
      },
      complete: () => {
        completed = true;
      },
    });

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(records[0]).toMatchObject({ status: StreamStatus.IN_PROGRESS });
        expect(records[1]).toMatchObject({ status: StreamStatus.READY });
        expect(subscription.closed).toBeTruthy();
        expect(completed).toBeTruthy();
        resolve();
      }, 1000);
    });
  });
});
