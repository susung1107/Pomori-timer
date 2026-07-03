import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'

// eslint-disable-next-line react-refresh/only-export-components -- 엔트리 파일이라 fast refresh 대상 아님
const PromotionPage = lazy(() => import('./pages/Promotion/PromotionPage'))
const isPromotionPage =
  window.location.pathname.replace(/\/+$/, '') === '/happy/go/upgrade'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isPromotionPage ? (
        <Suspense fallback={null}>
          <PromotionPage />
        </Suspense>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
)
