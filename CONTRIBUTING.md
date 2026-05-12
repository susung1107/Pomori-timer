# 포모리 기여 가이드

기여해주셔서 감사해요. 작은 버그 리포트도 큰 도움이 됩니다.

## 시작하기

```bash
git clone https://github.com/susung1107/Pomori-timer.git
cd Pomori-timer
npm install
npm run dev
```

요구 환경:
- Node.js 20+
- npm 10+

## 프로젝트 구조

```
src/
├── App.tsx                       # 최상위 (전역 훅, 모달 상태, 모바일/데스크탑 분기)
├── main.tsx                      # 엔트리 + ErrorBoundary
├── index.css                     # 전역 CSS 변수 (테마/액센트)
├── constants.ts                  # 앱 메타, 시간 제약, 외부 링크
├── types.ts                      # 공통 타입 (TimerStatus, Task, Theme, Accent 등)
├── components/
│   ├── Header/                   # 상단 헤더 (모바일은 두 줄, 데스크탑은 한 줄)
│   ├── Timer/                    # 시계, 디지털, 풀스크린, 액션 버튼
│   │   ├── Timer.tsx
│   │   ├── ClockFace.tsx         # 진행 링 (rAF로 직접 DOM 갱신) + 시계 텍스트
│   │   ├── Digit.tsx             # 자릿수 슬롯 롤 애니메이션
│   │   └── FocusOverlay.tsx      # 풀스크린 포커스 모드
│   ├── TaskBoard/                # 데스크탑 작업 큐 (DnD, 인라인 사이드 패널)
│   ├── MobileCurrentCard/        # 모바일 전용 — 시계 위 현재 작업 카드
│   ├── MobileTaskBoard/          # 모바일 전용 — 전체화면 큐 관리 모달
│   ├── CompletedTasks/           # 오늘의 기록 모달
│   ├── Settings/                 # 설정 모달 (탭 구성)
│   ├── Guide/                    # 첫 진입 / 도움말 가이드 모달
│   ├── Footer/                   # 카피라이트 + GitHub 링크
│   ├── Modal/                    # 공용 모달 (포털, flushBody 옵션)
│   ├── AlertModal/               # 확인/취소 다이얼로그
│   ├── Toast/                    # 토스트 시스템 (중복 방지, 되돌리기 액션)
│   ├── ErrorBoundary/            # 런타임 에러 폴백 UI
│   └── common/
│       ├── Tooltip.tsx           # CSS-only 호버 툴팁
│       ├── DurationControl.tsx   # 분/초 입력 컨트롤
│       └── DurationPickerModal.tsx
├── hooks/
│   ├── useTimerTick.ts           # rAF 기반 표시 초 갱신 트리거
│   ├── useTimerCompletion.ts     # endsAt 도달 감지 + 자동 전이 + 알림
│   ├── useDocumentTitle.ts       # document.title 자체 1s interval 갱신
│   ├── useDailyReset.ts          # 자정 지나면 일일 카운트 리셋
│   └── useMediaQuery.ts          # 반응형 분기
├── lib/
│   ├── time.ts                   # formatMMSS, minutesToMs, todayKey
│   └── notification.ts           # 브라우저 Notification 래퍼
└── store/
    ├── useAppStore.ts            # 메인 store (타이머 + 작업 + 환경설정 + 통계)
    └── useToastStore.ts          # 토스트 큐 (메시지+tone 단위 dedupe)
```

## 핵심 개념

### 타이머 상태 머신

`TimerStatus`는 다음 5개 중 하나:

- `idle` — 대기. 시작 가능
- `running` — 작업 세션 진행 중
- `paused` — 작업 세션 일시정지
- `breakRunning` — 휴식 진행 중
- `break` — 휴식 일시정지

전이는 `useAppStore`의 `startTimer`, `pauseTimer`, `resetTimer`, `handleTimerEnd` 액션으로만 이뤄집니다.
타이머 종료 감지는 `useTimerCompletion` 훅이 `TICK_INTERVAL_MS`(200ms) 폴링 + `visibilitychange` 보정으로 담당합니다.

### tick / 렌더링 전략

표시 정확도와 리렌더 비용을 양립시키기 위해 두 단계로 분리되어 있어요.

- **`useTimerTick`** — store의 `endsAt`을 구독하면서 `requestAnimationFrame` 으로 매 프레임 표시 초 변화를 감지. 표시 초가 바뀐 정확한 순간에만 React `setNow` 호출 → 리렌더 빈도 ≈ 1Hz, 정확도 16ms 이내. 일시정지 시 `endsAt = null` 이라 자동으로 정지.
- **`ClockFace`** — running 상태에선 별도의 rAF 루프가 `circle.style.strokeDashoffset` 을 직접 덮어써서 60fps 부드러움. paused/idle 에선 `useLayoutEffect` 가 prop 기반 dashOffset 으로 즉시 스냅.
- **`useDocumentTitle`** — App 의 `now` 에 의존하지 않고 자체 1s interval 로 `document.title` 갱신. 동일 문자열은 가드.

이 구조 덕에:
- 사용자가 보는 진행 링은 60fps
- React 리렌더는 표시값이 바뀌는 ≈1Hz
- 백그라운드 탭에선 rAF 자체가 멈춰 배터리 절약

### 작업 큐 동작

`currentTask` 와 `queue: Task[]` 가 분리되어 있어요.

- `addTask`: idle + currentTask 비어있으면 → currentTask 로 직접, 아니면 큐 뒤
- `removeTask`: currentTask id 면 큐 첫 항목 승격 + 타이머 idle 화. 큐 항목이면 단순 제거
- `clearAllTasks`: 전체 + 타이머 리셋
- `reorderAll`: currentTask + queue 를 한 리스트처럼 다뤄서 위치 이동. 진행 중일 땐 0번 슬롯(currentTask) 잠금
- 휴식 중에는 currentTask 가 null. 큐 첫 항목을 "다음 작업 (대기)" 으로 시각적으로 promote

### 영속성

`zustand/persist`로 `localStorage` 키 `pomodoro-app-v1`에 자동 저장됩니다.
새 필드를 추가할 때는 기존 사용자 데이터에 그 필드가 없으니 폴백 값을 잘 챙기세요.

### 테마 / 컬러

- 라이트/다크: `[data-theme="dark"]` 로 분기
- 액센트: `[data-accent="blue|green|indigo|amber"]` 로 분기
- 두 속성 조합 → 8가지 룩 자동 생성 (`index.css` 참고)
- 첫 페인트 전 `index.html` 의 인라인 스크립트가 `localStorage` 를 읽어 `<html>` 에 두 속성 세팅 (다크/라이트 깜빡임 방지)

새 컬러를 추가하려면:
1. `src/types.ts` 의 `Accent` 유니온에 키 추가
2. `index.css` 에 `[data-accent='X']` + `[data-theme='dark'][data-accent='X']` 두 블록 정의
3. `src/components/Settings/SettingsModal.tsx` 의 `ACCENT_OPTIONS` 배열에 항목 추가
4. `index.html` 의 인라인 부트스트랩 스크립트의 검증 리스트에도 추가

### 모바일 vs 데스크탑

`useMediaQuery('(min-width: 768px)')` 로 분기:

- **데스크탑**: `Timer + TaskBoard` 사이드 바이 사이드
- **모바일**: `MobileCurrentCard + Timer` 한 컬럼, 큐 관리는 `MobileTaskBoardModal` 에서

데스크탑/모바일에서 같은 store를 공유하지만 컴포넌트는 분리. 모바일 컴포넌트는 큰 터치 타겟, 하단 고정 입력바, safe-area 인셋, 호버 의존 없는 인터랙션을 지향.

### 토스트

`useToastStore.push({ message, tone, action?, duration? })`:

- 동일한 `message + tone` 토스트가 이미 떠 있으면 새로 만들지 않음 (사용자 연타 방지)
- `action` 있으면 5초, 없으면 3초 자동 dismiss
- 진입/이탈 애니메이션은 `slot` 의 `grid-template-rows` collapse + `transform` 조합. 그림자 클립을 피하려고 슬롯에 `filter: drop-shadow` 적용

## 코드 스타일

- TypeScript 는 가능하면 명시적 타입. JSX 내부의 자명한 추론은 그대로 둬요.
- 상태 전이 함수는 `useAppStore` 에 모아둡니다. 컴포넌트는 가능하면 selector 만.
- CSS Modules 클래스명은 카멜케이스. 전역 변수는 `--kebab-case`.
- 사이드 이펙트(타이머 종료 감지, document.title 등)는 훅으로 추출.
- 주석은 "왜"를 설명할 때만. "무엇"은 코드/이름으로.
- 렌더 비용이 큰 컴포넌트는 `React.memo` + 부모에서 `useCallback` 으로 prop 안정화.

## 검증

PR 전에 다음을 확인해주세요:

```bash
npm run build    # tsc + vite build, 둘 다 통과해야 함
npm run lint     # eslint 통과 (기존 경고 외 새 경고 없도록)
```

수동 테스트 항목:

타이머
- [ ] 작업 추가 → 시작 → 휴식 자동 전환 → 다음 작업 진행
- [ ] 일시정지 시 진행 링 즉시 스냅 (한 박자 늦지 않음)
- [ ] 일시정지 시 표시값과 캡처값 일치 (디지트가 추가로 굴러내리지 않음)
- [ ] 새로고침 후 진행 상태 복원 (남은 시간/큐/현재 작업)
- [ ] 백그라운드 탭 복귀 시 즉시 정확한 시간으로 보정

UI
- [ ] 라이트/다크 + 컬러 4종 전환
- [ ] 첫 페인트 깜빡임 없음
- [ ] 풀스크린 진입 / `ESC` 종료
- [ ] 아이콘 버튼 툴팁 호버 동작 (데스크탑)
- [ ] 토스트: 같은 메시지 연타 시 1개만 떠야 함, 그림자 잘림 없음

작업 큐
- [ ] 현재 작업 삭제 시 큐 첫 항목 자동 승격
- [ ] 진행 중 현재 작업 삭제 → 확인 모달
- [ ] "모두 삭제" → 확인 모달 → 되돌리기 동작
- [ ] DnD 정렬, 진행 중일 땐 0번 슬롯 잠금
- [ ] 휴식 중 큐 첫 항목이 "대기" 상태로 보이는지

모바일 (≤ 767px)
- [ ] 헤더 두 줄 레이아웃
- [ ] 시계 위 현재 작업 카드 (없으면 "할 일 추가하기")
- [ ] 카드 탭 → 전체화면 큐 모달
- [ ] 큐 모달 하단 입력바, safe-area 인셋
- [ ] 320px 폭에서 시계/텍스트 깨짐 없음

## 커밋 / PR

- 브랜치명: `feat/xxx`, `fix/xxx`, `chore/xxx`, `docs/xxx`, `perf/xxx`
- 커밋 메시지: `feat: 풀스크린 모드 추가` 형식 (한국어 OK)
- PR 본문에 무엇을 / 왜 / 어떻게 검증했는지

큰 변경이면 먼저 Issue로 의논해주시면 좋아요.

## 문의

- GitHub: https://github.com/susung1107/Pomori-timer
- Email: susung1107@gmail.com
