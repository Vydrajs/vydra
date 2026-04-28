type LocaleData = Record<string, string>;

export class I18nService {
  private currentLang = 'es';
  private locales: Record<string, LocaleData> = {};
  private fallbackLang = 'en';
  private emitter = new EventTarget();
  private basePath = '';

  setBasePath(base: string) {
    this.basePath = base;
  }

  async load(lang: string, url?: string) {
    try {
      const localeUrl = url ?? `/locales/${lang}.json`;
      const data = await fetch(`${this.basePath}${localeUrl}`).then((res) => res.json());
      this.locales[lang] = data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`No se pudo cargar el idioma ${lang}`, err);
    }
  }

  setLanguage(lang: string) {
    this.currentLang = lang;
    this.emitter.dispatchEvent(new Event('change'));
  }

  t(key: string, vars?: Record<string, string | number>): string {
    const translation =
      this.locales[this.currentLang]?.[key] ?? this.locales[this.fallbackLang]?.[key] ?? key;

    if (vars) {
      return translation.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
    }

    return translation;
  }

  getCurrentLang() {
    return this.currentLang;
  }

  onChange(callback: () => void) {
    this.emitter.addEventListener('change', callback);
  }

  offChange(callback: () => void) {
    this.emitter.removeEventListener('change', callback);
  }
}

export const i18n = new I18nService();
