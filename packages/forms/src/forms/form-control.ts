import { ReactiveControllerHost } from 'lit';

export class FormControl<T = any> {
  private _value: T;
  private _initialValue: T;
  // Usamos un Set para evitar duplicados si un componente re-conecta
  hosts = new Set<ReactiveControllerHost>();
  errors: string[] = [];
  touched = false;
  dirty = false;

  constructor(
    value: T,
    public validators: Array<(v: T) => string | null> = [],
  ) {
    this._value = value;
    this._initialValue = value;
    this.validate();
  }

  get value() {
    return this._value;
  }

  get valid() {
    return this.errors.length === 0;
  }

  setValue(value: T, options = { emit: true }) {
    this._value = value;
    this.dirty = true;
    this.validate();
    if (options.emit) this._requestUpdate();
  }

  validate() {
    this.errors = this.validators.map((v) => v(this._value)).filter((e): e is string => e !== null);
  }

  // Permite que un componente se suscriba a cambios de este control
  addHost(host: ReactiveControllerHost) {
    this.hosts.add(host);
  }

  private _requestUpdate() {
    this.hosts.forEach((h) => h.requestUpdate());
  }

  reset() {
    this._value = this._initialValue;
    this.touched = false;
    this.dirty = false;
    this.validate();
    this._requestUpdate();
  }

  markAsTouched() {
    this.touched = true;
    this._requestUpdate();
  }

  markAsUntouched() {
    this.touched = false; // Corregido: antes estaba en true
    this._requestUpdate();
  }
}
