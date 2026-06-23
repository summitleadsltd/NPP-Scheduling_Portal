import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getGoogleAuthUrl, disconnectGoogleCalendar, getCalendarSyncLogs } from '@/services/googleCalendarService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatEST } from '@/lib/timezone';
import { Calendar, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import type { CalendarSyncLog } from '@/types/database';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function GoogleCalendarSettings() {
  const { profile, refreshProfile } = useAuthStore();
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncLogs, setSyncLogs] = useState<CalendarSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (profile?.calendar_connected) {
      loadSyncLogs();
    }
  }, [profile?.calendar_connected]);

  const loadSyncLogs = async () => {
    if (!profile) return;
    setLoadingLogs(true);
    try {
      const logs = await getCalendarSyncLogs(profile.id, 10);
      setSyncLogs(logs);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleConnect = () => {
    const authUrl = getGoogleAuthUrl(profile?.id);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!profile) return;
    setDisconnecting(true);
    try {
      await disconnectGoogleCalendar(profile.id);
      await refreshProfile();
      toast.success('Google Calendar disconnected');
    } catch {
      toast.error('Failed to disconnect calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = profile?.calendar_connected;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-medium">
                {isConnected ? 'Connected' : 'Not Connected'}
              </p>
              {isConnected && profile?.google_calendar_id && (
                <p className="text-sm text-muted-foreground">
                  Calendar: {profile.google_calendar_id}
                </p>
              )}
              {isConnected && profile?.google_token_expires_at && (
                <p className="text-xs text-muted-foreground">
                  Token expires: {formatEST(profile.google_token_expires_at, 'MMM d, h:mm a')}
                </p>
              )}
            </div>
          </div>
          <div>
            {isConnected ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleConnect}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reconnect
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect}>
                Connect Calendar
              </Button>
            )}
          </div>
        </div>

        {/* How it works */}
        {!isConnected && (
          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Connect your Google account to sync appointments</li>
              <li>New bookings automatically create Google Calendar events</li>
              <li>Rescheduled appointments update your calendar</li>
              <li>Cancelled appointments are removed from your calendar</li>
              <li>Scheduling engine reads your calendar to avoid conflicts</li>
            </ul>
          </div>
        )}

        {/* Sync Logs */}
        {isConnected && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Recent Sync Activity</h4>
              <Button variant="ghost" size="sm" onClick={loadSyncLogs} disabled={loadingLogs}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            {syncLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sync activity yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {syncLogs.map((log) => (
                  <div key={log.id} className="p-2 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-green-400' :
                        log.status === 'failed' ? 'bg-red-400' : 'bg-yellow-400'
                      }`} />
                      <span className="font-medium capitalize">{log.action}</span>
                      {log.details && (
                        <span className="text-muted-foreground truncate max-w-[200px]">{log.details}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {formatEST(log.created_at, 'MMM d, h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
