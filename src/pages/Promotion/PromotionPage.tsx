import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './PromotionPage.module.css'

type Stage = 'intro' | 'evolving' | 'flash' | 'evolved'

const CANCEL_MESSAGES = [
  '어림도 없죠 😎',
  '이미 늦었습니다…',
  '진심이세요…?',
  'B 버튼은 장식입니다',
  '승진은 취소할 수 없습니다!!',
]

const DIALOG_TEXT: Record<Stage, string> = {
  intro: '어…?! 고혜정의 상태가…!',
  evolving: '고혜정이(가) 진화하고 있다!',
  flash: '고혜정이(가) 진화하고 있다!',
  evolved: '축하합니다! 사원 고혜정은(는)\n주임 고혜정(으)로 진화했다! 🎉',
}

const STATS: { label: string; text?: string; pct?: number; gain: string }[] = [
  { label: '직급', text: '사원 → 주임', gain: 'RANK UP!' },
  { label: '짬', text: 'Lv.1 → Lv.2', gain: '+1' },
  { label: '위엄', pct: 80, gain: '+30' },
  { label: '연봉 협상력', pct: 60, gain: '+15' },
  { label: '야근 저항력', pct: 70, gain: '+20' },
]

const CONFETTI_COLORS = ['#ffe08a', '#ffb3c1', '#a5c8ff', '#a7f3d0', '#ddc7ff', '#ffd6a5']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  rot: number
  vr: number
  life: number
}

function useTyping(text: string, speed = 55) {
  const [state, setState] = useState({ text, count: 0 })
  if (state.text !== text) {
    setState({ text, count: 0 })
  }
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (s.count >= s.text.length) {
          clearInterval(id)
          return s
        }
        return { ...s, count: s.count + 1 }
      })
    }, speed)
    return () => clearInterval(id)
  }, [text, speed])
  const count = state.text === text ? state.count : 0
  return { typed: text.slice(0, count), done: count >= text.length }
}

function playFanfare() {
  try {
    const ctx = new AudioContext()
    const notes = [392, 523.25, 659.25, 783.99, 1046.5]
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.13
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.09, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.35)
    })
  } catch {
    // 사운드는 보너스 — 실패해도 연출은 계속된다
  }
}

export default function PromotionPage() {
  const [stage, setStage] = useState<Stage>('intro')
  const [cancelCount, setCancelCount] = useState(0)
  const [bump, setBump] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const burstRef = useRef<(xr?: number, yr?: number, count?: number) => void>(() => {})
  const { typed, done } = useTyping(DIALOG_TEXT[stage])

  useEffect(() => {
    const prev = document.title
    document.title = '🎉 고혜정 주임 승진!'
    return () => {
      document.title = prev
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let particles: Particle[] = []
    let raf = 0
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles = particles.filter((p) => p.life > 0)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.09
        p.vx *= 0.99
        p.rot += p.vr
        p.life -= 0.006
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.min(Math.max(p.life, 0), 1) * 0.9
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size / 2, p.size / 3.2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      raf = particles.length ? requestAnimationFrame(tick) : 0
    }
    burstRef.current = (xr = 0.5, yr = 0.42, count = 160) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 8
        particles.push({
          x: canvas.width * xr,
          y: canvas.height * yr,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: 5 + Math.random() * 6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          life: 1 + Math.random() * 0.3,
        })
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
      burstRef.current = () => {}
    }
  }, [])

  useEffect(() => {
    if (stage !== 'evolving') return
    const id = setTimeout(() => setStage('flash'), 4300)
    return () => clearTimeout(id)
  }, [stage])

  useEffect(() => {
    if (stage !== 'flash') return
    const id = setTimeout(() => {
      setStage('evolved')
      playFanfare()
      burstRef.current(0.5, 0.4, 180)
      setTimeout(() => burstRef.current(0.22, 0.3, 90), 350)
      setTimeout(() => burstRef.current(0.78, 0.3, 90), 700)
    }, 550)
    return () => clearTimeout(id)
  }, [stage])

  const handleCancel = useCallback(() => {
    setCancelCount((c) => c + 1)
  }, [])

  const handleCharClick = useCallback(() => {
    if (stage !== 'evolved') return
    setBump((b) => b + 1)
    burstRef.current(0.5, 0.45, 60)
  }, [stage])

  const replay = useCallback(() => {
    setStage('intro')
    setCancelCount(0)
    setBump(0)
  }, [])

  const isBefore = stage === 'intro' || stage === 'evolving' || stage === 'flash'
  const cancelMsg =
    cancelCount > 0 ? CANCEL_MESSAGES[Math.min(cancelCount - 1, CANCEL_MESSAGES.length - 1)] : null

  return (
    <div className={styles.page}>
      <div className={styles.stars} aria-hidden />
      {(stage === 'evolving' || stage === 'evolved') && <div className={styles.rays} aria-hidden />}

      <main className={styles.arena}>
        <div className={styles.nameTag}>
          {isBefore ? '사원 고혜정 Lv.1' : '주임 고혜정 Lv.2'}
        </div>

        <div className={styles.charWrap}>
          {stage === 'evolved' && <div className={styles.crown}>👑</div>}
          <button
            type="button"
            key={bump}
            className={[
              styles.character,
              stage === 'evolving' ? styles.evolving : '',
              cancelCount > 0 && stage === 'evolving' ? styles.shake : '',
              stage === 'evolved' ? styles.evolved : '',
              bump > 0 ? styles.bump : '',
            ].join(' ')}
            onClick={handleCharClick}
            aria-label={isBefore ? '사원 고혜정' : '주임 고혜정 (누르면 축하 폭죽!)'}
          >
            {isBefore ? '🐣' : '🐤'}
          </button>
        </div>

        {stage === 'evolved' && (
          <>
            <h1 className={styles.title}>승진을 축하합니다!</h1>
            <div className={styles.stats}>
              {STATS.map((s, i) => (
                <div className={styles.statRow} style={{ animationDelay: `${0.5 + i * 0.25}s` }} key={s.label}>
                  <span className={styles.statLabel}>{s.label}</span>
                  {s.pct !== undefined ? (
                    <span className={styles.statBar}>
                      <span
                        className={styles.statBarFill}
                        style={
                          {
                            '--pct': `${s.pct}%`,
                            animationDelay: `${0.7 + i * 0.25}s`,
                          } as React.CSSProperties
                        }
                      />
                    </span>
                  ) : (
                    <span className={styles.statValue}>{s.text}</span>
                  )}
                  <span className={styles.statGain}>{s.gain}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className={styles.dialog}>
          <p className={styles.dialogText}>
            {typed}
            {done && stage !== 'evolving' && <span className={styles.caret}>▼</span>}
          </p>

          {stage === 'intro' && done && (
            <button type="button" className={styles.primaryBtn} onClick={() => setStage('evolving')}>
              ▶ 지켜본다
            </button>
          )}

          {stage === 'evolving' && (
            <div className={styles.cancelArea}>
              {cancelMsg && (
                <p className={styles.cancelMsg} key={cancelCount}>
                  {cancelMsg}
                </p>
              )}
              <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                Ⓑ 눌러서 진화 취소
              </button>
            </div>
          )}

          {stage === 'evolved' && done && (
            <div className={styles.footerRow}>
              <p className={styles.footerMsg}>
                고혜정 주임님, 진심으로 축하드립니다! 🎉
                <br />
                <span className={styles.hint}>(병아리를 누르면 폭죽이 터져요)</span>
              </p>
              <button type="button" className={styles.replayBtn} onClick={replay}>
                ↻ 한 번 더 보기
              </button>
            </div>
          )}
        </div>
      </main>

      {stage === 'flash' && <div className={styles.flashIn} aria-hidden />}
      {stage === 'evolved' && <div className={styles.flashOut} aria-hidden />}
      <canvas ref={canvasRef} className={styles.confetti} aria-hidden />
    </div>
  )
}
