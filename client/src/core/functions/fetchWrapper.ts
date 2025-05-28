export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE'),
  upload: upload()
};

function request(method: string) {
  return (url: string, body: any = null): Promise<any> => {
    const requestOptions: RequestInit = {
      method,
      headers: {},
    };
    if (body && body !== '') {
      (requestOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
      requestOptions.body = JSON.stringify(body);
    }
    return fetch(url, requestOptions).then((response) => {
      return response.json();
    });
  };
}

function upload() {
  return (url: string, file: File, fileField: string): Promise<any> => {
    const formData = new FormData();
    formData.append(fileField, file);
    const requestOptions: RequestInit = {
      method: 'POST',
      body: formData,
    };
    return fetch(url, requestOptions).then((response) => {
      return response.json();
    });
  };
}