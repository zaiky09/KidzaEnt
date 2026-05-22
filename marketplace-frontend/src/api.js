// Centralized axios client. One place to swap the API base URL for prod,
// one place to inject the auth header.
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // ngrok free-tier serves a browser warning page in response to any
    // request that looks like a browser unless this header is present.
    // Real backends ignore unknown headers, so leaving this on always
    // is harmless.
    'ngrok-skip-browser-warning': 'true'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
