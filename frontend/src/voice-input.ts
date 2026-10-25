type SpeechResult = { 0: { transcript: string } };
type SpeechEvent = { results: ArrayLike<SpeechResult>; resultIndex: number };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };

const recognitionFactory = () => {
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
};

const language = () => {
  const value = document.documentElement.lang;
  if (value === "zh-CN" || value === "zh-TW" || value === "ja" || value === "es") return value;
  return "en-US";
};

function attachVoiceButton(field: HTMLTextAreaElement) {
  if (field.dataset.voiceReady === "true") return;
  field.dataset.voiceReady = "true";
  const factory = recognitionFactory();
  if (!factory) return;
  const controls = document.createElement("span");
  controls.className = "voice-input-controls";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "voice-input-button";
  button.textContent = "MIC";
  button.title = "Speak instead of typing";
  button.setAttribute("aria-label", "Speak instead of typing");
  const wave = document.createElement("span");
  wave.className = "voice-input-wave";
  wave.setAttribute("aria-hidden", "true");
  wave.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
  controls.append(button, wave);
  let recognition: SpeechRecognitionLike | null = null;
  let listening = false;
  const finish = () => {
    listening = false;
    controls.classList.remove("voice-input-active");
    button.classList.remove("voice-input-listening");
    button.textContent = "MIC";
    button.title = "Speak instead of typing";
  };
  button.onclick = () => {
    if (listening) {
      recognition?.stop();
      finish();
      return;
    }
    recognition = new factory();
    recognition.lang = language();
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: event.results.length - event.resultIndex }, (_, index) => event.results[event.resultIndex + index][0].transcript).join(" ").trim();
      if (!transcript) return;
      const prefix = field.value.trim();
      field.value = prefix ? `${prefix} ${transcript}` : transcript;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    };
    recognition.onend = finish;
    recognition.onerror = finish;
    listening = true;
    controls.classList.add("voice-input-active");
    button.classList.add("voice-input-listening");
    button.textContent = "STOP";
    button.title = "Stop listening";
    recognition.start();
  };
  field.insertAdjacentElement("afterend", controls);
}

function scan() {
  document.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(attachVoiceButton);
}

if (typeof window !== "undefined") {
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
