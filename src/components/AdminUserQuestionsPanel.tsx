"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Users,
  MessageSquare,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface SweetieUserRow {
  id?: string | number;
  user_id?: string | null;
  google_id?: string | null;
  email?: string | null;
  user_email?: string | null;
  full_name?: string | null;
  name?: string | null;
  display_name?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  [key: string]: unknown;
}

interface SweetieSessionRow {
  id?: string | number;
  user_id?: string | null;
  email?: string | null;
  user_email?: string | null;
  full_name?: string | null;
  name?: string | null;
  duration_seconds?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

interface UnifiedQuestionRow {
  uid: string;
  user_identifier: string;
  email: string;
  full_name: string;
  question: string;
  ai_reply: string;
  created_at: string;
  source: "parvati_ai_logs" | "sweetie_user_questions";
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

function pickUserName(row: Record<string, unknown>): string {
  const candidates = [
    row.full_name,
    row.display_name,
    row.name,
    row.user_name,
    row.google_name,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function pickUserEmail(row: Record<string, unknown>): string {
  const candidates = [
    row.email,
    row.user_email,
    row.google_email,
    row.user_identifier,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.includes("@")) return val.trim();
  }
  return "";
}

export default function AdminUserQuestionsPanel() {
  const [activeTab, setActiveTab] = useState<
    "users" | "questions" | "sessions"
  >("users");
  const [users, setUsers] = useState<SweetieUserRow[]>([]);
  const [sessions, setSessions] = useState<SweetieSessionRow[]>([]);
  const [questions, setQuestions] = useState<UnifiedQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadAllLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersRes, sessionsRes, sweetieQRes, legacyLogsRes] =
        await Promise.all([
          supabase.from("sweetie_users").select("*").limit(5000),
          supabase.from("sweetie_user_sessions").select("*").limit(5000),
          supabase.from("sweetie_user_questions").select("*").limit(5000),
          supabase.from("parvati_ai_logs").select("*").limit(5000),
        ]);

      if (usersRes.error) {
        setErrorMsg(usersRes.error.message);
      }

      const rawUsers = Array.isArray(usersRes.data)
        ? (usersRes.data as SweetieUserRow[])
        : [];
      const rawSessions = Array.isArray(sessionsRes.data)
        ? (sessionsRes.data as SweetieSessionRow[])
        : [];
      const rawSweetieQ = Array.isArray(sweetieQRes.data)
        ? (sweetieQRes.data as Record<string, unknown>[])
        : [];
      const rawLegacyLogs = Array.isArray(legacyLogsRes.data)
        ? (legacyLogsRes.data as Record<string, unknown>[])
        : [];

      // Build lookup maps so user_id or email resolves to Google Name & Email everywhere
      const profileByKey = new Map<
        string,
        { email: string; full_name: string; google_id: string }
      >();

      const registerProfile = (row: Record<string, unknown>) => {
        const email = pickUserEmail(row);
        const fullName =
          pickUserName(row) || (email ? email.split("@")[0] : "");
        const googleId =
          typeof row.google_id === "string" ? row.google_id.trim() : "";
        const ids = [row.user_id, row.user_identifier, email]
          .filter((v): v is string => typeof v === "string" && Boolean(v.trim()))
          .map((v) => v.trim().toLowerCase());

        for (const k of ids) {
          const prev = profileByKey.get(k);
          profileByKey.set(k, {
            email: email || prev?.email || "",
            full_name: fullName || prev?.full_name || "",
            google_id: googleId || prev?.google_id || "",
          });
        }
      };

      rawUsers.forEach(registerProfile);
      rawSessions.forEach(registerProfile);
      rawSweetieQ.forEach(registerProfile);
      rawLegacyLogs.forEach(registerProfile);

      // Deduplicate unique users by user_id or email without dropping distinct accounts
      const uniqueMap = new Map<string, SweetieUserRow>();
      for (const row of rawUsers) {
        const rawKey = String(row.user_id || row.email || row.id || Math.random())
          .trim()
          .toLowerCase();
        const resolved = profileByKey.get(rawKey);
        const enriched: SweetieUserRow = {
          ...row,
          email: pickUserEmail(row) || resolved?.email || "",
          full_name:
            pickUserName(row) ||
            resolved?.full_name ||
            (resolved?.email ? resolved.email.split("@")[0] : ""),
          google_id:
            (typeof row.google_id === "string" && row.google_id) ||
            resolved?.google_id ||
            "",
        };

        const prev = uniqueMap.get(rawKey);
        if (!prev) {
          uniqueMap.set(rawKey, enriched);
        } else {
          const prevTime = new Date(
            prev.last_login_at || prev.created_at || 0
          ).getTime();
          const nextTime = new Date(
            enriched.last_login_at || enriched.created_at || 0
          ).getTime();
          uniqueMap.set(
            rawKey,
            nextTime >= prevTime
              ? {
                  ...prev,
                  ...enriched,
                  email: enriched.email || prev.email,
                  full_name: enriched.full_name || prev.full_name,
                }
              : {
                  ...enriched,
                  ...prev,
                  email: prev.email || enriched.email,
                  full_name: prev.full_name || enriched.full_name,
                }
          );
        }
      }

      const sortedUsers = Array.from(uniqueMap.values()).sort((a, b) => {
        const tA = new Date(a.last_login_at || a.created_at || 0).getTime();
        const tB = new Date(b.last_login_at || b.created_at || 0).getTime();
        return tB - tA;
      });

      const sortedSessions = [...rawSessions].sort(
        (a, b) =>
          new Date(b.started_at || b.created_at || 0).getTime() -
          new Date(a.started_at || a.created_at || 0).getTime()
      );

      // Merge questions from both parvati_ai_logs and sweetie_user_questions
      const unifiedQuestions: UnifiedQuestionRow[] = [];
      const seenQuestionKeys = new Set<string>();

      const addQuestionRow = (
        row: Record<string, unknown>,
        source: "parvati_ai_logs" | "sweetie_user_questions",
        idx: number
      ) => {
        const qText = String(
          row.question || row.prompt || row.user_message || row.message || ""
        ).trim();
        if (!qText) return;

        const aText = String(
          row.ai_reply || row.answer || row.response || row.reply || ""
        ).trim();
        const createdAt = String(row.created_at || "");
        const rawIdent = String(
          row.user_identifier || row.email || row.user_id || "User"
        ).trim();
        const lookup = profileByKey.get(rawIdent.toLowerCase());
        const resolvedEmail = pickUserEmail(row) || lookup?.email || "";
        const resolvedName =
          pickUserName(row) ||
          lookup?.full_name ||
          (resolvedEmail ? resolvedEmail.split("@")[0] : rawIdent);

        const dedupKey = `${rawIdent.toLowerCase()}::${qText.toLowerCase()}::${createdAt.slice(0, 16)}`;
        if (seenQuestionKeys.has(dedupKey)) return;
        seenQuestionKeys.add(dedupKey);

        unifiedQuestions.push({
          uid: `${source}-${String(row.id ?? idx)}`,
          user_identifier: rawIdent,
          email: resolvedEmail,
          full_name: resolvedName,
          question: qText,
          ai_reply: aText,
          created_at: createdAt,
          source,
        });
      };

      rawSweetieQ.forEach((row, idx) =>
        addQuestionRow(row, "sweetie_user_questions", idx)
      );
      rawLegacyLogs.forEach((row, idx) =>
        addQuestionRow(row, "parvati_ai_logs", idx)
      );

      unifiedQuestions.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );

      setUsers(sortedUsers);
      setSessions(sortedSessions);
      setQuestions(unifiedQuestions);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to load admin logs"
      );
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
            <h2 className="text-base font-bold">
              Admin Activity & Logs (Permanent)
            </h2>
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
                <th className="p-3">Google Name</th>
                <th className="p-3">Google Email</th>
                <th className="p-3">User / Google ID</th>
                <th className="p-3">Created</th>
                <th className="p-3">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={String(u.user_id || u.email || u.id || idx)}
                  className="border-b border-rose-50"
                >
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-900">
                    {u.full_name || u.name || "—"}
                  </td>
                  <td className="p-3 font-mono text-rose-700">
                    {u.email || "—"}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">
                    <div>{u.user_id || u.id || "—"}</div>
                    {u.google_id && (
                      <div className="text-[10px] text-slate-400">
                        Google ID: {u.google_id}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(u.created_at)}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(u.last_login_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === "questions" ? (
        <div className="space-y-2.5">
          {questions.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-white rounded-2xl border border-rose-100">
              No questions found in parvati_ai_logs or sweetie_user_questions.
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.uid}
                className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
                  <div>
                    <span className="font-bold text-slate-900">
                      {q.full_name || "User"}
                    </span>
                    {q.email && (
                      <span className="ml-2 text-rose-700">({q.email})</span>
                    )}
                    <span className="ml-2 text-[10px] text-slate-400">
                      [{q.user_identifier}]
                    </span>
                  </div>
                  <span>{formatDateTime(q.created_at)}</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">
                  {q.question}
                </p>
                {q.ai_reply && (
                  <p className="text-xs text-slate-600 bg-rose-50/60 p-2.5 rounded-xl whitespace-pre-wrap">
                    {q.ai_reply}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl border border-rose-200 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/60 font-mono text-[11px] uppercase text-slate-600">
                <th className="p-3">#</th>
                <th className="p-3">Google User</th>
                <th className="p-3">Runtime</th>
                <th className="p-3">Started</th>
                <th className="p-3">Ended</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => (
                <tr key={String(s.id || idx)} className="border-b border-rose-50">
                  <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3 font-mono">
                    <div className="font-semibold text-slate-900">
                      {s.full_name || s.name || s.email || s.user_id || "—"}
                    </div>
                    {s.email && (
                      <div className="text-[11px] text-rose-700">{s.email}</div>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-rose-700">
                    {formatDuration(s.duration_seconds)}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(s.started_at)}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(s.ended_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}