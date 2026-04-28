# @vydra-js/forms

Reactive forms system for Web Components with validation, form groups, and automatic binding to DOM elements.

## Installation

```bash
npm install @vydra-js/forms
```

## Quick Start

```typescript
import { FormControl, FormGroup, required, email } from '@vydra-js/forms';

// Create form controls
const nameControl = new FormControl('', [required]);
const emailControl = new FormControl('', [email]);

// Create form group
const form = new FormGroup({
  name: nameControl,
  email: emailControl,
});

if (form.valid) {
  console.log(form.value); // { name: "...", email: "..." }
}
```

## API

### FormControl

Represents a single form field.

```typescript
new FormControl(value: T, validators?: ValidatorFn[])
```

#### Methods

##### `getValue(): T`

Returns the current value.

##### `setValue(value: T): void`

Sets a new value.

##### `patchValue(value: Partial<T>): void`

Patches partial value.

##### `reset(value?: T): void`

Resets to initial value.

##### `validate(): ValidationResult`

Runs all validators.

##### `hasError(error: string): boolean`

Checks for specific error.

##### `getError(error: string): unknown`

Gets error details.

##### `enabled: boolean`

Whether control is enabled.

##### `disabled: boolean`

Whether control is disabled.

##### `valid: boolean`

Whether control passes validation.

##### `invalid: boolean`

Whether control has errors.

##### `pristine: boolean`

Whether value hasn't changed.

##### `dirty: boolean`

Whether value has changed.

##### `touched: boolean`

Whether control has been focused/blurred.

### FormGroup

Groups multiple controls together.

```typescript
new FormGroup(controls: {[key: string]: FormControl}, validators?: ValidatorFn[])
```

#### Methods

##### `getControl(name: string): FormControl`

Gets a control by name.

##### `getAllControls(): FormControl[]`

Returns all controls.

##### `value: object`

Returns all values as object.

##### `reset(): void`

Resets all controls.

##### `valid: boolean`

Whether entire group is valid.

### Validator Functions

Built-in validators:

```typescript
// Required
required: ValidatorFn

// Email
email: ValidatorFn

// Min length
minLength(n: number): ValidatorFn

// Max length
maxLength(n: number): ValidatorFn

// Pattern (regex)
pattern(regex: RegExp, errorKey?: string): ValidatorFn
```

### Custom Validator

```typescript
const customValidator: ValidatorFn = (control: FormControl) => {
  if (control.getValue() === 'forbidden') {
    return { forbidden: true };
  }
  return null;
};
```

### BindForm Directive

Automatically connects FormGroup to DOM elements.

```typescript
import { bindForm } from '@vydra-js/forms';

// In template
html`<input type="text" ${bindForm(form, 'name')} />`;
```

This directive:

- Binds `value` property to control
- Listens to `input` events
- Updates control on change
- Handles validation display

## Concepts

### Reactive Forms

Vydra forms follow reactive patterns:

- **Immutable operations**: `setValue` vs `patchValue`
- **Push-based**: Value changes via events
- **Validation**: Synchronous and async

### Validation Flow

1. User interacts with input
2. `input` event fires
3. Control updates value
4. Validator functions run
5. `valid`/`invalid` states update
6. UI reflects state

## Usage Examples

### Login Form

```typescript
import { FormControl, FormGroup, required, email, pattern } from '@vydra-js/forms';

const loginForm = new FormGroup({
  email: new FormControl('', [required, email]),
  password: new FormControl('', [required, minLength(8)]),
});

const emailControl = loginForm.getControl('email');
const passwordControl = loginForm.getControl('password');

// Check form validity
if (loginForm.valid) {
  const data = loginForm.value;
  // Submit to server
}
```

### FormControl with Custom Validator

```typescript
import { FormControl, ValidatorFn } from '@vydra-js/forms';

const strongPassword: ValidatorFn = (control) => {
  const value = control.getValue();
  if (value.length < 8 || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return { strongPassword: true };
  }
  return null;
};

const password = new FormControl('', [required, strongPassword]);
```

### Using in Web Components

```typescript
import { ScopedElementsMixin } from '@vydra-js/core';
import { LitElement, html, css } from 'lit';
import { FormGroup, required, bindForm } from '@vydra-js/forms';

class LoginForm extends ScopedElementsMixin(LitElement) {
  static styles = css`
    input {
      display: block;
      margin-bottom: 8px;
    }
    .error {
      color: red;
    }
  `;

  private form = new FormGroup({
    username: new FormControl('', [required]),
    password: new FormControl('', [required]),
  });

  render() {
    const username = this.form.getControl('username');
    const password = this.form.getControl('password');

    return html`
      <form @submit=${this.handleSubmit}>
        <input type="text" placeholder="Username" ${bindForm(this.form, 'username')} />
        ${username.invalid ? html`<span class="error">Required</span>` : ''}

        <input type="password" placeholder="Password" ${bindForm(this.form, 'password')} />
        ${password.invalid ? html`<span class="error">Required</span>` : ''}

        <button type="submit" ?disabled=${this.form.invalid}>Login</button>
      </form>
    `;
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    console.log(this.form.value);
  }
}
```

### Validating Nested Groups

```typescript
const form = new FormGroup({
  name: new FormGroup({
    first: new FormControl('', [required]),
    last: new FormControl('', [required]),
  }),
  email: new FormControl('', [required, email]),
});

// Access nested values
form.getControl('name').getControl('first');
```

## Integration

### With HTTP

```typescript
import { HttpBase } from '@vydra-js/http';

class ApiService extends HttpBase {
  async login(credentials: ReturnType<typeof form.value>) {
    return this.post('/api/login', credentials);
  }
}
```

### With Event Bus

```typescript
import { VydraBus } from '@vydra-js/bus';

const bus = new VydraBus('global');
bus.subscribe('auth:logout', () => form.reset());
```

## Best Practices

1. **Group related controls**

   ```typescript
   // Good
   const form = new FormGroup({
     billing: new FormGroup({ street, city, zip }),
     shipping: new FormGroup({ street, city, zip }),
   });
   ```

2. **Use appropriate validators**

   ```typescript
   // Good - specific validation
   new FormControl('', [required, email, maxLength(100)]);
   ```

3. **Handle form reset**

   ```typescript
   form.reset(); // Resets to initial values
   ```

4. **Disable controls when needed**
   ```typescript
   control.disable(); // Disables validation and excluded from value
   ```

## Type Definitions

```typescript
type ValidatorFn = (control: FormControl) => ValidationResult | null;

type ValidationResult = Record<string, unknown> | null;

interface BindOptions {
  valueKey?: string;
  updateOn?: 'change' | 'blur' | 'submit';
}
```

## See Also

- [HTTP](../http/README.md) - API communication
- [Event Bus](../bus/README.md) - Event system
- [Example App](https://github.com/vydra-js/vydra-examples) - Forms example
