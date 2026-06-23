import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  LayoutDashboard,
  Calendar,
  PlusCircle,
  MapPin,
  Bell,
  Columns3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notificationStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function MobileNav() {
  const { profile } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  if (!profile) return null;

  const getNavItems = (): NavItem[] => {
    const role = profile.role;
    const prefix = role === 'admin' ? '/admin' : `/${role}`;

    switch (role) {
      case 'admin':
        return [
          { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
          { to: `${prefix}/booking`, label: 'Book', icon: PlusCircle },
          { to: `${prefix}/dispatch`, label: 'Dispatch', icon: Columns3 },
          { to: `${prefix}/calendar`, label: 'Calendar', icon: Calendar },
          { to: `${prefix}/notifications`, label: 'Alerts', icon: Bell, badge: unreadCount },
        ];
      case 'manager':
        return [
          { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
          { to: `${prefix}/booking`, label: 'Book', icon: PlusCircle },
          { to: `${prefix}/calendar`, label: 'Calendar', icon: Calendar },
          { to: `${prefix}/dispatch`, label: 'Dispatch', icon: Columns3 },
          { to: `${prefix}/notifications`, label: 'Alerts', icon: Bell, badge: unreadCount },
        ];
      case 'scheduler':
        return [
          { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
          { to: `${prefix}/booking`, label: 'Book', icon: PlusCircle },
          { to: `${prefix}/calendar`, label: 'Calendar', icon: Calendar },
          { to: `${prefix}/notifications`, label: 'Alerts', icon: Bell, badge: unreadCount },
        ];
      case 'technician':
        return [
          { to: `${prefix}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
          { to: `${prefix}/calendar`, label: 'Calendar', icon: Calendar },
          { to: `${prefix}/route`, label: 'Map', icon: MapPin },
          { to: `${prefix}/notifications`, label: 'Alerts', icon: Bell, badge: unreadCount },
        ];
      default:
        return [];
    }
  };

  const items = getNavItems();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-[56px] min-h-[44px] relative',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1 -right-2 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
