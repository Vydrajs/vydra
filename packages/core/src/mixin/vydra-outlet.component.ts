import { LitElement, TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { VydraRouteContext } from '@vydra-js/shared';

export class VydraOutletBase extends ScopedElementsMixin(LitElement) {
  static scopedElements: Record<string, typeof HTMLElement> = {};
  static useScopedRegistry = true;
  @property() pageTag?: string;
  @property() routeContext?: VydraRouteContext;
  @property() layout?: string;

  /**
   * Called by VydraRouter after resolving a route.
   * Do not override unless you know what you're doing — use lifecycle hooks instead.
   */
  protected async loadPage(
    tag: string,
    routeContext: VydraRouteContext,
    layout?: string,
  ): Promise<void> {
    this.pageTag = tag;
    this.routeContext = routeContext;
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

  render(): TemplateResult {
    const page = this.unsafeRenderTag(this.pageTag!, this.routeContext);
    if (!this.layout) return page;
    return this.unsafeRenderTag(this.layout, this.routeContext, page);
  }

  private unsafeRenderTag(
    tagName: string,
    routeContext?: VydraRouteContext,
    content?: TemplateResult,
  ): TemplateResult {
    if(!tagName) return staticHtml``;
     const tag = unsafeStatic(tagName);

  return staticHtml`
    <${tag}
      .routeContext=${ifDefined(routeContext)}
    >
      ${content ?? ''}
    </${tag}>
  `;
  }
}
