"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MessageSquareQuote,
  RefreshCw,
  Users,
  CalendarPlus,
  Clock,
  Timer,
} from "lucide-react";

interface StoredQuestion {
  id: string | number;
  user_id?: string | null;
  user_name?: string | null;
  user_identifier: string;
  auth_method: string;
  question: string;
  ai_reply?: string | null;
  created_at: string;
}

interface RegisteredUser {
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  last_login_at: string;
  total_seconds_spent?: number | null;
}

const QUESTION_BACKUP_KEY = "sweetie_stored_questions_v1";
const USERS_BACKUP_KEY = "sweetie_registered_users_v2";

function resolveGoogleAccountName(
  rawName?: string | null,
  email?: string | null
): string {
  const explicit = rawName?.trim();
  if (explicit && explicit.toLowerCase() !== "unknown user") {
    return explicit;
  }
  const emailPrefix = email?.split("@")[0]?.trim();
  if (emailPrefix) {
    return emailPrefix
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return "Google User";
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDuration(totalSeconds?: number | null): string {
  const secs = Math.max(0, Math.floor(Number(totalSeconds || 0)));
  const hrs = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const remSecs = secs % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${remSecs}s`;
  if (mins > 0) return `${mins}m ${remSecs}s`;
  return `${remSecs}s`;
}

export default function AdminUserQuestionsPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "questions">("users");
  const [items, setItems] = useState<StoredQuestion[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAllAdminData = async () => {
    setLoading(true);
    let combinedQuestions: StoredQuestion[] = [];
    let combinedUsers: RegisteredUser[] = [];

    try {
      const localQ = localStorage.getItem(QUESTION_BACKUP_KEY);
      if (localQ) combinedQuestions = JSON.parse(localQ) as StoredQuestion[];
    } catch {
      // Ignored
    }

    try {
      const localU = localStorage.getItem(USERS_BACKUP_KEY);
      if (localU) combinedUsers = JSON.parse(localU) as RegisteredUser[];
    } catch {
      // Ignored
    }

    try {
      const { data: qData } = await supabase
        .from("sweetie_user_questions")
        .select(
          "id, user_id, user_name, user_identifier, auth_method, question, ai_reply, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (qData && qData.length > 0) {
        combinedQuestions = qData;
      }
    } catch {
      // Ignored
    }

    try {
      const { data: uData } = await supabase
        .from("sweetie_users")
        .select(
          "user_id, user_name, user_email, created_at, last_login_at, total_seconds_spent"
        )
        .order("last_login_at", { ascending: false })
        .limit(300);

      if (uData && uData.length > 0) {
        combinedUsers = uData;
      }
    } catch {
      // Ignored
    }

    const userMap = new Map<string, RegisteredUser>();
    for (const u of combinedUsers) {
      const key = u.user_id || u.user_email;
      if (!key) continue;
      userMap.set(key, {
        ...u,
        user_id: key,
        user_name: resolveGoogleAccountName(u.user_name, u.user_email),
        total_seconds_spent: Number(u.total_seconds_spent || 0),
      });
    }

    for (const q of combinedQuestions) {
      const key = q.user_id || q.user_identifier;
      if (!key) continue;
      const existing = userMap.get(key);
      if (!existing) {
        userMap.set(key, {
          user_id: key,
          user_name: resolveGoogleAccountName(q.user_name, q.user_identifier),
          user_email: q.user_identifier,
          created_at: q.created_at,
          last_login_at: q.created_at,
          total_seconds_spent: 0,
        });
      } else {
        if (new Date(q.created_at) < new Date(existing.created_at)) {
          existing.created_at = q.created_at;
        }
        if (new Date(q.created_at) > new Date(existing.last_login_at)) {
          existing.last_login_at = q.created_at;
        }
      }
    }

    const sortedUsers = Array.from(userMap.values()).sort(
      (a, b) =>
        new Date(b.last_login_at).getTime() -
        new Date(a.last_login_at).getTime()
    );

    setItems(combinedQuestions);
    setUsers(sortedUsers);
    setLoading(false);
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <Users size={14} />
            <span>Accounts & Users ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("questions")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "questions"
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <MessageSquareQuote size={14} />
            <span>User Questions ({items.length})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadAllAdminData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border border-rose-200/80 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-rose-700 font-bold">
                Total Registered Users
              </p>
              <p className="text-2xl font-heading font-bold text-slate-900">
                {users.length}{" "}
                <span className="text-xs font-mono font-normal text-slate-600">
                  {users.length === 1 ? "account" : "accounts"}
                </span>
              </p>
            </div>
            <Users size={26} className="text-rose-500" />
          </div>

          {users.length === 0 ? (
            <p className="text-xs text-slate-500">
              No user accounts recorded yet. Once a user signs in with Google on
              /ai, their account name, creation date/time, last login time, and
              time spent appear here.
            </p>
          ) : (
            <div className="space-y-3 max-h-[34rem] overflow-y-auto">
              {users.map((u) => (
                <div
                  key={u.user_id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-slate-900">
                        {resolveGoogleAccountName(u.user_name, u.user_email)}
                      </span>{" "}
                      <span className="font-mono text-rose-700 font-semibold">
                        ({u.user_email})
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 break-all">
                    User ID: {u.user_id}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/70">
                      <CalendarPlus
                        size={13}
                        className="text-emerald-600 shrink-0"
                      />
                      <span>
                        <strong>Created:</strong> {formatDateTime(u.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/70">
                      <Clock size={13} className="text-rose-600 shrink-0" />
                      <span>
                        <strong>Last Login:</strong>{" "}
                        {formatDateTime(u.last_login_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200/70">
                      <Timer size={13} className="text-amber-600 shrink-0" />
                      <span>
                        <strong>Time Spent:</strong>{" "}
                        {formatDuration(u.total_seconds_spent)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-500">
          No user questions recorded yet. Once a user signs in with Google and
          asks a question on /ai, it appears here.
        </p>
      ) : (
        <div className="space-y-3 max-h-[34rem] overflow-y-auto">
          {items.map((row) => {
            const displayName = resolveGoogleAccountName(
              row.user_name,
              row.user_identifier
            );
            return (
              <div
                key={row.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-600">
                  <div>
                    <span className="font-bold text-slate-900">
                      {displayName}
                    </span>{" "}
                    <span className="text-rose-700 font-semibold">
                      ({row.user_identifier})
                    </span>
                  </div>
                  <span className="text-slate-500">
                    {formatDateTime(row.created_at)}
                  </span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 break-all">
                  User ID: {row.user_id || row.user_identifier}
                </div>

                <p className="font-semibold text-slate-900 pt-1">
                  Q: {row.question}
                </p>
                {row.ai_reply && (
                  <p className="text-slate-600">A: {row.ai_reply}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}