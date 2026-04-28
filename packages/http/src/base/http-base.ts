export type HttpInterceptor = {
  request?: (config: HttpRequestConfig) => Promise<HttpRequestConfig> | HttpRequestConfig;
  response?: (response: Response) => Promise<Response> | Response;
  error?: (error: any) => Promise<any> | any;
};

export interface HttpRequestConfig extends RequestInit {
  url: string;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'text' | 'arrayBuffer';
}

export class HttpBase {
  private readonly baseUrl: string;
  private interceptors: HttpInterceptor[] = [];

  constructor(options: { baseUrl: string }) {
    if (!options.baseUrl) {
      // eslint-disable-next-line no-console
      console.error('[HttpBase] Base URL is required', options);
      throw new Error('[HttpBase] Base URL is required');
    }
    this.baseUrl = this.sanitizeBaseUrl(options.baseUrl);
  }

  private sanitizeBaseUrl(url: string): string {
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  use(interceptor: HttpInterceptor) {
    this.interceptors.push(interceptor);
  }

  private buildFullUrl(path: string, params?: Record<string, any>): string {
    const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = new URL(`${this.baseUrl}${sanitizedPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            Object.entries(value).forEach(([subKey, subValue]) => {
              fullUrl.searchParams.append(`${key}.${subKey}`, String(subValue));
            });
          } else {
            fullUrl.searchParams.append(key, String(value));
          }
        }
      });
    }
    return fullUrl.toString();
  }

  private prepareBody(body: any, headers: any): any {
    if (!body) return null;

    if (body instanceof FormData || body instanceof Blob || body instanceof ArrayBuffer) {
      headers.delete('Content-Type');
      return body;
    }
    headers['Content-Type'] = 'application/json';
    return typeof body === 'object' ? JSON.stringify(body) : body;
  }

  private async parseResponse<T>(response: Response, responseType: string): Promise<T> {
    if (response.status === 204) return null as any;

    try {
      if (responseType === 'json') {
        const text = await response.text();
        return text ? JSON.parse(text) : ({} as T);
      }
      return (await (response as any)[responseType]()) as T;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[HttpBase] Error parsing as ${responseType}`, err);
      return null as any;
    }
  }

  private async request<T = any>(config: HttpRequestConfig): Promise<T> {
    const headers: any = {};

    let finalConfig: HttpRequestConfig = {
      ...config,
      url: this.buildFullUrl(config.url, config.params),
      headers,
      body: this.prepareBody(config.body, headers),
    };

    try {
      for (const i of this.interceptors) {
        if (i.request) finalConfig = await i.request(finalConfig);
      }

      let response = await fetch(finalConfig.url, finalConfig);

      for (const i of this.interceptors) {
        if (i.response) response = await i.response(response);
      }

      if (!response.ok)
        throw await this.parseResponse<T>(response, finalConfig.responseType || 'json');

      return await this.parseResponse<T>(response, finalConfig.responseType || 'json');
    } catch (error) {
      let processedError = error;
      for (const i of this.interceptors) {
        if (i.error) processedError = await i.error(processedError);
      }
      throw processedError;
    }
  }

  get<T>(url: string, options: Partial<HttpRequestConfig> = {}) {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  post<T>(url: string, body: any, options: Partial<HttpRequestConfig> = {}) {
    return this.request<T>({ ...options, method: 'POST', url, body });
  }

  put<T>(url: string, body: any, options: Partial<HttpRequestConfig> = {}) {
    return this.request<T>({ ...options, method: 'PUT', url, body });
  }

  patch<T>(url: string, body: any, options: Partial<HttpRequestConfig> = {}) {
    return this.request<T>({ ...options, method: 'PATCH', url, body });
  }

  delete<T>(url: string, options: Partial<HttpRequestConfig> = {}) {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }
  getBlob(url: string, options: Partial<HttpRequestConfig> = {}) {
    return this.get<Blob>(url, { ...options, responseType: 'blob' });
  }

  rawRequest<T>(method: any, path: string, options: RequestInit) {
    return this.request<T>({ ...options, method, url: path });
  }
}
