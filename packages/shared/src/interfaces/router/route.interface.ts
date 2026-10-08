import { VydraBeforeEnter } from "./router.interface";

export interface VydraRouteLayout {
  tag: string;
  loader: () => Promise<typeof HTMLElement>;
}

export interface VydraRoute {
  /** Path segment (supports regexparam syntax: /users/:id). */
  path: string;
  /**
   * Dynamic import returning the component class.
   * Required unless this is a parent route that only holds children.
   */
  componentLoader?: () => Promise<typeof HTMLElement>;
  /** Custom element tag for the component. */
  componentTag?: string;
  /** Optional layout wrapper for this route and its children. */
  layout?: VydraRouteLayout;
  /** Redirect to another path instead of rendering a component. */
  redirectTo?: string;
  /** Route-level guard. Returning false triggers the forbidden handler. */
  guard?: () => boolean | Promise<boolean>;
  /** Nested routes. */
  children?: VydraRoute[];
  /** Arbitrary data attached to the route (accessible via ActivatedRoute). */
  data?: Record<string, unknown>;
  /** Browser tab title for this route. */
  title?: string;
  /** Hook called before entering the route. */
  beforeEnter?: VydraBeforeEnter;
}
