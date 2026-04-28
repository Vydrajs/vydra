/**
 * VydraActivatedRoute
 *
 * Provides reactive access to the current route's params, query params,
 * data, and title. Passed to the outlet component after each navigation.
 *
 * Design: plain observable pattern — no RxJS dependency.
 */

type Listener<T> = (value: T) => void;

class Observable<T> {
  private value: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initial: T) {
    this.value = initial;
  }

  get snapshot(): T {
    return this.value;
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value); // emit current value immediately
    return () => this.listeners.delete(listener);
  }

  /** @internal — only VydraRouter should call this */
  _next(value: T): void {
    this.value = value;
    this.listeners.forEach((l) => l(value));
  }
}

export class VydraActivatedRoute {
  readonly params = new Observable<Record<string, string>>({});
  readonly queryParams = new Observable<Record<string, string>>({});
  readonly data = new Observable<Record<string, unknown>>({});
  readonly title = new Observable<string | undefined>(undefined);

  /** @internal */
  _update(snapshot: {
    params: Record<string, string>;
    queryParams: Record<string, string>;
    data?: Record<string, unknown>;
    title?: string;
  }): void {
    this.params._next(snapshot.params);
    this.queryParams._next(snapshot.queryParams);
    this.data._next(snapshot.data ?? {});
    this.title._next(snapshot.title);
  }
}
