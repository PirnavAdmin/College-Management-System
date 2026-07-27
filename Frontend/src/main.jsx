import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AuthApp from './AuthApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthApp />
  </StrictMode>,
)
