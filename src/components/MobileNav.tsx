import { Home, MapPin, Cloud, Sprout, MoreHorizontal, Sprout as Logo } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', to: '/', icon: Home, exact: true },
  { label: 'Fazendas', to: '/fazendas', icon: MapPin },
  { label: 'Clima', to: '/clima', icon: Cloud },
  { label: 'Talhões', to: '/talhoes', icon: Sprout },
  { label: 'Mais', to: '/mais', icon: MoreHorizontal },
];

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
}

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
      <div className="h-14 px-4 flex items-center gap-3 pt-[env(safe-area-inset-top)]">
        <div className="bg-primary/10 p-2 rounded-lg">
          <Logo className="h-5 w-5 text-primary" />
        </div>
        <span className="font-bold text-lg text-foreground">Bom Campo</span>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(pathname, item.to, item.exact);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "text-primary")} />
              <span className="leading-none">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
