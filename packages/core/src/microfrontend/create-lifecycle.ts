import type { VydraMFLifecycle, VydraMFMountConfig } from '../interfaces/di.interface';

interface MFLifecycleOptions {
  /** Custom element tag of the root component (app.component). */
  rootTag: string;
  /** The root component class to register in customElements. */
  rootComponent: typeof HTMLElement;
  /** Called once before first mount. Use for global setup (tokens, interceptors, etc.) */
  onBootstrap?: () => Promise<void>;
  /** Called on each mount. Return the router instance or cleanup fn. */
  onMount: (config: VydraMFMountConfig, outlet: HTMLElement) => Promise<(() => void) | void>;
  /** Called on unmount. */
  onUnmount?: () => Promise<void>;
}

/**
 * createMicrofrontendLifecycle
 *
 * Replaces the single-spa dependency.
 * Returns a `{ bootstrap, mount, unmount }` lifecycle object
 * compatible with the Vydra root runtime.
 *
 * @example
 * export const lifecycle = createMicrofrontendLifecycle({
 *   rootTag: MyApp.is,
 *   rootComponent: MyApp,
 *   onBootstrap: async () => { await initTokens(); },
 *   onMount: async ({ mountPoint, rootConfig }, outlet) => {
 *     mountPoint.appendChild(outlet);
 *     const router = new VydraRouter({ ... });
 *     router.init();
 *     return () => router.destroy();
 *   },
 *   onUnmount: async () => { ... },
 * });
 */
export function createMicrofrontendLifecycle(options: MFLifecycleOptions): VydraMFLifecycle {
  let cleanup: (() => void) | void;
  let outlet: HTMLElement | null = null;
  let bootstrapped = false;

  return {
    async bootstrap() {
      if (bootstrapped) return;
      // Register the app component's custom element tag (only allowed here)
      if (!customElements.get(options.rootTag)) {
        customElements.define(options.rootTag, options.rootComponent);
      }
      outlet = document.createElement(options.rootTag);
      await options.onBootstrap?.();
      bootstrapped = true;
    },

    async mount(config: VydraMFMountConfig) {
      if (!outlet) throw new Error('[vydra] bootstrap() must be called before mount()');
      cleanup = await options.onMount(config, outlet);
    },

    async unmount() {
      try {
        await options.onUnmount?.();
        cleanup?.();
      } finally {
        // support to remove if outlet is shadow dom
        if (outlet?.shadowRoot) {
          outlet.parentNode?.removeChild(outlet);
        } else {
          outlet?.parentElement?.removeChild(outlet);
        }
        cleanup = undefined;
      }
    },
  };
}
