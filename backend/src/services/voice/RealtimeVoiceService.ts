/**
 * Realtime Voice Service - WebSocket Proxy for OpenAI Realtime API
 * Supports GPT-4o Realtime and GPT-5 Realtime models
 */

import { WebSocket as WSClient } from 'ws';
import { IncomingMessage } from 'http';
import { logger } from '../../utils/logger';
import { PhoenixService } from '../observability/PhoenixService';

export interface RealtimeConfig {
  model?: string;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  modalities?: ('text' | 'audio')[];
  instructions?: string;
  temperature?: number;
  max_tokens?: number;
  turn_detection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  tools?: any[];
}

export class RealtimeVoiceService {
  private phoenixService: PhoenixService;
  private openaiApiKey: string;
  private activeSessions: Map<string, WSClient>;

  constructor() {
    this.phoenixService = new PhoenixService();
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    this.activeSessions = new Map();

    if (!this.openaiApiKey) {
      logger.warn('OpenAI API key not configured - Realtime Voice will not work');
    }
  }

  /**
   * Create WebSocket proxy connection to OpenAI Realtime API
   */
  async createRealtimeSession(
    clientWs: any,
    config: RealtimeConfig,
    sessionId: string
  ): Promise<void> {
    if (!this.openaiApiKey) {
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: 'OpenAI API key not configured' }
      }));
      clientWs.close();
      return;
    }

    const model = config.model || 'gpt-4o-realtime-preview-2024-12-17';
    logger.info(`Creating Realtime session with model: ${model}`, { sessionId });

    try {
      // Connect to OpenAI Realtime API
      const openaiWs = new WSClient(
        `wss://api.openai.com/v1/realtime?model=${model}`,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      // Track session
      this.activeSessions.set(sessionId, openaiWs);

      // OpenAI WebSocket opened
      openaiWs.on('open', () => {
        logger.info('Connected to OpenAI Realtime API', { sessionId, model });

        // Send session configuration
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: config.modalities || ['text', 'audio'],
            instructions: config.instructions || this.getDefaultInstructions(),
            voice: config.voice || 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: config.turn_detection || {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 200
            },
            temperature: config.temperature || 0.7,
            max_response_output_tokens: config.max_tokens || 4096,
            tools: config.tools || this.getDefaultTools()
          }
        };

        openaiWs.send(JSON.stringify(sessionConfig));

        // Notify client
        clientWs.send(JSON.stringify({
          type: 'session.created',
          session_id: sessionId,
          model,
          status: 'connected'
        }));
      });

      // Forward messages from OpenAI to client
      openaiWs.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Log important events
          if (['error', 'session.created', 'conversation.item.created'].includes(message.type)) {
            logger.info(`OpenAI Realtime event: ${message.type}`, { sessionId });
          }

          // Forward to client
          clientWs.send(data.toString());
        } catch (error) {
          logger.error('Error parsing OpenAI message', { error, sessionId });
        }
      });

      // Forward messages from client to OpenAI
      clientWs.on('message', (data: any) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Log important client events
          if (['input_audio_buffer.append', 'response.create'].includes(message.type)) {
            logger.debug(`Client event: ${message.type}`, { sessionId });
          }

          // Forward to OpenAI
          if (openaiWs.readyState === WSClient.OPEN) {
            openaiWs.send(data.toString());
          }
        } catch (error) {
          logger.error('Error parsing client message', { error, sessionId });
        }
      });

      // Handle errors
      openaiWs.on('error', (error) => {
        logger.error('OpenAI WebSocket error', { error: error.message, sessionId });
        clientWs.send(JSON.stringify({
          type: 'error',
          error: { message: error.message }
        }));
      });

      // Handle OpenAI disconnection
      openaiWs.on('close', (code, reason) => {
        logger.info('OpenAI WebSocket closed', { code, reason: reason.toString(), sessionId });
        this.activeSessions.delete(sessionId);
        
        if (clientWs.readyState === WSClient.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'session.closed',
            reason: reason.toString()
          }));
          clientWs.close();
        }
      });

      // Handle client disconnection
      clientWs.on('close', () => {
        logger.info('Client WebSocket closed', { sessionId });
        if (openaiWs.readyState === WSClient.OPEN) {
          openaiWs.close();
        }
        this.activeSessions.delete(sessionId);
      });

    } catch (error: any) {
      logger.error('Failed to create Realtime session', { error: error.message, sessionId });
      clientWs.send(JSON.stringify({
        type: 'error',
        error: { message: error.message }
      }));
      clientWs.close();
    }
  }

  /**
   * Get default instructions for the assistant
   */
  private getDefaultInstructions(): string {
    return `You are an AI assistant for the World Congress on GenAI and Quantum Computing Agenda Manager.

Help users with:
- Meeting scheduling and optimization
- Quantum algorithm selection (Classical, QAOA, D-Wave)
- Event management and logistics
- Workshop recommendations
- System status and metrics
- Real-time voice commands

Be concise, helpful, and professional. When users ask to run optimizations or schedule meetings, use the provided function tools.

Current capabilities:
- Classical scheduling (fast, deterministic)
- Quantum-inspired scheduling (simulated annealing)
- Real quantum scheduling (IBM Qiskit QAOA)
- D-Wave quantum annealing (5000+ qubits)
- Voice interaction and commands
- Real-time optimization feedback`;
  }

  /**
   * Get default function tools for the assistant
   */
  private getDefaultTools(): any[] {
    return [
      {
        type: 'function',
        name: 'schedule_optimization',
        description: 'Run quantum or classical scheduling optimization for meeting requests',
        parameters: {
          type: 'object',
          properties: {
            algorithm: {
              type: 'string',
              enum: ['classical', 'quantum', 'qaoa', 'dwave', 'hybrid'],
              description: 'Optimization algorithm to use'
            },
            constraints: {
              type: 'object',
              properties: {
                eventStartDate: {
                  type: 'string',
                  description: 'Event start date (YYYY-MM-DD)'
                },
                eventEndDate: {
                  type: 'string',
                  description: 'Event end date (YYYY-MM-DD)'
                }
              }
            }
          },
          required: ['algorithm']
        }
      },
      {
        type: 'function',
        name: 'get_system_status',
        description: 'Get current system status, metrics, and statistics',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'get_meeting_stats',
        description: 'Get meeting statistics and scheduling information',
        parameters: {
          type: 'object',
          properties: {
            timeframe: {
              type: 'string',
              enum: ['today', 'week', 'month', 'all'],
              description: 'Timeframe for statistics'
            }
          }
        }
      },
      {
        type: 'function',
        name: 'list_hosts',
        description: 'List available hosts and their schedules',
        parameters: {
          type: 'object',
          properties: {
            available_only: {
              type: 'boolean',
              description: 'Show only available hosts'
            }
          }
        }
      }
    ];
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Close all active sessions
   */
  closeAllSessions(): void {
    logger.info(`Closing ${this.activeSessions.size} active Realtime sessions`);
    this.activeSessions.forEach((ws, sessionId) => {
      try {
        ws.close();
      } catch (error) {
        logger.error('Error closing session', { error, sessionId });
      }
    });
    this.activeSessions.clear();
  }
}
