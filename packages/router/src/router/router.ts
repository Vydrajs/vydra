import { parse } from 'regexparam';
import { VydraActivatedRoute } from './activated-route';
import type { VydraInternalRoute } from '../interfaces/internal-route.tinterface';
import type { VydraNavigation } from '../interfaces/nagivation.interface';
import type { VydraRoute } from '../interfaces/route.interface';
import type { VydraRouterOptions } from '../interfaces/router-options.interface';
/**
 * VydraRouter
 *
 * Responsibilities:
 *  - Flatten route tree into a matchable list
 *  - Handle popstate + link clicks + programmatic navigation
 *  - Lazy-load component classes and register them via ScopedElementsMixin
 *  - Delegate cross-MF navigation via `onRedirectMicrofrontend` callback
 *    (router never touches the bus directly — full decoupling)
 *  - Support redirects, guards, layouts, titles
 */
export class VydraRouter {
  private readonly flatRoutes: VydraInternalRoute[] = [];
  private readonly basePath: string;
  private readonly mountPoint: HTMLElement;
  private readonly outlet: HTMLElement;
  private readonly appInitializers: Array<() => Promise<void>>;
  private readonly onRedirectMicrofrontend?: (nav: VydraNavigation) => void;

  /** Reactive route context — inject this into your components. */
  readonly activatedRoute = new VydraActivatedRoute();

  // ─── Event handler references (stable for add/remove) ────────────────────
  private readonly _onPopstate = () => this.handleNavigation();
  private readonly _onLinkClick = (e: MouseEvent) => this.handleLinkClick(e);
  private readonly _onVydraNavigate = (e: Event) => {
    const detail = (e as CustomEvent<{ path: string; replace?: boolean }>).detail;
    if (typeof detail?.path === 'string') this.navigate(detail.path, detail.replace);
  };

  constructor(options: VydraRouterOptions) {
    this.basePath = (options.basePath ?? '').replace(/\/$/, '');
    this.mountPoint = options.mountPoint;
    this.outlet = options.outlet;
    this.appInitializers = options.appInitializers ?? [];
    this.onRedirectMicrofrontend = options.onRedirectMicrofrontend;
    this.flattenRoutes(options.routes);
    this.registerListeners();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async init(): Promise<void> {
    await this.runInitializers();
    await this.handleNavigation();
  }

  navigate(path: string, replace = false): void {
    // Detect cross-MF navigation before touching history
    if (this.isCrossMfNavigation(path)) {
      this.applyHistoryChange(path, replace);
      this.onRedirectMicrofrontend?.({
        to: path,
        from: this.basePath || '/',
      });
      return;
    }
    const fullPath = this.buildFullPath(path);
    this.applyHistoryChange(fullPath, replace);
    this.handleNavigation();
  }

  private applyHistoryChange(path: string, replace: boolean) {
    if (replace) {
      history.replaceState(null, '', path);
    } else {
      history.pushState(null, '', path);
    }
  }

  destroy(): void {
    this.removeListeners();
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  private async handleNavigation(): Promise<void> {
    const relPath = this.getRelativePath(location.pathname);
    const route = this.matchRoute(relPath);

    if (!route) {
      // Maybe the path belongs to another MF
      if (this.isCrossMfNavigation(location.pathname)) {
        this.onRedirectMicrofrontend?.({
          to: location.pathname,
          from: this.basePath || '/',
        });
        return;
      }
      this.renderSpecial('__not_found__');
      return;
    }

    // Handle redirects
    if (route.redirectTo) {
      this.navigate(route.redirectTo);
      return;
    }

    if (!(await this.runGuard(route))) {
      this.renderSpecial('__forbidden__');
      return;
    }

    const params = this.extractParams(route, relPath);
    const queryParams = this.getQueryParams();

    this.activatedRoute._update({
      params,
      queryParams,
      data: route.data,
      title: route.title,
    });

    this.updateDocumentTitle(route.title);
    await this.loadAndRender(route, params, queryParams);
  }

  // ─── Route flattening ─────────────────────────────────────────────────────

  private flattenRoutes(
    routes: VydraRoute[],
    parentPath = '',
    parentLayout?: VydraRoute['layout'],
  ): void {
    for (const route of routes) {
      const fullPath = this.normalizePath(`${parentPath}/${route.path}`);

      // Redirect-only route (no component needed)
      if (route.redirectTo) {
        const { pattern, keys } = parse(fullPath);
        this.flatRoutes.push({
          fullPath,
          pattern,
          keys,
          redirectTo: route.redirectTo,
          // Satisfy TS — unused when redirectTo is set
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
          data: route.data,
          title: route.title,
        });
      }

      if (route.children?.length) {
        this.flattenRoutes(route.children, fullPath, route.layout ?? parentLayout);
      }
    }
  }

  // ─── Component loading ────────────────────────────────────────────────────

  private async loadAndRender(
    route: VydraInternalRoute,
    params: Record<string, string>,
    queryParams: Record<string, string>,
  ): Promise<void> {
    // 1. Load & register layout
    if (route.layout) {
      const LayoutClass = await route.layout.loader();
      this.registerScoped(route.layout.tag, LayoutClass);
    }

    // 2. Load & register page component
    const ComponentClass = await route.componentLoader();
    this.registerScoped(route.componentTag, ComponentClass);

    // 3. Tell the outlet to render
    this.callOutlet('loadPage', route.componentTag, params, queryParams, route.layout?.tag);
  }

  private registerScoped(tag: string, cls: typeof HTMLElement): void {
    (this.outlet as any).registerScopedComponent?.(tag, cls);
  }

  private callOutlet(
    method: string,
    tag: string,
    params: Record<string, string>,
    queryParams: Record<string, string>,
    layout?: string,
  ): void {
    (this.outlet as any)[method]?.(tag, params, queryParams, layout);
  }

  private renderSpecial(tag: '__not_found__' | '__forbidden__'): void {
    this.callOutlet('loadPage', tag, {}, {});
  }

  // ─── Matching helpers ─────────────────────────────────────────────────────

  private matchRoute(relPath: string): VydraInternalRoute | undefined {
    return this.flatRoutes.find((r) => r.pattern.test(relPath));
  }

  private extractParams(route: VydraInternalRoute, relPath: string): Record<string, string> {
    const match = route.pattern.exec(relPath);
    const params: Record<string, string> = {};
    if (match) {
      route.keys.forEach((key, i) => {
        params[key] = match[i + 1];
      });
    }
    return params;
  }

  private getQueryParams(): Record<string, string> {
    const out: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => (out[k] = v));
    return out;
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  private async runGuard(route: VydraInternalRoute): Promise<boolean> {
    if (!route.guard) return true;
    try {
      return await route.guard();
    } catch {
      return false;
    }
  }

  // ─── Cross-MF detection ───────────────────────────────────────────────────

  private isCrossMfNavigation(path: string): boolean {
    if (!this.basePath) return false;
    const normalized = path.replace(/\/\/+/g, '/');
    return !normalized.startsWith(this.basePath);
  }

  // ─── Path helpers ─────────────────────────────────────────────────────────

  private buildFullPath(path: string): string {
    const normalized = path.replace(/\/\/+/g, '/');

    // Si ya incluye el basePath, no lo dupliques
    if (this.basePath && normalized.startsWith(this.basePath)) {
      return normalized;
    }
    const clean = path.replace(/^\//, '');
    return `${this.basePath}/${clean}`.replace(/\/\/+/g, '/');
  }

  private getRelativePath(fullPath: string): string {
    const normalized = fullPath.replace(/\/\/+/g, '/');
    if (normalized.startsWith(this.basePath)) {
      const sliced = normalized.slice(this.basePath.length);
      return sliced.startsWith('/') ? sliced : `/${sliced}`;
    }
    return '/';
  }

  private normalizePath(path: string): string {
    return path.replace(/\/\/+/g, '/') || '/';
  }

  // ─── Document title ───────────────────────────────────────────────────────

  private updateDocumentTitle(routeTitle?: string): void {
    if (routeTitle) document.title = routeTitle;
  }

  // ─── Initializers ─────────────────────────────────────────────────────────

  private runInitializers(): Promise<void[]> {
    return Promise.all(this.appInitializers.map((fn) => fn()));
  }

  // ─── Event listeners ─────────────────────────────────────────────────────

  private registerListeners(): void {
    window.addEventListener('popstate', this._onPopstate);
    document.body.addEventListener('click', this._onLinkClick);
    window.addEventListener('vydra:navigate', this._onVydraNavigate);
  }

  private removeListeners(): void {
    window.removeEventListener('popstate', this._onPopstate);
    document.body.removeEventListener('click', this._onLinkClick);
    window.removeEventListener('vydra:navigate', this._onVydraNavigate);
  }

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
