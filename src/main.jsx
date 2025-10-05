import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// register service worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = `${import.meta.env.BASE_URL}sw-v3.js?v=${Date.now()}`; // bust cache
    navigator.serviceWorker.register(url, { scope: import.meta.env.BASE_URL })
      .then(reg => reg.update())
      .catch(() => {});
  });
}

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
//   });
// }


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
