import type { VydraRoute } from './route.interface';
import type { VydraNavigation } from './nagivation.interface';

export interface VydraRouterOptions {
  /** Base path for this router (e.g. "/admin"). */
  basePath?: string;
  mountPoint: HTMLElement;
  outlet: HTMLElement;
  routes: VydraRoute[];
  /** Functions to run once before first navigation. */
  appInitializers?: Array<() => Promise<void>>;
  /**
   * Called when the router detects a navigation outside its basePath.
   * The integrator decides what to do (e.g. emit to root bus).
   * If not provided, cross-MF navigation is ignored (single-SPA local mode).
   */
  onRedirectMicrofrontend?: (navigation: VydraNavigation) => void;
}
