import React, { useState, useEffect } from 'react';
import { ContactFull } from '../ContactsPage';
import { Clock, User, Tag, Edit, Bot } from 'lucide-react';
import SimpleBar from 'simplebar-react';

interface ContactActivityTabProps {
  contact: ContactFull;
}

interface ActivityItem {
  id: string;
  type: 'created' | 'status_change' | 'tag_added' | 'tag_removed' | 'field_updated' | 'automation_toggle';
  description: string;
  timestamp: string;
  user?: string;
  details?: Record<string, unknown>;
}

export const ContactActivityTab: React.FC<ContactActivityTabProps> = ({
  contact,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Mock de atividades - em produção, você implementaria um sistema de auditoria
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'created',
        description: 'Contato criado',
        timestamp: contact.created_at,
        user: 'Sistema',
      },
      {
        id: '2',
        type: 'status_change',
        description: `Status alterado para "${contact.status}"`,
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
        user: 'João Silva',
      },
      {
        id: '3',
        type: 'automation_toggle',
        description: contact.automation_enabled ? 'Automação ativada' : 'Automação desativada',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 dias atrás
        user: 'Maria Santos',
      },
    ];

    setActivities(mockActivities);
  }, [contact]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'created':
        return <User size={16} className="text-blue-400" />;
      case 'status_change':
        return <Edit size={16} className="text-amber-400" />;
      case 'tag_added':
      case 'tag_removed':
        return <Tag size={16} className="text-purple-400" />;
      case 'field_updated':
        return <Edit size={16} className="text-emerald-400" />;
      case 'automation_toggle':
        return <Bot size={16} className="text-indigo-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Timeline de Atividades</h2>
        <span className="text-sm text-gray-400">
          {activities.length} atividade{activities.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">Carregando atividades...</p>
          </div>
        ) : (
          <SimpleBar className="h-full">
            <div className="space-y-4">
              {activities.map((activity, idx) => (
                <div key={activity.id} className="flex space-x-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#1e293b] border-2 border-[#334155] flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    {idx < activities.length - 1 && (
                      <div className="w-0.5 h-8 bg-[#334155] mt-2" />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="bg-[#1e293b]/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm text-white font-medium">
                          {activity.description}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-3">
                          {new Date(activity.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      {activity.user && (
                        <p className="text-xs text-gray-400">
                          por {activity.user}
                        </p>
                      )}
                      
                      {activity.details && (
                        <div className="mt-2 p-2 bg-[#0f172a]/50 rounded text-xs text-gray-300">
                          <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {activities.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Clock size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma atividade registrada</p>
                  <p className="text-sm text-center">
                    As atividades do contato aparecerão aqui conforme as interações acontecem.
                  </p>
                </div>
              )}
            </div>
          </SimpleBar>
        )}
      </div>
    </div>
  );
};