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
import { Modal } from '../Modal/Modal';
import styles from './MobileTaskBoard.module.css';

const REMOVE_ANIM_MS = 240;

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export function MobileTaskBoardModal({ open, onClose }: ModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="할 일"
      size="fullscreen"
      flushBody
    >
      <MobileTaskBoard />
    </Modal>
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
      <span className={`${styles.badge} ${styles.badgePaused}`}>일시정지</span>
    );
  }
  return <span className={`${styles.badge} ${styles.badgeIdle}`}>대기</span>;
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="5" cy="4" r="1.4" fill="currentColor" />
      <circle cx="5" cy="8" r="1.4" fill="currentColor" />
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="11" cy="4" r="1.4" fill="currentColor" />
      <circle cx="11" cy="8" r="1.4" fill="currentColor" />
      <circle cx="11" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

interface CurrentCardProps {
  task: Task;
  status: TimerStatus;
  isActiveCurrent: boolean;
}

function CurrentCard({ task, status, isActiveCurrent }: CurrentCardProps) {
  const editTask = useAppStore((s) => s.editTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const insertTask = useAppStore((s) => s.insertTask);
  const pushToast = useToastStore((s) => s.push);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // task 가 바뀌면 편집 종료
  useEffect(() => {
    setEditing(false);
  }, [task.id]);

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
    removeTask(snapshot.id);
    pushToast({
      message: '할 일을 삭제했어요',
      tone: 'info',
      ...(isActiveCurrent
        ? {}
        : {
            action: {
              label: '되돌리기',
              onClick: () => insertTask(snapshot, 0),
            },
          }),
    });
  };

  const handleRemove = () => {
    if (isActiveCurrent) {
      setConfirmOpen(true);
      return;
    }
    doRemove();
  };

  return (
    <div className={styles.currentCard}>
      <StatusBadge status={status} />
      <div className={styles.currentTopRow}>
        {editing ? (
          <input
            ref={inputRef}
            className={styles.currentTitleInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') setEditing(false);
            }}
            maxLength={120}
          />
        ) : (
          <button
            type="button"
            className={styles.currentTitle}
            onClick={startEdit}
            aria-label="할 일 편집"
          >
            {task.title}
          </button>
        )}
        <button
          type="button"
          className={styles.currentRemoveButton}
          onClick={handleRemove}
          aria-label="현재 작업 삭제"
        >
          ×
        </button>
      </div>

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
    </div>
  );
}

interface QueueRowProps {
  task: Task;
  index: number;
}

function QueueRow({ task, index }: QueueRowProps) {
  const editTask = useAppStore((s) => s.editTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const insertTask = useAppStore((s) => s.insertTask);
  const pushToast = useToastStore((s) => s.push);

  const sortable = useSortable({ id: task.id });
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
    const queueIndex = index - 1;
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
    background: isDragging ? 'var(--bg-elevated)' : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.queueRow} ${removing ? styles.queueRowRemoving : ''}`}
    >
      <button
        type="button"
        className={styles.queueDragHandle}
        aria-label="순서 변경"
        disabled={removing}
        {...attributes}
        {...listeners}
      >
        <DragHandleIcon />
      </button>

      <span className={styles.queueIndex}>{index}</span>

      {editing ? (
        <input
          ref={inputRef}
          className={styles.queueTitleInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') setEditing(false);
          }}
          maxLength={120}
        />
      ) : (
        <button
          type="button"
          className={styles.queueTitle}
          onClick={startEdit}
          disabled={removing}
          aria-label="할 일 편집"
        >
          {task.title}
        </button>
      )}

      <button
        type="button"
        className={styles.queueRemoveButton}
        onClick={handleRemove}
        aria-label="삭제"
        disabled={removing}
      >
        ×
      </button>
    </li>
  );
}

function InputBar() {
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

  const trimmedEmpty = !value.trim();

  return (
    <div className={styles.inputBar}>
      <form className={styles.inputBarForm} onSubmit={submit}>
        <input
          className={styles.inputField}
          placeholder="할 일을 입력하세요"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={120}
          enterKeyHint="done"
        />
        <button
          type="submit"
          className={styles.inputSubmit}
          disabled={trimmedEmpty}
          aria-label="추가"
        >
          <PlusIcon />
        </button>
      </form>
    </div>
  );
}

function MobileTaskBoard() {
  const status = useAppStore((s) => s.status);
  const currentTask = useAppStore((s) => s.currentTask);
  const queue = useAppStore((s) => s.queue);
  const reorderAll = useAppStore((s) => s.reorderAll);
  const clearAllTasks = useAppStore((s) => s.clearAllTasks);
  const pushToast = useToastStore((s) => s.push);

  const isBreak = status === 'breakRunning' || status === 'break';
  const isWorkLocked = status === 'running' || status === 'paused';

  // 휴식 중에는 큐 첫 항목이 다음 작업으로서 '현재' 영역에 표시됨
  const showUpcoming = isBreak && !currentTask && queue.length > 0;
  const upcomingTask = showUpcoming ? queue[0]! : null;
  const restQueue = showUpcoming ? queue.slice(1) : queue;

  const displayedCurrent = currentTask ?? upcomingTask;
  const displayedStatus: TimerStatus = currentTask ? status : 'idle';
  const isActiveCurrent = !!currentTask && isWorkLocked;

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderAll(String(active.id), String(over.id));
  };

  const sortableIds = restQueue.map((t) => t.id);
  const totalCount = queue.length + (currentTask ? 1 : 0);

  const handleClearAll = () => {
    const snapshot = { currentTask, queue };
    clearAllTasks();
    setClearConfirmOpen(false);
    pushToast({
      message: '모든 할 일을 삭제했어요',
      tone: 'info',
      action: {
        label: '되돌리기',
        onClick: () => {
          useAppStore.setState({
            currentTask: snapshot.currentTask,
            queue: snapshot.queue,
          });
        },
      },
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.scrollArea}>
        {displayedCurrent && (
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>현재 작업</h3>
            </header>
            <CurrentCard
              task={displayedCurrent}
              status={displayedStatus}
              isActiveCurrent={isActiveCurrent}
            />
          </section>
        )}

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>다음 작업</h3>
            {restQueue.length > 0 && (
              <span className={styles.countBadge}>{restQueue.length}</span>
            )}
            {totalCount > 0 && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => setClearConfirmOpen(true)}
              >
                모두 삭제
              </button>
            )}
          </header>

          {restQueue.length === 0 ? (
            <p className={styles.empty}>
              {displayedCurrent
                ? '대기 중인 할 일이 없어요'
                : '아래에서 할 일을 추가해보세요'}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableIds}
                strategy={verticalListSortingStrategy}
              >
                <ul className={styles.queueList}>
                  {restQueue.map((task, i) => (
                    <QueueRow key={task.id} task={task} index={i + 1} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>

      <InputBar />

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
    </div>
  );
}
