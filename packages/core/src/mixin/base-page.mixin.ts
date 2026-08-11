import { LitElement } from 'lit';

type Constructor<T = {}> = new (...args: any[]) => T;

export const BasePageMixin: <T extends Constructor<LitElement>>(
  Base: T,
) => Constructor<LitElement> = <T extends Constructor<LitElement>>(Base: T) =>
  class extends Base {
    /**
     * Current route object params
     *
     * localhost/route/:id
     */
    params: Record<string, any> = {};
    /**
     * Current route queryParams
     *
     * localhost/route?param=value
     */
    queryParams: Record<string, any> = {};

    static get properties() {
      return {
        params: { type: Object },
        queryParams: { type: Object },
      };
    }

    constructor(...args: any[]) {
      super(...args);
      this.params = {};
      this.queryParams = {};
    }
  };
