"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MessageSquareQuote, RefreshCw } from "lucide-react";

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

const QUESTION_BACKUP_KEY = "sweetie_stored_questions_v1";

export default function AdminUserQuestionsPanel() {
  const [items, setItems] = useState<StoredQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    let combined: StoredQuestion[] = [];

    try {
      const localRaw = localStorage.getItem(QUESTION_BACKUP_KEY);
      if (localRaw) {
        combined = JSON.parse(localRaw) as StoredQuestion[];
      }
    } catch {
      // Ignored
    }

    try {
      const { data } = await supabase
        .from("sweetie_user_questions")
        .select(
          "id, user_id, user_name, user_identifier, auth_method, question, ai_reply, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(150);

      if (data && data.length > 0) {
        combined = data;
      }
    } catch {
      // Ignored
    }

    setItems(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-slate-900">
          <MessageSquareQuote size={16} className="text-rose-600" />
          <span>All User Questions Asked to Sweetie🌸 ({items.length})</span>
        </div>

        <button
          type="button"
          onClick={loadQuestions}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">
          No user questions recorded yet. Once a user signs in with Google and
          asks a question on /ai, it appears here.
        </p>
      ) : (
        <div className="space-y-3 max-h-[32rem] overflow-y-auto">
          {items.map((row) => (
            <div
              key={row.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-slate-600">
                <div>
                  <span className="font-bold text-slate-900">
                    {row.user_name || "Unknown User"}
                  </span>{" "}
                  <span className="text-rose-700 font-semibold">
                    ({row.user_identifier})
                  </span>
                </div>
                <span className="text-slate-500">
                  {new Date(row.created_at).toLocaleString("en-IN")}
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
          ))}
        </div>
      )}
    </div>
  );
}