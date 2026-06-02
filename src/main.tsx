const { useEffect, useMemo, useRef, useState } = React;

type WorkoutCategory = "Push" | "Pull" | "Legs" | "Custom";

type ExerciseBlock = {
  id: string;
  name: string;
  category: WorkoutCategory;
  defaultSets?: number;
  defaultReps?: number;
  defaultWeight?: number;
};

type LoggedExercise = {
  id: string;
  exerciseId?: string;
  name: string;
  category: WorkoutCategory;
  weight?: number;
  sets: number;
  reps: number;
  notes?: string;
};

type WorkoutDay = {
  date: string;
  exercises: LoggedExercise[];
};

type PointerDragState = {
  block: ExerciseBlock;
  x: number;
  y: number;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

const STORAGE_KEYS = {
  days: "workout-planner.days.v1",
  customExercises: "workout-planner.customExercises.v1",
};

const categories: WorkoutCategory[] = ["Push", "Pull", "Legs", "Custom"];

const categoryStyles: Record<WorkoutCategory, string> = {
  Push: "bg-coral/10 text-coral border-coral/25",
  Pull: "bg-moss/10 text-moss border-moss/25",
  Legs: "bg-gold/15 text-[#9b6d13] border-gold/30",
  Custom: "bg-ink/10 text-ink border-ink/15",
};

const defaultExercises: ExerciseBlock[] = [
  { id: "push-bench-press", name: "Bench Press", category: "Push", defaultSets: 4, defaultReps: 8 },
  { id: "push-incline-db-press", name: "Incline Dumbbell Press", category: "Push", defaultSets: 3, defaultReps: 10 },
  { id: "push-shoulder-press", name: "Shoulder Press", category: "Push", defaultSets: 3, defaultReps: 8 },
  { id: "push-lateral-raises", name: "Dumbbell Lateral Raises", category: "Push", defaultSets: 3, defaultReps: 12 },
  { id: "push-tricep-pushdowns", name: "Tricep Pushdowns", category: "Push", defaultSets: 3, defaultReps: 12 },
  { id: "push-dips", name: "Dips", category: "Push", defaultSets: 3, defaultReps: 8 },
  { id: "push-ups", name: "Push-Ups", category: "Push", defaultSets: 3, defaultReps: 15 },
  { id: "push-chest-flys", name: "Chest Flys", category: "Push", defaultSets: 3, defaultReps: 12 },
  { id: "pull-ups", name: "Pull-Ups", category: "Pull", defaultSets: 3, defaultReps: 8 },
  { id: "pull-lat-pulldowns", name: "Lat Pulldowns", category: "Pull", defaultSets: 3, defaultReps: 10 },
  { id: "pull-barbell-rows", name: "Barbell Rows", category: "Pull", defaultSets: 4, defaultReps: 8 },
  { id: "pull-cable-rows", name: "Seated Cable Rows", category: "Pull", defaultSets: 3, defaultReps: 10 },
  { id: "pull-db-rows", name: "Dumbbell Rows", category: "Pull", defaultSets: 3, defaultReps: 10 },
  { id: "pull-face-pulls", name: "Face Pulls", category: "Pull", defaultSets: 3, defaultReps: 15 },
  { id: "pull-barbell-curls", name: "Barbell Curls", category: "Pull", defaultSets: 3, defaultReps: 10 },
  { id: "pull-hammer-curls", name: "Hammer Curls", category: "Pull", defaultSets: 3, defaultReps: 12 },
  { id: "legs-squats", name: "Squats", category: "Legs", defaultSets: 4, defaultReps: 6 },
  { id: "legs-rdls", name: "Romanian Deadlifts", category: "Legs", defaultSets: 3, defaultReps: 8 },
  { id: "legs-leg-press", name: "Leg Press", category: "Legs", defaultSets: 3, defaultReps: 10 },
  { id: "legs-lunges", name: "Lunges", category: "Legs", defaultSets: 3, defaultReps: 10 },
  { id: "legs-extensions", name: "Leg Extensions", category: "Legs", defaultSets: 3, defaultReps: 12 },
  { id: "legs-ham-curls", name: "Hamstring Curls", category: "Legs", defaultSets: 3, defaultReps: 12 },
  { id: "legs-calf-raises", name: "Calf Raises", category: "Legs", defaultSets: 4, defaultReps: 15 },
  { id: "legs-hip-thrusts", name: "Hip Thrusts", category: "Legs", defaultSets: 3, defaultReps: 10 },
];

function uid(prefix = "id") {
  if (crypto?.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDayHeading(dateKey: string) {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function loadStoredDays(): Record<string, WorkoutDay> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.days) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadStoredCustomExercises(): ExerciseBlock[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.customExercises) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildCalendarCells(month: Date): CalendarCell[] {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(1 - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = toDateKey(date);
    return {
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: dateKey === toDateKey(new Date()),
    };
  });
}

function createLoggedExerciseFromBlock(block: ExerciseBlock): LoggedExercise {
  return {
    id: uid("logged"),
    exerciseId: block.id,
    name: block.name,
    category: block.category,
    weight: undefined,
    sets: block.defaultSets || 3,
    reps: block.defaultReps || 10,
  };
}

function App() {
  const todayKey = toDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [isDayZoomed, setIsDayZoomed] = useState(false);
  const [showDayFlash, setShowDayFlash] = useState(false);
  const [workoutDays, setWorkoutDays] = useState<Record<string, WorkoutDay>>(loadStoredDays);
  const [customExercises, setCustomExercises] = useState<ExerciseBlock[]>(loadStoredCustomExercises);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.days, JSON.stringify(workoutDays));
  }, [workoutDays]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.customExercises, JSON.stringify(customExercises));
  }, [customExercises]);

  const selectedWorkoutDay = workoutDays[selectedDate] || { date: selectedDate, exercises: [] };
  const exerciseBlocks = useMemo(() => [...defaultExercises, ...customExercises], [customExercises]);

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function selectDay(dateKey: string) {
    setSelectedDate(dateKey);
    const selected = parseDateKey(dateKey);
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
    setIsDayZoomed(false);
    setShowDayFlash(true);
  }

  function proceedToDayBuilder() {
    setShowDayFlash(false);
    setIsDayZoomed(true);
  }

  function saveLoggedExercise(dateKey: string, exercise: LoggedExercise) {
    setWorkoutDays((current) => {
      const day = current[dateKey] || { date: dateKey, exercises: [] };
      const exists = day.exercises.some((item) => item.id === exercise.id);
      const exercises = exists
        ? day.exercises.map((item) => (item.id === exercise.id ? exercise : item))
        : [...day.exercises, exercise];

      return {
        ...current,
        [dateKey]: { date: dateKey, exercises },
      };
    });
  }

  function deleteLoggedExercise(dateKey: string, exerciseId: string) {
    setWorkoutDays((current) => {
      const day = current[dateKey];
      if (!day) return current;
      const exercises = day.exercises.filter((item) => item.id !== exerciseId);
      const next = { ...current };

      if (exercises.length === 0) {
        delete next[dateKey];
      } else {
        next[dateKey] = { ...day, exercises };
      }

      return next;
    });
  }

  function duplicateLoggedExercise(dateKey: string, exercise: LoggedExercise) {
    saveLoggedExercise(dateKey, {
      ...exercise,
      id: uid("logged"),
      notes: exercise.notes ? `${exercise.notes}` : "",
    });
  }

  function clearDay(dateKey: string) {
    setWorkoutDays((current) => {
      const next = { ...current };
      delete next[dateKey];
      return next;
    });
  }

  function addCustomExercise(block: Omit<ExerciseBlock, "id">) {
    setCustomExercises((current) => [...current, { ...block, id: uid("custom") }]);
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-white/70 bg-white/80 p-5 shadow-panel backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">Workout Planner</p>
            <h1 className="mt-1 text-3xl font-bold text-ink sm:text-4xl">Calendar Training Log</h1>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-limewash p-3 text-center">
            <Stat label="Logged days" value={Object.keys(workoutDays).length} />
            <Stat label="Exercises" value={Object.values(workoutDays).reduce((sum, day) => sum + day.exercises.length, 0)} />
            <Stat label="Custom blocks" value={customExercises.length} />
          </div>
        </header>

        <section className="grid gap-5">
          {isDayZoomed ? (
            <DayWorkoutView
              dateKey={selectedDate}
              workoutDay={selectedWorkoutDay}
              exerciseBlocks={exerciseBlocks}
              isZoomed={isDayZoomed}
              onBackToMonth={() => setIsDayZoomed(false)}
              onSaveExercise={saveLoggedExercise}
              onDeleteExercise={deleteLoggedExercise}
              onDuplicateExercise={duplicateLoggedExercise}
              onClearDay={clearDay}
              onAddCustomExercise={addCustomExercise}
            />
          ) : (
            <Calendar
              visibleMonth={visibleMonth}
              selectedDate={selectedDate}
              workoutDays={workoutDays}
              onChangeMonth={changeMonth}
              onSelectDay={selectDay}
            />
          )}
        </section>
      </div>
      {showDayFlash && (
        <DayFlash onProceed={proceedToDayBuilder} />
      )}
    </main>
  );
}

function DayFlash({ onProceed }: { onProceed: () => void }) {
  const [typedCharacters, setTypedCharacters] = useState(0);
  const base = "1.01";
  const exponent = "365";
  const fullLength = base.length + exponent.length;
  const visibleBase = base.slice(0, Math.min(typedCharacters, base.length));
  const visibleExponent = typedCharacters > base.length ? exponent.slice(0, typedCharacters - base.length) : "";
  const isComplete = typedCharacters >= fullLength;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTypedCharacters((current) => {
        if (current >= fullLength) {
          window.clearInterval(timer);
          return current;
        }

        return current + 1;
      });
    }, 115);

    return () => window.clearInterval(timer);
  }, [fullLength]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#062f22]">
      <div className="min-w-[180px] text-center text-white">
        <div className="text-3xl font-semibold sm:text-5xl">
          <span>{visibleBase}</span>
          {visibleExponent && <sup className="ml-1 align-super text-[0.48em] leading-none">{visibleExponent}</sup>}
          {!isComplete && <span className="type-caret ml-1 inline-block h-[1em] w-[0.08em] translate-y-[0.12em] bg-white" />}
        </div>
        {isComplete && (
          <button
            className="flash-subtitle mt-1 rounded-full bg-white/85 px-6 py-2.5 text-sm font-semibold lowercase tracking-[0.12em] text-[#062f22] shadow-sm transition hover:bg-mint hover:text-ink hover:shadow-panel sm:text-base"
            onClick={onProceed}
          >
            log my workout
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[86px]">
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs font-medium text-moss">{label}</div>
    </div>
  );
}

function Calendar({
  visibleMonth,
  selectedDate,
  workoutDays,
  onChangeMonth,
  onSelectDay,
}: {
  visibleMonth: Date;
  selectedDate: string;
  workoutDays: Record<string, WorkoutDay>;
  onChangeMonth: (offset: number) => void;
  onSelectDay: (dateKey: string) => void;
}) {
  const cells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className="rounded-lg border border-white/75 bg-white/90 p-4 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button className="rounded-lg border border-moss/20 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-mint" onClick={() => onChangeMonth(-1)}>
          Previous
        </button>
        <h2 className="text-center text-xl font-bold text-ink sm:text-2xl">{monthLabel(visibleMonth)}</h2>
        <button className="rounded-lg border border-moss/20 px-3 py-2 text-sm font-semibold text-moss transition hover:bg-mint" onClick={() => onChangeMonth(1)}>
          Next
        </button>
      </div>

      <div className="calendar-grid mb-2 gap-2">
        {weekdays.map((day) => (
          <div key={day} className="rounded-md bg-limewash py-2 text-center text-xs font-bold uppercase tracking-wide text-moss">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid gap-2">
        {cells.map((cell) => (
          <CalendarDay
            key={cell.dateKey}
            cell={cell}
            isSelected={cell.dateKey === selectedDate}
            workoutDay={workoutDays[cell.dateKey]}
            onSelect={onSelectDay}
          />
        ))}
      </div>
    </section>
  );
}

function CalendarDay({
  cell,
  isSelected,
  workoutDay,
  onSelect,
}: {
  cell: CalendarCell;
  isSelected: boolean;
  workoutDay?: WorkoutDay;
  onSelect: (dateKey: string) => void;
}) {
  const exerciseCount = workoutDay?.exercises.length || 0;
  const summary = workoutDay?.exercises.slice(0, 2).map((exercise) => exercise.name).join(", ");

  return (
    <button
      data-testid={`calendar-day-${cell.dateKey}`}
      className={[
        "min-h-[92px] rounded-lg border p-2 text-left transition sm:min-h-[110px]",
        exerciseCount > 0 ? "bg-mint text-ink" : cell.isCurrentMonth ? "bg-white" : "bg-white/45 text-ink/35",
        isSelected ? "border-coral ring-2 ring-coral/20" : "border-moss/10 hover:border-moss/35 hover:bg-limewash",
      ].join(" ")}
      onClick={() => onSelect(cell.dateKey)}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={["flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold", cell.isToday ? "bg-ink text-white" : ""].join(" ")}>
          {cell.date.getDate()}
        </span>
        {exerciseCount > 0 && <span className="rounded-full bg-mint px-2 py-1 text-[11px] font-bold text-moss">{exerciseCount}</span>}
      </div>
      {exerciseCount > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-10 rounded-full bg-coral"></div>
          <p className="mt-2 line-clamp-2 text-xs font-medium text-ink/70">{summary}</p>
        </div>
      )}
    </button>
  );
}

function DayWorkoutView({
  dateKey,
  workoutDay,
  exerciseBlocks,
  isZoomed,
  onBackToMonth,
  onSaveExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onClearDay,
  onAddCustomExercise,
}: {
  dateKey: string;
  workoutDay: WorkoutDay;
  exerciseBlocks: ExerciseBlock[];
  isZoomed: boolean;
  onBackToMonth: () => void;
  onSaveExercise: (dateKey: string, exercise: LoggedExercise) => void;
  onDeleteExercise: (dateKey: string, exerciseId: string) => void;
  onDuplicateExercise: (dateKey: string, exercise: LoggedExercise) => void;
  onClearDay: (dateKey: string) => void;
  onAddCustomExercise: (block: Omit<ExerciseBlock, "id">) => void;
}) {
  const dropZoneRef = useRef<HTMLDivElement | null>(null);
  const draggingBlockRef = useRef<PointerDragState | null>(null);
  const [libraryCategory, setLibraryCategory] = useState<WorkoutCategory>("Push");
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingBlock, setDraggingBlock] = useState<PointerDragState | null>(null);
  const draggingBlockId = draggingBlock?.block.id;

  useEffect(() => {
    draggingBlockRef.current = draggingBlock;
  }, [draggingBlock]);

  useEffect(() => {
    if (!draggingBlockId) return;

    function handlePointerMove(event: PointerEvent) {
      const zone = dropZoneRef.current?.getBoundingClientRect();
      const isOverZone = Boolean(
        zone &&
          event.clientX >= zone.left &&
          event.clientX <= zone.right &&
          event.clientY >= zone.top &&
          event.clientY <= zone.bottom,
      );

      setIsDragOver(isOverZone);
      setDraggingBlock((current) => (current ? { ...current, x: event.clientX, y: event.clientY } : current));
    }

    function handlePointerUp(event: PointerEvent) {
      const zone = dropZoneRef.current?.getBoundingClientRect();
      const shouldAdd = Boolean(
        zone &&
          event.clientX >= zone.left &&
          event.clientX <= zone.right &&
          event.clientY >= zone.top &&
          event.clientY <= zone.bottom,
      );

      const activeDrag = draggingBlockRef.current;
      if (shouldAdd && activeDrag) {
        onSaveExercise(dateKey, createLoggedExerciseFromBlock(activeDrag.block));
      }

      setIsDragOver(false);
      setDraggingBlock(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dateKey, draggingBlockId, onSaveExercise]);

  function hasWorkoutBlock(event: React.DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes("application/x-workout-block");
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    if (!hasWorkoutBlock(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    if (!hasWorkoutBlock(event)) return;
    event.preventDefault();
    setIsDragOver(false);

    try {
      const block = JSON.parse(event.dataTransfer.getData("application/x-workout-block")) as ExerciseBlock;
      onSaveExercise(dateKey, createLoggedExerciseFromBlock(block));
    } catch {
      setIsDragOver(false);
    }
  }

  function startPointerDrag(block: ExerciseBlock, event: React.PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    setDraggingBlock({ block, x: event.clientX, y: event.clientY });
  }

  return (
    <section className="flex max-h-none flex-col gap-4 rounded-lg border border-white/75 bg-white/90 p-4 shadow-panel">
      <div className="flex flex-col gap-3 border-b border-moss/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-moss">{isZoomed ? "Day builder" : "Selected day"}</p>
          <h2 className="text-2xl font-bold text-ink">{formatDayHeading(dateKey)}</h2>
          <p className="mt-1 text-sm text-ink/60">{workoutDay.exercises.length} logged exercise{workoutDay.exercises.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-moss hover:shadow-panel" onClick={onBackToMonth}>
            Back to Month
          </button>
          <button
            className="rounded-lg border border-coral/25 px-3 py-2 text-sm font-semibold text-coral transition hover:bg-coral/10 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={workoutDay.exercises.length === 0}
            onClick={() => onClearDay(dateKey)}
          >
            Clear Day
          </button>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(340px,1.15fr)]">
        <div className="flex min-h-0 flex-col gap-4">
          <div
            data-testid="day-drop-zone"
            ref={dropZoneRef}
            className={[
              "rounded-lg border p-3 transition",
              isDragOver ? "border-coral bg-coral/10 ring-2 ring-coral/20" : "border-moss/10 bg-limewash/50",
            ].join(" ")}
            onDragEnter={handleDragOver}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Logged Workouts</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-moss">{workoutDay.exercises.length}</span>
            </div>
            <div className="mb-3 rounded-lg border border-dashed border-moss/25 bg-white/75 px-3 py-3 text-sm font-semibold text-moss">
              Drag exercise blocks here to add them to this day.
            </div>
            <div className="scroll-soft flex max-h-[360px] flex-col gap-3 overflow-auto pr-1">
              {workoutDay.exercises.length === 0 ? (
                <div className="rounded-lg border border-dashed border-moss/25 bg-white p-5 text-center text-sm text-ink/60">
                  Drag an exercise block here to log it for this day.
                </div>
              ) : (
                workoutDay.exercises.map((exercise) => (
                  <LoggedExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onUpdate={(updatedExercise) => onSaveExercise(dateKey, updatedExercise)}
                    onDelete={() => onDeleteExercise(dateKey, exercise.id)}
                    onDuplicate={() => onDuplicateExercise(dateKey, exercise)}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="scroll-soft flex min-h-0 flex-col gap-4 overflow-auto pr-1">
          <ExerciseLibrary
            blocks={exerciseBlocks}
            selectedCategory={libraryCategory}
            onCategoryChange={setLibraryCategory}
            onPointerDragStart={startPointerDrag}
          />
        </div>
      </div>
      <CustomExerciseForm onAddCustomExercise={onAddCustomExercise} />
      {draggingBlock && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-coral/25 bg-white px-4 py-3 text-sm font-bold text-ink shadow-panel"
          style={{ left: draggingBlock.x + 12, top: draggingBlock.y + 12 }}
        >
          {draggingBlock.block.name}
        </div>
      )}
    </section>
  );
}

function ExerciseLibrary({
  blocks,
  selectedCategory,
  onCategoryChange,
  onPointerDragStart,
}: {
  blocks: ExerciseBlock[];
  selectedCategory: WorkoutCategory;
  onCategoryChange: (category: WorkoutCategory) => void;
  onPointerDragStart: (block: ExerciseBlock, event: React.PointerEvent<HTMLElement>) => void;
}) {
  const visibleBlocks = blocks.filter((block) => block.category === selectedCategory);

  return (
    <div className="rounded-lg border border-moss/10 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-base font-bold text-ink">Exercise Library</h3>
        <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-limewash p-1">
          {categories.map((category) => (
            <button
              key={category}
              className={[
                "rounded-md px-2 py-2 text-xs font-bold transition",
                selectedCategory === category ? "bg-white text-ink shadow-sm" : "text-moss hover:bg-white/60",
              ].join(" ")}
              onClick={() => onCategoryChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {visibleBlocks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-moss/25 bg-limewash/50 p-4 text-sm text-ink/60 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
            Add a custom exercise to see it here.
          </div>
        ) : (
          visibleBlocks.map((block) => <ExerciseCard key={block.id} block={block} onPointerDragStart={onPointerDragStart} />)
        )}
      </div>
    </div>
  );
}

function ExerciseCard({
  block,
  onPointerDragStart,
}: {
  block: ExerciseBlock;
  onPointerDragStart: (block: ExerciseBlock, event: React.PointerEvent<HTMLElement>) => void;
}) {
  function handleDragStart(event: React.DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-workout-block", JSON.stringify(block));
    event.dataTransfer.setData("text/plain", block.name);
  }

  return (
    <article
      data-testid={`exercise-block-${block.id}`}
      className="cursor-grab rounded-lg border border-moss/10 bg-limewash/45 p-3 transition active:cursor-grabbing hover:border-moss/25 hover:bg-mint/60"
      draggable
      onDragStart={handleDragStart}
      onPointerDown={(event) => onPointerDragStart(block, event)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-bold text-ink">{block.name}</h4>
          <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-bold ${categoryStyles[block.category]}`}>{block.category}</span>
        </div>
        <span className="shrink-0 rounded-lg border border-moss/20 bg-white px-3 py-2 text-xs font-bold text-moss">Drag</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <MiniMetric label="Sets" value={block.defaultSets || "-"} />
        <MiniMetric label="Reps" value={block.defaultReps || "-"} />
        <MiniMetric label="Weight" value={block.defaultWeight ? `${block.defaultWeight} lb` : "-"} />
      </div>
    </article>
  );
}

function LoggedExerciseCard({
  exercise,
  onUpdate,
  onDelete,
  onDuplicate,
}: {
  exercise: LoggedExercise;
  onUpdate: (exercise: LoggedExercise) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [quickWeight, setQuickWeight] = useState(exercise.weight === undefined ? "" : String(exercise.weight));
  const [draft, setDraft] = useState({
    weight: exercise.weight === undefined ? "" : String(exercise.weight),
    sets: String(exercise.sets),
    reps: String(exercise.reps),
    notes: exercise.notes || "",
  });

  useEffect(() => {
    setQuickWeight(exercise.weight === undefined ? "" : String(exercise.weight));
    setDraft({
      weight: exercise.weight === undefined ? "" : String(exercise.weight),
      sets: String(exercise.sets),
      reps: String(exercise.reps),
      notes: exercise.notes || "",
    });
  }, [exercise]);

  function updateDraft(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveQuickWeight() {
    const weight = quickWeight === "" ? undefined : Number(quickWeight);

    onUpdate({
      ...exercise,
      weight: Number.isFinite(weight) ? weight : undefined,
    });
  }

  function saveInlineEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const weight = draft.weight === "" ? undefined : Number(draft.weight);
    const sets = Number(draft.sets);
    const reps = Number(draft.reps);

    if (!Number.isFinite(sets) || !Number.isFinite(reps) || sets < 1 || reps < 1) return;

    onUpdate({
      ...exercise,
      weight: Number.isFinite(weight) ? weight : undefined,
      sets,
      reps,
      notes: draft.notes.trim() || undefined,
    });
    setIsEditing(false);
  }

  function beginInlineEdit() {
    setIsEditing(true);
  }

  return (
    <article data-testid={`logged-exercise-${exercise.id}`} className="rounded-lg border border-moss/10 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-lg font-bold text-ink">{exercise.name}</h4>
          <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-bold ${categoryStyles[exercise.category]}`}>{exercise.category}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-md border border-moss/20 px-2.5 py-1.5 text-xs font-bold text-moss transition hover:bg-mint" onClick={beginInlineEdit}>
            Edit
          </button>
          <button className="rounded-md border border-moss/20 px-2.5 py-1.5 text-xs font-bold text-moss transition hover:bg-mint" onClick={onDuplicate}>
            Duplicate
          </button>
          <button className="rounded-md border border-coral/25 px-2.5 py-1.5 text-xs font-bold text-coral transition hover:bg-coral/10" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>

      {isEditing ? (
        <form className="mt-3 rounded-lg border border-moss/10 bg-limewash/45 p-3" onSubmit={saveInlineEdit}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Weight</span>
              <div className="flex overflow-hidden rounded-lg border border-moss/15 bg-white">
                <input
                  aria-label={`${exercise.name} weight`}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm"
                  type="number"
                  min="0"
                  step="0.5"
                  value={draft.weight}
                  onChange={(event) => updateDraft("weight", event.target.value)}
                  placeholder="135"
                />
                <span className="border-l border-moss/10 px-3 py-2 text-sm font-semibold text-moss">lb</span>
              </div>
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Sets</span>
              <input
                aria-label={`${exercise.name} sets`}
                className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm"
                type="number"
                min="1"
                value={draft.sets}
                onChange={(event) => updateDraft("sets", event.target.value)}
                required
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Reps</span>
              <input
                aria-label={`${exercise.name} reps`}
                className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm"
                type="number"
                min="1"
                value={draft.reps}
                onChange={(event) => updateDraft("reps", event.target.value)}
                required
              />
            </label>
            <label className="sm:col-span-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Notes</span>
              <textarea
                aria-label={`${exercise.name} notes`}
                className="min-h-[72px] w-full resize-y rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm"
                value={draft.notes}
                onChange={(event) => updateDraft("notes", event.target.value)}
                placeholder="Optional notes"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-md bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-moss" type="submit">
              Save
            </button>
            <button className="rounded-md border border-moss/20 px-3 py-2 text-xs font-bold text-moss transition hover:bg-mint" type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <label className="rounded-md bg-white/80 px-2 py-2 text-center ring-1 ring-moss/10">
              <span className="text-[11px] font-bold uppercase tracking-wide text-moss/75">Weight</span>
              <div className="mt-1 flex overflow-hidden rounded-md border border-moss/15 bg-white">
                <input
                  aria-label={`${exercise.name} quick weight`}
                  className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-center text-sm font-bold text-ink"
                  type="number"
                  min="0"
                  step="0.5"
                  value={quickWeight}
                  onChange={(event) => setQuickWeight(event.target.value)}
                  onBlur={saveQuickWeight}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="-"
                />
                <span className="border-l border-moss/10 px-2 py-1.5 text-xs font-bold text-moss">lb</span>
              </div>
            </label>
            <MiniMetric label="Sets" value={exercise.sets} />
            <MiniMetric label="Reps" value={exercise.reps} />
          </div>

          {exercise.notes && <p className="mt-3 rounded-lg bg-limewash px-3 py-2 text-sm text-ink/70">{exercise.notes}</p>}
        </>
      )}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/80 px-2 py-2 text-center ring-1 ring-moss/10">
      <div className="text-[11px] font-bold uppercase tracking-wide text-moss/75">{label}</div>
      <div className="mt-0.5 truncate text-sm font-bold text-ink">{value}</div>
    </div>
  );
}

function CustomExerciseForm({ onAddCustomExercise }: { onAddCustomExercise: (block: Omit<ExerciseBlock, "id">) => void }) {
  const [form, setForm] = useState({
    name: "",
    category: "Custom" as WorkoutCategory,
    defaultSets: "3",
    defaultReps: "10",
    defaultWeight: "",
  });

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return;

    onAddCustomExercise({
      name,
      category: form.category,
      defaultSets: form.defaultSets ? Number(form.defaultSets) : undefined,
      defaultReps: form.defaultReps ? Number(form.defaultReps) : undefined,
      defaultWeight: form.defaultWeight ? Number(form.defaultWeight) : undefined,
    });

    setForm({
      name: "",
      category: "Custom",
      defaultSets: "3",
      defaultReps: "10",
      defaultWeight: "",
    });
  }

  return (
    <form data-testid="custom-exercise-form" className="rounded-lg border border-moss/10 bg-white p-4" onSubmit={submit}>
      <h3 className="mb-3 text-base font-bold text-ink">Add Custom Exercise</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Exercise name</span>
          <input
            className="w-full rounded-lg border border-moss/15 bg-limewash/40 px-3 py-2 text-sm"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Cable Woodchops"
            required
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Category</span>
          <select className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm" value={form.category} onChange={(event) => updateField("category", event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Default weight</span>
          <input
            aria-label="Default weight"
            data-testid="custom-default-weight"
            className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm"
            type="number"
            min="0"
            step="0.5"
            value={form.defaultWeight}
            onChange={(event) => updateField("defaultWeight", event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Default sets</span>
          <input className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm" type="number" min="1" value={form.defaultSets} onChange={(event) => updateField("defaultSets", event.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-moss">Default reps</span>
          <input className="w-full rounded-lg border border-moss/15 bg-white px-3 py-2 text-sm" type="number" min="1" value={form.defaultReps} onChange={(event) => updateField("defaultReps", event.target.value)} />
        </label>
      </div>
      <button className="mt-4 w-full rounded-lg bg-coral px-4 py-2 text-sm font-bold text-white transition hover:bg-[#d95c4e]" type="submit">
        Add Custom Exercise
      </button>
    </form>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
