import { pipe } from '@rx-stream/pipe';
import { StreamStatus, useStream } from '@rx-stream/react';
import { AbortStream } from '@rx-stream/react/errors';
import { act, renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';

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
});
