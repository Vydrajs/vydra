# Vydra JS Documentation

> Composable microfrontends with Web Components

Welcome to the Vydra JS documentation. Vydra is a modern frontend framework built on Web Components with Lit, designed from the ground up for microfrontends architecture.

---

## Table of Contents

1. [Getting Started](#-getting-started)
2. [Core Concepts](#-core-concepts)
3. [Packages](#-packages)
4. [CLI](#-cli)
5. [Architecture](#-architecture)
6. [Advanced Guides](#-advanced-guides)
7. [API Reference](#-api-reference)

---

## Getting Started

### Installation

Create a new Vydra app:

```bash
npm create vydra-app my-app
cd my-app
npm run dev
```

Or install packages individually:

```bash
npm install @vydra-js/core @vydra-js/router @vydra-js/bus @vydra-js/forms @vydra-js/http @vydra-js/i18n
```

### Your First Vydra App

```typescript
// src/main.ts
import { VydraRouter } from '@vydra-js/router';
import { VydraOutlet } from './app.component';
import { routes } from './router';

const mountPoint = document.getElementById('app')!;
customElements.define(VydraOutlet.is, VydraOutlet);

const outlet = document.createElement(VydraOutlet.is);
mountPoint.appendChild(outlet);

const router = new VydraRouter({
  basePath: '/',
  mountPoint,
  outlet,
  routes,
});

router.init();
```

### Project Structure

```
my-app/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.component.ts       # Root component
│   ├── bootstrap.ts        # MFE bootstrap (for microfrontend mode)
│   ├── router/
│   │   └── app.router.ts  # Route definitions
│   ├── pages/
│   │   ├── home/
│   │   └── about/
│   ├── services/
│   └── locales/
│       ├── en.json
│       └── es.json
├── public/
├── vite.config.ts
├── vydra.config.json
└── package.json
```

---

## Core Concepts

### Microfrontends

Each part of your application can be an independent microfrontend:

- **Independent routing** - Each MFE has its own routes
- **Own state** - No shared state between MFEs
- **Separate deployment** - Deploy whenever ready
- **Communication via events** - Use Event Bus

### Event Bus

The Event Bus (`@vydra-js/bus`) enables communication between microfrontends:

```typescript
import { VydraBus } from '@vydra-js/bus';

const bus = new VydraBus('global');

// Subscribe to events
bus.subscribe('user:login', (event) => {
  console.log('User:', event.detail);
});

// Emit events
bus.emit('user:login', { userId: '123' });
```

### Scopes

| Scope        | Description            |
| ------------ | ---------------------- |
| `global`     | All microfrontends     |
| `mfe:<name>` | Specific microfrontend |

### Routing Desacoplado

Routes live within each microfrontend:

```typescript
const routes = [
  { path: '/', tag: 'home-page' },
  { path: '/about', tag: 'about-page' },
];
```

### Dependency Injection

```typescript
@Injectable()
class UserService {
  getUser() { return { name: "John" }; }
}

// Inject in component
private userService = Inject(UserService);
```

---

## Packages

### @vydra-js/core

Core package providing:

- **Dependency Injection**: `@Injectable()`, `Inject()`
- **Microfrontend Lifecycle**: `createMicrofrontendLifecycle()`
- **Base Classes**: `VydraOutletBase`, `VydraNavigationService`
- **Scoped Elements**: `ScopedElementsMixin`

```typescript
import { Injectable, Inject, ScopedElementsMixin } from '@vydra-js/core';

@Injectable()
class ConfigService {
  apiUrl = '/api';
}

class MyComponent extends ScopedElementsMixin(LitElement) {
  private config = Inject(ConfigService);
}
```

[Full API →](packages/core/README.md)

---

### @vydra-js/router

Declarative routing:

- Route parameters: `/users/:id`
- Navigation guards
- Lazy loading
- Cross-MF navigation

```typescript
import { VydraRouter } from '@vydra-js/router';

const router = new VydraRouter({
  basePath: '/',
  mountPoint,
  outlet,
  routes,
});

await router.init();
router.navigate('/about');
```

[Full API →](packages/router/README.md)

---

### @vydra-js/bus

Event-driven communication:

- Pub/sub system
- RPC support
- Scope isolation

```typescript
import { VydraBus } from '@vydra-js/bus';

const bus = new VydraBus('global');
bus.subscribe('event', handler);
bus.emit('event', data);
```

[Full API →](packages/bus/README.md)

---

### @vydra-js/forms

Reactive forms:

- FormControl, FormGroup
- Built-in validators
- bindForm directive

```typescript
import { FormControl, FormGroup, required } from '@vydra-js/forms';

const form = new FormGroup({
  name: new FormControl('', [required]),
  email: new FormControl('', [required, email]),
});

form.valid; // boolean
form.value; // { name: "...", email: "..." }
```

[Full API →](packages/forms/README.md)

---

### @vydra-js/http

HTTP client:

- Extend `HttpBase`
- Interceptors
- Type-safe requests

```typescript
import { HttpBase } from '@vydra-js/http';

class ApiService extends HttpBase {
  constructor() {
    super({ baseUrl: '/api' });
  }

  getUsers() {
    return this.get<User[]>('/users');
  }
}
```

[Full API →](packages/http/README.md)

---

### @vydra-js/i18n

Internationalization:

- Translation loading
- Language switching
- Interpolation

```typescript
import { I18nService, t } from '@vydra-js/i18n';

I18nService.setBasePath('/locales');
await I18nService.load('en');

html`<p>${t('hello')}</p>`;
```

[Full API →](packages/i18n/README.md)

---

## CLI

### Installation

```bash
npm install -g vydra-cli
```

### Commands

| Command                           | Description            |
| --------------------------------- | ---------------------- |
| `vydra create app <name>`         | Create new application |
| `vydra generate component <name>` | Generate component     |
| `vydra generate service <name>`   | Generate service       |
| `vydra build`                     | Build for production   |
| `vydra dev`                       | Start dev server       |

### Configuration

`vydra.config.json`:

```json
{
  "name": "my-app",
  "type": "spa",
  "packages": ["@vydra-js/core", "@vydra-js/router"]
}
```

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────┐
│                      Application                            │
├────────────────────────────────────────────────────────────┤
│  Shell (Container)                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    Event Bus                         │  │
│  │              (pub/sub communication)                 │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────���────────────────────────────────────────────────────┤
│  Core Packages    │  Router   │  Bus    │  i18n          │
├─────────────────┴───────────┴─────────┴────────────────┤
│  HTTP           │  Forms      │  More...                  │
├──────────────────────────────────────────────────────────┤
│                    Microfrontends                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  App 1 │  │  App 2 │  │  App 3 │  │  Shell │    │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │
└────────────────────────────────────────────────────────────┘
```

### Microfrontend Lifecycle

1. **Bootstrap** - Load module
2. **Mount** - Render to DOM
3. **Navigate** - Handle routes
4. **Unmount** - Clean up

```typescript
import { createMicrofrontendLifecycle } from '@vydra-js/core';

export const lifecycle = createMicrofrontendLifecycle({
  rootTag: 'my-mf-root',
  rootComponent: MyComponent,
  onMount: async ({ mountPoint, rootConfig }, outlet) => {
    mountPoint.appendChild(outlet);
    // Initialize router, services
    return () => {
      /* cleanup */
    };
  },
});
```

---

## Advanced Guides

### Cross-MF Communication

#### Via Event Bus

```typescript
// MFE1 - emit
const bus = new VydraBus('global');
bus.emit('cart:add', { productId: '123' });

// MFE2 - subscribe
const bus = new VydraBus('global');
bus.subscribe('cart:add', ({ detail }) => {
  addToCart(detail.productId);
});
```

#### Via RPC

```typescript
// Handle
bus.respond<User, User | null>('user:get', async ({ detail }) => {
  return await fetchUser(detail.id);
});

// Request
const user = await bus.rpc<User | null>('user:get', { id: '123' });
```

### Lazy Loading

```typescript
const routes = [
  {
    path: '/admin',
    loader: () => import('./admin/admin-page'),
    tag: 'admin-page',
  },
];
```

### State Management

Each microfrontend manages its own state:

```typescript
// Store pattern (custom implementation)
class Store {
  private state = new Signal<State>(initialState);

  get() {
    return this.state.value;
  }
  set(value) {
    this.state.value = value;
  }
}
```

---

## API Reference

### Core

- `@Injectable()` - Class decorator for DI
- `Inject<T>()` - Inject service
- `createMicrofrontendLifecycle()` - MF lifecycle
- `ScopedElementsMixin` - Shadow DOM mixin
- `VydraNavigationService` - Navigation
- `VydraOutletBase` - Outlet component

### Router

- `VydraRouter` - Main router
- `RouteConfig` - Route definition
- `NavigateOptions` - Navigation options
- `VydraActivatedRoute` - Active route

### Bus

- `VydraBus` - Event bus
- `subscribe()` - Subscribe to event
- `emit()` - Emit event
- `rpc()` - Request-response
- `respond()` - Handle RPC

### Forms

- `FormControl` - Form field
- `FormGroup` - Form group
- `ValidatorFn` - Validator function
- `bindForm` - DOM binding directive

### HTTP

- `HttpBase` - Base HTTP class
- `HttpInterceptor` - Request/response interceptor
- `HttpRequestConfig` - Request config
- `HttpResponse` - Response

### i18n

- `I18nService` - Translation service
- `t()` - Translation function
- `setBasePath()` - Configure base path
- `load()` - Load translations
- `setLang()` - Change language

---

## Contributing

Contributions welcome! Please see our [contributing guide](CONTRIBUTING.md).

## License

MIT
