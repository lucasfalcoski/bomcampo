import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sprout, MapPin, Bell, CheckCircle, ArrowRight, Smartphone } from 'lucide-react';

interface OnboardingWizardProps {
  hasFarms: boolean;
  hasPlots: boolean;
  pushEnabled: boolean | null;
  onRequestPush: () => Promise<boolean>;
  onComplete: () => void;
}

export function OnboardingWizard({
  hasFarms,
  hasPlots,
  pushEnabled,
  onRequestPush,
  onComplete,
}: OnboardingWizardProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [pushRequested, setPushRequested] = useState(false);

  // Detect if user is on desktop (not mobile/tablet)
  const isDesktop = typeof window !== 'undefined' && 
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleEnablePush = async () => {
    setPushRequested(true);
    await onRequestPush();
  };

  const handleSkipPush = () => {
    setPushRequested(true);
  };

  const handleComplete = () => {
    onComplete();
  };

  const steps = [
    {
      id: 1,
      title: 'Bem-vindo ao Bom Campo!',
      description: 'Vamos configurar sua conta em poucos passos',
      icon: Sprout,
      completed: true,
    },
    {
      id: 2,
      title: 'Cadastre sua Fazenda',
      description: 'Adicione sua primeira propriedade rural',
      icon: MapPin,
      completed: hasFarms,
    },
    {
      id: 3,
      title: 'Ative os Alertas',
      description: 'Receba notificações sobre clima e atividades',
      icon: Bell,
      completed: pushEnabled === true || pushRequested,
    },
  ];

  const currentStep = steps.find(s => s.id === step);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          {/* Progress indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((s) => (
              <div
                key={s.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  s.id < step
                    ? 'bg-primary'
                    : s.id === step
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {currentStep && (
            <>
              <div className="flex justify-center mb-4">
                <div className="bg-primary/10 p-4 rounded-2xl">
                  <currentStep.icon className="h-12 w-12 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">{currentStep.title}</CardTitle>
              <CardDescription className="text-base">
                {currentStep.description}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Instale no seu celular</p>
                    <p className="text-xs text-muted-foreground">
                      Adicione à tela inicial para acesso rápido
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Alertas em tempo real</p>
                    <p className="text-xs text-muted-foreground">
                      Receba notificações sobre clima e atividades
                    </p>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep(2)}>
                Começar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Create Farm */}
          {step === 2 && (
            <div className="space-y-4">
              {hasFarms ? (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-sm">Fazenda cadastrada!</p>
                    <p className="text-xs text-muted-foreground">
                      Você já possui uma fazenda configurada
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    Para começar a usar o Bom Campo, você precisa cadastrar pelo menos uma fazenda. 
                    Isso permite que o sistema monitore o clima e envie alertas para sua região.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {!hasFarms && (
                  <Button
                    className="flex-1"
                    onClick={() => navigate('/fazendas')}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Cadastrar Fazenda
                  </Button>
                )}
                <Button
                  variant={hasFarms ? 'default' : 'outline'}
                  className={hasFarms ? 'flex-1' : ''}
                  onClick={() => setStep(3)}
                  disabled={!hasFarms}
                >
                  {hasFarms ? (
                    <>
                      Continuar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  ) : (
                    'Pular'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Push Notifications */}
          {step === 3 && (
            <div className="space-y-4">
              {pushEnabled === true ? (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium text-sm">Notificações ativadas!</p>
                    <p className="text-xs text-muted-foreground">
                      Você receberá alertas climáticos e lembretes
                    </p>
                  </div>
                </div>
              ) : pushEnabled === false && pushRequested ? (
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <p className="text-sm">
                    Notificações bloqueadas. Você pode ativá-las depois nas configurações do navegador.
                  </p>
                </div>
              ) : isDesktop ? (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg mt-0.5">
                      <Smartphone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Notificações no celular</p>
                      <p className="text-sm text-muted-foreground">
                        As notificações funcionam melhor no celular Android com o app instalado.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Ative as notificações para receber:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Alertas de chuva e geada</li>
                    <li>• Lembretes de atividades programadas</li>
                    <li>• Janelas de pulverização favoráveis</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                {pushEnabled !== true && !pushRequested && !isDesktop && (
                  <>
                    <Button className="flex-1" onClick={handleEnablePush}>
                      <Bell className="h-4 w-4 mr-2" />
                      Ativar Alertas
                    </Button>
                    <Button variant="outline" onClick={handleSkipPush}>
                      Depois
                    </Button>
                  </>
                )}
                {isDesktop && pushEnabled !== true && (
                  <Button className="w-full" onClick={handleComplete}>
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                {(pushEnabled === true || pushRequested) && !isDesktop && (
                  <Button className="w-full" onClick={handleComplete}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Concluir Configuração
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step indicator */}
          <div className="pt-4 border-t">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Passo {step} de 3</span>
              <Badge variant="outline" className="text-xs">
                Plano Produtor
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
