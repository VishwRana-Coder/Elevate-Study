"use client";

import { useState, useEffect, useRef } from "react";
import { UserButton, useUser, UserProfile } from "@clerk/nextjs";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────
type Priority = "low" | "medium" | "high";
type TaskGroup = "today" | "upcoming" | "completed";
type EventType = "exam" | "deadline" | "session";
type Page = "dashboard" | "tasks" | "goals" | "calendar" | "analytics";

interface Task {
  id: number; label: string; done: boolean;
  priority: Priority; subject: string; due: string; group: TaskGroup;
}
interface Goal {
  id: number; label: string; progress: number;
  category: string; period: "weekly" | "monthly";
}
interface CalEvent {
  id: number; label: string; date: string; type: EventType;
}
interface StudyDay { date: string; minutes: number; }

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_META: Record<Priority, { color: string; dot: string; label: string }> = {
  high:   { color: "text-red-500",     dot: "bg-red-500",     label: "High" },
  medium: { color: "text-amber-500",   dot: "bg-amber-500",   label: "Med"  },
  low:    { color: "text-emerald-500", dot: "bg-emerald-500", label: "Low"  },
};
const EVT_STYLE: Record<EventType, string> = {
  exam:     "bg-red-500/10 text-red-500 border-red-500/20",
  deadline: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  session:  "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20",
};
const WEEK_DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SUBJECT_COLORS = [
  "bg-blue-500","bg-purple-500","bg-emerald-500","bg-amber-500",
  "bg-pink-500","bg-cyan-500","bg-orange-500","bg-indigo-500",
];
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does — keep going.", author: "Sam Levenson" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Education is the passport to the future.", author: "Malcolm X" },
  { text: "Study while others are sleeping; work while others are loafing.", author: "William A. Ward" },
  { text: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
];

const DEFAULT_SUBJECTS = ["Math","Physics","Biology","CS","English","Chemistry","History"];
const DEFAULT_TASKS: Task[] = [];
const DEFAULT_GOALS: Goal[] = [];
const DEFAULT_EVENTS: CalEvent[] = [];
const TODAY_STR = new Date().toISOString().slice(0,10);

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: Priority }) {
  const m = PRIORITY_META[p];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />{m.label}
    </span>
  );
}
function ProgressBar({ value, accent=false }: { value: number; accent?: boolean }) {
  return (
    <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${accent ? "bg-gradient-to-r from-[var(--accent)] to-purple-400" : "bg-gradient-to-r from-[var(--primary)] to-indigo-400"}`}
        style={{ width:`${value}%` }} />
    </div>
  );
}

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
function PomodoroModal({ onClose, onMinuteDone }: { onClose:()=>void; onMinuteDone:()=>void }) {
  const MODES = { focus: 25*60, short: 5*60, long: 15*60 };
  type Mode = keyof typeof MODES;
  const [mode, setMode] = useState<Mode>("focus");
  const [seconds, setSeconds] = useState(MODES.focus);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const lastMinRef = useRef(Math.floor(MODES.focus / 60));

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { setRunning(false); return 0; }
          const newS = s - 1;
          const newMin = Math.floor(newS / 60);
          if (newMin < lastMinRef.current) {
            lastMinRef.current = newMin;
            if (mode === "focus") onMinuteDone();
          }
          return newS;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, onMinuteDone]);

  const switchMode = (m: Mode) => { setMode(m); setSeconds(MODES[m]); setRunning(false); lastMinRef.current = Math.floor(MODES[m]/60); };
  const mm = String(Math.floor(seconds/60)).padStart(2,"0");
  const ss = String(seconds%60).padStart(2,"0");
  const pct = 1 - seconds/MODES[mode];
  const r = 54; const circ = 2*Math.PI*r;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--foreground)]/40 hover:text-[var(--foreground)] transition-colors text-lg">✕</button>
        <h2 className="font-black text-lg mb-4">🍅 Focus Session</h2>
        <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] mb-6">
          {(Object.keys(MODES) as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode===m ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--foreground)]/50 hover:text-[var(--foreground)]"}`}>
              {m==="focus"?"Focus":m==="short"?"Short":"Long"}
            </button>
          ))}
        </div>
        <div className="relative inline-flex items-center justify-center mb-6">
          <svg width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border)" strokeWidth="6"/>
            <circle cx="70" cy="70" r={r} fill="none" stroke="var(--primary)" strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" className="transition-all duration-1000"/>
          </svg>
          <span className="absolute font-black text-3xl tracking-tight">{mm}:{ss}</span>
        </div>
        <p className="text-xs text-[var(--foreground)]/50 mb-4">
          {mode==="focus" ? "⏱ Every minute of focus is tracked to your study hours" : "☕ Take a well-earned break"}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setRunning(r => !r)} className="primary-btn px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
            {running ? "⏸ Pause" : "▶ Start"}
          </button>
          <button onClick={() => { setSeconds(MODES[mode]); setRunning(false); lastMinRef.current=Math.floor(MODES[mode]/60); }}
            className="px-4 py-2.5 rounded-xl font-bold text-sm border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">
            ↺ Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subject Manager Modal ────────────────────────────────────────────────────
function SubjectModal({ subjects, onSave, onClose }: { subjects:string[]; onSave:(s:string[])=>void; onClose:()=>void }) {
  const [list, setList] = useState([...subjects]);
  const [draft, setDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editVal, setEditVal] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-base">✏️ Manage Subjects</h2>
          <button onClick={onClose} className="text-[var(--foreground)]/40 hover:text-[var(--foreground)] text-lg">✕</button>
        </div>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {list.map((s,i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
              {editIdx===i ? (
                <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                  onBlur={() => { if(editVal.trim()) { const n=[...list]; n[i]=editVal.trim(); setList(n); } setEditIdx(null); }}
                  onKeyDown={e => { if(e.key==="Enter") { if(editVal.trim()) { const n=[...list]; n[i]=editVal.trim(); setList(n); } setEditIdx(null); } }}
                  className="flex-1 text-sm bg-transparent border-b border-[var(--primary)] outline-none" />
              ) : (
                <span className="flex-1 text-sm">{s}</span>
              )}
              <button onClick={() => { setEditIdx(i); setEditVal(s); }} className="text-[var(--foreground)]/40 hover:text-[var(--primary)] text-xs px-1">✏️</button>
              <button onClick={() => setList(list.filter((_,j)=>j!==i))} className="text-[var(--foreground)]/40 hover:text-red-500 text-xs px-1">🗑️</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <input value={draft} onChange={e=>setDraft(e.target.value)}
            onKeyDown={e => { if(e.key==="Enter" && draft.trim()) { setList([...list, draft.trim()]); setDraft(""); } }}
            placeholder="Add new subject…"
            className="flex-1 text-sm px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/30" />
          <button onClick={() => { if(draft.trim()) { setList([...list,draft.trim()]); setDraft(""); } }}
            className="primary-btn px-3 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">+</button>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-sm border border-[var(--border)] hover:bg-[var(--hover)] transition-colors">Cancel</button>
          <button onClick={() => { onSave(list); onClose(); }} className="flex-1 primary-btn px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Event Modal ─────────────────────────────────────────────────────
function EventModal({ event, onSave, onClose }: { event: Partial<CalEvent>|null; onSave:(e:Omit<CalEvent,"id">)=>void; onClose:()=>void }) {
  const [label, setLabel] = useState(event?.label ?? "");
  const [date,  setDate]  = useState(event?.date  ?? TODAY_STR);
  const [type,  setType]  = useState<EventType>(event?.type ?? "deadline");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-base">{event?.id ? "✏️ Edit Event" : "➕ New Event"}</h2>
          <button onClick={onClose} className="text-[var(--foreground)]/40 hover:text-[var(--foreground)] text-lg">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[var(--foreground)]/60 mb-1 block">Event Name</label>
            <input value={label} onChange={e=>setLabel(e.target.value)}
              placeholder="e.g. Math Final Exam"
              className="w-full text-sm px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--foreground)]/60 mb-1 block">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none transition-colors" />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--foreground)]/60 mb-1 block">Type</label>
            <div className="flex gap-2">
              {(["exam","deadline","session"] as EventType[]).map(t => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${type===t ? EVT_STYLE[t]+" border-current" : "border-[var(--border)] hover:bg-[var(--hover)]"}`}>
                  {t==="exam"?"📝 Exam":t==="deadline"?"⏰ Deadline":"📚 Session"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-sm border border-[var(--border)] hover:bg-[var(--hover)] transition-colors">Cancel</button>
          <button onClick={() => { if(label.trim() && date) { onSave({label:label.trim(),date,type}); onClose(); } }}
            className="flex-1 primary-btn px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showSubjectMgr, setShowSubjectMgr] = useState(false);
  const [eventModal, setEventModal] = useState<{ event: Partial<CalEvent>|null }|null>(null);

  // ── Subjects ───────────────────────────────────────────────────────────────
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [taskFilter, setTaskFilter] = useState<"all"|TaskGroup>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<"all"|Priority>("all");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("medium");
  const [newTaskSubject, setNewTaskSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [newTaskDue, setNewTaskDue] = useState(TODAY_STR);
  const [editingTaskId, setEditingTaskId] = useState<number|null>(null);
  const [editDraft, setEditDraft] = useState("");

  // ── Goals ─────────────────────────────────────────────────────────────────
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [newGoalLabel, setNewGoalLabel] = useState("");
  const [newGoalCategory, setNewGoalCategory] = useState(DEFAULT_SUBJECTS[0]);
  const [editingGoalId, setEditingGoalId] = useState<number|null>(null);

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<CalEvent[]>(DEFAULT_EVENTS);
  const [calYear, setCalYear]  = useState(2026);
  const [calMonth, setCalMonth] = useState(4); // 0-based, 4=May

  // ── Study hours ───────────────────────────────────────────────────────────
  const [studyDays, setStudyDays] = useState<StudyDay[]>([]);
  const [manualMinutes, setManualMinutes] = useState("");
  const [studyGoalMinutes, setStudyGoalMinutes] = useState(300); // user-editable, default 5h
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  // ── Quote ─────────────────────────────────────────────────────────────────
  const [quote, setQuote] = useState(QUOTES[0]);

  // ── nextId ────────────────────────────────────────────────────────────────
  const nextId = useRef(200);

  const { user, isLoaded } = useUser();



  // ── Hydration: load everything from localStorage ──────────────────────────
  useEffect(() => {
    // Theme
    const theme = lsGet<string>("es_theme","light");
    if (theme==="dark") { setDark(true); document.documentElement.classList.add("dark"); }
    // Subjects
    setSubjects(lsGet("es_subjects", DEFAULT_SUBJECTS));
    // Tasks (expire after 24h handled below)
    setTasks(lsGet("es_tasks", DEFAULT_TASKS));
    // Goals
    setGoals(lsGet("es_goals", DEFAULT_GOALS));
    // Events
    setEvents(lsGet("es_events", DEFAULT_EVENTS));
    // Study days — prune entries older than 7 days
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-7);
    const raw = lsGet<StudyDay[]>("es_study_days",[]);
    setStudyDays(raw.filter(d => new Date(d.date) >= cutoff));
    setStudyGoalMinutes(lsGet("es_study_goal", 300));
    // Quote of the day (refresh every 24h — cycles through all 10, never repeats consecutively)
    const qData = lsGet<{ idx:number; date:string }|null>("es_quote_data",null);
    const todayDate = new Date().toDateString();
    if (!qData || qData.date !== todayDate) {
      // Pick next index different from the last shown
      const lastIdx = qData?.idx ?? -1;
      let nextIdx = Math.floor(Math.random() * QUOTES.length);
      if (QUOTES.length > 1 && nextIdx === lastIdx) nextIdx = (nextIdx + 1) % QUOTES.length;
      lsSet("es_quote_data", { idx: nextIdx, date: todayDate });
      setQuote(QUOTES[nextIdx]);
    } else {
      setQuote(QUOTES[qData.idx]);
    }
    // Sidebar default open on desktop
    if (window.innerWidth >= 768) setSidebarOpen(true);
    setHydrated(true);
  },[]);
  useEffect(() => {
    setHydrated(true);
  }, []);
  // ── Persist on every change ───────────────────────────────────────────────
  useEffect(() => { if(hydrated) lsSet("es_subjects", subjects); }, [subjects, hydrated]);
  useEffect(() => { if(hydrated) lsSet("es_tasks", tasks); }, [tasks, hydrated]);
  useEffect(() => { if(hydrated) lsSet("es_goals", goals); }, [goals, hydrated]);
  useEffect(() => { if(hydrated) lsSet("es_events", events); }, [events, hydrated]);
  useEffect(() => { if(hydrated) lsSet("es_study_days", studyDays); }, [studyDays, hydrated]);
  useEffect(() => { if(hydrated) lsSet("es_study_goal", studyGoalMinutes); }, [studyGoalMinutes, hydrated]);

  // ── Theme toggle ──────────────────────────────────────────────────────────
  const toggleTheme = () => {
    const n = !dark; setDark(n);
    document.documentElement.classList[n?"add":"remove"]("dark");
    lsSet("es_theme", n?"dark":"light");
  };

  // ── Study hours helpers ───────────────────────────────────────────────────
  const todayStudy = studyDays.find(d=>d.date===TODAY_STR);
  const todayMinutes = todayStudy?.minutes ?? 0;

  const addStudyMinutes = (m: number) => {
    setStudyDays(prev => {
      const idx = prev.findIndex(d=>d.date===TODAY_STR);
      if (idx>=0) { const n=[...prev]; n[idx]={...n[idx], minutes:n[idx].minutes+m}; return n; }
      return [...prev, {date:TODAY_STR, minutes:m}];
    });
  };

  const setTodayMinutes = (m: number) => {
    setStudyDays(prev => {
      const idx = prev.findIndex(d=>d.date===TODAY_STR);
      if (idx>=0) { const n=[...prev]; n[idx]={...n[idx], minutes:Math.max(0,m)}; return n; }
      return [...prev, {date:TODAY_STR, minutes:Math.max(0,m)}];
    });
  };

  // Streak: count consecutive days studied (today backwards)
  const streak = (() => {
    let count = 0;
    const d = new Date();
    while(true) {
      const s = d.toISOString().slice(0,10);
      if (studyDays.find(x=>x.date===s && x.minutes>0)) { count++; d.setDate(d.getDate()-1); }
      else break;
    }
    return count;
  })();

  const weekMinutes = studyDays
    .filter(d => { const dt=new Date(d.date); const week=new Date(); week.setDate(week.getDate()-6); return dt>=week; })
    .reduce((a,d)=>a+d.minutes,0);

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const addTask = () => {
    if(!newTaskLabel.trim()) return;
    const dueDate = newTaskDue;
    const group: TaskGroup = dueDate===TODAY_STR?"today":"upcoming";
    setTasks(p => [...p, { id:nextId.current++, label:newTaskLabel.trim(), done:false, priority:newTaskPriority, subject:newTaskSubject, due:dueDate, group }]);
    setNewTaskLabel("");
  };
  const toggleTask = (id:number) => setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done,group:!t.done?"completed":t.due===TODAY_STR?"today":"upcoming"}:t));
  const deleteTask = (id:number) => setTasks(p=>p.filter(t=>t.id!==id));
  const saveTaskEdit = (id:number) => { if(editDraft.trim()) setTasks(p=>p.map(t=>t.id===id?{...t,label:editDraft.trim()}:t)); setEditingTaskId(null); };

  // ── Goals ─────────────────────────────────────────────────────────────────
  const addGoal = () => {
    if(!newGoalLabel.trim()) return;
    setGoals(p=>[...p,{id:nextId.current++,label:newGoalLabel.trim(),progress:0,category:newGoalCategory,period:"weekly"}]);
    setNewGoalLabel("");
  };
  const deleteGoal = (id:number) => setGoals(p=>p.filter(g=>g.id!==id));
  const setGoalProg = (id:number,v:number) => setGoals(p=>p.map(g=>g.id===id?{...g,progress:v}:g));
  const saveGoalEdit = (id:number) => { if(editDraft.trim()) setGoals(p=>p.map(g=>g.id===id?{...g,label:editDraft.trim()}:g)); setEditingGoalId(null); };

  // ── Calendar ──────────────────────────────────────────────────────────────
  const addOrUpdateEvent = (data: Omit<CalEvent,"id">, existingId?: number) => {
    if (existingId) { setEvents(p=>p.map(e=>e.id===existingId?{...e,...data}:e)); }
    else { setEvents(p=>[...p,{id:nextId.current++,...data}]); }
  };
  const deleteEvent = (id:number) => setEvents(p=>p.filter(e=>e.id!==id));

  const calDaysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const calFirstDay = new Date(calYear, calMonth, 1).getDay(); // 0=Sun
  const calMonthStr = new Date(calYear, calMonth, 1).toLocaleString("default",{month:"long",year:"numeric"});
  const prevMonth = () => { if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); };
  const nextMonth = () => { if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); };

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter(t => {
    if(taskFilter!=="all" && t.group!==taskFilter) return false;
    if(subjectFilter!=="all" && t.subject!==subjectFilter) return false;
    if(priorityFilter!=="all" && t.priority!==priorityFilter) return false;
    return true;
  });
  const todayTasks = tasks.filter(t=>t.group==="today"&&!t.done).slice(0,5);
  const upcomingEvts = [...events].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const completedThisWeek = tasks.filter(t=>t.done).length;
  const totalSubjectMin = Math.max(1, weekMinutes);

  // ── Nav items ─────────────────────────────────────────────────────────────
  const NAV = [
    {key:"dashboard" as Page, icon:"⊞", label:"Dashboard"},
    {key:"tasks"     as Page, icon:"✓", label:"Tasks"},
    {key:"goals"     as Page, icon:"🎯", label:"Goals"},
    {key:"calendar"  as Page, icon:"📅", label:"Calendar"},
    {key:"analytics" as Page, icon:"📊", label:"Analytics"},
  ];

  const navigate = (p: Page) => { setPage(p); setMobileNavOpen(false); };

  if (!hydrated) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin"/></div>;

  const userName =
    user?.username ||
    user?.firstName ||
    user?.fullName ||
    "User";

  const userEmail =
    user?.primaryEmailAddress?.emailAddress;

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex transition-colors duration-300 overflow-hidden">

      {/* Modals */}
      {showPomodoro && <PomodoroModal onClose={()=>setShowPomodoro(false)} onMinuteDone={()=>addStudyMinutes(1)} />}
      {showSubjectMgr && <SubjectModal subjects={subjects} onSave={s=>{setSubjects(s);if(!s.includes(newTaskSubject))setNewTaskSubject(s[0]??"");}} onClose={()=>setShowSubjectMgr(false)} />}
      {eventModal && <EventModal event={eventModal.event} onSave={(d)=>addOrUpdateEvent(d,eventModal.event?.id)} onClose={()=>setEventModal(null)} />}

      {/* Mobile nav overlay */}
      {mobileNavOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={()=>setMobileNavOpen(false)}/>}

      {/* ══ SIDEBAR ══ */}
      <aside className={`fixed md:relative z-40 h-full flex flex-col flex-shrink-0 bg-[var(--sidebar)] text-white transition-all duration-300
        ${sidebarOpen ? "w-56" : "w-0 md:w-16"} ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{minHeight:"100dvh"}}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 flex-shrink-0">
          <Image
            src="/Logo.png"
            alt="Elevate Study Logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          {sidebarOpen && <span className="font-bold text-sm tracking-tight whitespace-nowrap">Elevate Study</span>}
        </div>
        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV.map(item => (
            <button key={item.key} onClick={()=>navigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${page===item.key ? "bg-white/20 text-white" : "text-white/60 hover:bg-white/10 hover:text-white"}`}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>
        {/* User */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <UserButton />
            {sidebarOpen && <div className="min-w-0" ><p className="text-xm font-semibold truncate">{userName}</p></div>}
          </div>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-screen">

        {/* ── Top Bar ── */}
        <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button onClick={()=>setMobileNavOpen(o=>!o)} className="md:hidden w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--hover)] transition-colors text-sm flex-shrink-0">☰</button>
            {/* Desktop sidebar toggle */}
            <button onClick={()=>setSidebarOpen(o=>!o)} className="hidden md:flex w-8 h-8 rounded-lg border border-[var(--border)] items-center justify-center hover:bg-[var(--hover)] transition-colors text-sm flex-shrink-0">☰</button>
           <div className="min-w-0">
          <h1 className="font-black text-sm md:text-lg leading-tight truncate">
            {page === "dashboard"
              ? `Good afternoon, ${userName}`
              : NAV.find((n) => n.key === page)?.label}
          </h1>

          {page === "dashboard" && (
            <p className="text-[10px] md:text-xs text-[var(--foreground)]/50 hidden sm:block">
             {todayDate} · {streak} day streak 🔥
            </p>
          )}
        </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={()=>setShowPomodoro(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--hover)] transition-colors text-xs font-semibold">
              🍅 <span className="hidden md:inline">Focus</span>
            </button>
            <button onClick={()=>setShowPomodoro(true)} className="sm:hidden w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-sm">🍅</button>
            {/* Theme toggle */}
            <button onClick={toggleTheme} aria-label="Toggle theme"
              className="relative w-12 h-6 rounded-full bg-[var(--surface)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
              <span className={`absolute top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 shadow-sm ${dark?"translate-x-6 bg-[var(--primary)]":"translate-x-0.5 bg-[var(--primary)]  "}`}>
                {dark?"🌙":"☀️"}
              </span>
            </button>
            <UserButton />
          </div>
        </header>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══════════════════════════════════════════════════════════════════
              DASHBOARD
          ══════════════════════════════════════════════════════════════════ */}
          {page==="dashboard" && (
            <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">

              {/* Stats strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon:"⏱", label:"Today", val:`${Math.floor(todayMinutes/60)}h ${todayMinutes%60}m` },
                  { icon:"🔥", label:"Streak", val:`${streak} days` },
                  { icon:"✅", label:"Done", val:`${tasks.filter(t=>t.done).length}` },
                  { icon:"📅", label:"This week", val:`${Math.floor(weekMinutes/60)}h` },
                ].map(s=>(
                  <div key={s.label} className="card rounded-xl p-3 text-center">
                    <span className="text-xl">{s.icon}</span>
                    <p className="font-black text-lg text-[var(--primary)] mt-1">{s.val}</p>
                    <p className="text-[10px] text-[var(--foreground)]/50">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* Centre: today focus */}
                <div className="md:col-span-2 space-y-4">

                  {/* Today focus card */}
                  <div className="card rounded-2xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="font-black text-base">📌 Today&apos;s Focus</h2>
                        <p className="text-[10px] text-[var(--foreground)]/50 mt-0.5">Your top tasks for today</p>
                      </div>
                      <button onClick={()=>setShowPomodoro(true)} className="primary-btn px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5">
                        🍅 Start Focus
                      </button>
                    </div>
                    <div className="space-y-2">
                      {todayTasks.length===0 && <p className="text-sm text-[var(--foreground)]/40 py-4 text-center">All tasks done for today! 🎉</p>}
                      {todayTasks.map(t=>(
                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">
                          <button onClick={()=>toggleTask(t.id)} className="w-5 h-5 rounded-full border-2 border-[var(--primary)]/40 hover:border-[var(--primary)] flex-shrink-0 transition-colors"/>
                          <span className="flex-1 text-sm min-w-0 truncate">{t.label}</span>
                          <PriorityBadge p={t.priority}/>
                          <span className="hidden sm:block text-[10px] text-[var(--foreground)]/40 bg-[var(--border)] px-2 py-0.5 rounded-full flex-shrink-0">{t.subject}</span>
                        </div>
                      ))}
                    </div>
                    {/* Quick add */}
                    <div className="mt-4 flex gap-2 flex-wrap">
                      <input value={newTaskLabel} onChange={e=>setNewTaskLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                        placeholder="Quick add task…"
                        className="flex-1 min-w-32 text-xs px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors" />
                      <select value={newTaskPriority} onChange={e=>setNewTaskPriority(e.target.value as Priority)} className="text-xs px-2 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] outline-none">
                        <option value="high">🔴 High</option><option value="medium">🟡 Med</option><option value="low">🟢 Low</option>
                      </select>
                      <button onClick={addTask} className="primary-btn px-3 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">+ Add</button>
                    </div>
                  </div>

                  {/* Study hours editor */}
                  <div className="card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-black text-base">⏱ Study Hours — Today</h2>
                      {/* Editable daily goal */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[var(--foreground)]/50">Daily goal:</span>
                        {editingGoal ? (
                          <input
                            autoFocus
                            type="number"
                            value={goalDraft}
                            onChange={e => setGoalDraft(e.target.value)}
                            onBlur={() => { const v=parseInt(goalDraft); if(!isNaN(v)&&v>0) setStudyGoalMinutes(v*60); setEditingGoal(false); }}
                            onKeyDown={e => { if(e.key==="Enter"){ const v=parseInt(goalDraft); if(!isNaN(v)&&v>0) setStudyGoalMinutes(v*60); setEditingGoal(false); } if(e.key==="Escape") setEditingGoal(false); }}
                            className="w-12 text-xs px-1.5 py-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--primary)] outline-none text-center font-bold"
                            placeholder="h"
                          />
                        ) : (
                          <button
                            onClick={() => { setGoalDraft(String(Math.round(studyGoalMinutes/60))); setEditingGoal(true); }}
                            className="text-xs font-bold text-[var(--primary)] hover:underline px-1.5 py-1 rounded-lg hover:bg-[var(--hover)] transition-colors"
                            title="Click to edit your daily goal"
                          >
                            {Math.floor(studyGoalMinutes/60)}h {studyGoalMinutes%60>0?`${studyGoalMinutes%60}m`:""} ✏️
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-center">
                        <p className="font-black text-3xl text-[var(--primary)]">{Math.floor(todayMinutes/60)}<span className="text-lg">h</span> {todayMinutes%60}<span className="text-lg">m</span></p>
                        <p className="text-[10px] text-[var(--foreground)]/50 mt-0.5">recorded today</p>
                      </div>
                      <div className="flex-1">
                        <ProgressBar value={studyGoalMinutes>0 ? Math.min(100,(todayMinutes/studyGoalMinutes)*100) : 0}/>
                        <p className="text-[10px] text-[var(--foreground)]/40 mt-1">
                          {studyGoalMinutes>0 ? Math.min(100,Math.round((todayMinutes/studyGoalMinutes)*100)) : 0}% of {Math.floor(studyGoalMinutes/60)}h{studyGoalMinutes%60>0?` ${studyGoalMinutes%60}m`:""} goal
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-[var(--foreground)]/60 font-semibold">Quick add:</span>
                      {[15,30,45,60].map(m=>(
                        <button key={m} onClick={()=>addStudyMinutes(m)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--surface-secondary)] border border-[var(--border)] hover:bg-[var(--hover)] hover:border-[var(--primary)]/40 transition-colors">+{m}m</button>
                      ))}
                      <div className="flex items-center gap-1 ml-auto">
                        <input type="number" value={manualMinutes} onChange={e=>setManualMinutes(e.target.value)}
                          placeholder="min"
                          className="w-16 text-xs px-2 py-1.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none text-center" />
                        <button onClick={()=>{const m=parseInt(manualMinutes);if(!isNaN(m)&&m>0){setTodayMinutes(m);setManualMinutes("");}}}
                          className="primary-btn px-2 py-1.5 rounded-lg text-xs font-bold hover:opacity-90">Set</button>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[{icon:"✅",label:"All Tasks",to:"tasks"},{icon:"🎯",label:"Goals",to:"goals"},{icon:"📅",label:"Calendar",to:"calendar"},{icon:"📊",label:"Analytics",to:"analytics"}].map(q=>(
                      <button key={q.label} onClick={()=>navigate(q.to as Page)}
                        className="card rounded-xl p-3 text-center hover:border-[var(--primary)]/40 hover:bg-[var(--hover)] transition-all group">
                        <span className="text-xl block mb-1 group-hover:scale-110 transition-transform">{q.icon}</span>
                        <span className="text-xs font-semibold">{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right panel */}
                <div className="space-y-4">
                  {/* Upcoming */}
                  <div className="card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-black text-sm">📅 Upcoming</h2>
                      <button onClick={()=>navigate("calendar")} className="text-xs text-[var(--primary)] hover:underline font-semibold">All →</button>
                    </div>
                    <div className="space-y-2">
                      {upcomingEvts.length===0&&<p className="text-xs text-[var(--foreground)]/40 text-center py-2">No events yet</p>}
                      {upcomingEvts.map(ev=>(
                        <div key={ev.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs ${EVT_STYLE[ev.type]}`}>
                          <span className="font-bold uppercase tracking-wide opacity-70 flex-shrink-0">{ev.type.slice(0,3)}</span>
                          <span className="flex-1 font-semibold truncate">{ev.label}</span>
                          <span className="opacity-60 flex-shrink-0">{ev.date.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Goals snapshot */}
                  <div className="card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-black text-sm">🎯 Goals</h2>
                      <button onClick={()=>navigate("goals")} className="text-xs text-[var(--primary)] hover:underline font-semibold">All →</button>
                    </div>
                    <div className="space-y-3">
                      {goals.slice(0,3).map(g=>(
                        <div key={g.id}>
                          <div className="flex justify-between mb-1"><span className="text-xs font-medium truncate flex-1">{g.label}</span><span className="text-xs font-bold text-[var(--primary)] ml-2">{g.progress}%</span></div>
                          <ProgressBar value={g.progress}/>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quote of the day */}
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/20">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] mb-2">💬 Quote of the Day</p>
                    <p className="text-sm text-[var(--foreground)]/80 leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
                    <p className="text-[10px] text-[var(--foreground)]/50 mt-2 font-semibold">— {quote.author}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TASKS
          ══════════════════════════════════════════════════════════════════ */}
          {page==="tasks" && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

              {/* Add task */}
              <div className="card rounded-2xl p-5">
                <h2 className="font-black text-base mb-4">➕ New Task</h2>
                <div className="space-y-3">
                  <input value={newTaskLabel} onChange={e=>setNewTaskLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                    placeholder="What do you need to do?"
                    className="w-full text-sm px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors" />
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-36">
                      <select value={newTaskSubject} onChange={e=>setNewTaskSubject(e.target.value)}
                        className="flex-1 text-sm px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] outline-none">
                        {subjects.map(s=><option key={s}>{s}</option>)}
                      </select>
                      <button onClick={()=>setShowSubjectMgr(true)} title="Manage subjects"
                        className="w-9 h-9 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] hover:bg-[var(--hover)] transition-colors flex items-center justify-center text-sm flex-shrink-0">✏️</button>
                    </div>
                    <select value={newTaskPriority} onChange={e=>setNewTaskPriority(e.target.value as Priority)}
                      className="text-sm px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] outline-none">
                      <option value="high">🔴 High</option><option value="medium">🟡 Medium</option><option value="low">🟢 Low</option>
                    </select>
                    <input type="date" value={newTaskDue} onChange={e=>setNewTaskDue(e.target.value)}
                      className="text-sm px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] outline-none transition-colors focus:border-[var(--primary)]"/>
                    <button onClick={addTask} className="primary-btn px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Add Task</button>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {(["all","today","upcoming","completed"] as const).map(f=>(
                  <button key={f} onClick={()=>setTaskFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${taskFilter===f?"bg-[var(--primary)] text-white":"bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--hover)]"}`}>
                    {f.charAt(0).toUpperCase()+f.slice(1)}
                  </button>
                ))}
                <div className="w-px bg-[var(--border)] mx-0.5"/>
                {(["all","high","medium","low"] as const).map(f=>(
                  <button key={f} onClick={()=>setPriorityFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${priorityFilter===f?"bg-[var(--accent)] text-white":"bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--hover)]"}`}>
                    {f==="all"?"All Priority":PRIORITY_META[f as Priority].label}
                  </button>
                ))}
                <div className="w-px bg-[var(--border)] mx-0.5"/>
                <select value={subjectFilter} onChange={e=>setSubjectFilter(e.target.value)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] outline-none">
                  <option value="all">All Subjects</option>
                  {subjects.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>

              {/* Task list */}
              <div className="card rounded-2xl overflow-hidden">
                {filteredTasks.length===0&&<div className="py-10 text-center text-[var(--foreground)]/40 text-sm">No tasks match your filters.</div>}
                <div className="divide-y divide-[var(--border)]">
                  {filteredTasks.map(t=>(
                    <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--hover)] transition-colors group">
                      <button onClick={()=>toggleTask(t.id)}
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs border-2 transition-colors ${t.done?"bg-emerald-500 border-emerald-500 text-white":"border-[var(--border)] hover:border-[var(--primary)]"}`}>
                        {t.done?"✓":""}
                      </button>
                      {editingTaskId===t.id?(
                        <input autoFocus value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                          onBlur={()=>saveTaskEdit(t.id)}
                          onKeyDown={e=>{if(e.key==="Enter")saveTaskEdit(t.id);if(e.key==="Escape")setEditingTaskId(null);}}
                          className="flex-1 text-sm bg-transparent border-b border-[var(--primary)] outline-none min-w-0"/>
                      ):(
                        <span className={`flex-1 text-sm min-w-0 truncate cursor-text ${t.done?"line-through text-[var(--foreground)]/40":""}`}
                          onDoubleClick={()=>{setEditingTaskId(t.id);setEditDraft(t.label);}} title="Double-click to edit">
                          {t.label}
                        </span>
                      )}
                      <span className="hidden sm:block text-[10px] text-[var(--foreground)]/40 bg-[var(--surface-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full flex-shrink-0">{t.subject}</span>
                      <PriorityBadge p={t.priority}/>
                      <span className={`hidden md:block text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${t.group==="today"?"bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20":t.group==="completed"?"bg-emerald-500/10 text-emerald-500 border-emerald-500/20":"bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                        {t.due}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={()=>{setEditingTaskId(t.id);setEditDraft(t.label);}}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors text-xs">✏️</button>
                        <button onClick={()=>deleteTask(t.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              GOALS
          ══════════════════════════════════════════════════════════════════ */}
          {page==="goals" && (
            <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
              {/* Add goal */}
              <div className="card rounded-2xl p-5">
                <h2 className="font-black text-base mb-4">➕ New Goal</h2>
                <div className="flex flex-wrap gap-3">
                  <input value={newGoalLabel} onChange={e=>setNewGoalLabel(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGoal()}
                    placeholder="Goal description…"
                    className="flex-1 min-w-48 text-sm px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors"/>
                  <select value={newGoalCategory} onChange={e=>setNewGoalCategory(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] outline-none">
                    {subjects.concat(["Habits","Health","General"]).map(s=><option key={s}>{s}</option>)}
                  </select>
                  <button onClick={addGoal} className="accent-btn px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Add Goal</button>
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-3">
                {goals.length===0&&<div className="card rounded-2xl py-10 text-center text-[var(--foreground)]/40 text-sm">No goals yet. Add one above!</div>}
                {goals.map(g=>(
                  <div key={g.id} className="card rounded-2xl p-5 group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        {editingGoalId===g.id?(
                          <input autoFocus value={editDraft} onChange={e=>setEditDraft(e.target.value)}
                            onBlur={()=>saveGoalEdit(g.id)}
                            onKeyDown={e=>{if(e.key==="Enter")saveGoalEdit(g.id);if(e.key==="Escape")setEditingGoalId(null);}}
                            className="w-full text-sm font-semibold bg-transparent border-b border-[var(--accent)] outline-none"/>
                        ):(
                          <p className="text-sm font-semibold cursor-text hover:text-[var(--accent)] transition-colors truncate"
                            onDoubleClick={()=>{setEditingGoalId(g.id);setEditDraft(g.label);}} title="Double-click to edit">
                            {g.label}
                          </p>
                        )}
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] bg-[var(--surface-secondary)] border border-[var(--border)] px-2 py-0.5 rounded-full text-[var(--foreground)]/50">{g.category}</span>
                          <span className="text-[10px] bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded-full capitalize">{g.period}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-black text-xl text-[var(--accent)]">{g.progress}%</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>{setEditingGoalId(g.id);setEditDraft(g.label);}}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors text-xs">✏️</button>
                          <button onClick={()=>deleteGoal(g.id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground)]/40 hover:text-red-500 hover:bg-red-500/10 transition-colors text-xs">🗑️</button>
                        </div>
                      </div>
                    </div>
                    <ProgressBar value={g.progress} accent/>
                    <div className="mt-2 flex items-center gap-3">
                      <input type="range" min={0} max={100} value={g.progress} onChange={e=>setGoalProg(g.id,Number(e.target.value))}
                        className="flex-1 accent-purple-500 cursor-pointer h-1"/>
                      <span className="text-[10px] text-[var(--foreground)]/40 flex-shrink-0">Drag to update</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              CALENDAR
          ══════════════════════════════════════════════════════════════════ */}
          {page==="calendar" && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

              {/* Add event button */}
              <div className="flex justify-between items-center">
                <h2 className="font-black text-lg">Calendar</h2>
                <button onClick={()=>setEventModal({event:{}})} className="primary-btn px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                  ➕ Add Event
                </button>
              </div>

              {/* Calendar grid */}
              <div className="card rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-base">{calMonthStr}</h3>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="w-8 h-8 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] transition-colors flex items-center justify-center text-sm">←</button>
                    <button onClick={nextMonth} className="w-8 h-8 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] transition-colors flex items-center justify-center text-sm">→</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1">
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
                    <div key={d} className="text-center text-[10px] font-bold text-[var(--foreground)]/40 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 md:gap-1">
                  {Array.from({length:calFirstDay}).map((_,i)=><div key={`e${i}`}/>)}
                  {Array.from({length:calDaysInMonth}).map((_,i)=>{
                    const day=i+1;
                    const ds=`${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayEvts=events.filter(e=>e.date===ds);
                    const isToday=ds===TODAY_STR;
                    return (
                      <div key={day} onClick={()=>setEventModal({event:{date:ds}})}
                        className={`relative rounded-lg flex flex-col items-center pt-1 pb-1 text-xs font-semibold cursor-pointer transition-colors min-h-[36px] md:min-h-[44px] ${isToday?"bg-[var(--primary)] text-white":"hover:bg-[var(--hover)] text-[var(--foreground)]"}`}>
                        <span>{day}</span>
                        {dayEvts.length>0&&(
                          <div className="flex gap-0.5 flex-wrap justify-center mt-0.5">
                            {dayEvts.map(ev=>(
                              <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${ev.type==="exam"?"bg-red-400":ev.type==="deadline"?"bg-amber-400":"bg-blue-400"} ${isToday?"opacity-70":""}`}/>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-3 text-[10px] text-[var(--foreground)]/50">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Exam</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Deadline</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>Session</span>
                  <span className="ml-auto opacity-60">Tap any day to add event</span>
                </div>
              </div>

              {/* Events list */}
              <div className="card rounded-2xl p-5">
                <h3 className="font-black text-base mb-4">All Events</h3>
                {events.length===0&&<p className="text-sm text-[var(--foreground)]/40 text-center py-4">No events yet.</p>}
                <div className="space-y-2.5">
                  {[...events].sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>(
                    <div key={ev.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border group ${EVT_STYLE[ev.type]}`}>
                      <div className="text-center flex-shrink-0">
                        <p className="text-xs font-black">{ev.date.slice(8)}</p>
                        <p className="text-[10px] opacity-60">{new Date(ev.date+"T00:00:00").toLocaleString("default",{month:"short"})}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{ev.label}</p>
                        <p className="text-[10px] capitalize opacity-60">{ev.type}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={()=>setEventModal({event:ev})}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors text-xs">✏️</button>
                        <button onClick={()=>deleteEvent(ev.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors text-xs">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              ANALYTICS
          ══════════════════════════════════════════════════════════════════ */}
          {page==="analytics" && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {icon:"⏱",label:"Today",     val:`${Math.floor(todayMinutes/60)}h ${todayMinutes%60}m`, sub:"study time"},
                  {icon:"📅",label:"This Week",  val:`${Math.floor(weekMinutes/60)}h`,               sub:`${weekMinutes}min total`},
                  {icon:"✅",label:"Tasks Done", val:`${completedThisWeek}`,                          sub:`${tasks.filter(t=>!t.done&&t.group!=="upcoming").length} remaining`},
                  {icon:"🔥",label:"Streak",     val:`${streak} days`,                                sub:streak>=7?"🏆 Week streak!":"Keep going!"},
                ].map(s=>(
                  <div key={s.label} className="card rounded-2xl p-4">
                    <span className="text-2xl">{s.icon}</span>
                    <p className="font-black text-xl md:text-2xl text-[var(--primary)] mt-2">{s.val}</p>
                    <p className="text-xs font-semibold mt-0.5">{s.label}</p>
                    <p className="text-[10px] text-[var(--foreground)]/40 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Streak tracker */}
              <div className="card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-base">🔥 Study Streak — Last 7 Days</h2>
                  <span className="font-black text-xl text-[var(--primary)]">{streak} days</span>
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  {Array.from({length:7}).map((_,i)=>{
                    const d=new Date(); d.setDate(d.getDate()-(6-i));
                    const ds=d.toISOString().slice(0,10);
                    const mins=studyDays.find(x=>x.date===ds)?.minutes??0;
                    const active=mins>0;
                    return (
                      <div key={i} className="flex-1 text-center">
                        <div className={`h-8 md:h-10 rounded-lg mb-1.5 transition-all ${active?"bg-[var(--primary)]":"bg-[var(--surface-secondary)] border border-[var(--border)]"}`}
                          title={`${ds}: ${mins}min`}/>
                        <span className="text-[10px] text-[var(--foreground)]/50">{WEEK_DAYS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily bar chart — real data */}
              <div className="card rounded-2xl p-5">
                <h2 className="font-black text-base mb-5">Daily Study Time — This Week</h2>
                {weekMinutes===0?(
                  <p className="text-sm text-[var(--foreground)]/40 text-center py-6">No study data yet. Start a focus session or log hours!</p>
                ):(
                  <div className="flex items-end gap-2 md:gap-3 h-32">
                    {Array.from({length:7}).map((_,i)=>{
                      const d=new Date(); d.setDate(d.getDate()-(6-i));
                      const ds=d.toISOString().slice(0,10);
                      const mins=studyDays.find(x=>x.date===ds)?.minutes??0;
                      const maxMin=Math.max(1,...studyDays.map(x=>x.minutes));
                      const pct=mins>0?(mins/maxMin)*100:0;
                      const isToday=ds===TODAY_STR;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] md:text-[10px] text-[var(--foreground)]/40">{mins>0?`${mins}m`:"—"}</span>
                          <div className="w-full flex items-end" style={{height:"80px"}}>
                            <div className={`w-full rounded-t-lg transition-all duration-700 ${isToday?"bg-[var(--primary)]":mins>0?"bg-[var(--primary)]/40":"bg-[var(--border)]"}`}
                              style={{height:`${Math.max(pct,mins>0?6:3)}%`}}/>
                          </div>
                          <span className="text-[9px] md:text-[10px] text-[var(--foreground)]/50">{WEEK_DAYS[i]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subject breakdown (based on tasks per subject) */}
              <div className="card rounded-2xl p-5">
                <h2 className="font-black text-base mb-5">Tasks by Subject</h2>
                {subjects.map((s,i)=>{
                  const total=tasks.filter(t=>t.subject===s).length;
                  const done=tasks.filter(t=>t.subject===s&&t.done).length;
                  if(total===0) return null;
                  const pct=Math.round((done/total)*100);
                  return (
                    <div key={s} className="mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-semibold">{s}</span>
                        <span className="text-xs text-[var(--foreground)]/50">{done}/{total} tasks · {pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--border)] overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${SUBJECT_COLORS[i%SUBJECT_COLORS.length]}`} style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quote at bottom of analytics */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/20">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)] mb-2">💬 Quote of the Day</p>
                <p className="text-sm text-[var(--foreground)]/80 leading-relaxed italic">&ldquo;{quote.text}&rdquo;</p>
                <p className="text-[10px] text-[var(--foreground)]/50 mt-2 font-semibold">— {quote.author}</p>
              </div>
            </div>
          )}

        </div>

        {/* ── Mobile Bottom Nav ── */}
        <nav className="md:hidden flex border-t border-[var(--border)] bg-[var(--background)] flex-shrink-0">
          {NAV.map(item=>(
            <button key={item.key} onClick={()=>navigate(item.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors ${page===item.key?"text-[var(--primary)]":"text-[var(--foreground)]/40 hover:text-[var(--foreground)]/70"}`}>
              <span className="text-base leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
