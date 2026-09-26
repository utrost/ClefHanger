export function createSummaryFocusManager({
  backgroundElement,
  summaryElement,
  replayButton,
  playfieldElement,
  onExit,
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
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onExit) onExit();
        else { close(); playfieldElement.focus(); }
        return true;
      }
      if (event.key === 'Tab') {
        const controls = summaryElement.querySelectorAll
          ? [...summaryElement.querySelectorAll('button:not([disabled])')].filter((element) => !element.hidden && element.getClientRects().length)
          : [replayButton];
        const first = controls[0];
        const last = controls.at(-1);
        const focused = summaryElement.ownerDocument?.activeElement || replayButton;
        if (first && (controls.length === 1 || (event.shiftKey ? focused === first : focused === last))) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
          return true;
        }
      }
      return false;
    },
  };
}
