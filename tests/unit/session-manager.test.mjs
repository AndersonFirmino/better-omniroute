import test from "node:test";
import assert from "node:assert/strict";

const { generateSessionId, touchSession, getActiveSessionCount, getActiveSessions, clearSessions } =
  await import("../../open-sse/services/sessionManager.ts");

// Reset between tests
test.beforeEach(() => clearSessions());

// ─── Session ID Generation ──────────────────────────────────────────────────

test("generateSessionId: apiKeyId returns key ID directly", () => {
  const id = generateSessionId(null, { apiKeyId: "key-uuid-123" });
  assert.equal(id, "key-uuid-123");
});

test("generateSessionId: no apiKeyId but connectionId returns anon:connectionId", () => {
  const id = generateSessionId(null, { connectionId: "conn-abc" });
  assert.equal(id, "anon:conn-abc");
});

test("generateSessionId: no options returns null", () => {
  assert.equal(generateSessionId(null), null);
  assert.equal(generateSessionId(undefined), null);
  assert.equal(generateSessionId({}, {}), null);
});

test("generateSessionId: apiKeyId takes precedence over connectionId", () => {
  const id = generateSessionId(null, { apiKeyId: "key-1", connectionId: "conn-1" });
  assert.equal(id, "key-1");
});

// ─── Session Tracking ───────────────────────────────────────────────────────

test("touchSession: creates session with keyName and lastModel", () => {
  const id = generateSessionId(null, { apiKeyId: "key-001" });
  touchSession(id, "conn-001", { keyName: "Anderson", model: "claude" });

  const sessions = getActiveSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].keyName, "Anderson");
  assert.equal(sessions[0].lastModel, "claude");
  assert.equal(sessions[0].requestCount, 1);
});

test("touchSession: increments requestCount and updates lastModel", () => {
  const id = generateSessionId(null, { apiKeyId: "key-002" });
  touchSession(id, "conn-002", { keyName: "Marcio", model: "claude" });
  touchSession(id, "conn-002", { keyName: "Marcio", model: "gpt-4o" });

  const sessions = getActiveSessions();
  assert.equal(sessions[0].requestCount, 2);
  assert.equal(sessions[0].lastModel, "gpt-4o");
});

test("touchSession with null sessionId: no-op", () => {
  touchSession(null);
  assert.equal(getActiveSessionCount(), 0);
});

test("getActiveSessionCount: tracks count", () => {
  assert.equal(getActiveSessionCount(), 0);
  touchSession("s1", "c1");
  touchSession("s2", "c2");
  assert.equal(getActiveSessionCount(), 2);
});

test("getActiveSessions: returns all fields", () => {
  const id = generateSessionId(null, { apiKeyId: "key-xyz" });
  touchSession(id, "conn-xyz", { keyName: "Test", model: "test-model" });

  const sessions = getActiveSessions();
  assert.equal(sessions.length, 1);
  const s = sessions[0];
  assert.ok("sessionId" in s);
  assert.ok("ageMs" in s);
  assert.ok("requestCount" in s);
  assert.ok("connectionId" in s);
  assert.ok("keyName" in s);
  assert.ok("lastModel" in s);
  assert.equal(s.sessionId, "key-xyz");
  assert.equal(s.keyName, "Test");
  assert.equal(s.lastModel, "test-model");
  assert.ok(s.ageMs >= 0);
});

test("clearSessions: empties store", () => {
  touchSession("s1", "c1");
  clearSessions();
  assert.equal(getActiveSessionCount(), 0);
});
