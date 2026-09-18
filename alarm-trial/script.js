const currentTimeEl = document.getElementById('current-time');
const alarmInput = document.getElementById('alarm-time');
const toneSelect = document.getElementById('tone-select');
const setAlarmBtn = document.getElementById('set-alarm');
const snoozeAlarmBtn = document.getElementById('snooze-alarm');
const clearAlarmBtn = document.getElementById('clear-alarm');
const themeToggleBtn = document.getElementById('theme-toggle');
const snoozeSelect = document.getElementById('snooze-select');
const statusEl = document.getElementById('status');

const STORAGE_KEY = 'morning-alarm-settings';

let activeAlarm = null;
let activeAlarmAt = null;
let alarmRinging = false;
let alarmLoop = null;
let alarmStopTimer = null;
let audioContext = null;
let isDarkTheme = true;

const TONE_PRESETS = {
  classic: { freq: 880, duration: 300, gap: 500 },
  soft: { freq: 440, duration: 400, gap: 700 },
  sharp: { freq: 1200, duration: 220, gap: 350 },
};

function saveSettings() {
  const settings = {
    alarm: activeAlarm,
    alarmAt: activeAlarmAt,
    tone: toneSelect.value,
    snooze: snoozeSelect.value,
    theme: isDarkTheme ? 'dark' : 'light',
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const settings = JSON.parse(raw);
    if (settings.alarm) {
      activeAlarm = settings.alarm;
      alarmInput.value = settings.alarm;
      statusEl.textContent = `Alarm set for ${settings.alarm}`;
      statusEl.className = 'status active';
    }

    if (settings.alarmAt) {
      activeAlarmAt = Number(settings.alarmAt);
    } else if (settings.alarm) {
      const [hours, minutes] = settings.alarm.split(':').map(Number);
      const nextAlarm = new Date();
      nextAlarm.setHours(hours, minutes, 0, 0);
      if (nextAlarm <= new Date()) {
        nextAlarm.setDate(nextAlarm.getDate() + 1);
      }
      activeAlarmAt = nextAlarm.getTime();
    }

    if (settings.tone) {
      toneSelect.value = settings.tone;
    }

    if (settings.snooze) {
      snoozeSelect.value = settings.snooze;
    }

    if (settings.theme === 'light') {
      isDarkTheme = false;
      document.body.classList.add('light');
    }
  } catch (error) {
    console.warn('Could not load saved alarm settings', error);
  }
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function prepareAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch((error) => {
      console.warn('Could not enable audio playback', error);
    });
  }
}

function updateClock() {
  const now = new Date();
  currentTimeEl.textContent = formatTime(now);

  if (activeAlarm && !alarmRinging && activeAlarmAt && now.getTime() >= activeAlarmAt) {
    startAlarm();
  }
}

function startAudioTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  prepareAudio();

  const chosenTone = TONE_PRESETS[toneSelect.value] || TONE_PRESETS.classic;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = 'square';
  oscillator.frequency.value = chosenTone.freq;
  gainNode.gain.value = 0.05;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.start();

  setTimeout(() => {
    oscillator.stop();
    gainNode.disconnect();
  }, chosenTone.duration);
}

function stopAlarmLoop() {
  if (alarmLoop) {
    clearInterval(alarmLoop);
    alarmLoop = null;
  }
}

function clearAlarmStopTimer() {
  if (alarmStopTimer) {
    clearTimeout(alarmStopTimer);
    alarmStopTimer = null;
  }
}

function stopAlarm() {
  alarmRinging = false;
  stopAlarmLoop();
  clearAlarmStopTimer();
  activeAlarm = null;
  activeAlarmAt = null;
  alarmInput.value = '';
  statusEl.textContent = 'No alarm set';
  statusEl.className = 'status idle';
  saveSettings();
}

function startAlarm() {
  alarmRinging = true;
  statusEl.textContent = 'Alarm ringing!';
  statusEl.className = 'status ringing';

  const chosenTone = TONE_PRESETS[toneSelect.value] || TONE_PRESETS.classic;
  startAudioTone();
  alarmLoop = setInterval(() => {
    startAudioTone();
  }, chosenTone.gap);

  clearAlarmStopTimer();
  alarmStopTimer = setTimeout(() => {
    stopAlarm();
  }, 15000);
}

function setAlarm() {
  const selectedTime = alarmInput.value;

  if (!selectedTime) {
    statusEl.textContent = 'Please choose a time';
    statusEl.className = 'status idle';
    return;
  }

  const now = new Date();
  const [hours, minutes] = selectedTime.split(':').map(Number);
  const alarmDate = new Date(now);
  alarmDate.setHours(hours, minutes, 0, 0);

  if (alarmDate <= now) {
    alarmDate.setDate(alarmDate.getDate() + 1);
  }

  prepareAudio();
  activeAlarm = selectedTime;
  activeAlarmAt = alarmDate.getTime();
  alarmRinging = false;
  stopAlarmLoop();
  clearAlarmStopTimer();
  statusEl.textContent = `Alarm set for ${selectedTime}`;
  statusEl.className = 'status active';
  saveSettings();
}

function clearAlarm() {
  activeAlarm = null;
  activeAlarmAt = null;
  alarmRinging = false;
  stopAlarmLoop();
  clearAlarmStopTimer();
  statusEl.textContent = 'No alarm set';
  statusEl.className = 'status idle';
  alarmInput.value = '';
  saveSettings();
}

function snoozeAlarm() {
  if (!activeAlarm && !alarmRinging) {
    statusEl.textContent = 'No active alarm to snooze';
    statusEl.className = 'status idle';
    return;
  }

  stopAlarmLoop();
  clearAlarmStopTimer();
  alarmRinging = false;

  const now = new Date();
  const snoozeSeconds = Number(snoozeSelect.value) || 30;
  now.setSeconds(now.getSeconds() + snoozeSeconds);
  activeAlarmAt = now.getTime();
  activeAlarm = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
  ].join(':');

  alarmInput.value = activeAlarm;
  statusEl.textContent = `Snoozed until ${activeAlarm}`;
  statusEl.className = 'status active';
  saveSettings();
}

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light', !isDarkTheme);
  statusEl.style.color = isDarkTheme ? '#e2e8f0' : '#0f172a';
  saveSettings();
}

setAlarmBtn.addEventListener('click', setAlarm);
snoozeAlarmBtn.addEventListener('click', snoozeAlarm);
clearAlarmBtn.addEventListener('click', clearAlarm);
themeToggleBtn.addEventListener('click', toggleTheme);
toneSelect.addEventListener('change', saveSettings);
snoozeSelect.addEventListener('change', saveSettings);

loadSettings();
updateClock();
setInterval(updateClock, 1000);
