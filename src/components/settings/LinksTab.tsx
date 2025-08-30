import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Link, Unlink, Search, ArrowRight } from 'lucide-react';
import { Variable } from './VariablesTab';
import { CustomField } from './CustomFieldsTab';
import SimpleBar from 'simplebar-react';

export const LinksTab: React.FC = () => {
  const { current } = useInstances();
  const [variables, setVariables] = useState<Variable[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!current?.WORKSPACE_ID) return;
    setLoading(true);
    
    try {
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
          .select('*')
          .eq('workspace_id', current.WORKSPACE_ID)
          .order('entity_type')
          .order('label'),
      ]);

      if (varsRes.error || fieldsRes.error) {
        const error = varsRes.error || fieldsRes.error;
        throw error;
      }

      const byId = new Map((fieldsRes.data ?? []).map(f => [f.id, f] as [string, CustomField]));
      const mappedVariables = ((varsRes.data ?? []) as Omit<Variable, 'crm_field_label'>[]).map(v => ({
        ...v,
        crm_field_label: v.crm_field_id ? byId.get(v.crm_field_id)?.label ?? null : null,
      }));

      setVariables(mappedVariables);
      setCustomFields(fieldsRes.data as CustomField[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text: message });
    } finally {
      setLoading(false);
    }
  }, [current?.WORKSPACE_ID]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredVariables = variables.filter(variable => 
    variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variable.description && variable.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLink = async (variableId: string, fieldId: string | null) => {
    if (!current?.WORKSPACE_ID) return;

    const { error } = await supabase
      .schema('bot')
      .from('variables')
      .update({ 
        crm_field_id: fieldId,
        updated_at: new Date().toISOString(),
        updated_by: current.USER_ID,
      })
      .eq('id', variableId)
      .eq('workspace_id', current.WORKSPACE_ID);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ 
        type: 'success', 
        text: fieldId ? 'Vínculo criado com sucesso!' : 'Vínculo removido com sucesso!' 
      });
      fetchData();
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getCompatibleFields = (variable: Variable) => {
    return customFields.filter(field => field.type === variable.type);
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
      <div className="p-6">
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

          <div className="text-sm text-gray-400">
            {filteredVariables.length} variáveis • {customFields.length} campos disponíveis
          </div>
        </div>
      </div>

      {/* Links Grid */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="bg-[#1e293b] rounded-lg border border-[#334155] overflow-hidden h-full">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-400">Carregando vínculos...</p>
            </div>
          ) : (
            <SimpleBar className="h-full p-4">
              <div className="space-y-4">
                {filteredVariables.map((variable) => {
                  const compatibleFields = getCompatibleFields(variable);
                  const linkedField = customFields.find(f => f.id === variable.crm_field_id);
                  
                  return (
                    <div
                      key={variable.id}
                      className="bg-[#0f172a]/30 rounded-lg p-4 border border-[#334155]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium text-white">
                              <code className="text-cyan-400 bg-[#0f172a] px-2 py-1 rounded text-sm">
                                {variable.key}
                              </code>
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                              {variable.description || 'Sem descrição'}
                            </p>
                          </div>
                          <span className="text-gray-500">
                            <ArrowRight size={16} />
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            variable.type === 'text' ? 'bg-blue-600/20 text-blue-400' :
                            variable.type === 'number' ? 'bg-green-600/20 text-green-400' :
                            variable.type === 'boolean' ? 'bg-purple-600/20 text-purple-400' :
                            'bg-gray-600/20 text-gray-400'
                          }`}>
                            {variable.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <select
                            value={variable.crm_field_id || ''}
                            onChange={(e) => handleLink(variable.id, e.target.value || null)}
                            className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <option value="">Não vinculado</option>
                            {compatibleFields.map(field => (
                              <option key={field.id} value={field.id}>
                                {field.label} ({field.entity_type})
                              </option>
                            ))}
                          </select>
                        </div>

                        {linkedField && (
                          <button
                            onClick={() => handleLink(variable.id, null)}
                            className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                            title="Desvincular"
                          >
                            <Unlink size={16} />
                          </button>
                        )}
                      </div>

                      {linkedField && (
                        <div className="mt-3 p-3 bg-emerald-600/10 rounded-lg border border-emerald-600/20">
                          <div className="flex items-center space-x-2">
                            <Link size={14} className="text-emerald-400" />
                            <span className="text-sm text-emerald-400">
                              Vinculado a: <strong>{linkedField.label}</strong>
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              linkedField.entity_type === 'contact' 
                                ? 'bg-blue-600/20 text-blue-400' 
                                : 'bg-purple-600/20 text-purple-400'
                            }`}>
                              {linkedField.entity_type}
                            </span>
                          </div>
                        </div>
                      )}

                      {compatibleFields.length === 0 && (
                        <div className="mt-3 p-3 bg-amber-600/10 rounded-lg border border-amber-600/20">
                          <p className="text-sm text-amber-400">
                            Nenhum campo CRM compatível encontrado (tipo: {variable.type})
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredVariables.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <Link size={48} className="mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Nenhuma variável encontrada</p>
                    <p className="text-sm text-center max-w-md">
                      {searchTerm 
                        ? 'Tente ajustar o termo de busca.'
                        : 'Crie variáveis na aba "Variáveis Bot" para poder vinculá-las aos campos do CRM.'
                      }
                    </p>
                  </div>
                )}
              </div>
            </SimpleBar>
          )}
        </div>
      </div>
    </div>
  );
};