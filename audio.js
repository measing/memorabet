const SOUND_ENABLED_KEY = 'memorabetSoundEnabled';
const MUSIC_ENABLED_KEY = 'memorabetMusicEnabled';

let audioCtx;
let masterGain;
let musicGain;
let musicTimer = null;

function getCtx(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.06;
    musicGain.connect(masterGain);
  }
  return audioCtx;
}

function isEnabled(key, fallback = true){
  const saved = localStorage.getItem(key);
  return saved === null ? fallback : saved === 'true';
}

function setEnabled(key, value){
  localStorage.setItem(key, String(value));
}

export function isSoundEnabled(){
  return isEnabled(SOUND_ENABLED_KEY, true);
}

export function isMusicEnabled(){
  return isEnabled(MUSIC_ENABLED_KEY, false);
}

export async function unlockAudio(){
  const ctx = getCtx();
  if(ctx.state === 'suspended') await ctx.resume();
}

function tone({ freq, duration, type = 'sine', volume = 0.16, delay = 0, destination = null }){
  if(!isSoundEnabled()) return;
  const ctx = getCtx();
  const output = destination || masterGain;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(output);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function noise({ duration = 0.08, volume = 0.08, delay = 0 } = {}){
  if(!isSoundEnabled()) return;
  const ctx = getCtx();
  const start = ctx.currentTime + delay;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(start);
}

export function playCardFlip(){
  tone({ freq:430, duration:0.055, type:'triangle', volume:0.11 });
  tone({ freq:680, duration:0.075, type:'triangle', volume:0.08, delay:0.035 });
}

export function playShuffle(){
  noise({ duration:0.07, volume:0.065 });
  tone({ freq:210 + Math.random() * 90, duration:0.05, type:'sawtooth', volume:0.035 });
}

export function playMatch(){
  tone({ freq:520, duration:0.09, type:'sine', volume:0.13 });
  tone({ freq:700, duration:0.10, type:'sine', volume:0.12, delay:0.075 });
  tone({ freq:940, duration:0.14, type:'triangle', volume:0.12, delay:0.16 });
}

export function playMiss(){
  tone({ freq:190, duration:0.16, type:'sawtooth', volume:0.11 });
  tone({ freq:135, duration:0.18, type:'sawtooth', volume:0.09, delay:0.12 });
}

function playMusicPulse(){
  if(!isMusicEnabled() || !isSoundEnabled()) return;
  tone({ freq:110, duration:0.38, type:'sine', volume:0.035, destination:musicGain });
  tone({ freq:220, duration:0.22, type:'triangle', volume:0.025, delay:0.18, destination:musicGain });
}

function startMusic(){
  stopMusic();
  if(!isMusicEnabled()) return;
  playMusicPulse();
  musicTimer = setInterval(playMusicPulse, 1800);
}

function stopMusic(){
  if(musicTimer){
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function updateSoundButtons(){
  const musicBtn = document.getElementById('btn-music');
  const soundBtn = document.getElementById('btn-sound');
  const soundOn = isSoundEnabled();
  const musicOn = isMusicEnabled();

  if(soundBtn){
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.classList.toggle('active', soundOn);
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  }
  if(musicBtn){
    musicBtn.textContent = musicOn ? '♫' : '♩';
    musicBtn.classList.toggle('active', musicOn);
    musicBtn.setAttribute('aria-pressed', String(musicOn));
  }
}

export function initAudioControls(){
  updateSoundButtons();

  document.addEventListener('pointerdown', unlockAudio, { once:true });
  document.addEventListener('keydown', unlockAudio, { once:true });

  document.getElementById('btn-sound')?.addEventListener('click', async () => {
    await unlockAudio();
    setEnabled(SOUND_ENABLED_KEY, !isSoundEnabled());
    if(!isSoundEnabled()) stopMusic();
    else if(isMusicEnabled()) startMusic();
    updateSoundButtons();
  });

  document.getElementById('btn-music')?.addEventListener('click', async () => {
    await unlockAudio();
    setEnabled(MUSIC_ENABLED_KEY, !isMusicEnabled());
    if(isMusicEnabled()) startMusic();
    else stopMusic();
    updateSoundButtons();
  });

  if(isMusicEnabled()) startMusic();
}
