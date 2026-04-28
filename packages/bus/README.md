# @vydra-js/bus

Event Bus system with scoped pub/sub and RPC capabilities for microfrontend communication. Provides isolation between microfrontends while enabling event-driven interaction.

## Installation

```bash
npm install @vydra-js/bus
```

## Quick Start

```typescript
import { VydraBus } from '@vydra-js/bus';

// Create a scoped event bus
const bus = new VydraBus('global');

// Subscribe to events
bus.subscribe('user:login', (event) => {
  console.log('User logged in:', event.detail);
});

// Publish events
bus.emit('user:login', { userId: '123' });
```

## API

### VydraBus

Main event bus class with scoped isolation.

```typescript
new VydraBus(scope: string)
```

#### Constructor

```typescript
new VydraBus(scope: string)
```

The `scope` parameter defines the isolation level:

- `"global"` - All microfrontends can communicate
- `"mfe:<name>"` - Isolated to specific microfrontend
- Any custom scope for targeted communication

#### Methods

##### `subscribe<T>(event: string, handler: EventHandler<T>): () => void`

Subscribes to an event. Returns unsubscribe function.

```typescript
const unsubscribe = bus.subscribe('user:login', (event) => {
  console.log(event.detail);
});

// Later, unsubscribe
unsubscribe();
```

##### `subscribeOnce<T>(event: string, handler: EventHandler<T>): void`

Subscribes for exactly one emission.

```typescript
bus.subscribeOnce('app:ready', (event) => {
  console.log('Ready!');
});
```

##### `emit<T>(event: string, detail?: T): void`

Emits an event to all subscribers.

```typescript
bus.emit('user:login', { userId: '123' });
```

##### `unsubscribe(event?: string, handler?: EventHandler): void`

Unsubscribes from events.

```typescript
// Unsubscribe specific handler
bus.unsubscribe('user:login', myHandler);

// Unsubscribe all handlers for event
bus.unsubscribe('user:login');

// Unsubscribe all handlers
bus.unsubscribe();
```

### RPC Methods

##### `rpc<T>(event: string, detail?: any): Promise<T>`

Request-response pattern over the event bus.

```typescript
const result = await bus.rpc<string>('compute:add', { a: 1, b: 2 });
console.log(result); // 3
```

##### `respond<T>(event: string, handler: RpcHandler<T>): void`

Registers an RPC handler.

```typescript
bus.respond<{ a: number; b: number }, number>('compute:add', async ({ detail }) => {
  return detail.a + detail.b;
});
```

## Concepts

### Why Event Bus?

- **Decoupled communication**: Components don't reference each other directly
- **Scoped isolation**: Events stay within their scope
- **Built-in RPC**: Request-response over events
- **Type-safe**: Full TypeScript support

### Scopes

| Scope          | Description                   |
| -------------- | ----------------------------- |
| `"global"`     | All MFEs can subscribe/emit   |
| `"mfe:<name>"` | Specific MFE only             |
| Custom         | Any custom isolation boundary |

### Event Flow

1. Component A calls `bus.emit("event", data)`
2. Bus dispatches to all handlers in matching scope
3. Each handler receives `CustomEvent`
4. `detail` property contains data

## Usage Examples

### Basic Pub/Sub

```typescript
// In component A
const bus = new VydraBus('global');
bus.emit('theme:change', 'dark');

// In component B
const bus = new VydraBus('global');
bus.subscribe('theme:change', (event) => {
  document.body.setAttribute('data-theme', event.detail);
});
```

### Cross-MF Communication

```typescript
// In MFE "auth"
const authBus = new VydraBus('global');
authBus.emit('auth:login', { user: getCurrentUser() });

// In MFE "cart"
const cartBus = new VydraBus('global');
cartBus.subscribe('auth:login', (event) => {
  // Update cart with logged-in user
  loadUserCart(event.detail.user.id);
});
cartBus.subscribe('auth:logout', () => {
  clearCart();
});
```

### RPC Usage

```typescript
// Handler (in MFE "api")
bus.respond<{ id: string }, User | null>('user:get', async ({ detail }) => {
  return await fetchUser(detail.id);
});

// Request (in MFE "ui")
const bus = new VydraBus('global');
const user = await bus.rpc<User | null>('user:get', { id: '123' });
```

### Cleanup

```typescript
class MyComponent extends LitElement {
  private bus = new VydraBus('global');
  private unsubscribe?: () => void;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = this.bus.subscribe('data:update', () => this.requestUpdate());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unsubscribe?.();
  }
}
```

### Event Bus Factory

For convenience, you can create a factory function:

```typescript
function useBus(scope = 'global') {
  return new VydraBus(scope);
}

// Usage
const globalBus = useBus();
const mfeBus = useBus('mfe:app1');
```

## Scoped Communication

### Within a Microfrontend

```typescript
const bus = new VydraBus('mfe:dashboard');
bus.subscribe('internal:event', handleInternal);
```

### Cross Microfrontends

```typescript
const bus = new VydraBus('global');
bus.emit('cart:add', { productId: '123', quantity: 1 });
```

### Isolated Events

```typescript
// In shell
const shellBus = new VydraBus('global');

// In MFE - emit to shell only
const mfeBus = new VydraBus('mfe:cart');
```

## Integration

### With Router

Router emits navigation events:

```typescript
const bus = new VydraBus('global');
bus.subscribe('router:navigate', (event) => {
  analytics.track('page_view', { path: event.detail.path });
});
```

### With Forms

```typescript
const bus = new VydraBus('global');
bus.subscribe('form:submit', async (event) => {
  const response = await submitForm(event.detail);
  bus.emit('form:success', response);
});
```

### With HTTP

```typescript
const bus = new VydraBus('global');
bus.subscribe('http:request', (event) => {
  // Add auth token
  event.detail.headers.Authorization = getToken();
});
```

## Best Practices

1. **Use meaningful event names**

   ```typescript
   // Good
   'user:login';
   'cart:item-added';

   // Bad
   'event1';
   'update';
   ```

2. **Unsubscribe when done**

   ```javascript
   disconnectedCallback() {
     super.disconnectedCallback();
     this.unsubscribe?.();
   }
   ```

3. **Use scopes appropriately**

   ```typescript
   // For cross-MF use global
   const bus = new VydraBus('global');

   // For internal MFE use scoped
   const bus = new VydraBus('mfe:myapp');
   ```

4. **Avoid creating new instances**

   ```typescript
   // Good - reuse
   const globalBus = new VydraBus("global");

   // Bad - create in render
   render() {
     new VydraBus("global") // Creates new each render
   }
   ```

## Type Definitions

```typescript
type EventHandler<T = any> = (event: CustomEvent<T>) => void;

type RpcHandler<T = any, R = any> = (event: CustomEvent<T>) => R | Promise<R>;

interface VydraBusOptions {
  strict?: boolean;
}

interface EventMap {
  [event: string]: EventHandler[];
}
```

## Events Reference

Common events used in Vydra ecosystem:

| Event               | Description         | Detail             |
| ------------------- | ------------------- | ------------------ |
| `router:navigate`   | Navigation occurred | `{ path, params }` |
| `auth:login`        | User logged in      | `{ user }`         |
| `auth:logout`       | User logged out     | -                  |
| `i18n:change`       | Language changed    | `{ lang }`         |
| `theme:change`      | Theme changed       | `{ theme }`        |
| `mf:switch-request` | Cross-MF navigation | `{ path, mf }`     |

## See Also

- [Core](../core/README.md) - Base framework
- [Router](../router/README.md) - Navigation
- [Example App](https://github.com/vydra-js/vydra-examples) - Real usage
