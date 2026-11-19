import axios from 'axios';

const backendBase = (import.meta.env.VITE_BACKEND_URL || '/api')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/\/$/, '');

const api = axios.create({
  baseURL: backendBase,
  withCredentials: true, 
});
let accessToken = null;
let refreshPromise = null;
const inflightGets = new Map();

export const setAccessToken = (token) => {
  accessToken = token;
};

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = api.post('/users/refresh')
      .then((res) => {
        const token = res.data.accessToken;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

// 1. Attach Access Token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 2. One session refresh for every request that fails together
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest?.url) return Promise.reject(error);

    // Do NOT intercept /login or /refresh routes. Let them fail normally.
    if (originalRequest.url.includes('/users/login') || originalRequest.url.includes('/users/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        localStorage.removeItem('has_session');
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/forgot-password')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const requestGet = api.get.bind(api);
api.get = (url, config = {}) => {
  const key = `${url}?${JSON.stringify(config.params || {})}`;
  const existing = inflightGets.get(key);
  if (existing) return existing;
  const request = requestGet(url, config).finally(() => {
    if (inflightGets.get(key) === request) inflightGets.delete(key);
  });
  inflightGets.set(key, request);
  return request;
};

export default api;
