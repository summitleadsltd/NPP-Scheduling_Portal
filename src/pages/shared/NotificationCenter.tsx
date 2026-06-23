import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';
import { formatEST } from '@/lib/timezone';

export function NotificationCenter() {
  const { profile } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();

  const load = useCallback(() => {
    if (profile?.id) fetchNotifications(profile.id);
  }, [profile?.id, fetchNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && profile && (
          <Button variant="outline" size="sm" onClick={() => markAllAsRead(profile.id)}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All read'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatEST(n.created_at, 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
