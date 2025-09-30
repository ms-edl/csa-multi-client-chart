import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import LatencyPage from './LatencyPage'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LatencyPage />
  </React.StrictMode>,
)
