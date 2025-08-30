// import { useState, useRef } from 'react';
// import { supabase } from '../supabaseClient';
// import {
//   MessageDb,
//   MessageDbView,
//   ChatSummary,
// } from '../types';
// import { INSTANCE_ID } from '../api/evolution';

// export function useMessages() {
//   const [messagesByContact, setCache] =
//     useState<{ [phone: string]: MessageDbView[] }>({});
//   const [messages, setMessages] = useState<MessageDbView[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [hasMore, setHasMore] = useState(true);
//   const [oldestTs, setOldestTs] = useState<number | null>(null);

//   /* Proteções contra race‑condition */
//   const lastPhoneRef = useRef<string | null>(null);
//   const sessionRef  = useRef(0);

//   const mapDb = (arr: MessageDb[]): MessageDbView[] =>
//     arr
//       .map(msg => ({
//         id: msg.id,
//         text: msg.conteudo_texto || '',
//         sent: msg.autor === 'me',
//         timestamp: msg.message_timestamp
//           ? new Date(msg.message_timestamp * 1000)
//           : null,
//         autor: msg.autor,
//         participant: msg.participant,
//         message_type: msg.message_type,
//         message_status: msg.message_status,
//       }))
//       .reverse();

//   async function load(contact: ChatSummary) {
//     sessionRef.current += 1;
//     const token = sessionRef.current;
//     const phone = contact.phone;
//     lastPhoneRef.current = phone;
//     setError(null);
//     setHasMore(true);
//     setOldestTs(null);

//     if (messagesByContact[phone]) {
//       setMessages(messagesByContact[phone]);
//       if (messagesByContact[phone].length)
//         setOldestTs(
//           Math.floor(messagesByContact[phone][0].timestamp!.getTime() / 1000),
//         );
//       return;
//     }

//     setLoading(true);
//     const { data, error } = await supabase
//       .schema('crm')
//       .from('v_mensagens_scoped')
//       .select('*')
//       .eq('remote_jid', phone)
//       .eq('instance_id', INSTANCE_ID)
//       .order('message_timestamp', { ascending: false })
//       .limit(200);

//     if (token !== sessionRef.current) return; // contato trocado
//     if (error) {
//       setError(error.message);
//       setMessages([]);
//       setHasMore(false);
//     } else {
//       const mapped = mapDb(data as MessageDb[]);
//       setMessages(mapped);
//       setCache(prev => ({ ...prev, [phone]: mapped }));
//       if (mapped.length)
//         setOldestTs(
//           Math.floor(mapped[0].timestamp!.getTime() / 1000),
//         );
//       setHasMore((data as MessageDb[]).length === 200);
//     }
//     setLoading(false);
//   }

//   async function loadMore(contact: ChatSummary) {
//     if (!contact || !oldestTs || loadingMore || !hasMore) return;
//     const phone = contact.phone;
//     const token = sessionRef.current;
//     setLoadingMore(true);
//     const { data, error } = await supabase
//       .schema('crm')
//       .from('v_mensagens_scoped')
//       .select('*')
//       .eq('remote_jid', phone)
//       .eq('instance_id', INSTANCE_ID)
//       .lt('message_timestamp', oldestTs)
//       .order('message_timestamp', { ascending: false })
//       .limit(500);
//     if (token !== sessionRef.current) return;
//     if (error) {
//       setError(error.message);
//       setHasMore(false);
//     } else {
//       const mapped = mapDb(data as MessageDb[]);
//       const merged = [
//         ...mapped,
//         ...(messagesByContact[phone] || []),
//       ].reduce<MessageDbView[]>((acc, cur) => {
//         if (!acc.find(m => m.id === cur.id)) acc.push(cur);
//         return acc;
//       }, []);
//       setCache(prev => ({ ...prev, [phone]: merged }));
//       setMessages(merged);
//       if (mapped.length)
//         setOldestTs(
//           Math.floor(mapped[0].timestamp!.getTime() / 1000),
//         );
//       setHasMore((data as MessageDb[]).length === 500);
//     }
//     setLoadingMore(false);
//   }

//   return {
//     messages,
//     loading,
//     error,
//     hasMore,
//     loadingMore,
//     load,
//     loadMore,
//   };
// }











import { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  MessageDb,
  MessageDbView,
  ChatSummary,
} from '../types';
import { INSTANCE_ID } from '../api/evolution';

export function useMessages() {
  const [messagesByContact, setCache] =
    useState<{ [phone: string]: MessageDbView[] }>({});
  const [messages, setMessages] = useState<MessageDbView[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTs, setOldestTs] = useState<number | null>(null);

  const lastPhoneRef = useRef<string | null>(null);
  const sessionRef  = useRef(0);

  /* -------- helpers -------- */

  // Atualiza o estado local messages sempre que o cache global mudar
  // e o contato aberto for o mesmo
  useEffect(() => {
    if (lastPhoneRef.current) {
      setMessages(messagesByContact[lastPhoneRef.current] || []);
    }
  }, [messagesByContact]);

  function updateMessageStatusInCache(keyId: string, status: string) {
    setMessages(prevMsgs => prevMsgs.map(m =>
      m.key_id === keyId ? { ...m, message_status: status } : m
    ));
    setCache(prevCache => {
      const updated = { ...prevCache };
      for (const phone in updated) {
        updated[phone] = updated[phone].map(m =>
          m.key_id === keyId ? { ...m, message_status: status } : m
        );
      }
      return updated;
    });
  }
  const mapDb = (arr: MessageDb[]): MessageDbView[] =>
    arr
      .map(msg => ({
        id: msg.id,
        key_id: msg.id_key ?? undefined,
        text: msg.conteudo_texto || '',
        media_url: msg.mediaurl,
        thumb_base64: (msg as { imagem_thumb_base64?: string | null }).imagem_thumb_base64 ?? null,
        legenda: msg.legenda,
        speechToText: (msg as { speech_to_text?: string | null }).speech_to_text ?? null,
        sent: msg.autor === 'me',
        timestamp: msg.message_timestamp
          ? new Date(msg.message_timestamp * 1000)
          : null,
        autor: msg.autor,
        participant: msg.participant,
        message_type: msg.message_type,
        message_status: msg.message_status,
      }))
      .reverse();

  /* -------- load initial -------- */
  async function load(contact: ChatSummary) {
    sessionRef.current += 1;
    const token = sessionRef.current;
    const phone = contact.phone;
    lastPhoneRef.current = phone;

    setLoading(true);
    setLoadingMore(false);          // <‑‑ Reset importante
    setHasMore(true);
    setOldestTs(null);
    setError(null);

    // 1. Mostra imediatamente o cache, se houver (UX rápida)
    if (messagesByContact[phone]) {
      setMessages(messagesByContact[phone]);
      if (messagesByContact[phone].length)
        setOldestTs(
          Math.floor(messagesByContact[phone][0].timestamp!.getTime() / 1000),
        );
    } else {
      // Não existe cache: limpa mensagens imediatamente para evitar mostrar mensagens da conversa anterior
      setMessages([]);
    }

    // 2. Sempre busca do banco em background para garantir atualização
    const { data, error } = await supabase
      .schema('crm')
      .from('v_mensagens_scoped')
      .select('*')
      .eq('remote_jid', phone)
      .eq('instance_id', INSTANCE_ID)
      .order('message_timestamp', { ascending: false })
      .limit(200);

    if (token !== sessionRef.current) return;       // contato trocado
    if (error) {
      setError(error.message);
      setHasMore(false);
      // Não limpe as mensagens! Mantenha o que já estava na tela.
    } else {
      const mapped = mapDb(data as MessageDb[]);
      setMessages(mapped);
      setCache(prev => ({ ...prev, [phone]: mapped }));
      if (mapped.length)
        setOldestTs(
          Math.floor(mapped[0].timestamp!.getTime() / 1000),
        );
      setHasMore((data as MessageDb[]).length === 200);
    }
    setLoading(false);
  }

  /* -------- load more / infinite scroll -------- */
  async function loadMore(contact: ChatSummary) {
    if (!contact || !oldestTs || loadingMore || !hasMore) return;
    const phone = contact.phone;
    const token = sessionRef.current;

    setLoadingMore(true);
    const { data, error } = await supabase
      .schema('crm')
      .from('v_mensagens_scoped')
      .select('*')
      .eq('remote_jid', phone)
      .eq('instance_id', INSTANCE_ID)
      .lt('message_timestamp', oldestTs)
      .order('message_timestamp', { ascending: false })
      .limit(500);

    /* --- contato trocado DURANTE o fetch --- */
    if (token !== sessionRef.current) {
      setLoadingMore(false);        // garante que não fique preso
      return;
    }

    if (error) {
      setError(error.message);
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const mapped = mapDb(data as MessageDb[]);
    const merged = [
      ...mapped,
      ...(messagesByContact[phone] || []),
    ].reduce<MessageDbView[]>((acc, cur) => {
      if (!acc.find(m => m.id === cur.id)) acc.push(cur);
      return acc;
    }, []);

    setCache(prev => ({ ...prev, [phone]: merged }));
    setMessages(merged);

    if (mapped.length)
      setOldestTs(Math.floor(mapped[0].timestamp!.getTime() / 1000));
    setHasMore((data as MessageDb[]).length === 500);
    setLoadingMore(false);
  }

  /**
   * Adiciona uma mensagem ao cache de um contato
   * Se o contato for o aberto, também adiciona ao estado messages
   */
  function addMessageToCache(phone: string, msg: MessageDbView) {
    setCache(prev => {
      const prevMsgs = prev[phone] || [];
      // Evita duplicidade por id ou key_id
      if (prevMsgs.find(m => m.id === msg.id || (m.key_id && m.key_id === msg.key_id))) return prev;
      return {
        ...prev,
        [phone]: [...prevMsgs, msg].sort((a, b) => {
          if (!a.timestamp) return -1;
          if (!b.timestamp) return 1;
          return a.timestamp.getTime() - b.timestamp.getTime();
        }),
      };
    });
    // Se o contato for o aberto, atualiza a lista exibida
    if (lastPhoneRef.current === phone) {
      setMessages(prevMsgs => {
        if (prevMsgs.find(m => m.id === msg.id)) return prevMsgs;
        return [...prevMsgs, msg].sort((a, b) => {
          if (!a.timestamp) return -1;
          if (!b.timestamp) return 1;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });
      });
    }
  }

  return {
    messages,
    loading,
    error,
    hasMore,
    loadingMore,
    load,
    loadMore,
    addMessageToCache,
    updateMessageStatusInCache, // exporta para uso externo
  };
}
// import { useState, useRef, useEffect } from 'react';
// import { supabase } from '../supabaseClient';
// import {
//   MessageDb,
//   MessageDbView,
//   ChatSummary,
// } from '../types';
// import { INSTANCE_ID } from '../api/evolution';
// import { get, set } from 'idb-keyval';

// export function useMessages() {
//   const [messagesByContact, setCache] =
//     useState<{ [phone: string]: MessageDbView[] }>({});
//   const [messages, setMessages]       = useState<MessageDbView[]>([]);
//   const [loading, setLoading]         = useState(false);
//   const [loadingMore, setLoadingMore] = useState(false);
//   const [error, setError]             = useState<string | null>(null);
//   const [hasMore, setHasMore]         = useState(true);
//   const [oldestTs, setOldestTs]       = useState<number | null>(null);

//   const lastPhoneRef = useRef<string | null>(null);
//   const sessionRef   = useRef(0);

//   /* ---------- helpers ---------- */
//   const mapDb = (arr: MessageDb[]): MessageDbView[] =>
//     arr
//       .map(msg => ({
//         id: msg.id,
//         text: msg.conteudo_texto || '',
//         sent: msg.autor === 'me',
//         timestamp: msg.message_timestamp
//           ? new Date(msg.message_timestamp * 1000)
//           : null,
//         autor: msg.autor,
//         participant: msg.participant,
//         message_type: msg.message_type,
//         message_status: msg.message_status,
//       }))
//       .reverse();

//   /* ---------- LOAD inicial ---------- */
//   async function load(contact: ChatSummary) {
//     sessionRef.current += 1;
//     const token = sessionRef.current;
//     const phone = contact.phone;
//     lastPhoneRef.current = phone;

//     setLoading(true);
//     setLoadingMore(false);   // evita loader preso
//     setError(null);
//     setOldestTs(null);
//     setHasMore(true);

//     /* Tenta cache em memória ‑‑‑‑‑‑ */
//     if (messagesByContact[phone]) {
//       const cached = messagesByContact[phone];
//       setMessages(cached);
//       if (cached.length)
//         setOldestTs(Math.floor(cached[0].timestamp!.getTime() / 1000));
//       setLoading(false);
//       return;
//     }

//     /* Tenta cache offline (IndexedDB) ‑‑‑ */
//     const offline = (await get(`msgs_${phone}`)) as MessageDbView[] | undefined;
//     if (offline?.length) {
//       setCache(prev => ({ ...prev, [phone]: offline }));
//       setMessages(offline);
//       setOldestTs(Math.floor(offline[0].timestamp!.getTime() / 1000));
//     }

//     /* Busca do backend ‑‑‑‑‑‑ */
//     const { data, error } = await supabase
//       .schema('crm')
//       .from('v_mensagens_scoped')
//       .select('*')
//       .eq('remote_jid', phone)
//       .eq('instance_id', INSTANCE_ID)
//       .order('message_timestamp', { ascending: false })
//       .limit(200);

//     if (token !== sessionRef.current) return; // contato mudou
//     if (error) {
//       setError(error.message);
//       setHasMore(false);
//       setLoading(false);
//       return;
//     }

//     const mapped = mapDb(data as MessageDb[]);
//     setCache(prev => ({ ...prev, [phone]: mapped }));
//     setMessages(mapped);
//     await set(`msgs_${phone}`, mapped);        // salva offline

//     if (mapped.length)
//       setOldestTs(Math.floor(mapped[0].timestamp!.getTime() / 1000));
//     setHasMore((data as MessageDb[]).length === 200);
//     setLoading(false);
//   }

//   /* ---------- LOAD MORE (scroll) ---------- */
//   async function loadMore(contact: ChatSummary) {
//     if (!contact || !oldestTs || loadingMore || !hasMore) return;
//     const phone = contact.phone;
//     const token = sessionRef.current;

//     setLoadingMore(true);
//     const { data, error } = await supabase
//       .schema('crm')
//       .from('v_mensagens_scoped')
//       .select('*')
//       .eq('remote_jid', phone)
//       .eq('instance_id', INSTANCE_ID)
//       .lt('message_timestamp', oldestTs)
//       .order('message_timestamp', { ascending: false })
//       .limit(500);

//     /* garante que loader sempre desative */
//     const finish = () => setLoadingMore(false);

//     if (token !== sessionRef.current) return finish();
//     if (error) {
//       setError(error.message);
//       setHasMore(false);
//       return finish();
//     }

//     const mapped = mapDb(data as MessageDb[]);
//     const merged = [
//       ...mapped,
//       ...(messagesByContact[phone] || []),
//     ].reduce<MessageDbView[]>((acc, cur) => {
//       if (!acc.find(m => m.id === cur.id)) acc.push(cur);
//       return acc;
//     }, []);

//     setCache(prev => ({ ...prev, [phone]: merged }));
//     setMessages(merged);
//     await set(`msgs_${phone}`, merged);

//     if (mapped.length)
//       setOldestTs(Math.floor(mapped[0].timestamp!.getTime() / 1000));
//     setHasMore((data as MessageDb[]).length === 500);
//     return finish();
//   }

//   return {
//     messages,
//     loading,
//     error,
//     hasMore,
//     loadingMore,
//     load,
//     loadMore,
//   };
// }