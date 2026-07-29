import axios from "axios";

const api = axios.create({
  baseURL: "https://sterile-retorted-tightness.ngrok-free.dev",
});

export default api;
