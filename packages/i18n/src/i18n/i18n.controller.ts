import { ReactiveController, ReactiveControllerHost } from 'lit';
import { i18n } from './i18n';

export class I18nController implements ReactiveController {
  host: ReactiveControllerHost;
  private onChangeBound: () => void;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    this.onChangeBound = () => host.requestUpdate();
    host.addController(this);
  }

  t(key: string, vars?: Record<string, string | number>) {
    return i18n.t(key, vars);
  }

  setLocale(lang: string) {
    i18n.setLanguage(lang);
  }

  hostConnected() {
    i18n.onChange(this.onChangeBound);
  }

  hostDisconnected() {
    i18n.offChange(this.onChangeBound);
  }
}
