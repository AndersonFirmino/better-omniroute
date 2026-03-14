import test from "node:test";
import assert from "node:assert/strict";

const sessionManager = await import("../../open-sse/services/sessionManager.ts");
const { clearSessions, generateSessionId, touchSession, getActiveSessions, getActiveSessionCount } =
  sessionManager;

const accountFallback = await import("../../open-sse/services/accountFallback.ts");
const { lockModel, isModelLocked, getAllModelLockouts, clearModelLockouts } = accountFallback;

test.beforeEach(() => {
  clearSessions();
  clearModelLockouts();
});

// ══════════════════════════════════════════════════════════════════
// Bloco 1 — sessionManager
// ══════════════════════════════════════════════════════════════════

test("1.1 — generateSessionId com apiKeyId retorna o próprio id", () => {
  const id = generateSessionId(null, { apiKeyId: "key-uuid-123" });
  assert.equal(id, "key-uuid-123");
});

test("1.2 — generateSessionId sem apiKeyId mas com connectionId retorna anon:connectionId", () => {
  const id = generateSessionId(null, { connectionId: "conn-abc" });
  assert.equal(id, "anon:conn-abc");
});

test("1.3 — generateSessionId sem nada retorna null", () => {
  assert.equal(generateSessionId(null), null);
  assert.equal(generateSessionId(undefined), null);
  assert.equal(generateSessionId({}, {}), null);
});

test("1.4 — touchSession com extra.keyName e extra.model popula campos", () => {
  const id = generateSessionId(null, { apiKeyId: "key-001" });
  touchSession(id, "conn-001", { keyName: "Anderson", model: "claude" });

  const sessions = getActiveSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].keyName, "Anderson");
  assert.equal(sessions[0].lastModel, "claude");
  assert.equal(sessions[0].requestCount, 1);

  // Segunda chamada com modelo diferente atualiza lastModel
  touchSession(id, "conn-001", { keyName: "Anderson", model: "gpt-4o" });
  const updated = getActiveSessions();
  assert.equal(updated[0].lastModel, "gpt-4o");
  assert.equal(updated[0].requestCount, 2);
});

test("1.5 — getActiveSessions retorna todos os campos incluindo keyName e lastModel", () => {
  const id = generateSessionId(null, { apiKeyId: "key-xyz" });
  touchSession(id, "conn-xyz", { keyName: "Marcio", model: "marcio" });

  const sessions = getActiveSessions();
  assert.equal(sessions.length, 1);
  const s = sessions[0];
  assert.ok("sessionId" in s, "deve ter sessionId");
  assert.ok("ageMs" in s, "deve ter ageMs");
  assert.ok("requestCount" in s, "deve ter requestCount");
  assert.ok("connectionId" in s, "deve ter connectionId");
  assert.ok("keyName" in s, "deve ter keyName");
  assert.ok("lastModel" in s, "deve ter lastModel");
  assert.equal(s.sessionId, "key-xyz");
  assert.equal(s.keyName, "Marcio");
  assert.equal(s.lastModel, "marcio");
  assert.ok(s.ageMs >= 0, "ageMs deve ser >= 0");
});

test("1.6 — getActiveSessionCount reflete número de sessões criadas", () => {
  assert.equal(getActiveSessionCount(), 0);

  touchSession(generateSessionId(null, { apiKeyId: "key-1" }), "conn-1", { keyName: "User1" });
  assert.equal(getActiveSessionCount(), 1);

  touchSession(generateSessionId(null, { apiKeyId: "key-2" }), "conn-2", { keyName: "User2" });
  assert.equal(getActiveSessionCount(), 2);

  // Mesma key não cria nova sessão
  touchSession(generateSessionId(null, { apiKeyId: "key-1" }), "conn-1", { keyName: "User1" });
  assert.equal(getActiveSessionCount(), 2);
});

// ══════════════════════════════════════════════════════════════════
// Bloco 2 — accountFallback (model lockouts)
// ══════════════════════════════════════════════════════════════════

test("2.1 — lockModel + isModelLocked — modelo fica locked", () => {
  lockModel("openai", "conn-a", "gpt-4o", "rate_limit", 60_000);
  assert.equal(isModelLocked("openai", "conn-a", "gpt-4o"), true);
  assert.equal(isModelLocked("openai", "conn-a", "gpt-3.5"), false); // modelo diferente
  assert.equal(isModelLocked("openai", "conn-b", "gpt-4o"), false); // connection diferente
});

test("2.2 — getAllModelLockouts retorna lockout com todos os campos", () => {
  lockModel("anthropic", "conn-b", "claude-3-5-sonnet", "quota_exceeded", 30_000);
  const lockouts = getAllModelLockouts();
  assert.equal(lockouts.length, 1);
  const l = lockouts[0];
  assert.equal(l.provider, "anthropic");
  assert.equal(l.connectionId, "conn-b");
  assert.equal(l.model, "claude-3-5-sonnet");
  assert.equal(l.reason, "quota_exceeded");
  assert.ok(l.remainingMs > 0, "remainingMs deve ser > 0");
});

test("2.3 — getAllModelLockouts não retorna lockout expirado", async () => {
  lockModel("google", "conn-c", "gemini-pro", "rate_limit", 1); // 1ms — expira imediatamente
  await new Promise((r) => setTimeout(r, 10));
  const lockouts = getAllModelLockouts();
  assert.equal(lockouts.length, 0, "lockout expirado não deve aparecer");
});

test("2.4 — clearModelLockouts limpa o Map entre testes", () => {
  lockModel("openai", "conn-d", "gpt-4o", "rate_limit", 60_000);
  assert.equal(getAllModelLockouts().length, 1);
  clearModelLockouts();
  assert.equal(getAllModelLockouts().length, 0);
});
