// Tiny synthesized sound effects (Web Audio, no asset files).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem("watermelon-muted") === "1";
let volume = Number(localStorage.getItem("watermelon-volume") ?? 0.7); // 0..1

// The slider is linear but loudness isn't, so square it for a natural feel.
const targetGain = () => (muted ? 0 : volume * volume * 0.9);

function applyGain() {
  if (ctx && master) master.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.02);
}

/** Must be called from a user gesture (click/tap) before sounds can play. */
export function unlockAudio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = targetGain();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
}

export function isMuted() {
  return muted || volume === 0;
}

export function setMuted(value: boolean) {
  muted = value;
  // unmuting at zero volume would be silent, so bump it back up
  if (!value && volume === 0) setVolume(0.5);
  localStorage.setItem("watermelon-muted", value ? "1" : "0");
  applyGain();
}

export function getVolume() {
  return volume;
}

export function setVolume(value: number) {
  volume = Math.max(0, Math.min(1, value));
  localStorage.setItem("watermelon-volume", String(volume));
  if (volume > 0 && muted) {
    muted = false; // moving the slider up implies "unmute"
    localStorage.setItem("watermelon-muted", "0");
  }
  applyGain();
}

/** One enveloped oscillator sweeping from `from` Hz to `to` Hz. */
function tone(
  type: OscillatorType,
  from: number,
  to: number,
  duration: number,
  volume: number,
  delay = 0,
) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Soft click when a fruit is released. */
export function playDrop() {
  tone("sine", 900, 500, 0.06, 0.08);
}

let lastLand = 0;
/** Plop when a fruit first touches something. Bigger fruit = deeper, softer-attack thud. */
export function playLand(index: number, strength = 1) {
  if (!ctx) return;
  // avoid a wall of plops when lots of fruit settle at once
  if (ctx.currentTime - lastLand < 0.04) return;
  lastLand = ctx.currentTime;
  const base = 340 * Math.pow(0.88, index);
  const vol = Math.min(0.35, 0.12 + strength * 0.2);
  tone("sine", base, base * 0.45, 0.14 + index * 0.012, vol);
}

/** Rising "pop" on merge. Pitch climbs as fruit gets bigger; big merges get a sparkle. */
export function playMerge(index: number) {
  // pentatonic steps so consecutive merges sound musical
  const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const f = 330 * Math.pow(2, (steps[index] ?? 24) / 12);
  tone("triangle", f * 0.6, f * 1.4, 0.13, 0.28);
  tone("sine", f * 1.5, f * 2, 0.1, 0.12, 0.04);
  if (index >= 5) {
    tone("sine", f * 2, f * 2.5, 0.18, 0.08, 0.09);
    tone("sine", f * 3, f * 3.5, 0.22, 0.05, 0.14);
  }
}

/** Sad little descending "wah-wah" for game over. */
export function playGameOver() {
  const notes = [392, 349, 311, 262];
  notes.forEach((f, i) => tone("triangle", f, f * 0.97, i === 3 ? 0.7 : 0.22, 0.22, i * 0.2));
}

/** Bright arpeggio when starting a new game. */
export function playStart() {
  [523, 659, 784].forEach((f, i) => tone("sine", f, f * 1.01, 0.12, 0.12, i * 0.07));
}
