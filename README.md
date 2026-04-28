# Vydra JS

Composable microfrontends with Web Components

[Website](https://vydra.dev) • [Documentation](docs.md) • [CLI](vydra-cli/README.md) • [Examples](https://github.com/vydra-js/vydra-examples)

## Why Vydra?

Vydra is a modern frontend framework built on Web Components with Lit, designed from the ground up for **microfrontends architecture**. It provides everything you need to build scalable, decoupled applications that can be developed, deployed, and scaled independently.

## Features

- **Microfrontends Desacoplados** - Each microfrontend runs independently with its own lifecycle
- **Event-Driven Architecture** - Built-in Event Bus for cross-MF communication via pub/sub
- **Based on Web Standards** - No custom framework concepts; uses native Web Components
- **Full CLI Integration** - Scaffolding, generators, and build tools
- **Type-Safe** - Full TypeScript support with decorators

## Quick Start

```bash
npm create vydra-app my-app
cd my-app
npm run dev
```

Or install packages individually:

```bash
npm install @vydra-js/core @vydra-js/router @vydra-js/bus @vydra-js/forms @vydra-js/http @vydra-js/i18n
```

## Example

```typescript
import { Injectable, Inject, ScopedElementsMixin } from '@vydra-js/core';
import { VydraRouter } from '@vydra-js/router';
import { VydraBus } from '@vydra-js/bus';
import { FormControl, FormGroup, required } from '@vydra-js/forms';
import { html, css } from 'lit';

@Injectable()
class UserService {
  getUser() {
    return { name: 'John' };
  }
}

class MyPage extends ScopedElementsMixin(LitElement) {
  static styles = css`
    h1 {
      color: blue;
    }
  `;
  private userService = Inject(UserService);
  private form = new FormGroup({
    name: new FormControl('', [required]),
  });

  render() {
    const bus = new VydraBus('global');
    bus.emit('user:view', { user: this.userService.getUser() });

    return html` <h1>Hello, ${this.userService.getUser().name}</h1> `;
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Application                       │
├─────────────────────────────────────────────────────┤
│  Shell / Container                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │              Event Bus (global)               │  │
│  └───────────────────────────────────────────────┘  │
├─────────────┬─────────────┬─────────────┬─────────────┤
│    Core     │   Router    │    Bus     │    i18n    │
│  (DI,Base) │ (Navigation) │ (Events)   │ (Translations)│
├─────────────┬─────────────┬─────────────────────────────┤
│    HTTP    │   Forms     │         Packages          │
│  (Requests)│(Validation)│    (Microfrontends)   │
├─────────────┬─────────────┬─────────────────────────────┤
│  MFE: App1 │  MFE: App2  │    MFE: AppN                │
│  (Routes)  │  (Routes)   │    (Routes)                 │
└─────────────┴─────────────┴─────────────────────────────┘
```

### Core Package (`@vydra-js/core`)

- Dependency Injection with `@Injectable()` and `Inject()`
- Microfrontend lifecycle management (single-spa alternative)
- Base classes: `VydraOutletBase`, `VydraNavigationService`
- `ScopedElementsMixin` for Shadow DOM isolation

### Router Package (`@vydra-js/router`)

- Declarative routing with route parameters
- Navigation guards
- Lazy loading via code splitting
- Cross-MF navigation support
- Integration with Event Bus for navigation events

### Bus Package (`@vydra-js/bus`)

- Scoped pub/sub system
- Cross-microfrontend communication
- RPC support for request-response patterns
- Isolation via scopes (`global`, `mfe:<name>`)

### Forms Package (`@vydra-js/forms`)

- Reactive forms with `FormControl` and `FormGroup`
- Built-in validators (`required`, `email`, `minLength`, etc.)
- `bindForm` directive for automatic DOM binding
- Full validation state tracking

### HTTP Package (`@vydra-js/http`)

- HTTP client extending `HttpBase`
- Request/response interceptors
- Automatic JSON handling
- Integration with Event Bus

### i18n Package (`@vydra-js/i18n`)

- Translation management
- Lazy locale loading
- Parameter interpolation
- Reactive updates via Lit Context

## Packages

| Package            | Description                 | Status |
| ------------------ | --------------------------- | ------ |
| `@vydra-js/core`   | DI, lifecycle, base classes | Beta   |
| `@vydra-js/router` | Navigation & routing        | Beta   |
| `@vydra-js/bus`    | Event Bus & pub/sub         | Beta   |
| `@vydra-js/forms`  | Reactive forms              | Beta   |
| `@vydra-js/http`   | HTTP client                 | Beta   |
| `@vydra-js/i18n`   | Internationalization        | Beta   |

## CLI

The Vydra CLI provides scaffolding and generators:

```bash
# Create new application
vydra create app my-app

# Generate component
vydra generate component my-component

# Build for production
vydra build

# Start dev server
vydra dev
```

See [vydra-cli README](vydra-cli/README.md) for full documentation.

## Philosophy

### Decoupling

Each microfrontend is independent:

- Own routing
- Own state
- Own dependencies
- Can be deployed separately

### Configuration over Coupling

- Use Event Bus for communication
- Avoid direct imports between MFs
- Share contracts via generic events

### Event-Driven

- All inter-app communication via events
- Router publishes navigation events
- HTTP publishes request/response events
- Forms publish validation events

## Comparison

| Feature        | Vydra    | Angular           | React         | single-spa |
| -------------- | -------- | ----------------- | ------------- | ---------- |
| Microfrontends | Built-in | Module Federation | Multiple apps | Required   |
| Web Components | Native   | No                | No            | Optional   |
| Event Bus      | Built-in | Services          | Context       | No         |
| Reactive Forms | Built-in | Built-in          | Libraries     | No         |
| CLI            | Yes      | Yes               | CRA/Vite      | No         |
| Bundle Size    | ~50KB    | ~500KB            | ~40KB\*       | ~20KB      |

\*With React Router + Context

## Resources

- [Documentation](docs.md)
- [API Reference](packages/*/README.md)
- [Examples](https://github.com/vydra-js/vydra-examples)
- [CLI Guide](vydra-cli/README.md)

## Contributing

Contributions welcome! Please read our [contributing guide](CONTRIBUTING.md).

## License

MIT
