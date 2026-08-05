// Speaks a called bingo number aloud using the browser's built-in
// text-to-speech (Web Speech API) - no audio files, no network call,
// works offline once the voice list is loaded. Silently no-ops on
// browsers/webviews that don't support it (older Android system
// webviews used by some Telegram clients) rather than throwing.

const COLUMN_FOR_NUMBER = (n) => {
  if (n <= 15) return 'B';
  if (n <= 30) return 'I';
  if (n <= 45) return 'N';
  if (n <= 60) return 'G';
  return 'O';
};

let voicesReady = false;
if (typeof window !== 'undefined' && window.speechSynthesis) {
  // Some browsers load voices asynchronously; kick that off early so
  // the first announcement isn't silent while voices are still empty.
  window.speechSynthesis.onvoiceschanged = () => {
    voicesReady = true;
  };
}

export function speakNumber(number) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const letter = COLUMN_FOR_NUMBER(number);
  const utterance = new SpeechSynthesisUtterance(`${letter} ${number}`);
  utterance.rate = 0.95;
  utterance.pitch = 1;

  // Cancel any utterance still queued so calls that land in quick
  // succession (e.g. on reconnect replaying recent calls) don't pile
  // up and read out of order.
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export { COLUMN_FOR_NUMBER };
