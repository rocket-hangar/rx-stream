import { pipe } from '@rx-stream/pipe';
import { lastValueFrom, Observable, of } from 'rxjs';

describe('pipe-typings', () => {
  test('typing test - empty params', () => {
    const o = pipe(
      (_: void) => of({ x: 1 }),
      ({ x }) => Promise.resolve({ y: x + 1 }),
      ({ y }) => ({ z: y + 1 }),
    );

    const s: Observable<{ x: number } | { y: number } | { z: number }> = o();

    s.subscribe((result) => {
      expect(
        'x' in result
          ? result.x === 1
          : 'y' in result
          ? result.y === 2
          : result.z === 3,
      ).toBeTruthy();
    });
  });

  test('typing test - if statement with type or', () => {
    const o = pipe(
      (a: number) => of({ x: a * 2 }),
      ({ x }) => (x > 10 ? of({ y1: x * 100 }) : { y2: 0 }),
      (result) => ('y1' in result ? { z: true } : { z: false }),
    );

    const s: Observable<
      { x: number } | { y1: number } | { y2: number } | { z: boolean }
    > = o(10);

    s.subscribe((result) => {
      expect(
        'x' in result
          ? result.x === 20
          : 'y1' in result
          ? result.y1 === 200
          : 'z' in result
          ? result.z
          : false,
      ).toBeTruthy();
    });

    o(1).subscribe((result) => {
      expect(
        'x' in result
          ? result.x === 2
          : 'y2' in result
          ? result.y2 === 0
          : 'z' in result
          ? result.z === false
          : false,
      ).toBeTruthy();
    });
  });

  test('typing test - complex structure', () => {
    const o = pipe(
      (_: void) =>
        Math.random() > 0.5 ? of(10) : Math.random() ? Promise.resolve(10) : 10,
      (i: number) => (i > 10 ? Promise.resolve(i + 10) : i.toString()),
      (i: number | string) => i.toString(),
    );

    const s: Observable<number | string> = o();

    s.subscribe((result) => {
      expect(result).toBe('10');
    });
  });

  test('typing test - wrap the pipe', async () => {
    function fn1(x: { n: number }) {
      return x.n.toString();
    }

    const o = (param: Parameters<typeof fn1>[0] & { m: number }) => {
      return pipe(
        fn1,
        (s: string) => of(parseInt(s) + param.m),
        (i: number) => i.toString(),
      )(param);
    };

    const s: Observable<string | number> = o({ n: 10, m: 20 });

    await expect(lastValueFrom(s)).resolves.toBe('30');
  });
});
