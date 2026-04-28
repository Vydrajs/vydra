import { LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';

export class VydraOutletBase extends ScopedElementsMixin(LitElement) {
  static scopedElements: Record<string, typeof HTMLElement> = {};
  static useScopedRegistry = true;
  @property() pageTag?: string;
  @property({ type: Object }) routeParams: Record<string, string> = {};
  @property({ type: Object }) queryParams: Record<string, string> = {};
  @property() layout?: string;

  /**
   * Called by VydraRouter after resolving a route.
   * Do not override unless you know what you're doing — use lifecycle hooks instead.
   */
  protected async loadPage(
    tag: string,
    params: Record<string, string>,
    queryParams: Record<string, string>,
    layout?: string,
  ): Promise<void> {
    this.pageTag = tag;
    this.routeParams = params;
    this.queryParams = queryParams;
    this.layout = layout;
    await this.updateComplete;
    this.requestUpdate();
  }

  /**
   * Register a component into the scoped registry at runtime.
   * Called by VydraRouter after lazy-loading a component class.
   */
  protected registerScopedComponent(tag: string, cls: typeof HTMLElement): void {
    try {
      const ctor = this.constructor as typeof VydraOutletBase;
      if (!ctor.scopedElements[tag]) {
        ctor.scopedElements[tag] = cls;
        (this as any).registry?.define(tag, cls);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[vydra-outlet] Could not register "${tag}":`, err);
    }
  }

  protected renderPage(): TemplateResult {
    const page = this.unsafeRenderTag(this.pageTag!, this.routeParams, this.queryParams);
    if (!this.layout) return page;
    return this.unsafeRenderTag(this.layout, {}, {}, page);
  }

  private unsafeRenderTag(
    tagName: string,
    params?: Record<string, string>,
    queryParams?: Record<string, string>,
    content?: TemplateResult,
  ): TemplateResult {
    const tag = unsafeStatic(tagName);
    return staticHtml`
      <${tag}
        .params=${ifDefined(params)}
        .queryParams=${ifDefined(queryParams)}
      >${content ?? ''}</${tag}>`;
  }
}
