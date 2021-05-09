import { Observable, of } from 'rxjs';
import { rxpipe } from 'rxpipe';

class StreamRecorder {
  readonly records: unknown[] = [];

  record = (x: unknown) => {
    this.records.push(x);
  };
}

describe('rxpipe', () => {
  test('simple test', (done) => {
    // Arrange
    const fn = rxpipe(
      (n: number) => of(n.toString()),
      (s: string) => Promise.resolve(parseInt(s)),
      (n: number) => n.toString(),
    );

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      complete: () => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify(['10', 10, '10']),
        );
        done();
      },
    });
  });

  test('wrap the pipe', (done) => {
    // Arrange
    const fn = (n: number) => {
      return rxpipe(
        (n1: number) => of(n1.toString()),
        (s: string) => Promise.resolve(parseInt(s) + n),
        (n3: number) => (n3 + n).toString(),
      )(n);
    };

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      complete: () => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify(['10', 20, '30']),
        );
        done();
      },
    });
  });

  test('wrap the pipe with side effect', (done) => {
    // Arrange
    const fn = (n: number) => {
      let x: number;

      return rxpipe(
        (n1: number) => {
          x = n1 * 2;
          return of(n1.toString());
        },
        (s: string) => Promise.resolve(parseInt(s) + n),
        (n3: number) => {
          return (n3 + x).toString();
        },
      )(n);
    };

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      complete: () => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify(['10', 20, '40']),
        );
        done();
      },
    });
  });

  test('async test', (done) => {
    // Arrange
    const fn = rxpipe(
      (n: number) =>
        new Observable<number | string>((subscriber) => {
          let i: number = 0;

          function run() {
            setTimeout(() => {
              if (i % 2 === 0) {
                subscriber.next(n * i);
              } else {
                subscriber.next((n * i).toString());
              }

              i += 1;

              if (i > 5) {
                subscriber.complete();
              } else {
                run();
              }
            }, 100);
          }

          run();
        }),
      (s: number | string) =>
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(s + '?'), 1000),
        ),
    );

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      complete: () => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify([0, '10', 20, '30', 40, '50', '50?']),
        );
        done();
      },
    });
  });

  test('error test', (done) => {
    // Arrange
    const fn = rxpipe(
      (n: number) =>
        new Observable<number | string>((subscriber) => {
          let i: number = 0;

          function run() {
            setTimeout(() => {
              if (i % 2 === 0) {
                subscriber.next(n * i);
              } else {
                subscriber.next((n * i).toString());
              }

              i += 1;

              if (i > 5) {
                subscriber.error(new Error('error!'));
              } else {
                run();
              }
            }, 100);
          }

          run();
        }),
      (s: number | string) =>
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(s + '?'), 1000),
        ),
    );

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      error: (error) => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify([0, '10', 20, '30', 40, '50']),
        );
        expect(error.message).toBe('error!');
        done();
      },
      complete: () => {
        throw new Error('never come here!');
      },
    });
  });

  test('error test with throw', (done) => {
    // Arrange
    const fn = rxpipe(
      (n: number) =>
        new Observable<number | string>((subscriber) => {
          let i: number = 0;

          function run() {
            if (i % 2 === 0) {
              subscriber.next(n * i);
            } else {
              subscriber.next((n * i).toString());
            }

            i += 1;

            if (i > 5) {
              throw new Error('error!');
            } else {
              run();
            }
          }

          run();
        }),
      (s: number | string) =>
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(s + '?'), 1000),
        ),
    );

    const recorder = new StreamRecorder();

    // Act
    fn(10).subscribe({
      next: recorder.record,
      error: (error) => {
        // Assert
        expect(JSON.stringify(recorder.records)).toBe(
          JSON.stringify([0, '10', 20, '30', 40, '50']),
        );
        expect(error.message).toBe('error!');
        done();
      },
      complete: () => {
        throw new Error('never come here!');
      },
    });
  });
});