import React from 'react';
import * as Icons from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { ChatSummary, Conversation } from '../types';
import { defaultAvatar } from '../utils';

import type { WhatsappFilter } from '../hooks/useWhatsappFilters';
import { useFlagsFilters } from '../hooks/useFlagsFilters';

interface ChatListProps {
  conversations: Conversation[];
  selectedChat: ChatSummary;
  onSelectChat: (c: ChatSummary) => void;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  onStatusClick: () => void;
  presences?: { [jid: string]: string };
  whatsappFilters?: WhatsappFilter[];
  labelSelecionada?: string | null;
  setLabelSelecionada?: (id: string | null) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  selectedChat,
  onSelectChat,
  loading,
  error,
  connectionStatus,
  onStatusClick,
  presences = {},
  whatsappFilters = [],
  labelSelecionada = null,
  setLabelSelecionada = () => {},
}) => {
  const [showFiltersDropdown, setShowFiltersDropdown] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [flagSelecionado, setFlagSelecionado] = React.useState<string | null>(null);
  const [showFlagsDropdown, setShowFlagsDropdown] = React.useState(false);
  const flagsFilters = useFlagsFilters(conversations);

  const filteredConversations = React.useMemo(() => {
    let list = conversations;
    if (labelSelecionada) {
      list = list.filter(conv => {
        if (!conv.whatsappFilters) return false;
        return conv.whatsappFilters.map(String).includes(String(labelSelecionada));
      });
    }
    if (flagSelecionado) {
      list = list.filter(conv =>
        conv.contactFlags.some(f => f.labelId === flagSelecionado)
      );
    }
    if (!searchTerm.trim()) return list;
    const term = searchTerm.trim().toLowerCase();
    return list.filter(conv => {
      const name = (conv.nome_contato || '').toLowerCase();
      const jid = (conv.remote_jid || '').toLowerCase();
      return name.includes(term) || jid.includes(term);
    });
  }, [conversations, searchTerm, labelSelecionada, flagSelecionado]);
  const dotClass =
    connectionStatus === 'connected'
      ? 'bg-emerald-400/50'
      : connectionStatus === 'connecting'
      ? 'bg-amber-400 animate-pulse'
      : 'bg-red-400 animate-pulse';

  return (
    <div className="w-64 min-w-0 max-w-xs bg-[#1e293b] border-r border-[#334155] overflow-x-clip ">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-medium text-white">Mensagens</h1>
          <button
            onClick={onStatusClick}
            className="focus:outline-none"
            title="Status de conexão"
          >
            <div className={`w-3 h-3 rounded-full ${dotClass}`} />
          </button>
        </div>

      <div className="mb-2">
        <div className="relative mb-2">
          <input
            type="text"
            placeholder="Buscar"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-9 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <Icons.Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
        </div>
        <div className="relative">
          <button
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium shadow-sm transition-colors duration-150 focus:outline-none max-w-full ${labelSelecionada ? 'bg-cyan-900 border-cyan-500 text-cyan-200' : 'bg-[#1e293b] border-[#334155] text-gray-200 hover:bg-[#334155]'}`}
            style={{ maxWidth: '100%', minWidth: '0' }}
            onClick={e => {
              e.preventDefault();
              setShowFiltersDropdown((v: boolean) => !v);
            }}
            type="button"
            title="Filtrar por label"
          >
            <Icons.Tag size={16} className="mr-1 text-cyan-400 shrink-0" />
            <span className="truncate max-w-[120px] inline-block align-middle">
              {labelSelecionada
                ? (whatsappFilters.find(l => l.labelId === labelSelecionada)?.name || 'Label')
                : 'Label'}
            </span>
            <span className="ml-1 text-xs">▼</span>
          </button>
          {showFiltersDropdown && (
            <div className="absolute z-20 mt-2 left-0 w-56 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-fadeIn">
              <button
                className="block w-full text-left px-4 py-2 text-xs hover:bg-[#334155] text-gray-300 rounded-t-xl"
                onClick={() => { setLabelSelecionada(null); setShowFiltersDropdown(false); }}
                style={{ borderBottom: whatsappFilters.length ? '1px solid #334155' : undefined }}
              >
                <span className="inline-block w-3 h-3 rounded-full bg-slate-400 mr-2 align-middle" />
                Limpar filtro
              </button>
              {whatsappFilters.map(label => {
                // Mapeamento de cor: se for número, converte para HSL; senão tenta hex/rgb/hsl; senão fallback
                let color = label.color;
                if (/^\d+$/.test(color)) {
                  // Mapeamento tipo hash: valores próximos ficam distantes no círculo cromático
                  const n = Math.max(0, Math.min(100, parseInt(color, 10)));
                  const hue = (n * 137) % 360; // 137 é um número primo para dispersão
                  color = `hsl(${hue}, 70%, 50%)`;
                } else if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color) && !/^rgb/.test(color) && !/^hsl/.test(color)) {
                  color = '#64748b';
                }
                return (
                  <button
                    key={label.labelId}
                    className={`flex items-center w-full px-4 py-2 text-xs hover:bg-[#334155] transition-colors ${labelSelecionada === label.labelId ? 'bg-cyan-950 text-cyan-200 font-semibold' : 'text-gray-200'}`}
                    style={{ borderLeft: `6px solid ${color}` }}
                    onClick={() => { setLabelSelecionada(label.labelId); setShowFiltersDropdown(false); }}
                    type="button"
                  >
                    <span className="w-3 h-3 rounded-full mr-2 border border-[#334155]" style={{ background: color, display: 'inline-block' }} />
                    {label.name}
                  </button>
                );
              })}
            </div>
          )}
          </div>
          <div className="relative mt-2">
            <button
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium shadow-sm transition-colors duration-150 focus:outline-none max-w-full ${flagSelecionado ? 'bg-cyan-900 border-cyan-500 text-cyan-200' : 'bg-[#1e293b] border-[#334155] text-gray-200 hover:bg-[#334155]'}`}
              style={{ maxWidth: '100%', minWidth: '0' }}
              onClick={e => {
                e.preventDefault();
                setShowFlagsDropdown((v: boolean) => !v);
              }}
              type="button"
              title="Filtrar por flag"
            >
              {flagSelecionado ? (() => {
                const sel = flagsFilters.find(f => f.labelId === flagSelecionado);
                const Icon = sel ? (Icons[sel.icon as keyof typeof Icons] || Icons.Flag) : Icons.Flag;
                return <Icon size={16} style={{ color: sel?.color }} className="mr-1 shrink-0" />;
              })() : (
                <Icons.Flag size={16} className="mr-1 text-cyan-400 shrink-0" />
              )}
              <span className="truncate max-w-[120px] inline-block align-middle">
                {flagSelecionado
                  ? (flagsFilters.find(f => f.labelId === flagSelecionado)?.label || 'Flag')
                  : 'Flag'}
              </span>
              <span className="ml-1 text-xs">▼</span>
            </button>
            {showFlagsDropdown && (
              <div className="absolute z-20 mt-2 left-0 w-56 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-fadeIn">
                <button
                  className="block w-full text-left px-4 py-2 text-xs hover:bg-[#334155] text-gray-300 rounded-t-xl"
                  onClick={() => { setFlagSelecionado(null); setShowFlagsDropdown(false); }}
                  style={{ borderBottom: flagsFilters.length ? '1px solid #334155' : undefined }}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-slate-400 mr-2 align-middle" />
                  Limpar filtro
                </button>
                {flagsFilters.map(flag => {
                  const Icon = (Icons[flag.icon as keyof typeof Icons] || Icons.Flag);
                  return (
                    <button
                      key={flag.labelId}
                      className={`flex items-center w-full px-4 py-2 text-xs hover:bg-[#334155] transition-colors ${flagSelecionado === flag.labelId ? 'bg-cyan-950 text-cyan-200 font-semibold' : 'text-gray-200'}`}
                      style={{ borderLeft: `6px solid ${flag.color}` }}
                      onClick={() => { setFlagSelecionado(flag.labelId); setShowFlagsDropdown(false); }}
                      type="button"
                    >
                      <Icon size={14} className="mr-2" style={{ color: flag.color }} />
                      {flag.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s; }
      `}</style>

      {error && <p className="text-xs text-red-400 p-2">{error}</p>}
      {loading && <p className="text-xs text-gray-400 p-2">Carregando…</p>}

      <SimpleBar className="space-y-2 pr-1" style={{maxHeight: 'calc(100vh - 140px)'}} autoHide={true}>
        {filteredConversations.map((conv) => {
          const name   = conv.nome_contato || conv.remote_jid;
          const avatar = conv.foto_contato || defaultAvatar(name);
          const isSel  = selectedChat.phone === conv.remote_jid;

          return (
            <div
              key={conv.chat_id}
              onClick={() =>
                onSelectChat({
                  chatId: Number(conv.chat_id),
                  crmContactId: conv.contactId || '',
                  name,
                  avatar,
                  phone: conv.remote_jid,
                  status: 'offline',
                  lastSeen: '',
                  isVip: conv.contactFlags.some(f => f.labelId === 'vip'),
                  ticketStatus: 'active',
                  automationEnabled: conv.contactFlags.some(f => f.labelId === 'automacao'),
                  notes: '',
                  attachments: [],
                })
              }
              className={`p-2.5 rounded-lg cursor-pointer transition ${isSel
                ? 'bg-gradient-to-r from-indigo-400/20 to-cyan-400/20'
                : 'hover:bg-[#0f172a]'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={avatar}
                    alt={name}
                    onError={e => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = defaultAvatar(name);
                    }}
                    className="w-8 h-8 rounded-lg"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-white truncate break-words max-w-[120px]">{name}</h3>

{conv.data_ultima_mensagem && (() => {
  let dateObj: Date;
  const raw = conv.data_ultima_mensagem;
  if (typeof raw === 'number' || (/^\d+$/.test(raw as string) && raw !== null)) {
    dateObj = new Date(Number(raw) * 1000);
  } else {
    dateObj = new Date(raw as string);
  }
  const isSelected = selectedChat.phone === conv.remote_jid;
  return (
    <p className={`text-xs ${isSelected ? 'text-indigo-300' : 'text-gray-500'}`}>
      {isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
    </p>
  );
})()}

{presences[conv.remote_jid] === 'composing' ? (
  <p className="text-xs text-sky-400 animate-pulse max-w-[120px]">Digitando…</p>
) : presences[conv.remote_jid] === 'recording' ? (
  <p className="text-xs text-amber-400 animate-pulse max-w-[120px]">Gravando áudio…</p>
) : conv.ultima_mensagem && (
  <p className="text-xs text-gray-400 truncate max-w-[120px]">{conv.ultima_mensagem}</p>
)}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {[...conv.contactFlags]
                    .sort((a, b) => a.priority - b.priority)
                    .map(flag => {
                      const Icon = (Icons[flag.icon as keyof typeof Icons] || Icons.Tag);
                      return (
                        <Icon
                          key={flag.labelId}
                          size={14}
                          style={{ color: flag.color }}
                        />
                      );
                    })}
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
      </SimpleBar>
    </div>
  </div>
  );
}