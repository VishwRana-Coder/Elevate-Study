"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type SchoolLevel = "middle" | "high" | "university" | "";

export interface OnboardingData {
  displayName: string;
  age: string;
  schoolLevel: SchoolLevel;
  graduationYear: string;
  studyGoal: string;     // daily study goal in hours
  favoriteSubject: string;
  completed: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 10 }, (_, i) => String(CURRENT_YEAR + i));

const STUDY_GOALS = [
  { label: "Light", desc: "1–2 hours / day", value: "1.5", icon: "🌱" },
  { label: "Moderate", desc: "3–4 hours / day", value: "3.5", icon: "📚" },
  { label: "Intense", desc: "5–6 hours / day", value: "5.5", icon: "🔥" },
  { label: "Custom", desc: "I'll set it myself", value: "custom", icon: "⚡" },
];

const SCHOOL_OPTIONS = [
  { value: "middle", label: "Middle School", sub: "Grades 6–8", icon: "🏫" },
  { value: "high",   label: "High School",   sub: "Grades 9–12", icon: "🎒" },
  { value: "university", label: "University / College", sub: "Undergrad & beyond", icon: "🎓" },
];

const STEPS = [
  { id: "name",    title: "What should we call you?",        sub: "This is how you'll appear in your dashboard." },
  { id: "age",     title: "How old are you?",                sub: "Helps us personalise your experience." },
  { id: "school",  title: "Where are you studying?",         sub: "Pick the level that matches you best." },
  { id: "grad",    title: "When do you graduate?",           sub: "We'll help you plan around your timeline." },
  { id: "goal",    title: "How much do you want to study?",  sub: "You can always adjust this later in settings." },
  { id: "subject", title: "What's your favourite subject?",  sub: "We'll put it front and centre in your tasks." },
  { id: "done",    title: "",                                sub: "" },
];

function lsSet(key: string, val: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-500 ${
            i < current
              ? "w-5 h-2 bg-[var(--primary)]"
              : i === current
              ? "w-5 h-2 bg-[var(--primary)]"
              : "w-2 h-2 bg-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Animated wrapper ─────────────────────────────────────────────────────────
function StepCard({ children, stepKey }: { children: React.ReactNode; stepKey: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [stepKey]);

  return (
    <div
      className="transition-all duration-500"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    displayName: "",
    age: "",
    schoolLevel: "",
    graduationYear: "",
    studyGoal: "",
    favoriteSubject: "",
    completed: false,
  });
  const [customGoal, setCustomGoal] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefill name from Clerk
  useEffect(() => {
    if (isLoaded && user) {
      const name = user.firstName || user.username || user.fullName || "";
      setData(d => ({ ...d, displayName: name }));
    }
  }, [isLoaded, user]);

  // Focus input on step change
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [step]);

  const totalSteps = STEPS.length - 1; // exclude "done"

  const validate = () => {
    setError("");
    switch (STEPS[step].id) {
      case "name":
        if (!data.displayName.trim()) { setError("Please enter a name."); return false; }
        if (data.displayName.trim().length < 2) { setError("Name must be at least 2 characters."); return false; }
        break;
      case "age":
        const age = parseInt(data.age);
        if (!data.age || isNaN(age)) { setError("Please enter your age."); return false; }
        if (age < 8 || age > 60) { setError("Please enter a valid age between 8 and 60."); return false; }
        break;
      case "school":
        if (!data.schoolLevel) { setError("Please select your school level."); return false; }
        break;
      case "grad":
        if (!data.graduationYear) { setError("Please select your graduation year."); return false; }
        break;
      case "goal":
        if (!data.studyGoal) { setError("Please select a study goal."); return false; }
        if (data.studyGoal === "custom") {
          const h = parseFloat(customGoal);
          if (!customGoal || isNaN(h) || h < 0.5 || h > 24) {
            setError("Enter a valid number of hours (0.5 – 24).");
            return false;
          }
        }
        break;
      case "subject":
        if (!data.favoriteSubject.trim()) { setError("Please enter a subject."); return false; }
        break;
    }
    return true;
  };

  const next = () => {
    if (!validate()) return;
    if (step >= totalSteps) return;
    setStep(s => s + 1);
  };

  const back = () => {
    setError("");
    if (step > 0) setStep(s => s - 1);
  };

  const finish = () => {
    if (!validate()) return;

    // Resolve goal minutes
    const goalHours = data.studyGoal === "custom"
      ? parseFloat(customGoal) || 2
      : parseFloat(data.studyGoal) || 2;

    // Save to localStorage — picked up by dashboard
    lsSet("es_onboarding", {
      ...data,
      displayName: data.displayName.trim(),
      favoriteSubject: data.favoriteSubject.trim(),
      completed: true,
    });
    lsSet("es_study_goal", Math.round(goalHours * 60));

    // Ensure favourite subject is in subject list
    const existing = JSON.parse(localStorage.getItem("es_subjects") || "null");
    const base = existing ?? ["Math","Physics","Biology","CS","English","Chemistry","History"];
    const subj = data.favoriteSubject.trim();
    if (subj && !base.includes(subj)) lsSet("es_subjects", [subj, ...base]);

    setStep(totalSteps); // show done screen
  };

  const goToDashboard = () => router.push("/dashboard");

  if (!isLoaded) return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin" />
    </div>
  );

  const currentStep = STEPS[step];
  const isDone = currentStep.id === "done";

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--primary)]/8 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent)]/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--primary)]/3 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5 mb-10">
        <span className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center font-black text-white text-sm shadow-lg shadow-[var(--primary)]/30">E</span>
        <span className="font-bold text-lg tracking-tight">Elevate Study</span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-lg">
        {!isDone && (
          <div className="flex items-center justify-between mb-6 px-1">
            <StepDots total={totalSteps} current={step} />
            <span className="text-xs font-semibold text-[var(--foreground)]/40">
              {step + 1} of {totalSteps}
            </span>
          </div>
        )}

        <StepCard stepKey={currentStep.id}>

          {/* ── DONE SCREEN ── */}
          {isDone ? (
            <div className="card rounded-3xl p-8 md:p-12 text-center shadow-2xl shadow-[var(--primary)]/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl shadow-[var(--primary)]/30">
                  🎉
                </div>
                <h1 className="font-black text-3xl md:text-4xl mb-3">
                  You&apos;re all set, {data.displayName}!
                </h1>
                <p className="text-[var(--foreground)]/60 mb-2 text-sm leading-relaxed max-w-sm mx-auto">
                  Your personalised study dashboard is ready. Time to get to work.
                </p>

                {/* Summary chips */}
                <div className="flex flex-wrap justify-center gap-2 my-6">
                  {[
                    { icon: "🎒", val: SCHOOL_OPTIONS.find(s => s.value === data.schoolLevel)?.label ?? "" },
                    { icon: "🎓", val: `Class of ${data.graduationYear}` },
                    { icon: "⏱", val: `${data.studyGoal === "custom" ? customGoal : data.studyGoal}h / day goal` },
                    { icon: "⭐", val: data.favoriteSubject },
                  ].filter(c => c.val).map(c => (
                    <span key={c.val} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-secondary)] border border-[var(--border)] text-xs font-semibold">
                      {c.icon} {c.val}
                    </span>
                  ))}
                </div>

                <button
                  onClick={goToDashboard}
                  className="primary-btn w-full py-3.5 rounded-2xl font-black text-base hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/25"
                >
                  Go to Dashboard →
                </button>
              </div>
            </div>
          ) : (
            <div className="card rounded-3xl p-6 md:p-8 shadow-2xl shadow-[var(--primary)]/5">
              {/* Step header */}
              <div className="mb-7">
                <h2 className="font-black text-2xl md:text-3xl leading-tight mb-1.5">
                  {currentStep.title}
                </h2>
                <p className="text-sm text-[var(--foreground)]/50">{currentStep.sub}</p>
              </div>

              {/* ── STEP: NAME ── */}
              {currentStep.id === "name" && (
                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={data.displayName}
                    onChange={e => setData(d => ({ ...d, displayName: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && next()}
                    placeholder="e.g. Alex"
                    maxLength={40}
                    className="w-full text-lg font-semibold px-4 py-3.5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/25 transition-colors"
                  />
                  <p className="text-[10px] text-[var(--foreground)]/40 px-1">
                    This is shown on your dashboard — use a nickname if you like.
                  </p>
                </div>
              )}

              {/* ── STEP: AGE ── */}
              {currentStep.id === "age" && (
                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    type="number"
                    value={data.age}
                    onChange={e => setData(d => ({ ...d, age: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && next()}
                    placeholder="e.g. 17"
                    min={8}
                    max={60}
                    className="w-full text-lg font-semibold px-4 py-3.5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/25 transition-colors"
                  />
                  {/* Age slider */}
                  {data.age && !isNaN(parseInt(data.age)) && (
                    <input
                      type="range" min={8} max={60}
                      value={parseInt(data.age) || 8}
                      onChange={e => setData(d => ({ ...d, age: e.target.value }))}
                      className="w-full accent-[var(--primary)] cursor-pointer mt-1"
                    />
                  )}
                  <div className="flex justify-between text-[10px] text-[var(--foreground)]/30 px-1">
                    <span>8</span><span>60</span>
                  </div>
                </div>
              )}

              {/* ── STEP: SCHOOL ── */}
              {currentStep.id === "school" && (
                <div className="grid gap-3">
                  {SCHOOL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setData(d => ({ ...d, schoolLevel: opt.value as SchoolLevel }))}
                      className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                        data.schoolLevel === opt.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/8 shadow-md shadow-[var(--primary)]/10"
                          : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary)]/40 hover:bg-[var(--hover)]"
                      }`}
                    >
                      <span className="text-3xl flex-shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-xs text-[var(--foreground)]/50">{opt.sub}</p>
                      </div>
                      <span className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        data.schoolLevel === opt.value
                          ? "border-[var(--primary)] bg-[var(--primary)]"
                          : "border-[var(--border)]"
                      }`}>
                        {data.schoolLevel === opt.value && (
                          <span className="text-white text-[10px] font-black">✓</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── STEP: GRADUATION YEAR ── */}
              {currentStep.id === "grad" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {GRAD_YEARS.map(yr => (
                      <button
                        key={yr}
                        onClick={() => setData(d => ({ ...d, graduationYear: yr }))}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                          data.graduationYear === yr
                            ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20"
                            : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary)]/40 hover:bg-[var(--hover)]"
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--foreground)]/40 px-1">
                    Select the year you expect to graduate or finish your current level.
                  </p>
                </div>
              )}

              {/* ── STEP: STUDY GOAL ── */}
              {currentStep.id === "goal" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {STUDY_GOALS.map(g => (
                      <button
                        key={g.value}
                        onClick={() => setData(d => ({ ...d, studyGoal: g.value }))}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-center transition-all ${
                          data.studyGoal === g.value
                            ? "border-[var(--primary)] bg-[var(--primary)]/8 shadow-md shadow-[var(--primary)]/10"
                            : "border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--primary)]/40 hover:bg-[var(--hover)]"
                        }`}
                      >
                        <span className="text-2xl">{g.icon}</span>
                        <span className="font-black text-sm">{g.label}</span>
                        <span className="text-[11px] text-[var(--foreground)]/50">{g.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom input */}
                  {data.studyGoal === "custom" && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--primary)]/40">
                      <span className="text-sm font-semibold text-[var(--foreground)]/60 flex-shrink-0">Daily goal:</span>
                      <input
                        ref={inputRef}
                        type="number"
                        value={customGoal}
                        onChange={e => setCustomGoal(e.target.value)}
                        placeholder="e.g. 4"
                        min={0.5}
                        max={24}
                        step={0.5}
                        className="flex-1 text-lg font-bold bg-transparent outline-none placeholder:text-[var(--foreground)]/25 text-center"
                      />
                      <span className="text-sm text-[var(--foreground)]/60 flex-shrink-0">hours</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP: FAVOURITE SUBJECT ── */}
              {currentStep.id === "subject" && (
                <div className="space-y-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={data.favoriteSubject}
                    onChange={e => setData(d => ({ ...d, favoriteSubject: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && finish()}
                    placeholder="e.g. Mathematics"
                    maxLength={40}
                    className="w-full text-lg font-semibold px-4 py-3.5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border)] focus:border-[var(--primary)] outline-none placeholder:text-[var(--foreground)]/25 transition-colors"
                  />
                  {/* Quick pick chips */}
                  <div>
                    <p className="text-xs text-[var(--foreground)]/40 mb-2 font-medium">Or pick one:</p>
                    <div className="flex flex-wrap gap-2">
                      {["Math","Physics","Biology","CS","English","Chemistry","History","Literature","Economics","Art"].map(s => (
                        <button
                          key={s}
                          onClick={() => setData(d => ({ ...d, favoriteSubject: s }))}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                            data.favoriteSubject === s
                              ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                              : "bg-[var(--surface-secondary)] border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--hover)]"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                  ⚠ {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-7">
                {step > 0 && (
                  <button
                    onClick={back}
                    className="px-5 py-3 rounded-2xl text-sm font-bold border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={step === totalSteps - 1 ? finish : next}
                  className="flex-1 primary-btn py-3 rounded-2xl font-black text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[var(--primary)]/20"
                >
                  {step === totalSteps - 1 ? "Finish Setup 🚀" : "Continue →"}
                </button>
              </div>
            </div>
          )}
        </StepCard>
      </div>

    </div>
  );
}