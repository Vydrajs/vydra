// i18n-mixin.ts
import { consume } from '@lit/context';
import { LitElement } from 'lit';
import { I18nAdapter, i18nContext } from './i18n.adapter';
import { property } from 'lit/decorators.js';

type Constructor<T = object> = new (...args: any[]) => T;

export const I18nMixin = <T extends Constructor<LitElement>>(superClass: T) => {
  class I18nElement extends superClass {
    @consume({ context: i18nContext })
    private _i18n?: I18nAdapter;
    @property({ type: Object }) labels: Record<string, string> = {};
    @property({ type: Object }) i18nMap: Record<string, string> = {};
    private _unsubscribe?: () => void;

    connectedCallback() {
      super.connectedCallback();
      this._setLabels();
      this._unsubscribe = this._i18n?.subscribe?.(() => {
        this._setLabels();
      });
    }

    private _setLabels() {
      const labels: Record<string, string> = {};
      Object.keys(this.i18nMap).forEach((key) => {
        labels[key] = this.t(this.i18nMap[key]);
      });
      this.labels = labels;
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this._unsubscribe?.();
    }

    t(key: string, vars?: Record<
      string,
      string | number
    >,) {
      return this._i18n?.t(key, vars) ?? key;
    }
  }

  type MixinInterface = {
    t(key: string, vars?: Record<string, string | number>): string;
    getLabel(key: string): string;
    i18nMap: Record<string, string>;
  };

  return I18nElement as unknown as T & Constructor<MixinInterface>;
};
