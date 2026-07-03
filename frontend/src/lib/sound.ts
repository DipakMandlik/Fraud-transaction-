let audioCtx: AudioContext | null = null;

export function playAlertChime(): void {
  try {
    audioCtx = audioCtx ?? new AudioContext();
    const ctx = audioCtx;
    const now = ctx.currentTime;

    [880, 660].forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.2);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now + i * 0.12);
      oscillator.stop(now + i * 0.12 + 0.22);
    });
  } catch {
    // audio not available (e.g. autoplay policy) - fail silently
  }
}
