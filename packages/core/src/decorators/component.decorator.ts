import { type CSSResult } from 'lit';

export interface VydraComponentClass extends CustomElementConstructor {
  is: string;
  styles?: CSSResult[] | CSSResult;
  scopedElements?: Record<string, unknown>;
}

type ComponentOptions = {
  is: string;
  styles?: CSSResult[] | CSSResult;
  scopedElements?: Record<string, unknown>;
};

export function Component(options: ComponentOptions) {
  return function <T extends CustomElementConstructor>(target: T): T & VydraComponentClass {
    (target as any).is = options.is;

    if (options.styles) {
      (target as any).styles = options.styles;
    }

    if (options.scopedElements) {
      (target as any).scopedElements = options.scopedElements;
    }

    return target as T & VydraComponentClass;
  };
}
