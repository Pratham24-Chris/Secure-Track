// Central API base URL — reads from .env file
// Locally: http://localhost:8080
// In production: set VITE_API_URL to your deployed backend URL (e.g. https://your-app.onrender.com)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default API_BASE;
