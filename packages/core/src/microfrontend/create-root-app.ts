import { VydraBus } from '@vydra-js/bus';
import type { VydraScope } from '@vydra-js/bus';
import { VydraMFRegistry } from './mf-registry';
import { VydraLifecycleController } from './lifecycle.controller';
import type { VydraRootConfig } from '../interfaces/root-app-config.interface';
import type { VydraMFMountConfig } from '../interfaces/di.interface';

export interface VydraRootNavigation {
  to: string;
  from: string;
}

/**
 * VydraRootRuntime
 *
 * Central orchestrator of the root application.
 * Responsibilities:
 *  - Maintain the global bus (scope: "global")
 *  - Own the MF registry
 *  - Orchestrate mount/unmount via lifecycle controller
 *  - Listen to cross-MF navigation requests
 *  - Bridge events between MFs (root is the ONLY bridge)
 *  - Propagate rootConfig to all MFs (read-only)
 */
export class VydraRootRuntime {
  readonly bus: VydraBus;
  readonly registry: VydraMFRegistry;

  private readonly lifecycle: VydraLifecycleController;
  private readonly mountPoint: HTMLElement;
  private readonly rootConfig: Readonly<Record<string, unknown>>;

  private unsubscribers: Array<() => void> = [];

  constructor(config: VydraRootConfig) {
    this.bus = new VydraBus('global', config.debug ?? false);
    this.registry = new VydraMFRegistry();
    this.lifecycle = new VydraLifecycleController(this.registry);
    this.mountPoint = config.mountPoint;
    this.rootConfig = Object.freeze(config.config ?? {});

    this.registry.registerMany(config.registry);
    this.listenToNavigation();
    this.listenToSystemEvents();
  }

  // ─── Navigation orchestration ──────────────────────────────────────────────

  /**
   * Navigate to a path. The runtime resolves which MF owns the path,
   * unmounts the current one and mounts the target.
   */
  async navigate(path: string): Promise<void> {
    const entry = this.registry.findByPath(path);

    if (!entry) {
      this.bus.emit('router:not-found', { path });
      // eslint-disable-next-line no-console
      console.warn(`[vydra-root] No MF registered for path "${path}"`);
      return;
    }

    const mountConfig: VydraMFMountConfig = {
      mountPoint: this.mountPoint,
      rootConfig: this.rootConfig,
    };

    await this.lifecycle.switchTo(entry.definition.name, mountConfig);
    this.bus.emit('router:mf-switched', { name: entry.definition.name, path });
  }

  // ─── Bus bridging (root ← MF → root → MF) ────────────────────────────────

  /**
   * Bridge events between two MF scopes.
   * Root is the ONLY entity allowed to call this.
   *
   * @example
   * runtime.bridge("mf:checkout", "mf:cart", "cart:item-added");
   */
  bridge(
    fromScope: `mf:${string}`,
    toScope: `mf:${string}`,
    event: string,
    transform?: (payload: unknown) => unknown,
  ): () => void {
    const fromBus = this.createScopedBus(fromScope);
    const toBus = this.createScopedBus(toScope);
    return VydraBus.bridge(fromBus, toBus, event, transform);
  }

  /**
   * Create a scoped bus for a microfrontend.
   * Returned bus can only emit/listen within that scope.
   */
  createScopedBus(scope: VydraScope): VydraBus {
    return new VydraBus(scope);
  }

  // ─── Internal event wiring ────────────────────────────────────────────────

  private listenToNavigation(): void {
    // MFs emit this when they detect a cross-MF navigation
    const unsub = this.bus.on<VydraRootNavigation>('mf:switch-request', async (nav) => {
      await this.navigate(nav.to);
    });
    this.unsubscribers.push(unsub);
  }

  private listenToSystemEvents(): void {
    // Forward MF errors to the global error channel
    const unsub = this.bus.on<{ name: string; error: unknown }>('mf:error', ({ name, error }) => {
      // eslint-disable-next-line no-console
      console.error(`[vydra-root] MF "${name}" reported error:`, error);
      this.registry.updateStatus(name, 'error', error);
    });
    this.unsubscribers.push(unsub);
  }

  // ─── Destroy ──────────────────────────────────────────────────────────────

  async destroy(): Promise<void> {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];

    const active = this.lifecycle.getActiveMF();
    if (active) await this.lifecycle.unmount(active);

    this.bus.dispose();
  }
}

// ─── createRootApp factory ────────────────────────────────────────────────────

/**
 * Creates and returns the root application runtime.
 *
 * @example
 * const root = createRootApp({
 *   mountPoint: document.getElementById("app")!,
 *   config: { apiUrl: "https://api.example.com" },
 *   registry: [
 *     { name: "@acme/shell",    basePath: "/",       loader: () => import("@acme/shell") },
 *     { name: "@acme/checkout", basePath: "/checkout", loader: () => import("@acme/checkout") },
 *   ],
 * });
 *
 * await root.navigate(window.location.pathname);
 */
export function createRootApp(config: VydraRootConfig): VydraRootRuntime {
  return new VydraRootRuntime(config);
}
