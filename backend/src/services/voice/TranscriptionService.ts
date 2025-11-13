/**
 * Advanced Transcription Service
 * Supports Whisper-1 and GPT-4o Transcribe with speaker diarization
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { PhoenixService } from '../observability/PhoenixService';

export interface TranscriptionOptions {
  model?: 'whisper-1' | 'gpt-4o-transcribe' | 'gpt-4o-transcribe-diarize';
  language?: string;
  prompt?: string;
  temperature?: number;
  timestamp_granularities?: ('word' | 'segment')[];
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  speaker?: string; // For diarization
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  speaker?: string; // For diarization
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
  speakers?: {
    speaker_id: string;
    segments: number[];
    total_duration: number;
  }[];
}

export class TranscriptionService {
  private openai: OpenAI | null = null;
  private phoenixService: PhoenixService;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      logger.info('Transcription Service initialized with OpenAI');
    } else {
      logger.warn('OpenAI API key not configured - Transcription will not work');
    }
    
    this.phoenixService = new PhoenixService();
  }

  /**
   * Transcribe audio with standard Whisper
   */
  async transcribeAudio(
    audioFile: File | Blob,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options.model || 'whisper-1';

    return this.phoenixService.wrapLLMCall(
      {
        operation: 'audio_transcription',
        provider: 'openai',
        model,
        metadata: {
          language: options.language,
          response_format: options.response_format || 'verbose_json',
          has_timestamps: options.timestamp_granularities?.length ? true : false
        }
      },
      async () => {
        const transcription = await this.openai!.audio.transcriptions.create({
          file: audioFile as any,
          model,
          language: options.language,
          prompt: options.prompt,
          temperature: options.temperature,
          timestamp_granularities: options.timestamp_granularities,
          response_format: options.response_format || 'verbose_json'
        } as any);

        return this.parseTranscriptionResponse(transcription, model);
      }
    );
  }

  /**
   * Transcribe audio with speaker diarization (GPT-4o Transcribe Diarize)
   */
  async transcribeWithDiarization(
    audioFile: File | Blob,
    options: Omit<TranscriptionOptions, 'model'> = {}
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const model = 'gpt-4o-transcribe-diarize';

    return this.phoenixService.wrapLLMCall(
      {
        operation: 'audio_transcription_diarization',
        provider: 'openai',
        model,
        metadata: {
          language: options.language,
          has_speaker_detection: true
        }
      },
      async () => {
        // GPT-4o transcribe with diarization
        const transcription = await this.openai!.audio.transcriptions.create({
          file: audioFile as any,
          model,
          language: options.language,
          prompt: options.prompt,
          temperature: options.temperature,
          timestamp_granularities: options.timestamp_granularities || ['word', 'segment'],
          response_format: 'verbose_json'
        } as any);

        return this.parseTranscriptionResponse(transcription, model);
      }
    );
  }

  /**
   * Transcribe audio from base64 string
   */
  async transcribeBase64Audio(
    base64Audio: string,
    filename: string,
    mimeType: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Convert base64 to Blob
    const audioBuffer = Buffer.from(base64Audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    
    // Create File object
    const audioFile = new File([audioBlob], filename, { type: mimeType });

    // Use diarization if model supports it
    if (options.model === 'gpt-4o-transcribe-diarize') {
      return this.transcribeWithDiarization(audioFile, options);
    }

    return this.transcribeAudio(audioFile, options);
  }

  /**
   * Real-time transcription streaming (for live audio)
   */
  async transcribeStream(
    audioChunks: AsyncIterable<Buffer>,
    options: TranscriptionOptions = {}
  ): Promise<AsyncIterable<string>> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options.model || 'gpt-4o-transcribe';

    // Collect chunks into a single buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioChunks) {
      chunks.push(chunk);
    }

    const audioBuffer = Buffer.concat(chunks);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'stream.webm', { type: 'audio/webm' });

    const result = await this.transcribeAudio(audioFile, {
      ...options,
      response_format: 'text'
    });

    // Return as async iterable
    async function* generate() {
      yield result.text;
    }

    return generate();
  }

  /**
   * Parse transcription response based on model capabilities
   */
  private parseTranscriptionResponse(response: any, model: string): TranscriptionResult {
    const result: TranscriptionResult = {
      text: response.text || ''
    };

    // Handle verbose JSON response
    if (typeof response === 'object' && response.text) {
      result.language = response.language;
      result.duration = response.duration;
      
      // Add segments if available
      if (response.segments) {
        result.segments = response.segments;
      }

      // Add word-level timestamps if available
      if (response.words) {
        result.words = response.words;
      }

      // Parse speaker information for diarization models
      if (model.includes('diarize') && response.segments) {
        result.speakers = this.extractSpeakerInfo(response.segments);
      }
    }

    return result;
  }

  /**
   * Extract speaker information from diarized segments
   */
  private extractSpeakerInfo(segments: TranscriptionSegment[]): {
    speaker_id: string;
    segments: number[];
    total_duration: number;
  }[] {
    const speakerMap = new Map<string, {
      segments: number[];
      total_duration: number;
    }>();

    segments.forEach((segment, index) => {
      const speakerId = segment.speaker || 'unknown';
      
      if (!speakerMap.has(speakerId)) {
        speakerMap.set(speakerId, {
          segments: [],
          total_duration: 0
        });
      }

      const speakerData = speakerMap.get(speakerId)!;
      speakerData.segments.push(index);
      speakerData.total_duration += (segment.end - segment.start);
    });

    return Array.from(speakerMap.entries()).map(([speaker_id, data]) => ({
      speaker_id,
      ...data
    }));
  }

  /**
   * Get transcript summary with speaker attribution
   */
  async getSpeakerSummary(transcription: TranscriptionResult): Promise<string> {
    if (!transcription.speakers || transcription.speakers.length === 0) {
      return transcription.text;
    }

    let summary = `Transcript with ${transcription.speakers.length} speakers:\n\n`;

    transcription.speakers.forEach(speaker => {
      const duration = Math.round(speaker.total_duration);
      summary += `${speaker.speaker_id} (${duration}s, ${speaker.segments.length} segments)\n`;
    });

    summary += `\n---\n\n${transcription.text}`;

    return summary;
  }

  /**
   * Format transcription as subtitles (SRT format)
   */
  formatAsSRT(transcription: TranscriptionResult): string {
    if (!transcription.segments || transcription.segments.length === 0) {
      return transcription.text;
    }

    return transcription.segments.map((segment, index) => {
      const startTime = this.formatSRTTime(segment.start);
      const endTime = this.formatSRTTime(segment.end);
      const speaker = segment.speaker ? `[${segment.speaker}] ` : '';
      
      return `${index + 1}\n${startTime} --> ${endTime}\n${speaker}${segment.text}\n`;
    }).join('\n');
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }
}
