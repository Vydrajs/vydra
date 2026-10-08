import {
  BasePageMixin,
  VydraPageConstructor,
} from '../mixin/base-page.mixin';

import { ScopedVydraElement } from '../utils/scoped-element';

const VydraPageBase: VydraPageConstructor =
  BasePageMixin(ScopedVydraElement);

export class VydraPage extends VydraPageBase {
  static is: string;
}