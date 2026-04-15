import axios from "axios";

// In production: VITE_API_URL = https://your-server.vercel.app/api
// In local dev:  Vite proxy forwards /api → http://localhost:5000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/sign-in";
    }
    return Promise.reject(err);
  }
);

export default api;
