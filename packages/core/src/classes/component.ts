import { LitElement } from 'lit';
import { ScopedElementsMixin } from '@open-wc/scoped-elements/lit-element.js';
import { BasePageMixin } from '../mixin/base-page.mixin';
class FixedLitElement extends LitElement {}
const WithScoped = ScopedElementsMixin(FixedLitElement);
const WithLifecycle = BasePageMixin(WithScoped);
export class VydraComponent extends WithLifecycle {
  static is: string;
}
