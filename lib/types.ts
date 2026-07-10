/* ===== TimeSight core types ===== */

export type TaskStatus = "pending" | "active" | "paused" | "completed" | "cancelled" | "skipped";
export type Priority = "low" | "medium" | "high";
export type Energy = "" | "Low" | "Medium" | "High";
export type PlanningStyle = "flexible" | "time-blocked" | "routine-based" | "low-pressure";
export type CoachTone = "gentle" | "direct" | "structured" | "minimal";

export interface UserSettings {
  planningStyle: PlanningStyle;
  coachTone: CoachTone;
  mainStruggle: string;
  defaultTimerMinutes: number;
  defaultBreakMinutes: number;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  /** Social: opt-in. When off, nothing about this account is visible to anyone. */
  sharingEnabled: boolean;
  shareName: string;
  shareCode: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  planningStyle: "flexible",
  coachTone: "gentle",
  mainStruggle: "",
  defaultTimerMinutes: 15,
  defaultBreakMinutes: 5,
  notificationsEnabled: false,
  onboardingCompleted: false,
  sharingEnabled: false,
  shareName: "",
  shareCode: "",
};

export interface Task {
  id: string;
  title: string;
  normalizedTitle: string;
  category: string;
  priority: Priority;
  energyLevel: Energy;
  estimatedMinutes: number;
  status: TaskStatus;
  scheduledFor: "today" | "later";
  dueAt: number | null;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  actualMinutes: number | null;
  routineId: string | null;
  notes: string;
  source: "manual" | "routine" | "connector";
}

export interface TimeSession {
  id: string;
  taskId: string | null;
  taskTitle: string;
  normalizedTaskTitle: string;
  category: string;
  estimatedMinutes: number;
  actualMinutes: number;
  startedAt: number;
  endedAt: number;
  pausedMs: number;
  wasFinishedOnEstimate: boolean;
  estimateErrorMinutes: number;
  estimateErrorPercent: number;
  routineId: string | null;
  routineRunId: string | null;
  demo?: boolean;
}

export interface RoutineTask {
  id: string;
  title: string;
  estimatedMinutes: number;
  category: string;
  order: number;
  notes: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  tasks: RoutineTask[];
  createdAt: number;
  updatedAt: number;
  demo?: boolean;
}

export interface RoutineRun {
  id: string;
  routineId: string;
  routineName: string;
  startedAt: number;
  endedAt: number | null;
  estimatedTotalMinutes: number;
  actualTotalMinutes: number;
  completedTaskCount: number;
  skippedTaskCount: number;
}

export interface ActiveSession {
  taskId: string;
  taskTitle: string;
  estimatedMinutes: number;
  startedAt: number;
  pausedAt: number | null;
  pausedTotalMs: number;
  extraMinutes: number;
  keepTiming: boolean;
  routine: { routineId: string; routineName: string; runId: string; index: number; total: number } | null;
}

export interface ExternalItem {
  id: string;
  provider: string;
  externalId: string;
  type: "event" | "task";
  title: string;
  startTime: number | null;
  endTime: number | null;
  durationMinutes: number | null;
  importedTaskId: string | null;
}

export interface ConnectorState {
  provider: string;
  status: "connected" | "disconnected" | "needs_setup";
  connectedAt: number | null;
  lastSyncAt: number | null;
  /** OAuth tokens, stored in the user's own protected Firestore space.
      The OAuth client SECRET never appears here — refresh happens server-side. */
  tokens?: { accessToken: string; refreshToken: string | null; expiresAt: number } | null;
  accountEmail?: string | null;
  /** Provider-specific settings, e.g. which Notion database to sync. */
  config?: { databaseId?: string; databaseName?: string } | null;
}

export interface FriendLink {
  uid: string;
  name: string;
  addedAt: number;
}

export interface AppData {
  tasks: Task[];
  sessions: TimeSession[];
  routines: Routine[];
  routineRuns: RoutineRun[];
  active: ActiveSession | null;
  settings: UserSettings;
  externalItems: ExternalItem[];
  connectors: ConnectorState[];
  friends: FriendLink[];
}

export const EMPTY_DATA: AppData = {
  tasks: [], sessions: [], routines: [], routineRuns: [],
  active: null, settings: { ...DEFAULT_SETTINGS }, externalItems: [], connectors: [], friends: [],
};

export interface Prediction {
  predictedMinutes: number;
  confidence: number;
  label: string;
  sampleSize: number;
  avgActual: number;
  explanation: string;
}

export interface Insight {
  type: string;
  severity: "good" | "warn" | "info";
  title: string;
  body: string;
  suggestedAction?: string;
}
