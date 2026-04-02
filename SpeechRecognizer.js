const BrowserSpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

class WebSpeechRecognizer {
  constructor(eventListener = () => {}, lang = 'en-US') {
    this.eventListener = eventListener;
    this.oldResults = [];
    this.reset(lang);
  }

  reset(lang = 'en-US') {
    this.lang = lang;
    this.working = false;
    this.listening = false;
    this.error = 'none';
    try { this.recognition.stop(); } catch (e) {}
    this.confirmedTranscript = '';
    this.sessionFinal = '';
    this.currentFinal = '';
    this.currentInterim = '';
    this.currentResult = '';
    try {
      if (BrowserSpeechRecognition === null)
        throw new Error('Speech recognition API unavailable');
      this.recognition = new BrowserSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = lang;
      this.recognition.addEventListener('start', evt => this.startListener(evt));
      this.recognition.addEventListener('end', evt => this.endListener(evt));
      this.recognition.addEventListener('result', evt => this.resultListener(evt));
      this.recognition.addEventListener('error', evt => this.errorListener(evt));
      this.working = true;
    } catch (e) {
      this.error = 'API not available';
      this.eventListener('error', this.error, 'The Web Speech API is not available in your browser. Use Chrome or Edge.');
    }
  }

  start() {
    if (!this.working)
      return;
    try {
      this.recognition.start();
    } catch (e) {
      if (`${e}`.includes('recognition has already started'))
        return;
      this.error = 'API not working';
      this.eventListener('error', this.error, 'The Web Speech API in your browser is not working. Use Chrome or Edge.');
    }
  }

  stop() {
    if (!this.working)
      return;
    try {
      this.recognition.stop();
    } catch (e) {
      this.working = false;
      this.listening = false;
      this.error = 'API not working';
      this.eventListener('error', this.error, 'The Web Speech API in your browser is not working. Use Chrome.');
    }
  }

  startListener(evt) {
    if (!this.working)
      return;
    this.listening = true;
    this.sessionFinal = '';
    this.currentInterim = '';
    this.currentFinal = this.confirmedTranscript;
    this.currentResult = this.currentFinal;
    this.eventListener('start', 'recognition start');
  }

  endListener(evt) {
    if (!this.working)
      return;
    this.listening = false;
    this.confirmedTranscript = this.currentFinal.trim();
    this.eventListener('end', 'recognition end');
  }

  resultListener(evt) {
    if (!this.working)
      return;
    if (typeof evt.results === 'undefined') {
      this.working = false;
      this.listening = false;
      try { this.recognition.stop(); } catch (e) {}
      this.error = 'API not working';
      this.eventListener('error', this.error, 'The Web Speech API in your browser is not working. Use Chrome.');
      return;
    }
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = 0; i < evt.results.length; ++i) {
      if (evt.results[i].isFinal)
        finalTranscript += evt.results[i][0].transcript;
      else
        interimTranscript += evt.results[i][0].transcript;
    }
    this.sessionFinal = finalTranscript.trim();
    this.currentFinal = mergeTranscriptWindows(this.confirmedTranscript, this.sessionFinal);
    this.currentInterim = interimTranscript.trim();
    this.currentResult = `${this.currentFinal} ${this.currentInterim}`.trim();
    this.eventListener('result', this.currentFinal, this.currentInterim);
  }

  errorListener(evt) {
    if (!this.working)
      return;
    if (evt.error == 'no-speech') {
      this.error = 'no speech detected';
      this.listening = false;
      this.eventListener('status', this.error, 'No speech detected yet. Keep speaking or check your microphone input.');
    }
    if (evt.error == 'audio-capture') {
      this.error = 'no microphone found';
      this.working = false;
      this.listening = false;
      try { this.recognition.stop(); } catch (e) {}
      this.eventListener('error', this.error, 'No microphone found. Check your settings.');
    }
    if (evt.error == 'not-allowed') {
      this.error = 'no microphone permission';
      this.working = false;
      this.listening = false;
      try { this.recognition.stop(); } catch (e) {}
      this.eventListener('error', this.error, 'You denied the permission for microphone access.');
    }
    if (evt.error == 'aborted') {
      this.error = 'recognition aborted';
      this.listening = false;
      this.eventListener('status', this.error, 'Recognition restarted.');
    }
    if (evt.error == 'network') {
      this.error = 'network error';
      this.listening = false;
      this.eventListener('error', this.error, 'Speech recognition had a network error. Check connectivity and try again.');
    }
    if (evt.error == 'service-not-allowed') {
      this.error = 'service not allowed';
      this.working = false;
      this.listening = false;
      this.eventListener('error', this.error, 'Speech recognition service is blocked in this browser profile.');
    }
  }
}

function createSpeechRecognizer(type, eventListener, lang) {
  return new WebSpeechRecognizer(eventListener, lang);
}

function mergeTranscriptWindows(existingTranscript, incomingTranscript) {
  const existingWords = tokenizeTranscript(existingTranscript);
  const incomingWords = tokenizeTranscript(incomingTranscript);
  if (incomingWords.length === 0)
    return existingTranscript.trim();
  if (existingWords.length === 0)
    return incomingWords.join(' ');
  const maxOverlap = Math.min(existingWords.length, incomingWords.length, 12);
  let bestOverlap = 0;
  for (let overlap = maxOverlap; overlap >= 1; overlap--) {
    let matches = true;
    for (let i = 0; i < overlap; i++) {
      if (simplify(existingWords[existingWords.length - overlap + i]) !== simplify(incomingWords[i])) {
        matches = false;
        break;
      }
    }
    if (matches) {
      bestOverlap = overlap;
      break;
    }
  }
  const mergedWords = existingWords.concat(incomingWords.slice(bestOverlap));
  return mergedWords.join(' ').trim();
}

function tokenizeTranscript(text) {
  return `${text || ''}`.trim().split(/\s+/).filter(Boolean);
}
