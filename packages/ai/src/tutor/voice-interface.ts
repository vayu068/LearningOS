/**
 * Voice Interface Abstraction
 *
 * Speech-to-text and text-to-speech integration points for vernacular AI tutors.
 * Provides language detection and voice interaction support.
 */

import type { SupportedLanguage } from "../types";

/**
 * Speech-to-text provider interface.
 */
export interface SpeechToTextProvider {
  /**
   * Convert audio to text.
   */
  transcribe(params: TranscriptionParams): Promise<TranscriptionResult>;

  /**
   * Detect the language from audio.
   */
  detectLanguage(audio: AudioInput): Promise<LanguageDetectionResult>;

  /**
   * Check if the provider supports a given language.
   */
  supportsLanguage(language: SupportedLanguage): boolean;
}

/**
 * Text-to-speech provider interface.
 */
export interface TextToSpeechProvider {
  /**
   * Convert text to audio.
   */
  synthesize(params: SynthesisParams): Promise<SynthesisResult>;

  /**
   * Get available voices for a language.
   */
  getVoices(language: SupportedLanguage): Promise<VoiceOption[]>;

  /**
   * Check if the provider supports a given language.
   */
  supportsLanguage(language: SupportedLanguage): boolean;
}

// ==================== Input/Output Types ====================

export interface AudioInput {
  data: Buffer | Uint8Array;
  format: "wav" | "mp3" | "ogg" | "webm" | "flac";
  sampleRate?: number;
  channels?: number;
}

export interface TranscriptionParams {
  audio: AudioInput;
  language?: SupportedLanguage;
  enablePunctuation?: boolean;
  enableWordTimestamps?: boolean;
  vocabulary?: string[];
}

export interface TranscriptionResult {
  text: string;
  language: SupportedLanguage;
  confidence: number;
  words?: TranscriptionWord[];
  duration: number;
}

export interface TranscriptionWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface SynthesisParams {
  text: string;
  language: SupportedLanguage;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  outputFormat?: "wav" | "mp3" | "ogg";
}

export interface SynthesisResult {
  audio: Buffer | Uint8Array;
  format: "wav" | "mp3" | "ogg";
  duration: number;
  sampleRate: number;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: SupportedLanguage;
  gender: "male" | "female" | "neutral";
  style?: string;
}

export interface LanguageDetectionResult {
  language: SupportedLanguage;
  confidence: number;
  alternatives: Array<{ language: SupportedLanguage; confidence: number }>;
}

// ==================== Voice Interface Service ====================

export interface VoiceInterfaceConfig {
  defaultLanguage: SupportedLanguage;
  defaultOutputFormat: "wav" | "mp3" | "ogg";
  enableAutoLanguageDetection: boolean;
  maxAudioDurationSeconds: number;
}

const DEFAULT_VOICE_CONFIG: VoiceInterfaceConfig = {
  defaultLanguage: "en",
  defaultOutputFormat: "mp3",
  enableAutoLanguageDetection: true,
  maxAudioDurationSeconds: 120,
};

/**
 * Voice interface service that coordinates STT and TTS for tutoring sessions.
 */
export class VoiceInterface {
  private sttProvider: SpeechToTextProvider | null;
  private ttsProvider: TextToSpeechProvider | null;
  private config: VoiceInterfaceConfig;

  constructor(
    sttProvider?: SpeechToTextProvider,
    ttsProvider?: TextToSpeechProvider,
    config?: Partial<VoiceInterfaceConfig>
  ) {
    this.sttProvider = sttProvider || null;
    this.ttsProvider = ttsProvider || null;
    this.config = { ...DEFAULT_VOICE_CONFIG, ...config };
  }

  /**
   * Process voice input: transcribe audio to text.
   */
  async processVoiceInput(
    audio: AudioInput,
    expectedLanguage?: SupportedLanguage
  ): Promise<TranscriptionResult> {
    if (!this.sttProvider) {
      throw new Error("Speech-to-text provider not configured");
    }

    let language = expectedLanguage || this.config.defaultLanguage;

    // Auto-detect language if enabled
    if (this.config.enableAutoLanguageDetection && !expectedLanguage) {
      try {
        const detection = await this.sttProvider.detectLanguage(audio);
        if (detection.confidence > 0.7) {
          language = detection.language;
        }
      } catch {
        // Use default language on detection failure
      }
    }

    return this.sttProvider.transcribe({
      audio,
      language,
      enablePunctuation: true,
    });
  }

  /**
   * Generate voice output: convert text to speech.
   */
  async generateVoiceOutput(
    text: string,
    language: SupportedLanguage,
    voiceId?: string
  ): Promise<SynthesisResult> {
    if (!this.ttsProvider) {
      throw new Error("Text-to-speech provider not configured");
    }

    return this.ttsProvider.synthesize({
      text,
      language,
      voiceId,
      outputFormat: this.config.defaultOutputFormat,
    });
  }

  /**
   * Get available voices for a language.
   */
  async getAvailableVoices(language: SupportedLanguage): Promise<VoiceOption[]> {
    if (!this.ttsProvider) {
      return [];
    }
    return this.ttsProvider.getVoices(language);
  }

  /**
   * Check if voice is supported for a language.
   */
  isLanguageSupported(language: SupportedLanguage): {
    stt: boolean;
    tts: boolean;
  } {
    return {
      stt: this.sttProvider?.supportsLanguage(language) || false,
      tts: this.ttsProvider?.supportsLanguage(language) || false,
    };
  }

  /**
   * Check if voice interface is available.
   */
  isAvailable(): { stt: boolean; tts: boolean } {
    return {
      stt: this.sttProvider != null,
      tts: this.ttsProvider != null,
    };
  }
}
