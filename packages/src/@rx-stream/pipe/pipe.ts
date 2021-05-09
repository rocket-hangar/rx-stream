import { isObservable, Observable } from 'rxjs';
import { Operator, ValueOfOperatorResult } from './types';

export function pipe<Params, R1>(
  o1: Operator<Params, R1>,
): (params: Params) => Observable<R1>;

export function pipe<Params, R1, R2>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
): (
  params: Params,
) => Observable<ValueOfOperatorResult<R1> | ValueOfOperatorResult<R2>>;

export function pipe<Params, R1, R2, R3>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
>;

export function pipe<Params, R1, R2, R3, R4>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
  o4: Operator<ValueOfOperatorResult<R3>, R4>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
  | ValueOfOperatorResult<R4>
>;

export function pipe<Params, R1, R2, R3, R4, R5>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
  o4: Operator<ValueOfOperatorResult<R3>, R4>,
  o5: Operator<ValueOfOperatorResult<R4>, R5>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
  | ValueOfOperatorResult<R4>
  | ValueOfOperatorResult<R5>
>;

export function pipe<Params, R1, R2, R3, R4, R5, R6>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
  o4: Operator<ValueOfOperatorResult<R3>, R4>,
  o5: Operator<ValueOfOperatorResult<R4>, R5>,
  o6: Operator<ValueOfOperatorResult<R5>, R6>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
  | ValueOfOperatorResult<R4>
  | ValueOfOperatorResult<R5>
  | ValueOfOperatorResult<R6>
>;

export function pipe<Params, R1, R2, R3, R4, R5, R6, R7>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
  o4: Operator<ValueOfOperatorResult<R3>, R4>,
  o5: Operator<ValueOfOperatorResult<R4>, R5>,
  o6: Operator<ValueOfOperatorResult<R5>, R6>,
  o7: Operator<ValueOfOperatorResult<R6>, R7>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
  | ValueOfOperatorResult<R4>
  | ValueOfOperatorResult<R5>
  | ValueOfOperatorResult<R6>
  | ValueOfOperatorResult<R7>
>;

export function pipe<Params, R1, R2, R3, R4, R5, R6, R7, R8>(
  o1: Operator<Params, R1>,
  o2: Operator<ValueOfOperatorResult<R1>, R2>,
  o3: Operator<ValueOfOperatorResult<R2>, R3>,
  o4: Operator<ValueOfOperatorResult<R3>, R4>,
  o5: Operator<ValueOfOperatorResult<R4>, R5>,
  o6: Operator<ValueOfOperatorResult<R5>, R6>,
  o7: Operator<ValueOfOperatorResult<R6>, R7>,
  o8: Operator<ValueOfOperatorResult<R7>, R8>,
): (
  params: Params,
) => Observable<
  | ValueOfOperatorResult<R1>
  | ValueOfOperatorResult<R2>
  | ValueOfOperatorResult<R3>
  | ValueOfOperatorResult<R4>
  | ValueOfOperatorResult<R5>
  | ValueOfOperatorResult<R6>
  | ValueOfOperatorResult<R7>
  | ValueOfOperatorResult<R8>
>;

export function pipe(
  ...operators: Operator<any, any>[]
): (params: any) => Observable<any> {
  return (params: any) =>
    new Observable<any>((subscriber) => {
      let i = -1;

      const run = (input: any) => {
        if (subscriber.closed) {
          return;
        }

        i += 1;

        if (i >= operators.length) {
          subscriber.complete();
        } else {
          const operation = operators[i](input);

          if (isObservable(operation)) {
            let latestValue: any;

            operation.subscribe(
              (r) => {
                latestValue = r;
                subscriber.next(r);
              },
              (error) => {
                subscriber.error(error);
              },
              () => {
                run(latestValue);
              },
            );
          } else {
            Promise.resolve(operation)
              .then((value) => {
                subscriber.next(value);
                run(value);
              })
              .catch((error) => {
                subscriber.error(error);
              });
          }
        }
      };

      run(params);
    });
}
