/**
 * 콘텐츠 페이지 정적 생성기 (vite build 이후 실행)
 *
 * content/ 의 마크다운을 읽어 dist/ 에 완성된 HTML 을 써넣는다.
 * 자바스크립트 없이도 본문 텍스트가 초기 HTML 에 그대로 들어가야 하므로
 * (네이버·구글 크롤러 대응) SPA 번들과 분리된 정적 문서로 만든다.
 *
 *   content/about.md          -> dist/about/index.html
 *   content/blog/<slug>.md    -> dist/blog/<slug>/index.html + dist/blog/index.html
 *   (+ 모든 URL 을 담은 dist/sitemap.xml)
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT_DIR = join(ROOT, 'content')
const BLOG_DIR = join(CONTENT_DIR, 'blog')
const OUT_DIR = join(ROOT, 'dist')

// src/constants.ts 와 같은 값 (빌드 스크립트는 TS 를 읽지 않으므로 별도 정의)
const SITE_URL = 'https://pomori.kr'
const SITE_NAME = '포모리'
const AUTHOR_NAME = 'SuSung Kang'
const REPO_URL = 'https://github.com/susung1107/Pomori-timer'
const COPYRIGHT_YEAR = 2026
const OG_IMAGE = `${SITE_URL}/og-image.png`
const NAVER_VERIFICATION = '5ef14900153bfb7907d77a65d8800c189c25d7ca'
// 메인(/)은 콘텐츠가 아니라 앱이라 날짜를 따로 둔다.
const HOME_LASTMOD = '2026-09-02'

/* ---------- 마크다운 ---------- */

/**
 * frontmatter 파서 (YAML 의 최소 부분집합).
 * `key: value` 한 줄 형식만 지원하고, 값의 따옴표는 벗겨낸다.
 * keywords 는 쉼표로 나눠 배열로 만든다.
 */
function parseFrontmatter(raw, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) {
    throw new Error(`${file}: frontmatter(--- 블록)가 없습니다.`)
  }
  const data = {}
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const colon = line.indexOf(':')
    if (colon === -1) throw new Error(`${file}: frontmatter 형식 오류 -> ${line}`)
    const key = line.slice(0, colon).trim()
    const value = line
      .slice(colon + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    data[key] = key === 'keywords' ? splitKeywords(value) : value
  }
  return { data, body: raw.slice(match[0].length) }
}

function splitKeywords(value) {
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((k) => k.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function requireFields(data, fields, file) {
  for (const field of fields) {
    if (!data[field]) throw new Error(`${file}: frontmatter 에 ${field} 가 없습니다.`)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error(`${file}: date 는 YYYY-MM-DD 형식이어야 합니다 -> ${data.date}`)
  }
}

marked.use({ gfm: true, breaks: false })

/* ---------- 유틸 ---------- */

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// </script> 로 스크립트 블록이 조기 종료되지 않도록 < 를 이스케이프
function jsonLdScript(data) {
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">\n${json}\n    </script>`
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

// "제목 | 포모리" 처럼 붙은 사이트명은 headline 에서 뺀다.
function toHeadline(title) {
  return title.split('|')[0].trim()
}

function writePage(routePath, html) {
  const dir = routePath === '/' ? OUT_DIR : join(OUT_DIR, routePath)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

/* ---------- 페이지 셸 ---------- */

const THEME_INIT_SCRIPT = `(function () {
        try {
          var raw = localStorage.getItem('pomodoro-app-v1');
          var theme = null;
          var accent = null;
          if (raw) {
            var parsed = JSON.parse(raw);
            var s = parsed && parsed.state;
            if (s) {
              if (s.theme === 'dark' || s.theme === 'light') theme = s.theme;
              if (
                s.accent === 'blue' ||
                s.accent === 'green' ||
                s.accent === 'indigo' ||
                s.accent === 'amber'
              ) {
                accent = s.accent;
              }
            }
          }
          document.documentElement.setAttribute('data-theme', theme || 'light');
          document.documentElement.setAttribute('data-accent', accent || 'blue');
        } catch (e) {
          document.documentElement.setAttribute('data-theme', 'light');
          document.documentElement.setAttribute('data-accent', 'blue');
        }
      })();`

// 타이머 앱과 같은 저장소(zustand persist)에 테마만 병합 저장한다.
const THEME_TOGGLE_SCRIPT = `(function () {
      var button = document.getElementById('theme-toggle');
      if (!button) return;
      button.addEventListener('click', function () {
        var root = document.documentElement;
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try {
          var raw = localStorage.getItem('pomodoro-app-v1');
          var parsed = raw ? JSON.parse(raw) : null;
          if (!parsed || typeof parsed !== 'object') parsed = { state: {}, version: 1 };
          if (!parsed.state || typeof parsed.state !== 'object') parsed.state = {};
          parsed.state.theme = next;
          localStorage.setItem('pomodoro-app-v1', JSON.stringify(parsed));
        } catch (e) {
          /* 저장 실패해도 화면 전환은 유지 */
        }
      });
    })();`

const SUN_ICON = `<svg class="iconSun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>`
const MOON_ICON = `<svg class="iconMoon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>`

function navLink(href, label, current) {
  const attr = href === current ? ' aria-current="page"' : ''
  return `<a class="navLink" href="${href}"${attr}>${label}</a>`
}

function ctaSection() {
  return `<section class="cta">
          <p class="ctaTitle">지금 바로 한 뽀모도로</p>
          <p class="ctaDesc">설치도 회원가입도 없이, 브라우저에서 바로 시작할 수 있어요.</p>
          <a class="ctaButton" href="/">지금 25분 시작하기</a>
        </section>`
}

/**
 * 모든 콘텐츠 페이지가 공유하는 문서 셸.
 * index.html 의 메타 구성을 그대로 따르되 페이지별 값만 갈아끼운다.
 */
function layout({ route, title, description, keywords, ogType, jsonLd, body }) {
  const url = route === '/' ? `${SITE_URL}/` : `${SITE_URL}${route}`
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    ${keywords?.length ? `<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />\n    ` : ''}<link rel="canonical" href="${url}" />
    <meta name="theme-color" content="#F9FAFB" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0e1217" media="(prefers-color-scheme: dark)" />
    <meta name="naver-site-verification" content="${NAVER_VERIFICATION}" />

    <!-- Icons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/notification-icon.png" />

    <!-- Open Graph -->
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:locale" content="ko_KR" />

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />

    <!-- JSON-LD -->
    ${jsonLdScript(jsonLd)}

    <link
      rel="stylesheet"
      as="style"
      crossorigin
      href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
    />
    <link rel="stylesheet" href="/content.css" />
    <script>
      ${THEME_INIT_SCRIPT}
    </script>
  </head>
  <body>
    <div class="page">
      <header class="siteHeader">
        <div class="siteHeaderInner">
          <a class="brand" href="/">${SITE_NAME}</a>
          <nav class="nav">
            ${navLink('/', '타이머', route)}
            ${navLink('/about', '뽀모도로란', route)}
            ${navLink('/blog', '블로그', route)}
            <button
              id="theme-toggle"
              class="themeToggle"
              type="button"
              aria-label="테마 전환"
            >
              ${SUN_ICON}${MOON_ICON}
            </button>
          </nav>
        </div>
      </header>

      <main class="main">
${body}
      </main>

      <footer class="siteFooter">
        <span>© ${COPYRIGHT_YEAR} ${AUTHOR_NAME}</span>
        <span aria-hidden="true">·</span>
        <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">GitHub</a>
      </footer>
    </div>
    <script>
      ${THEME_TOGGLE_SCRIPT}
    </script>
  </body>
</html>
`
}

/* ---------- 스키마 ---------- */

function articleSchema({ route, title, description, keywords, date }) {
  const url = `${SITE_URL}${route}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: toHeadline(title),
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'ko',
    datePublished: date,
    dateModified: date,
    ...(keywords?.length ? { keywords: keywords.join(', ') } : {}),
    author: { '@type': 'Person', name: AUTHOR_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

/* ---------- 페이지 빌드 ---------- */

function loadDoc(path, file) {
  const { data, body } = parseFrontmatter(readFileSync(path, 'utf8'), file)
  requireFields(data, ['title', 'description', 'date', 'slug'], file)
  return { ...data, html: marked.parse(body).trim() }
}

function buildAbout() {
  const doc = loadDoc(join(CONTENT_DIR, 'about.md'), 'content/about.md')
  const route = '/about'
  const body = `        <article class="prose">
${doc.html}
        </article>

        ${ctaSection()}`
  writePage(route, layout({
    route,
    title: doc.title,
    description: doc.description,
    keywords: doc.keywords,
    ogType: 'article',
    jsonLd: articleSchema({ route, ...doc }),
    body,
  }))
  return { route, lastmod: doc.date }
}

function loadPosts() {
  let files = []
  try {
    files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'))
  } catch {
    return []
  }
  const posts = files.map((file) => {
    const doc = loadDoc(join(BLOG_DIR, file), `content/blog/${file}`)
    return { ...doc, route: `/blog/${doc.slug}` }
  })
  const seen = new Set()
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`slug 가 중복됩니다: ${post.slug}`)
    seen.add(post.slug)
  }
  // 최신 글이 위로
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

function buildPost(post) {
  const body = `        <article class="prose">
${post.html.replace(
    /^<h1>([\s\S]*?)<\/h1>/,
    `<h1>$1</h1>\n<p class="postMeta"><time datetime="${post.date}">${formatDate(post.date)}</time></p>`,
  )}
        </article>

        ${ctaSection()}`
  writePage(post.route, layout({
    route: post.route,
    title: `${post.title} | ${SITE_NAME} 블로그`,
    description: post.description,
    keywords: post.keywords,
    ogType: 'article',
    jsonLd: articleSchema({ ...post, title: post.title }),
    body,
  }))
}

function buildBlogIndex(posts) {
  const route = '/blog'
  const list = posts.length
    ? `<ul class="postList">
${posts
        .map(
          (post) => `          <li>
            <a class="postCard" href="${post.route}">
              <h2 class="postCardTitle">${escapeHtml(post.title)}</h2>
              <p class="postCardDesc">${escapeHtml(post.description)}</p>
              <time class="postCardDate" datetime="${post.date}">${formatDate(post.date)}</time>
            </a>
          </li>`,
        )
        .join('\n')}
        </ul>`
    : `<p class="empty">아직 발행된 글이 없습니다.</p>`

  const title = `블로그 | ${SITE_NAME}`
  const description = '집중과 휴식, 뽀모도로 기법에 대해 기록하는 포모리 블로그입니다.'
  const body = `        <div class="prose">
          <h1>블로그</h1>
          <p class="pageIntro">${description}</p>
        </div>

        ${list}

        ${ctaSection()}`

  writePage(route, layout({
    route,
    title,
    description,
    keywords: ['포모리', '뽀모도로', '집중력', '시간 관리'],
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${SITE_NAME} 블로그`,
      description,
      url: `${SITE_URL}${route}`,
      inLanguage: 'ko',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
      blogPost: posts.map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        url: `${SITE_URL}${post.route}`,
        datePublished: post.date,
      })),
    },
    body,
  }))

  return { route, lastmod: posts[0]?.date ?? HOME_LASTMOD }
}

function buildSitemap(entries) {
  const urls = entries
    .map(
      ({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join('\n')
  writeFileSync(
    join(OUT_DIR, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`,
  )
}

/* ---------- 실행 ---------- */

function main() {
  const about = buildAbout()
  const posts = loadPosts()
  posts.forEach(buildPost)
  const blog = buildBlogIndex(posts)

  // 토큰·리셋(src/index.css)을 그대로 얹어 타이머 앱과 같은 디자인을 쓴다.
  writeFileSync(
    join(OUT_DIR, 'content.css'),
    `${readFileSync(join(ROOT, 'src/index.css'), 'utf8')}\n${readFileSync(join(ROOT, 'scripts/content.css'), 'utf8')}`,
  )

  buildSitemap([
    { loc: `${SITE_URL}/`, lastmod: HOME_LASTMOD, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}${about.route}`, lastmod: about.lastmod, changefreq: 'monthly', priority: '0.8' },
    { loc: `${SITE_URL}${blog.route}`, lastmod: blog.lastmod, changefreq: 'weekly', priority: '0.7' },
    ...posts.map((post) => ({
      loc: `${SITE_URL}${post.route}`,
      lastmod: post.date,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ])

  console.log(`content: /about, /blog, 글 ${posts.length}개, sitemap.xml ${posts.length + 3}개 URL`)
}

main()
