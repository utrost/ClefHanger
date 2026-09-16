export function createSummaryFocusManager({
  backgroundElement,
  summaryElement,
  replayButton,
  playfieldElement,
}) {
  let active = false;

  function setBackgroundIsolated(isolated) {
    backgroundElement.inert = isolated;
    if (isolated) backgroundElement.setAttribute('aria-hidden', 'true');
    else backgroundElement.removeAttribute('aria-hidden');
  }

  function close() {
    active = false;
    summaryElement.hidden = true;
    setBackgroundIsolated(false);
  }

  return {
    sync(shouldBeActive) {
      if (!shouldBeActive) {
        close();
        return;
      }
      summaryElement.hidden = false;
      setBackgroundIsolated(true);
      if (active) return;
      active = true;
      replayButton.focus();
    },

    closeForReplay() {
      close();
      playfieldElement.focus();
    },

    handleKeydown(event) {
      if (!active) return false;
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        replayButton.focus();
        return true;
      }
      return false;
    },
  };
}
