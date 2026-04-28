export interface VydraMFDefinition {
  /** Unique identifier, e.g. "@domain/my-app" */
  name: string;
  /** Base URL path owned by this MF, e.g. "/admin" */
  basePath: string;
  /** Dynamic import that resolves the MF lifecycle module. */
  loader: () => Promise<VydraMFLifecycle>;
}

export interface VydraMFLifecycle {
  bootstrap: () => Promise<void>;
  mount: (config: VydraMFMountConfig) => Promise<void>;
  unmount: () => Promise<void>;
}

export interface VydraMFMountConfig {
  mountPoint: HTMLElement;
  /** Root config propagated from root app — read-only in MF. */
  rootConfig?: Readonly<Record<string, unknown>>;
}

export interface VydraMFEntry {
  definition: VydraMFDefinition;
  status: 'idle' | 'bootstrapped' | 'mounted' | 'unmounted' | 'error';
  lifecycle?: VydraMFLifecycle;
  error?: unknown;
}
