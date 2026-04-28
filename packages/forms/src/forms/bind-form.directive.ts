import { noChange } from 'lit';
import { directive, Directive, PartInfo, ElementPart, PartType } from 'lit/directive.js';
import { FormControl } from './form-control';

// Definimos una interfaz para las opciones de personalización
interface BindOptions {
  event?: string; // Ejemplo: 'change', 'wa-input', 'checked-changed'
  property?: string; // Ejemplo: 'checked', 'selected', 'date'
}

class BindFormDirective extends Directive {
  private control!: FormControl;
  private element!: HTMLElement;
  private options: Required<BindOptions> = {
    event: 'input',
    property: 'value',
  };

  constructor(partInfo: PartInfo) {
    super(partInfo);
    if (partInfo.type !== PartType.ELEMENT) {
      throw new Error(
        'bindForm solo puede usarse en el tag del elemento (ej: <input ${bindForm(c)}>) ',
      );
    }
  }

  render(_control: FormControl, _options?: BindOptions) {
    return noChange;
  }

  update(part: ElementPart, [control, options]: [FormControl, BindOptions?]) {
    // Actualizamos opciones combinando con los valores por defecto
    this.options = {
      event: options?.event ?? 'input',
      property: options?.property ?? 'value',
    };

    if (!this.element) {
      this.element = part.element as HTMLElement;
      this.setupListeners(control);
    }

    this.control = control;
    this.syncValue();

    return noChange;
  }

  private setupListeners(control: FormControl) {
    const { event, property } = this.options;

    const handleChange = (e: any) => {
      // Prioridad: 1. Valor manual en detail (Web Components), 2. Propiedad del target, 3. String vacío
      const newValue = e.detail?.[property] ?? e.target[property] ?? '';
      control.setValue(newValue);
    };

    this.element.addEventListener(event, handleChange);

    this.element.addEventListener('blur', () => {
      control.markAsTouched();
    });
  }

  private syncValue() {
    if (!this.element || !this.control) return;

    const { property } = this.options;
    const currentValue = (this.element as any)[property];
    const newValue = this.control.value;

    // Solo actualizamos el DOM si el valor es diferente para evitar loops o pérdida de foco
    if (currentValue !== newValue) {
      (this.element as any)[property] = newValue;
    }
  }
}

export const bindForm = directive(BindFormDirective);
