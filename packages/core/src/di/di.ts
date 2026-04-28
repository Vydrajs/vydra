/**
 * Vydra DI
 *
 * Minimal dependency injection for the framework.
 * Single runtime scope — no hierarchical injectors.
 * Compatible with standard TypeScript decorators (stage 3).
 *
 * Usage:
 *   @Injectable()
 *   class UserService {}
 *
 *   class MyComponent {
 *     private users = Inject(UserService);
 *   }
 */

type Constructor<T = unknown> = new (..._args: unknown[]) => T;

const registry = new Map<Constructor, unknown>();
const metadata = new WeakMap<Constructor, Constructor[]>();

// ─── @Injectable() ────────────────────────────────────────────────────────

/**
 * Marks a class as injectable and registers it in the DI container.
 * The instance is created lazily on first `Inject()` call.
 */
export function Injectable(): ClassDecorator {
  return (target) => {
    const ctor = target as unknown as Constructor;
    // Ensure it's tracked even before first use
    if (!registry.has(ctor)) {
      registry.set(ctor, null); // placeholder — resolved lazily
    }
  };
}

// ─── Inject() ─────────────────────────────────────────────────────────────

/**
 * Resolve a service instance from the DI container.
 * Creates the instance on first call (singleton).
 *
 * @example
 * class MyComponent {
 *   private svc = Inject(MyService);
 * }
 */
export function Inject<T>(token: Constructor<T>): T {
  if (registry.has(token)) {
    const existing = registry.get(token);
    if (existing !== null) return existing as T;
  }

  // Resolve constructor dependencies recursively
  const deps = (metadata.get(token) ?? []).map((dep) => Inject(dep));
  const instance = new token(...deps);
  registry.set(token, instance);
  return instance;
}

// ─── @InjectDeps() ────────────────────────────────────────────────────────
/**
 * Explicitly declare constructor dependencies for a service.
 * Use when you can't rely on `emitDecoratorMetadata`.
 *
 * @example
 * @Injectable()
 * @InjectDeps(HttpService, LogService)
 * class UserService {
 *   constructor(private http: HttpService, private log: LogService) {}
 * }
 */
export function InjectDeps(...deps: Constructor[]): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    metadata.set(target as Constructor, deps);
  };
}

// ─── Container utilities ───────────────────────────────────────────────────

export const VydraContainer = {
  /**
   * Manually register a value or mock for a token.
   * Useful for testing or providing pre-configured instances.
   */
  provide<T>(token: Constructor<T>, instance: T): void {
    registry.set(token, instance);
  },

  /** Check if a token has a registered instance. */
  has(token: Constructor): boolean {
    return registry.has(token) && registry.get(token) !== null;
  },

  /**
   * Clear a specific token from the container.
   * Primarily for testing.
   */
  clear(token: Constructor): void {
    registry.delete(token);
  },

  /** Clear all registrations. Use in test teardown only. */
  reset(): void {
    registry.clear();
  },
} as const;
