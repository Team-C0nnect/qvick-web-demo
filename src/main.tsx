import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/query-client'
import { ToastProvider } from './components/Toast'
import './index.css'

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
