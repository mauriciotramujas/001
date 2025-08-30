import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Plus, Edit, Trash2, Copy, Search, Database } from 'lucide-react';
import { CustomFieldModal } from './CustomFieldModal';
import SimpleBar from 'simplebar-react';

export type CustomFieldType = 
  | 'text' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'select' | 'multi_select' | 'json';

export interface CustomField {
  id: string;
  workspace_id: string;
  entity_type: 'contact' | 'conversation';
  key: string;
  label: string;
  type: CustomFieldType;
  options: any;
  is_required: boolean;
  is_indexed: boolean;
  created_at: string;
  updated_at?: string;
}

export const CustomFieldsTab: React.FC = () => {
  const { current } = useInstances();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'all' | 'contact' | 'conversation'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFields = useCallback(async () => {
    if (!current?.WORKSPACE_ID) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .schema('crm')
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', current.WORKSPACE_ID)
      .order('entity_type')
      .order('label');

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setFields(data as CustomField[]);
    }
    setLoading(false);
  }, [current?.WORKSPACE_ID]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const filteredFields = fields.filter(field => {
    const matchesSearch = 
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEntity = entityFilter === 'all' || field.entity_type === entityFilter;
    return matchesSearch && matchesEntity;
  });

  const handleCreate = () => {
    setEditingField(null);
    setModalOpen(true);
  };

  const handleEdit = (field: CustomField) => {
    setEditingField(field);
    setModalOpen(true);
  };

  const handleDuplicate = async (field: CustomField) => {
    if (!current?.WORKSPACE_ID) return;
    
    const newField = {
      workspace_id: current.WORKSPACE_ID,
      entity_type: field.entity_type,
      key: `${field.key}_copy`,
      label: `${field.label} (Cópia)`,
      type: field.type,
      options: field.options,
      is_required: field.is_required,
      is_indexed: field.is_indexed,
    };

    const { error } = await supabase
      .schema('crm')
      .from('custom_fields')
      .insert([newField]);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Campo duplicado com sucesso!' });
      fetchFields();
    }
  };

  const handleDelete = async (field: CustomField) => {
    if (!current?.WORKSPACE_ID) return;
    
    if (!confirm(`Tem certeza que deseja excluir o campo "${field.label}"?`)) return;

    // Verificar dependências
    const { data: values } = await supabase
      .schema('crm')
      .from('custom_field_values')
      .select('id')
      .eq('field_id', field.id)
      .limit(1);

    const { data: variables } = await supabase
      .schema('bot')
      .from('variables')
      .select('id')
      .eq('crm_field_id', field.id)
      .limit(1);

    if (values?.length || variables?.length) {
      setMessage({ 
        type: 'error', 
        text: 'Não é possível excluir este campo pois existem dados ou variáveis vinculadas a ele.' 
      });
      return;
    }

    const { error } = await supabase
      .schema('crm')
      .from('custom_fields')
      .delete()
      .eq('id', field.id)
      .eq('workspace_id', current.WORKSPACE_ID);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Campo excluído com sucesso!' });
      fetchFields();
    }
  };

  const handleSaved = () => {
    fetchFields();
    setModalOpen(false);
    setMessage({ type: 'success', text: 'Campo salvo com sucesso!' });
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="flex flex-col h-full">
      {/* Message */}
      {message && (
        <div className={`mx-6 mt-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30' 
            : 'bg-red-600/20 text-red-400 border border-red-600/30'
        }`}>
          {message.text}
        </div>
      )}

      {/* Controls */}
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            </div>
            
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as typeof entityFilter)}
              className="px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">Todas as entidades</option>
              <option value="contact">Contatos</option>
              <option value="conversation">Conversas</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all"
          >
            <Plus size={16} />
            <span>Novo Campo</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] overflow-hidden h-full">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400">Carregando campos...</p>
            </div>
          ) : (
            <SimpleBar className="h-full">
              <table className="w-full text-sm">
                <thead className="bg-[#334155] sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-200">Label</th>
                    <th className="text-left p-4 font-medium text-gray-200">Key</th>
                    <th className="text-left p-4 font-medium text-gray-200">Entidade</th>
                    <th className="text-left p-4 font-medium text-gray-200">Tipo</th>
                    <th className="text-center p-4 font-medium text-gray-200">Obrigatório</th>
                    <th className="text-center p-4 font-medium text-gray-200">Indexado</th>
                    <th className="text-center p-4 font-medium text-gray-200">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFields.map((field, index) => (
                    <tr
                      key={field.id}
                      className={`border-b border-[#334155] hover:bg-[#334155]/30 transition-colors ${
                        index % 2 === 0 ? 'bg-[#1e293b]' : 'bg-[#0f172a]/20'
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-medium text-white">{field.label}</div>
                        {field.options && (
                          <div className="text-xs text-gray-400 mt-1">
                            {field.options.options?.length || 0} opções
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <code className="text-cyan-400 bg-[#0f172a] px-2 py-1 rounded text-xs">
                          {field.key}
                        </code>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          field.entity_type === 'contact' 
                            ? 'bg-blue-600/20 text-blue-400' 
                            : 'bg-purple-600/20 text-purple-400'
                        }`}>
                          {field.entity_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">{field.type}</span>
                      </td>
                      <td className="p-4 text-center">
                        {field.is_required ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {field.is_indexed ? (
                          <span className="text-emerald-400">✓</span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(field)}
                            className="p-1.5 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a] transition-colors"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDuplicate(field)}
                            className="p-1.5 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a] transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(field)}
                            className="p-1.5 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-red-400 hover:bg-red-600/20 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredFields.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Database size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum campo encontrado</p>
                  <p className="text-sm text-center max-w-md">
                    {searchTerm || entityFilter !== 'all' 
                      ? 'Tente ajustar os filtros de busca.'
                      : 'Crie seu primeiro campo customizado para começar a organizar os dados do CRM.'
                    }
                  </p>
                </div>
              )}
            </SimpleBar>
          )}
        </div>
      </div>

      <CustomFieldModal
        open={modalOpen}
        initialField={editingField}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};
