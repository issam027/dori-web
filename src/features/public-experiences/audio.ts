export function playChime() {
  const context = new AudioContext();
  const now = context.currentTime;
  for (const [offset, frequency] of [
    [0, 660],
    [0.22, 880],
  ] as const) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.3);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.32);
  }
  window.setTimeout(() => {
    void context.close();
  }, 800);
}

export function speakTicket(ticket: string, counter: number, locale: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    `Ticket ${ticket}, guichet numéro ${String(counter)}`,
  );
  utterance.lang = locale;
  speechSynthesis.speak(utterance);
}
