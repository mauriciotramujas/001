import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Variable, WritePolicy } from './VariablesTab';
import { CustomFieldType } from './CustomFieldsTab';

interface VariableModalProps {
  open: boolean;
  initialVariable?: Variable | null;
  onClose: () => void;
  onSaved: () => void;
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Verdadeiro/Falso' },
  { value: 'date', label: 'Data' },
  { value: 'datetime', label: 'Data e Hora' },
  { value: 'select', label: 'Seleção Única' },
  { value: 'multi_select', label: 'Seleção Múltipla' },
  { value: 'json', label: 'JSON' },
];

const WRITE_POLICIES: { value: WritePolicy; label: string; description: string }[] = [
  { 
    value: 'always_overwrite', 
    label: 'Sempre sobrescrever', 
    description: 'Substitui o valor sempre que a variável for definida' 
  },
  { 
    value: 'only_if_empty', 
    label: 'Só se vazio', 
    description: 'Só define o valor se o campo estiver vazio' 
  },
  { 
    value: 'first_write_wins', 
    label: 'Primeira escrita vence', 
    description: 'Mantém o primeiro valor definido, ignora alterações' 
  },
  { 
    value: 'never', 
    label: 'Nunca', 
    description: 'Nunca escreve no CRM (apenas para lógica interna)' 
  },
];

export const VariableModal: React.FC<VariableModalProps> = ({
  open,
  initialVariable,
  onClose,
  onSaved,
}) => {
  const { current } = useInstances();
  const [form, setForm] = useState({
    key: '',
    type: 'text' as CustomFieldType,
    description: '',
    default_value: '',
    crm_field_id: null as string | null,
    write_policy: 'always_overwrite' as WritePolicy,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingAnswers, setHasExistingAnswers] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (initialVariable) {
      setForm({
        key: initialVariable.key,
        type: initialVariable.type,
        description: initialVariable.description || '',
        default_value: initialVariable.default_value ? JSON.stringify(initialVariable.default_value) : '',
        crm_field_id: initialVariable.crm_field_id,
        write_policy: initialVariable.write_policy,
      });

      // Verificar se já existem respostas para esta variável
      supabase
        .schema('bot')
        .from('answers')
        .select('id')
        .eq('variable_id', initialVariable.id)
        .limit(1)
        .then(({ data }) => {
          setHasExistingAnswers(!!data?.length);
        });
    } else {
      setForm({
        key: '',
        type: 'text',
        description: '',
        default_value: '',
        crm_field_id: null,
        write_policy: 'always_overwrite',
      });
      setHasExistingAnswers(false);
    }
    setError(null);
  }, [open, initialVariable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current?.WORKSPACE_ID) return;

    setSaving(true);
    setError(null);

    // Validações
    if (!form.key.match(/^[a-z0-9_]+$/)) {
      setError('A chave deve conter apenas letras minúsculas, números e underscore');
      setSaving(false);
      return;
    }

    let defaultValue = null;
    if (form.default_value.trim()) {
      try {
        defaultValue = JSON.parse(form.default_value);
      } catch {
        setError('Valor padrão deve ser um JSON válido');
        setSaving(false);
        return;
      }
    }

    const variableData = {
      workspace_id: current.WORKSPACE_ID,
      key: form.key,
      type: form.type,
      description: form.description || null,
      default_value: defaultValue,
      crm_field_id: form.crm_field_id,
      write_policy: form.write_policy,
      updated_at: new Date().toISOString(),
    };

    try {
      if (initialVariable) {
        const { error } = await supabase
          .schema('bot')
          .from('variables')
          .update(variableData)
          .eq('id', initialVariable.id)
          .eq('workspace_id', current.WORKSPACE_ID);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .schema('bot')
          .from('variables')
          .insert([{
            ...variableData,
            created_by: current.USER_ID,
            updated_by: current.USER_ID,
          }]);

        if (error) throw error;
      }

      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {initialVariable ? 'Editar Variável' : 'Nova Variável'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chave *
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="ex: tem_plano_saude"
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Apenas letras minúsculas, números e underscore
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CustomFieldType })}
                disabled={hasExistingAnswers}
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {hasExistingAnswers && (
                <p className="text-xs text-amber-400 mt-1">
                  Não é possível alterar o tipo pois já existem respostas
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descreva o propósito desta variável..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Valor Padrão (JSON)
              </label>
              <input
                type="text"
                value={form.default_value}
                onChange={(e) => setForm({ ...form, default_value: e.target.value })}
                placeholder='ex: "valor", 123, true, null'
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-1">
                Formato JSON válido ou deixe vazio
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Política de Escrita *
              </label>
              <select
                value={form.write_policy}
                onChange={(e) => setForm({ ...form, write_policy: e.target.value as WritePolicy })}
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {WRITE_POLICIES.map(policy => (
                  <option key={policy.value} value={policy.value}>
                    {policy.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {WRITE_POLICIES.find(p => p.value === form.write_policy)?.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-[#334155]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Variável'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};