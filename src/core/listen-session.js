// Protect recognition from the app's own audio, including a short acoustic tail.
export function createListenSession() {
  let blockedUntil = 0;
  let assistedPrompt = null;
  return {
    assist(promptId) { assistedPrompt = promptId; },
    hear(promptId, nowMs, durationMs) {
      assistedPrompt = promptId;
      blockedUntil = Math.max(blockedUntil, nowMs + durationMs + 300);
    },
    block(nowMs, durationMs) {
      blockedUntil = Math.max(blockedUntil, nowMs + durationMs + 300);
    },
    canScore: (nowMs) => nowMs >= blockedUntil,
    wasAssisted: (promptId) => assistedPrompt !== null && assistedPrompt === promptId,
    reset() { assistedPrompt = null; },
  };
}
