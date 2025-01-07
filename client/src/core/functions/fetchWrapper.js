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
    return fetch(url, requestOptions).then(() => {
      console.log('fetchWrapper', url, requestOptions);
      return handleResponse;
    })
  }
}

function upload() {
  return (url, file, fileField) => {
    const formData = new FormData()

    formData.append(fileField, file)
    const requestOptions = {
      method: 'POST',
      'Content-Type': 'multipart/form-data',
      body: formData
    }
    return fetch(url, requestOptions).then(handleResponse)
  }
}

// helper functions

  // const { user } = useAuthStore();
function authHeader() {
  // const isLoggedIn = !!user?.id;
  // if (isLoggedIn) {
  //   return { Authorization: `Bearer ${user.id}` };
  // } else {
  //   return {};
  // }
}

function handleResponse(response) {
  return response.text().then((text) => {
    const data = text && JSON.parse(text)

    if (!response.ok) {
      // const { user, logout } = useAuthStore();
      // if ([401, 403].includes(response.status) && user) {
      //   // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
      //   logout();
      // }
      const error = (data && data.msg) || response.msg
      return Promise.reject(error)
    }

    return data
  })
}
