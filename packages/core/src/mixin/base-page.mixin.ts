import { LitElement } from 'lit';
import { VydraRouteContext } from '@vydra-js/shared';

export type Constructor<T = object> = new (...args: any[]) => T;

export interface BasePage {
  routeContext: VydraRouteContext;
}

export type VydraPageConstructor =
  Constructor<LitElement & BasePage> & {
    scopedElements?: Record<string, CustomElementConstructor>;
  };

export const BasePageMixin = <T extends Constructor<LitElement>>(
  Base: T,
): VydraPageConstructor => {
  class BasePageElement extends Base implements BasePage {
    routeContext: VydraRouteContext = {
      params: {},
      queryParams: {},
      hash: '',
      path: '',
      fullPath: '',
      url: '',
    };

    static properties = {
      routeContext: {
        type: Object,
      },
    };
  }

  return BasePageElement as VydraPageConstructor;
};