export const ANNOUNCEMENT_KINDS = Object.freeze([
  'correct',
  'wrong',
  'missed',
  'microphone-ready',
  'microphone-error',
  'input-compatibility',
  'round-ended',
]);

const DEFAULT_ANNOUNCEMENTS = Object.freeze({
  'microphone-ready': 'Microphone ready. Sing or play the note.',
  'microphone-error': 'Microphone error. Check browser permission and try again.',
});

export function syncElementText(element, value) {
  const text = String(value ?? '');
  if (element.textContent === text) return false;
  element.textContent = text;
  return true;
}

export function createSemanticPresenter({
  announcementElement,
  pitchVisualIntervalMs = 150,
  pitchAnnouncementIntervalMs = 1000,
  announcementGapMs = 1200,
  maxAnnouncementNodes = 20,
  scheduler = (callback, delayMs) => setTimeout(callback, delayMs),
} = {}) {
  const announcedEvents = new Set();
  const announcementQueue = [];
  let announcementBusy = false;
  let lastPitchVisualAtMs = Number.NEGATIVE_INFINITY;
  let lastPitchAnnouncementAtMs = Number.NEGATIVE_INFINITY;
  let pendingPitchAnnouncement = null;
  let pendingPitchScheduled = false;
  let hadPitch = false;

  function writeAnnouncement(text) {
    const documentObject = announcementElement?.ownerDocument;
    if (documentObject?.createElement && typeof announcementElement.appendChild === 'function') {
      const node = documentObject.createElement('span');
      node.textContent = text;
      announcementElement.appendChild(node);
      while (announcementElement.children?.length > maxAnnouncementNodes) {
        announcementElement.removeChild(announcementElement.children[0]);
      }
      return true;
    }
    return syncElementText(announcementElement, text);
  }

  function flushAnnouncementQueue() {
    if (announcementBusy || announcementQueue.length === 0) return;
    const nextAnnouncement = announcementQueue.shift();
    announcementBusy = true;
    writeAnnouncement(nextAnnouncement);
    scheduler(() => {
      announcementBusy = false;
      flushAnnouncementQueue();
    }, announcementGapMs);
  }

  function queueAnnouncement(announcement) {
    announcementQueue.push(announcement);
    flushAnnouncementQueue();
    return true;
  }

  function announce({ kind, id, message } = {}) {
    if (!ANNOUNCEMENT_KINDS.includes(kind)) return false;
    const eventKey = `${kind}:${id ?? message ?? ''}`;
    if (announcedEvents.has(eventKey)) return false;
    const announcement = message || DEFAULT_ANNOUNCEMENTS[kind];
    if (!announcement) return false;
    announcedEvents.add(eventKey);
    return queueAnnouncement(announcement);
  }

  function updateTimer(element, displayedSeconds) {
    return syncElementText(element, displayedSeconds);
  }

  function maybeAnnouncePitchTransition(message, hasPitch, nowMs) {
    const elapsed = nowMs - lastPitchAnnouncementAtMs;
    if (elapsed >= pitchAnnouncementIntervalMs) {
      pendingPitchAnnouncement = null;
      queueAnnouncement(message);
      lastPitchAnnouncementAtMs = nowMs;
      return;
    }
    pendingPitchAnnouncement = { message, hasPitch };
    if (pendingPitchScheduled) return;
    pendingPitchScheduled = true;
    scheduler(() => {
      pendingPitchScheduled = false;
      if (!pendingPitchAnnouncement || pendingPitchAnnouncement.hasPitch !== hadPitch) return;
      queueAnnouncement(pendingPitchAnnouncement.message);
      pendingPitchAnnouncement = null;
      lastPitchAnnouncementAtMs += pitchAnnouncementIntervalMs;
    }, pitchAnnouncementIntervalMs - elapsed);
  }

  function updatePitch(element, { message, hasPitch, nowMs }) {
    const pitchChanged = hasPitch !== hadPitch;
    if (pitchChanged) {
      maybeAnnouncePitchTransition(hasPitch ? 'Pitch detected.' : 'Pitch lost. Sing or play a steady note.', hasPitch, nowMs);
    }
    hadPitch = hasPitch;
    if (!pitchChanged && nowMs - lastPitchVisualAtMs < pitchVisualIntervalMs) return false;
    lastPitchVisualAtMs = nowMs;
    return syncElementText(element, message);
  }

  return { announce, updatePitch, updateTimer };
}
