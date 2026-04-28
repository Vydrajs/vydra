import type { VydraMFDefinition, VydraMFEntry } from '../interfaces/di.interface';

/**
 * VydraMFRegistry
 *
 * Central in-memory store of all registered microfrontends.
 * Owned by the root app runtime.
 */
export class VydraMFRegistry {
  private readonly entries = new Map<string, VydraMFEntry>();

  register(definition: VydraMFDefinition): void {
    if (this.entries.has(definition.name)) {
      // eslint-disable-next-line no-console
      console.warn(`[vydra-registry] MF "${definition.name}" already registered — skipping`);
      return;
    }
    this.entries.set(definition.name, { definition, status: 'idle' });
  }

  registerMany(definitions: VydraMFDefinition[]): void {
    definitions.forEach((d) => this.register(d));
  }

  get(name: string): VydraMFEntry | undefined {
    return this.entries.get(name);
  }

  findByPath(pathname: string): VydraMFEntry | undefined {
    for (const entry of this.entries.values()) {
      if (pathname.startsWith(entry.definition.basePath)) return entry;
    }
    return undefined;
  }

  all(): VydraMFEntry[] {
    return [...this.entries.values()];
  }

  updateStatus(name: string, status: VydraMFEntry['status'], error?: unknown): void {
    const entry = this.entries.get(name);
    if (!entry) return;
    entry.status = status;
    if (error !== undefined) entry.error = error;
  }
}
