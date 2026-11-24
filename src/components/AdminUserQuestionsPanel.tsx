"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users, MessageSquare, Clock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SweetieUserRow {
  id?: string | number;
  user_id?: string | null;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  [key: string]: unknown;
}

interface SweetieSessionRow {
  id?: string | number;
  user_id?: string | null;
  email?: string | null;
  duration_seconds?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  [key: string]: unknown;
}

interface SweetieQuestionRow {
  id?: string | number;
  user_id?: string | null;
  email?: string | null;
  question?: string | null;
  prompt?: string | null;
  message?: string | null;
  answer?: string | null;
  response?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(seconds?: number | null): string {
  const sec = Math.max(0, Number(seconds ?? 0));
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}m ${rem}s`;
}

export default function AdminUserQuestionsPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "questions" | "sessions">("users");
  const [users, setUsers] = useState<SweetieUserRow[]>([]);
  const [sessions, setSessions] = useState<SweetieSessionRow[]>([]);
  const [questions, setQuestions] = useState<SweetieQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAllLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersRes, sessionsRes, questionsRes] = await Promise.all([
        supabase.from("sweetie_users").select("*").limit(5000),
        supabase.from("sweetie_user_sessions").select("*").limit(5000),
        supabase.from("sweetie_user_questions").select("*").limit(5000),
      ]);

      if (usersRes.error) {
        setErrorMsg(usersRes.error.message);
      }

      const rawUsers = Array.isArray(usersRes.data)
        ? (usersRes.data as SweetieUserRow[])
        : [];

      // Deduplicate strictly by unique user_id or email without dropping any distinct account
      const uniqueMap = new Map<string, SweetieUserRow>();
      for (const row of rawUsers) {
        const key = String(row.user_id || row.email || row.id || Math.random())
          .trim()
          .toLowerCase();
        const prev = uniqueMap.get(key);
        if (!prev) {
          uniqueMap.set(key, row);
        } else {
          const prevTime = new Date(prev.last_login_at || prev.created_at || 0).getTime();
          const nextTime = new Date(row.last_login_at || row.created_at || 0).getTime();
          uniqueMap.set(key, nextTime >= prevTime ? { ...prev, ...row } : { ...row, ...prev });
        }
      }

      const sortedUsers = Array.from(uniqueMap.values()).sort((a, b) => {
        const tA = new Date(a.last_login_at || a.created_at || 0).getTime();
        const tB = new Date(b.last_login_at || b.created_at || 0).getTime();
        return tB - tA;
      });

      const sortedSessions = Array.isArray(sessionsRes.data)
        ? [...(sessionsRes.data as SweetieSessionRow[])].sort(
            (a, b) =>
              new Date(b.started_at || b.created_at as string || 0).getTime() -
              new Date(a.started_at || a.created_at as string || 0).getTime()
          )
        : [];

      const sortedQuestions = Array.isArray(questionsRes.data)
        ? [...(questionsRes.data as SweetieQuestionRow[])].sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime()
          )
        : [];

      setUsers(sortedUsers);
      setSessions(sortedSessions);
      setQuestions(sortedQuestions);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load admin logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllLogs();
  }, [loadAllLogs]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-rose-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="text-rose-600" size={20} />
          <div>
            <h2 className="text-base font-bold">Admin Activity & Logs (Permanent)</h2>
            <p className="text-xs text-slate-500">
              Unique Users: <strong>{users.length}</strong> • Sessions:{" "}
              <strong>{sessions.length}</strong> • Questions:{" "}
              <strong>{questions.length}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAllLogs()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-mono font-bold text-rose-700 cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          <span>Refresh All</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-mono">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
            activeTab === "users"
              ? "bg-rose-600 text-white"
              : "bg-white border border-rose-200 text-slate-700"
          }`}
        >
          <Users size={14} />
          <span>Unique Users ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("questions")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
            activeTab === "questions"
              ? "bg-rose-600 text-white"
              : "bg-white border border-rose-200 text-slate-700"
          }`}
        >
          <MessageSquare size={14} />
          <span>User Questions ({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold cursor-pointer ${
            activeTab === "sessions"
              ? "bg-rose-600 text-white"
              : "bg-white border border-rose-200 text-slate-700"
          }`}
        >
          <Clock size={14} />
          <span>Sessions & Runtime ({sessions.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-slate-500 bg-white rounded-2xl border border-rose-100">
          Loading all records from Supabase...
        </div>
      ) : activeTab === "users" ? (
        <div className="overflow-x-auto bg-white rounded-2xl border border-rose-200 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/60 font-mono text-[11px] uppercase text-slate-600">
                <th className="p-3">#</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">User ID</th>
                <th className="p-3">Created</th>
                <th className="p-3">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={String(u.user_id || u.email || u.id || idx)} className="border-b border-rose-50">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-semibold">{u.full_name || u.name || "—"}</td>
                  <td className="p-3 font-mono">{u.email || "—"}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{u.user_id || u.id || "—"}</td>
                  <td className="p-3 text-slate-600">{formatDateTime(u.created_at)}</td>
                  <td className="p-3 text-slate-600">{formatDateTime(u.last_login_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === "questions" ? (
        <div className="space-y-2.5">
          {questions.map((q, idx) => {
            const promptText = q.question || q.prompt || q.message || "—";
            const answerText = q.answer || q.response || "";
            return (
              <div
                key={String(q.id || idx)}
                className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                  <span className="font-bold text-slate-900">
                    {q.email || q.user_id || "User"}
                  </span>
                  <span>{formatDateTime(q.created_at)}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{promptText}</p>
                {answerText && (
                  <p className="text-xs text-slate-600 bg-rose-50/60 p-2.5 rounded-xl">
                    {answerText}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-rose-200 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/60 font-mono text-[11px] uppercase text-slate-600">
                <th className="p-3">#</th>
                <th className="p-3">User</th>
                <th className="p-3">Runtime</th>
                <th className="p-3">Started</th>
                <th className="p-3">Ended</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => (
                <tr key={String(s.id || idx)} className="border-b border-rose-50">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono">{s.email || s.user_id || "—"}</td>
                  <td className="p-3 font-mono font-bold text-rose-700">
                    {formatDuration(s.duration_seconds)}
                  </td>
                  <td className="p-3 text-slate-600">{formatDateTime(s.started_at)}</td>
                  <td className="p-3 text-slate-600">{formatDateTime(s.ended_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}