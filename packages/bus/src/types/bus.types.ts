export type VydraScope = `global` | `mf:${string}` | `internal`;

export type VydraListener<T = any> = (payload: T) => void;

export type VydraFilter<T = any> = (payload: T) => boolean;

export interface VydraRPCOptions<TRes = any> {
  timeoutMs?: number;
  validate?: (result: TRes) => boolean;
}

export interface VydraPendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}
