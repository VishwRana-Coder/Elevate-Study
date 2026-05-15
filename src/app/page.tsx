"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

import { useRouter } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────
type Task = { id: number; label: string; done: boolean };
type Goal = { id: number; label: string; progress: number };



// ── Inline editable text ─────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`bg-transparent border-b border-[var(--primary)] outline-none w-full ${className}`}
      />
    );
  }
  return (
    <span
      className={`cursor-text hover:text-[var(--primary)] transition-colors ${className}`}
      onDoubleClick={() => { setDraft(value); setEditing(true); }}
      title="Double-click to edit"
    >
      {value}
    </span>
  );
}

export default function LandingPage() {

  const router = useRouter();

  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, isLoaded, router]);
  

  const [dark, setDark] = useState(false);

  
  // ── Tasks state ────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, label: "Complete Chapter 4 — Physics", done: true },
    { id: 2, label: "Practice 20 math problems", done: false },
    { id: 3, label: "Review flashcards for Biology", done: false },
  ]);
  const [newTask, setNewTask] = useState("");
  const nextTaskId = useRef(4);

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;
    setTasks((prev) => [...prev, { id: nextTaskId.current++, label: trimmed, done: false }]);
    setNewTask("");
  };
  const toggleTask = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const editTask = (id: number, label: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  const deleteTask = (id: number) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  // ── Goals state ────────────────────────────────────────────────
  const [goals, setGoals] = useState<Goal[]>([
    { id: 1, label: "Finish Calculus Module", progress: 70 },
    { id: 2, label: "Read 2 research papers", progress: 40 },
    { id: 3, label: "Complete 30-day streak", progress: 55 },
  ]);
  const [newGoal, setNewGoal] = useState("");
  const nextGoalId = useRef(4);

  const addGoal = () => {
    const trimmed = newGoal.trim();
    if (!trimmed) return;
    setGoals((prev) => [...prev, { id: nextGoalId.current++, label: trimmed, progress: 0 }]);
    setNewGoal("");
  };
  const editGoal = (id: number, label: string) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, label } : g)));
  const setProgress = (id: number, progress: number) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, progress } : g)));
  const deleteGoal = (id: number) =>
    setGoals((prev) => prev.filter((g) => g.id !== id));

  // ── Theme ──────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const features = [
    {
      icon: "✓",
      label: "To-Do List",
      desc: "Capture tasks instantly and stay on top of what matters most each day.",
    },
    {
      icon: "🔥",
      label: "Daily Streaks",
      desc: "Build momentum with streak tracking that rewards consistent study habits.",
    },
    {
      icon: "🎯",
      label: "Goal Setting",
      desc: "Define clear study goals and monitor your progress toward each one.",
    },
    {
      icon: "📊",
      label: "Progress Tracking",
      desc: "Visualise weekly trends and stay accountable with structured planning.",
    },
    {
      icon: "🛠️",
      label: "Tool Library",
      desc: "Access a curated collection of free and paid tools for every subject.",
    },
    {
      icon: "📅",
      label: "Weekly Planner",
      desc: "Map out your week in advance and reduce last-minute cramming stress.",
    },
  ];

  const stats = [
    { value: "500+", label: "Curated Resources" },
    { value: "7", label: "Productivity Modules" },
    { value: "100%", label: "Free to Use" },
    { value: "∞", label: "Study Streaks" },
  ];

  const toolCategories = [
    { emoji: "📝", cat: "Study & Notes", count: "12 tools" },
    { emoji: "💻", cat: "Coding", count: "10 tools" },
    { emoji: "🎨", cat: "Design", count: "8 tools" },
    { emoji: "🔬", cat: "Research", count: "9 tools" },
    { emoji: "🤖", cat: "AI Productivity", count: "7 tools" },
    { emoji: "📖", cat: "Reading", count: "6 tools" },
    { emoji: "🗂️", cat: "Organisation", count: "11 tools" },
    { emoji: "🧮", cat: "Math & Science", count: "8 tools" },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300 overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Image
            src="/Logo.png"
            alt="Elevate Study Logo"
            width={32}
            height={32}
            className="rounded-md"
          />

          <span className="font-bold text-lg tracking-tight">Elevate Study</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--foreground)]/70">
          <a href="#features" className="hover:text-[var(--primary)] transition-colors">Features</a>
          <a href="#tools" className="hover:text-[var(--primary)] transition-colors">Tools</a>
          <a href="#about" className="hover:text-[var(--primary)] transition-colors">About</a>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle Pill */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="relative w-14 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 focus:ring-offset-[var(--background)]"
          >
            <span
              className={`flex top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-300 shadow-sm ${
                dark
                  ? "translate-x-7 bg-[var(--primary)]"
                  : "translate-x-0.5 bg-[var(--primary)]"
              }`}
            >
              {dark ? "🌙" : "☀️"}
            </span>
          </button>

          {!isSignedIn ? (
            <div className="flex items-center gap-3">
              <SignInButton mode="modal" >
                <button className="px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors text-sm font-medium">
                  Login
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="primary-btn px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          ) : (
              <UserButton />
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 md:px-12 flex flex-col items-center text-center overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-16 left-1/4 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-72 h-72 bg-[var(--accent)]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <span className="inline-block mb-5 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold tracking-widest uppercase text-[var(--primary)]">
            🎓 Built for Students, by a Student
          </span>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight mb-6">
            Study Smarter.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]">
              Stay Consistent.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-[var(--foreground)]/60 leading-relaxed mb-10">
            Elevate Study combines a powerful productivity system with a curated student
            resource library — everything you need to build unstoppable study habits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              id="get-started"
              href="#features"
              className="primary-btn w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/25"
            >
              Start for Free →
            </a>
            <a
              href="#tools"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-base border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors"
            >
              Explore Tools
            </a>
          </div>
        </div>

        {/* ── Interactive Dashboard Preview ── */}
        <div className="relative z-10 mt-20 w-full max-w-3xl mx-auto">
          <div className="card rounded-2xl p-6 shadow-xl shadow-[var(--primary)]/5">

            {/* Window chrome */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-xs text-[var(--foreground)]/40 font-mono">
                elevate-study / dashboard
              </span>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] p-4 text-center"
                >
                  <p className="text-2xl font-black text-[var(--primary)]">{s.value}</p>
                  <p className="text-xs text-[var(--foreground)]/50 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">

              {/* ── Tasks panel ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">📋 Tasks</h3>
                  <span className="text-xs text-[var(--foreground)]/40">
                    {tasks.filter((t) => t.done).length}/{tasks.length} done
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs border transition-colors ${
                          task.done
                            ? "success-badge border-transparent"
                            : "border-[var(--border)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {task.done ? "✓" : ""}
                      </button>

                      {/* Editable label */}
                      <div className={`flex-1 text-sm min-w-0 ${task.done ? "line-through text-[var(--foreground)]/40" : ""}`}>
                        <InlineEdit
                          value={task.label}
                          onSave={(v) => editTask(task.id, v)}
                        />
                      </div>

                      {/* Action buttons — visible on hover */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {task.done && (
                          <span className="text-xs success-badge px-2 py-0.5 rounded-full">Done</span>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          title="Delete task"
                          className="w-6 h-6 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add task input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask()}
                    placeholder="Add a task…"
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors"
                  />
                  <button
                    onClick={addTask}
                    className="primary-btn px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* ── Goals panel ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">🎯 Goals</h3>
                  <span className="text-xs text-[var(--foreground)]/40">
                    {goals.length} active
                  </span>
                </div>

                <div className="space-y-3 mb-3">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="group px-3 py-2.5 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex-1 text-sm font-medium min-w-0 pr-2">
                          <InlineEdit
                            value={goal.label}
                            onSave={(v) => editGoal(goal.id, v)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs font-bold text-[var(--accent)]">
                            {goal.progress}%
                          </span>
                          <button
                            onClick={() => deleteGoal(goal.id)}
                            title="Delete goal"
                            className="w-5 h-5 rounded-md flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs opacity-0 group-hover:opacity-100"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Progress bar + scrubber */}
                      <div className="relative h-2 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-200"
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={goal.progress}
                        onChange={(e) => setProgress(goal.id, Number(e.target.value))}
                        className="w-full mt-1 h-1 accent-[var(--primary)] cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Drag to update progress"
                      />
                    </div>
                  ))}
                </div>

                {/* Add goal input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addGoal()}
                    placeholder="Add a goal…"
                    className="flex-1 text-xs px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--accent)] outline-none placeholder:text-[var(--foreground)]/30 transition-colors"
                  />
                  <button
                    onClick={addGoal}
                    className="accent-btn px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    + Add
                  </button>
                </div>
              </div>

            </div>

            <p className="text-center text-[var(--foreground)]/30 text-xs mt-5">
              💡 Double-click any label to edit · Hover a row to delete · Drag the slider to update progress
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────── */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block mb-3 text-xs font-semibold tracking-widest uppercase text-[var(--primary)]">
            Everything You Need
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Your complete study toolkit
          </h2>
          <p className="mt-4 text-[var(--foreground)]/60 max-w-xl mx-auto">
            Six core modules working together to keep you organised, motivated, and consistent.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.label}
              className="card rounded-2xl p-6 hover:border-[var(--primary)]/50 transition-colors group cursor-default"
            >
              <div className="w-11 h-11 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{f.label}</h3>
              <p className="text-sm text-[var(--foreground)]/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STREAK BANNER ───────────────────────────── */}
      <section className="py-16 px-6 md:px-12 bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              🔥 Build a study streak
            </h2>
            <p className="text-[var(--foreground)]/60 max-w-md">
              Show up every day. Track your streak. Watch your discipline compound into
              real results over weeks and months.
            </p>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                  i < 5
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-secondary)] border border-[var(--border)] text-[var(--foreground)]/30"
                }`}
              >
                {i < 5 ? "🔥" : "—"}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ───────────────────────────────────── */}
      <section id="tools" className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block mb-3 text-xs font-semibold tracking-widest uppercase text-[var(--accent)]">
            Student Tool Library
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            The right tool for every task
          </h2>
          <p className="mt-4 text-[var(--foreground)]/60 max-w-xl mx-auto">
            Handpicked resources across every category — from note-taking to coding to research.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {toolCategories.map((t) => (
            <div
              key={t.cat}
              className="card rounded-2xl p-5 text-center hover:border-[var(--accent)]/50 transition-colors cursor-pointer group"
            >
              <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">
                {t.emoji}
              </span>
              <p className="font-semibold text-sm">{t.cat}</p>
              <p className="text-xs text-[var(--foreground)]/40 mt-1">{t.count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section id="about" className="py-24 px-6 md:px-12">
        <div className="max-w-3xl mx-auto text-center card rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-5">
              Ready to elevate your studies?
            </h2>
            <p className="text-[var(--foreground)]/60 mb-8 max-w-lg mx-auto">
              A solo passion project built with one goal: help every student show up
              consistently and study smarter.
            </p>
            <a
              href="#get-started"
              className="primary-btn inline-block px-10 py-4 rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/25"
            >
              Get Started — It&apos;s Free
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] py-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--foreground)]/40">
        <div className="flex items-center gap-2">
          <Image
            src="/Logo.png"
            alt="Elevate Study Logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-semibold text-[var(--foreground)]/60">Elevate Study</span>
        </div>
        <p className="text-[var(--primary)] font-semibold">Open-source under the MIT License · Built with ❤️ for students</p>
        
      </footer>
    </div>
  );
}