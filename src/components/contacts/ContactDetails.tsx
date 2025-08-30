import React, { useState } from 'react';
import { ContactFull } from '../ContactsPage';
import { ContactSummaryTab } from './ContactSummaryTab';
import { ContactConversationsTab } from './ContactConversationsTab';
import { ContactFieldsTab } from './ContactFieldsTab';
import { ContactActivityTab } from './ContactActivityTab';
import { ContactAutomationTab } from './ContactAutomationTab';
import { 
  User, 
  MessageSquare, 
  Activity, 
  Database, 
  Bot,
  Loader2 
} from 'lucide-react';

interface ContactDetailsProps {
  contact: ContactFull;
  loading: boolean;
  onContactUpdated: () => void;
}

type TabType = 'summary' | 'conversations' | 'activity' | 'fields' | 'automation';

const tabs = [
  { id: 'summary' as const, label: 'Resumo', icon: User },
  { id: 'conversations' as const, label: 'Conversas', icon: MessageSquare },
  { id: 'activity' as const, label: 'Atividade', icon: Activity },
  { id: 'fields' as const, label: 'Campos', icon: Database },
  { id: 'automation' as const, label: 'Automação', icon: Bot },
];

export const ContactDetails: React.FC<ContactDetailsProps> = ({
  contact,
  loading,
  onContactUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('summary');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Carregando detalhes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[#334155] bg-[#1e293b]/50">
        <div className="flex items-center space-x-4 mb-4">
          <img
            src={contact.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}`}
            alt={contact.name}
            className="w-16 h-16 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">{contact.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                contact.status === 'new' ? 'bg-blue-600/20 text-blue-400' :
                contact.status === 'open' ? 'bg-emerald-600/20 text-emerald-400' :
                contact.status === 'pending' ? 'bg-amber-600/20 text-amber-400' :
                'bg-gray-600/20 text-gray-400'
              }`}>
                {contact.status}
              </span>
              {contact.automation_enabled && (
                <span className="px-2 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-medium">
                  Automação ativa
                </span>
              )}
              {contact.city && (
                <span className="text-sm text-gray-400">{contact.city}</span>
              )}
              {contact.age && (
                <span className="text-sm text-gray-400">{contact.age} anos</span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {contact.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 rounded-full text-sm font-medium border"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : '#334155',
                  borderColor: tag.color || '#334155',
                  color: tag.color || '#94a3b8',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white shadow-lg'
                    : 'bg-[#0f172a]/30 text-gray-400 hover:text-white hover:bg-[#0f172a]/50'
                }`}
              >
                <Icon size={16} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'summary' && (
          <ContactSummaryTab 
            contact={contact} 
            onContactUpdated={onContactUpdated} 
          />
        )}
        {activeTab === 'conversations' && (
          <ContactConversationsTab 
            contact={contact} 
          />
        )}
        {activeTab === 'activity' && (
          <ContactActivityTab 
            contact={contact} 
          />
        )}
        {activeTab === 'fields' && (
          <ContactFieldsTab 
            contact={contact} 
            onContactUpdated={onContactUpdated} 
          />
        )}
        {activeTab === 'automation' && (
          <ContactAutomationTab 
            contact={contact} 
            onContactUpdated={onContactUpdated} 
          />
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[#334155] bg-[#1e293b]/30">
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              <span className="text-sm">Anterior</span>
            </button>
            
            <span className="text-sm text-gray-400">
              Página {page + 1} de {totalPages}
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