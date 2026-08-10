import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { ToastProvider } from './components/Toast'
import './index.css'

const CHUNK_RELOAD_KEY = 'qvick:chunk-reload-at'
const CHUNK_RELOAD_COOLDOWN_MS = 10_000

// 새 배포로 이전 해시 청크가 사라진 경우 최신 index.html을 한 번 다시 불러옵니다.
window.addEventListener('vite:preloadError', (event) => {
  const lastReloadAt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? 0)

  if (Date.now() - lastReloadAt < CHUNK_RELOAD_COOLDOWN_MS) return

  event.preventDefault()
  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()))
  window.location.reload()
})

// 이전 버전에서 영구 저장된 토큰은 폐기하고 현재 탭 세션의 토큰만 사용합니다.
localStorage.removeItem('accessToken')
localStorage.removeItem('refreshToken')
localStorage.removeItem('tempAccessToken')
localStorage.removeItem('tempRefreshToken')
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
