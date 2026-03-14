"use client";

import { useTranslations } from "next-intl";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/shared/components";

export default function SessionsTab() {
  const t = useTranslations("usage");
  const [data, setData] = useState({ count: 0, sessions: [] });
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  const formatAge = (ms) => {
    if (ms < 60000) return t("durationSecondsShort", { value: Math.floor(ms / 1000) });
    if (ms < 3600000) return t("durationMinutesShort", { value: Math.floor(ms / 60000) });
    return t("durationHoursShort", { value: Math.floor(ms / 3600000) });
  };

  return (
    <Card>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
            group
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{t("activeSessions")}</h3>
          <p className="text-sm text-text-muted">Usuários ativos no momento</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-sm font-semibold tabular-nums text-cyan-400">{data.count}</span>
          </span>
        </div>
      </div>

      {data.sessions.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          <span
            className="material-symbols-outlined text-[40px] mb-2 block opacity-40"
            aria-hidden="true"
          >
            group
          </span>
          <p className="text-sm">{t("noSessions")}</p>
          <p className="text-xs mt-1">{t("sessionsHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Usuário
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Última atividade
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  {t("requests")}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Modelo
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr
                  key={s.sessionId}
                  className="border-b border-border/10 hover:bg-surface/20 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <span className="text-sm font-medium">{s.keyName || "Direto"}</span>
                  </td>
                  <td className="py-2.5 px-3 text-text-muted tabular-nums">{formatAge(s.ageMs)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-semibold tabular-nums">{s.requestCount}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    {s.lastModel ? (
                      <span className="text-xs font-mono text-cyan-400">{s.lastModel}</span>
                    ) : (
                      <span className="text-text-muted/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
