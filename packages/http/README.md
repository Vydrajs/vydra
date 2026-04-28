# @vydra-js/http

HTTP client for making API requests with interceptors, automatic JSON handling, and integration with the Event Bus.

## Installation

```bash
npm install @vydra-js/http
```

## Quick Start

```typescript
import { HttpBase } from '@vydra-js/http';

class ApiService extends HttpBase {
  constructor() {
    super({
      baseUrl: '/api',
    });
  }

  async getUsers() {
    return this.get('/users');
  }

  async createUser(data: any) {
    return this.post('/users', data);
  }

  async updateUser(id: string, data: any) {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`);
  }
}

const api = new ApiService();
const users = await api.getUsers();
```

## API

### HttpBase

Base class for HTTP services.

```typescript
class HttpBase {
  constructor(options?: HttpOptions);
}
```

#### Options

```typescript
interface HttpOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  interceptors?: HttpInterceptor[];
}
```

#### Methods

##### `request<T>(config: HttpRequestConfig): Promise<HttpResponse<T>>`

Generic request method.

```typescript
const response = await api.request({
  method: 'GET',
  url: '/users',
});
```

##### `get<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>`

GET request.

```typescript
const users = await api.get('/users');
```

##### `post<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>`

POST request.

```typescript
const newUser = await api.post('/users', { name: 'John' });
```

##### `put<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>`

PUT request.

```typescript
const updated = await api.put('/users/1', { name: 'Jane' });
```

##### `patch<T>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>`

PATCH request.

```typescript
const patched = await api.patch('/users/1', { name: 'Jane' });
```

##### `delete<T>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>`

DELETE request.

```typescript
await api.delete('/users/1');
```

### Interceptors

#### `HttpInterceptor`

```typescript
interface HttpInterceptor {
  request?: (config: HttpRequestConfig) => HttpRequestConfig | Promise<HttpRequestConfig>;
  response?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>;
  error?: (error: any) => any | Promise<any>;
}
```

#### Adding Interceptors

```typescript
class ApiService extends HttpBase {
  constructor() {
    super({
      baseUrl: '/api',
      interceptors: [
        {
          request: (config) => ({
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${token}`,
            },
          }),
        },
        {
          response: async (response) => {
            // Handle 401 responses
            if (response.status === 401) {
              // Redirect to login
            }
            return response;
          },
        },
      ],
    });
  }
}
```

### Request Configuration

```typescript
interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
}
```

### Response

```typescript
interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
```

## Concepts

### Why HttpBase?

- **Extensible**: Extend and customize per service
- **Interceptor-based**: Add auth, logging, caching
- **Type-safe**: Full TypeScript generics
- **Event Bus integration**: Emit events for request/response

### Request Flow

1. Call `get`, `post`, etc.
2. Apply request interceptors
3. Execute fetch
4. Apply response interceptors
5. Return parsed response

## Usage Examples

### Auth Service

```typescript
import { HttpBase, HttpInterceptor } from '@vydra-js/http';

class AuthService extends HttpBase {
  private token = '';

  constructor() {
    super({
      baseUrl: '/api',
      interceptors: [
        {
          request: (config) => ({
            ...config,
            headers: {
              ...config.headers,
              Authorization: `Bearer ${this.token}`,
            },
          }),
        },
      ],
    });
  }

  async login(credentials: any) {
    const response = await this.post('/auth/login', credentials);
    this.token = response.data.token;
    return response.data;
  }

  async logout() {
    await this.post('/auth/logout');
    this.token = '';
  }
}
```

### User Service

```typescript
import { HttpBase } from '@vydra-js/http';

interface User {
  id: string;
  name: string;
  email: string;
}

class UserService extends HttpBase {
  constructor() {
    super({ baseUrl: '/api' });
  }

  async getUsers(): Promise<User[]> {
    const response = await this.get<User[]>('/users');
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.get<User>(`/users/${id}`);
    return response.data;
  }

  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const response = await this.post<User>('/users', user);
    return response.data;
  }

  async updateUser(id: string, user: Partial<User>): Promise<User> {
    const response = await this.put<User>(`/users/${id}`, user);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.delete(`/users/${id}`);
  }
}
```

### Error Handling Interceptor

```typescript
import { HttpBase, HttpInterceptor } from '@vydra-js/http';

const errorInterceptor: HttpInterceptor = {
  error: async (error) => {
    if (error.response?.status === 403) {
      console.error('Forbidden');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    }
    throw error;
  },
};
```

### Logging Interceptor

```typescript
const loggingInterceptor: HttpInterceptor = {
  request: (config) => {
    console.log(`Request: ${config.method} ${config.url}`);
    return config;
  },
  response: (response) => {
    console.log(`Response: ${response.status}`);
    return response;
  },
};
```

## Integration

### With Event Bus

```typescript
import { VydraBus } from '@vydra-js/bus';

class ApiService extends HttpBase {
  constructor() {
    super({
      baseUrl: '/api',
      interceptors: [
        {
          request: (config) => {
            new VydraBus('global').emit('http:request', config);
            return config;
          },
        },
      ],
    });
  }
}
```

### With Forms

```typescript
import { FormGroup } from '@vydra-js/forms';

class UserService extends HttpBase {
  async saveUser(form: FormGroup) {
    const data = form.value;
    return this.post('/users', data);
  }
}
```

## Best Practices

1. **Create service classes per domain**

   ```typescript
   class UserService extends HttpBase { ... }
   class ProductService extends HttpBase { ... }
   ```

2. **Use interceptors for cross-cutting concerns**

   ```typescript
   // Auth, logging, error handling
   ```

3. **Handle errors appropriately**

   ```typescript
   try {
     await api.getUser(id);
   } catch (error) {
     // Handle 404, 500, etc.
   }
   ```

4. **Use type generics**
   ```typescript
   const users = await api.get<User[]>('/users');
   ```

## Type Definitions

```typescript
interface HttpOptions {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  interceptors?: HttpInterceptor[];
}

interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
}

interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}
```

## See Also

- [Forms](../forms/README.md) - Form handling
- [Event Bus](../bus/README.md) - Event system
- [Example App](https://github.com/vydra-js/vydra-examples) - HTTP usage
