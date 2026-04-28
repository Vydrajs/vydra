import { createContext } from '@lit/context';
import { i18n } from '../i18n/i18n';

export interface Ii18nAdapter {
  t(key: string, params?: any): string;
}
export class I18nAdapter implements Ii18nAdapter {
  t(key: string, vars?: Record<string, string | number>) {
    return i18n.t(key, vars);
  }

  subscribe(cb: () => void) {
    i18n.onChange(cb);
    return () => i18n.offChange(cb);
  }
}

export const i18nContext = createContext<I18nAdapter>('i18n-context');
