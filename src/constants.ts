export const WORK_DEFAULT_MIN = 25;
export const WORK_MIN_MIN = 1;
export const WORK_MAX_MIN = 60;

export const BREAK_DEFAULT_MIN = 5;
export const BREAK_MIN_MIN = 0;
export const BREAK_MAX_MIN = 10;

export const STORAGE_KEY = 'pomodoro-app-v1';
// useTimerCompletion 의 endsAt 도달 감지용 폴링 간격. 짧을수록 종료 반응이 빠름.
export const TICK_INTERVAL_MS = 200;
// 화면 표시(시계, 디지털)용 리렌더 간격. mm:ss 갱신은 1초면 충분.
// CSS transition 으로 진행 링은 부드럽게 채움.
export const VISUAL_TICK_INTERVAL_MS = 1000;

export const APP_TITLE = '포모리';
export const APP_DESCRIPTION =
  '집중과 휴식을 25분 단위로 끊어가는 포모도로 타이머. 작업 큐와 풀스크린 포커스 모드를 지원합니다.';

// About / footer
export const AUTHOR_NAME = 'SuSung Kang';
export const AUTHOR_EMAIL = 'susung1107@gmail.com';
export const REPO_URL = 'https://github.com/susung1107/Pomori-timer';
export const COPYRIGHT_YEAR = 2026;
