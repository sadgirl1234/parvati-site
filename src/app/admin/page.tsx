"use client";

import { useState } from "react";
import { Lock, Unlock, KeyRound, Shield } from "lucide-react";
import AdminUserQuestionsPanel from "@/components/AdminUserQuestionsPanel";

const ADMIN_PWD = "841694";

export default function ParvatiAdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.trim() === ADMIN_PWD) {
      setUnlocked(true);
      setError("");
      setPwd("");
    } else {
      setError("Incorrect admin password.");
    }
  };

  if (!unlocked) {
    return (
      <div className="max-w-md mx-auto py-14">
        <form
          onSubmit={handleLogin}
          className="p-7 rounded-3xl bg-white border border-rose-200 shadow-xl space-y-5 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md">
            <Shield size={26} />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              Admin Vault
            </h1>
            <p className="text-xs text-slate-600">
              Enter admin password to view all user questions.
            </p>
          </div>

          <div className="relative">
            <KeyRound
              size={16}
              className="text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pwd}
              onChange={(e) => {
                setPwd(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter admin password..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-rose-400 focus:bg-white focus:outline-none text-sm font-mono text-slate-900"
            />
          </div>

          {error && (
            <p className="text-xs font-mono font-bold text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-mono text-xs font-bold shadow-md cursor-pointer"
          >
            <Unlock size={15} /> Open Admin Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="flex items-center justify-between gap-3 px-5 py-4 rounded-3xl bg-white border border-rose-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-slate-900">
            Parvati Admin Dashboard
          </h1>
          <p className="text-xs text-slate-600">
            Inspect every question asked to Sweetie🌸 AI.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUnlocked(false)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-mono font-bold cursor-pointer"
        >
          <Lock size={13} /> Lock
        </button>
      </div>

      <AdminUserQuestionsPanel />
    </div>
  );
}