// API Configuration
const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const API_URL =
  env.VITE_API_URL ||
  (env.DEV ? "http://localhost:5000" : "https://supplylens.vercel.app");

export default API_URL;
