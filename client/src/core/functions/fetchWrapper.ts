import { RequestOptionsModel } from '@/core'

export const fetchWrapper = {
  get: request('GET'),
  post: request('POST'),
  put: request('PUT'),
  delete: request('DELETE'),
  upload: upload()
}

function request(method: string) {
  return (url: string, body = null) => {
    const requestOptions: RequestOptionsModel = {
      credentials: 'include',
      method,
      headers: authHeader()
    }
    if (body && body !== '') {
      requestOptions.headers['Content-Type'] = 'application/json'
      requestOptions.body = JSON.stringify(body)
    }
    // @ts-ignore
    return fetch(url, requestOptions).then(handleResponse)
  }
}

function upload() {
  return (url: string, file: any, fileField: string) => {
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

function authHeader(): any {
  // const { user } = useAuthStore();
  // const isLoggedIn = !!user?.id;
  // if (isLoggedIn) {
  //   return { Authorization: `Bearer ${user.id}` };
  // } else {
  //   return {};
  // }
}

function handleResponse(response: any) {
  return response.text().then((text: string) => {
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
