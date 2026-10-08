import { VydraNavigation } from "./navigation.interface";
import { VydraRoute } from "./route.interface";

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



export type VydraGuardResult =
  | true
  | false
  | {
      allowed?: boolean;
      status?: 401 | 403;
      redirect?: string;
    };

export type VydraErrorStatus = 401 | 403 | 404 | 500;

export type VydraErrorRoutes = Partial<
  Record<VydraErrorStatus, VydraRoute>
>;

/**
 * Query parameters can have multiple values.
 *
 * Example:
 *
 * ?tag=javascript&tag=typescript
 *
 * {
 *   tag: ["javascript", "typescript"]
 * }
 */
export type VydraQueryValue = string | string[];

export type VydraQueryParams = Record<
  string,
  VydraQueryValue
>;

/**
 * Complete navigation context exposed to pages.
 *
 * Example URL:
 *
 * /users/123?tab=permissions&tag=admin&tag=owner#roles
 *
 * {
 *   params: {
 *     id: "123"
 *   },
 *
 *   queryParams: {
 *     tab: "permissions",
 *     tag: ["admin", "owner"]
 *   },
 *
 *   hash: "roles",
 *
 *   path: "/users/123",
 *
 *   fullPath: "/app/users/123",
 *
 *   url: "/app/users/123?tab=permissions&tag=admin&tag=owner#roles"
 * }
 */
export interface VydraRouteContext {
  /**
   * Dynamic route parameters.
   *
   * Example:
   *
   * /users/:id
   *
   * /users/123
   *
   * {
   *   id: "123"
   * }
   */
  params: Record<string, string>;

  /**
   * Query string parameters.
   */
  queryParams: VydraQueryParams;

  /**
   * URL hash without "#".
   *
   * Example:
   *
   * #settings
   *
   * "settings"
   */
  hash: string;

  /**
   * Path relative to the microfrontend basePath.
   *
   * Example:
   *
   * basePath = "/app"
   * pathname = "/app/users/123"
   *
   * path = "/users/123"
   */
  path: string;

  /**
   * Full browser pathname.
   *
   * Example:
   *
   * "/app/users/123"
   */
  fullPath: string;

  /**
   * Complete URL without origin.
   *
   * Example:
   *
   * "/app/users/123?tab=permissions#roles"
   */
  url: string;

  /**
   * Custom route data.
   */
  data?: Record<string, unknown>;
}

/**
 * Extended router options.
 */
export interface VydraRouterOptionsWithErrors
  extends VydraRouterOptions {
  errorRoutes?: VydraErrorRoutes;
}

export type VydraBeforeEnterResult = void | VydraGuardResult;

export type VydraBeforeEnter = (
  context: VydraRouteContext,
) => VydraBeforeEnterResult | Promise<VydraBeforeEnterResult>;
