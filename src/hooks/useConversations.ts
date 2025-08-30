// import { useState, useEffect } from 'react';
// import { supabase } from '../supabaseClient';
// import { Conversation } from '../types';
// import { INSTANCE_ID } from '../api/evolution';

// export function useConversations() {
//   const [conversations, setConversations] = useState<Conversation[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   async function load() {
//     setLoading(true);
//     setError(null);
//     const { data, error } = await supabase
//       .schema('crm')
//       .from('v_conversas_scoped')
//       .select('*')
//       .eq('instance_id', INSTANCE_ID)
//       .order('data_ultima_mensagem', { ascending: false });
//     if (error) {
//       setError(error.message);
//       setConversations([]);
//     } else {
//       const mapped = (data as Conversation[]).map(conv => ({
//         ...conv,
//         labels: Array.isArray(conv.labels)
//           ? conv.labels
//           : typeof conv.labels === 'string'
//           ? JSON.parse(conv.labels)
//           : [],
//       }));
//       setConversations(mapped);
//     }
//     setLoading(false);
//   }

//   useEffect(() => {
//     load();
//   }, []);

//   return { conversations, loading, error, reload: load };
// }


import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Conversation } from '../types';
import { INSTANCE_ID } from '../api/evolution';
import { fetchContactFlagsForChats } from '../api/crm';
import { useInstances } from './useInstances';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { current } = useInstances();

  async function load() {
    if (!current?.WORKSPACE_ID) return;
    setLoading(true);
    setError(null);

    // nullsFirst = false  -> NULL vão para o fim
    const { data, error } = await supabase
      .schema('crm')
      .from('v_conversas_scoped')
      .select('*')
      .eq('instance_id', INSTANCE_ID)
      .order('data_ultima_mensagem', { ascending: false, nullsFirst: false });

    if (error) {
      setError(error.message);
      setConversations([]);
    } else {
      interface ConversationDb extends Omit<Conversation, 'whatsappFilters' | 'contactFlags' | 'contactId' | 'labelCount'> {
        labels: unknown;
      }

      let mapped = (data as ConversationDb[]).map(({ labels, ...conv }) => ({
        ...conv,
        whatsappFilters: Array.isArray(labels)
          ? labels
          : typeof labels === 'string'
          ? JSON.parse(labels)
          : [],
        contactFlags: [],
        contactId: null,
        labelCount: 0,
      }));

      // Busca labels (contact flags) e contact_id via RPC e aplica na lista
      if (current?.WORKSPACE_ID && mapped.length) {
        try {
          const rows = await fetchContactFlagsForChats(
            mapped.map(c => c.remote_jid),
            current.WORKSPACE_ID
          );
          const m = new Map(rows.map(r => [r.remote_jid, r]));
          mapped = mapped.map(conv => {
            const info = m.get(conv.remote_jid);
            return {
              ...conv,
              contactId: info?.contact_id ?? null,
              labelCount: info?.label_count ?? 0,
              contactFlags: info?.labels ?? [],
            };
          });
        } catch (e) {
          console.error('Erro ao buscar labels dos chats', e);
        }
      }

      /* Garantia extra: ordena no front e joga NULL para o fim */
      mapped.sort((a, b) => {
        if (!a.data_ultima_mensagem && b.data_ultima_mensagem) return 1;
        if (a.data_ultima_mensagem && !b.data_ultima_mensagem) return -1;
        if (!a.data_ultima_mensagem && !b.data_ultima_mensagem) return 0;
        return (
          new Date(b.data_ultima_mensagem!).getTime() -
          new Date(a.data_ultima_mensagem!).getTime()
        );
      });
      setConversations(mapped);
    }
    setLoading(false);
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (current?.WORKSPACE_ID) {
      load();
    }
  }, [current?.WORKSPACE_ID]);
  /* eslint-enable react-hooks/exhaustive-deps */

  /**
   * Atualiza preview/última mensagem de uma conversa específica
   * Atualiza data_ultima_mensagem e preview_ultima_mensagem se o phone bater
   */
  function updateConversationPreview(phone: string, msg: { text: string, timestamp: Date }) {
    setConversations(prev => prev.map(conv => {
      if (conv.remote_jid === phone) {
        return {
          ...conv,
          ultima_mensagem: msg.text,
          data_ultima_mensagem: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
        };
      }
      return conv;
    }));
  }

  return { conversations, loading, error, reload: load, updateConversationPreview };
}