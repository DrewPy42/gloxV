interface ApiResponse<T = any> {
  data?: T;
  results?: T[];
  count?: Array<{ total: number }>;
  message?: string;
  error?: string;
}

interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
}

class FetchWrapper {
  private baseConfig: RequestConfig = {
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 10000
  };

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  private createRequestOptions(method: string, body?: any, config?: RequestConfig): RequestInit {
    const options: RequestInit = {
      method,
      headers: {
        ...this.baseConfig.headers,
        ...config?.headers
      }
    };

    if (body && method !== 'GET') {
      if (body instanceof FormData) {
        // Remove Content-Type for FormData to let browser set boundary
        delete (options.headers as Record<string, string>)['Content-Type'];
        options.body = body;
      } else {
        options.body = JSON.stringify(body);
      }
    }

    return options;
  }

  async get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const options = this.createRequestOptions('GET', null, config);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async post<T = any>(url: string, body?: any, config?: RequestConfig): Promise<T> {
    const options = this.createRequestOptions('POST', body, config);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async put<T = any>(url: string, body?: any, config?: RequestConfig): Promise<T> {
    const options = this.createRequestOptions('PUT', body, config);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    const options = this.createRequestOptions('DELETE', null, config);
    const response = await fetch(url, options);
    return this.handleResponse<T>(response);
  }

  async upload<T = any>(url: string, file: File, fileField: string = 'file', additionalData?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append(fileField, file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return this.post<T>(url, formData);
  }

  // Utility method for setting default headers (like auth tokens)
  setDefaultHeader(key: string, value: string): void {
    this.baseConfig.headers = this.baseConfig.headers || {};
    this.baseConfig.headers[key] = value;
  }

  // Utility method for removing default headers
  removeDefaultHeader(key: string): void {
    if (this.baseConfig.headers) {
      delete this.baseConfig.headers[key];
    }
  }
}

export const fetchWrapper = new FetchWrapper();
export type { ApiResponse, RequestConfig };