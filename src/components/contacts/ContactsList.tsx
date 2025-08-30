import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import SimpleBar from 'simplebar-react';
import { ContactListItem, ContactFull } from '../ContactsPage';
import { defaultAvatar } from '../../utils';

interface ContactsListProps {
  contacts: ContactListItem[];
  selectedContact: ContactFull | null;
  onSelectContact: (contact: ContactListItem) => void;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  tagFilter: string;
  onTagFilterChange: (tag: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'new', label: 'Novo' },
  { value: 'open', label: 'Aberto' },
  { value: 'pending', label: 'Pendente' },
  { value: 'closed', label: 'Fechado' },
];

const getStatusBadge = (status: string) => {
  const styles = {
    new: 'bg-blue-600/20 text-blue-400',
    open: 'bg-emerald-600/20 text-emerald-400',
    pending: 'bg-amber-600/20 text-amber-400',
    closed: 'bg-gray-600/20 text-gray-400',
  };
  
  const labels = {
    new: 'Novo',
    open: 'Aberto',
    pending: 'Pendente',
    closed: 'Fechado',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.new}`}>
      {labels[status as keyof typeof labels] || status}
    </span>
  );
};

export const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  selectedContact,
  onSelectContact,
  loading,
  error,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  page,
  totalPages,
  onPageChange,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Filtros */}
      <div className="p-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nome ou cidade..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
          <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
        </div>

        {/* Filtros */}
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {STATUS_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button className="px-3 py-2 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white border border-[#334155] hover:border-indigo-400 transition-colors">
            <Filter size={14} />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4">
            <div className="p-3 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 text-sm">
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">Carregando contatos...</p>
          </div>
        ) : (
          <SimpleBar className="h-full px-4">
            <div className="space-y-2 pb-4">
              {contacts.map((contact) => {
                const isSelected = selectedContact?.id === contact.id;
                const avatar = contact.avatar_url || defaultAvatar(contact.name);
                
                return (
                  <div
                    key={contact.id}
                    onClick={() => onSelectContact(contact)}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-400/20 to-cyan-400/20 border border-indigo-400/30'
                        : 'hover:bg-[#0f172a]/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={avatar}
                        alt={contact.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = defaultAvatar(contact.name);
                        }}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-white truncate">
                            {contact.name}
                          </h3>
                          {contact.automation_enabled && (
                            <span className="text-xs text-indigo-400">🤖</span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusBadge(contact.status)}
                          {contact.city && (
                            <span className="text-xs text-gray-400">{contact.city}</span>
                          )}
                          {contact.age && (
                            <span className="text-xs text-gray-400">{contact.age} anos</span>
                          )}
                        </div>

                        {contact.custom_small?.email && (
                          <p className="text-xs text-gray-400 truncate">
                            📧 {String(contact.custom_small.email)}
                          </p>
                        )}

                        {contact.last_message_preview && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {contact.last_message_preview}
                          </p>
                        )}

                        {contact.tag_names && contact.tag_names.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.tag_names.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-[#334155] text-xs rounded-full text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                            {contact.tag_names.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{contact.tag_names.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {contacts.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum contato encontrado</p>
                  <p className="text-sm text-center">
                    {searchTerm || statusFilter 
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Seus contatos aparecerão aqui conforme as conversas chegarem.'
                    }
                  </p>
                </div>
              )}
            </div>
          </SimpleBar>
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[#334155]">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              <span className="text-sm">Anterior</span>
            </button>
            
            <span className="text-sm text-gray-400">
              {page + 1} de {totalPages}
            </span>
            
            <button
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-sm">Próxima</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};