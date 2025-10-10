/**
 * Event Assistant Service
 * AI-powered assistant for event attendees using OpenAI
 */

import OpenAI from 'openai';
import { logger } from '../../utils/logger';
import { PhoenixService } from '../observability/PhoenixService';

export interface AttendeeProfile {
  name?: string;
  company?: string;
  role?: string;
  interests?: string[];
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_topics?: string[];
  goals?: string[];
}

export interface EventQuestion {
  question: string;
  context?: string;
  attendee_profile?: AttendeeProfile;
  session_id?: string;
}

export interface WorkshopRecommendation {
  workshop_name: string;
  relevance_score: number;
  reason: string;
  time_slot: string;
  difficulty_level: string;
  prerequisites?: string[];
}

export interface EventResponse {
  answer: string;
  recommendations?: WorkshopRecommendation[];
  suggested_actions?: string[];
  confidence: number;
  sources?: string[];
}

export class EventAssistantService {
  private openai: OpenAI | null = null;
  private phoenixService: PhoenixService;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      logger.info('Event Assistant Service initialized with OpenAI');
    } else {
      logger.warn('OpenAI API key not configured - Event Assistant will use mock responses');
    }
    
    this.phoenixService = new PhoenixService();
  }

  /**
   * Answer general event questions with AI assistance
   */
  async answerEventQuestion(eventQuestion: EventQuestion): Promise<EventResponse> {
    if (!this.openai) {
      return this.getMockResponse(eventQuestion);
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(eventQuestion);

    return this.phoenixService.wrapLLMCall(
      {
        operation: 'event_question_answering',
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        userId: eventQuestion.session_id || 'anonymous',
        sessionId: eventQuestion.session_id,
        metadata: {
          question_type: 'event_qa',
          attendee_company: eventQuestion.attendee_profile?.company,
          attendee_role: eventQuestion.attendee_profile?.role,
          interests_count: eventQuestion.attendee_profile?.interests?.length || 0
        }
      },
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        return JSON.parse(responseText) as EventResponse;
      }
    );
  }

  /**
   * Get personalized workshop recommendations
   */
  async getWorkshopRecommendations(attendeeProfile: AttendeeProfile): Promise<WorkshopRecommendation[]> {
    if (!this.openai) {
      return this.getMockWorkshopRecommendations(attendeeProfile);
    }

    const systemPrompt = this.buildWorkshopRecommendationPrompt();
    const userPrompt = this.buildAttendeeProfilePrompt(attendeeProfile);

    const response = await this.phoenixService.wrapLLMCall(
      {
        operation: 'workshop_recommendations',
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        userId: attendeeProfile.name || 'anonymous',
        metadata: {
          company: attendeeProfile.company,
          role: attendeeProfile.role,
          experience_level: attendeeProfile.experience_level,
          interests_count: attendeeProfile.interests?.length || 0,
          goals_count: attendeeProfile.goals?.length || 0
        }
      },
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{"recommendations": []}';
        const parsed = JSON.parse(responseText);
        return parsed.recommendations || [];
      }
    );

    return response;
  }

  /**
   * Get personalized event agenda
   */
  async getPersonalizedAgenda(attendeeProfile: AttendeeProfile, preferences: any): Promise<any> {
    if (!this.openai) {
      return this.getMockPersonalizedAgenda(attendeeProfile);
    }

    const systemPrompt = this.buildAgendaPrompt();
    const userPrompt = this.buildAgendaUserPrompt(attendeeProfile, preferences);

    return this.phoenixService.wrapLLMCall(
      {
        operation: 'personalized_agenda',
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        userId: attendeeProfile.name || 'anonymous',
        metadata: {
          company: attendeeProfile.company,
          role: attendeeProfile.role,
          experience_level: attendeeProfile.experience_level
        }
      },
      async () => {
        const completion = await this.openai!.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content || '{}';
        return JSON.parse(responseText);
      }
    );
  }

  /**
   * Build system prompt for event Q&A
   */
  private buildSystemPrompt(): string {
    return `You are an expert AI assistant for the World Congress on GenAI and Quantum Computing.

Your role is to help attendees with:
- General event information and logistics
- Workshop and session recommendations
- Networking opportunities
- Technical questions about GenAI and Quantum Computing
- Schedule optimization and planning

Event Details:
- Duration: 3 days (November 15-17, 2025)
- Location: Convention Center, Tech District
- Attendees: 2,000+ professionals, researchers, and industry leaders
- Focus: Cutting-edge GenAI applications and Quantum Computing breakthroughs

Available Sessions:
- Keynote presentations by industry leaders
- Technical workshops (beginner to expert level)
- Panel discussions on industry trends
- Hands-on labs with quantum simulators
- Networking sessions and exhibitions
- Startup pitch competitions

Respond in JSON format with:
{
  "answer": "Clear, helpful response to the question",
  "recommendations": [array of relevant workshop/session recommendations],
  "suggested_actions": [array of actionable next steps],
  "confidence": 0.0-1.0,
  "sources": [array of relevant information sources]
}

Be helpful, accurate, and personalized based on the attendee's profile.`;
  }

  /**
   * Build user prompt for event questions
   */
  private buildUserPrompt(eventQuestion: EventQuestion): string {
    let prompt = `Question: ${eventQuestion.question}\n\n`;
    
    if (eventQuestion.context) {
      prompt += `Context: ${eventQuestion.context}\n\n`;
    }

    if (eventQuestion.attendee_profile) {
      const profile = eventQuestion.attendee_profile;
      prompt += `Attendee Profile:\n`;
      if (profile.name) prompt += `- Name: ${profile.name}\n`;
      if (profile.company) prompt += `- Company: ${profile.company}\n`;
      if (profile.role) prompt += `- Role: ${profile.role}\n`;
      if (profile.experience_level) prompt += `- Experience Level: ${profile.experience_level}\n`;
      if (profile.interests?.length) prompt += `- Interests: ${profile.interests.join(', ')}\n`;
      if (profile.preferred_topics?.length) prompt += `- Preferred Topics: ${profile.preferred_topics.join(', ')}\n`;
      if (profile.goals?.length) prompt += `- Goals: ${profile.goals.join(', ')}\n`;
    }

    return prompt;
  }

  /**
   * Build workshop recommendation system prompt
   */
  private buildWorkshopRecommendationPrompt(): string {
    return `You are an expert event curator for the World Congress on GenAI and Quantum Computing.

Available Workshops:
1. "Introduction to Quantum Computing" (Beginner, Day 1, 9:00-12:00)
2. "Advanced QAOA Algorithms" (Expert, Day 1, 14:00-17:00)
3. "GenAI for Business Applications" (Intermediate, Day 1, 10:00-13:00)
4. "Quantum Machine Learning Fundamentals" (Intermediate, Day 2, 9:00-12:00)
5. "Building LLM Applications" (Beginner, Day 2, 14:00-17:00)
6. "Quantum Cryptography Deep Dive" (Advanced, Day 2, 10:00-13:00)
7. "AI Ethics and Governance" (All levels, Day 3, 9:00-12:00)
8. "Quantum-Classical Hybrid Systems" (Expert, Day 3, 14:00-17:00)
9. "Prompt Engineering Masterclass" (Intermediate, Day 3, 10:00-13:00)
10. "Future of Quantum Computing" (All levels, Day 3, 15:00-16:30)

Networking Events:
- Welcome Reception (Day 1, 18:00-20:00)
- Industry Mixer (Day 2, 18:00-20:00)
- Startup Showcase (Day 3, 17:00-19:00)

Respond in JSON format with:
{
  "recommendations": [
    {
      "workshop_name": "Workshop name",
      "relevance_score": 0.0-1.0,
      "reason": "Why this workshop is recommended",
      "time_slot": "Day X, HH:MM-HH:MM",
      "difficulty_level": "beginner/intermediate/advanced/expert",
      "prerequisites": ["list of prerequisites if any"]
    }
  ]
}

Recommend 3-5 most relevant workshops based on the attendee profile.`;
  }

  /**
   * Build attendee profile prompt
   */
  private buildAttendeeProfilePrompt(profile: AttendeeProfile): string {
    let prompt = `Please recommend workshops for this attendee:\n\n`;
    
    if (profile.name) prompt += `Name: ${profile.name}\n`;
    if (profile.company) prompt += `Company: ${profile.company}\n`;
    if (profile.role) prompt += `Role: ${profile.role}\n`;
    if (profile.experience_level) prompt += `Experience Level: ${profile.experience_level}\n`;
    if (profile.interests?.length) prompt += `Interests: ${profile.interests.join(', ')}\n`;
    if (profile.preferred_topics?.length) prompt += `Preferred Topics: ${profile.preferred_topics.join(', ')}\n`;
    if (profile.goals?.length) prompt += `Goals for this event: ${profile.goals.join(', ')}\n`;

    return prompt;
  }

  /**
   * Build agenda system prompt
   */
  private buildAgendaPrompt(): string {
    return `You are a personal event assistant creating optimized daily agendas for World Congress attendees.

Create a personalized 3-day agenda that maximizes value based on the attendee's profile and preferences.

Consider:
- Learning objectives and experience level
- Networking opportunities with relevant professionals
- Balanced schedule with breaks and meals
- Travel time between sessions
- Priority sessions that align with goals

Respond in JSON format with a detailed daily schedule.`;
  }

  /**
   * Build agenda user prompt
   */
  private buildAgendaUserPrompt(profile: AttendeeProfile, preferences: any): string {
    let prompt = `Create a personalized agenda for:\n\n`;
    
    // Add profile information
    Object.entries(profile).forEach(([key, value]) => {
      if (value) {
        prompt += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\n`;
      }
    });

    if (preferences) {
      prompt += `\nPreferences:\n`;
      Object.entries(preferences).forEach(([key, value]) => {
        prompt += `${key}: ${value}\n`;
      });
    }

    return prompt;
  }

  /**
   * Mock response for when OpenAI is not available
   */
  private getMockResponse(eventQuestion: EventQuestion): EventResponse {
    return {
      answer: `Thank you for your question about "${eventQuestion.question}". The World Congress on GenAI and Quantum Computing offers comprehensive sessions covering cutting-edge technologies. I'd recommend checking our workshop schedule for hands-on learning opportunities.`,
      recommendations: [
        {
          workshop_name: "Introduction to Quantum Computing",
          relevance_score: 0.8,
          reason: "Great starting point for quantum computing concepts",
          time_slot: "Day 1, 9:00-12:00",
          difficulty_level: "beginner"
        }
      ],
      suggested_actions: [
        "Review the full event schedule",
        "Register for recommended workshops",
        "Join networking sessions"
      ],
      confidence: 0.7,
      sources: ["Event Program", "Workshop Catalog"]
    };
  }

  /**
   * Mock workshop recommendations
   */
  private getMockWorkshopRecommendations(profile: AttendeeProfile): WorkshopRecommendation[] {
    const baseRecommendations = [
      {
        workshop_name: "GenAI for Business Applications",
        relevance_score: 0.9,
        reason: "Aligns with business focus and practical applications",
        time_slot: "Day 1, 10:00-13:00",
        difficulty_level: "intermediate"
      },
      {
        workshop_name: "AI Ethics and Governance",
        relevance_score: 0.8,
        reason: "Important for all professionals working with AI",
        time_slot: "Day 3, 9:00-12:00",
        difficulty_level: "all levels"
      }
    ];

    // Customize based on experience level
    if (profile.experience_level === 'beginner') {
      baseRecommendations.unshift({
        workshop_name: "Introduction to Quantum Computing",
        relevance_score: 0.95,
        reason: "Perfect introduction for beginners",
        time_slot: "Day 1, 9:00-12:00",
        difficulty_level: "beginner"
      });
    }

    return baseRecommendations;
  }

  /**
   * Mock personalized agenda
   */
  private getMockPersonalizedAgenda(profile: AttendeeProfile): any {
    return {
      day_1: {
        "9:00-12:00": "Introduction to Quantum Computing Workshop",
        "12:00-13:00": "Lunch & Networking",
        "13:00-14:00": "Keynote: Future of AI",
        "14:00-17:00": "GenAI for Business Applications Workshop",
        "18:00-20:00": "Welcome Reception"
      },
      day_2: {
        "9:00-12:00": "Quantum Machine Learning Fundamentals",
        "12:00-13:00": "Lunch & Networking",
        "13:00-14:00": "Panel: Industry Trends",
        "14:00-17:00": "Building LLM Applications Workshop",
        "18:00-20:00": "Industry Mixer"
      },
      day_3: {
        "9:00-12:00": "AI Ethics and Governance",
        "12:00-13:00": "Lunch & Networking",
        "13:00-15:00": "Startup Pitch Competition",
        "15:00-16:30": "Future of Quantum Computing",
        "17:00-19:00": "Startup Showcase"
      }
    };
  }
}
