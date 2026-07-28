import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const WARDEN_NAV = [
  { to: '/warden', label: 'Dashboard', end: true },
  { to: '/warden/food', label: 'Food' },
  { to: '/warden/needs', label: 'Needs' },
  { to: '/warden/updates', label: 'Project' },
  { to: '/warden/tasks', label: 'Task' },
  { to: '/warden/donations', label: 'Active Donations' },
] as const;

export function WardenNav({ className }: { className?: string }) {
  return (
    <nav className={cn('msc-header-nav', className)} aria-label="Social worker modules">
      <ul className="msc-header-nav-list">
        {WARDEN_NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) => cn(isActive && 'is-active')}
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
