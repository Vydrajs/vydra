# @vydra-js/i18n

Internationalization service for Web Components with locale management, translation loading, and reactive updates via Lit context.

## Installation

```bash
npm install @vydra-js/i18n
```

## Quick Start

```typescript
import { I18nService } from '@vydra-js/i18n';

// Set base path for locale files
I18nService.setBasePath('/locales');

// Load translations
await I18nService.load('en');
await I18nService.load('es');

// Use in component
import { t } from '@vydra-js/i18n';

class MyComponent extends LitElement {
  render() {
    return html`<p>${t('hello')}</p>`; // "Hello" or "Hola"
  }
}
```

## API

### I18nService

Singleton service for managing translations.

#### Methods

##### `setBasePath(path: string): void`

Sets the base URL path for loading locale files.

```typescript
I18nService.setBasePath('/locales');
```

##### `load(lang: string, url?: string): Promise<void>`

Loads translations for a language.

```typescript
await I18nService.load('en');
await I18nService.load('es', '/custom/path/es.json');
```

##### `setLang(lang: string): Promise<void>`

Changes the current language.

```typescript
await I18nService.setLang('es');
```

##### `getLang(): string`

Returns current language.

```typescript
const lang = I18nService.getLang();
```

##### `get(key: string, params?: Record<string, string>): string`

Gets a translation by key.

```typescript
const greeting = I18nService.get('hello'); // "Hello"
const greeting = I18nService.get('greeting', { name: 'John' }); // "Hello, John"
```

##### `getAll(): Record<string, string>`

Returns all translations for current language.

```typescript
const translations = I18nService.getAll();
```

### `t()` Function

Shorthand for `I18nService.get()`.

```typescript
import { t } from '@vydra-js/i18n';

html`<p>${t('welcome')}</p>`;
```

### Locale Files

JSON format:

```json
// locales/en.json
{
  "hello": "Hello",
  "greeting": "Hello, {name}",
  "items": "{count} items"
}

// locales/es.json
{
  "hello": "Hola",
  "greeting": "Hola, {name}",
  "items": "{count} elementos"
}
```

### `@i18n` Decorator (inferido)

Auto-connects component properties to translations.

```typescript
class MyComponent extends LitElement {
  @i18n() greeting = 'hello';
}
```

### Context Integration

Uses `@lit/context` for reactive locale updates across components.

```typescript
import { localeContext } from "@vydra-js/i18n";

// In component
static styles = css`...`;
static contextDefinitions = {
  locale: { context: localeContext },
};

async onLocaleChange() {
  const locale = await this.getContext("locale");
  // Re-render when locale changes
}
```

## Concepts

### Why i18n?

- **Reactive**: Updates automatically when language changes
- **Lazy loading**: Load only needed locales
- **Interpolation**: Support parameters in translations
- **Context-based**: Lit context for state sharing

### Translation Flow

1. Call `I18nService.load(lang)`
2. Fetch JSON from basePath/lang.json
3. Store in service
4. On `setLang`, notify all subscribers
5. Components re-render with new translations

## Usage Examples

### Setting Up i18n

```typescript
// main.ts
import { I18nService } from '@vydra-js/i18n';

I18nService.setBasePath('/locales');

// Load default language
await I18nService.load('en');
```

### Using in Components

```typescript
import { ScopedElementsMixin } from '@vydra-js/core';
import { LitElement, html, css } from 'lit';
import { t } from '@vydra-js/i18n';

class WelcomePage extends ScopedElementsMixin(LitElement) {
  static styles = css`
    h1 {
      font-size: 2rem;
    }
  `;

  render() {
    return html`
      <h1>${t('welcome')}</h1>
      <p>${t('greeting', { name: 'John' })}</p>
    `;
  }
}
```

### Switching Languages

```typescript
import { I18nService } from '@vydra-js/i18n';

class LanguageSwitcher extends LitElement {
  private switchLanguage(lang: string) {
    I18nService.setLang(lang);
  }

  render() {
    return html`
      <button @click=${() => this.switchLanguage('en')}>English</button>
      <button @click=${() => this.switchLanguage('es')}>Español</button>
    `;
  }
}
```

### Nested Keys

```typescript
// locales/en.json
{
  "nav": {
    "home": "Home",
    "about": "About"
  }
}

// Usage
t("nav.home"); // "Home"
```

### Pluralization (inferido)

```typescript
// locales/en.json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

## Integration

### With Event Bus

```typescript
import { VydraBus } from '@vydra-js/bus';

const bus = new VydraBus('global');
bus.subscribe('i18n:change', (event) => {
  console.log('Language changed to:', event.detail.lang);
});
```

### With Forms

```typescript
import { FormControl } from '@vydra-js/forms';

const form = new FormGroup({
  language: new FormControl('en'),
});

form.getControl('language').valueChanges.subscribe((lang) => {
  I18nService.setLang(lang);
});
```

## Best Practices

1. **Load only needed languages**

   ```typescript
   await I18nService.load('en');
   await I18nService.load('es');
   ```

2. **Use meaningful keys**

   ```typescript
   // Good
   'user.login.button';

   // Bad
   'button1';
   ```

3. **Provide fallbacks**

   ```typescript
   const text = I18nService.get(key) || key;
   ```

4. **Centralize configuration**
   ```typescript
   // config/i18n.ts
   export function initI18n() {
     I18nService.setBasePath('/locales');
     await I18nService.load('en');
   }
   ```

## Locale File Structure

```json
{
  "app": {
    "title": "My App",
    "tagline": "Build better apps"
  },
  "nav": {
    "home": "Home",
    "about": "About"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "errors": {
    "network": "Network error",
    "validation": "Please check your input"
  }
}
```

## See Also

- [Core](../core/README.md) - Base framework
- [Event Bus](../bus/README.md) - Event system
- [Example App](https://github.com/vydra-js/vydra-examples) - i18n usage
