import axios from 'axios';


const api = axios.create({
  baseURL:  'https://echo-stream-pi.vercel.app/api', // Ensure this matches your backend port!
  withCredentials: true, 
});

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

// 1. Attach Access Token
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 2. Handle 401 Expirations
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do NOT intercept /login or /refresh routes. Let them fail normally.
    if (originalRequest.url.includes('/users/login') || originalRequest.url.includes('/users/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Ping the refresh route using the simplified api object
        const res = await api.post('/users/refresh');
        console.log(res)
        
        setAccessToken(res.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        // If the refresh cookie is expired, log them out and redirect
        setAccessToken(null);
        localStorage.removeItem('has_session');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;