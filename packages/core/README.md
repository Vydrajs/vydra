# @vydra-js/core

Core framework for building microfrontends with Web Components using Lit. Provides dependency injection, microfrontend lifecycle management, and base abstractions for Vydra applications.

## Installation

```bash
npm install @vydra-js/core
```

## Quick Start

```typescript
import {
  Injectable,
  Inject,
  createMicrofrontendLifecycle,
  ScopedElementsMixin,
} from '@vydra-js/core';
import { LitElement, html } from 'lit';

// Define an injectable service
@Injectable()
class UserService {
  getUser() {
    return { name: 'John' };
  }
}

// Create a component
class MyComponent extends ScopedElementsMixin(LitElement) {
  private userService = Inject(UserService);

  render() {
    return html`<p>Hello, ${this.userService.getUser().name}</p>`;
  }
}
```

## API

### Dependency Injection

#### `@Injectable()`

Class decorator that marks a class as injectable. Instances are created lazily on first `Inject()` call.

```typescript
@Injectable()
class ConfigService {
  constructor() {}
}
```

#### `Inject<T>(token:构造函数): T`

Injects an instance of the specified injectable class. Creates a singleton on first call.

```typescript
const configService = Inject(ConfigService);
```

#### `createMicrofrontendLifecycle(options): MicrofrontendLifecycle`

Creates a lifecycle handler for microfrontend mounting/unmounting (similar to single-spa).

```typescript
import { createMicrofrontendLifecycle } from '@vydra-js/core';

export const lifecycle = createMicrofrontendLifecycle({
  rootTag: 'my-mf-root',
  rootComponent: MyComponent,
  onMount: async ({ mountPoint, rootConfig }, outlet) => {
    mountPoint.appendChild(outlet);
    return () => {
      /* cleanup */
    };
  },
});
```

### Microfrontend Registration

#### `MicrofrontendRegistry`

Registry for managing microfrontend applications.

```typescript
import { createMicrofrontendRegistry } from '@vydra-js/core';

const registry = createMicrofrontendRegistry();

// Register a microfrontend
registry.register('app1', {
  bootstrap: () => import('./bootstrap'),
  mount: (props) => Promise.resolve(),
  unmount: () => Promise.resolve(),
});
```

### Navigation Service

#### `VydraNavigationService`

Service for programmatic navigation, integrated with `@vydra-js/router`.

```typescript
import { VydraNavigationService } from '@vydra-js/core';

const nav = new VydraNavigationService();
nav.navigate('/about');
```

### Base Classes

#### `VydraOutletBase`

Base class for outlet components that render microfrontends.

```typescript
class MyOutlet extends VydraOutletBase {
  // Provides outlet functionality for rendering routes
}
```

## Concepts

### Why Dependency Injection?

The DI system enables:

- **Loose coupling**: Services depend on abstractions, not concrete implementations
- **Testability**: Easy to mock dependencies in tests
- **Lazy initialization**: Instances are created only when needed

### Scoped Elements

`ScopedElementsMixin` provides shadow DOM isolation for components:

- Styles don't leak
- Element names can be reused across microfrontends
- Full encapsulation

## Usage Examples

### Basic Component with DI

```typescript
import { Injectable, Inject, ScopedElementsMixin } from '@vydra-js/core';
import { LitElement, html, css } from 'lit';

@Injectable()
class CounterService {
  count = 0;
  increment() {
    this.count++;
  }
  getCount() {
    return this.count;
  }
}

class CounterComponent extends ScopedElementsMixin(LitElement) {
  static styles = css`
    p {
      font-size: 1.5rem;
    }
  `;

  private counter = Inject(CounterService);

  render() {
    return html`
      <p>Count: ${this.counter.getCount()}</p>
      <button @click=${() => this.counter.increment()}>+</button>
    `;
  }
}
```

### Microfrontend Lifecycle

```typescript
// my-mf/bootstrap.ts
import { createMicrofrontendLifecycle } from '@vydra-js/core';
import { MyComponent } from './my-component';

export const lifecycle = createMicrofrontendLifecycle({
  rootTag: 'my-mf-root',
  rootComponent: MyComponent,
  onMount: async ({ mountPoint, rootConfig }, outlet) => {
    const component = document.createElement(MyComponent.is);
    mountPoint.appendChild(outlet);

    // Initialize your router here

    return () => {
      component.remove();
    };
  },
});
```

## Best Practices

1. **Use `@Injectable()` for shared services**
   - Don't instantiate services directly with `new`
   - Let DI manage lifecycle

2. **Prefer composition over inheritance**
   - Use mixins like `ScopedElementsMixin` for common behavior

3. **Keep components focused**
   - Single responsibility
   - Delegate business logic to services

4. **Use lifecycle properly**
   - Clean up resources in unmount
   - Handle async initialization

## Type Definitions

```typescript
interface MicrofrontendConfig {
  mountPoint: HTMLElement;
  rootConfig?: Record<string, unknown>;
  basePath?: string;
}

interface MicrofrontendLifecycle {
  bootstrap: () => Promise<void>;
  mount: (props: MicrofrontendConfig) => Promise<() => void>;
  unmount: () => Promise<void>;
}
```

## See Also

- [Router](../router/README.md) - Navigation and routing
- [Event Bus](../bus/README.md) - Cross-MF communication
- [Vydra CLI](../../vydra-cli/README.md) - Scaffolding tool
