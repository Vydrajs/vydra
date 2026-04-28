import { FormControl } from './form-control';
export const formControl = <T>(
  value: Widen<T>,
  validators: Array<(v: Widen<T>) => string | null> = [],
) => new FormControl<Widen<T>>(value, validators);

type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T;
