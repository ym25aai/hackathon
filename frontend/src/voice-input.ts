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
  const button = document.createElement("button");
  button.type = "button";
  button.className = "voice-input-button";
  button.textContent = "🎙";
  button.title = "Speak instead of typing";
  button.setAttribute("aria-label", "Speak instead of typing");
  let recognition: SpeechRecognitionLike | null = null;
  let listening = false;
  const finish = () => {
    listening = false;
    button.classList.remove("voice-input-listening");
    button.textContent = "🎙";
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
    button.classList.add("voice-input-listening");
    button.textContent = "■";
    button.title = "Stop listening";
    recognition.start();
  };
  field.insertAdjacentElement("afterend", button);
}

function scan() {
  document.querySelectorAll<HTMLTextAreaElement>("textarea").forEach(attachVoiceButton);
}

if (typeof window !== "undefined") {
  scan();
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
}
