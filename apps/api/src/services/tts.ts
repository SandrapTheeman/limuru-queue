// Web Speech API type declarations for Cloudflare Workers environment
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const window: any;
declare const SpeechSynthesisUtterance: any;
declare const speechSynthesis: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface AnnouncementConfig {
  enabled: boolean;
  volume: number;
  language: 'en' | 'sw';
}

export const ANNOUNCEMENTS = {
  en: {
    called: (name: string, room: string) =>
      `Patient ${name}, please proceed to room ${room}`,
    recall: (name: string, room: string) =>
      `Patient ${name}, please proceed to room ${room}. This is your second call.`,
    emergency: (name: string) =>
      `Emergency. Patient ${name}, please proceed to the emergency department immediately.`,
    upNext: (name: string, position: number) =>
      `Next patient: ${name}. Please be ready.`,
    callComplete: (name: string) =>
      `Thank you, ${name}. Your consultation is complete.`,
    transfer: (name: string, department: string) =>
      `Patient ${name}, please proceed to ${department}.`,
    noShow: (name: string) =>
      `Patient ${name} did not respond. Moving to next patient.`,
  },
  sw: {
    called: (name: string, room: string) =>
      `Mgonjwa ${name}, tafadhali nenda kwenye chumba ${room}`,
    recall: (name: string, room: string) =>
      `Mgonjwa ${name}, tafadhali nenda kwenye chumba ${room}. Hii ni simu yako ya pili.`,
    emergency: (name: string) =>
      `Dharura. Mgonjwa ${name}, tafadhali nenda kwenye idara ya dharura mara moja.`,
    upNext: (name: string, position: number) =>
      `Mgonjwa wa baadaye: ${name}. Tafadhali kuwa tayari.`,
    callComplete: (name: string) =>
      `Asante, ${name}. Malizia yako ni kamili.`,
    transfer: (name: string, department: string) =>
      `Mgonjwa ${name}, tafadhali nenda kwenye ${department}.`,
    noShow: (name: string) =>
      `Mgonjwa ${name} hakujibu. Tuendelea na mgonjwa ifuatayo.`,
  },
};

export type AnnouncementType = 'called' | 'recall' | 'emergency' | 'upNext' | 'callComplete' | 'transfer' | 'noShow';

export function getAnnouncementText(
  type: AnnouncementType,
  name: string,
  room: string,
  lang: 'en' | 'sw' = 'en',
  extra?: { position?: number; department?: string }
): string {
  const msgs = ANNOUNCEMENTS[lang];
  switch (type) {
    case 'recall':
      return msgs.recall(name, room);
    case 'emergency':
      return msgs.emergency(name);
    case 'upNext':
      return msgs.upNext(name, extra?.position || 1);
    case 'callComplete':
      return msgs.callComplete(name);
    case 'transfer':
      return msgs.transfer(name, extra?.department || 'another department');
    case 'noShow':
      return msgs.noShow(name);
    default:
      return msgs.called(name, room);
  }
}

export interface TTSVoice {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
}

export class TTSService {
  private synth: any = null;
  private voices: any[] = [];
  private config: AnnouncementConfig;

  constructor(config: Partial<AnnouncementConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      volume: config.volume ?? 80,
      language: config.language ?? 'en',
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;

    const load = () => {
      this.voices = this.synth!.getVoices();
    };

    load();
    this.synth.addEventListener('voiceschanged', load);
  }

  async speak(text: string, options?: {
    lang?: 'en' | 'sw';
    volume?: number;
    rate?: number;
    pitch?: number;
  }): Promise<void> {
    if (!this.synth || !this.config.enabled) return;

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      const lang = options?.lang || this.config.language;
      const voice = this.findBestVoice(lang);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang === 'sw' ? 'sw-KE' : 'en-US';
      }

      utterance.volume = (options?.volume ?? this.config.volume) / 100;
      utterance.rate = options?.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? 1;

      utterance.onend = () => resolve();
      utterance.onerror = (e: any) => reject(e);

      this.synth!.speak(utterance);
    });
  }

  private findBestVoice(lang: 'en' | 'sw'): any | null {
    const langCode = lang === 'sw' ? 'sw' : 'en';

    const preferred = this.voices.find(v =>
      v.lang.toLowerCase().startsWith(langCode) && v.localService
    );
    if (preferred) return preferred;

    const anyMatch = this.voices.find(v =>
      v.lang.toLowerCase().startsWith(langCode)
    );
    return anyMatch || null;
  }

  cancel(): void {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }

  resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  isPaused(): boolean {
    return this.synth?.paused ?? false;
  }

  getVoices(): TTSVoice[] {
    return this.voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default,
    }));
  }

  setConfig(config: Partial<AnnouncementConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AnnouncementConfig {
    return { ...this.config };
  }

  async announceCall(patientName: string, room: string, lang: 'en' | 'sw' = 'en'): Promise<void> {
    const text = getAnnouncementText('called', patientName, room, lang);
    await this.speak(text, { lang });
  }

  async announceRecall(patientName: string, room: string, lang: 'en' | 'sw' = 'en'): Promise<void> {
    const text = getAnnouncementText('recall', patientName, room, lang);
    await this.speak(text, { lang });
  }

  async announceEmergency(patientName: string, lang: 'en' | 'sw' = 'en'): Promise<void> {
    const text = getAnnouncementText('emergency', patientName, '', lang);
    await this.speak(text, { lang });
  }

  async announceUpNext(patientName: string, position: number, lang: 'en' | 'sw' = 'en'): Promise<void> {
    const text = getAnnouncementText('upNext', patientName, '', lang, { position });
    await this.speak(text, { lang });
  }

  async announceTransfer(patientName: string, department: string, lang: 'en' | 'sw' = 'en'): Promise<void> {
    const text = getAnnouncementText('transfer', patientName, '', lang, { department });
    await this.speak(text, { lang });
  }
}

export function createTTSService(config?: Partial<AnnouncementConfig>): TTSService {
  return new TTSService(config);
}

export function getBrowserTTS(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
