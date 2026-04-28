# @vydra-js/router

Declarative routing for Web Components with support for both SPA and microfrontend modes. Handles route matching, navigation guards, and lazy loading.

## Installation

```bash
npm install @vydra-js/router
```

## Quick Start

```typescript
import { VydraRouter, RouteConfig } from '@vydra-js/router';

const routes: RouteConfig[] = [
  { path: '/', tag: 'home-page' },
  { path: '/about', tag: 'about-page' },
  { path: '/users/:id', tag: 'user-page' },
];

const router = new VydraRouter({
  basePath: '/',
  mountPoint: document.getElementById('app')!,
  outlet: document.createElement('vydra-outlet'),
  routes,
});

router.init();
```

## API

### VydraRouter

Main router class.

```typescript
new VydraRouter(options: VydraRouterOptions)
```

#### Options

| Option       | Type            | Required | Description            |
| ------------ | --------------- | -------- | ---------------------- |
| `basePath`   | `string`        | Yes      | Base URL path          |
| `mountPoint` | `HTMLElement`   | Yes      | Element to render into |
| `outlet`     | `HTMLElement`   | Yes      | Outlet component       |
| `routes`     | `RouteConfig[]` | Yes      | Route definitions      |

#### Methods

##### `init(): Promise<void>`

Initializes router and performs initial navigation.

```typescript
await router.init();
```

##### `navigate(path: string, options?: NavigateOptions): Promise<void>`

Programmatic navigation.

```typescript
await router.navigate('/about');
await router.navigate('/users/123', { replace: true });
```

### Route Configuration

```typescript
interface RouteConfig {
  path: string;
  tag: string;
  children?: RouteConfig[];
  guards?: RouteGuardFn[];
  loader?: () => Promise<any>;
}
```

##### `path`

Route pattern with parameter support:

- `/users` - exact match
- `/users/:id` - parameter
- `/users/*` - wildcard

##### `tag`

Custom element tag to render when route matches.

##### `children`

Nested routes (inferred from codebase patterns).

##### `guards`

Route protection functions.

##### `loader`

Lazy load function for code splitting.

### Navigation Options

```typescript
interface NavigateOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
}
```

### VydraActivatedRoute

Current active route information.

```typescript
interface VydraActivatedRoute {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  data: Record<string, unknown>;
}
```

## Concepts

### Why Vydra Router?

- **Framework agnostic**: Works with any Web Component
- **Microfrontend ready**: Built-in support for cross-MF navigation
- **Lazy loading**: Route-based code splitting
- **Type-safe**: Full TypeScript support
- **Event-driven**: Emits navigation events via Event Bus

### Navigation Lifecycle

1. User clicks link or calls `navigate()`
2. Router checks guards
3. Route matching via regexparam
4. Component loading (if lazy)
5. Outlet renders component
6. Navigation event emitted

## Usage Examples

### Basic SPA Routing

```typescript
import { VydraRouter } from '@vydra-js/router';

const routes = [
  { path: '/', tag: 'home-page' },
  { path: '/products', tag: 'products-page' },
  { path: '/products/:id', tag: 'product-detail' },
];

const router = new VydraRouter({
  basePath: '/',
  mountPoint: document.getElementById('app')!,
  outlet: document.createElement('vydra-outlet'),
  routes,
});

await router.init();
```

### Lazy Loading Routes

```typescript
const routes: RouteConfig[] = [
  {
    path: '/admin',
    loader: () => import('./admin/admin-page'),
    tag: 'admin-page',
  },
];
```

### Route Guards

```typescript
const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    tag: 'dashboard-page',
    guards: [
      async () => {
        const auth = Inject(AuthService);
        if (!auth.isAuthenticated()) {
          return '/login';
        }
        return true;
      },
    ],
  },
];
```

### Microfrontend Navigation

```typescript
const router = new VydraRouter({
  basePath: '/app',
  mountPoint: document.getElementById('app')!,
  outlet,
  routes,
  onRedirectMicrofrontend: (nav) => {
    new VydraBus('global').emit('mf:switch-request', nav);
  },
});

await router.init();
```

### Programmatic Navigation

```typescript
class MyComponent extends LitElement {
  private router = new VydraRouter({
    /* options */
  });

  gotoAbout() {
    this.router.navigate('/about');
  }

  gotoUser(id: string) {
    this.router.navigate(`/users/${id}`);
  }
}
```

## Integration

### With Event Bus

Router emits navigation events:

```typescript
import { VydraBus } from '@vydra-js/bus';

const bus = new VydraBus('global');
bus.subscribe('router:navigate', (event) => {
  console.log('Navigated to:', event.detail.path);
});
```

### With Core

Router integrates with `@vydra-js/core`:

```typescript
import { VydraNavigationService } from '@vydra-js/core';

const nav = new VydraNavigationService();
nav.navigate('/about'); // Uses router internally
```

## Best Practices

1. **Define routes in a separate file**

   ```typescript
   // router.ts
   export const routes = [...]
   ```

2. **Use lazy loading for large pages**

   ```typescript
   { path: "/admin", loader: () => import("./admin") }
   ```

3. **Implement guards for protected routes**

   ```typescript
   { path: "/profile", guards: [requireAuth] }
   ```

4. **Handle 404 routes**
   ```typescript
   { path: "**", tag: "not-found-page" }
   ```

## Type Definitions

```typescript
type RouteGuardFn = (route: VydraActivatedRoute) => boolean | string | Promise<boolean | string>;

interface NavigateOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
}
```

## See Also

- [Core](../core/README.md) - Base framework
- [Event Bus](../bus/README.md) - Event system
- [Example App](https://github.com/vydra-js/vydra-examples) - Full routing example
