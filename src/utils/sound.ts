function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.25) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    osc.onended = () => ctx.close();
  } catch (_) {}
}

export function soundWinner() {
  if (document.hidden) return;
  tone(523, 0.12);                           // C5
  setTimeout(() => tone(659, 0.12), 130);   // E5
  setTimeout(() => tone(784, 0.25), 260);   // G5
}

export function soundElimination() {
  if (document.hidden) return;
  tone(440, 0.18, "sawtooth", 0.2);         // A4
  setTimeout(() => tone(330, 0.28, "sawtooth", 0.15), 200); // E4
}

export function soundConfirm() {
  if (document.hidden) return;
  tone(880, 0.03, "sine", 0.08);            // A5, short tick
}
