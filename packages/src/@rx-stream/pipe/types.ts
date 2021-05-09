import { ObservableInput } from 'rxjs';

export type OperatorReturn<R> = ObservableInput<R> | R extends ObservableInput<
  infer U
>
  ? U
  : R;

export type Operator<T, R> = (params: T) => OperatorReturn<R>;

export type ValueOfOperatorResult<T> = T extends ObservableInput<infer U>
  ? U
  : T;
