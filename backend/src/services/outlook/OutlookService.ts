/**
 * Microsoft Outlook Integration Service
 * Provides calendar sync, contact management, and meeting creation via Microsoft Graph API
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Calendar, Event, Contact, User } from '@microsoft/microsoft-graph-types';
import { logger } from '../../utils/logger';
import { Host, HostAvailability, TimeSlot } from '@agenda-manager/shared';

interface OutlookConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
}

interface OutlookCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    status: {
      response: 'none' | 'accepted' | 'declined' | 'tentativelyAccepted';
    };
  }>;
  location?: {
    displayName: string;
  };
  body?: {
    content: string;
    contentType: 'text' | 'html';
  };
}

interface OutlookContact {
  id: string;
  displayName: string;
  emailAddresses: Array<{
    address: string;
    name: string;
  }>;
  companyName?: string;
  jobTitle?: string;
  businessPhones?: string[];
  mobilePhone?: string;
}

export class OutlookService {
  private msalApp: ConfidentialClientApplication;
  private graphClient: Client | null = null;
  private config: OutlookConfig;

  constructor() {
    this.config = {
      clientId: process.env.OUTLOOK_CLIENT_ID || '',
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
      tenantId: process.env.OUTLOOK_TENANT_ID || '',
      redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3001/api/outlook/callback'
    };

    this.msalApp = new ConfidentialClientApplication({
      auth: {
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        authority: `https://login.microsoftonline.com/${this.config.tenantId}`
      }
    });
  }

  /**
   * Initialize Graph client with access token
   */
  async initializeGraphClient(accessToken: string): Promise<void> {
    const authProvider: AuthenticationProvider = {
      getAccessToken: async () => accessToken
    };

    this.graphClient = Client.initWithMiddleware({ authProvider });
    logger.info('Outlook Graph client initialized');
  }

  /**
   * Get Microsoft OAuth authorization URL
   */
  async getAuthUrl(): Promise<string> {
    const authCodeUrlParameters = {
      scopes: [
        'https://graph.microsoft.com/Calendars.ReadWrite',
        'https://graph.microsoft.com/Contacts.Read',
        'https://graph.microsoft.com/User.Read',
        'https://graph.microsoft.com/Mail.Send'
      ],
      redirectUri: this.config.redirectUri,
    };

    return await this.msalApp.getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(authCode: string): Promise<string> {
    try {
      const tokenRequest = {
        code: authCode,
        scopes: [
          'https://graph.microsoft.com/Calendars.ReadWrite',
          'https://graph.microsoft.com/Contacts.Read',
          'https://graph.microsoft.com/User.Read',
          'https://graph.microsoft.com/Mail.Send'
        ],
        redirectUri: this.config.redirectUri,
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);
      return response.accessToken;
    } catch (error) {
      logger.error('Failed to get access token:', error);
      throw new Error('Outlook authentication failed');
    }
  }

  /**
   * Get user's calendar events for availability sync
   */
  async getCalendarEvents(userEmail: string, startDate: string, endDate: string): Promise<OutlookCalendarEvent[]> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      const events = await this.graphClient
        .api(`/users/${userEmail}/calendar/events`)
        .filter(`start/dateTime ge '${startDate}' and end/dateTime le '${endDate}'`)
        .select('id,subject,start,end,location,attendees,body')
        .get();

      return events.value.map((event: Event) => ({
        id: event.id!,
        subject: event.subject || '',
        start: {
          dateTime: event.start!.dateTime!,
          timeZone: event.start!.timeZone || 'UTC'
        },
        end: {
          dateTime: event.end!.dateTime!,
          timeZone: event.end!.timeZone || 'UTC'
        },
        attendees: event.attendees?.map(attendee => ({
          emailAddress: {
            address: attendee.emailAddress!.address!,
            name: attendee.emailAddress!.name || ''
          },
          status: {
            response: attendee.status!.response as any || 'none'
          }
        })),
        location: event.location ? {
          displayName: event.location.displayName || ''
        } : undefined,
        body: event.body ? {
          content: event.body.content || '',
          contentType: event.body.contentType as 'text' | 'html' || 'text'
        } : undefined
      }));
    } catch (error) {
      logger.error(`Failed to get calendar events for ${userEmail}:`, error);
      throw new Error('Failed to sync calendar events');
    }
  }

  /**
   * Convert Outlook events to host availability
   */
  convertEventsToAvailability(events: OutlookCalendarEvent[], eventDates: string[]): HostAvailability[] {
    const availability: HostAvailability[] = [];

    for (const date of eventDates) {
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.start.dateTime).toISOString().split('T')[0];
        return eventDate === date;
      });

      // Generate available time slots (9 AM to 6 PM, excluding busy times)
      const workingHours = this.generateWorkingHours();
      const availableSlots = this.filterAvailableSlots(workingHours, dayEvents, date);

      availability.push({
        date,
        timeSlots: availableSlots,
        isBlocked: availableSlots.length === 0,
        blockReason: availableSlots.length === 0 ? 'Fully booked in Outlook calendar' : undefined
      });
    }

    return availability;
  }

  /**
   * Create calendar event in Outlook after quantum scheduling
   */
  async createMeetingEvent(
    hostEmail: string,
    attendeeEmails: string[],
    subject: string,
    startTime: string,
    endTime: string,
    location?: string,
    body?: string
  ): Promise<string> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      const event = {
        subject,
        start: {
          dateTime: startTime,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC'
        },
        attendees: attendeeEmails.map(email => ({
          emailAddress: {
            address: email,
            name: email.split('@')[0]
          },
          type: 'required'
        })),
        location: location ? {
          displayName: location
        } : undefined,
        body: body ? {
          content: body,
          contentType: 'html'
        } : undefined,
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };

      const createdEvent = await this.graphClient
        .api(`/users/${hostEmail}/calendar/events`)
        .post(event);

      logger.info(`Created Outlook meeting event: ${createdEvent.id}`);
      return createdEvent.id;
    } catch (error) {
      logger.error('Failed to create Outlook meeting event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Search contacts by email or company name
   */
  async searchContacts(query: string): Promise<OutlookContact[]> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      const contacts = await this.graphClient
        .api('/me/contacts')
        .filter(`contains(displayName,'${query}') or contains(companyName,'${query}') or contains(emailAddresses/any(e:e/address),'${query}')`)
        .select('id,displayName,emailAddresses,companyName,jobTitle,businessPhones,mobilePhone')
        .top(50)
        .get();

      return contacts.value.map((contact: Contact) => ({
        id: contact.id!,
        displayName: contact.displayName || '',
        emailAddresses: contact.emailAddresses || [],
        companyName: contact.companyName || undefined,
        jobTitle: contact.jobTitle || undefined,
        businessPhones: contact.businessPhones || undefined,
        mobilePhone: contact.mobilePhone || undefined
      }));
    } catch (error) {
      logger.error(`Failed to search contacts for query: ${query}`, error);
      throw new Error('Failed to search contacts');
    }
  }

  /**
   * Send meeting invitation email
   */
  async sendMeetingInvitation(
    hostEmail: string,
    attendeeEmail: string,
    subject: string,
    meetingDetails: string
  ): Promise<void> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      const message = {
        subject: `World Congress Meeting: ${subject}`,
        body: {
          contentType: 'html',
          content: `
            <h2>World Congress Meeting Invitation</h2>
            <p>You have been invited to a meeting at the World Congress.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
              ${meetingDetails}
            </div>
            <p>This meeting has been optimized using our quantum scheduling system to find the best time for all participants.</p>
            <p>Best regards,<br>World Congress Organizing Committee</p>
          `
        },
        toRecipients: [{
          emailAddress: {
            address: attendeeEmail
          }
        }]
      };

      await this.graphClient
        .api(`/users/${hostEmail}/sendMail`)
        .post({ message });

      logger.info(`Sent meeting invitation to ${attendeeEmail}`);
    } catch (error) {
      logger.error(`Failed to send meeting invitation to ${attendeeEmail}:`, error);
      throw new Error('Failed to send meeting invitation');
    }
  }

  /**
   * Generate standard working hours (9 AM - 6 PM)
   */
  private generateWorkingHours(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      slots.push({
        date: '', // Will be set by caller
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }
    return slots;
  }

  /**
   * Filter available time slots based on existing calendar events
   */
  private filterAvailableSlots(
    workingHours: TimeSlot[],
    busyEvents: OutlookCalendarEvent[],
    date: string
  ): TimeSlot[] {
    return workingHours.filter(slot => {
      const slotStart = new Date(`${date}T${slot.startTime}:00Z`);
      const slotEnd = new Date(`${date}T${slot.endTime}:00Z`);

      // Check if this slot conflicts with any busy event
      return !busyEvents.some(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        // Check for overlap
        return (slotStart < eventEnd && slotEnd > eventStart);
      });
    }).map(slot => ({ ...slot, date }));
  }

  /**
   * Check if Outlook integration is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.tenantId
    );
  }
}
