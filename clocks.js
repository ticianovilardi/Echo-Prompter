let timer;
let isPaused = false;
let remainingSeconds = 0;

const startTimerButton = document.getElementById('start-timer');
const pauseTimerButton = document.getElementById('pause-timer');
const stopTimerButton = document.getElementById('stop-timer');

if (startTimerButton) {
  startTimerButton.addEventListener('click', function() {
    if (isPaused) {
      isPaused = false;
      this.style.display = 'none';
      if (pauseTimerButton) pauseTimerButton.style.display = 'inline';
      startTimer(remainingSeconds);
      return;
    }
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    const minutes = minutesInput ? parseInt(minutesInput.value) || 0 : 0;
    const seconds = secondsInput ? parseInt(secondsInput.value) || 0 : 0;
    remainingSeconds = minutes * 60 + seconds;
    startTimer(remainingSeconds);
  });
}

if (pauseTimerButton) {
  pauseTimerButton.addEventListener('click', function() {
    isPaused = true;
    this.style.display = 'none';
    if (startTimerButton) startTimerButton.style.display = 'inline';
    clearInterval(timer);
  });
}

if (stopTimerButton) {
  stopTimerButton.addEventListener('click', function() {
    clearInterval(timer);
    resetTimer();
  });
}

function startTimer(seconds) {
  clearInterval(timer);
  remainingSeconds = seconds;

  if (startTimerButton) startTimerButton.style.display = 'none';
  if (pauseTimerButton) pauseTimerButton.style.display = 'inline';
  if (stopTimerButton) stopTimerButton.style.display = 'inline';

  timer = setInterval(function() {
    if (remainingSeconds <= 0) {
      clearInterval(timer);
      resetTimer();
      if (window.prompter && typeof window.prompter.addMessage === 'function')
        window.prompter.addMessage('info', 'El temporizador llegó a cero.');
      return;
    }

    const minutes = parseInt(remainingSeconds / 60, 10);
    const seconds = parseInt(remainingSeconds % 60, 10);
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay)
      timeDisplay.textContent = formatTime(minutes) + ':' + formatTime(seconds);
    remainingSeconds -= 1;
  }, 1000);
}

function resetTimer() {
  const timeDisplay = document.getElementById('time-display');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  if (timeDisplay) timeDisplay.textContent = '00:00';
  if (minutesInput) minutesInput.value = '';
  if (secondsInput) secondsInput.value = '';
  if (startTimerButton) startTimerButton.style.display = 'inline';
  if (pauseTimerButton) pauseTimerButton.style.display = 'none';
  if (stopTimerButton) stopTimerButton.style.display = 'none';
  isPaused = false;
  remainingSeconds = 0;
}

function formatTime(time) {
  return time < 10 ? '0' + time : time;
}

let stopwatchInterval;
let stopwatchElapsed = 0;
let stopwatchRunning = false;

function formatStopwatch(milliseconds) {
  let hours = Math.floor(milliseconds / 3600000);
  milliseconds %= 3600000;
  let minutes = Math.floor(milliseconds / 60000);
  milliseconds %= 60000;
  let seconds = Math.floor(milliseconds / 1000);
  milliseconds %= 1000;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

function pad(number, length) {
  return ('000' + number).slice(-length);
}

function updateStopwatchDisplay() {
  const stopwatchDisplay = document.getElementById('stopwatch-display');
  if (stopwatchDisplay)
    stopwatchDisplay.textContent = formatStopwatch(stopwatchElapsed);
}

function startStopwatch() {
  clearInterval(stopwatchInterval);
  const startTime = Date.now() - stopwatchElapsed;
  stopwatchInterval = setInterval(() => {
    stopwatchElapsed = Date.now() - startTime;
    updateStopwatchDisplay();
  }, 1);
  stopwatchRunning = true;
}

function pauseStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchRunning = false;
}

function resetStopwatch() {
  clearInterval(stopwatchInterval);
  stopwatchElapsed = 0;
  updateStopwatchDisplay();
  stopwatchRunning = false;
}
