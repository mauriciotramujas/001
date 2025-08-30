/* ------------------------------------------------------------------
   src/App.tsx
   ------------------------------------------------------------------ */

   import React, { useState, useEffect, useRef } from 'react';
   import throttle from 'lodash.throttle';
   import {
     Send,
     Phone,
     Video,
     Search,
     Paperclip,
     Smile,
     Image as ImageIcon,
     Mic,
     MessageSquare,
     Users,
     Settings,
     Bell,
     Sparkles,
     StickyNote,
     Zap,
     Star,
     CheckCircle2,
     Clock,
     AlertCircle,
     Plus,
     Edit,
     XCircle,
     Trash2,
     FileText,
     FileImage,
     File as FilePdf,
     ChevronRight,
     ChevronLeft,
     Upload,
     Info,
     FileBox,
   } from 'lucide-react';
   
   import { supabase } from './supabaseClient';
   import {
     Attachment,
     Contact,
     QuickMessage,
     MessageDbView,
   } from './types';
   
   import { useConnection }    from './hooks/useConnection';
   import { useConversations } from './hooks/useConversations';
   import { useMessages }      from './hooks/useMessages';
   import { useQuickMessages } from './hooks/useQuickMessages';
   
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
   /* ----------------------------------------------------------------- */
   
   export default function App() {
     /* --------------------------- CONNECTION ------------------------ */
     const {
       connectionStatus,
       qrData,
       loadingQr,
       errorQr,
       connect,
       disconnect,
       setQrData,
     } = useConnection();
   
     const [showConnectionModal, setShowConnectionModal] = useState(false);
   
     /* ------------------------ CONVERSATIONS ------------------------ */
     const {
       conversations,
       loading: loadingConversations,
       error: errorConversations,
       reload: reloadConversations,
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
   
     /* Mensagens enviadas localmente (mock) */
     const [localMsgs, setLocalMsgs] = useState<MessageDbView[]>([]);
   
     /* Carrega do banco quando muda contato */
     useEffect(() => {
       if (selectedContact.phone) {
         load(selectedContact);
         setLocalMsgs([]);         // zera mock local ao trocar de contato
       }
     }, [selectedContact]);
   
     /* Scroll infinito */
     const chatContainerRef = useRef<HTMLDivElement>(null);
     useEffect(() => {
       const el = chatContainerRef.current;
       if (!el) return;

       // Handler com throttle de 200ms
       const throttledHandler = throttle(() => {
         if (el.scrollTop < 50 && hasMore && !loadingMore) {
           loadMore(selectedContact);
         }
       }, 200);

       el.addEventListener('scroll', throttledHandler);
       return () => {
         el.removeEventListener('scroll', throttledHandler);
         throttledHandler.cancel && throttledHandler.cancel();
       };
     }, [selectedContact, hasMore, loadingMore]);
   
     /* ---------------------- QUICK‑MESSAGES ------------------------- */
     const quick = useQuickMessages();
   
     /* ---------------------- OUTROS STATES UI ---------------------- */
     const [showCrmPanel, setShowCrmPanel] = useState(true);
     const [showNotes, setShowNotes]       = useState(false);
     const [notes, setNotes]               = useState(selectedContact.notes);
   
     const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
     const [showAttachments, setShowAttachments] = useState(false);
     const [showUploadModal, setShowUploadModal] = useState(false);
     const [editingContact, setEditingContact] = useState(false);
     const [editedContact, setEditedContact] = useState<Contact>(selectedContact);
   
     /* Upload form */
     const [newAttachment, setNewAttachment] = useState({
       name: '',
       description: '',
       file: null as File | null,
     });
   
     /* Atualiza notes quando troca contato */
     useEffect(() => {
       setNotes(selectedContact.notes);
       setSelectedAttachment(null);
       setEditingContact(false);
       setEditedContact(selectedContact);
     }, [selectedContact]);
   
     /* ------------------------- HELPERS ---------------------------- */
     function getConnectionStatusStyles() {
       switch (connectionStatus) {
         case 'connected':   return 'bg-emerald-400/50';
         case 'connecting':  return 'bg-amber-400 animate-pulse';
         default:            return 'bg-red-400 animate-pulse';
       }
     }
   
     function getTicketStatusIcon(status: string) {
       switch (status) {
         case 'active':   return <Clock size={14} className="text-amber-400" />;
         case 'resolved': return <CheckCircle2 size={14} className="text-emerald-400" />;
         case 'pending':  return <AlertCircle size={14} className="text-orange-400" />;
         case 'closed':   return <CheckCircle2 size={14} className="text-gray-400" />;
         default:         return null;
       }
     }
   
     function getAttachmentIcon(type: string) {
       switch (type) {
         case 'pdf':   return <FilePdf size={16} />;
         case 'image': return <FileImage size={16} />;
         default:      return <FileText size={16} />;
       }
     }
   
     function getMessageStatusIcon(status: string | null) {
       if (status === 'READ')
         return <span title="Lido" className="text-sky-400 font-bold ml-1">✓✓</span>;
       if (status === 'DELIVERY_ACK')
         return <span title="Entregue" className="text-slate-400 font-bold ml-1">✓✓</span>;
       return null;
     }
   
     /* ------------------------- HANDLERS --------------------------- */
     const [newMessage, setNewMessage] = useState('');
     const textareaRef = useRef<HTMLTextAreaElement>(null);
   
     function handleSendMessage(e: React.FormEvent) {
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
     }
   
     /* auto‑resize textarea */
     useEffect(() => {
       if (textareaRef.current) {
         textareaRef.current.style.height = 'auto';
         textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
       }
     }, [newMessage]);
   
     /* ----------------------------- JSX ---------------------------- */
     return (
       <div className="flex h-screen bg-[#0f172a] overflow-hidden">
         {/* ---------------------- SIDEBAR --------------------------- */}
         <div className="w-16 bg-[#1e293b] flex flex-col items-center py-6 space-y-8">
           <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
             <MessageSquare className="text-white" size={16} />
           </div>
           <nav className="flex flex-col items-center space-y-6">
             <button className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center text-white">
               <Users size={16} />
             </button>
             <button className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white">
               <Bell size={16} />
             </button>
             <button className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white">
               <Settings size={16} />
             </button>
           </nav>
         </div>
   
         {/* -------------------- CONTACTS LIST ----------------------- */}
         <div className="w-64 bg-[#1e293b] border-r border-[#334155]">
           <div className="p-4">
             {/* Cabeçalho da lista */}
             <div className="flex items-center justify-between mb-4">
               <h1 className="text-lg font-medium text-white">Mensagens</h1>
               <button onClick={() => {
                 if (connectionStatus === 'connected')
                   setShowConnectionModal(true);
                 else {
                   connect();
                   setShowConnectionModal(true);
                 }
               }}>
                 <div className={`w-3 h-3 rounded-full ${getConnectionStatusStyles()}`} />
               </button>
             </div>
   
             {/* Busca */}
             <div className="relative mb-4">
               <input
                 type="text"
                 placeholder="Buscar"
                 className="w-full px-3 py-2 pl-9 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500"
               />
               <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
             </div>
   
             {errorConversations && (
               <p className="text-xs text-red-400 p-2">{errorConversations}</p>
             )}
             {loadingConversations && (
               <p className="text-xs text-gray-400 p-2">Carregando...</p>
             )}
   
             <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
               {conversations.map(conv => {
                 const name   = conv.nome_contato || conv.remote_jid;
                 const avatar = conv.foto_contato || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                 const isSel  = selectedContact.phone === conv.remote_jid;
                 return (
                   <div
                     key={conv.chat_id}
                     onClick={() =>
                       setSelectedContact({
                         ...emptyContact,
                         id: Number(conv.chat_id),
                         name,
                         avatar,
                         phone: conv.remote_jid,
                         isVip: conv.labels?.includes('vip') ?? false,
                         automationEnabled: conv.labels?.includes('automacao') ?? false,
                       })
                     }
                     className={`p-2.5 rounded-lg cursor-pointer transition ${
                       isSel
                         ? 'bg-gradient-to-r from-indigo-400/20 to-cyan-400/20'
                         : 'hover:bg-[#0f172a]'
                     }`}
                   >
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                         <img src={avatar} alt={name} className="w-8 h-8 rounded-lg" />
                         <div>
                           <h3 className="text-sm font-medium text-white">{name}</h3>
                           {conv.ultima_mensagem && (
                             <p className="text-xs text-gray-400 truncate max-w-[120px]">
                               {conv.ultima_mensagem}
                             </p>
                           )}
                         </div>
                       </div>
                       <div className="flex items-center space-x-1.5">
                         {conv.labels?.includes('vip') && <Star size={14} className="text-amber-400" />}
                         {conv.labels?.includes('automacao') && <Zap size={14} className="text-indigo-300" />}
                         {conv.mensagens_nao_lidas > 0 && (
                           <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                             {conv.mensagens_nao_lidas}
                           </span>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         </div>
   
         {/* ------------------- MAIN CONTENT ------------------------- */}
         <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
           {/* --------- Chat Header -------- */}
           <div className="px-6 py-4 bg-[#1e293b]/50 border-b border-[#334155] flex items-center justify-between">
             <div className="flex items-center space-x-3">
               <img src={selectedContact.avatar} alt={selectedContact.name} className="w-8 h-8 rounded-lg" />
               <div>
                 <h2 className="text-sm font-medium text-white">{selectedContact.name}</h2>
                 <p className="text-xs text-gray-400">
                   {selectedContact.status === 'online' ? 'Online' : selectedContact.lastSeen}
                 </p>
               </div>
             </div>
             <div className="flex items-center space-x-2">
               <button
                 onClick={() => setShowCrmPanel(!showCrmPanel)}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                   showCrmPanel
                     ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                     : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                 }`}
               >
                 {showCrmPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
               </button>
               <button
                 onClick={() => setShowNotes(!showNotes)}
                 className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                   showNotes
                     ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                     : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                 }`}
               >
                 <StickyNote size={14} />
               </button>
               <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                 <Video size={14} />
               </button>
               <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                 <Phone size={14} />
               </button>
               <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                 <Search size={14} />
               </button>
             </div>
           </div>
   
           {/* -------- Chat & CRM Container -------- */}
           <div className="flex-1 flex overflow-hidden">
             {/* ------------------- CHAT AREA ------------------- */}
             <div className={`flex flex-col ${showCrmPanel ? 'w-[80%]' : 'w-full'} transition-all duration-300`}>
               {/* Messages */}
               <div className="flex-1 overflow-y-auto p-6">
                 {showNotes ? (
                   /* -------- NOTAS -------- */
                   <textarea
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     placeholder="Adicione suas anotações..."
                     className="w-full h-full bg-[#1e293b]/30 rounded-lg p-4 text-sm text-white resize-none focus:outline-none"
                   />
                 ) : (
                   /* -------- MENSAGENS -------- */
                   <div ref={chatContainerRef} className="space-y-4 h-full overflow-y-auto">
                     {loadingMessages && (
                       <p className="text-gray-400 text-xs">Carregando mensagens...</p>
                     )}
                     {errorMessages && (
                       <p className="text-red-400 text-xs">{errorMessages}</p>
                     )}
                     {loadingMore && (
                       <p className="text-gray-400 text-xs">Carregando mais mensagens...</p>
                     )}
   
                     {[...messages, ...localMsgs].map(msg => (
                       <div key={msg.id} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                         <div
                           className={`rounded-lg px-4 py-2 max-w-[70%] break-words text-sm shadow ${
                             msg.sent
                               ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'
                               : 'bg-[#334155] text-gray-100'
                           }`}
                         >
                           {msg.text}
                           <div className="flex items-center justify-end gap-1 mt-1 text-xs">
                             {msg.timestamp && (
                               <span className="text-gray-400">
                                 {msg.timestamp.toLocaleString()}
                               </span>
                             )}
                             {getMessageStatusIcon(msg.message_status)}
                           </div>
                         </div>
                       </div>
                     ))}
   
                     {!hasMore && messages.length > 0 && (
                       <p className="text-center text-xs text-gray-500">Início do histórico</p>
                     )}
                   </div>
                 )}
               </div>
   
               {/* -------- INPUT -------- */}
               {!showNotes && (
                 <form onSubmit={handleSendMessage} className="p-4 bg-[#1e293b]/50 flex items-center space-x-2">
                   <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                     <Smile size={16} />
                   </button>
                   <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                     <Paperclip size={16} />
                   </button>
                   <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
                     <ImageIcon size={16} />
                   </button>
                   <div className="flex-1 relative">
                     <textarea
                       ref={textareaRef}
                       value={newMessage}
                       onChange={(e) => setNewMessage(e.target.value)}
                       placeholder='Digite sua mensagem... ("/" para rápidas)'
                       className="w-full px-4 py-2 bg-[#0f172a]/50 rounded-lg text-sm text-white placeholder-gray-500 resize-none min-h-[40px] max-h-[160px]"
                     />
                     {quick.open && (
                       /* Quick‑messages Dropdown */
                       <div ref={quick.ref as any} className="absolute bottom-full left-0 mb-2 w-96 bg-[#1e293b] rounded-lg p-2 space-y-1">
                         {quick.list.map(m => (
                           <div
                             key={m.id}
                             onClick={() => {
                               setNewMessage(m.text);
                               quick.setOpen(false);
                             }}
                             className="p-2 hover:bg-[#0f172a] rounded cursor-pointer"
                           >
                             <h4 className="text-sm font-medium text-white">{m.title}</h4>
                             <p className="text-xs text-gray-400 truncate">{m.text}</p>
                           </div>
                         ))}
                         <button
                           onClick={quick.add}
                           className="w-full flex items-center justify-center p-2 hover:bg-[#0f172a] text-gray-400 hover:text-white rounded"
                         >
                           <Plus size={14} className="mr-1" /> Adicionar rápida
                         </button>
                       </div>
                     )}
                   </div>
                   {newMessage ? (
                     <button type="submit" className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center justify-center">
                       <Send size={16} className="text-white" />
                     </button>
                   ) : (
                     <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400">
                       <Mic size={16} />
                     </button>
                   )}
                 </form>
               )}
             </div>
   
             {/* ------------------- CRM PANEL ------------------- */}
             {showCrmPanel && (
               <div className="w-[20%] border-l border-[#334155] bg-[#1e293b]/30 flex flex-col">
                 <div className="p-4 flex-1 overflow-hidden flex flex-col">
                   {/* Botões Info / Anexos */}
                   <div className="flex space-x-2 mb-4">
                     <button
                       onClick={() => setShowAttachments(false)}
                       className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center ${
                         !showAttachments
                           ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                           : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                       }`}
                     >
                       <Info size={14} className="mr-2" /> Informações
                     </button>
                     <button
                       onClick={() => setShowAttachments(true)}
                       className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center ${
                         showAttachments
                           ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                           : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                       }`}
                     >
                       <FileBox size={14} className="mr-2" /> Anexos
                     </button>
                   </div>
   
                   {/* Preview */}
                   <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-[#0f172a]">
                     {selectedAttachment?.type === 'image' ? (
                       <img src={selectedAttachment.url} alt={selectedAttachment.name} className="w-full h-full object-cover" />
                     ) : selectedAttachment?.type === 'pdf' ? (
                       <div className="w-full h-full flex items-center justify-center">
                         <FilePdf size={48} className="text-gray-400" />
                       </div>
                     ) : (
                       <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                     )}
                   </div>
   
                   {/* Info ou Anexos */}
                   <div className="flex-1 overflow-y-auto">
                     {!showAttachments ? (
                       /* ---------------- INFO CRM ---------------- */
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <h2 className="text-lg font-medium text-white">{selectedContact.name}</h2>
                           <button
                             onClick={() => setEditingContact(!editingContact)}
                             className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
                           >
                             <Edit size={14} />
                           </button>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           {editingContact ? (
                             <>
                               <div className="space-y-2">
                                 <label className="text-xs text-gray-400">Nome</label>
                                 <input
                                   type="text"
                                   value={editedContact.name}
                                   onChange={(e) => setEditedContact({ ...editedContact, name: e.target.value })}
                                   className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
                                 />
                               </div>
                               <div className="space-y-2">
                                 <label className="text-xs text-gray-400">Email</label>
                                 <input
                                   type="email"
                                   value={editedContact.email}
                                   onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                                   className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
                                 />
                               </div>
                               <div className="space-y-2">
                                 <label className="text-xs text-gray-400">Telefone</label>
                                 <input
                                   type="text"
                                   value={editedContact.phone}
                                   onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                                   className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
                                 />
                               </div>
                               <div className="space-y-2">
                                 <label className="text-xs text-gray-400">Idade</label>
                                 <input
                                   type="number"
                                   value={editedContact.age}
                                   onChange={(e) => setEditedContact({ ...editedContact, age: Number(e.target.value) })}
                                   className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
                                 />
                               </div>
                               <div className="col-span-2">
                                 <button
                                   onClick={() => {
                                     setSelectedContact(editedContact);
                                     setEditingContact(false);
                                   }}
                                   className="w-full px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
                                 >
                                   Salvar alterações
                                 </button>
                               </div>
                             </>
                           ) : (
                             <>
                               <div>
                                 <label className="text-xs text-gray-400">Email</label>
                                 <p className="text-sm text-white">{selectedContact.email}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Telefone</label>
                                 <p className="text-sm text-white">{selectedContact.phone}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Idade</label>
                                 <p className="text-sm text-white">{selectedContact.age}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Cliente desde</label>
                                 <p className="text-sm text-white">{selectedContact.customerSince}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Tempo de contribuição</label>
                                 <p className="text-sm text-white">{selectedContact.contributionTime}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Contato preferido</label>
                                 <p className="text-sm text-white">{selectedContact.preferredContact}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Última compra</label>
                                 <p className="text-sm text-white">{selectedContact.lastPurchase}</p>
                               </div>
                               <div>
                                 <label className="text-xs text-gray-400">Total de compras</label>
                                 <p className="text-sm text-white">{selectedContact.totalPurchases}</p>
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                     ) : (
                       /* ---------------- ANEXOS ---------------- */
                       <div className="space-y-4">
                         <div className="flex items-center justify-between">
                           <h3 className="text-lg font-medium text-white">Anexos</h3>
                           <button
                             onClick={() => setShowUploadModal(true)}
                             className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
                           >
                             <Plus size={14} />
                           </button>
                         </div>
                         <div className="space-y-2">
                           {selectedContact.attachments.map(att => (
                             <div
                               key={att.id}
                               className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${
                                 selectedAttachment?.id === att.id ? 'bg-[#0f172a]' : 'hover:bg-[#0f172a]'
                               }`}
                               onClick={() => setSelectedAttachment(selectedAttachment?.id === att.id ? null : att)}
                             >
                               <div className="flex items-center space-x-3">
                                 {getAttachmentIcon(att.type)}
                                 <span className="text-sm text-white">{att.name}</span>
                               </div>
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   // Revoga URL blob se necessário
                                   if (att.url.startsWith('blob:')) {
                                     URL.revokeObjectURL(att.url);
                                   }
                                   setSelectedContact({
                                     ...selectedContact,
                                     attachments: selectedContact.attachments.filter(a => a.id !== att.id),
                                   });
                                   if (selectedAttachment?.id === att.id) setSelectedAttachment(null);
                                 }}
                                 className="w-6 h-6 rounded bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-red-400"
                               >
                                 <Trash2 size={12} />
                               </button>
                             </div>
                           ))}
                           {selectedContact.attachments.length === 0 && (
                             <p className="text-sm text-gray-400 text-center py-4">Nenhum anexo disponível</p>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
           </div>
         </div>
   
         {/* ------------------ UPLOAD MODAL ------------------- */}
         {showUploadModal && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-[#1e293b] rounded-lg p-6 w-96">
               <h3 className="text-lg font-medium text-white mb-4">Adicionar Anexo</h3>
               <form
                 onSubmit={(e) => {
                   e.preventDefault();
                   if (!newAttachment.file || !newAttachment.name) return;
                   const type =
                     newAttachment.file.type.startsWith('image/')
                       ? 'image'
                       : newAttachment.file.type === 'application/pdf'
                       ? 'pdf'
                       : 'document';
                   const att: Attachment = {
                     id: Date.now(),
                     name: newAttachment.name,
                     type,
                     url: URL.createObjectURL(newAttachment.file),
                   };
                   setSelectedContact({
                     ...selectedContact,
                     attachments: [...selectedContact.attachments, att],
                   });
                   setNewAttachment({ name: '', description: '', file: null });
                   setShowUploadModal(false);
                 }}
                 className="space-y-4"
               >
                 <div>
                   <label className="text-sm text-gray-400">Nome do arquivo</label>
                   <input
                     type="text"
                     value={newAttachment.name}
                     onChange={(e) => setNewAttachment(prev => ({ ...prev, name: e.target.value }))}
                     className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
                   />
                 </div>
                 <div>
                   <label className="text-sm text-gray-400">Descrição</label>
                   <textarea
                     value={newAttachment.description}
                     onChange={(e) => setNewAttachment(prev => ({ ...prev, description: e.target.value }))}
                     className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white resize-none"
                     rows={3}
                   />
                 </div>
                 <div>
                   <label className="text-sm text-gray-400">Arquivo</label>
                   <div className="mt-1 flex items-center justify-center w-full px-3 py-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-400">
                     <div className="text-center">
                       {newAttachment.file ? (
                         <p className="text-sm text-white">{newAttachment.file.name}</p>
                       ) : (
                         <>
                           <Upload className="mx-auto h-8 w-8 text-gray-400" />
                           <p className="mt-1 text-sm text-gray-400">Clique para selecionar um arquivo</p>
                         </>
                       )}
                       <input
                         type="file"
                         onChange={(e) => setNewAttachment(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                         className="hidden"
                         accept="image/*,.pdf,.doc,.docx"
                       />
                     </div>
                   </div>
                 </div>
                 <div className="flex justify-end space-x-2">
                   <button
                     type="button"
                     onClick={() => setShowUploadModal(false)}
                     className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
                   >
                     Cancelar
                   </button>
                   <button
                     type="submit"
                     className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
                     disabled={!newAttachment.file || !newAttachment.name}
                   >
                     Adicionar
                   </button>
                 </div>
               </form>
             </div>
           </div>
         )}
   
         {/* ---------------- CONNECTION MODAL ---------------- */}
         {showConnectionModal && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
             <div className="bg-[#1e293b] rounded-lg p-6 w-96 relative">
               <button
                 className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
                 onClick={() => setShowConnectionModal(false)}
               >
                 ×
               </button>
               {connectionStatus !== 'connected' ? (
                 <>
                   <h3 className="text-lg font-medium text-white mb-4">Conectar WhatsApp</h3>
                   <div className="bg-white p-4 rounded-lg mb-4 flex flex-col items-center justify-center min-h-[220px]">
                     {loadingQr ? (
                       <p className="text-gray-400">Carregando QR code...</p>
                     ) : errorQr ? (
                       <p className="text-red-500">{errorQr}</p>
                     ) : qrData && qrData.code ? (
                       <img
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.code)}`}
                         alt="QR Code"
                         className="w-40 h-40"
                       />
                     ) : (
                       <p className="text-gray-400">Nenhum QR code disponível.</p>
                     )}
                     {qrData?.pairingCode && (
                       <span className="mt-2 text-xs text-gray-600">Código: {qrData.pairingCode}</span>
                     )}
                   </div>
                   <p className="text-sm text-gray-400 mb-4">
                     Escaneie o QR code com seu WhatsApp
                   </p>
                   <div className="flex justify-end space-x-2">
                     <button
                       onClick={() => setShowConnectionModal(false)}
                       className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
                     >
                       Cancelar
                     </button>
                     <button
                       onClick={connect}
                       className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
                       disabled={loadingQr}
                     >
                       Gerar QR
                     </button>
                   </div>
                 </>
               ) : (
                 <>
                   <h3 className="text-lg font-medium text-white mb-4">Desconectar WhatsApp</h3>
                   <p className="text-sm text-gray-400 mb-4">Tem certeza que deseja desconectar?</p>
                   <div className="flex justify-end space-x-2">
                     <button
                       onClick={() => setShowConnectionModal(false)}
                       className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
                     >
                       Cancelar
                     </button>
                     <button
                       onClick={disconnect}
                       className="px-4 py-2 bg-red-500 rounded-lg text-white"
                     >
                       Desconectar
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
         )}
       </div>
     );
   }