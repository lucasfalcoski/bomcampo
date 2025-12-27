import { useState } from 'react';
import { Home, MapPin, Cloud, Sprout, MoreHorizontal, Sprout as Logo, TrendingUp, DollarSign, FileText, Settings, ChevronRight } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

const navItems = [
  { label: 'Dashboard', to: '/', icon: Home, exact: true },
  { label: 'Fazendas', to: '/fazendas', icon: MapPin },
  { label: 'Clima', to: '/clima', icon: Cloud },
  { label: 'Talhões', to: '/talhoes', icon: Sprout },
  { label: 'Mais', to: '/mais', icon: MoreHorizontal, isMore: true },
];

const moreItems = [
  { label: 'Preços', to: '/precos', icon: TrendingUp, description: 'Cotações de commodities' },
  { label: 'Financeiro', to: '/financeiro', icon: DollarSign, description: 'Gestão de custos e receitas' },
  { label: 'Relatórios', to: '/relatorios', icon: FileText, description: 'Análises e exportações' },
  { label: 'Configurações', to: '/configuracoes', icon: Settings, description: 'Preferências do app' },
];

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
}

function isMoreActive(pathname: string) {
  return moreItems.some(item => isActive(pathname, item.to));
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
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.isMore) {
      e.preventDefault();
      setMoreOpen(true);
    }
  };

  const handleMoreItemClick = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border">
        <div className="grid grid-cols-5 h-16 pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const active = item.isMore ? isMoreActive(pathname) : isActive(pathname, item.to, item.exact);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => handleNavClick(item, e)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-xs transition-all relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {/* Active indicator background */}
                <div className={cn(
                  "flex items-center justify-center rounded-full p-1.5 transition-colors",
                  active ? "bg-primary/15" : "bg-transparent"
                )}>
                  <item.icon className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-110"
                  )} />
                </div>
                <span className={cn(
                  "leading-none transition-colors",
                  active && "font-medium"
                )}>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Bottom Sheet for "Mais" */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="pb-[env(safe-area-inset-bottom)]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Mais opções</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {moreItems.map((item) => {
              const active = isActive(pathname, item.to);
              return (
                <button
                  key={item.to}
                  onClick={() => handleMoreItemClick(item.to)}
                  className={cn(
                    "w-full flex items-center gap-4 p-3 rounded-lg transition-colors text-left",
                    active ? "bg-primary/10" : "hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-lg",
                    active ? "bg-primary/20" : "bg-muted"
                  )}>
                    <item.icon className={cn(
                      "h-5 w-5",
                      active ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium",
                      active ? "text-primary" : "text-foreground"
                    )}>{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
