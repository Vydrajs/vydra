export const Validators = {
  required: (v: any) => (v === null || v === undefined || v === '' ? 'required' : null),

  minLength: (len: number) => (v: string) => (v?.length < len ? `minLength:${len}` : null),

  min: (minValue: number) => (v: number) =>
    typeof v === 'number' && v < minValue ? `min:${minValue}` : null,

  max: (maxValue: number) => (v: number) =>
    typeof v === 'number' && v > maxValue ? `max:${maxValue}` : null,
};
