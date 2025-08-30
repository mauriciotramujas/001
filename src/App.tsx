/* ------------------------------------------------------------------
   src/App.tsx
   ------------------------------------------------------------------ */
   import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
   import throttle from 'lodash.throttle';
   
// import { supabase } from './supabaseClient';
   import { ChatSummary, MessageDbView } from './types';
   
   import { useConnection }    from './hooks/useConnection';
   import { useConversations } from './hooks/useConversations';
   import { useMessages }      from './hooks/useMessages';
   import { useQuickMessages } from './hooks/useQuickMessages';
   import { useWhatsappFilters } from './hooks/useWhatsappFilters';
import { sendTextMessage } from './api/evolution';
import { wsClient } from './api/websocket';
import { fetchContactCustomFields, saveContactFields } from './api/crm';
import { useInstances } from './hooks/useInstances';
   
   /* ---------- UI components extraídos ---------- */
   import { Sidebar }           from './components/Sidebar';
   import { ChatList }      from './components/ChatList';
   import { ChatHeader }        from './components/ChatHeader';
  import { ChatArea }          from './components/ChatArea';
  import { CrmPanel }          from './components/CrmPanel';
  import { ConnectionModal }   from './components/ConnectionModal';
  import { SendMediaModal }    from './components/SendMediaModal';
   
   /* ----------------------- MOCK DE PRIMEIRO CONTATO ---------------- */
   const emptyChat: ChatSummary = {
    chatId: 0,
    crmContactId: '',
    name: 'Selecione um contato',
    avatar: 'https://ui-avatars.com/api/?name=?',
    status: 'offline',
     lastSeen: '',
     isVip: false,
     ticketStatus: 'active',
     automationEnabled: false,
     notes: '',
     phone: '',
     attachments: [],
   };
   /* ----------------------------------------------------------------- */
   
export default function App() {
// Labels para filtro de conversas
const { filters: whatsappFilters } = useWhatsappFilters();
const [labelSelecionada, setLabelSelecionada] = useState<string | null>(null);
const { current } = useInstances();
  // Busca de mensagens no chat
  const [searchTerm, setSearchTerm] = useState('');
  // Estado para presenças (composing, recording, etc)
  const [presences, setPresences] = useState<{ [jid: string]: string }>({});
  const presenceTimeouts = useRef<{ [jid: string]: ReturnType<typeof setTimeout> }>({});
     // WebSocket listener global – também mantém cache/UI em tempo‑real
     React.useEffect(() => {
       wsClient.connect();
 
       const handler = (event: string, payload: any) => {
         console.log('Evento websocket:', event, payload);
 
         if (event === 'messages.upsert' || event === 'send.message') {
           // A Evolution API envia { event, data, … }
           const d = (payload as any).data ?? payload;
 
           const remoteJid = d.remoteJid || d.key?.remoteJid;
           if (!remoteJid) return;
 
          let thumb: string | null = null;
          let url: string | null = d.message?.mediaUrl || null;
          if (d.message) {
            for (const k of Object.keys(d.message)) {
              const item = (d.message as any)[k];
              if (item) {
                if (!thumb && item.jpegThumbnail) {
                  thumb = item.jpegThumbnail;
                }
                if (!url && item.url) {
                  url = item.url;
                }
              }
              if (thumb && url) break;
            }
          }

          const mapped: MessageDbView = {
            id:
              d.messageId ||
              d.keyId ||
              d.key?.id ||
              `${Date.now()}`,
            key_id: d.key?.id || d.keyId || d.messageId || undefined,
          text: d.message?.conversation || '',
          media_url: url,
          thumb_base64: thumb,
          legenda:
            d.message?.imageMessage?.caption ||
            d.message?.videoMessage?.caption ||
            d.message?.documentMessage?.caption ||
             null,
           speechToText: d.message?.speechToText || null,
           sent: d.fromMe ?? d.key?.fromMe ?? false,
             timestamp: d.messageTimestamp
               ? new Date(Number(d.messageTimestamp) * 1000)
               : new Date(),
             autor: (d.fromMe ?? d.key?.fromMe) ? 'me' : remoteJid,
             participant: d.participant ?? null,
             message_type: d.messageType ?? 'text',
             message_status: d.status ?? null,
           };

 
          if (event === 'send.message') {
           // Busca mock em localMsgs procurando por mensagem recente enviada
           const remoteDigits = remoteJid.replace(/\D/g, '');
           const mockIdx = localMsgsRef.current.findIndex(m =>
             m.sent &&
             m.text === mapped.text &&
             (!m.media_url || m.media_url === mapped.media_url) &&
             m.participant?.replace(/\D/g, '') === remoteDigits &&
             Math.abs((m.timestamp?.getTime() ?? 0) - (mapped.timestamp?.getTime() ?? 0)) < 60000 &&
             !m.key_id // só mocks ainda não confirmados
           );
            if (mockIdx !== -1) {
              // Remove o mock de localMsgs
              const newLocalMsgs = [...localMsgsRef.current];
              newLocalMsgs.splice(mockIdx, 1);
              setLocalMsgs(newLocalMsgs);
              // Adiciona a mensagem oficial ao cache/messages
              addMessageToCache(remoteJid, {
                ...mapped,
                key_id: mapped.key_id || mapped.id
              });
              // Atualiza preview
              updateConversationPreview && updateConversationPreview(remoteJid, { text: mapped.text, timestamp: mapped.timestamp ?? new Date() });
              return; // Não duplica
            }
          }
          // Sempre atualiza o cache de mensagens (hook)
          addMessageToCache(remoteJid, mapped);
          // Atualiza preview da conversa na lista
          updateConversationPreview && updateConversationPreview(remoteJid, { text: mapped.text, timestamp: mapped.timestamp ?? new Date() });
         }

         // NOVO: trata presença (digitando, gravando)
         if (event === 'presence.update') {
           const d = (payload as any).data ?? payload;
           if (d.id && d.presences && d.presences[d.id]) {
             const jid = d.id;
             const status = d.presences[jid].lastKnownPresence;

             setPresences(prev => {
               const novo = { ...prev, [jid]: status };
               return novo;
             });

             // Limpa timeout anterior, se houver
             if (presenceTimeouts.current[jid]) {
               clearTimeout(presenceTimeouts.current[jid]);
             }

             // Lógica original: só muda status quando chega novo evento
             // Limpa timeout anterior, se houver
             if (presenceTimeouts.current[jid]) {
               clearTimeout(presenceTimeouts.current[jid]);
               delete presenceTimeouts.current[jid];
             }
             // Apenas atualiza status via setPresences acima; não mantém delay.
           }
         }
         if (event === 'messages.update') {
          const d = (payload as any).data ?? payload;
          const keyId = d.keyId || d.messageId || d.key?.id;
          const status = d.status;
          if (keyId && status && typeof updateMessageStatusInCache === 'function') {
            updateMessageStatusInCache(keyId, status);
          }
        }
       };
 
       const unsubscribe = wsClient.onAny(handler);
 
       return () => {
         unsubscribe();
         wsClient.disconnect();
       };
     }, []);

     /* --------------------------- CONNECTION ------------------------ */
     const {
       connectionStatus,
       qrData,
       loadingQr,
       errorQr,
       connect,
       disconnect,
       showConnectionModal,
       setShowConnectionModal,
       openConnectionModal,
     } = useConnection({
       onConnected: () => setShowConnectionModal(false),
       onDisconnected: () => setShowConnectionModal(false),
       onTimeout: () => setShowConnectionModal(false),
       pollingEnabled: true,
     });

   
     /* ------------------------ CONVERSATIONS ------------------------ */
     const {
       conversations,
       loading: loadingConversations,
       error: errorConversations,
       updateConversationPreview,
     } = useConversations();
   
     /* -------------------- SELECTED CONTACT ------------------------ */
     const [selectedChat, setSelectedChat] = useState<ChatSummary>(emptyChat);
   
     /* -------------------------- MESSAGES --------------------------- */
     const {
       messages,
       loading: loadingMessages,
       error: errorMessages,
       hasMore,
       loadingMore,
       load,
       loadMore,
       addMessageToCache,
       updateMessageStatusInCache,
     } = useMessages();
   
     const [localMsgs, setLocalMsgs] = useState<MessageDbView[]>([]);
 
     /* --- refs que espelham o estado mais recente --- */
     const messagesRef       = useRef<MessageDbView[]>(messages);
     const localMsgsRef      = useRef<MessageDbView[]>(localMsgs);
     const selectedChatRef = useRef<ChatSummary>(selectedChat);
 
     useEffect(() => { messagesRef.current = messages; }, [messages]);
     useEffect(() => { localMsgsRef.current  = localMsgs; }, [localMsgs]);
     useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
   
     /* Carrega do banco quando muda contato */
     useEffect(() => {
       if (selectedChat.phone) {
         load(selectedChat);
         setLocalMsgs([]);
       }
     }, [selectedChat]);
   
     /* Scroll infinito */
     // O ref agora aponta para o elemento de scroll do SimpleBar (ou div normal)
     const chatContainerRef = useRef<HTMLElement>(null);
     useEffect(() => {
       const el = chatContainerRef.current;
       if (!el) return;

       const throttled = throttle(() => {
         if (el.scrollTop < 50 && hasMore && !loadingMore) {
           loadMore(selectedChat);
         }
       }, 200);

       el.addEventListener('scroll', throttled);
       return () => {
         el.removeEventListener('scroll', throttled);
         throttled.cancel();
       };
     }, [selectedChat, hasMore, loadingMore]);

   
     /* ---------------------- QUICK‑MESSAGES ------------------------- */
     const quick = useQuickMessages();
   
     /* ---------------------- OUTROS STATES UI ---------------------- */
      const [showCrmPanel, setShowCrmPanel] = useState(true);
      const [showNotes, setShowNotes]       = useState(false);
      const [notes, setNotes]               = useState(selectedChat.notes);
      const [showAttachments, setShowAttachments]       = useState(false);    const [showSendMediaModal, setShowSendMediaModal] = useState(false);
   
     /* edição de contato */
    const [editingContact, setEditingContact] = useState(false);
   
     /* Upload form – moved para UploadModal */
   
      /* Atualiza notes quando troca contato */
      useEffect(() => {
        async function loadNotes() {
          if (!selectedChat.phone) return;
          try {
            const res = await fetchContactCustomFields(
              selectedChat.phone,
              current?.WORKSPACE_ID
            );
            const notasField = res.fields.find(f => f.key === 'notas');
            const valor = typeof notasField?.value === 'string' ? notasField.value : '';
            if (res.crmContactId) {
              setSelectedChat(prev => ({
                ...prev,
                crmContactId: res.crmContactId,
                notes: valor,
              }));
            } else {
              setSelectedChat(prev => ({ ...prev, notes: valor }));
            }
            setNotes(valor);
          } catch (err) {
            console.error('Erro ao carregar notas:', err);
            setNotes('');
          }
          setEditingContact(false);
        }
        loadNotes();
      }, [selectedChat.phone, current?.WORKSPACE_ID]);

      const activeCrmContactIdRef = useRef<string>(selectedChat.crmContactId);
      const saveNotesRef = useRef(
        throttle(async (text: string, crmContactId: string, workspaceId: string) => {
          try {
            await saveContactFields(crmContactId, [{ key: 'notas', value: text }], workspaceId);
          } catch (err) {
            console.error('Erro ao salvar notas:', err);
          }
        }, 1000)
      );

      useEffect(() => {
        activeCrmContactIdRef.current = selectedChat.crmContactId;
        saveNotesRef.current.cancel();
      }, [selectedChat.crmContactId]);

      useEffect(() => {
        const crmContactId = activeCrmContactIdRef.current;
        if (!crmContactId || !current?.WORKSPACE_ID) return;
        saveNotesRef.current(notes, crmContactId, current.WORKSPACE_ID);
        setSelectedChat(prev =>
          prev.crmContactId === crmContactId ? { ...prev, notes } : prev
        );
      }, [notes]);

     // Refs para manter posição do scroll ao carregar histórico
     const prevScrollHeightRef = useRef<number>(0);
     const prevScrollTopRef = useRef<number>(0);
     const wasLoadingMoreRef = useRef(false);

     // Antes de carregar mais mensagens (scroll infinito), salva scroll
     useEffect(() => {
       if (loadingMore) {
         const el = chatContainerRef.current;
         if (el) {
           prevScrollHeightRef.current = el.scrollHeight;
           prevScrollTopRef.current = el.scrollTop;
         }
         wasLoadingMoreRef.current = true;
       }
     }, [loadingMore]);

     // Após carregar mais mensagens, mantém posição relativa
     useLayoutEffect(() => {
       const el = chatContainerRef.current;
       if (!el) return;
       if (wasLoadingMoreRef.current && !loadingMore) {
         // Ajusta scroll para manter posição
         const diff = el.scrollHeight - prevScrollHeightRef.current;
         el.scrollTop = prevScrollTopRef.current + diff;
         wasLoadingMoreRef.current = false;
         return;
       }
       // Troca de conversa: rola para o fundo
       el.scrollTop = el.scrollHeight;
     }, [selectedChat, messages]);
 
    /* Após inserir nova mensagem local (enviada ou recebida), rola para o fim */
    useLayoutEffect(() => {
      const el = chatContainerRef.current;
      if (!el) return;
      // Sempre desce para mostrar a última bolha
      el.scrollTop = el.scrollHeight;
    }, [localMsgs]);
   
     const textareaRef = useRef<HTMLTextAreaElement>(null);
   
     /* ------------------------- HANDLERS --------------------------- */
     const [newMessage, setNewMessage] = useState('');
     async function handleSendMessage(e: React.FormEvent) {
       e.preventDefault();
       if (!newMessage.trim()) return;

      const mock: MessageDbView = {
         id: `${Date.now()}`,
         key_id: undefined,
         text: newMessage,
         media_url: null,
         thumb_base64: null,
         legenda: null,
         speechToText: null,
         sent: true,
         timestamp: new Date(),
         autor: 'me',
         participant: selectedChat.phone,
         message_type: 'text',
         message_status: 'SENT',
       };
       setLocalMsgs([...localMsgs, mock]);
       setNewMessage('');

       // Envio real via Evolution API
       try {
         const res = await sendTextMessage({
           number: selectedChat.phone,
           text: mock.text,
         });
         // Atualiza status da mensagem local se desejar (exemplo: PENDING, DELIVERED)
         setLocalMsgs((msgs) =>
           msgs.map((m) =>
             m.id === mock.id ? { ...m, message_status: res.status || 'PENDING' } : m
           )
         );
       } catch (err) {
         // Se erro, opcional: atualizar status local para 'ERROR' ou mostrar toast
         setLocalMsgs((msgs) =>
           msgs.map((m) =>
             m.id === mock.id ? { ...m, message_status: 'ERROR' } : m
           )
         );
         console.error('Erro ao enviar mensagem:', err);
       }
     }
   
     /* auto‑resize textarea */
     useEffect(() => {
       if (textareaRef.current) {
         textareaRef.current.style.height = 'auto';
         textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
       }
     }, [newMessage]);
   
     /* helpers ícones ----------- */
     function getMessageStatusIcon(status: string | null) {
       if (status === 'READ')
         return <span title="Lido" className="text-sky-400 font-bold ml-1">✓✓</span>;
       if (status === 'DELIVERY_ACK')
         return <span title="Entregue" className="text-slate-400 font-bold ml-1">✓✓</span>;
       return null;
     }
   
     /* ------------------------- RENDER --------------------------- */
     return (
       <div className="flex h-screen bg-[#0f172a] overflow-x-hidden ">
         {/* SIDEBAR */}
         <Sidebar />
   
         {/* CONTACTS LIST */}
         <ChatList
           conversations={conversations}
           selectedChat={selectedChat}
           onSelectChat={setSelectedChat}
           loading={loadingConversations}
           error={errorConversations}
           connectionStatus={connectionStatus}
           onStatusClick={openConnectionModal}
           presences={presences}
           whatsappFilters={whatsappFilters}
           labelSelecionada={labelSelecionada}
           setLabelSelecionada={setLabelSelecionada}
         />
   
         {/* MAIN AREA */}
         <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
           {/* Corrige montagem do JID para buscar corretamente em presences */}
           {/** Utilitário para JID seguro */}
           {/** function getContactJid(phone: string) { ... } **/}
           {(() => {
             function getContactJid(phone: string) {
               if (!phone) return '';
               return phone.endsWith('@s.whatsapp.net') ? phone : phone + '@s.whatsapp.net';
             }
             (window as any).getContactJid = getContactJid;
             return null;
           })()}
          <ChatHeader
            chat={selectedChat}
             showCrmPanel={showCrmPanel}
             toggleCrmPanel={() => setShowCrmPanel(!showCrmPanel)}
             showNotes={showNotes}
             toggleNotes={() => setShowNotes(!showNotes)}
             presence={presences[(window as any).getContactJid(selectedChat.phone)]}
             searchTerm={searchTerm}
             onSearchTermChange={setSearchTerm}
           />
   
           <div className="flex-1 flex overflow-hidden">
             {/* CHAT */}
             <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${showCrmPanel ? 'w-[80%]' : 'w-full'} transition-all duration-300`}>
               <ChatArea
                 showNotes={showNotes}
                 notes={notes}
                 setNotes={setNotes}
                 messagesToRender={[...messages, ...localMsgs]}
                 searchTerm={searchTerm}
                 chatRef={chatContainerRef}
                 loadingMessages={loadingMessages}
                 errorMessages={errorMessages}
                 loadingMore={loadingMore}
                 hasMore={hasMore}
                 getMessageStatusIcon={getMessageStatusIcon}
                 newMessage={newMessage}
                 setNewMessage={setNewMessage}
                 handleSendMessage={handleSendMessage}
                textareaRef={textareaRef}
                quick={quick}
                onPaperclipClick={() => setShowSendMediaModal(true)}
                contactPhone={selectedChat.phone}
              />
             </div>
   
             {/* CRM PANEL */}
             <CrmPanel
               showCrmPanel={showCrmPanel}
               showAttachments={showAttachments}
               setShowAttachments={setShowAttachments}
               selectedChat={selectedChat}
               setSelectedChat={setSelectedChat}
               editingContact={editingContact}
               setEditingContact={setEditingContact}
             />
           </div>
         </div>
   
         {/* MODAIS */}
        <SendMediaModal
          visible={showSendMediaModal}
          hide={() => setShowSendMediaModal(false)}
          chat={selectedChat}
        />

        <ConnectionModal
          visible={showConnectionModal}
          hide={() => setShowConnectionModal(false)}
          connectionStatus={connectionStatus}
           connect={() => {
             if (connectionStatus !== 'connected') connect();
           }}
           disconnect={disconnect}
           loadingQr={loadingQr}
           qrData={qrData}
           errorQr={errorQr}
         />
       </div>
     );
   }