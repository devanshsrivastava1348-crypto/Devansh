import type { SoundStyle } from '../types/medicine';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  peakGain: number
) {
  const now = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playReminderChime(style: SoundStyle = 'chime'): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (style === 'chime') {
    // Gentle two-note ascending marimba chime (C5 -> G5)
    playTone(ctx, 523.25, 0, 0.45, 'sine', 0.16);
    playTone(ctx, 783.99, 0.16, 0.65, 'sine', 0.18);
  } else if (style === 'bell') {
    // Warm harmonic bell (E5 + B5 overtone)
    playTone(ctx, 659.25, 0, 0.8, 'triangle', 0.15);
    playTone(ctx, 1318.5, 0, 0.55, 'sine', 0.06);
    playTone(ctx, 783.99, 0.25, 0.9, 'triangle', 0.14);
  } else {
    // Crisp double pulse
    playTone(ctx, 587.33, 0, 0.18, 'sine', 0.16);
    playTone(ctx, 587.33, 0.24, 0.18, 'sine', 0.16);
    playTone(ctx, 880.0, 0.48, 0.35, 'sine', 0.14);
  }
}
