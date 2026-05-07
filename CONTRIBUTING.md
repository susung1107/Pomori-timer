# Pomori 기여 가이드

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
├── App.tsx                # 최상위 컴포넌트 (전역 훅, 모달 상태)
├── main.tsx               # 엔트리
├── index.css              # 전역 CSS 변수 (테마/컬러)
├── constants.ts           # 앱 메타, 시간 제약, 외부 링크
├── types.ts               # 공통 타입 (TimerStatus, Task, Theme, Accent)
├── components/
│   ├── Header/            # 상단 헤더, 통계 / 설정 / 가이드 / 다크모드 토글
│   ├── CurrentTask/       # "지금 이 세션" 카드 (편집 + 완료 애니메이션)
│   ├── Timer/             # 시계, 디지털, 풀스크린, 액션 버튼
│   ├── TaskQueue/         # 작업 큐 (DnD), 모바일 모달 / 데스크톱 사이드
│   ├── CompletedTasks/    # 오늘의 기록 모달
│   ├── Settings/          # 설정 모달 (5탭: 타이머/자동화/알림/화면/지원)
│   ├── Guide/             # 첫 진입 / 도움말 가이드 모달
│   ├── Footer/            # 카피라이트 + GitHub 링크
│   ├── Modal/             # 공용 모달 컴포넌트 (포털)
│   ├── AlertModal/        # 확인/취소 다이얼로그
│   ├── Toast/             # 토스트 메시지
│   └── common/            # DurationControl 등 재사용 인풋
├── hooks/                 # useTimerTick, useTimerCompletion, useDocumentTitle 등
├── lib/                   # 순수 유틸 (time, notification)
└── store/
    ├── useAppStore.ts     # 메인 store (타이머 + 작업 + 환경설정 + 통계)
    └── useToastStore.ts   # 토스트 큐
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
타이머 종료 감지는 `useTimerCompletion` 훅이 담당하며, 백그라운드 복귀(`visibilitychange`) 시 즉시 보정합니다.

### 영속성

`zustand/persist`로 `localStorage` 키 `pomodoro-app-v1`에 자동 저장됩니다.
새 필드를 추가할 때는 기존 사용자 데이터에 그 필드가 없으니 폴백 값을 잘 챙기세요.

### 테마 / 컬러

- 라이트/다크: `[data-theme="dark"]`로 분기
- 액센트(브랜드 컬러): `[data-accent="blue|green|indigo|amber"]`로 분기
- 두 속성을 조합해 8가지 룩이 자동 생성됩니다 (`index.css` 참고)

새 컬러를 추가하려면:
1. `src/types.ts`의 `Accent` 유니온에 키 추가
2. `index.css`에 `[data-accent='X']` + `[data-theme='dark'][data-accent='X']` 두 블록 정의
3. `src/components/Settings/SettingsModal.tsx`의 `ACCENT_OPTIONS` 배열에 항목 추가

## 코드 스타일

- TypeScript는 가능하면 명시적 타입. 단, JSX 내부의 자명한 추론은 그대로 둬요.
- 상태 전이 함수는 `useAppStore`에 모아둡니다. 컴포넌트는 가능하면 selector만.
- CSS Modules 클래스 이름은 카멜케이스. 전역 변수는 `--kebab-case`.
- 사이드 이펙트(타이머 종료 감지, document.title 등)는 훅으로 추출.
- 주석은 "왜"를 설명할 때만. "무엇"은 코드/이름으로.

## 검증

PR 전에 다음을 확인해주세요:

```bash
npm run build    # tsc + vite build, 둘 다 통과해야 함
npm run lint     # eslint 통과 (기존 경고 외 새 경고 없도록)
```

수동 테스트 항목:
- [ ] 작업 추가 → 시작 → 휴식 자동 전환
- [ ] 새로고침 후 진행 상태 복원
- [ ] 라이트/다크 + 컬러 4종 전환
- [ ] 풀스크린 진입/ESC 종료
- [ ] 모바일(좁은 화면)에서 레이아웃

## 커밋 / PR

- 브랜치명: `feat/xxx`, `fix/xxx`, `chore/xxx`, `docs/xxx`
- 커밋 메시지: `feat: 풀스크린 모드 추가` 형식 (한국어 OK)
- PR 본문에 무엇을 / 왜 / 어떻게 검증했는지

큰 변경이면 먼저 Issue로 의논해주시면 좋아요.

## 문의

- GitHub: https://github.com/susung1107/Pomori-timer
- Email: susung1107@gmail.com
