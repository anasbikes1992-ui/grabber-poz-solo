/**
 * GRABBER BUSINESS OS — VOICE ASSISTANT ENGINE (Web Speech Recognition & Synthesis)
 * Allows hands-free operation for cashiers, stock managers, and business owners.
 */

export interface VoiceRecognitionOptions {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  lang?: string;
  continuous?: boolean;
}

export class VoiceAssistant {
  private static recognition: any = null;
  private static isListening: boolean = false;

  /**
   * Checks whether the current browser supports Speech Recognition.
   */
  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  /**
   * Starts listening for voice commands from the user microphone.
   */
  public static startListening(options: VoiceRecognitionOptions): boolean {
    if (!this.isSupported()) {
      options.onError?.('Speech recognition is not supported in this browser.');
      return false;
    }

    try {
      this.stopListening();

      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();

      recognition.continuous = options.continuous ?? false;
      recognition.interimResults = true;
      recognition.lang = options.lang || 'en-US';

      recognition.onstart = () => {
        this.isListening = true;
        options.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        options.onResult(currentText.trim(), Boolean(finalTranscript));
      };

      recognition.onerror = (event: any) => {
        options.onError?.(event.error || 'Speech recognition error');
      };

      recognition.onend = () => {
        this.isListening = false;
        options.onEnd?.();
      };

      this.recognition = recognition;
      recognition.start();
      return true;
    } catch (err: unknown) {
      options.onError?.((err as Error).message || 'Failed to start microphone');
      return false;
    }
  }

  /**
   * Stops listening.
   */
  public static stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition = null;
    }
    this.isListening = false;
  }

  /**
   * Speaks a message aloud using Web Speech Synthesis (TTS).
   */
  public static speak(text: string, lang = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        resolve();
        return;
      }

      try {
        window.speechSynthesis.cancel(); // Stop any pending speech
        const cleanText = text
          .replace(/LKR/g, 'Sri Lankan Rupees')
          .replace(/[•*#`]/g, ' ')
          .slice(0, 300); // Keep voice brief

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = 1.05;
        utterance.pitch = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Cancels any active speech playback.
   */
  public static stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}
