let context: AudioContext | undefined;
export function playSound(enabled: boolean, success = false) {
  if (!enabled) return;
  try {
    context ??= new AudioContext(); void context.resume();
    const frequencies = success ? [392, 493.88, 587.33] : [280];
    frequencies.forEach((frequency, i) => {
      const oscillator = context!.createOscillator(), gain = context!.createGain();
      const time = context!.currentTime + i * .085;
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, time);
      gain.gain.setValueAtTime(.025, time); gain.gain.exponentialRampToValueAtTime(.0001, time + .18);
      oscillator.connect(gain); gain.connect(context!.destination); oscillator.start(time); oscillator.stop(time + .2);
    });
  } catch { /* Audio is optional. */ }
}
