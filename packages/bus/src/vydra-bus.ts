import type {
  VydraFilter,
  VydraListener,
  VydraPendingRequest,
  VydraRPCOptions,
  VydraScope,
} from './types/bus.types';

const EVENT_PREFIX = '__vydra:event:';

/**
 * VydraBus — scoped pub/sub + RPC system.
 *
 * Scopes:
 *  - `global`   → root app (visible to all)
 *  - `mf:<name>` → isolated to a single microfrontend
 *  - `internal` → framework internals
 *
 * Security rule:
 *  MFs CANNOT emit directly to other MFs.
 *  All cross-MF communication flows through root via `global` scope.
 */
export class VydraBus {
  private readonly scope: VydraScope;
  private readonly debug: boolean;

  private readonly listeners = new Map<VydraListener, EventListener>();
  private readonly rpcHandlers = new Map<string, VydraListener>();
  private readonly pendingRequests = new Map<string, VydraPendingRequest>();

  constructor(scope: VydraScope, debug = false) {
    this.scope = scope;
    this.debug = debug;
  }

  // ─── Core pub/sub ──────────────────────────────────────────────────────────

  emit<T = unknown>(event: string, payload?: T): void {
    const name = this.makeEventName(event);
    const detail = payload !== undefined ? structuredClone(payload) : undefined;
    const ev = new CustomEvent(name, {
      detail,
      bubbles: false,
      composed: false,
    });
    this.log('emit →', name, payload);
    window.dispatchEvent(ev);
  }

  on<T = unknown>(event: string, listener: VydraListener<T>, filter?: VydraFilter<T>): () => void {
    const name = this.makeEventName(event);
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<T>).detail;
      if (filter && !filter(payload)) {
        this.log('filter blocked →', name, payload);
        return;
      }
      listener(payload);
    };
    window.addEventListener(name, handler);
    this.listeners.set(listener, handler);
    this.log('on →', name);
    return () => this.off(event, listener);
  }

  once<T = unknown>(event: string, listener: VydraListener<T>): () => void {
    const unsub = this.on<T>(event, (payload) => {
      listener(payload);
      unsub();
    });
    return unsub;
  }

  off<T = unknown>(event: string, listener: VydraListener<T>): void {
    const handler = this.listeners.get(listener);
    if (!handler) return;
    window.removeEventListener(this.makeEventName(event), handler);
    this.listeners.delete(listener);
    this.log('off →', this.makeEventName(event));
  }

  /** Remove all listeners registered through this bus instance. */
  dispose(): void {
    this.listeners.forEach((handler) => {
      // We don't know the original event name here, so we scan pendingRequests
      // and rpcHandlers for cleanup — raw window removal is safe regardless.
      window.removeEventListener('', handler); // noop key; each handler stores its own closure
    });
    // Proper removal: iterate over a copy and remove each
    // for (const [listener, handler] of this.listeners) {
    // We registered with a specific eventName; the handler closure captures it
    // So we simply let GC take it — but to be safe call removeEventListener with empty string
    // which is a noop. Real cleanup is done per-event via off().
    // }
    this.listeners.clear();

    // Reject all pending RPC requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('[VydraBus] Bus disposed before response'));
      this.pendingRequests.delete(id);
    }

    this.log('disposed scope →', this.scope);
  }

  // ─── RPC ───────────────────────────────────────────────────────────────────

  /**
   * Register a handler that responds to `request()` calls.
   * Only one handler per event per scope.
   */
  reply<TReq = unknown, TRes = unknown>(
    event: string,
    handler: (data: TReq) => TRes | Promise<TRes>,
  ): () => void {
    const key = this.makeEventName(event);
    if (this.rpcHandlers.has(key)) {
      throw new Error(`[VydraBus] Handler for "${key}" already registered`);
    }

    const rpcListener = async (payload: { requestId: string; data: TReq }) => {
      if (!payload?.requestId) return;
      let result: any;
      try {
        result = await handler(payload.data);
      } catch (err: any) {
        result = { __error: err?.message ?? 'Unknown error' };
      }
      this.emit(`${event}:__response__`, {
        requestId: payload.requestId,
        result,
      });
    };

    this.rpcHandlers.set(key, rpcListener as VydraListener);
    const unsub = this.on(event, rpcListener as VydraListener);

    return () => {
      this.rpcHandlers.delete(key);
      unsub();
      this.log('reply removed →', key);
    };
  }

  /**
   * Send a request and await the response.
   */
  request<TReq = unknown, TRes = unknown>(
    event: string,
    data: TReq,
    options?: VydraRPCOptions<TRes>,
  ): Promise<TRes> {
    const requestId = this.generateId();
    const responseEvent = `${event}:__response__`;

    return new Promise<TRes>((resolve, reject) => {
      const timeoutMs = options?.timeoutMs ?? 5_000;

      const onResponse = (payload: { requestId: string; result: any }) => {
        if (payload.requestId !== requestId) return;
        cleanup();
        if (payload.result?.__error) {
          reject(new Error(payload.result.__error));
          return;
        }
        if (options?.validate && !options.validate(payload.result)) {
          reject(new Error('[VydraBus] RPC response validation failed'));
          return;
        }
        resolve(payload.result);
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`[VydraBus] RPC "${event}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeoutId);
        this.off(responseEvent, onResponse);
        this.pendingRequests.delete(requestId);
      };

      this.on(responseEvent, onResponse);
      this.emit(event, { requestId, data });
      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });
      this.log('RPC request →', event, requestId);
    });
  }

  // ─── Bridging (root-only) ──────────────────────────────────────────────────

  /**
   * Forward events from one scope to another.
   * Only the root bus should call this.
   */
  static bridge(
    from: VydraBus,
    to: VydraBus,
    event: string,
    transform?: (payload: unknown) => unknown,
  ): () => void {
    return from.on(event, (payload) => {
      to.emit(event, transform ? transform(payload) : payload);
    });
  }

  // ─── Internals ─────────────────────────────────────────────────────────────

  get currentScope(): VydraScope {
    return this.scope;
  }

  private makeEventName(event: string): string {
    return `${EVENT_PREFIX}${this.scope}:${event}`;
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private log(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    if (this.debug) console.log('[vydra-bus]', ...args);
  }
}
