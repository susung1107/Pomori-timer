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
import { AlertModal } from '../AlertModal/AlertModal';
import { Tooltip } from '../common/Tooltip';
import styles from './TaskBoard.module.css';

const REMOVE_ANIM_MS = 240;
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
        진행중
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
  // idle (currentTask 가 있지만 시작 전): 대기
  return <span className={`${styles.badge} ${styles.badgeIdle}`}>대기</span>;
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isActiveCurrent =
    isCurrent && (status === 'running' || status === 'paused');

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

  const doRemove = () => {
    const snapshot = task;
    // 진행 중이던 현재 작업을 삭제하면 타이머가 리셋되므로 되돌리기 미제공.
    // 그 외는 큐 위치(또는 currentTask 자리 → 0)로 복구.
    const queueIndex = isCurrent ? 0 : index - 1;
    setRemoving(true);
    window.setTimeout(() => {
      removeTask(snapshot.id);
      pushToast({
        message: '할 일을 삭제했어요',
        tone: 'info',
        ...(isActiveCurrent
          ? {}
          : {
              action: {
                label: '되돌리기',
                onClick: () => insertTask(snapshot, queueIndex),
              },
            }),
      });
    }, REMOVE_ANIM_MS);
  };

  const handleRemove = () => {
    if (removing) return;
    if (isActiveCurrent) {
      setConfirmOpen(true);
      return;
    }
    doRemove();
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

      {!isCurrent && <span className={styles.index}>{index}</span>}

      <div className={styles.rowMain}>
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

      {isCurrent && <StatusBadge status={status} />}

      {removable ? (
        <Tooltip label="삭제" placement="top">
          <button
            type="button"
            className={styles.removeButton}
            onClick={handleRemove}
            aria-label="삭제"
            disabled={removing}
          >
            ×
          </button>
        </Tooltip>
      ) : (
        <span className={styles.removeButtonPlaceholder} aria-hidden />
      )}

      <AlertModal
        open={confirmOpen}
        title="현재 작업을 삭제할까요?"
        description="진행 중이던 세션이 사라져요."
        confirmLabel="삭제"
        cancelLabel="취소"
        tone="danger"
        onConfirm={() => {
          setConfirmOpen(false);
          doRemove();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
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

export function TaskBoard() {
  const status = useAppStore((s) => s.status);
  const currentTask = useAppStore((s) => s.currentTask);
  const queue = useAppStore((s) => s.queue);
  const reorderAll = useAppStore((s) => s.reorderAll);
  const clearAllTasks = useAppStore((s) => s.clearAllTasks);
  const pushToast = useToastStore((s) => s.push);

  const isWorkLocked = status === 'running' || status === 'paused';
  const isBreak = status === 'breakRunning' || status === 'break';

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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

  const total = queue.length + (currentTask ? 1 : 0);

  // 휴식 중에는 currentTask 가 없으므로, 큐 첫 항목을 '대기' 상태로 current 자리에 보여줌.
  const showUpcomingDuringBreak = isBreak && !currentTask && queue.length > 0;
  const upcomingTask = showUpcomingDuringBreak ? queue[0]! : null;
  const restQueue = showUpcomingDuringBreak ? queue.slice(1) : queue;

  // 어떤 항목들이 sortable인지
  const sortableIds: string[] = [];
  if (currentTask && !celebration) sortableIds.push(currentTask.id);
  if (upcomingTask) sortableIds.push(upcomingTask.id);
  for (const t of restQueue) sortableIds.push(t.id);

  // current row drag 가능 여부
  const currentDraggable = !!currentTask && !isWorkLocked && !celebration;
  const queueDraggable = true;

  const handleClearAll = () => {
    const snapshot = {
      currentTask,
      queue,
    };
    clearAllTasks();
    setClearConfirmOpen(false);
    pushToast({
      message: '모든 할 일을 삭제했어요',
      tone: 'info',
      action: {
        label: '되돌리기',
        onClick: () => {
          // 진행 중이던 타이머 상태는 복구하지 않음 — idle 로 둠.
          useAppStore.setState({
            currentTask: snapshot.currentTask,
            queue: snapshot.queue,
          });
        },
      },
    });
  };

  return (
    <section className={styles.card} aria-label="할 일">
      <header className={styles.header}>
        <h2 className={styles.title}>할 일</h2>
        <div className={styles.headerRight}>
          {total > 0 && <span className={styles.count}>{total}</span>}
          {total > 0 && (
            <button
              type="button"
              className={styles.clearAllButton}
              onClick={() => setClearConfirmOpen(true)}
            >
              모두 삭제
            </button>
          )}
        </div>
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
                removable
              />
            ) : upcomingTask ? (
              <TaskRow
                key={upcomingTask.id}
                task={upcomingTask}
                isCurrent
                index={0}
                status="idle"
                draggable={false}
                removable
              />
            ) : null}

            {restQueue.map((task, i) => (
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
              !upcomingTask &&
              queue.length === 0 &&
              !celebration && (
                <li className={styles.empty}>할 일을 추가해 보세요</li>
              )}
          </ul>
        </SortableContext>
      </DndContext>

      <AlertModal
        open={clearConfirmOpen}
        title="모든 할 일을 삭제할까요?"
        description={
          isWorkLocked
            ? '진행 중이던 세션도 함께 사라져요.'
            : '현재 작업과 큐의 모든 항목이 사라져요.'
        }
        confirmLabel="모두 삭제"
        cancelLabel="취소"
        tone="danger"
        onConfirm={handleClearAll}
        onCancel={() => setClearConfirmOpen(false)}
      />
    </section>
  );
}

