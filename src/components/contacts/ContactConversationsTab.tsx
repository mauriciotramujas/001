import React, { useState, useEffect } from 'react';
import { ContactFull } from '../ContactsPage';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { MessageSquare, ExternalLink, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SimpleBar from 'simplebar-react';

interface ContactConversationsTabProps {
  contact: ContactFull;
}

interface ConversationSummary {
  instance_id: string;
  remote_jid: string;
  last_message_at: string | null;
  last_message_text: string | null;
  unread_count: number;
}

export const ContactConversationsTab: React.FC<ContactConversationsTabProps> = ({
  contact,
}) => {
  const navigate = useNavigate();
  const { current } = useInstances();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!current?.WORKSPACE_ID || !contact.identities.length) return;
    
    setLoading(true);
    
    // Buscar conversas para todas as identidades deste contato
    const remoteJids = contact.identities.map(i => i.remote_jid);
    
    supabase
      .schema('crm')
      .from('v_conversas_scoped')
      .select('instance_id,remote_jid,data_ultima_mensagem,ultima_mensagem,mensagens_nao_lidas')
      .in('remote_jid', remoteJids)
      .order('data_ultima_mensagem', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('Erro ao carregar conversas:', error);
        } else {
          const mapped = (data || []).map(conv => ({
            instance_id: conv.instance_id,
            remote_jid: conv.remote_jid,
            last_message_at: conv.data_ultima_mensagem,
            last_message_text: conv.ultima_mensagem,
            unread_count: conv.mensagens_nao_lidas || 0,
          }));
          setConversations(mapped);
        }
        setLoading(false);
      });
  }, [current?.WORKSPACE_ID, contact.identities]);

  const openChat = (remoteJid: string) => {
    navigate(`/?contact=${encodeURIComponent(remoteJid)}`);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Conversas</h2>
        <span className="text-sm text-gray-400">
          {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">Carregando conversas...</p>
          </div>
        ) : (
          <SimpleBar className="h-full">
            <div className="space-y-3">
              {conversations.map((conv, idx) => (
                <div
                  key={idx}
                  className="bg-[#1e293b]/30 rounded-lg p-4 hover:bg-[#1e293b]/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <MessageSquare size={16} className="text-indigo-400 flex-shrink-0" />
                        <p className="font-mono text-sm text-white truncate">
                          {conv.remote_jid}
                        </p>
                        {conv.unread_count > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-white rounded-full text-xs font-semibold">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      
                      {conv.last_message_text && (
                        <p className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {conv.last_message_text}
                        </p>
                      )}
                      
                      {conv.last_message_at && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>
                            {new Date(conv.last_message_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => openChat(conv.remote_jid)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all flex-shrink-0 ml-3"
                    >
                      <ExternalLink size={14} />
                      <span className="text-sm">Abrir</span>
                    </button>
                  </div>
                </div>
              ))}

              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <MessageSquare size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma conversa encontrada</p>
                  <p className="text-sm text-center">
                    Este contato ainda não possui conversas registradas.
                  </p>
                </div>
              )}
            </div>
          </SimpleBar>
        )}
      </div>
    </div>
  );
};