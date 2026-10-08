export type LocaleData = Record<string, string>;

export interface I18nLoadOptions {
  lang?: string;
  namespace: string;
  url?: string;
}

export class I18nService {
  private currentLang = 'es';
  private fallbackLang = 'en';

  private readonly locales =
    new Map<string, LocaleData>();

  private readonly loading =
    new Map<string, Promise<LocaleData>>();

  /**
   * Namespaces que la aplicación ha solicitado.
   *
   * Ej:
   * common
   * home
   * checkout
   */
  private readonly loadedNamespaces =
    new Set<string>();

  private readonly emitter =
    new EventTarget();

  private basePath = '';

  setBasePath(base: string) {
    this.basePath = base.replace(/\/$/, '');
  }

  getCurrentLang(): string {
    return this.currentLang;
  }

  async ensureLoaded(
    namespaces: string[],
    lang = this.currentLang,
  ): Promise<void> {
    const uniqueNamespaces = [
      ...new Set(namespaces),
    ];

    /**
     * Registramos que estos namespaces forman
     * parte de los recursos utilizados por la app.
     */
    uniqueNamespaces.forEach((namespace) => {
      this.loadedNamespaces.add(namespace);
    });

    await Promise.all(
      uniqueNamespaces.map((namespace) =>
        this.load(namespace, lang),
      ),
    );
  }

  private async load(
    namespace: string,
    lang: string,
  ): Promise<void> {
    const cacheKey =
      `${lang}:${namespace}`;

    /**
     * Ya está cargado.
     */
    if (this.locales.has(cacheKey)) {
      return;
    }

    /**
     * Ya se está cargando.
     */
    const pending =
      this.loading.get(cacheKey);

    if (pending) {
      await pending;
      return;
    }

    const url =
      `${this.basePath}/locales/${lang}/${namespace}.json`;

    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            `Unable to load locale: ${url}`,
          );
        }

        return response.json() as Promise<LocaleData>;
      })
      .then((data) => {
        this.locales.set(
          cacheKey,
          data,
        );
      })
      .finally(() => {
        this.loading.delete(cacheKey);
      });

    this.loading.set(
      cacheKey,
      request as any,
    );

    await request;
  }

  async setLanguage(
    lang: string,
  ): Promise<void> {
    if (
      lang === this.currentLang
    ) {
      return;
    }

    /**
     * Todos los namespaces utilizados hasta
     * este momento.
     */
    const namespaces = [
      ...this.loadedNamespaces,
    ];

    /**
     * Primero cargamos el idioma nuevo.
     *
     * IMPORTANTE:
     * todavía no cambiamos currentLang.
     */
    await Promise.all(
      namespaces.map((namespace) =>
        this.load(namespace, lang),
      ),
    );

    /**
     * Ahora sí cambiamos el idioma.
     */
    this.currentLang = lang;

    this.emitter.dispatchEvent(
      new Event('change'),
    );
  }

  t(
    key: string,
    vars?: Record<
      string,
      string | number
    >,
  ): string {
    const [namespace, translationKey] =
      this.resolveKey(key);

    const translation =
      this.getTranslation(
        this.currentLang,
        namespace,
        translationKey,
      ) ??
      this.getTranslation(
        this.fallbackLang,
        namespace,
        translationKey,
      ) ??
      key;

    if (!vars) {
      return translation;
    }

    return translation.replace(
      /\{(\w+)\}/g,
      (_, key) =>
        String(
          vars[key] ?? `{${key}}`,
        ),
    );
  }

  private getTranslation(
    lang: string,
    namespace: string,
    key: string,
  ): string | undefined {
    return this.locales.get(
      `${lang}:${namespace}`,
    )?.[key];
  }

  private resolveKey(
    key: string,
  ): [string, string] {
    const index = key.indexOf('.');

    if (index === -1) {
      return ['common', key];
    }

    return [
      key.slice(0, index),
      key.slice(index + 1),
    ];
  }

  onChange(
    callback: EventListener,
  ): void {
    this.emitter.addEventListener(
      'change',
      callback,
    );
  }

  offChange(
    callback: EventListener,
  ): void {
    this.emitter.removeEventListener(
      'change',
      callback,
    );
  }
}

export const i18n = new I18nService();