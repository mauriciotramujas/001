import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Plus, Edit, Trash2, Search, Bot } from 'lucide-react';
import { VariableModal } from './VariableModal';
import { CustomFieldType } from './CustomFieldsTab';
import SimpleBar from 'simplebar-react';

export type WritePolicy = 'always_overwrite' | 'only_if_empty' | 'first_write_wins' | 'never';

export interface Variable {
  id: string;
  workspace_id: string;
  key: string;
  type: CustomFieldType;
  description: string | null;
  default_value: unknown;
  crm_field_id: string | null;
  write_policy: WritePolicy;
  created_at: string;
  updated_at: string;
  crm_field_label?: string | null;
}

export const VariablesTab: React.FC = () => {
  const { current } = useInstances();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVariables = useCallback(async () => {
    if (!current?.WORKSPACE_ID) return;
    setLoading(true);
    
    const [varsRes, fieldsRes] = await Promise.all([
      supabase
        .schema('bot')
        .from('variables')
        .select('*')
        .eq('workspace_id', current.WORKSPACE_ID)
        .order('key'),
      supabase
        .schema('crm')
        .from('custom_fields')
        .select('id,label')
        .eq('workspace_id', current.WORKSPACE_ID),
    ]);

    if (varsRes.error || fieldsRes.error) {
      const error = varsRes.error || fieldsRes.error;
      setMessage({ type: 'error', text: error?.message ?? 'Erro ao carregar variáveis' });
    } else {
      const byId = new Map((fieldsRes.data ?? []).map(f => [f.id, f.label] as [string, string]));
      const mapped = ((varsRes.data ?? []) as unknown[]).map(item => {
        const v = item as Omit<Variable, 'crm_field_label'>;
        return {
          ...v,
          crm_field_label: v.crm_field_id ? byId.get(v.crm_field_id) ?? null : null,
        } as Variable;
      });
      setVariables(mapped);
    }
    setLoading(false);
  }, [current?.WORKSPACE_ID]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  const filteredVariables = variables.filter(variable => 
    variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variable.description && variable.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreate = () => {
    setEditingVariable(null);
    setModalOpen(true);
  };

  const handleEdit = (variable: Variable) => {
    setEditingVariable(variable);
    setModalOpen(true);
  };

  const handleDelete = async (variable: Variable) => {
    if (!current?.WORKSPACE_ID) return;
    
    if (!confirm(`Tem certeza que deseja excluir a variável "${variable.key}"?`)) return;

    // Verificar dependências (simplificado - você pode expandir)
    const { data: answers } = await supabase
      .schema('bot')
      .from('answers')
      .select('id')
      .eq('variable_id', variable.id)
      .limit(1);

    if (answers?.length) {
      setMessage({ 
        type: 'error', 
        text: 'Não é possível excluir esta variável pois existem respostas vinculadas a ela.' 
      });
      return;
    }

    const { error } = await supabase
      .schema('bot')
      .from('variables')
      .delete()
      .eq('id', variable.id)
      .eq('workspace_id', current.WORKSPACE_ID);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Variável excluída com sucesso!' });
      fetchVariables();
    }
  };

  const handleSaved = () => {
    fetchVariables();
    setModalOpen(false);
    setMessage({ type: 'success', text: 'Variável salva com sucesso!' });
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getWritePolicyBadge = (policy: WritePolicy) => {
    const styles = {
      always_overwrite: 'bg-red-600/20 text-red-400',
      only_if_empty: 'bg-yellow-600/20 text-yellow-400',
      first_write_wins: 'bg-blue-600/20 text-blue-400',
      never: 'bg-gray-600/20 text-gray-400',
    };

    const labels = {
      always_overwrite: 'Sempre sobrescrever',
      only_if_empty: 'Só se vazio',
      first_write_wins: 'Primeira escrita',
      never: 'Nunca',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[policy]}`}>
        {labels[policy]}
      </span>
    );
  };

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
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar variáveis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#0f172a] rounded-lg text-sm text-white placeholder-gray-500 border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
          </div>

          <button
            onClick={handleCreate}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all"
          >
            <Plus size={16} />
            <span>Nova Variável</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] overflow-hidden h-full">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400">Carregando variáveis...</p>
            </div>
          ) : (
            <SimpleBar className="h-full">
              <table className="w-full text-sm">
                <thead className="bg-[#334155] sticky top-0">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-200">Chave</th>
                    <th className="text-left p-4 font-medium text-gray-200">Tipo</th>
                    <th className="text-left p-4 font-medium text-gray-200">Campo CRM</th>
                    <th className="text-left p-4 font-medium text-gray-200">Política</th>
                    <th className="text-left p-4 font-medium text-gray-200">Descrição</th>
                    <th className="text-center p-4 font-medium text-gray-200">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariables.map((variable, index) => (
                    <tr
                      key={variable.id}
                      className={`border-b border-[#334155] hover:bg-[#334155]/30 transition-colors ${
                        index % 2 === 0 ? 'bg-[#1e293b]' : 'bg-[#0f172a]/20'
                      }`}
                    >
                      <td className="p-4">
                        <code className="text-cyan-400 bg-[#0f172a] px-2 py-1 rounded text-xs font-medium">
                          {variable.key}
                        </code>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300">{variable.type}</span>
                      </td>
                      <td className="p-4">
                        {variable.crm_field_label ? (
                          <span className="px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded-full text-xs font-medium">
                            {variable.crm_field_label}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-xs">Não vinculado</span>
                        )}
                      </td>
                      <td className="p-4">
                        {getWritePolicyBadge(variable.write_policy)}
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 text-xs">
                          {variable.description || '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(variable)}
                            className="p-1.5 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a] transition-colors"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(variable)}
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

              {filteredVariables.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Bot size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhuma variável encontrada</p>
                  <p className="text-sm text-center max-w-md">
                    {searchTerm 
                      ? 'Tente ajustar o termo de busca.'
                      : 'Crie sua primeira variável para começar a capturar dados nas automações.'
                    }
                  </p>
                </div>
              )}
            </SimpleBar>
          )}
        </div>
      </div>

      <VariableModal
        open={modalOpen}
        initialVariable={editingVariable}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};