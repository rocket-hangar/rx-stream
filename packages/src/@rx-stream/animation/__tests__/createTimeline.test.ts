import { createTimeline } from '@rx-stream/animation';
import { pipe } from '@rx-stream/pipe';
import { map } from 'rxjs/operators';

describe('animation', () => {
  test('basic test', (done) => {
    const timeline = pipe(
      (_: void) =>
        createTimeline(0, 500, false).pipe(map((t) => ({ phase: 'enter', t }))),
      () =>
        createTimeline(0, 500, false).pipe(map((t) => ({ phase: 'exit', t }))),
    );

    const record: { phase: string; t: number }[] = [];

    timeline().subscribe({
      next: ({ phase, t }) => {
        record.push({ phase, t });
      },
      complete: () => {
        expect(record[0]).toMatchObject({ phase: 'enter' });
        expect(record[record.length - 1]).toMatchObject({ phase: 'exit' });
        done();
      },
    });
  });

  test('delay test', (done) => {
    const timeline = pipe(
      (_: void) =>
        createTimeline(1000, 500, false).pipe(
          map((t) => ({ phase: 'enter', t })),
        ),
      () =>
        createTimeline(0, 500, false).pipe(map((t) => ({ phase: 'exit', t }))),
    );

    const record: { phase: string; t: number }[] = [];

    timeline().subscribe({
      next: ({ phase, t }) => {
        record.push({ phase, t });
      },
      complete: () => {
        expect(record[0]).toMatchObject({ phase: 'enter' });
        expect(record[record.length - 1]).toMatchObject({ phase: 'exit' });
        done();
      },
    });

    setTimeout(() => {
      expect(record.length).toBe(0);
    }, 500);
  });

  test('repeat test', (done) => {
    const timeline = pipe(
      (_: void) =>
        createTimeline(0, 500, false).pipe(map((t) => ({ phase: 'enter', t }))),
      () =>
        createTimeline(0, 500, true).pipe(map((t) => ({ phase: 'repeat', t }))),
    );

    const record: { phase: string; t: number }[] = [];

    const subscription = timeline().subscribe({
      next: ({ phase, t }) => {
        record.push({ phase, t });
      },
    });

    setTimeout(() => {
      expect(record[0]).toMatchObject({ phase: 'enter' });
      expect(record[record.length - 1]).toMatchObject({ phase: 'repeat' });
      subscription.unsubscribe();
      done();
    }, 2000);
  });
});
