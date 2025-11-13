'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Clock
} from 'lucide-react';

interface OutlookStatus {
  configured: boolean;
  features: {
    calendarSync: boolean;
    contactSearch: boolean;
    meetingCreation: boolean;
    emailInvitations: boolean;
  };
  requiredEnvVars: string[];
}

interface SyncResult {
  hostId: string;
  hostName: string;
  email: string;
  eventsFound?: number;
  availableSlots?: number;
  success: boolean;
  error?: string;
}

interface SyncResponse {
  totalHosts: number;
  syncedSuccessfully: number;
  totalAvailableSlots: number;
  results: SyncResult[];
  message: string;
}

export default function OutlookIntegration() {
  const [status, setStatus] = useState<OutlookStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    checkOutlookStatus();
  }, []);

  const checkOutlookStatus = async () => {
    try {
      const response = await fetch('/api/outlook/status');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to check Outlook status:', err);
      setError('Failed to check Outlook integration status');
    }
  };

  const connectToOutlook = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/outlook/auth');
      const data = await response.json();

      if (data.success) {
        // Open Outlook auth in new window
        const authWindow = window.open(
          data.data.authUrl,
          'outlook-auth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // Listen for auth completion
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            // In a real implementation, you'd handle the callback properly
            setIsConnected(true);
            setAccessToken('demo-token'); // This would come from the callback
          }
        }, 1000);
      } else {
        setError(data.error || 'Failed to get Outlook authorization URL');
      }
    } catch (err) {
      setError('Failed to connect to Outlook');
    } finally {
      setIsLoading(false);
    }
  };

  const syncAllHostCalendars = async () => {
    if (!accessToken) {
      setError('Please connect to Outlook first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/outlook/sync-all-hosts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();

      if (data.success) {
        setSyncResults(data.data);
      } else {
        setError(data.error || 'Failed to sync host calendars');
      }
    } catch (err) {
      setError('Failed to sync calendars from Outlook');
    } finally {
      setIsLoading(false);
    }
  };

  const searchContacts = async (query: string) => {
    if (!accessToken) {
      setError('Please connect to Outlook first');
      return;
    }

    try {
      const response = await fetch('/api/outlook/search-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, accessToken }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Found contacts:', data.data.contacts);
        // Handle contact search results
      } else {
        setError(data.error || 'Failed to search contacts');
      }
    } catch (err) {
      setError('Failed to search Outlook contacts');
    }
  };

  if (!status) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-6 w-6 text-blue-600" />
            <CardTitle>Outlook Integration</CardTitle>
          </div>
          <CardDescription>Loading integration status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="h-6 w-6 text-blue-600" />
              <CardTitle>Microsoft Outlook Integration</CardTitle>
            </div>
            <Badge variant={status.configured ? "default" : "secondary"}>
              {status.configured ? "Configured" : "Not Configured"}
            </Badge>
          </div>
          <CardDescription>
            Connect with Microsoft Outlook to sync calendars, contacts, and create meetings automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Configuration Status */}
          {!status.configured && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Outlook integration requires Azure App Registration. Please configure the following environment variables:
                <ul className="mt-2 list-disc list-inside">
                  {status.requiredEnvVars.map((envVar) => (
                    <li key={envVar} className="text-sm font-mono">{envVar}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Features */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm">Calendar Sync</span>
              {status.features.calendarSync && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm">Contact Search</span>
              {status.features.contactSearch && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <span className="text-sm">Meeting Creation</span>
              {status.features.meetingCreation && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-green-600" />
              <span className="text-sm">Email Invitations</span>
              {status.features.emailInvitations && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
          </div>

          <Separator />

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm">
                {isConnected ? 'Connected to Outlook' : 'Not connected'}
              </span>
            </div>
            
            {status.configured && (
              <Button
                onClick={connectToOutlook}
                disabled={isLoading || isConnected}
                variant={isConnected ? "outline" : "default"}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-2" />
                )}
                {isConnected ? 'Connected' : 'Connect to Outlook'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar Sync Card */}
      {isConnected && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Calendar Synchronization</CardTitle>
              </div>
              <Button
                onClick={syncAllHostCalendars}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync All Host Calendars
              </Button>
            </div>
            <CardDescription>
              Sync host availability from their Outlook calendars to improve quantum scheduling accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncResults && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{syncResults.totalHosts}</div>
                    <div className="text-sm text-gray-600">Total Hosts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{syncResults.syncedSuccessfully}</div>
                    <div className="text-sm text-gray-600">Synced Successfully</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{syncResults.totalAvailableSlots}</div>
                    <div className="text-sm text-gray-600">Available Slots</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Sync Results</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {syncResults.results.map((result) => (
                      <div
                        key={result.hostId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">{result.hostName}</div>
                            <div className="text-sm text-gray-600">{result.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {result.success ? (
                            <div className="text-sm">
                              <div>{result.eventsFound} events</div>
                              <div className="text-green-600">{result.availableSlots} slots</div>
                            </div>
                          ) : (
                            <div className="text-sm text-red-600">Failed</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Integration Benefits</CardTitle>
          <CardDescription>
            How Outlook integration enhances your World Congress system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Real-time Availability</span>
              </div>
              <p className="text-sm text-gray-600">
                Sync actual host calendars to get real availability data instead of manual input
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">Guest Information</span>
              </div>
              <p className="text-sm text-gray-600">
                Import attendee details and preferences from existing Outlook contacts
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Automatic Invites</span>
              </div>
              <p className="text-sm text-gray-600">
                Create calendar events automatically after quantum optimization completes
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Two-way Sync</span>
              </div>
              <p className="text-sm text-gray-600">
                Keep Outlook and the quantum system synchronized for real-time updates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
