import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sprout } from 'lucide-react';
import { loginSchema, signupSchema, getFirstError } from '@/lib/validation/schemas';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; nome?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (isLogin) {
      const emailError = getFirstError(loginSchema.shape.email, email);
      const passwordError = getFirstError(loginSchema.shape.password, password);
      if (emailError) newErrors.email = emailError;
      if (passwordError) newErrors.password = passwordError;
    } else {
      const nomeError = getFirstError(signupSchema.shape.nome, nome);
      const emailError = getFirstError(signupSchema.shape.email, email);
      const passwordError = getFirstError(signupSchema.shape.password, password);
      if (nomeError) newErrors.nome = nomeError;
      if (emailError) newErrors.email = emailError;
      if (passwordError) newErrors.password = passwordError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { nome: nome.trim() },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: 'Cadastro realizado!',
          description: 'Você já pode fazer login.',
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFieldError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-2xl">
              <Sprout className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Bom Campo</CardTitle>
          <CardDescription>
            {isLogin ? 'Faça login na sua conta' : 'Crie sua conta gratuitamente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="João da Silva"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    clearFieldError('nome');
                  }}
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>

            <div className="text-center text-sm">
              {isLogin ? (
                <>
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setErrors({});
                    }}
                    className="text-primary hover:underline"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setErrors({});
                    }}
                    className="text-primary hover:underline"
                  >
                    Faça login
                  </button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
