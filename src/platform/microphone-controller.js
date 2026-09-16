export function createMicrophoneController({
  startSession,
  pageTarget = globalThis.window,
  documentTarget = globalThis.document,
  onStop = () => {},
} = {}) {
  if (typeof startSession !== 'function') throw new Error('startSession is required');

  let current = null;
  let generation = 0;
  let removeLifecycleHandlers = null;

  function stop() {
    generation += 1;
    const session = current;
    current = null;
    session?.stop?.();
    onStop(session);
  }

  async function start(...args) {
    stop();
    const requestGeneration = generation;
    try {
      const session = await startSession(...args);
      if (requestGeneration !== generation) {
        session?.stop?.();
        return null;
      }
      current = session;
      return session;
    } catch (error) {
      if (requestGeneration !== generation) return null;
      throw error;
    }
  }

  function selectInputMode(inputMode) {
    if (inputMode !== 'microphone') stop();
  }

  function installLifecycleHandlers() {
    if (removeLifecycleHandlers) return removeLifecycleHandlers;
    const handlePageHide = () => stop();
    const handleVisibilityChange = () => {
      if (documentTarget?.visibilityState === 'hidden') stop();
    };
    pageTarget?.addEventListener?.('pagehide', handlePageHide);
    documentTarget?.addEventListener?.('visibilitychange', handleVisibilityChange);
    removeLifecycleHandlers = () => {
      pageTarget?.removeEventListener?.('pagehide', handlePageHide);
      documentTarget?.removeEventListener?.('visibilitychange', handleVisibilityChange);
      removeLifecycleHandlers = null;
    };
    return removeLifecycleHandlers;
  }

  return {
    start,
    stop,
    selectInputMode,
    installLifecycleHandlers,
    getCurrent: () => current,
  };
}

export async function startAndPublishMicrophoneSession({ start, publish }) {
  const session = await start();
  if (!session) return null;
  publish(session);
  return session;
}
