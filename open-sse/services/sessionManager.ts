/**
 * Active Sessions Tracking
 *
 * Tracks active users by API key for the dashboard.
 * Each API key = one session entry with request count, last model, etc.
 */

interface SessionEntry {
  createdAt: number;
  lastActive: number;
  requestCount: number;
  connectionId: string | null;
  keyName: string | null;
  lastModel: string | null;
}

interface SessionIdOptions {
  provider?: string;
  connectionId?: string;
  apiKeyId?: string;
}

interface TouchSessionExtra {
  keyName?: string;
  model?: string;
}

// In-memory session store
const sessions = new Map<string, SessionEntry>();

// Auto-cleanup sessions older than 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;
const _cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of sessions) {
    if (now - entry.lastActive > SESSION_TTL_MS) sessions.delete(key);
  }
}, 60_000);
_cleanupTimer.unref();

/**
 * Generate a session ID from API key or connection.
 * - API key present → use key ID directly
 * - No key, but connectionId → anon:{connectionId}
 * - Neither → null
 */
export function generateSessionId(_body: unknown, options: SessionIdOptions = {}): string | null {
  if (options.apiKeyId) return options.apiKeyId;
  if (options.connectionId) return `anon:${options.connectionId}`;
  return null;
}

/**
 * Touch or create a session
 */
export function touchSession(
  sessionId: string | null,
  connectionId: string | null = null,
  extra?: TouchSessionExtra
): void {
  if (!sessionId) return;
  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastActive = Date.now();
    existing.requestCount++;
    if (connectionId) existing.connectionId = connectionId;
    if (extra?.model) existing.lastModel = extra.model;
    if (extra?.keyName) existing.keyName = extra.keyName;
  } else {
    sessions.set(sessionId, {
      createdAt: Date.now(),
      lastActive: Date.now(),
      requestCount: 1,
      connectionId,
      keyName: extra?.keyName ?? null,
      lastModel: extra?.model ?? null,
    });
  }
}

/**
 * Get session info (for sticky routing decisions)
 */
export function getSessionInfo(sessionId: string | null): SessionEntry | null {
  if (!sessionId) return null;
  const entry = sessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.lastActive > SESSION_TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return { ...entry };
}

/**
 * Get the bound connection for a session (sticky routing)
 */
export function getSessionConnection(sessionId: string | null): string | null {
  const info = getSessionInfo(sessionId);
  return info?.connectionId || null;
}

/**
 * Get session count (for dashboard)
 */
export function getActiveSessionCount(): number {
  return sessions.size;
}

/**
 * Get all active sessions (for dashboard)
 */
export function getActiveSessions(): Array<SessionEntry & { sessionId: string; ageMs: number }> {
  const now = Date.now();
  const result: Array<SessionEntry & { sessionId: string; ageMs: number }> = [];
  for (const [id, entry] of sessions) {
    if (now - entry.lastActive <= SESSION_TTL_MS) {
      result.push({ sessionId: id, ...entry, ageMs: now - entry.lastActive });
    }
  }
  return result;
}

/**
 * Clear all sessions (for testing)
 */
export function clearSessions(): void {
  sessions.clear();
}
