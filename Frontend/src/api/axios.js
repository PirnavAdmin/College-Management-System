import axios from "axios";
 
const api = axios.create({
  // baseURL: //"https://chance-sulfide-blaming.ngrok-free.dev",
  // "https://overblown-decibel-negate.ngrok-free.dev"
  // // headers: {
  // //   "Content-Type": "application/json",
  // //   "ngrok-skip-browser-warning": "true"
  // // }

  baseURL: "https://overblown-decibel-negate.ngrok-free.dev",

});
  
export default api;