/* ------------------------------------------------------------------
   src/App.tsx
   ------------------------------------------------------------------ */
   import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
   import throttle from 'lodash.throttle';
   
   import { supabase } from './supabaseClient';
   import { Contact, MessageDbView } from './types';
   
   import { useConnection }    from './hooks/useConnection';
   import { useConversations } from './hooks/useConversations';
   import { useMessages }      from './hooks/useMessages';
   import { useQuickMessages } from './hooks/useQuickMessages';
import { sendTextMessage } from './api/evolution';
import { wsClient } from './api/websocket';
   
   /* ---------- UI components extraídos ---------- */
   import { Sidebar }           from './components/Sidebar';
   import { ContactsList }      from './components/ContactsList';
   import { ChatHeader }        from './components/ChatHeader';
   import { ChatArea }          from './components/ChatArea';
   import { CrmPanel }          from './components/CrmPanel';
   import { ConnectionModal }   from './components/ConnectionModal';
   
   /* ----------------------- MOCK DE PRIMEIRO CONTATO ---------------- */
   const emptyContact: Contact = {
     id: 0,
     name: 'Selecione um contato',
     avatar: 'https://ui-avatars.com/api/?name=?',
     status: 'offline',
     lastSeen: '',
     isVip: false,
     ticketStatus: 'active',
     automationEnabled: false,
     notes: '',
     age: 0,
     email: '',
     phone: '',
     contributionTime: '',
     customerSince: '',
     preferredContact: '',
     lastPurchase: '',
     totalPurchases: 0,
     attachments: [],
   };




/* … imports … */
//import { MessageDbView } from './types';

/* ---------- useMessages ---------- */
const {
  messages,
  loading: loadingMessages,
  error: errorMessages,
  hasMore,
  loadingMore,
  load,
  loadMore,
  upsertMessage,
  updateMessageStatus,
} = useMessages();

/* ---------- useConversations ---------- */
const {
  conversations,
  loading: loadingConversations,
  error: errorConversations,
  upsertConversation,
} = useConversations();

/* ---------- WebSocket listener ---------- */
React.useEffect(() => {
  wsClient.connect();

  const unsubscribe = wsClient.onAny((event, payload) => {
    switch (event) {
      case 'messages.upsert': {
        const d = payload;
        const msg: MessageDbView = {
          id: d.key?.id || d.messageId || Date.now().toString(),
          text:
            d.message?.conversation ||
            d.message?.extendedText ||
            d.text ||
            '',
          sent: d.key?.fromMe ?? d.fromMe ?? false,
          timestamp: d.messageTimestamp
            ? new Date(d.messageTimestamp * 1000)
            : new Date(),
          autor: d.key?.fromMe ? 'me' : d.participant,
          participant: d.remoteJid,
          message_type: d.messageType,
          message_status: d.status ?? null,
        };
        upsertMessage(msg);
        break;
      }
      case 'messages.update': {
        const d = payload;
        if (d.keyId && d.remoteJid && d.status) {
          updateMessageStatus(d.keyId, d.remoteJid, d.status);
        }
        break;
      }
      case 'chats.upsert':
      case 'chats.update': {
        const arr = Array.isArray(payload.data)
          ? payload.data
          : [payload.data];
        arr.forEach((c: any) => {
          upsertConversation({
            remote_jid: c.remoteJid,
            ultima_mensagem: c.lastMessage ?? '',
            mensagens_nao_lidas: c.unreadMessages ?? 0,
            data_ultima_mensagem: c.lastMessageTimestamp
              ? new Date(c.lastMessageTimestamp * 1000).toISOString()
              : null,
            nome_contato: c.name ?? null,
            foto_contato: null,
          });
        });
        break;
      }
      default:
        break; // outros eventos não tratados
    }
  });

  return () => {
    unsubscribe();
    wsClient.disconnect();
  };
}, [upsertMessage, updateMessageStatus, upsertConversation]);




   /* ----------------------------------------------------------------- */
   
   export default function App() {
     // WebSocket listener global
     React.useEffect(() => {
       wsClient.connect();
       const unsubscribe = wsClient.onAny((event, payload) => {
         console.log('Evento websocket:', event, payload);
       });
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
     } = useConversations();
   
     /* -------------------- SELECTED CONTACT ------------------------ */
     const [selectedContact, setSelectedContact] = useState<Contact>(emptyContact);
   
     /* -------------------------- MESSAGES --------------------------- */
     const {
       messages,
       loading: loadingMessages,
       error: errorMessages,
       hasMore,
       loadingMore,
       load,
       loadMore,
     } = useMessages();
   
     const [localMsgs, setLocalMsgs] = useState<MessageDbView[]>([]);
   
     /* Carrega do banco quando muda contato */
     useEffect(() => {
       if (selectedContact.phone) {
         load(selectedContact);
         setLocalMsgs([]);
       }
     }, [selectedContact]);
   
     /* Scroll infinito */
     // O ref agora aponta para o elemento de scroll do SimpleBar (ou div normal)
     const chatContainerRef = useRef<HTMLElement>(null);
     useEffect(() => {
       const el = chatContainerRef.current;
       if (!el) return;

       const throttled = throttle(() => {
         if (el.scrollTop < 50 && hasMore && !loadingMore) {
           loadMore(selectedContact);
         }
       }, 200);

       el.addEventListener('scroll', throttled);
       return () => {
         el.removeEventListener('scroll', throttled);
         throttled.cancel();
       };
     }, [selectedContact, hasMore, loadingMore]);

   
     /* ---------------------- QUICK‑MESSAGES ------------------------- */
     const quick = useQuickMessages();
   
     /* ---------------------- OUTROS STATES UI ---------------------- */
     const [showCrmPanel, setShowCrmPanel] = useState(true);
     const [showNotes, setShowNotes]       = useState(false);
     const [notes, setNotes]               = useState(selectedContact.notes);
     const [showAttachments, setShowAttachments]       = useState(false);   
     /* edição de contato */
     const [editingContact, setEditingContact] = useState(false);
     const [editedContact, setEditedContact]   = useState<Contact>(selectedContact);
   
     /* Upload form – moved para UploadModal */
   
     /* Atualiza notes quando troca contato */
     useEffect(() => {
       setNotes(selectedContact.notes);
       setEditingContact(false);
       setEditedContact(selectedContact);
     }, [selectedContact]);

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
     }, [selectedContact, messages]);
   
     const textareaRef = useRef<HTMLTextAreaElement>(null);
   
     /* ------------------------- HANDLERS --------------------------- */
     const [newMessage, setNewMessage] = useState('');
     async function handleSendMessage(e: React.FormEvent) {
       e.preventDefault();
       if (!newMessage.trim()) return;

       const mock: MessageDbView = {
         id: `${Date.now()}`,
         text: newMessage,
         sent: true,
         timestamp: new Date(),
         autor: 'me',
         participant: selectedContact.phone,
         message_type: 'text',
         message_status: 'SENT',
       };
       setLocalMsgs([...localMsgs, mock]);
       setNewMessage('');

       // Envio real via Evolution API
       try {
         const res = await sendTextMessage({
           number: selectedContact.phone,
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
         <ContactsList
           conversations={conversations}
           selectedContact={selectedContact}
           onSelectContact={setSelectedContact}
           loading={loadingConversations}
           error={errorConversations}
           connectionStatus={connectionStatus}
           onStatusClick={openConnectionModal}
         />
   
         {/* MAIN AREA */}
         <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
           <ChatHeader
             contact={selectedContact}
             showCrmPanel={showCrmPanel}
             toggleCrmPanel={() => setShowCrmPanel(!showCrmPanel)}
             showNotes={showNotes}
             toggleNotes={() => setShowNotes(!showNotes)}
           />
   
           <div className="flex-1 flex overflow-hidden">
             {/* CHAT */}
             <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${showCrmPanel ? 'w-[80%]' : 'w-full'} transition-all duration-300`}>
               <ChatArea
                 showNotes={showNotes}
                 notes={notes}
                 setNotes={setNotes}
                 messagesToRender={[...messages, ...localMsgs]}
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
               />
             </div>
   
             {/* CRM PANEL */}
             <CrmPanel
               showCrmPanel={showCrmPanel}
               showAttachments={showAttachments}
               setShowAttachments={setShowAttachments}
               selectedContact={selectedContact}
               setSelectedContact={setSelectedContact}
               editingContact={editingContact}
               setEditingContact={setEditingContact}
               editedContact={editedContact}
               setEditedContact={setEditedContact}
             />
           </div>
         </div>
   
         {/* MODAIS */}   
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