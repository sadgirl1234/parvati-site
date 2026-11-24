"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Users,
  MessageSquare,
  Clock,
  ShieldCheck,
  X,
  ChevronRight,
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
  user_name?: string | null;
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
  user_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  duration_seconds?: number | null;
  started_at?: string | null;
  login_at?: string | null;
  ended_at?: string | null;
  last_active_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

interface UnifiedQuestionRow {
  uid: string;
  user_id: string;
  user_identifier: string;
  email: string;
  full_name: string;
  question: string;
  ai_reply: string;
  created_at: string;
}

interface SelectedUserFilter {
  key: string;
  label: string;
  email: string;
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
    row.user_name,
    row.full_name,
    row.display_name,
    row.name,
    row.google_name,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function pickUserEmail(row: Record<string, unknown>): string {
  const candidates = [
    row.user_email,
    row.email,
    row.google_email,
    row.user_identifier,
  ];
  for (const val of candidates) {
    if (typeof val === "string" && val.includes("@")) return val.trim();
  }
  return "";
}

function loadLocalHistoricalQuestions(): Record<string, unknown>[] {
  const collected: Record<string, unknown>[] = [];
  if (typeof window === "undefined") return collected;

  try {
    const rawBackup = localStorage.getItem("sweetie_stored_questions_v1");
    if (rawBackup) {
      const parsed = JSON.parse(rawBackup) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            collected.push(item as Record<string, unknown>);
          }
        }
      }
    }
  } catch {
    // Ignored
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("sweetie_permanent_chat_")) continue;
      const rawChat = localStorage.getItem(key);
      if (!rawChat) continue;
      const msgs = JSON.parse(rawChat) as unknown;
      if (!Array.isArray(msgs)) continue;

      const userKey = decodeURIComponent(
        key.replace("sweetie_permanent_chat_", "")
      );

      for (let mIdx = 0; mIdx < msgs.length; mIdx++) {
        const msg = msgs[mIdx] as {
          role?: string;
          content?: string;
          time?: string;
        };
        if (msg?.role === "user" && typeof msg.content === "string") {
          const nextMsg = msgs[mIdx + 1] as
            | { role?: string; content?: string }
            | undefined;
          const replyText =
            nextMsg?.role === "assistant" && typeof nextMsg.content === "string"
              ? nextMsg.content
              : "";
          collected.push({
            id: `local-${key}-${mIdx}`,
            user_id: userKey,
            user_identifier: userKey,
            question: msg.content,
            ai_reply: replyText,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
  } catch {
    // Ignored
  }

  return collected;
}

export default function AdminUserQuestionsPanel() {
  const [activeTab, setActiveTab] = useState<
    "users" | "questions" | "sessions"
  >("users");
  const [users, setUsers] = useState<SweetieUserRow[]>([]);
  const [sessions, setSessions] = useState<SweetieSessionRow[]>([]);
  const [questions, setQuestions] = useState<UnifiedQuestionRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<SelectedUserFilter | null>(
    null
  );
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
      const localHistorical = loadLocalHistoricalQuestions();

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
          .filter(
            (v): v is string => typeof v === "string" && Boolean(v.trim())
          )
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
      localHistorical.forEach(registerProfile);

      const uniqueMap = new Map<string, SweetieUserRow>();
      for (const row of rawUsers) {
        const rawKey = String(
          row.user_id || row.email || row.id || Math.random()
        )
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
          new Date(
            String(b.started_at ?? b.login_at ?? b.created_at ?? 0)
          ).getTime() -
          new Date(
            String(a.started_at ?? a.login_at ?? a.created_at ?? 0)
          ).getTime()
      );

      const unifiedQuestions: UnifiedQuestionRow[] = [];
      const seenQuestionKeys = new Set<string>();

      const pushPair = (params: {
        idPart: string;
        row: Record<string, unknown>;
        question: string;
        aiReply: string;
        createdAt: string;
      }) => {
        const qText = params.question.trim();
        if (!qText) return;
        const aText = params.aiReply.trim();
        const createdAt = params.createdAt || new Date().toISOString();
        const rawUserId = String(params.row.user_id || "").trim();
        const rawIdent = String(
          params.row.user_identifier ||
            params.row.email ||
            params.row.user_id ||
            "User"
        ).trim();
        const lookup =
          profileByKey.get(rawIdent.toLowerCase()) ||
          profileByKey.get(rawUserId.toLowerCase());
        const resolvedEmail = pickUserEmail(params.row) || lookup?.email || "";
        const resolvedName =
          pickUserName(params.row) ||
          lookup?.full_name ||
          (resolvedEmail ? resolvedEmail.split("@")[0] : rawIdent);

        const dedupKey = `${rawUserId.toLowerCase()}::${rawIdent.toLowerCase()}::${qText.toLowerCase()}::${aText
          .slice(0, 60)
          .toLowerCase()}::${createdAt.slice(0, 16)}`;
        if (seenQuestionKeys.has(dedupKey)) return;
        seenQuestionKeys.add(dedupKey);

        unifiedQuestions.push({
          uid: params.idPart,
          user_id: rawUserId,
          user_identifier: rawIdent,
          email: resolvedEmail,
          full_name: resolvedName,
          question: qText,
          ai_reply: aText,
          created_at: createdAt,
        });
      };

      const ingestQuestionRow = (
        row: Record<string, unknown>,
        prefix: string,
        idx: number
      ) => {
        const createdAt = String(row.created_at || "");
        const directQ = String(
          row.question ||
            row.prompt ||
            row.user_message ||
            row.query ||
            row.message ||
            ""
        ).trim();
        const directA = String(
          row.ai_reply ||
            row.answer ||
            row.response ||
            row.reply ||
            row.assistant_message ||
            ""
        ).trim();

        if (directQ) {
          pushPair({
            idPart: `${prefix}-${String(row.id ?? idx)}`,
            row,
            question: directQ,
            aiReply: directA,
            createdAt,
          });
        }

        const convo = row.conversation_json;
        if (Array.isArray(convo)) {
          for (let i = 0; i < convo.length; i++) {
            const item = convo[i] as { role?: string; content?: string };
            if (item?.role === "user" && typeof item.content === "string") {
              const nextItem = convo[i + 1] as
                | { role?: string; content?: string }
                | undefined;
              const reply =
                nextItem?.role === "assistant" &&
                typeof nextItem.content === "string"
                  ? nextItem.content
                  : "";
              pushPair({
                idPart: `${prefix}-convo-${String(row.id ?? idx)}-${i}`,
                row,
                question: item.content,
                aiReply: reply,
                createdAt,
              });
            }
          }
        }
      };

      rawSweetieQ.forEach((r, idx) => ingestQuestionRow(r, "sq", idx));
      rawLegacyLogs.forEach((r, idx) => ingestQuestionRow(r, "lg", idx));
      localHistorical.forEach((r, idx) => ingestQuestionRow(r, "lc", idx));

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

  const openUserChats = (u: SweetieUserRow) => {
    const email = String(u.email || u.user_email || "").trim();
    const userId = String(u.user_id || u.id || "").trim();
    const name = String(
      u.full_name || u.user_name || u.name || (email ? email.split("@")[0] : "User")
    ).trim();

    setSelectedUser({
      key: (userId || email).toLowerCase(),
      label: name,
      email,
    });
    setActiveTab("questions");
  };

  const filteredQuestions = useMemo(() => {
    if (!selectedUser) return questions;
    const targetKey = selectedUser.key.toLowerCase();
    const targetEmail = selectedUser.email.toLowerCase();

    return questions.filter((q) => {
      const qUserId = q.user_id.trim().toLowerCase();
      const qIdent = q.user_identifier.trim().toLowerCase();
      const qEmail = q.email.trim().toLowerCase();

      if (targetKey && (qUserId === targetKey || qIdent === targetKey)) {
        return true;
      }
      if (targetEmail && (qEmail === targetEmail || qIdent === targetEmail)) {
        return true;
      }
      return false;
    });
  }, [questions, selectedUser]);

  const getUserChatCount = (u: SweetieUserRow): number => {
    const email = String(u.email || u.user_email || "").trim().toLowerCase();
    const userId = String(u.user_id || u.id || "").trim().toLowerCase();

    return questions.filter((q) => {
      const qUserId = q.user_id.trim().toLowerCase();
      const qIdent = q.user_identifier.trim().toLowerCase();
      const qEmail = q.email.trim().toLowerCase();
      return (
        (userId && (qUserId === userId || qIdent === userId)) ||
        (email && (qEmail === email || qIdent === email))
      );
    }).length;
  };

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

      <div className="flex flex-wrap items-center justify-between gap-2">
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
            <span>
              {selectedUser
                ? `${selectedUser.label}'s Chats (${filteredQuestions.length})`
                : `User Questions (${questions.length})`}
            </span>
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

        {selectedUser && activeTab === "questions" && (
          <button
            type="button"
            onClick={() => setSelectedUser(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-mono font-bold text-rose-700 cursor-pointer"
          >
            <X size={13} />
            <span>Show All Users ({questions.length})</span>
          </button>
        )}
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
                <th className="p-3 text-right">AI Chats</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const chatCount = getUserChatCount(u);
                return (
                  <tr
                    key={String(u.user_id || u.email || u.id || idx)}
                    onClick={() => openUserChats(u)}
                    className="border-b border-rose-50 hover:bg-rose-50/50 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-900">
                      {u.full_name || u.user_name || u.name || "—"}
                    </td>
                    <td className="p-3 font-mono text-rose-700">
                      {u.email || u.user_email || "—"}
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
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openUserChats(u);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-mono text-[11px] font-bold cursor-pointer"
                      >
                        <span>Chats ({chatCount})</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeTab === "questions" ? (
        <div className="space-y-3">
          {selectedUser && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-mono">
              <div>
                Viewing separate AI chat log for{" "}
                <strong className="text-slate-900">{selectedUser.label}</strong>
                {selectedUser.email && (
                  <span className="ml-2 text-rose-700">
                    ({selectedUser.email})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="underline text-rose-700 font-bold cursor-pointer"
              >
                View all users combined
              </button>
            </div>
          )}

          {filteredQuestions.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-white rounded-2xl border border-rose-100">
              {selectedUser
                ? `No AI chats found for ${selectedUser.label}.`
                : "No questions found yet."}
            </div>
          ) : (
            filteredQuestions.map((q) => (
              <div
                key={q.uid}
                className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm space-y-2"
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
                      {s.full_name ||
                        s.user_name ||
                        s.name ||
                        s.email ||
                        s.user_id ||
                        "—"}
                    </div>
                    {(s.email || s.user_email) && (
                      <div className="text-[11px] text-rose-700">
                        {s.email || s.user_email}
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono font-bold text-rose-700">
                    {formatDuration(s.duration_seconds)}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(
                      String(s.started_at ?? s.login_at ?? "") || null
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {formatDateTime(
                      String(s.ended_at ?? s.last_active_at ?? "") || null
                    )}
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