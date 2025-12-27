import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video } from 'lucide-react';

export default function Videos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      if (!user) return;
      
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'system_admin'
      });
      
      if (!data) {
        navigate('/');
        return;
      }
      
      setIsSystemAdmin(true);
    }
    
    checkAccess();
  }, [user, navigate]);

  if (!isSystemAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vídeos</h1>
        <p className="text-muted-foreground">Gerenciamento de vídeos técnicos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Módulo de Vídeos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta seção será expandida em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
