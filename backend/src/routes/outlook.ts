/**
 * Outlook Integration API Routes
 * Handles Microsoft Graph API authentication and calendar/contact sync
 */

import { Router, Request, Response } from 'express';
import { OutlookService } from '../services/outlook/OutlookService';
import { HostModel } from '../models/Host';
import { MeetingRequestModel } from '../models/MeetingRequest';
import { ScheduledMeetingModel } from '../models/ScheduledMeeting';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';

const router = Router();

// Only instantiate OutlookService if credentials are configured
let outlookService: OutlookService | null = null;
try {
  if (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET && process.env.OUTLOOK_TENANT_ID) {
    outlookService = new OutlookService();
  } else {
    logger.warn('Outlook integration disabled - missing Azure credentials');
  }
} catch (error) {
  logger.error('Failed to initialize Outlook service:', error);
}

// Middleware to check if Outlook is configured
const requireOutlook = (req: Request, res: Response, next: Function) => {
  if (!outlookService) {
    res.status(503).json({
      success: false,
      error: 'Outlook integration is not configured. Please provide Azure AD credentials.'
    });
    return;
  }
  next();
};

/**
 * GET /api/outlook/auth
 * Get Outlook authorization URL for OAuth flow
 */
router.get('/auth', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    if (!outlookService!.isConfigured()) {
      res.status(400).json({
        success: false,
        error: 'Outlook integration not configured. Please set environment variables.'
      });
      return;
    }

    const authUrl = outlookService!.getAuthUrl();
    
    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Redirect user to this URL for Outlook authentication'
      }
    });
  } catch (error) {
    logger.error('Failed to get Outlook auth URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Outlook authentication'
    });
  }
}));

/**
 * GET /api/outlook/callback
 * Handle OAuth callback from Microsoft
 */
router.get('/callback', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, error } = req.query;

    if (error) {
      logger.error('Outlook OAuth error:', error);
      res.status(400).json({
        success: false,
        error: `Outlook authentication failed: ${error}`
      });
      return;
    }

    if (!code) {
      res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      });
      return;
    }

    const accessToken = await outlookService!.getAccessToken(code as string);
    await outlookService!.initializeGraphClient(accessToken);

    // Store token securely (in production, use encrypted storage)
    // For demo purposes, we'll store in session or return to frontend
    
    res.json({
      success: true,
      data: {
        message: 'Outlook authentication successful',
        accessToken: accessToken.substring(0, 20) + '...' // Don't expose full token
      }
    });
  } catch (error) {
    logger.error('Outlook callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete Outlook authentication'
    });
  }
}));

/**
 * POST /api/outlook/sync-host-calendar
 * Sync a host's Outlook calendar to update availability
 */
router.post('/sync-host-calendar', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { hostId, accessToken, startDate, endDate } = req.body;

    if (!hostId || !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Host ID and access token are required'
      });
      return;
    }

    // Find the host
    const host = await HostModel.findById(hostId);
    if (!host) {
      res.status(404).json({
        success: false,
        error: 'Host not found'
      });
      return;
    }

    // Initialize Outlook service
    await outlookService!.initializeGraphClient(accessToken);

    // Get calendar events
    const events = await outlookService!.getCalendarEvents(
      host.email,
      startDate || '2025-11-15T00:00:00Z',
      endDate || '2025-11-19T23:59:59Z'
    );

    // Convert to availability format
    const eventDates = ['2025-11-15', '2025-11-16', '2025-11-17', '2025-11-18', '2025-11-19'];
    const availability = outlookService!.convertEventsToAvailability(events, eventDates);

    // Update host availability
    host.availability = availability;
    await host.save();

    logger.info(`Synced calendar for host ${host.name}: ${events.length} events processed`);

    res.json({
      success: true,
      data: {
        hostId: host.id,
        hostName: host.name,
        eventsFound: events.length,
        availability: availability,
        message: 'Host calendar synced successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to sync host calendar:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendar from Outlook'
    });
  }
}));

/**
 * POST /api/outlook/search-contacts
 * Search for contacts in Outlook
 */
router.post('/search-contacts', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, accessToken } = req.body;

    if (!query || !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Search query and access token are required'
      });
      return;
    }

    await outlookService!.initializeGraphClient(accessToken);
    const contacts = await outlookService!.searchContacts(query);

    res.json({
      success: true,
      data: {
        query,
        contacts,
        count: contacts.length
      }
    });
  } catch (error) {
    logger.error('Failed to search Outlook contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search contacts'
    });
  }
}));

/**
 * POST /api/outlook/create-meeting
 * Create a meeting in Outlook calendar after quantum optimization
 */
router.post('/create-meeting', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { meetingId, accessToken } = req.body;

    if (!meetingId || !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Meeting ID and access token are required'
      });
      return;
    }

    // Get the scheduled meeting
    const scheduledMeeting = await ScheduledMeetingModel.findById(meetingId);
    if (!scheduledMeeting) {
      res.status(404).json({
        success: false,
        error: 'Scheduled meeting not found'
      });
      return;
    }

    // Get related data
    const [meetingRequest, host] = await Promise.all([
      MeetingRequestModel.findById(scheduledMeeting.requestId),
      HostModel.findById(scheduledMeeting.hostId)
    ]);

    if (!meetingRequest || !host) {
      res.status(404).json({
        success: false,
        error: 'Meeting request or host not found'
      });
      return;
    }

    await outlookService!.initializeGraphClient(accessToken);

    // Create calendar event
    const startDateTime = `${scheduledMeeting.timeSlot.date}T${scheduledMeeting.timeSlot.startTime}:00Z`;
    const endDateTime = `${scheduledMeeting.timeSlot.date}T${scheduledMeeting.timeSlot.endTime}:00Z`;

    const eventId = await outlookService!.createMeetingEvent(
      host.email,
      [meetingRequest.contactEmail],
      `World Congress Meeting: ${meetingRequest.companyName}`,
      startDateTime,
      endDateTime,
      scheduledMeeting.location || 'World Congress Venue',
      `
        <h3>Meeting Details</h3>
        <p><strong>Company:</strong> ${meetingRequest.companyName}</p>
        <p><strong>Contact:</strong> ${meetingRequest.contactName}</p>
        <p><strong>Meeting Type:</strong> ${meetingRequest.meetingType}</p>
        <p><strong>Topics:</strong> ${meetingRequest.requestedTopics.join(', ')}</p>
        <p><strong>Host:</strong> ${host.name} (${host.role})</p>
        <hr>
        <p><em>This meeting was optimized using quantum scheduling algorithms to find the best time for all participants.</em></p>
      `
    );

    // Update scheduled meeting with Outlook event ID
    if (!scheduledMeeting.metadata) {
      scheduledMeeting.metadata = {};
    }
    scheduledMeeting.metadata = {
      ...scheduledMeeting.metadata,
      outlookEventId: eventId
    };
    await scheduledMeeting.save();

    // Send invitation email
    await outlookService!.sendMeetingInvitation(
      host.email,
      meetingRequest.contactEmail,
      `${meetingRequest.companyName} Meeting`,
      `
        <p><strong>Date:</strong> ${scheduledMeeting.timeSlot.date}</p>
        <p><strong>Time:</strong> ${scheduledMeeting.timeSlot.startTime} - ${scheduledMeeting.timeSlot.endTime}</p>
        <p><strong>Location:</strong> ${scheduledMeeting.location || 'World Congress Venue'}</p>
        <p><strong>Host:</strong> ${host.name}</p>
      `
    );

    logger.info(`Created Outlook meeting for ${meetingRequest.companyName} with event ID: ${eventId}`);

    res.json({
      success: true,
      data: {
        meetingId: scheduledMeeting.id,
        outlookEventId: eventId,
        hostEmail: host.email,
        attendeeEmail: meetingRequest.contactEmail,
        message: 'Meeting created in Outlook and invitation sent'
      }
    });
  } catch (error) {
    logger.error('Failed to create Outlook meeting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create meeting in Outlook'
    });
  }
}));

/**
 * GET /api/outlook/sync-all-hosts
 * Sync all hosts' calendars from Outlook
 */
router.post('/sync-all-hosts', requireOutlook, asyncHandler(async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
      return;
    }

    const hosts = await HostModel.find({ isActive: true });
    await outlookService!.initializeGraphClient(accessToken);

    const syncResults = [];
    const eventDates = ['2025-11-15', '2025-11-16', '2025-11-17', '2025-11-18', '2025-11-19'];

    for (const host of hosts) {
      try {
        const events = await outlookService!.getCalendarEvents(
          host.email,
          '2025-11-15T00:00:00Z',
          '2025-11-19T23:59:59Z'
        );

        const availability = outlookService!.convertEventsToAvailability(events, eventDates);
        host.availability = availability;
        await host.save();

        syncResults.push({
          hostId: host.id,
          hostName: host.name,
          email: host.email,
          eventsFound: events.length,
          availableSlots: availability.reduce((total, day) => total + day.timeSlots.length, 0),
          success: true
        });

        logger.info(`Synced calendar for ${host.name}: ${events.length} events`);
      } catch (error: any) {
        logger.error(`Failed to sync calendar for ${host.name}:`, error);
        syncResults.push({
          hostId: host.id,
          hostName: host.name,
          email: host.email,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const totalSlots = syncResults
      .filter(r => r.success)
      .reduce((total, r) => total + (r.availableSlots || 0), 0);

    res.json({
      success: true,
      data: {
        totalHosts: hosts.length,
        syncedSuccessfully: successCount,
        totalAvailableSlots: totalSlots,
        results: syncResults,
        message: `Synced ${successCount}/${hosts.length} host calendars successfully`
      }
    });
  } catch (error) {
    logger.error('Failed to sync all host calendars:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync host calendars'
    });
  }
}));

/**
 * GET /api/outlook/status
 * Check Outlook integration status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      configured: outlookService ? outlookService!.isConfigured() : false,
      features: {
        calendarSync: !!outlookService,
        contactSearch: !!outlookService,
        meetingCreation: !!outlookService,
        emailInvitations: !!outlookService
      },
      requiredEnvVars: [
        'OUTLOOK_CLIENT_ID',
        'OUTLOOK_CLIENT_SECRET',
        'OUTLOOK_TENANT_ID',
        'OUTLOOK_REDIRECT_URI'
      ]
    }
  });
}));

export default router;
