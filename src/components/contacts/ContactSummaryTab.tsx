import React, { useState } from 'react';
import { ContactFull } from '../ContactsPage';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { 
  Edit, 
  Save, 
  X, 
  MessageSquare, 
  Bot, 
  Tag, 
  Plus,
  Trash2,
  ExternalLink 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ContactSummaryTabProps {
  contact: ContactFull;
  onContactUpdated: () => void;
}

export const ContactSummaryTab: React.FC<ContactSummaryTabProps> = ({
  contact,
  onContactUpdated,
}) => {
  const navigate = useNavigate();
  const { current } = useInstances();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: contact.name,
    city: contact.city || '',
    age: contact.age || '',
    status: contact.status,
  });

  const handleSave = async () => {
    if (!current?.WORKSPACE_ID) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .schema('crm')
        .from('contacts')
        .update({
          name: editForm.name,
          city: editForm.city || null,
          age: editForm.age ? Number(editForm.age) : null,
          status: editForm.status,
        })
        .eq('id', contact.id)
        .eq('workspace_id', current.WORKSPACE_ID);

      if (error) throw error;
      
      setEditing(false);
      onContactUpdated();
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutomation = async () => {
    if (!current?.WORKSPACE_ID) return;
    
    try {
      const { error } = await supabase
        .schema('crm')
        .from('contacts')
        .update({ automation_enabled: !contact.automation_enabled })
        .eq('id', contact.id)
        .eq('workspace_id', current.WORKSPACE_ID);

      if (error) throw error;
      onContactUpdated();
    } catch (err: any) {
      console.error('Erro ao alterar automação:', err);
    }
  };

  const openChat = (remoteJid: string) => {
    // Navegar para o chat principal com este contato selecionado
    navigate(`/?contact=${encodeURIComponent(remoteJid)}`);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Informações básicas */}
      <div className="bg-[#1e293b]/30 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Informações Básicas</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Edit size={14} />
              <span className="text-sm">Editar</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditing(false)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X size={14} />
                <span className="text-sm">Cancelar</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all disabled:opacity-50"
              >
                <Save size={14} />
                <span className="text-sm">{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cidade</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Idade</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="new">Novo</option>
                  <option value="open">Aberto</option>
                  <option value="pending">Pendente</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                <p className="text-white">{contact.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Cidade</label>
                <p className="text-white">{contact.city || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Idade</label>
                <p className="text-white">{contact.age || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  contact.status === 'new' ? 'bg-blue-600/20 text-blue-400' :
                  contact.status === 'open' ? 'bg-emerald-600/20 text-emerald-400' :
                  contact.status === 'pending' ? 'bg-amber-600/20 text-amber-400' :
                  'bg-gray-600/20 text-gray-400'
                }`}>
                  {contact.status}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Identidades WhatsApp */}
      {contact.identities && contact.identities.length > 0 && (
        <div className="px-6 py-4 border-b border-[#334155]">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Identidades WhatsApp</h3>
          <div className="space-y-2">
            {contact.identities.map((identity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-[#1e293b]/30 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white font-mono">{identity.remote_jid}</p>
                  <p className="text-xs text-gray-400">Instância: {identity.instance_id}</p>
                </div>
                <button
                  onClick={() => openChat(identity.remote_jid)}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all"
                >
                  <MessageSquare size={14} />
                  <span className="text-sm">Abrir Chat</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campos customizados (preview) */}
      {contact.custom && Object.keys(contact.custom).length > 0 && (
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Campos Customizados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(contact.custom).slice(0, 6).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-400 mb-1 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <p className="text-white text-sm">
                  {value === null || value === undefined 
                    ? '—' 
                    : typeof value === 'object' 
                    ? JSON.stringify(value) 
                    : String(value)
                  }
                </p>
              </div>
            ))}
          </div>
          {Object.keys(contact.custom).length > 6 && (
            <p className="text-xs text-gray-500 mt-3">
              +{Object.keys(contact.custom).length - 6} campos adicionais na aba "Campos"
            </p>
          )}
        </div>
      )}

      {/* Ações rápidas */}
      <div className="px-6 py-4 border-t border-[#334155] bg-[#1e293b]/20">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleToggleAutomation}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              contact.automation_enabled
                ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30'
                : 'bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a]'
            }`}
          >
            <Bot size={16} />
            <span className="text-sm">
              {contact.automation_enabled ? 'Desativar Automação' : 'Ativar Automação'}
            </span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white hover:bg-[#0f172a] transition-all">
            <Tag size={16} />
            <span className="text-sm">Gerenciar Tags</span>
          </button>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#0f172a]/50 rounded-lg text-gray-400 hover:text-white hover:bg-[#0f172a] transition-all">
            <ExternalLink size={16} />
            <span className="text-sm">Ações Externas</span>
          </button>
        </div>
      </div>
    </div>
  );
};