import axios, { AxiosError, AxiosInstance } from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    if (!config.headers)
      config.headers = {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const { response: res, config: originalRequest } = error

    if (res?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      ;(originalRequest as any)._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const { data } = await axios.post(
          '/api/token/refresh/',
          { refresh: refreshToken },
          { baseURL: API_BASE_URL, withCredentials: true },
        )
        const access = (data as any).access
        localStorage.setItem('access_token', access)
        if (!originalRequest.headers)
          originalRequest.headers = {}
        originalRequest.headers.Authorization = `Bearer ${access}`
        return api(originalRequest)
      }
      catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
      }
    }

    return Promise.reject(error)
  },
)

export const AUTH_API = {
  register: (data: any) => api.post('/api/user/register/', data),
  login: (data: any) => api.post('/api/user/signin/', data),
  logout: () => api.post('/api/user/logout/'),
  checkAuth: () => api.get('/api/user/check-auth/'),
}

export const USER_API = {
  getProfile: () => api.get('/api/user/profile/'),
  updateProfile: (data: any) => api.put('/api/user/profile/', data),
}

export default api

