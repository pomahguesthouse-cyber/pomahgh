import { create } from "zustand";

export type Persona = "budget" | "luxury" | "foreign" | "difficult";
export type Language = "id" | "en";
export type Difficulty = "easy" | "medium" | "hard";

export interface ScenarioConfig {
  persona: Persona;
  language: Language;
  difficulty: Difficulty;
  goal?: string;
}

export interface ChatMessage {
  role: "guest" | "bot";
  content: string;
}

export interface Evaluation {
  friendliness: number;
  clarity: number;
  persuasiveness: number;
  conversion: number;
  strengths: string[];
  weaknesses: string[];
  suggestedReply: string;
}

export interface TrainingSession {
  id: string;
  scenario: ScenarioConfig;
  conversation: ChatMessage[];
  evaluation: Evaluation | null;
  status: "active" | "completed";
  created_at: string;
}

interface TrainerState {
  // Scenario settings
  scenario: ScenarioConfig;
  setScenario: (s: Partial<ScenarioConfig>) => void;

  // Current session
  currentSession: TrainingSession | null;
  isRunning: boolean;
  isThinking: boolean;

  // History
  sessions: TrainingSession[];

  // Actions
  startSession: () => void;
  addMessage: (msg: ChatMessage) => void;
  setEvaluation: (ev: Evaluation) => void;
  completeSession: () => void;
  setIsRunning: (v: boolean) => void;
  setIsThinking: (v: boolean) => void;
  setSessions: (s: TrainingSession[]) => void;
  setCurrentSession: (s: TrainingSession | null) => void;
  viewSession: (id: string) => void;
}

export const useTrainerStore = create<TrainerState>((set, get) => ({
  scenario: { persona: "budget", language: "id", difficulty: "easy" },
  setScenario: (s) => set((st) => ({ scenario: { ...st.scenario, ...s } })),

  currentSession: null,
  isRunning: false,
  isThinking: false,
  sessions: [],

  startSession: () => {
    const session: TrainingSession = {
      id: crypto.randomUUID(),
      scenario: { ...get().scenario },
      conversation: [],
      evaluation: null,
      status: "active",
      created_at: new Date().toISOString(),
    };
    set({ currentSession: session, isRunning: true });
  },

  addMessage: (msg) =>
    set((st) => {
      if (!st.currentSession) return st;
      return {
        currentSession: {
          ...st.currentSession,
          conversation: [...st.currentSession.conversation, msg],
        },
      };
    }),

  setEvaluation: (ev) =>
    set((st) => {
      if (!st.currentSession) return st;
      return {
        currentSession: { ...st.currentSession, evaluation: ev },
      };
    }),

  completeSession: () =>
    set((st) => {
      if (!st.currentSession) return st;
      const completed = { ...st.currentSession, status: "completed" as const };
      return {
        currentSession: completed,
        isRunning: false,
        sessions: [completed, ...st.sessions],
      };
    }),

  setIsRunning: (v) => set({ isRunning: v }),
  setIsThinking: (v) => set({ isThinking: v }),
  setSessions: (s) => set({ sessions: s }),
  setCurrentSession: (s) => set({ currentSession: s }),
  viewSession: (id) => {
    const session = get().sessions.find((s) => s.id === id);
    if (session) set({ currentSession: session, isRunning: false });
  },
}));
