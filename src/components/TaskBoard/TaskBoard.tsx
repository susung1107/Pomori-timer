import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useToastStore } from '../../store/useToastStore';
import type { Task, TimerStatus } from '../../types';
import { Modal } from '../Modal/Modal';
import styles from './TaskBoard.module.css';

const REMOVE_ANIM_MS = 240;
const COMPACT_PREVIEW_LIMIT = 3;
const CELEBRATION_DURATION_MS = 1400;

function CelebrationCheck() {
  return (
    <svg
      className={styles.checkSvg}
      viewBox="0 0 64 64"
      width="48"
      height="48"
      aria-hidden
    >
      <circle cx="32" cy="32" r="28" className={styles.checkBg} />
      <path
        d="M21 33 l8 8 l15 -16"
        fill="none"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.checkPath}
      />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="5" cy="4" r="1.2" fill="currentColor" />
      <circle cx="5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="11" cy="4" r="1.2" fill="currentColor" />
      <circle cx="11" cy="8" r="1.2" fill="currentColor" />
      <circle cx="11" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function StatusBadge({ status }: { status: TimerStatus }) {
  if (status === 'running') {
    return (
      <span className={`${styles.badge} ${styles.badgeRunning}`}>
        <span className={styles.badgeDot} aria-hidden />
        진행 중
      </span>
    );
  }
  if (status === 'paused') {
    return (
      <span className={`${styles.badge} ${styles.badgePaused}`}>
        일시정지
      </span>
    );
  }
  return null;
}

function TaskAddInput() {
  const addTask = useAppStore((s) => s.addTask);
  const pushToast = useToastStore((s) => s.push);
  const [value, setValue] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      pushToast({ message: '할 일을 입력해주세요', tone: 'warning' });
      return;
    }
    addTask(value);
    setValue('');
  };

  return (
    <form className={styles.inputRow} onSubmit={submit}>
      <input
        className={styles.input}
        placeholder="할 일을 입력하고 Enter"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={120}
      />
      <button
        type="submit"
        className={styles.addButton}
        disabled={!value.trim()}
      >
        추가
      </button>
    </form>
  );
}

interface TaskRowProps {
  task: Task;
  isCurrent: boolean;
  index: number; // 1-based queue index. 0 for current.
  status: TimerStatus;
  draggable: boolean;
  removable: boolean;
}

function TaskRow({
  task,
  isCurrent,
  index,
  status,
  draggable,
  removable,
}: TaskRowProps) {
  const editTask = useAppStore((s) => s.editTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const insertTask = useAppStore((s) => s.insertTask);
  const pushToast = useToastStore((s) => s.push);

  const sortable = useSortable({ id: task.id, disabled: !draggable });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // currentTask가 바뀌면(예: 세션 종료) 편집 상태 자동 종료
  useEffect(() => {
    if (isCurrent) setEditing(false);
  }, [task.id, isCurrent]);

  const startEdit = () => {
    setDraft(task.title);
    setEditing(true);
  };

  const commit = () => {
    if (!draft.trim()) {
      pushToast({ message: '할 일을 입력해주세요', tone: 'warning' });
      setEditing(false);
      return;
    }
    editTask(task.id, draft);
    setEditing(false);
  };

  const handleRemove = () => {
    if (removing) return;
    const snapshot = task;
    // 큐 내부 인덱스 (current 슬롯은 제거 불가이므로 index-1)
    const queueIndex = isCurrent ? 0 : index - 1;
    setRemoving(true);
    window.setTimeout(() => {
      removeTask(snapshot.id);
      pushToast({
        message: '할 일을 삭제했어요',
        tone: 'info',
        action: {
          label: '되돌리기',
          onClick: () => insertTask(snapshot, queueIndex),
        },
      });
    }, REMOVE_ANIM_MS);
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isCurrent ? styles.rowCurrent : ''} ${
        removing ? styles.rowRemoving : ''
      }`}
    >
      {draggable ? (
        <button
          type="button"
          className={styles.dragHandle}
          aria-label="순서 변경"
          disabled={removing}
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
      ) : (
        <span className={styles.dragHandlePlaceholder} aria-hidden />
      )}

      <span
        className={`${styles.index} ${isCurrent ? styles.indexCurrent : ''}`}
      >
        {isCurrent ? '●' : index}
      </span>

      <div className={styles.rowMain}>
        {isCurrent && <StatusBadge status={status} />}
        {editing ? (
          <input
            ref={inputRef}
            className={`${styles.titleInput} ${
              isCurrent ? styles.titleInputCurrent : ''
            }`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            className={`${styles.title} ${
              isCurrent ? styles.titleCurrent : ''
            }`}
            onClick={startEdit}
            disabled={removing}
            aria-label="할 일 편집"
          >
            {task.title}
          </button>
        )}
      </div>

      {removable ? (
        <button
          type="button"
          className={styles.removeButton}
          onClick={handleRemove}
          aria-label="삭제"
          disabled={removing}
        >
          ×
        </button>
      ) : (
        <span className={styles.removeButtonPlaceholder} aria-hidden />
      )}
    </li>
  );
}

function BreakPlaceholderRow() {
  return (
    <li className={`${styles.row} ${styles.rowCurrent} ${styles.rowBreak}`}>
      <span className={styles.dragHandlePlaceholder} aria-hidden />
      <span className={`${styles.index} ${styles.indexCurrent}`}>☕</span>
      <div className={styles.rowMain}>
        <span className={`${styles.badge} ${styles.badgeBreak}`}>휴식 중</span>
        <span className={`${styles.title} ${styles.titleCurrent}`}>
          잠시 쉬어가세요
        </span>
      </div>
      <span className={styles.removeButtonPlaceholder} aria-hidden />
    </li>
  );
}

function CelebrationRow({ title }: { title: string }) {
  return (
    <li
      className={`${styles.row} ${styles.rowCurrent} ${styles.rowCelebration}`}
    >
      <CelebrationCheck />
      <div className={styles.celebrationText}>
        <span className={styles.celebrationTitle}>{title}</span>
        <span className={styles.celebrationLabel}>완료!</span>
      </div>
    </li>
  );
}

interface TaskBoardProps {
  // 모바일 메인용 컴팩트 변형. 큐를 N개까지만 보여주고 DnD 비활성.
  compact?: boolean;
  onShowAll?: () => void;
}

export function TaskBoard({ compact = false, onShowAll }: TaskBoardProps) {
  const status = useAppStore((s) => s.status);
  const currentTask = useAppStore((s) => s.currentTask);
  const queue = useAppStore((s) => s.queue);
  const reorderAll = useAppStore((s) => s.reorderAll);

  const isWorkLocked = status === 'running' || status === 'paused';
  const isBreak = status === 'breakRunning' || status === 'break';

  // 세션 종료 축하 애니메이션
  const [celebration, setCelebration] = useState<{
    title: string;
    key: number;
  } | null>(null);
  const prevRef = useRef({ status, currentTaskId: currentTask?.id ?? null });

  useEffect(() => {
    const prev = prevRef.current;
    const wasRunning = prev.status === 'running';
    const taskChanged =
      prev.currentTaskId != null &&
      prev.currentTaskId !== (currentTask?.id ?? null);

    if (wasRunning && taskChanged && prev.currentTaskId) {
      const completed = useAppStore
        .getState()
        .completedTasksToday.find((t) => t.id === prev.currentTaskId);
      if (completed) {
        setCelebration({ title: completed.title, key: Date.now() });
      }
    }

    prevRef.current = { status, currentTaskId: currentTask?.id ?? null };
  }, [status, currentTask]);

  useEffect(() => {
    if (!celebration) return;
    const id = window.setTimeout(
      () => setCelebration(null),
      CELEBRATION_DURATION_MS,
    );
    return () => window.clearTimeout(id);
  }, [celebration]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderAll(String(active.id), String(over.id));
  };

  const visibleQueue = compact ? queue.slice(0, COMPACT_PREVIEW_LIMIT) : queue;
  const hiddenCount = compact ? Math.max(0, queue.length - visibleQueue.length) : 0;
  const total = queue.length + (currentTask ? 1 : 0);

  // 어떤 항목들이 sortable인지 — break 시엔 currentTask 자리에 placeholder 가 들어가므로 큐만.
  const sortableIds: string[] = [];
  if (currentTask && !celebration) sortableIds.push(currentTask.id);
  for (const t of visibleQueue) sortableIds.push(t.id);

  // current row drag 가능 여부
  const currentDraggable = !compact && !!currentTask && !isWorkLocked && !celebration;
  const queueDraggable = !compact;

  return (
    <section className={styles.card} aria-label="할 일">
      <header className={styles.header}>
        <h2 className={styles.title}>할 일</h2>
        {total > 0 && <span className={styles.count}>{total}</span>}
      </header>

      <TaskAddInput />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          <ul className={styles.list}>
            {celebration ? (
              <CelebrationRow title={celebration.title} />
            ) : currentTask ? (
              <TaskRow
                task={currentTask}
                isCurrent
                index={0}
                status={status}
                draggable={currentDraggable}
                removable={false}
              />
            ) : isBreak ? (
              <BreakPlaceholderRow />
            ) : null}

            {visibleQueue.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                isCurrent={false}
                index={i + 1}
                status={status}
                draggable={queueDraggable}
                removable
              />
            ))}

            {!currentTask &&
              !isBreak &&
              queue.length === 0 &&
              !celebration && (
                <li className={styles.empty}>할 일을 추가해 보세요</li>
              )}
          </ul>
        </SortableContext>
      </DndContext>

      {hiddenCount > 0 && onShowAll && (
        <button
          type="button"
          className={styles.showAllButton}
          onClick={onShowAll}
        >
          {hiddenCount}개 더 보기
        </button>
      )}
    </section>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export function TaskBoardModal({ open, onClose }: ModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="할 일" size="fullscreen">
      <TaskBoard />
    </Modal>
  );
}
