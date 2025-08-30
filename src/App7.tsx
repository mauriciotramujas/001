import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, Video, Search, Paperclip, Smile, Image, Mic, MessageSquare, Users, Settings, Bell, Sparkles, StickyNote, Zap, Star, CheckCircle2, Clock, AlertCircle, Plus, Edit } from 'lucide-react';

const mockContacts = [
  { 
    id: 1, 
    name: 'João Silva', 
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100', 
    status: 'online', 
    lastSeen: 'agora', 
    notes: 'Cliente VIP - Prefere comunicação formal\nÚltima reunião: 15/03/2024\nPontos importantes:\n- Interessado em novos produtos\n- Sempre responde rápido',
    automationEnabled: true,
    isVip: true,
    ticketStatus: 'active'
  },
  { 
    id: 2, 
    name: 'Maria Santos', 
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', 
    status: 'offline', 
    lastSeen: '23m atrás', 
    notes: 'Contato inicial via LinkedIn\nSetor: Marketing Digital',
    automationEnabled: false,
    isVip: false,
    ticketStatus: 'resolved'
  },
  { 
    id: 3, 
    name: 'Pedro Costa', 
    avatar: 'https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=100', 
    status: 'away', 
    lastSeen: '1h atrás', 
    notes: 'Reuniões preferencialmente pela manhã\nProjeto em andamento desde 02/2024',
    automationEnabled: true,
    isVip: false,
    ticketStatus: 'pending'
  },
  { 
    id: 4, 
    name: 'Ana Oliveira', 
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', 
    status: 'online', 
    lastSeen: 'agora', 
    notes: 'Projeto de expansão em análise\nPreferência por reuniões à tarde',
    automationEnabled: true,
    isVip: true,
    ticketStatus: 'active'
  },
  { 
    id: 5, 
    name: 'Lucas Mendes', 
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100', 
    status: 'offline', 
    lastSeen: '2h atrás', 
    notes: 'Aguardando retorno sobre proposta',
    automationEnabled: false,
    isVip: false,
    ticketStatus: 'closed'
  },
  { 
    id: 6, 
    name: 'Carla Souza', 
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100', 
    status: 'away', 
    lastSeen: '45m atrás', 
    notes: 'Cliente desde 2023\nFoco em soluções personalizadas',
    automationEnabled: true,
    isVip: false,
    ticketStatus: 'active'
  },
  { 
    id: 7, 
    name: 'Roberto Alves', 
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100', 
    status: 'online', 
    lastSeen: 'agora', 
    notes: 'Novo cliente\nInteressado em pacote premium',
    automationEnabled: false,
    isVip: true,
    ticketStatus: 'pending'
  },
  { 
    id: 8, 
    name: 'Sofia Lima', 
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100', 
    status: 'offline', 
    lastSeen: '3h atrás', 
    notes: 'Contrato em renovação\nHistórico de alto engajamento',
    automationEnabled: true,
    isVip: false,
    ticketStatus: 'resolved'
  }
];

interface Message {
  id: number;
  text: string;
  sent: boolean;
  timestamp: Date;
  enhanced?: boolean;
}

interface QuickMessage {
  id: number;
  title: string;
  text: string;
}

function App() {
  const [selectedContact, setSelectedContact] = useState(mockContacts[0]);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const quickMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [newMessage]);

  useEffect(() => {
    setNotes(selectedContact.notes);
    setShowNotes(false);
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
      enhanced: false,
    };

    setMessages([...messages, message]);
    setNewMessage('');

    setTimeout(() => {
      const response: Message = {
        id: messages.length + 2,
        text: 'Mensagem recebida! 👋',
        sent: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleEnhanceMessage = () => {
    // Simula uma melhoria da mensagem usando IA
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

  return (
    <div className="flex h-screen bg-[#0f172a]">
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
          <h1 className="text-lg font-medium text-white mb-4">Mensagens</h1>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Buscar"
              className="w-full px-3 py-2 pl-9 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
          </div>
          <div className="space-y-2">
            {mockContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all duration-300 ${
                  selectedContact.id === contact.id
                    ? 'bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 shadow-lg shadow-indigo-500/10'
                    : 'hover:bg-[#0f172a]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={contact.avatar}
                        alt={contact.name}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#1e293b] ${
                          contact.status === 'online'
                            ? 'bg-emerald-400'
                            : contact.status === 'away'
                            ? 'bg-amber-400'
                            : 'bg-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${
                        selectedContact.id === contact.id ? 'text-white' : 'text-gray-300'
                      }`}>{contact.name}</h3>
                      <p className={`text-xs ${
                        selectedContact.id === contact.id ? 'text-indigo-300' : 'text-gray-500'
                      }`}>{contact.lastSeen}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
        {/* Chat Header */}
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

        {/* Messages or Notes Area */}
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
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sent ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[60%] px-4 py-2 rounded-2xl shadow-lg ${
                      message.sent
                        ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-br-none shadow-indigo-500/20'
                        : 'bg-[#1e293b] rounded-bl-none shadow-indigo-500/10'
                    }`}
                  >
                    <p className="text-sm text-white whitespace-pre-wrap">{message.text}</p>
                    <p className="text-[10px] mt-1 text-right text-white/60">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#1e293b]/50 backdrop-blur-sm flex items-center space-x-2">
          <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
            <Smile size={16} />
          </button>
          <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
            <Paperclip size={16} />
          </button>
          <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300">
            <Image size={16} />
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
  );
}

export default App;