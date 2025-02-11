export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE'),
  upload: upload()
}

function request(method) {
  return (url,body = null) => {
    const requestOptions = {
      method,
    }
    if (body && body !== '') {
      requestOptions.headers['Content-Type'] = 'application/json'
      requestOptions.body = JSON.stringify(body)
    }
    // @ts-ignore
    return fetch(url, requestOptions).then((response) => {
      return response.json();
      // return handleResponse;
    })
  }
}

function upload() {
  return (url, file, fileField) => {
    const formData = new FormData();

    formData.append(fileField, file);
    const requestOptions = {
      method: 'POST',
      body: formData
    };
    return fetch(url, requestOptions).then((response) => {
      return response.json();
    });
  }
}
