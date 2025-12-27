import { Home, Cloud, Sprout, DollarSign, Settings, LogOut, MapPin, FileText, TrendingUp, MessageSquare, Users, ClipboardList, LayoutDashboard, Video, Bell } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { supabase } from '@/integrations/supabase/client';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Fazendas', url: '/fazendas', icon: MapPin },
  { title: 'Clima', url: '/clima', icon: Cloud },
  { title: 'Talhões & Plantio', url: '/talhoes', icon: Sprout },
  { title: 'Preços', url: '/precos', icon: TrendingUp },
  { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
  { title: 'Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Fala Agrônomo', url: '/fala-agronomo', icon: MessageSquare },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

const adminItems = [
  { title: 'Visão Geral', url: '/admin', icon: LayoutDashboard },
  { title: 'Parceiros', url: '/admin/parceiros', icon: Users },
  { title: 'Conteúdo', url: '/admin/conteudo', icon: FileText },
  { title: 'Vídeos', url: '/admin/videos', icon: Video },
  { title: 'Fala Agrônomo', url: '/admin/fala-agronomo', icon: MessageSquare },
  { title: 'Auditoria', url: '/admin/auditoria', icon: ClipboardList },
  { title: 'Alertas', url: '/admin/alertas', icon: Bell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const collapsed = state === 'collapsed';
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    async function checkSystemAdmin() {
      if (!user) return;
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'system_admin'
      });
      setIsSystemAdmin(!!data);
    }
    checkSystemAdmin();
  }, [user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Sprout className="h-6 w-6 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-lg">Bom Campo</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSystemAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive ? 'bg-muted text-primary font-medium' : 'hover:bg-muted/50'
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-4">
        <Button variant="ghost" onClick={signOut} className="w-full justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
