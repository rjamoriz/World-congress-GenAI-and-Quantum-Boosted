/**
 * GenAI Qualification Service
 * Classifies and scores meeting requests using OpenAI
 */

import OpenAI from 'openai';
import { 
  QualificationRequest, 
  QualificationResult,
  COMPANY_TIER_WEIGHTS,
  MEETING_TYPE_WEIGHTS,
  FRAUD_SCORE_THRESHOLD
} from '@agenda-manager/shared';
import { logger } from '../../utils/logger';
import { cacheGet, cacheSet } from '../../config/redis';
import { PhoenixService } from '../observability/PhoenixService';

export class QualificationService {
  private openai: OpenAI | null = null;
  private phoenixService: PhoenixService;
  
  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      logger.warn('OpenAI API key not configured - using mock qualification');
    }
    
    // Initialize Phoenix service (non-breaking)
    this.phoenixService = new PhoenixService();
  }
  
  async qualify(request: QualificationRequest): Promise<QualificationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `qualification:${request.requestId}`;
      const cached = await cacheGet<QualificationResult>(cacheKey);
      if (cached) {
        logger.info(`Using cached qualification for request: ${request.requestId}`);
        return cached;
      }
      
      // If OpenAI is configured, use AI qualification
      if (this.openai) {
        return await this.qualifyWithAI(request, startTime);
      } else {
        return await this.qualifyWithRules(request, startTime);
      }
    } catch (error) {
      logger.error('Qualification error:', error);
      // Fallback to rule-based qualification
      return await this.qualifyWithRules(request, startTime);
    }
  }
  
  private async qualifyWithAI(
    request: QualificationRequest, 
    startTime: number
  ): Promise<QualificationResult> {
    logger.info(`AI qualification for request: ${request.requestId}`);
    
    const prompt = `
You are an expert meeting request qualifier for a world congress on GenAI and Quantum Computing.

Analyze this meeting request and provide:
1. Importance score (0-100): Based on strategic value, company tier, and relevance
2. Qualification decision: Should this request be accepted?
3. Reason: Brief explanation
4. Fraud likelihood (0-1): Is this request suspicious?

Request Details:
- Company: ${request.companyName}
- Meeting Type: ${request.meetingType}
- Topics: ${request.requestedTopics.join(', ')}
- Contact: ${request.contactEmail}

Respond in JSON format:
{
  "importanceScore": <number 0-100>,
  "isQualified": <boolean>,
  "reason": "<string>",
  "fraudScore": <number 0-1>,
  "confidence": <number 0-1>
}
`;
    
    // Wrap OpenAI call with Phoenix tracing
    const completion = await this.phoenixService.wrapLLMCall(
      {
        operation: 'qualification',
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        userId: 'system',
        requestId: request.requestId,
        metadata: {
          companyName: request.companyName,
          meetingType: request.meetingType,
          topicsCount: request.requestedTopics.length
        }
      },
      async () => {
        return await this.openai!.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert meeting request qualifier. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });
      }
    );
    
    const responseText = completion.choices[0]?.message?.content || '{}';
    const aiResult = JSON.parse(responseText);
    
    // Check for duplicates (simplified - in production use embeddings)
    const isDuplicate = await this.checkDuplicate(request);
    
    const result: QualificationResult = {
      requestId: request.requestId,
      isQualified: aiResult.isQualified && aiResult.fraudScore < FRAUD_SCORE_THRESHOLD,
      importanceScore: Math.round(aiResult.importanceScore),
      reason: aiResult.reason,
      confidence: aiResult.confidence || 0.8,
      fraudScore: aiResult.fraudScore,
      isDuplicate,
      duplicateOf: isDuplicate ? [] : undefined,
      processingTimeMs: Date.now() - startTime
    };
    
    // Cache the result
    await cacheSet(`qualification:${request.requestId}`, result, 3600);
    
    return result;
  }
  
  private async qualifyWithRules(
    request: QualificationRequest,
    startTime: number
  ): Promise<QualificationResult> {
    logger.info(`Rule-based qualification for request: ${request.requestId}`);
    
    // Calculate importance score based on heuristics
    let score = 50; // Base score
    
    // Adjust for meeting type
    const typeWeight = MEETING_TYPE_WEIGHTS[request.meetingType as keyof typeof MEETING_TYPE_WEIGHTS] || 0.5;
    score += typeWeight * 30;
    
    // Adjust for topic relevance
    const relevantKeywords = ['quantum', 'ai', 'genai', 'machine learning', 'strategic', 'partnership'];
    const topicRelevance = request.requestedTopics.some(topic =>
      relevantKeywords.some(keyword => topic.toLowerCase().includes(keyword))
    );
    if (topicRelevance) {
      score += 15;
    }
    
    // Clamp score between 0-100
    score = Math.max(0, Math.min(100, score));
    
    // Simple fraud detection
    const fraudScore = this.calculateFraudScore(request);
    
    // Check for duplicates
    const isDuplicate = await this.checkDuplicate(request);
    
    // Qualify if score is high enough and no fraud detected
    const isQualified = score >= 50 && fraudScore < FRAUD_SCORE_THRESHOLD && !isDuplicate;
    
    const result: QualificationResult = {
      requestId: request.requestId,
      isQualified,
      importanceScore: Math.round(score),
      reason: isQualified
        ? `Qualified with score ${Math.round(score)}. Meeting type and topics align with event focus.`
        : `Not qualified: ${fraudScore >= FRAUD_SCORE_THRESHOLD ? 'High fraud risk' : isDuplicate ? 'Duplicate request' : 'Score too low'}`,
      confidence: 0.7,
      fraudScore,
      isDuplicate,
      processingTimeMs: Date.now() - startTime
    };
    
    // Cache the result
    await cacheSet(`qualification:${request.requestId}`, result, 3600);
    
    return result;
  }
  
  private calculateFraudScore(request: QualificationRequest): number {
    let fraudIndicators = 0;
    
    // Check email domain
    if (request.contactEmail.includes('test') || 
        request.contactEmail.includes('fake') ||
        request.contactEmail.includes('example')) {
      fraudIndicators += 3;
    }
    
    // Check company name
    if (request.companyName.toLowerCase().includes('test') ||
        request.companyName.length < 3) {
      fraudIndicators += 2;
    }
    
    // Check topics
    if (request.requestedTopics.length === 0) {
      fraudIndicators += 1;
    }
    
    // Normalize to 0-1 scale
    return Math.min(fraudIndicators / 10, 1);
  }
  
  private async checkDuplicate(request: QualificationRequest): Promise<boolean> {
    // In production, use embeddings and similarity search
    // For now, simple cache-based check
    const key = `duplicate:${request.contactEmail}:${request.companyName}`;
    const existing = await cacheGet(key);
    
    if (existing) {
      return true;
    }
    
    // Store this request to detect future duplicates
    await cacheSet(key, request.requestId, 86400); // 24 hours
    
    return false;
  }
}
