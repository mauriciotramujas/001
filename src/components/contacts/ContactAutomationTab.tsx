import React, { useState, useEffect } from 'react';
import { ContactFull } from '../ContactsPage';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Bot, Play, Pause, Square, Settings, Zap } from 'lucide-react';
import SimpleBar from 'simplebar-react';

interface ContactAutomationTabProps {
  contact: ContactFull;
  onContactUpdated: () => void;
}

interface BotSession {
  id: string;
  status: 'active' | 'paused' | 'done' | 'abandoned' | 'error';
  current_stage: string | null;
  started_at: string;
  updated_at: string;
  flow_name?: string;
}

export const ContactAutomationTab: React.FC<ContactAutomationTabProps> = ({
  contact,
  onContactUpdated,
}) => {
  const { current } = useInstances();
  const [sessions, setSessions] = useState<BotSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    // Mock de sessões - em produção, buscar de bot.sessions
    const mockSessions: BotSession[] = contact.automation_enabled ? [
      {
        id: '1',
        status: 'active',
        current_stage: 'Coleta de dados',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString(),
        flow_name: 'Onboarding Cliente',
      },
    ] : [];
    
    setSessions(mockSessions);
  }, [contact.automation_enabled]);

  const handleToggleAutomation = async () => {
    if (!current?.WORKSPACE_ID) return;
    
    setToggling(true);
    try {
      const { error } = await supabase
        .schema('crm')
        .from('contacts')
        .update({ automation_enabled: !contact.automation_enabled })
        .eq('id', contact.id)
        .eq('workspace_id', current.WORKSPACE_ID);

      if (error) throw error;
      onContactUpdated();
    } catch (err: any) {
      console.error('Erro ao alterar automação:', err);
    } finally {
      setToggling(false);
    }
  };

  const getSessionStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-emerald-600/20 text-emerald-400',
      paused: 'bg-amber-600/20 text-amber-400',
      done: 'bg-blue-600/20 text-blue-400',
      abandoned: 'bg-gray-600/20 text-gray-400',
      error: 'bg-red-600/20 text-red-400',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Automação</h2>
        <button
          onClick={handleToggleAutomation}
          disabled={toggling}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 ${
            contact.automation_enabled
              ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
              : 'bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a]'
          }`}
        >
          <Bot size={16} />
          <span>
            {toggling 
              ? 'Alterando...' 
              : contact.automation_enabled 
              ? 'Desativar Automação' 
              : 'Ativar Automação'
            }
          </span>
        </button>
      </div>

      {/* Status da automação */}
      <div className="bg-[#1e293b]/30 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            contact.automation_enabled ? 'bg-emerald-400' : 'bg-gray-400'
          }`} />
          <span className="text-white font-medium">
            Automação {contact.automation_enabled ? 'Ativada' : 'Desativada'}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          {contact.automation_enabled 
            ? 'Este contato pode receber mensagens automáticas e participar de fluxos de bot.'
            : 'Este contato não receberá mensagens automáticas.'
          }
        </p>
      </div>

      {/* Sessões ativas */}
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          Sessões do Bot ({sessions.length})
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">Carregando sessões...</p>
          </div>
        ) : (
          <SimpleBar className="h-full">
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-[#1e293b]/30 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {session.flow_name || 'Fluxo sem nome'}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Etapa atual: {session.current_stage || 'Não definida'}
                      </p>
                    </div>
                    {getSessionStatusBadge(session.status)}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Iniciado: {new Date(session.started_at).toLocaleString('pt-BR')}
                    </span>
                    <span>
                      Atualizado: {new Date(session.updated_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  
                  {/* Ações da sessão */}
                  <div className="flex items-center space-x-2 mt-3">
                    {session.status === 'active' && (
                      <button className="flex items-center space-x-1 px-2 py-1 bg-amber-600/20 text-amber-400 rounded text-xs hover:bg-amber-600/30 transition-colors">
                        <Pause size={12} />
                        <span>Pausar</span>
                      </button>
                    )}
                    {session.status === 'paused' && (
                      <button className="flex items-center space-x-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded text-xs hover:bg-emerald-600/30 transition-colors">
                        <Play size={12} />
                        <span>Retomar</span>
                      </button>
                    )}
                    <button className="flex items-center space-x-1 px-2 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30 transition-colors">
                      <Square size={12} />
                      <span>Finalizar</span>
                    </button>
                    <button className="flex items-center space-x-1 px-2 py-1 bg-[#0f172a]/50 text-gray-400 rounded text-xs hover:text-white hover:bg-[#0f172a] transition-colors">
                      <Settings size={12} />
                      <span>Configurar</span>
                    </button>
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bot size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma sessão ativa</p>
                  <p className="text-sm text-center mb-4">
                    {contact.automation_enabled 
                      ? 'Este contato pode iniciar uma nova sessão de automação.'
                      : 'Ative a automação para permitir sessões de bot.'
                    }
                  </p>
                  {contact.automation_enabled && (
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all">
                      <Zap size={16} />
                      <span>Iniciar Nova Sessão</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </SimpleBar>
        )}
      </div>
    </div>
  );
};