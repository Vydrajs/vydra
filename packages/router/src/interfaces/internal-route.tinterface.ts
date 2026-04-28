import type { VydraRouteLayout } from './route.interface';

export interface VydraInternalRoute {
  fullPath: string;
  pattern: RegExp;
  keys: string[];
  componentLoader: () => Promise<typeof HTMLElement>;
  componentTag: string;
  layout?: VydraRouteLayout;
  guard?: () => boolean | Promise<boolean>;
  redirectTo?: string;
  data?: Record<string, unknown>;
  title?: string;
}
