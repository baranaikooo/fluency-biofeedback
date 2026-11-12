import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

function mountApp() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

function showAndroidReturn() {
  const url = new URL(window.location.href)
  const fragment = new URLSearchParams(url.hash.slice(1))
  const isNative = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }).Capacitor?.isNativePlatform?.()
  if (isNative || !/Android/i.test(navigator.userAgent)) return false

  const accessToken = fragment.get('access_token')
  const refreshToken = fragment.get('refresh_token')
  const error = fragment.get('error') || url.searchParams.get('error')
  const appRequested = url.searchParams.get('glide_android') === '1'
  if (!(accessToken && refreshToken) && !(appRequested && error)) return false

  const params = accessToken && refreshToken
    ? new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken })
    : new URLSearchParams({ error: error! })
  const target = `com.fluency.biofeedback://auth-callback#${params}`
  const screen = document.getElementById('appLoadingScreen')!
  screen.setAttribute('role', 'region')
  screen.setAttribute('aria-label', 'Prihlásenie cez Google')
  screen.querySelector('p')!.textContent = 'Pokračuj v Glide alebo v prehliadači.'
  screen.querySelector('.startup-retry')?.remove()
  const open = document.createElement('button')
  open.type = 'button'
  open.className = 'startup-retry oauth-return-button'
  open.textContent = 'Otvoriť Glide'
  open.onclick = () => window.location.assign(target)
  const browser = document.createElement('button')
  browser.type = 'button'
  browser.className = 'startup-retry oauth-return-button'
  browser.textContent = 'Pokračovať v prehliadači'
  browser.onclick = mountApp
  screen.append(open, browser)
  if (appRequested) window.location.assign(target)
  return true
}

if (!showAndroidReturn()) mountApp()
