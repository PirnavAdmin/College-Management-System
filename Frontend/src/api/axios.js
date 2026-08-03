import axios from "axios";
 
const api = axios.create({
  baseURL: "https://chance-sulfide-blaming.ngrok-free.dev",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  }
});
 
export default api;