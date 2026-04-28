import { ReactiveController, ReactiveControllerHost } from 'lit';
import { FormControl } from './form-control';

export class FormGroup<T extends Record<string, any>> implements ReactiveController {
  controls: {
    [K in keyof T]: T[K] extends object ? FormGroup<T[K]> : FormControl<T[K]>;
  };
  hosts = new Set<ReactiveControllerHost>();

  constructor(controls: FormGroup<T>['controls'], host?: ReactiveControllerHost) {
    this.controls = controls;
    if (host) this.addHost(host);
  }

  /** * CRITICAL: Este método vincula el formulario al ciclo de vida de Lit.
   * Si pasas el form por @property, el hijo debe llamar a form.addHost(this)
   */
  addHost(host: ReactiveControllerHost) {
    if (this.hosts.has(host)) return;
    this.hosts.add(host);
    host.addController(this); // Integración con el ciclo de vida de Lit
    this._syncChildrenHosts();
  }

  hostConnected() {
    this.validate();
  }

  /** Propaga los hosts hacia abajo en el árbol de controles */
  private _syncChildrenHosts() {
    const sync = (controls: any) => {
      Object.values(controls).forEach((control: any) => {
        this.hosts.forEach((h) => control.hosts.add(h));
        if (control instanceof FormGroup) sync(control.controls);
      });
    };
    sync(this.controls);
  }

  private _requestUpdate() {
    this.hosts.forEach((h) => h.requestUpdate());
  }

  get value(): T {
    const out: any = {};
    for (const key in this.controls) {
      out[key] = this.controls[key].value;
    }
    return out;
  }

  get valid(): boolean {
    return Object.values(this.controls).every((c: any) => c.valid);
  }

  get dirty(): boolean {
    return Object.values(this.controls).some((c: any) => c.dirty);
  }

  get touched(): boolean {
    return Object.values(this.controls).some((c: any) => c.touched);
  }

  get(path: string): any | null {
    return path.split('.').reduce((acc: any, key) => acc?.controls?.[key], this);
  }

  patchValue(value: Partial<T>) {
    Object.entries(value).forEach(([key, val]) => {
      const control = (this.controls as any)[key];
      if (!control) return;
      if (control instanceof FormGroup) {
        control.patchValue(val as any);
      } else {
        control.setValue(val, { emit: false });
      }
    });
    this._requestUpdate();
  }

  reset() {
    Object.values(this.controls).forEach((c: any) => c.reset());
    this._requestUpdate();
  }

  validate() {
    Object.values(this.controls).forEach((c: any) => c.validate());
  }

  markAsTouched() {
    Object.values(this.controls).forEach((c: any) => c.markAsTouched());
    this._requestUpdate();
  }

  markAsUntouched() {
    Object.values(this.controls).forEach((c: any) => c.markAsUntouched());
    this._requestUpdate();
  }
}
