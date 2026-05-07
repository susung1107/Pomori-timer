# Pomori — 25분 집중 타이머

> 집중과 휴식을 25분 단위로 끊어가는 포모도로 타이머.
> 작업 큐, 풀스크린 포커스 모드, 다크 모드를 지원합니다.

## 데모

[https://pomori.example.com](https://pomori.susung1107.workers.dev/)

## 주요 기능

- **포모도로 타이머** — 집중·휴식 시간을 1~60분 사이로 자유롭게 조정
- **작업 큐** — 할 일을 미리 줄세우면 세션이 끝날 때마다 다음 작업으로 자동 진행
- **현재 세션 카드** — 지금 무엇에 집중하고 있는지 한눈에. 세션 종료 시 완료 애니메이션
- **풀스크린 포커스 모드** — 시계만 크게 띄워 다른 UI 거슬림 없이 몰입
- **시계형 / 디지털형** — 원하는 표시 방식 선택
- **다크 모드 + 4가지 컬러 테마** — 블루, 그린, 인디고, 앰버 (눈 피로/집중 특성에 맞춰)
- **브라우저 알림** — 세션·휴식이 끝나면 데스크톱 알림으로 알림 (HTTPS 필요)
- **오늘의 기록** — 완료한 세션 수와 작업 목록을 자동 집계, 자정마다 리셋
- **자동 시작** — 휴식 후 다음 세션을 자동으로 이어서 시작 (옵션)
- **로컬 저장** — 모든 데이터는 브라우저 localStorage에 저장. 별도 서버/계정 없음

## 기술 스택

- **React 18** + **TypeScript**
- **Vite** — 빌드 / 개발 서버
- **Zustand** — 상태 관리 (with persist)
- **@dnd-kit** — 작업 큐 드래그 앤 드롭
- **CSS Modules** — 스타일링
- **Pretendard** — 본문 글꼴

## 빠르게 실행하기

```bash
git clone https://github.com/susung1107/Pomori-timer.git
cd Pomori-timer
npm install
npm run dev
```

기본 포트는 `http://localhost:5173`.

## 빌드

```bash
npm run build       # dist/ 생성
npm run preview     # 빌드된 결과를 로컬에서 미리보기
```

## 키보드 / 인터랙션

- 풀스크린 모드 종료: `ESC`
- 작업 제목 편집: 작업 카드 탭 → 입력 → `Enter`로 저장 / `ESC`로 취소
- 작업 큐 정렬: 드래그 앤 드롭

## 브라우저 호환

- Chrome / Edge / Safari / Firefox 최신 버전
- 모바일: iOS Safari, Android Chrome
- 알림은 HTTPS 환경에서만 동작 (배포 후엔 자동 적용)

## 기여

버그 제보 / 기능 제안은 [Issues](https://github.com/susung1107/Pomori-timer/issues)로,
코드 기여는 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고해주세요.

## 라이선스

MIT — 자유롭게 사용/수정/배포할 수 있어요. 다만 원본 저작권 표기는 유지해주세요.

---

Made by [SuSung Kang](mailto:susung1107@gmail.com) · © 2026
