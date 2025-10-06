/**
 * Voice Chat routes - OpenAI Realtime API proxy
 */

import { Router, Request, Response } from 'express';
import { WebSocket } from 'ws';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

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

  // This would typically be handled by a WebSocket server
  // For now, return connection info
  res.json({
    message: 'WebSocket endpoint ready',
    endpoint: '/api/voice/realtime',
    instructions: 'Use WebSocket connection to connect to OpenAI Realtime API'
  });
}));

// Text-to-speech endpoint
router.post('/tts', asyncHandler(async (req: Request, res: Response) => {
  const { text, voice = 'alloy', model = 'tts-1' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const audioBuffer = await response.arrayBuffer();
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength.toString(),
    });
    
    res.send(Buffer.from(audioBuffer));

  } catch (error: any) {
    logger.error('TTS error:', error);
    res.status(500).json({ error: 'Text-to-speech failed', details: error.message });
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
    res.json(result);

  } catch (error: any) {
    logger.error('STT error:', error);
    res.status(500).json({ error: 'Speech-to-text failed', details: error.message });
  }
}));

// Chat completion with function calling
router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { messages, functions, model = 'gpt-4o' } = req.body;

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
    res.json(result);

  } catch (error: any) {
    logger.error('Chat completion error:', error);
    res.status(500).json({ error: 'Chat completion failed', details: error.message });
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
    res.status(500).json({ 
      error: 'Command processing failed', 
      details: error.message,
      success: false
    });
  }
}));

export default router;
