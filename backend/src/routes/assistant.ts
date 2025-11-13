/**
 * Event Assistant API Routes
 * AI-powered assistant for event attendees
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EventAssistantService, EventQuestion, AttendeeProfile } from '../services/ai/EventAssistantService';
import { logger } from '../utils/logger';
import { timeouts } from '../middleware/timeout';

const router = Router();
const eventAssistant = new EventAssistantService();

/**
 * POST /api/assistant/ask
 * Ask a question about the event
 */
router.post('/ask', timeouts.ai, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { question, context, attendee_profile, session_id } = req.body;

  if (!question) {
    res.status(400).json({
      success: false,
      error: 'Question is required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const eventQuestion: EventQuestion = {
    question,
    context,
    attendee_profile,
    session_id
  };

  logger.info(`Event assistant question: ${question}`, {
    session_id,
    has_profile: !!attendee_profile
  });

  try {
    const response = await eventAssistant.answerEventQuestion(eventQuestion);

    res.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Event assistant error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * POST /api/assistant/workshops/recommend
 * Get personalized workshop recommendations
 */
router.post('/workshops/recommend', timeouts.ai, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const attendeeProfile: AttendeeProfile = req.body;

  if (!attendeeProfile || Object.keys(attendeeProfile).length === 0) {
    res.status(400).json({
      success: false,
      error: 'Attendee profile is required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  logger.info('Workshop recommendation request', {
    company: attendeeProfile.company,
    role: attendeeProfile.role,
    experience_level: attendeeProfile.experience_level
  });

  try {
    const recommendations = await eventAssistant.getWorkshopRecommendations(attendeeProfile);

    res.json({
      success: true,
      data: {
        recommendations,
        total_count: recommendations.length,
        profile_used: attendeeProfile
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Workshop recommendation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * POST /api/assistant/agenda/personalized
 * Get personalized event agenda
 */
router.post('/agenda/personalized', timeouts.ai, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { attendee_profile, preferences } = req.body;

  if (!attendee_profile) {
    res.status(400).json({
      success: false,
      error: 'Attendee profile is required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  logger.info('Personalized agenda request', {
    company: attendee_profile.company,
    role: attendee_profile.role,
    has_preferences: !!preferences
  });

  try {
    const agenda = await eventAssistant.getPersonalizedAgenda(attendee_profile, preferences);

    res.json({
      success: true,
      data: {
        agenda,
        profile_used: attendee_profile,
        preferences_applied: preferences
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Personalized agenda error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate personalized agenda',
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * GET /api/assistant/workshops
 * Get all available workshops
 */
router.get('/workshops', asyncHandler(async (req: Request, res: Response) => {
  const workshops = [
    {
      id: 'ws001',
      name: 'Introduction to Quantum Computing',
      description: 'Learn the fundamentals of quantum computing, qubits, and quantum gates',
      difficulty: 'beginner',
      duration: '3 hours',
      day: 1,
      time: '9:00-12:00',
      capacity: 50,
      registered: 32,
      topics: ['Quantum Basics', 'Qubits', 'Quantum Gates', 'Superposition'],
      prerequisites: [],
      instructor: 'Dr. Sarah Chen, IBM Quantum'
    },
    {
      id: 'ws002',
      name: 'Advanced QAOA Algorithms',
      description: 'Deep dive into Quantum Approximate Optimization Algorithm implementations',
      difficulty: 'expert',
      duration: '3 hours',
      day: 1,
      time: '14:00-17:00',
      capacity: 30,
      registered: 28,
      topics: ['QAOA', 'Variational Algorithms', 'Optimization', 'Quantum Circuits'],
      prerequisites: ['Quantum Computing Basics', 'Linear Algebra'],
      instructor: 'Prof. Michael Rodriguez, MIT'
    },
    {
      id: 'ws003',
      name: 'GenAI for Business Applications',
      description: 'Practical applications of Generative AI in business contexts',
      difficulty: 'intermediate',
      duration: '3 hours',
      day: 1,
      time: '10:00-13:00',
      capacity: 80,
      registered: 65,
      topics: ['LLMs', 'Business Use Cases', 'ROI Analysis', 'Implementation'],
      prerequisites: ['Basic AI Knowledge'],
      instructor: 'Lisa Wang, OpenAI'
    },
    {
      id: 'ws004',
      name: 'Quantum Machine Learning Fundamentals',
      description: 'Intersection of quantum computing and machine learning',
      difficulty: 'intermediate',
      duration: '3 hours',
      day: 2,
      time: '9:00-12:00',
      capacity: 40,
      registered: 35,
      topics: ['QML', 'Quantum Neural Networks', 'Variational Classifiers'],
      prerequisites: ['Quantum Computing Basics', 'Machine Learning Basics'],
      instructor: 'Dr. Alex Kumar, Google Quantum AI'
    },
    {
      id: 'ws005',
      name: 'Building LLM Applications',
      description: 'Hands-on workshop for building applications with Large Language Models',
      difficulty: 'beginner',
      duration: '3 hours',
      day: 2,
      time: '14:00-17:00',
      capacity: 60,
      registered: 45,
      topics: ['LLM APIs', 'Prompt Engineering', 'Fine-tuning', 'Deployment'],
      prerequisites: ['Programming Experience'],
      instructor: 'James Thompson, Anthropic'
    },
    {
      id: 'ws006',
      name: 'Quantum Cryptography Deep Dive',
      description: 'Advanced quantum cryptography and security protocols',
      difficulty: 'advanced',
      duration: '3 hours',
      day: 2,
      time: '10:00-13:00',
      capacity: 35,
      registered: 30,
      topics: ['QKD', 'Quantum Security', 'Post-Quantum Cryptography'],
      prerequisites: ['Cryptography Basics', 'Quantum Computing'],
      instructor: 'Dr. Emma Foster, IBM Research'
    },
    {
      id: 'ws007',
      name: 'AI Ethics and Governance',
      description: 'Ethical considerations and governance frameworks for AI systems',
      difficulty: 'all_levels',
      duration: '3 hours',
      day: 3,
      time: '9:00-12:00',
      capacity: 100,
      registered: 78,
      topics: ['AI Ethics', 'Bias Detection', 'Governance', 'Compliance'],
      prerequisites: [],
      instructor: 'Prof. David Park, Stanford AI Ethics Lab'
    },
    {
      id: 'ws008',
      name: 'Quantum-Classical Hybrid Systems',
      description: 'Building systems that combine quantum and classical computing',
      difficulty: 'expert',
      duration: '3 hours',
      day: 3,
      time: '14:00-17:00',
      capacity: 25,
      registered: 22,
      topics: ['Hybrid Algorithms', 'System Architecture', 'Performance Optimization'],
      prerequisites: ['Advanced Quantum Computing', 'System Design'],
      instructor: 'Dr. Maria Santos, Microsoft Quantum'
    },
    {
      id: 'ws009',
      name: 'Prompt Engineering Masterclass',
      description: 'Advanced techniques for optimizing LLM prompts',
      difficulty: 'intermediate',
      duration: '3 hours',
      day: 3,
      time: '10:00-13:00',
      capacity: 70,
      registered: 58,
      topics: ['Prompt Design', 'Chain-of-Thought', 'Few-Shot Learning', 'Optimization'],
      prerequisites: ['LLM Experience'],
      instructor: 'Rachel Kim, Cohere'
    },
    {
      id: 'ws010',
      name: 'Future of Quantum Computing',
      description: 'Panel discussion on the future directions of quantum computing',
      difficulty: 'all_levels',
      duration: '1.5 hours',
      day: 3,
      time: '15:00-16:30',
      capacity: 200,
      registered: 156,
      topics: ['Future Trends', 'Industry Outlook', 'Research Directions'],
      prerequisites: [],
      instructor: 'Panel of Industry Leaders'
    }
  ];

  res.json({
    success: true,
    data: {
      workshops,
      total_count: workshops.length,
      by_difficulty: {
        beginner: workshops.filter(w => w.difficulty === 'beginner').length,
        intermediate: workshops.filter(w => w.difficulty === 'intermediate').length,
        advanced: workshops.filter(w => w.difficulty === 'advanced').length,
        expert: workshops.filter(w => w.difficulty === 'expert').length,
        all_levels: workshops.filter(w => w.difficulty === 'all_levels').length
      }
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * GET /api/assistant/event-info
 * Get general event information
 */
router.get('/event-info', asyncHandler(async (req: Request, res: Response) => {
  const eventInfo = {
    name: 'World Congress on GenAI and Quantum Computing',
    dates: {
      start: '2025-11-15',
      end: '2025-11-17',
      duration_days: 3
    },
    location: {
      venue: 'Tech Convention Center',
      address: '123 Innovation Drive, Tech District',
      city: 'San Francisco',
      country: 'USA'
    },
    attendees: {
      expected: 2000,
      registered: 1847,
      countries: 45,
      companies: 350
    },
    tracks: [
      'Quantum Computing Fundamentals',
      'Advanced Quantum Algorithms',
      'Generative AI Applications',
      'AI Ethics and Governance',
      'Industry Applications',
      'Research and Development'
    ],
    networking_events: [
      {
        name: 'Welcome Reception',
        date: '2025-11-15',
        time: '18:00-20:00',
        location: 'Main Lobby'
      },
      {
        name: 'Industry Mixer',
        date: '2025-11-16',
        time: '18:00-20:00',
        location: 'Exhibition Hall'
      },
      {
        name: 'Startup Showcase',
        date: '2025-11-17',
        time: '17:00-19:00',
        location: 'Innovation Theater'
      }
    ],
    keynote_speakers: [
      'Dr. John Chen - IBM Quantum Computing',
      'Sarah Williams - OpenAI Research',
      'Prof. Michael Zhang - MIT Quantum Lab',
      'Lisa Rodriguez - Google Quantum AI'
    ]
  };

  res.json({
    success: true,
    data: eventInfo,
    timestamp: new Date().toISOString()
  });
}));

export default router;
