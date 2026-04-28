import type { VydraMFMountConfig } from '../interfaces/di.interface';
import type { VydraMFRegistry } from '../microfrontend/mf-registry';

/**
 * VydraLifecycleController
 *
 * Orchestrates bootstrap / mount / unmount for a single MF.
 * Owned by the root runtime.
 */
export class VydraLifecycleController {
  private currentMF: string | null = null;

  constructor(private readonly registry: VydraMFRegistry) {}

  async bootstrap(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) throw new Error(`[vydra] MF "${name}" not found in registry`);
    if (entry.status === 'bootstrapped' || entry.status === 'mounted') return;

    try {
      entry.lifecycle = await entry.definition.loader();
      const lifecycle = (entry.lifecycle as any).lifecycle;
      await lifecycle.bootstrap();
      this.registry.updateStatus(name, 'bootstrapped');
    } catch (err) {
      this.registry.updateStatus(name, 'error', err);
      throw err;
    }
  }

  async mount(name: string, config: VydraMFMountConfig): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) throw new Error(`[vydra] MF "${name}" not found in registry`);

    if (entry.status === 'idle') await this.bootstrap(name);

    try {
      const lifecycle = (entry.lifecycle as any).lifecycle;
      await lifecycle.mount(config);
      this.registry.updateStatus(name, 'mounted');
      this.currentMF = name;
    } catch (err) {
      this.registry.updateStatus(name, 'error', err);
      throw err;
    }
  }

  async unmount(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry || entry.status !== 'mounted') return;

    try {
      const lifecycle = (entry.lifecycle as any).lifecycle;
      await lifecycle.unmount();
      this.registry.updateStatus(name, 'unmounted');
      if (this.currentMF === name) this.currentMF = null;
    } catch (err) {
      this.registry.updateStatus(name, 'error', err);
      throw err;
    }
  }

  async switchTo(name: string, config: VydraMFMountConfig): Promise<void> {
    if (this.currentMF && this.currentMF !== name) {
      await this.unmount(this.currentMF);
    }
    await this.mount(name, config);
  }

  getActiveMF(): string | null {
    return this.currentMF;
  }
}
