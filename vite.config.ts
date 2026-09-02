import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * /about, /blog 같은 콘텐츠 페이지는 빌드 후 scripts/build-content.mjs 가
 * dist/<경로>/index.html 로 생성한다. 배포 호스트(Cloudflare Pages, Netlify 등)는
 * 확장자 없는 경로를 해당 index.html 로 서빙하지만 vite preview 는 SPA fallback 이
 * 먼저 잡아버리므로, 로컬에서도 배포와 같은 결과를 보도록 경로만 보정한다.
 */
function contentPagesPreview(): Plugin {
  return {
    name: 'content-pages-preview',
    configurePreviewServer(server) {
      const outDir = join(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, _res, next) => {
        const path = (req.url ?? '/').split('?')[0]
        const isFileRequest = /\.[a-z0-9]+$/i.test(path)
        if (!isFileRequest && !path.endsWith('/') && existsSync(join(outDir, path, 'index.html'))) {
          req.url = `${path}/`
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), contentPagesPreview()],
})
