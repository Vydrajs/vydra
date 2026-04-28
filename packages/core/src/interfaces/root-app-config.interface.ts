import type { VydraMFDefinition } from './di.interface';
import { VydraNavigation, VydraRoute } from '@vydra-js/shared';
export interface VydraRootConfig {
  /** Global config propagated (read-only) to all MFs. */
  config?: Record<string, unknown>;
  /** Registered microfrontends. */
  registry: VydraMFDefinition[];
  /** Element that hosts mounted MFs. */
  mountPoint: HTMLElement;
  debug?: boolean;
}

export interface VydraMFAppConfig {
  name: string;
  mountPoint: HTMLElement;
  outlet: HTMLElement;
  router: {
    basePath: string;
    routes: VydraRoute[];
    appInitializers?: Array<() => Promise<void>>;
    onRedirectMicrofrontend?: (nav: VydraNavigation) => void;
  };
  /** Read-only config received from root. */
  rootConfig?: Readonly<Record<string, unknown>>;
}
