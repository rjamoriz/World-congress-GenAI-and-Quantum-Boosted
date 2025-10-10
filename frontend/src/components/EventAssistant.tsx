/**
 * Event Assistant Component
 * AI-powered assistant for event attendees
 */

'use client';

import React, { useState } from 'react';
import { Sparkles, MessageCircle, Calendar, Users, BookOpen, Send, Loader2 } from 'lucide-react';

interface AttendeeProfile {
  name?: string;
  company?: string;
  role?: string;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  interests?: string[];
  goals?: string[];
}

interface WorkshopRecommendation {
  workshop_name: string;
  relevance_score: number;
  reason: string;
  time_slot: string;
  difficulty_level: string;
}

interface EventResponse {
  answer: string;
  recommendations?: WorkshopRecommendation[];
  suggested_actions?: string[];
  confidence: number;
}

export default function EventAssistant() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<EventResponse | null>(null);
  const [recommendations, setRecommendations] = useState<WorkshopRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ask' | 'workshops' | 'agenda'>('ask');
  
  const [profile, setProfile] = useState<AttendeeProfile>({
    name: '',
    company: '',
    role: '',
    experience_level: 'intermediate',
    interests: [],
    goals: []
  });

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          attendee_profile: profile,
          session_id: 'demo-session'
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setResponse(data.data);
      }
    } catch (error) {
      console.error('Error asking question:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/workshops/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      const data = await res.json();
      if (data.success) {
        setRecommendations(data.data.recommendations);
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const addInterest = (interest: string) => {
    if (interest && !profile.interests?.includes(interest)) {
      setProfile(prev => ({
        ...prev,
        interests: [...(prev.interests || []), interest]
      }));
    }
  };

  const removeInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests?.filter(i => i !== interest) || []
    }));
  };

  return (
    <div className="neumorphic-card p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
          <Sparkles className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-100">AI Event Assistant</h2>
          <p className="text-gray-400">Get personalized recommendations and answers about the World Congress</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('ask')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'ask'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          <MessageCircle size={16} className="inline mr-2" />
          Ask Questions
        </button>
        <button
          onClick={() => setActiveTab('workshops')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'workshops'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          <BookOpen size={16} className="inline mr-2" />
          Workshop Recommendations
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'agenda'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Personalized Agenda
        </button>
      </div>

      {/* Profile Section */}
      <div className="neumorphic-inset p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Your Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            value={profile.name || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            className="neumorphic-input"
          />
          <input
            type="text"
            placeholder="Company"
            value={profile.company || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, company: e.target.value }))}
            className="neumorphic-input"
          />
          <input
            type="text"
            placeholder="Role/Title"
            value={profile.role || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))}
            className="neumorphic-input"
          />
          <select
            value={profile.experience_level || 'intermediate'}
            onChange={(e) => setProfile(prev => ({ ...prev, experience_level: e.target.value as any }))}
            className="neumorphic-input"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        
        {/* Interests */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Interests</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {profile.interests?.map((interest, index) => (
              <span
                key={index}
                className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-primary-700"
                onClick={() => removeInterest(interest)}
              >
                {interest} ×
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            {['Quantum Computing', 'GenAI', 'Machine Learning', 'Cryptography', 'Optimization', 'Business Applications'].map(topic => (
              <button
                key={topic}
                onClick={() => addInterest(topic)}
                className="bg-dark-700 text-gray-300 px-3 py-1 rounded-full text-sm hover:bg-dark-600"
                disabled={profile.interests?.includes(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'ask' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about the World Congress..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
              className="neumorphic-input flex-1"
            />
            <button
              onClick={handleAskQuestion}
              disabled={loading || !question.trim()}
              className="neumorphic-button bg-primary-600 text-white px-6 py-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </button>
          </div>

          {response && (
            <div className="neumorphic-inset p-4">
              <h4 className="font-semibold text-gray-100 mb-2">AI Assistant Response</h4>
              <p className="text-gray-300 mb-4">{response.answer}</p>
              
              {response.recommendations && response.recommendations.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-gray-200 mb-2">Recommended Workshops:</h5>
                  {response.recommendations.map((rec, index) => (
                    <div key={index} className="bg-dark-700 p-3 rounded-lg mb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h6 className="font-medium text-primary-400">{rec.workshop_name}</h6>
                          <p className="text-sm text-gray-400">{rec.time_slot} • {rec.difficulty_level}</p>
                          <p className="text-sm text-gray-300 mt-1">{rec.reason}</p>
                        </div>
                        <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">
                          {Math.round(rec.relevance_score * 100)}% match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {response.suggested_actions && response.suggested_actions.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-200 mb-2">Suggested Actions:</h5>
                  <ul className="list-disc list-inside text-gray-300 text-sm">
                    {response.suggested_actions.map((action, index) => (
                      <li key={index}>{action}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-4 text-xs text-gray-500">
                Confidence: {Math.round(response.confidence * 100)}%
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'workshops' && (
        <div className="space-y-4">
          <button
            onClick={handleGetRecommendations}
            disabled={loading}
            className="neumorphic-button bg-primary-600 text-white px-6 py-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                Getting Recommendations...
              </>
            ) : (
              <>
                <BookOpen className="mr-2" size={16} />
                Get Workshop Recommendations
              </>
            )}
          </button>

          {recommendations.length > 0 && (
            <div className="grid gap-4">
              <h4 className="font-semibold text-gray-100">Recommended Workshops for You</h4>
              {recommendations.map((rec, index) => (
                <div key={index} className="neumorphic-inset p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-primary-400 text-lg">{rec.workshop_name}</h5>
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm">
                      {Math.round(rec.relevance_score * 100)}% match
                    </span>
                  </div>
                  <p className="text-gray-400 mb-2">{rec.time_slot} • Level: {rec.difficulty_level}</p>
                  <p className="text-gray-300">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="neumorphic-inset p-4">
          <h4 className="font-semibold text-gray-100 mb-4">Personalized Agenda</h4>
          <p className="text-gray-400 mb-4">
            Based on your profile and interests, here's your recommended 3-day agenda:
          </p>
          
          <div className="space-y-4">
            <div className="bg-dark-700 p-4 rounded-lg">
              <h5 className="font-medium text-primary-400 mb-2">Day 1 - November 15, 2025</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">9:00-12:00</span>
                  <span className="text-gray-200">Introduction to Quantum Computing Workshop</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">12:00-13:00</span>
                  <span className="text-gray-200">Lunch & Networking</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">13:00-14:00</span>
                  <span className="text-gray-200">Keynote: Future of AI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">14:00-17:00</span>
                  <span className="text-gray-200">GenAI for Business Applications Workshop</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">18:00-20:00</span>
                  <span className="text-gray-200">Welcome Reception</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-700 p-4 rounded-lg">
              <h5 className="font-medium text-primary-400 mb-2">Day 2 - November 16, 2025</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">9:00-12:00</span>
                  <span className="text-gray-200">Quantum Machine Learning Fundamentals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">14:00-17:00</span>
                  <span className="text-gray-200">Building LLM Applications Workshop</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">18:00-20:00</span>
                  <span className="text-gray-200">Industry Mixer</span>
                </div>
              </div>
            </div>

            <div className="bg-dark-700 p-4 rounded-lg">
              <h5 className="font-medium text-primary-400 mb-2">Day 3 - November 17, 2025</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">9:00-12:00</span>
                  <span className="text-gray-200">AI Ethics and Governance</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">15:00-16:30</span>
                  <span className="text-gray-200">Future of Quantum Computing Panel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">17:00-19:00</span>
                  <span className="text-gray-200">Startup Showcase</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
