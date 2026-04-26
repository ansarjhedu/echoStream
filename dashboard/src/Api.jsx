import axios from 'axios';

const api = axios.create({
  baseURL:  'https://echo-stream-pi.vercel.app/api', // Ensure this matches your backend port!
  withCredentials: true, 
});

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

// ==========================================
// 🧠 THE QUEUE SYSTEM (Prevents the 5-Car Pileup)
// ==========================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = []; // Clear the queue after processing
};

// ==========================================
// 📡 INTERCEPTORS (The Bouncer & The Refresh King)
// ==========================================

// Request Interceptor: Add the Access Token to every outgoing request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response Interceptor: Handle Token Expiration and Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do NOT intercept /users/login or /users/refresh routes. Let them fail normally.
    // This is important to prevent infinite loops and allow refresh failures to cascade.
    if (originalRequest.url.includes('/users/login') || originalRequest.url.includes('/users/refresh')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Mark the original request to prevent infinite retries

      // If a refresh is already in progress, add the original request to the queue
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
      }

      // If no refresh is in progress, start one
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          // Ping the refresh route using the simplified api object
          // This assumes the /users/refresh endpoint is designed to use httpOnly cookies for the refresh token
          const res = await api.post('/users/refresh');
          console.log(res); // Log the refresh response for debugging
          
          const newAccessToken = res.data.accessToken;
          setAccessToken(newAccessToken); // Update the global access token

          // Process all requests that were waiting in the queue
          processQueue(null, newAccessToken);
          
          // Re-attempt the original failed request with the new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(api(originalRequest));
        } catch (refreshError) {
          // If the refresh cookie is expired or the refresh fails for any reason
          setAccessToken(null); // Clear the access token
          localStorage.removeItem('has_session'); // Clear session indicator
          processQueue(refreshError); // Reject all waiting requests

          // Redirect to login page
          window.location.href = '/login';
          console.error('Failed to refresh token, redirecting to login:', refreshError);
          reject(refreshError); // Propagate the refresh error
        } finally {
          isRefreshing = false; // Reset the refreshing flag
        }
      });
    }
    
    return Promise.reject(error); // For any other errors, or 401s that are already retried
  }
);

export default api;