import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MethodPage from './ui/MethodPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MethodPage />
  </StrictMode>,
)
