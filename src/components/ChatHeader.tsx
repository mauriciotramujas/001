import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Video,
  Phone,
  Search,
} from 'lucide-react';
import { ChatSummary } from '../types';
import { defaultAvatar } from '../utils';

interface ChatHeaderProps {
  chat: ChatSummary;
  showCrmPanel: boolean;
  toggleCrmPanel: () => void;
  showNotes: boolean;
  toggleNotes: () => void;
  presence?: string; // 'composing', 'recording', etc
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  showCrmPanel,
  toggleCrmPanel,
  showNotes,
  toggleNotes,
  presence,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
}) => {
  const [showSearch, setShowSearch] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Sincroniza estado local e externo
  React.useEffect(() => {
    if (typeof externalSearchTerm === 'string') setLocalSearch(externalSearchTerm);
  }, [externalSearchTerm]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalSearch(e.target.value);
    if (onSearchTermChange) onSearchTermChange(e.target.value);
  }
  function handleClose() {
    setShowSearch(false);
    setLocalSearch('');
    if (onSearchTermChange) onSearchTermChange('');
  }

  return (
  <div className="px-6 py-4 bg-[#1e293b]/50 border-b border-[#334155] flex items-center justify-between">
    <div className="flex items-center space-x-3">
      <img
        src={chat.avatar}
        alt={chat.name}
        onError={e => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = defaultAvatar(chat.name);
        }}
        className="w-8 h-8 rounded-lg"
      />
      <div>
        <h2 className="text-sm font-medium text-white">{chat.name}</h2>
        <p className="text-xs text-gray-400 text-center">
          {chat.status === 'online' ? 'Online' : chat.lastSeen}
        </p>
        {/* Reserva de espaço para presença, centralizado e bonito */}
        <div style={{ minHeight: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {presence === 'composing' && (
            <span className="text-xs text-sky-400 animate-pulse">Digitando…</span>
          )}
          {presence === 'recording' && (
            <span className="text-xs text-amber-400 animate-pulse">Gravando áudio…</span>
          )}
        </div>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      {showSearch ? (
        <div className="relative flex items-center w-56">
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={handleInputChange}
            placeholder="Buscar na conversa…"
            className="w-full px-3 py-2 pl-9 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            style={{ minWidth: 0 }}
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
          <button
            onClick={handleClose}
            className="absolute right-2 top-2.5 text-gray-400 hover:text-white"
            tabIndex={-1}
            aria-label="Fechar busca"
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={toggleCrmPanel}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              showCrmPanel
                ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
            }`}
          >
            {showCrmPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button
            onClick={toggleNotes}
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
          <button
            className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
            onClick={() => setShowSearch(true)}
            aria-label="Buscar na conversa"
          >
            <Search size={14} />
          </button>
        </>
      )}
    </div>
  </div>
 );
}