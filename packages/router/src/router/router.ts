import { parse } from 'regexparam';

import { VydraActivatedRoute } from './activated-route';

import type { VydraInternalRoute } from '../interfaces/internal-route.tinterface';
import type {
  VydraBeforeEnterResult,
  VydraErrorRoutes,
  VydraErrorStatus,
  VydraGuardResult,
  VydraNavigation,
  VydraQueryParams,
  VydraRoute,
  VydraRouteContext,
  VydraRouterOptionsWithErrors,
} from '@vydra-js/shared';

/**
 * ---------------------------------------------------------------------------
 * Navigation types
 * ---------------------------------------------------------------------------
 */

/**
 * ---------------------------------------------------------------------------
 * VydraRouter
 * ---------------------------------------------------------------------------
 */

export class VydraRouter {
  private readonly flatRoutes: VydraInternalRoute[] = [];

  private readonly errorRoutes: Partial<Record<VydraErrorStatus, VydraInternalRoute>> = {};

  private readonly basePath: string;

  private readonly mountPoint: HTMLElement;

  private readonly outlet: HTMLElement;

  private readonly appInitializers: Array<() => Promise<void>>;

  private readonly onRedirectMicrofrontend?: (nav: VydraNavigation) => void;

  /**
   * Reactive route context.
   */
  readonly activatedRoute = new VydraActivatedRoute();

  /**
   * Current route context.
   *
   * This is useful for consumers that need the current
   * navigation information directly from the router.
   */
  private currentRouteContext?: VydraRouteContext;

  // ────────────────────────────────────────────────────────────────────────────
  // Event handlers
  // ────────────────────────────────────────────────────────────────────────────

  private readonly _onPopstate = () => {
    const fullPath = location.pathname;
    if (this.isCrossMfNavigation(fullPath)) {
      this.onRedirectMicrofrontend?.({
        to: fullPath,
        from: this.basePath || '/',
      });

      return;
    }
    this.handleNavigation();
  };

  private readonly _onLinkClick = (e: MouseEvent) => this.handleLinkClick(e);

  private readonly _onHashChange = () => this.handleHashChange();

  private readonly _onVydraNavigate = (e: Event) => {
    const detail = (
      e as CustomEvent<{
        path: string;
        replace?: boolean;
      }>
    ).detail;

    // Usamos optional chaining para evitar errores si detail no existe
    if (typeof detail?.path === 'string') {
      this.navigate(detail.path, detail.replace);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Constructor
  // ────────────────────────────────────────────────────────────────────────────

  constructor(options: VydraRouterOptionsWithErrors) {
    this.basePath = (options.basePath ?? '').replace(/\/$/, '');

    this.mountPoint = options.mountPoint;

    this.outlet = options.outlet;

    this.appInitializers = options.appInitializers ?? [];

    this.onRedirectMicrofrontend = options.onRedirectMicrofrontend;

    this.flattenRoutes(options.routes);

    this.flattenErrorRoutes(options.errorRoutes);

    this.registerListeners();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    await this.runInitializers();

    await this.handleNavigation();
  }

  /**
   * Navigate to a route.
   *
   * replace = true is useful for redirects.
   */
  navigate(path: string, replace = false): void {
    const fullPath = this.buildFullPath(path);

    /**
     * Cross-microfrontend navigation.
     * Evaluamos el cross-MF SOBRE la ruta ya procesada.
     */
    if (this.isCrossMfNavigation(fullPath)) {
      this.applyHistoryChange(fullPath, replace);

      this.onRedirectMicrofrontend?.({
        to: fullPath,
        from: this.basePath || '/',
      });

      return;
    }

    this.applyHistoryChange(fullPath, replace);

    void this.handleNavigation();
  }

  /**
   * Returns the current navigation context.
   */
  getCurrentRoute(): VydraRouteContext | undefined {
    return this.currentRouteContext;
  }

  destroy(): void {
    this.removeListeners();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ────────────────────────────────────────────────────────────────────────────

  private async handleNavigation(): Promise<void> {
    try {
      const fullPath = location.pathname;

      const relPath = this.getRelativePath(fullPath);

      const route = this.matchRoute(relPath);

      /**
       * Route does not belong to this MF.
       */
      if (!route) {
        if (this.isCrossMfNavigation(fullPath)) {
          this.onRedirectMicrofrontend?.({
            to: fullPath,
            from: this.basePath || '/',
          });

          return;
        }

        /**
         * Route does not exist.
         */
        await this.renderError(404, {
          path: fullPath,
        });

        return;
      }

      /**
       * Redirect.
       *
       * Redirects use replaceState so the
       * old URL does not remain in history.
       */
      if (route.redirectTo) {
        this.navigate(route.redirectTo, true);

        return;
      }

      /**
       * Create the route context once.
       *
       * The same context is shared between
       * guard, beforeEnter and render.
       */
      const routeContext = this.createRouteContext(route, relPath);

      /**
       * Run guard.
       */
      const guardResult = await this.runGuard(route, routeContext);

      /**
       * Navigation blocked/redirected by guard.
       */
      if (guardResult !== true) {
        await this.handleNavigationResult(guardResult, fullPath);

        return;
      }

      /**
       * Run beforeEnter.
       *
       * This is intentionally executed after the guard.
       *
       * If beforeEnter throws, the error is propagated
       * to the navigation catch below and becomes a 500.
       */
      const beforeEnterResult = await this.runBeforeEnter(route, routeContext);

      /**
       * beforeEnter requested a navigation result.
       */
      if (beforeEnterResult !== true) {
        await this.handleNavigationResult(beforeEnterResult, fullPath);

        return;
      }

      /**
       * Navigation allowed.
       */
      await this.renderRoute(route, routeContext);

      return;
    } catch (error) {
      console.error('[VydraRouter] Navigation error:', error);

      await this.renderError(500, {
        path: location.pathname,
        error,
      });
    }
  }

  /**
   * Handle a navigation result returned by
   * guard or beforeEnter.
   */
  private async handleNavigationResult(
    result: VydraGuardResult | void,
    fullPath: string,
  ): Promise<void> {
    /**
     * Undefined/null means allowed.
     */
    if (result === undefined || result === null || result === true) {
      return;
    }

    /**
     * Requested redirect.
     */
    if (typeof result === 'object' && result.redirect) {
      this.navigate(result.redirect, true);

      return;
    }

    /**
     * Legacy false => 403.
     */
    if (result === false) {
      await this.renderError(403, {
        path: fullPath,
      });

      return;
    }

    /**
     * Explicit status.
     */
    if (typeof result === 'object' && result.status) {
      await this.renderError(result.status, {
        path: fullPath,
      });

      return;
    }

    /**
     * Fallback.
     */
    await this.renderError(403, {
      path: fullPath,
    });
  }

  /**
   * Render a normal route.
   */
  private async renderRoute(
    route: VydraInternalRoute,
    routeContext: VydraRouteContext,
  ): Promise<void> {
    this.currentRouteContext = routeContext;

    /**
     * Keep ActivatedRoute synchronized.
     */
    this.activatedRoute._update({
      params: routeContext.params,
      queryParams: routeContext.queryParams as any,
      data: routeContext.data,
      title: route.title,
    });

    this.updateDocumentTitle(route.title);

    await this.loadAndRender(route, routeContext);
  }

  /**
   * Render HTTP-style error page.
   *
   * IMPORTANT:
   *
   * This does NOT change the browser URL.
   */
  private async renderError(
    status: VydraErrorStatus,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const route = this.errorRoutes[status];

    /**
     * No configured error page.
     */
    if (!route) {
      console.warn(`[VydraRouter] No error route configured for ${status}.`);

      /**
       * Fallback to 500.
       */
      if (status !== 500 && this.errorRoutes[500]) {
        await this.renderError(500, {
          ...data,
          originalStatus: status,
        });

        return;
      }

      return;
    }

    const routeContext = this.createErrorRouteContext(route, status, data);

    this.currentRouteContext = routeContext;

    this.activatedRoute._update({
      params: routeContext.params,
      queryParams: routeContext.queryParams as any,
      data: routeContext.data,
      title: route.title,
    });

    this.updateDocumentTitle(route.title);

    await this.loadAndRender(route, routeContext);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Route context
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Creates the complete route context.
   */
  private createRouteContext(route: VydraInternalRoute, relPath: string): VydraRouteContext {
    const params = this.extractParams(route, relPath);

    const queryParams = this.getQueryParams();

    const hash = this.getHash();

    const fullPath = location.pathname;

    const url = this.buildCurrentUrl();

    return {
      params,

      queryParams,

      hash,

      path: relPath,

      fullPath,

      url,

      data: route.data,
    };
  }

  /**
   * Creates context for 401/403/404/500.
   */
  private createErrorRouteContext(
    route: VydraInternalRoute,
    status: VydraErrorStatus,
    errorData: Record<string, unknown>,
  ): VydraRouteContext {
    const fullPath = location.pathname;

    const relPath = this.getRelativePath(fullPath);

    return {
      params: {},

      queryParams: this.getQueryParams(),

      hash: this.getHash(),

      path: relPath,

      fullPath,

      url: this.buildCurrentUrl(),

      data: {
        ...(route.data ?? {}),

        status,

        ...errorData,
      },
    };
  }

  /**
   * Build current URL without origin.
   */
  private buildCurrentUrl(): string {
    return location.pathname + location.search + location.hash;
  }

  /**
   * Extract hash without '#'.
   */
  private getHash(): string {
    return location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Route flattening
  // ────────────────────────────────────────────────────────────────────────────

  private flattenRoutes(
    routes: VydraRoute[],
    parentPath = '',
    parentLayout?: VydraRoute['layout'],
  ): void {
    for (const route of routes) {
      const fullPath = this.normalizePath(`${parentPath}/${route.path}`);

      /**
       * Redirect-only route.
       */
      if (route.redirectTo) {
        const { pattern, keys } = parse(fullPath);

        this.flatRoutes.push({
          fullPath,
          pattern,
          keys,

          redirectTo: route.redirectTo,

          componentLoader: () => Promise.resolve(HTMLElement as any),

          componentTag: '__redirect__',
        });
      } else if (route.componentLoader && route.componentTag) {
        const { pattern, keys } = parse(fullPath);

        this.flatRoutes.push({
          fullPath,
          pattern,
          keys,

          componentLoader: route.componentLoader,

          componentTag: route.componentTag,

          layout: route.layout ?? parentLayout,

          guard: route.guard,

          beforeEnter: route.beforeEnter,

          data: route.data,

          title: route.title,
        });
      }

      /**
       * Flatten children.
       */
      if (route.children?.length) {
        this.flattenRoutes(route.children, fullPath, route.layout ?? parentLayout);
      }
    }
  }

  /**
   * Error routes are kept separate from
   * the normal route tree.
   */
  private flattenErrorRoutes(routes?: VydraErrorRoutes): void {
    if (!routes) {
      return;
    }

    const statuses: VydraErrorStatus[] = [401, 403, 404, 500];

    for (const status of statuses) {
      const route = routes[status];

      if (!route) {
        continue;
      }

      if (!route.componentLoader || !route.componentTag) {
        console.warn(
          `[VydraRouter] Error route ${status} must have componentLoader and componentTag.`,
        );

        continue;
      }

      const fullPath = this.normalizePath(route.path);

      const { pattern, keys } = parse(fullPath);

      this.errorRoutes[status] = {
        fullPath,

        pattern,

        keys,

        componentLoader: route.componentLoader,

        componentTag: route.componentTag,

        layout: route.layout,

        guard: undefined,

        data: route.data,

        title: route.title,
      };
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Component loading
  // ────────────────────────────────────────────────────────────────────────────

  private async loadAndRender(
    route: VydraInternalRoute,
    context: VydraRouteContext,
  ): Promise<void> {
    /**
     * Load layout.
     */
    if (route.layout) {
      const LayoutClass = await route.layout.loader();

      this.registerScoped(route.layout.tag, LayoutClass);
    }

    /**
     * Load page component.
     */
    const ComponentClass = await route.componentLoader();

    this.registerScoped(route.componentTag, ComponentClass);

    /**
     * Render through outlet.
     *
     * IMPORTANT:
     *
     * The outlet should now receive the complete
     * route context instead of independent params
     * and queryParams.
     */
    this.callOutlet('loadPage', route.componentTag, context, route.layout?.tag);
  }

  private registerScoped(tag: string, cls: typeof HTMLElement): void {
    (this.outlet as any).registerScopedComponent?.(tag, cls);
  }

  /**
   * Call outlet renderer.
   *
   * New signature:
   *
   * loadPage(
   *   tag,
   *   routeContext,
   *   layout
   * )
   */
  private callOutlet(
    method: string,
    tag: string,
    context: VydraRouteContext,
    layout?: string,
  ): void {
    (this.outlet as any)[method]?.(tag, context, layout);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Matching
  // ────────────────────────────────────────────────────────────────────────────

  private matchRoute(relPath: string): VydraInternalRoute | undefined {
    return this.flatRoutes.find((route) => route.pattern.test(relPath));
  }

  private extractParams(route: VydraInternalRoute, relPath: string): Record<string, string> {
    const match = route.pattern.exec(relPath);

    const params: Record<string, string> = {};

    if (match) {
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(match[index + 1]);
      });
    }

    return params;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Query params
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Parse query parameters while preserving
   * repeated keys.
   *
   * Example:
   *
   * ?tag=js&tag=ts
   *
   * {
   *   tag: ["js", "ts"]
   * }
   */
  private getQueryParams(): VydraQueryParams {
    const params: VydraQueryParams = {};

    const searchParams = new URLSearchParams(window.location.search);

    for (const [key, value] of searchParams.entries()) {
      const current = params[key];

      if (current === undefined) {
        params[key] = value;
        continue;
      }

      if (Array.isArray(current)) {
        current.push(value);
        continue;
      }

      params[key] = [current, value];
    }

    return params;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Guards
  // ────────────────────────────────────────────────────────────────────────────

  private async runGuard(
    route: VydraInternalRoute,
    context: VydraRouteContext,
  ): Promise<VydraGuardResult> {
    if (!route.guard) {
      return true;
    }

    try {
      const guard = route.guard as unknown as (
        context: VydraRouteContext,
      ) => boolean | VydraGuardResult | Promise<boolean | VydraGuardResult>;

      const result = await guard(context);

      /**
       * Undefined means allowed.
       */
      if (result === undefined || result === null) {
        return true;
      }

      return result as VydraGuardResult;
    } catch (error) {
      /**
       * Guard exceptions are NOT 403.
       *
       * They indicate that authorization could
       * not be evaluated correctly.
       */
      console.error('[VydraRouter] Guard error:', error);

      throw error;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Before enter
  // ────────────────────────────────────────────────────────────────────────────

  private async runBeforeEnter(
    route: VydraInternalRoute,
    context: VydraRouteContext,
  ): Promise<VydraBeforeEnterResult> {
    if (!route.beforeEnter) {
      return true;
    }

    const result = await route.beforeEnter(context);

    /**
     * Undefined means allowed.
     */
    if (result === undefined || result === null) {
      return true;
    }

    return result;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Hash navigation
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Hash changes do not rematch the route
   * or execute guards again.
   *
   * They only update the route context.
   */
  private handleHashChange(): void {
    if (!this.currentRouteContext) {
      return;
    }

    const updatedContext: VydraRouteContext = {
      ...this.currentRouteContext,

      hash: this.getHash(),

      url: this.buildCurrentUrl(),
    };

    this.currentRouteContext = updatedContext;

    /**
     * Keep ActivatedRoute synchronized.
     *
     * This assumes ActivatedRoute supports
     * the additional route context fields.
     */
    this.activatedRoute._update({
      params: updatedContext.params,

      queryParams: updatedContext.queryParams as any,

      data: updatedContext.data,

      title: this.currentRouteContext ? undefined : undefined,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Cross-MF navigation
  // ────────────────────────────────────────────────────────────────────────────

  private isCrossMfNavigation(path: string): boolean {
    if (!this.basePath) {
      return false;
    }

    const normalized = path.replace(/\/\/+/g, '/');

    /**
     * Exact base path.
     */
    if (normalized === this.basePath) {
      return false;
    }

    /**
     * Path belongs to this MF.
     *
     * Example:
     *
     * basePath = /app
     *
     * /app/users -> local
     *
     * /application -> NOT local
     */
    return !normalized.startsWith(`${this.basePath}/`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Path helpers
  // ────────────────────────────────────────────────────────────────────────────

  private applyHistoryChange(path: string, replace: boolean): void {
    if (replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
  }

  private buildFullPath(path: string): string {
    let fullPath = path.replace(/\/\/+/g, '/');

    // Convertimos rutas relativas ("about") a absolutas desde la raíz ("/about")
    if (!fullPath.startsWith('/')) {
      fullPath = `/${fullPath}`;
    }

    if (this.basePath && fullPath !== this.basePath && !fullPath.startsWith(`${this.basePath}/`)) {
      /**
       * Si es una ruta absoluta que NO tiene el basePath, verificamos si hace
       * match con alguna ruta local del microfrontend. Si es así, le inyectamos
       * su propio basePath para mantenerla en el ámbito local.
       */
      if (this.matchRoute(fullPath)) {
        fullPath = `${this.basePath}${fullPath}`;
      }
    }

    return fullPath.replace(/\/\/+/g, '/');
  }

  private getRelativePath(fullPath: string): string {
    const normalized = fullPath.replace(/\/\/+/g, '/');

    /**
     * Root application.
     */
    if (!this.basePath) {
      return normalized || '/';
    }

    /**
     * Exact base path.
     */
    if (normalized === this.basePath) {
      return '/';
    }

    /**
     * Path belongs to this MF.
     */
    if (normalized.startsWith(`${this.basePath}/`)) {
      const sliced = normalized.slice(this.basePath.length);

      return sliced || '/';
    }

    /**
     * Not part of this MF.
     */
    return '/';
  }

  private normalizePath(path: string): string {
    return path.replace(/\/\/+/g, '/') || '/';
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Document title
  // ────────────────────────────────────────────────────────────────────────────

  private updateDocumentTitle(routeTitle?: string): void {
    if (routeTitle) {
      document.title = routeTitle;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Initializers
  // ────────────────────────────────────────────────────────────────────────────

  private runInitializers(): Promise<void[]> {
    return Promise.all(this.appInitializers.map((fn) => fn()));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Event listeners
  // ────────────────────────────────────────────────────────────────────────────

  private registerListeners(): void {
    window.addEventListener('popstate', this._onPopstate);

    window.addEventListener('hashchange', this._onHashChange);

    document.body.addEventListener('click', this._onLinkClick);

    window.addEventListener('vydra:navigate', this._onVydraNavigate);
  }

  private removeListeners(): void {
    window.removeEventListener('popstate', this._onPopstate);

    window.removeEventListener('hashchange', this._onHashChange);

    document.body.removeEventListener('click', this._onLinkClick);

    window.removeEventListener('vydra:navigate', this._onVydraNavigate);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Link handling
  // ────────────────────────────────────────────────────────────────────────────

  private handleLinkClick(event: MouseEvent): void {
    const path = event.composedPath() as HTMLElement[];

    for (const el of path) {
      if (el instanceof HTMLAnchorElement) {
        if (this.shouldIntercept(el)) {
          event.preventDefault();

          this.navigate(el.getAttribute('href')!);
        }

        break;
      }
    }
  }

  private shouldIntercept(el: HTMLAnchorElement): boolean {
    const href = el.getAttribute('href');

    return (
      href !== null &&
      href.startsWith('/') &&
      el.origin === window.location.origin &&
      el.getAttribute('target') !== '_blank'
    );
  }
}
