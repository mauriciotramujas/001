import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, Search, Paperclip, Smile, Image as ImageIcon, Mic, MessageSquare, Users, Settings, Bell, Sparkles, StickyNote, Zap, Star, CheckCircle2, Clock, AlertCircle, Plus, Edit, XCircle, Trash2, FileText, FileImage, File as FilePdf, File, ChevronRight, ChevronLeft, Upload, Info, FileBox } from 'lucide-react';

interface Attachment {
  id: number;
  name: string;
  type: 'pdf' | 'image' | 'document';
  url: string;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  isVip: boolean;
  ticketStatus: 'active' | 'resolved' | 'pending' | 'closed';
  automationEnabled: boolean;
  notes: string;
  // CRM Information
  age: number;
  email: string;
  phone: string;
  contributionTime: string;
  customerSince: string;
  preferredContact: string;
  lastPurchase: string;
  totalPurchases: number;
  attachments: Attachment[];
}

const mockContacts: Contact[] = [
  {
    id: 1,
    name: 'João Silva',
    avatar: 'https://i.pravatar.cc/150?img=3',
    status: 'online',
    lastSeen: 'Há 2 minutos',
    isVip: true,
    ticketStatus: 'active',
    automationEnabled: true,
    notes: 'Cliente importante. Prefere contato pela manhã.',
    age: 35,
    email: 'joao.silva@email.com',
    phone: '(11) 98765-4321',
    contributionTime: '3 anos',
    customerSince: '15/03/2021',
    preferredContact: 'WhatsApp',
    lastPurchase: '23/02/2024',
    totalPurchases: 12,
    attachments: [
      { id: 1, name: 'Contrato.pdf', type: 'pdf', url: 'https://example.com/contract.pdf' },
      { id: 2, name: 'Foto RG.jpg', type: 'image', url: 'https://i.pravatar.cc/300?img=3' },
      { id: 3, name: 'Proposta.pdf', type: 'pdf', url: 'https://example.com/proposal.pdf' },
    ],
  },
  {
    id: 2,
    name: 'Maria Souza',
    avatar: 'https://i.pravatar.cc/150?img=5',
    status: 'offline',
    lastSeen: 'Ontem',
    isVip: false,
    ticketStatus: 'pending',
    automationEnabled: false,
    notes: 'Solicitou orçamento para novo projeto.',
    age: 28,
    email: 'maria.souza@email.com',
    phone: '(11) 98765-1234',
    contributionTime: '1 ano',
    customerSince: '10/06/2023',
    preferredContact: 'Email',
    lastPurchase: '15/01/2024',
    totalPurchases: 3,
    attachments: [],
  },
];

// Mensagem vinda do banco
interface MessageDb {
  id: string;
  id_key: string | null;
  remote_jid: string;
  participant: string | null;
  autor: string | null;
  message_type: string | null;
  conteudo_texto: string | null;
  message_timestamp: number | null;
  message_status: string | null;
  instance_id: string;
}

// Mensagem para exibir no chat (vinda do banco)
interface MessageDbView {
  id: string;
  text: string;
  sent: boolean;
  timestamp: Date | null;
  autor: string | null;
  participant: string | null;
  message_type: string | null;
  message_status: string | null;
}

interface QuickMessage {
  id: number;
  title: string;
  text: string;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

import { supabase } from './supabaseClient';

// Tipagem para conversa vinda da view
export interface Conversation {
  chat_id: string;
  remote_jid: string;
  nome_contato: string | null;
  foto_contato: string | null;
  labels: string[] | null;
  mensagens_nao_lidas: number;
  ultima_mensagem: string | null;
  data_ultima_mensagem: string | null;
  instance_id: string;
}

// --- Credenciais fixas para teste ---
const SERVER_URL = 'ep3.cecredi.com';
const INSTANCE = 'fff1';//'77981dab-e56e-4cd7-a23f-660ab42cc64c';//'fff1';
const API_KEY = 'ADA66A578767-413B-AAD4-12B0882F8BA4';
const INSTANCE_ID = '77981dab-e56e-4cd7-a23f-660ab42cc64c';

// --- Funções utilitárias para API Evolution ---
async function fetchConnectionState() {
  const res = await fetch(`https://${SERVER_URL}/instance/connectionState/${INSTANCE}`, {
    headers: { 'apikey': API_KEY },
  });
  if (!res.ok) throw new Error('Erro ao buscar status da conexão');
  const data = await res.json();
  return data.instance?.state as string;
}

async function fetchQrCode() {
  const res = await fetch(`https://${SERVER_URL}/instance/connect/${INSTANCE}`, {
    headers: { 'apikey': API_KEY },
  });
  if (!res.ok) throw new Error('Erro ao gerar QR code de conexão');
  const data = await res.json();
  // O campo 'code' é o QR (base64 ou string), mas a doc mostra 'pairingCode' também
  return data;
}

async function logoutInstance() {
  const res = await fetch(`https://${SERVER_URL}/instance/logout/${INSTANCE}`, {
    method: 'DELETE',
    headers: { 'apikey': API_KEY },
  });
  if (!res.ok) throw new Error('Erro ao desconectar');
  return await res.json();
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [errorConversations, setErrorConversations] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact>(mockContacts[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Oi, tudo bem?', sent: false, timestamp: new Date(Date.now() - 3600000) },
    { id: 2, text: 'Tudo ótimo! E você?', sent: true, timestamp: new Date(Date.now() - 1800000) },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(selectedContact.notes);
  const [showQuickMessages, setShowQuickMessages] = useState(false);
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([
    { id: 1, title: 'Saudação', text: 'Olá! Como posso ajudar?' },
    { id: 2, title: 'Agradecimento', text: 'Muito obrigado pelo contato!' },
    { id: 3, title: 'Despedida', text: 'Tenha um ótimo dia! Estamos à disposição.' },
    { id: 4, title: 'Retorno', text: 'Voltarei a entrar em contato em breve com mais informações.' },
  ]);
  const [editingQuickMessage, setEditingQuickMessage] = useState<QuickMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [qrData, setQrData] = useState<{ code: string; pairingCode?: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Mensagens reais do banco (agora cache por contato)
  const [messagesByContact, setMessagesByContact] = useState<{ [phone: string]: MessageDbView[] }>({});
  const [messagesDb, setMessagesDb] = useState<MessageDbView[]>([]); // usado só para exibir o contato atual
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestTimestampLoaded, setOldestTimestampLoaded] = useState<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact>(selectedContact);
  const [showCrmPanel, setShowCrmPanel] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [newAttachment, setNewAttachment] = useState({
    name: '',
    description: '',
    file: null as File | null,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Buscar status da conexão ao carregar o App
  useEffect(() => {
    (async () => {
      try {
        const state = await fetchConnectionState();
        if (state === 'open') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch {
        setConnectionStatus('disconnected');
      }
    })();
  }, []);

  // Buscar conversas ao carregar o App
  // Função para buscar conversas (reutilizável)
  const loadConversations = () => {
    setLoadingConversations(true);
    setErrorConversations(null);
    supabase
      .from('View_Evolution_Conversas')
      .select('*')
      .eq('instance_id', INSTANCE_ID)
      .order('data_ultima_mensagem', { ascending: false })
      .then(({ data, error }) => {
        console.log('Conversas recebidas do Supabase:', data, error);
        if (error) {
          setErrorConversations(error.message);
          setConversations([]);
          console.error('Erro ao buscar conversas:', error);
        } else {
          // Tratar labels (jsonb pode vir string ou array) e data_ultima_mensagem (timestamp inteiro)
          const mapped = (data as Conversation[]).map(conv => ({
            ...conv,
            labels: Array.isArray(conv.labels)
              ? conv.labels
              : typeof conv.labels === 'string'
                ? JSON.parse(conv.labels)
                : [],
            data_ultima_mensagem: conv.data_ultima_mensagem
              ? new Date(Number(conv.data_ultima_mensagem) * 1000).toISOString()
              : null,
          }));
          setConversations(mapped);
        }
        setLoadingConversations(false);
      });
  };

  // useEffect inicial
  useEffect(() => {
    loadConversations();
  }, []);

  // Recarregar conversas ao conectar
  useEffect(() => {
    if (connectionStatus === 'connected') {
      loadConversations();
    }
  }, [connectionStatus]);

  // Carregar mensagens do banco quando selectedContact mudar
  useEffect(() => {
    sessionRef.current += 1; // Novo token a cada troca de contato
    setErrorMessages(null);
    setLoadingMessages(true);
    setHasMoreMessages(true);
    setOldestTimestampLoaded(null);
    const thisContact = selectedContact?.phone ?? null;
    lastContactRef.current = thisContact;
    if (!selectedContact) {
      setMessagesDb([]);
      setLoadingMessages(false);
      return;
    }
    // Se já tem cache, mostra instantaneamente
    if (messagesByContact[thisContact]) {
      setMessagesDb(messagesByContact[thisContact]);
      setLoadingMessages(false);
      if (messagesByContact[thisContact].length > 0) {
        setOldestTimestampLoaded(
          messagesByContact[thisContact][0].timestamp ? Math.floor(messagesByContact[thisContact][0].timestamp.getTime() / 1000) : null
        );
      }
      setHasMoreMessages(true); // Assume que pode ter mais
      return;
    }
    setMessagesDb([]); // Limpa enquanto carrega
    const sessionId = sessionRef.current;
    supabase
      .from('View_Evolution_Mensagens')
      .select('*')
      .eq('remote_jid', selectedContact.phone)
      .eq('instance_id', INSTANCE_ID)
      .order('message_timestamp', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (sessionRef.current !== sessionId) {
          // Contato mudou durante a requisição, descarta resposta!
          return;
        }
        if (error) {
          setErrorMessages(error.message);
          setMessagesDb([]);
          setHasMoreMessages(false);
        } else {
          const mapped = (data as MessageDb[]).map(msg => ({
            id: msg.id,
            text: msg.conteudo_texto || '',
            sent: msg.autor === 'me',
            timestamp: msg.message_timestamp ? new Date(msg.message_timestamp * 1000) : null,
            autor: msg.autor,
            participant: msg.participant,
            message_type: msg.message_type,
            message_status: msg.message_status,
          }));
          // Mensagens vêm do mais recente para o mais antigo, inverter para exibir corretamente
          const ordered = mapped.reverse();
          setMessagesDb(ordered);
          setMessagesByContact(prev => ({ ...prev, [thisContact]: ordered }));
          if (ordered.length > 0) {
            setOldestTimestampLoaded(
              ordered[0].timestamp ? Math.floor(ordered[0].timestamp.getTime() / 1000) : null
            );
          } else {
            setHasMoreMessages(false);
            setOldestTimestampLoaded(null);
          }
          setHasMoreMessages((data as MessageDb[]).length === 200);
        }
        setLoadingMessages(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContact]);

  // Função para buscar mais mensagens antigas (scroll infinito)
  const fetchMoreMessages = async () => {
    if (!selectedContact || !oldestTimestampLoaded || loadingMoreMessages || !hasMoreMessages) return;
    const thisContact = selectedContact.phone;
    const sessionId = sessionRef.current;
    // Proteção: só busca/adiciona se o contato não mudou
    if (thisContact !== lastContactRef.current) return;
    setLoadingMoreMessages(true);
    const { data, error } = await supabase
      .from('View_Evolution_Mensagens')
      .select('*')
      .eq('remote_jid', selectedContact.phone)
      .eq('instance_id', INSTANCE_ID)
      .lt('message_timestamp', oldestTimestampLoaded)
      .order('message_timestamp', { ascending: false })
      .limit(500);
    if (sessionRef.current !== sessionId) {
      setLoadingMoreMessages(false);
      return;
    }
    if (error) {
      setErrorMessages(error.message);
      setLoadingMoreMessages(false);
      setHasMoreMessages(false);
      return;
    }
    // Proteção: só adiciona se o contato não mudou
    if (lastContactRef.current !== thisContact) {
      setLoadingMoreMessages(false);
      return;
    }
    const mapped = (data as MessageDb[]).map(msg => ({
      id: msg.id,
      text: msg.conteudo_texto || '',
      sent: msg.autor === 'me',
      timestamp: msg.message_timestamp ? new Date(msg.message_timestamp * 1000) : null,
      autor: msg.autor,
      participant: msg.participant,
      message_type: msg.message_type,
      message_status: msg.message_status,
    }));
    const ordered = mapped.reverse();
    // Atualiza o cache do contato corretamente, nunca mistura arrays entre contatos
    // Função utilitária para remover duplicatas por id
    function dedupeMessages(arr: MessageDbView[]) {
      const seen = new Set();
      return arr.filter(msg => {
        if (seen.has(msg.id)) return false;
        seen.add(msg.id);
        return true;
      });
    }
    setMessagesByContact(prev => {
      if (!thisContact) {
        console.error('Scroll infinito: chave de contato indefinida!');
        return prev;
      }
      // Concatena e remove duplicatas
      const merged = dedupeMessages([...ordered, ...(prev[thisContact] || [])]);
      return {
        ...prev,
        [thisContact]: merged
      };
    });
    // Atualiza o estado de exibição se ainda for o contato atual
    setMessagesDb(currentMessages => {
      if (lastContactRef.current !== thisContact) return currentMessages;
      return dedupeMessages([...ordered, ...currentMessages]);
    });
    if (ordered.length > 0) {
      setOldestTimestampLoaded(
        ordered[0].timestamp ? Math.floor(ordered[0].timestamp.getTime() / 1000) : oldestTimestampLoaded
      );
    }
    setHasMoreMessages((data as MessageDb[]).length === 500);
    setLoadingMoreMessages(false);
  };



  // Handler de scroll: se chegar no topo, busca mais antigas
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Ref para evitar vazamento de mensagens entre contatos
  const lastContactRef = useRef<string | null>(null);
  // Proteção contra sobrescrita de histórico por requisições antigas
  const sessionRef = useRef(0);
  useEffect(() => {
    const handleScroll = () => {
      const el = chatContainerRef.current;
      if (!el || loadingMoreMessages || !hasMoreMessages) return;
      if (el.scrollTop < 50) {
        fetchMoreMessages();
      }
    };
    const el = chatContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [loadingMoreMessages, hasMoreMessages, oldestTimestampLoaded, selectedContact]);

  // Fechar modal ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowConnectionModal(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showConnectionModal]);

  // Polling para detectar conexão ao escanear QR
  useEffect(() => {
    if (!showConnectionModal || connectionStatus === 'connected' || !qrData) {
      setPolling(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }
    setPolling(true);
    // Poll a cada 3s
    pollingRef.current = setInterval(async () => {
      try {
        const state = await fetchConnectionState();
        if (state === 'open') {
          setConnectionStatus('connected');
          setShowConnectionModal(false);
          setQrData(null);
          setPolling(false);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }
      } catch {}
    }, 3000);
    // Timeout de 1min
    timeoutRef.current = setTimeout(async () => {
      setShowConnectionModal(false);
      setQrData(null);
      setPolling(false);
      if (pollingRef.current) clearInterval(pollingRef.current);
      try {
        await logoutInstance();
        setConnectionStatus('disconnected');
      } catch {}
    }, 60000);
    // Limpa interval/timeout ao desmontar
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showConnectionModal, connectionStatus, qrData]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    setNotes(selectedContact.notes);
    setShowNotes(false);
    setSelectedAttachment(null);
    setEditingContact(false);
    setEditedContact(selectedContact);
  }, [selectedContact]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickMessagesRef.current && !quickMessagesRef.current.contains(event.target as Node)) {
        setShowQuickMessages(false);
        setEditingQuickMessage(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnectionClick = async () => {
    if (connectionStatus === 'connected') {
      setShowConnectionModal(true);
      setQrData(null);
      return;
    }
    setShowConnectionModal(true);
    setLoadingQr(true);
    setErrorQr(null);
    try {
      // Só busca QR se estiver desconectado
      const qr = await fetchQrCode();
      setQrData(qr);
    } catch (err: any) {
      setErrorQr(err.message || 'Erro ao buscar QR code');
      setQrData(null);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    setConnectionStatus('connecting');
    try {
      await logoutInstance();
      setConnectionStatus('disconnected');
      setShowConnectionModal(false);
      setQrData(null);
    } catch (err: any) {
      setConnectionStatus('connected');
      setErrorQr('Erro ao desconectar');
    }
  };

  const handleConnect = async () => {
    setConnectionStatus('connecting');
    setErrorQr(null);
    setLoadingQr(true);
    try {
      const state = await fetchConnectionState();
      if (state === 'open') {
        setConnectionStatus('connected');
        setShowConnectionModal(false);
        setQrData(null);
        return;
      }
      // Gera novo QR code
      const qr = await fetchQrCode();
      setQrData(qr);
      setShowConnectionModal(true);
      setConnectionStatus('disconnected');
    } catch (err: any) {
      setErrorQr(err.message || 'Erro ao conectar');
      setShowConnectionModal(true);
      setConnectionStatus('disconnected');
    } finally {
      setLoadingQr(false);
    }
  };

  const getConnectionStatusStyles = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-400/50';
      case 'connecting':
        return 'bg-amber-400 animate-pulse';
      case 'disconnected':
        return 'bg-red-400 animate-pulse';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/') {
      e.preventDefault();
      setShowQuickMessages(true);
      return;
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return; // Permite quebra de linha
      } else {
        e.preventDefault();
        handleSendMessage(e);
      }
    }

    if (e.key === 'Escape') {
      setShowQuickMessages(false);
      setEditingQuickMessage(null);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: messages.length + 1,
      text: newMessage,
      sent: true,
      timestamp: new Date(),
      autor: selectedContact.phone,
      participant: selectedContact.phone,
      message_type: 'text',
      message_status: 'sent',
    };

    setMessages([...messages, message]);
    setNewMessage('');

    setTimeout(() => {
      const response: Message = {
        id: messages.length + 2,
        text: 'Mensagem recebida! 👋',
        sent: false,
        timestamp: new Date(),
        autor: selectedContact.phone,
        participant: selectedContact.phone,
        message_type: 'text',
        message_status: 'received',
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleEnhanceMessage = () => {
    const enhancedText = `${newMessage}\n\nMensagem aprimorada com sugestões profissionais e tom adequado ao contexto.`;
    setNewMessage(enhancedText);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    const updatedContact = mockContacts.find(c => c.id === selectedContact.id);
    if (updatedContact) {
      updatedContact.notes = e.target.value;
    }
  };

  const handleQuickMessageSelect = (message: QuickMessage) => {
    setNewMessage(message.text);
    setShowQuickMessages(false);
  };

  const handleAddQuickMessage = () => {
    const newMessage: QuickMessage = {
      id: quickMessages.length + 1,
      title: 'Nova mensagem',
      text: '',
    };
    setQuickMessages([...quickMessages, newMessage]);
    setEditingQuickMessage(newMessage);
  };

  const handleEditQuickMessage = (message: QuickMessage) => {
    setEditingQuickMessage(message);
  };

  const handleSaveQuickMessage = (id: number, newTitle: string, newText: string) => {
    setQuickMessages(messages =>
      messages.map(msg =>
        msg.id === id ? { ...msg, title: newTitle, text: newText } : msg
      )
    );
    setEditingQuickMessage(null);
  };

  const getTicketStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock size={14} className="text-amber-400" />;
      case 'resolved':
        return <CheckCircle2 size={14} className="text-emerald-400" />;
      case 'pending':
        return <AlertCircle size={14} className="text-orange-400" />;
      case 'closed':
        return <CheckCircle2 size={14} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getAttachmentIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FilePdf size={16} />;
      case 'image':
        return <FileImage size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const handleDeleteAttachment = (attachmentId: number) => {
    const updatedContact = {
      ...selectedContact,
      attachments: selectedContact.attachments.filter(att => att.id !== attachmentId),
    };
    const contactIndex = mockContacts.findIndex(c => c.id === selectedContact.id);
    if (contactIndex !== -1) {
      mockContacts[contactIndex] = updatedContact;
      setSelectedContact(updatedContact);
      if (selectedAttachment?.id === attachmentId) {
        setSelectedAttachment(null);
      }
    }
  };

  const handleSaveContact = () => {
    const contactIndex = mockContacts.findIndex(c => c.id === selectedContact.id);
    if (contactIndex !== -1) {
      mockContacts[contactIndex] = editedContact;
      setSelectedContact(editedContact);
      setEditingContact(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewAttachment(prev => ({ ...prev, file }));
    }
  };

  const handleAttachmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttachment.file || !newAttachment.name) return;

    const fileType = newAttachment.file.type.startsWith('image/') 
      ? 'image' 
      : newAttachment.file.type === 'application/pdf' 
        ? 'pdf' 
        : 'document';

    const attachment: Attachment = {
      id: Date.now(),
      name: newAttachment.name,
      type: fileType,
      url: URL.createObjectURL(newAttachment.file),
    };

    const updatedContact = {
      ...selectedContact,
      attachments: [...selectedContact.attachments, attachment],
    };

    const contactIndex = mockContacts.findIndex(c => c.id === selectedContact.id);
    if (contactIndex !== -1) {
      mockContacts[contactIndex] = updatedContact;
      setSelectedContact(updatedContact);
    }

    setNewAttachment({ name: '', description: '', file: null });
    setShowUploadModal(false);
  };

  return (
    <div className="flex h-screen bg-[#0f172a] overflow-hidden">
      {/* Navigation Sidebar */}
      <div className="w-16 bg-[#1e293b] flex flex-col items-center py-6 space-y-8">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <MessageSquare className="text-white" size={16} />
        </div>
        <nav className="flex flex-col items-center space-y-6">
          <button className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center text-white shadow-lg shadow-indigo-500/10">
            <Users size={16} />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
            <Bell size={16} />
          </button>
          <button className="w-8 h-8 rounded-lg hover:bg-[#0f172a] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
            <Settings size={16} />
          </button>
        </nav>
      </div>

      {/* Contacts List */}
      <div className="w-64 bg-[#1e293b] border-r border-[#334155]">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-medium text-white">Mensagens</h1>
            <button
              onClick={handleConnectionClick}
              className="relative group"
            >
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusStyles()}`} />
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 whitespace-nowrap text-xs bg-[#0f172a] text-white px-2 py-1 rounded transition-opacity">
                {connectionStatus === 'connected' ? 'Conectado' : 
                 connectionStatus === 'connecting' ? 'Conectando...' : 
                 'Desconectado'}
              </div>
            </button>
          </div>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Buscar"
              className="w-full px-3 py-2 pl-9 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-120px)] pr-1">
            {errorConversations && (
              <div className="text-red-400 text-xs p-2">{errorConversations}</div>
            )}
            {loadingConversations && (
              <div className="text-gray-400 text-xs p-2">Carregando conversas...</div>
            )}
            {conversations
              .slice() // copia para não mutar o state
              .sort((a, b) => {
                if (!a.data_ultima_mensagem && b.data_ultima_mensagem) return 1;
                if (a.data_ultima_mensagem && !b.data_ultima_mensagem) return -1;
                if (!a.data_ultima_mensagem && !b.data_ultima_mensagem) return 0;
                return new Date(b.data_ultima_mensagem!).getTime() - new Date(a.data_ultima_mensagem!).getTime();
              })
              .map(conv => {
  // Mapeia campos do banco para o formato esperado
  const name = conv.nome_contato || conv.remote_jid;
  const avatar = conv.foto_contato || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);
  // Para seleção, usa remote_jid como id único
  const isSelected = selectedContact && selectedContact.phone === conv.remote_jid;
  // Mini-ícones por labels
  const labelIcons: Record<string, JSX.Element> = {
    vip: <Star size={14} className="text-amber-400" />,
    automacao: <Zap size={14} className="text-indigo-300" />,
    // Adicione outros mapeamentos se quiser
  };
  return (
    <div
      key={conv.chat_id}
      onClick={() => setSelectedContact({
        id: Number(conv.chat_id),
        name,
        avatar,
        status: 'offline', // sempre cinza
        lastSeen: '',
        isVip: conv.labels?.includes('vip') ?? false,
        ticketStatus: 'active', // ajuste se quiser usar outro campo
        automationEnabled: conv.labels?.includes('automacao') ?? false,
        notes: '',
        age: 0,
        email: '',
        phone: conv.remote_jid,
        contributionTime: '',
        customerSince: '',
        preferredContact: '',
        lastPurchase: '',
        totalPurchases: 0,
        attachments: [],
      })}
      className={`p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
        isSelected
          ? 'bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 shadow-lg shadow-indigo-500/10'
          : 'hover:bg-[#0f172a]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#1e293b] bg-gray-400"
            />
            {/*
            // --- VISUAL ORIGINAL (mock) ---
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#1e293b] ${
              contact.status === 'online'
                ? 'bg-emerald-400'
                : contact.status === 'away'
                ? 'bg-amber-400'
                : 'bg-gray-400'
            }`}
            */}
          </div>
          <div>
            <h3 className={`text-sm font-medium ${
              isSelected ? 'text-white' : 'text-gray-300'
            }`}>{name}</h3>
            <p className={`text-xs ${
              isSelected ? 'text-indigo-300' : 'text-gray-500'
            }`}>
              {conv.data_ultima_mensagem ? new Date(conv.data_ultima_mensagem).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : ''}
            </p>
            {conv.ultima_mensagem && (
              <p className="text-xs text-gray-400 truncate max-w-[120px]">{conv.ultima_mensagem}</p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          {/* Mini-ícones por labels */}
          {conv.labels && conv.labels.map(label => labelIcons[label] ?? null)}
          {/* --- VISUAL ORIGINAL (mock) --- */}
          {/*
          {contact.isVip && (
            <Star 
              size={14} 
              className={`fill-current ${
                selectedContact.id === contact.id 
                  ? 'text-amber-400' 
                  : 'text-amber-400/50'
              }`}
            />
          )}
          {getTicketStatusIcon(contact.ticketStatus)}
          {contact.automationEnabled && (
            <Zap 
              size={14} 
              className={`${
                selectedContact.id === contact.id 
                  ? 'text-indigo-300' 
                  : 'text-gray-500'
              }`}
            />
          )}
          */}
          {/* Badge de não lidas */}
          {conv.mensagens_nao_lidas > 0 && (
            <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
        {/* Chat Header - Full Width */}
        <div className="px-6 py-4 bg-[#1e293b]/50 backdrop-blur-sm border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={selectedContact.avatar}
              alt={selectedContact.name}
              className="w-8 h-8 rounded-lg object-cover"
            />
            <div>
              <h2 className="text-sm font-medium text-white">{selectedContact.name}</h2>
              <p className="text-xs text-gray-400">{selectedContact.status === 'online' ? 'Online' : selectedContact.lastSeen}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowCrmPanel(!showCrmPanel)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                showCrmPanel 
                  ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white' 
                  : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
              }`}
            >
              {showCrmPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <button 
              onClick={() => setShowNotes(!showNotes)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                showNotes 
                  ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white' 
                  : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
              }`}
            >
              <StickyNote size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Video size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Phone size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Search size={14} />
            </button>
          </div>
        </div>

        {/* Chat Content and CRM Panel Container */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className={`flex flex-col ${showCrmPanel ? 'w-[80%]' : 'w-full'} transition-all duration-300`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {showNotes ? (
                <div className="h-full">
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Adicione suas anotações sobre o contato aqui..."
                    className="w-full h-full bg-[#1e293b]/30 rounded-lg p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  />
                </div>
              ) : (
                <div className="space-y-4" ref={chatContainerRef} style={{height: 'calc(100vh - 220px)', overflowY: 'auto'}}>
                  {loadingMessages && (
                    <div className="text-gray-400 text-xs p-2">Carregando mensagens...</div>
                  )}
                  {errorMessages && (
                    <div className="text-red-400 text-xs p-2">{errorMessages}</div>
                  )}
                  {loadingMoreMessages && (
                    <div className="text-gray-400 text-xs p-2">Carregando mais mensagens...</div>
                  )}
                  {(messagesDb || []).map((message, idx) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 mb-2 max-w-[70%] break-words shadow text-sm
                          ${message.sent ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white' : 'bg-[#334155] text-gray-100'}`}
                        style={{ position: 'relative' }}
                      >
                        {message.text}
                        {/* Timestamp e status visual */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-xs" style={{ color: message.sent ? '#cbd5e1' : '#94a3b8' }}>
                          {message.timestamp && (
                            <span className="text-gray-400">{message.timestamp.toLocaleString()}</span>
                          )}
                          {/* Status para todas as mensagens */}
                          <span className="ml-1 inline-flex items-center align-bottom">
                            {getMessageStatusIcon(message.message_status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!hasMoreMessages && messagesDb.length > 0 && (
                    <div className="text-center text-xs text-gray-500 my-2">Início do histórico</div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="mt-auto">
              <form onSubmit={handleSendMessage} className="p-4 bg-[#1e293b]/50 backdrop-blur-sm flex items-center space-x-2">
                <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
                  <Smile size={16} />
                </button>
                <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
                  <Paperclip size={16} />
                </button>
                <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
                  <ImageIcon size={16} />
                </button>
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Digite sua mensagem... (Pressione "/" para mensagens rápidas)'
                    className="w-full px-4 py-2 bg-[#0f172a]/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none min-h-[40px] max-h-[160px]"
                    style={{ height: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={handleEnhanceMessage}
                    className="absolute right-2 top-2 w-6 h-6 rounded-md bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-indigo-400 transition-all duration-300"
                  >
                    <Sparkles size={12} />
                  </button>
                  {showQuickMessages && (
                    <div
                      ref={quickMessagesRef}
                      className="absolute bottom-full left-0 mb-2 w-96 bg-[#1e293b] rounded-lg shadow-lg shadow-indigo-500/20 p-2 space-y-1"
                    >
                      {quickMessages.map(message => (
                        <div key={message.id}>
                          {editingQuickMessage?.id === message.id ? (
                            <div className="p-2 space-y-2">
                              <input
                                type="text"
                                value={message.title}
                                onChange={(e) => {
                                  const newTitle = e.target.value;
                                  setQuickMessages(messages =>
                                    messages.map(msg =>
                                      msg.id === message.id ? { ...msg, title: newTitle } : msg
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1 bg-[#0f172a] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                placeholder="Título"
                              />
                              <textarea
                                value={message.text}
                                onChange={(e) => {
                                  const newText = e.target.value;
                                  setQuickMessages(messages =>
                                    messages.map(msg =>
                                      msg.id === message.id ? { ...msg, text: newText } : msg
                                    )
                                  );
                                }}
                                className="w-full px-2 py-1 bg-[#0f172a] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                                placeholder="Mensagem"
                              />
                              <button
                                onClick={() => handleSaveQuickMessage(message.id, message.title, message.text)}
                                className="w-full px-2 py-1 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded text-sm text-white"
                              >
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <div
                              className="p-2 hover:bg-[#0f172a] rounded-lg flex items-center justify-between group cursor-pointer"
                              onClick={() => handleQuickMessageSelect(message)}
                            >
                              <div>
                                <h4 className="text-sm font-medium text-white">{message.title}</h4>
                                <p className="text-xs text-gray-400 truncate">{message.text}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditQuickMessage(message);
                                }}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                              >
                                <Edit size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={handleAddQuickMessage}
                        className="w-full p-2 hover:bg-[#0f172a] rounded-lg flex items-center justify-center space-x-2 text-gray-400 hover:text-white transition-all duration-300"
                      >
                        <Plus size={14} />
                        <span className="text-sm">Adicionar mensagem rápida</span>
                      </button>
                    </div>
                  )}
                </div>
                {newMessage ? (
                  <button
                    type="submit"
                    className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
                  >
                    <Send size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                  >
                    <Mic size={16} />
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* CRM Panel */}
          {showCrmPanel && (
            <div className="w-[20%] border-l border-[#334155] bg-[#1e293b]/30 flex flex-col">
              <div className="p-4 flex-1 overflow-hidden flex flex-col">
                {/* Toggle Buttons */}
                <div className="flex space-x-2 mb-4">
                  <button
                    onClick={() => setShowAttachments(false)}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      !showAttachments
                        ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                        : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Info size={14} />
                    <span className="text-sm">Informações</span>
                  </button>
                  <button
                    onClick={() => setShowAttachments(true)}
                    className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      showAttachments
                        ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                        : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    <FileBox size={14} />
                    <span className="text-sm">Anexos</span>
                  </button>
                </div>

                {/* Preview Area */}
                <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-[#0f172a]">
                  {selectedAttachment?.type === 'image' ? (
                    <img
                      src={selectedAttachment.url}
                      alt={selectedAttachment.name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedAttachment?.type === 'pdf' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <FilePdf size={48} className="text-gray-400" />
                    </div>
                  ) : (
                    <img
                      src={selectedContact.avatar}
                      alt={selectedContact.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                  {!showAttachments ? (
                    /* CRM Information */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-white">{selectedContact.name}</h2>
                        <button
                          onClick={() => setEditingContact(!editingContact)}
                          className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
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
                                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-gray-400">Email</label>
                              <input
                                type="email"
                                value={editedContact.email}
                                onChange={(e) => setEditedContact({ ...editedContact, email: e.target.value })}
                                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-gray-400">Telefone</label>
                              <input
                                type="text"
                                value={editedContact.phone}
                                onChange={(e) => setEditedContact({ ...editedContact, phone: e.target.value })}
                                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs text-gray-400">Idade</label>
                              <input
                                type="number"
                                value={editedContact.age}
                                onChange={(e) => setEditedContact({ ...editedContact, age: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <button
                                onClick={handleSaveContact}
                                className="w-full px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white text-sm"
                              >
                                Salvar Alterações
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
                    /* Attachments */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-white">Anexos</h3>
                        <button
                          onClick={() => setShowUploadModal(true)}
                          className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedContact.attachments.map(attachment => (
                          <div
                            key={attachment.id}
                            className={`p-3 rounded-lg flex items-center justify-between cursor-pointer ${
                              selectedAttachment?.id === attachment.id
                                ? 'bg-[#0f172a]'
                                : 'hover:bg-[#0f172a]'
                            }`}
                            onClick={() => setSelectedAttachment(
                              selectedAttachment?.id === attachment.id ? null : attachment
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              {getAttachmentIcon(attachment.type)}
                              <span className="text-sm text-white">{attachment.name}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAttachment(attachment.id);
                              }}
                              className="w-6 h-6 rounded bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {selectedContact.attachments.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Nenhum anexo disponível
                          </p>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-lg font-medium text-white mb-4">Adicionar Anexo</h3>
            <form onSubmit={handleAttachmentSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Nome do arquivo</label>
                <input
                  type="text"
                  value={newAttachment.name}
                  onChange={(e) => setNewAttachment(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Nome do arquivo"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Descrição</label>
                <textarea
                  value={newAttachment.description}
                  onChange={(e) => setNewAttachment(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                  placeholder="Descrição do arquivo"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Arquivo</label>
                <div className="mt-1 flex items-center justify-center w-full px-3 py-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-400 transition-colors">
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
                      onChange={handleFileUpload}
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
                  className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white text-sm"
                  disabled={!newAttachment.file || !newAttachment.name}
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div ref={modalRef} className="bg-[#1e293b] rounded-lg p-6 w-96 shadow-lg relative">
      {connectionStatus !== 'connected' ? (
        <>
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
            onClick={() => setShowConnectionModal(false)}
            aria-label="Fechar"
          >
            ×
          </button>
          <h3 className="text-lg font-medium text-white mb-4">Conectar WhatsApp</h3>
          <div className="bg-white p-4 rounded-lg mb-4 flex flex-col items-center justify-center min-h-[220px]">
            {loadingQr ? (
              <div className="text-gray-400">Carregando QR code...</div>
            ) : errorQr ? (
              <div className="text-red-500">{errorQr}</div>
            ) : qrData && qrData.code ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.code)}`}
                alt="QR Code"
                className="w-40 h-40 mx-auto"
              />
            ) : (
              <div className="text-gray-400">Nenhum QR code disponível.</div>
            )}
            {qrData && qrData.pairingCode && (
              <div className="mt-2 text-xs text-gray-600">Código: {qrData.pairingCode}</div>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Escaneie o QR code com seu WhatsApp para conectar
          </p>
          <div className="flex justify-end">
            <button
              onClick={() => setShowConnectionModal(false)}
              className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 text-sm hover:text-white transition-colors mr-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white text-sm"
              disabled={loadingQr}
            >
              Gerar novo QR
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
            onClick={() => setShowConnectionModal(false)}
            aria-label="Fechar"
          >
            ×
          </button>
          <h3 className="text-lg font-medium text-white mb-4">Desconectar WhatsApp</h3>
          <p className="text-sm text-gray-400 mb-4">
            Tem certeza que deseja desconectar o WhatsApp?
          </p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowConnectionModal(false)}
              className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 text-sm hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 rounded-lg text-white text-sm"
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

// Função utilitária para status visual (deve ficar fora do JSX)
function getMessageStatusIcon(status: string | null) {
  if (status === 'READ') {
    return <span title="Lido" style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1em', marginLeft: 2 }}>✓✓</span>;
  }
  if (status === 'DELIVERY_ACK') {
    return <span title="Entregue" style={{ color: '#94a3b8', fontWeight: 700, fontSize: '1em', marginLeft: 2 }}>✓✓</span>;
  }
  // NULL ou desconhecido: não mostra nada
  return null;
}

export default App;