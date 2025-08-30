import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { CustomFieldsTab } from './settings/CustomFieldsTab';
import { VariablesTab } from './settings/VariablesTab';
import { LinksTab } from './settings/LinksTab';
import { ArrowLeft, Database, Bot, Link } from 'lucide-react';

type TabType = 'fields' | 'variables' | 'links';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('fields');

  const tabs = [
    {
      id: 'fields' as const,
      label: 'Campos CRM',
      icon: Database,
      description: 'Gerenciar campos customizados para contatos e conversas'
    },
    {
      id: 'variables' as const,
      label: 'Variáveis Bot',
      icon: Bot,
      description: 'Configurar variáveis do sistema de automação'
    },
    {
      id: 'links' as const,
      label: 'Vínculos',
      icon: Link,
      description: 'Conectar variáveis do bot aos campos do CRM'
    }
  ];

  return (
    <div className="flex h-screen bg-[#0f172a] text-white">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#334155] bg-[#1e293b]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a] transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Voltar</span>
              </button>
              <h1 className="text-2xl font-bold text-white">Configurações</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mt-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all duration-200 ${
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

          {/* Tab description */}
          <p className="text-sm text-gray-400 mt-3">
            {tabs.find(t => t.id === activeTab)?.description}
          </p>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'fields' && <CustomFieldsTab />}
          {activeTab === 'variables' && <VariablesTab />}
          {activeTab === 'links' && <LinksTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;