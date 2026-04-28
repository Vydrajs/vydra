import { Injectable } from './di/di';

/**
 * VydraNavigationService
 *
 * Injectable service for programmatic navigation.
 * Dispatches a custom event that VydraRouter intercepts —
 * el componente no necesita referencia directa al router.
 *
 * @example
 * class MyComponent {
 *   private nav = Inject(VydraNavigationService);
 *
 *   goToOrder(id: string) {
 *     this.nav.navigate(`/checkout/order/${id}`);
 *   }
 * }
 */
@Injectable()
export class VydraNavigationService {
  /**
   * Navigate to a path.
   * If the path is outside the current MF's basePath,
   * the router delegates to `onRedirectMicrofrontend`.
   */
  navigate(path: string): void {
    window.dispatchEvent(
      new CustomEvent('vydra:navigate', {
        detail: { path },
        bubbles: false,
        composed: false,
      }),
    );
  }

  /**
   * Navigate and replace the current history entry (no back).
   */
  replace(path: string): void {
    window.dispatchEvent(
      new CustomEvent('vydra:navigate', {
        detail: { path, replace: true },
        bubbles: false,
        composed: false,
      }),
    );
  }

  /** Go back in browser history. */
  back(): void {
    history.back();
  }

  /** Go forward in browser history. */
  forward(): void {
    history.forward();
  }
}
