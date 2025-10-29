// src/lib/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || "").replace(/\/+$/, ""),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Content-Type"] = "application/json";
  return config;
});
