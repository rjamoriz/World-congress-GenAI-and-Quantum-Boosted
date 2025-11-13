/**
 * Voice Chat routes - OpenAI Realtime API proxy
 * Supports GPT-4o Realtime, GPT-5 Realtime, and advanced transcription
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { EventAssistantService } from '../services/ai/EventAssistantService';
import { PhoenixService } from '../services/observability/PhoenixService';
import { RealtimeVoiceService } from '../services/voice/RealtimeVoiceService';
import { TranscriptionService } from '../services/voice/TranscriptionService';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const eventAssistant = new EventAssistantService();
const phoenixService = new PhoenixService();
const realtimeService = new RealtimeVoiceService();
const transcriptionService = new TranscriptionService();

// WebSocket proxy for OpenAI Realtime API
router.get('/realtime', asyncHandler(async (req: Request, res: Response) => {
  // Upgrade HTTP to WebSocket
  if (req.headers.upgrade !== 'websocket') {
    return res.status(400).json({ error: 'Expected WebSocket upgrade' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  // Return WebSocket endpoint info (actual upgrade handled by WebSocket server)
  return res.json({
    message: 'WebSocket endpoint ready',
    endpoint: '/api/voice/realtime',
    models: [
      'gpt-4o-realtime-preview-2024-12-17',
      'gpt-4o-realtime-preview-2024-10-01',
      'gpt-realtime-2025-08-28',
      'gpt-realtime-mini-2025-10-06'
    ],
    instructions: 'Use WebSocket connection to connect to OpenAI Realtime API with model parameter'
  });
}));

// Advanced transcription with speaker diarization
router.post('/transcribe-advanced', asyncHandler(async (req: Request, res: Response) => {
  const { audio, model = 'gpt-4o-transcribe-diarize', language = 'en', session_id } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  try {
    logger.info('Advanced transcription request', { model, language, session_id });

    const result = await transcriptionService.transcribeBase64Audio(
      audio,
      'audio.webm',
      'audio/webm',
      {
        model: model as any,
        language,
        timestamp_granularities: ['word', 'segment']
      }
    );

    // Get speaker summary if diarization was used
    const summary = model.includes('diarize') 
      ? await transcriptionService.getSpeakerSummary(result)
      : result.text;

    return res.json({
      success: true,
      data: {
        transcription: result,
        summary,
        srt: transcriptionService.formatAsSRT(result),
        speakers: result.speakers || [],
        model_used: model
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Advanced transcription error:', error);
    return res.status(500).json({ 
      error: 'Transcription failed', 
      details: error.message 
    });
  }
}));

// Text-to-speech endpoint with Phoenix tracing
router.post('/tts', asyncHandler(async (req: Request, res: Response) => {
  const { text, voice = 'alloy', model = 'tts-1-hd', session_id } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Wrap TTS call with Phoenix tracing
    const audioBuffer = await phoenixService.wrapLLMCall(
      {
        operation: 'text_to_speech',
        provider: 'openai',
        model,
        userId: 'voice_user',
        sessionId: session_id || 'voice_session',
        metadata: {
          voice,
          text_length: text.length,
          response_format: 'mp3'
        }
      },
      async () => {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: text,
            voice,
            response_format: 'mp3'
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        return await response.arrayBuffer();
      }
    );
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
    });
    
    return res.send(Buffer.from(audioBuffer));

  } catch (error: any) {
    logger.error('TTS error:', error);
    return res.status(500).json({ error: 'Text-to-speech failed', details: error.message });
  }
}));

// Speech-to-text endpoint
router.post('/stt', asyncHandler(async (req: Request, res: Response) => {
  const { audio, model = 'whisper-1' } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  try {
    const formData = new FormData();
    
    // Convert base64 audio to blob
    const audioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', model);
    formData.append('language', 'en');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return res.json(result);

  } catch (error: any) {
    logger.error('STT error:', error);
    return res.status(500).json({ error: 'Speech-to-text failed', details: error.message });
  }
}));

// Chat completion with function calling
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { messages, functions, model = 'gpt-5.1-chat-latest' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant for the World Congress Agenda Manager. 
      Help users with meeting scheduling, quantum optimization, and event management.
      Be concise and helpful. You can:
      - Schedule meetings
      - Run quantum optimizations  
      - Manage hosts and requests
      - Provide system status
      - Answer questions about the platform
      
      Current capabilities:
      - Classical scheduling (fast, deterministic)
      - Quantum-inspired scheduling (simulated annealing)
      - Real quantum scheduling (IBM Qiskit AER)
      - Voice interaction and commands
      - Real-time optimization feedback`
    };

    const requestBody: any = {
      model,
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000
    };

    if (functions && functions.length > 0) {
      requestBody.functions = functions;
      requestBody.function_call = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return res.json(result);

  } catch (error: any) {
    logger.error('Chat completion error:', error);
    return res.status(500).json({ error: 'Chat completion failed', details: error.message });
  }
}));

// Voice command processor
router.post('/command', asyncHandler(async (req: Request, res: Response) => {
  const { command, context } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  logger.info(`Processing voice command: ${command}`);

  try {
    // Parse voice commands and execute actions
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('quantum') && lowerCommand.includes('optimization')) {
      // Trigger quantum optimization
      const algorithm = lowerCommand.includes('classical') ? 'classical' : 
                       lowerCommand.includes('hybrid') ? 'hybrid' : 'quantum';
      
      return res.json({
        action: 'schedule_optimization',
        parameters: { algorithm },
        response: `Starting ${algorithm} optimization...`,
        success: true
      });
    }
    
    if (lowerCommand.includes('system status') || lowerCommand.includes('status')) {
      // Get system status
      return res.json({
        action: 'get_system_status',
        parameters: {},
        response: 'Retrieving system status...',
        success: true
      });
    }
    
    if (lowerCommand.includes('schedule') && lowerCommand.includes('meeting')) {
      // Schedule meeting
      return res.json({
        action: 'schedule_meeting',
        parameters: { context },
        response: 'I can help you schedule a meeting. What are the details?',
        success: true
      });
    }
    
    if (lowerCommand.includes('help') || lowerCommand.includes('what can you do')) {
      return res.json({
        action: 'help',
        parameters: {},
        response: `I can help you with:
        • Running quantum, classical, or hybrid optimizations
        • Checking system status and metrics
        • Scheduling meetings and managing requests
        • Viewing host availability and schedules
        • Explaining optimization results
        
        Try saying "Run quantum optimization" or "Show system status"`,
        success: true
      });
    }
    
    // Default response for unrecognized commands
    return res.json({
      action: 'unknown',
      parameters: { command },
      response: `I didn't understand that command. Try saying "help" to see what I can do.`,
      success: false
    });

  } catch (error: any) {
    logger.error('Voice command processing error:', error);
    return res.status(500).json({ 
      error: 'Command processing failed', 
      details: error.message,
      success: false
    });
  }
}));

// Speech-to-Speech Event Assistant
router.post('/ask-voice', asyncHandler(async (req: Request, res: Response) => {
  const { audio, attendee_profile, session_id, voice = 'alloy' } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    logger.info('Processing speech-to-speech event question', { session_id });

    // Step 1: Speech-to-Text (Whisper)
    const transcription = await phoenixService.wrapLLMCall(
      {
        operation: 'speech_to_text',
        provider: 'openai',
        model: 'whisper-1',
        userId: 'voice_user',
        sessionId: session_id || 'voice_session',
        metadata: {
          audio_format: 'webm',
          language: 'en'
        }
      },
      async () => {
        const formData = new FormData();
        const audioBuffer = Buffer.from(audio, 'base64');
        const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
        
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Whisper API error: ${response.statusText}`);
        }

        const result = await response.json() as { text: string };
        return result.text;
      }
    );

    logger.info('Speech transcribed', { transcription, session_id });

    // Step 2: Process with Event Assistant
    const eventResponse = await eventAssistant.answerEventQuestion({
      question: transcription,
      attendee_profile,
      session_id
    });

    logger.info('Event assistant response generated', { session_id });

    // Step 3: Text-to-Speech (TTS)
    const audioBuffer = await phoenixService.wrapLLMCall(
      {
        operation: 'text_to_speech_response',
        provider: 'openai',
        model: 'tts-1',
        userId: 'voice_user',
        sessionId: session_id || 'voice_session',
        metadata: {
          voice,
          response_length: eventResponse.answer.length,
          confidence: eventResponse.confidence
        }
      },
      async () => {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: eventResponse.answer,
            voice,
            response_format: 'mp3'
          }),
        });

        if (!response.ok) {
          throw new Error(`TTS API error: ${response.statusText}`);
        }

        return await response.arrayBuffer();
      }
    );

    // Return both the audio and the structured response
    return res.json({
      success: true,
      data: {
        transcription,
        response: eventResponse,
        audio: Buffer.from(audioBuffer).toString('base64'),
        audio_format: 'mp3'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Speech-to-speech error:', error);
    return res.status(500).json({ 
      error: 'Speech-to-speech processing failed', 
      details: error.message 
    });
  }
}));

// Voice Workshop Recommendations
router.post('/recommend-voice', asyncHandler(async (req: Request, res: Response) => {
  const { audio, attendee_profile, session_id, voice = 'alloy' } = req.body;

  if (!audio) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' });
  }

  try {
    // Step 1: Transcribe the audio (assuming it contains profile information)
    const formData = new FormData();
    const voiceAudioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([voiceAudioBuffer], { type: 'audio/webm' });
    
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const transcriptionResult = await transcriptionResponse.json() as { text: string };
    const spokenText = transcriptionResult.text;

    logger.info('Voice recommendation request transcribed', { spokenText, session_id });

    // Step 2: Get workshop recommendations
    const recommendations = await eventAssistant.getWorkshopRecommendations(attendee_profile || {});

    // Step 3: Create a spoken response
    const responseText = `Based on your profile, I found ${recommendations.length} workshop recommendations for you. ` +
      recommendations.map((rec, i) => 
        `${i + 1}. ${rec.workshop_name} on ${rec.time_slot}, which is ${rec.difficulty_level} level. ${rec.reason}`
      ).join('. ') + 
      '. Would you like more details about any of these workshops?';

    // Step 4: Convert to speech
    const ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: responseText,
        voice,
        response_format: 'mp3'
      }),
    });

    const responseAudioBuffer = await ttsResponse.arrayBuffer();

    return res.json({
      success: true,
      data: {
        transcription: spokenText,
        recommendations,
        response_text: responseText,
        audio: Buffer.from(responseAudioBuffer).toString('base64'),
        audio_format: 'mp3'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Voice recommendation error:', error);
    return res.status(500).json({ 
      error: 'Voice recommendation processing failed', 
      details: error.message 
    });
  }
}));

export default router;
