import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { CustomField, CustomFieldType } from './CustomFieldsTab';
import { Plus, Trash2 } from 'lucide-react';

interface CustomFieldModalProps {
  open: boolean;
  initialField?: CustomField | null;
  onClose: () => void;
  onSaved: () => void;
}

interface OptionItem {
  value: string;
  label: string;
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

export const CustomFieldModal: React.FC<CustomFieldModalProps> = ({
  open,
  initialField,
  onClose,
  onSaved,
}) => {
  const { current } = useInstances();
  const [form, setForm] = useState({
    entity_type: 'contact' as 'contact' | 'conversation',
    key: '',
    label: '',
    type: 'text' as CustomFieldType,
    is_required: false,
    is_indexed: false,
  });
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [allowOther, setAllowOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingValues, setHasExistingValues] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (initialField) {
      setForm({
        entity_type: initialField.entity_type,
        key: initialField.key,
        label: initialField.label,
        type: initialField.type,
        is_required: initialField.is_required,
        is_indexed: initialField.is_indexed,
      });
      
      if (initialField.options?.options) {
        setOptions(initialField.options.options);
        setAllowOther(initialField.options.allowOther || false);
      } else {
        setOptions([]);
        setAllowOther(false);
      }

      // Verificar se já existem valores para este campo
      supabase
        .schema('crm')
        .from('custom_field_values')
        .select('id')
        .eq('field_id', initialField.id)
        .limit(1)
        .then(({ data }) => {
          setHasExistingValues(!!data?.length);
        });
    } else {
      setForm({
        entity_type: 'contact',
        key: '',
        label: '',
        type: 'text',
        is_required: false,
        is_indexed: false,
      });
      setOptions([]);
      setAllowOther(false);
      setHasExistingValues(false);
    }
    setError(null);
  }, [open, initialField]);

  const addOption = () => {
    setOptions([...options, { value: '', label: '' }]);
  };

  const updateOption = (index: number, field: keyof OptionItem, value: string) => {
    setOptions(options.map((opt, i) => 
      i === index ? { ...opt, [field]: value } : opt
    ));
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

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

    if ((form.type === 'select' || form.type === 'multi_select') && options.length === 0) {
      setError('Campos de seleção devem ter pelo menos uma opção');
      setSaving(false);
      return;
    }

    const fieldData = {
      workspace_id: current.WORKSPACE_ID,
      entity_type: form.entity_type,
      key: form.key,
      label: form.label,
      type: form.type,
      options: (form.type === 'select' || form.type === 'multi_select') 
        ? { options, allowOther } 
        : null,
      is_required: form.is_required,
      is_indexed: form.is_indexed,
    };

    try {
      if (initialField) {
        const { error } = await supabase
          .schema('crm')
          .from('custom_fields')
          .update(fieldData)
          .eq('id', initialField.id)
          .eq('workspace_id', current.WORKSPACE_ID);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .schema('crm')
          .from('custom_fields')
          .insert([fieldData]);

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

  const needsOptions = form.type === 'select' || form.type === 'multi_select';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#334155]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {initialField ? 'Editar Campo' : 'Novo Campo'}
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
                Entidade *
              </label>
              <select
                value={form.entity_type}
                onChange={(e) => setForm({ ...form, entity_type: e.target.value as 'contact' | 'conversation' })}
                disabled={hasExistingValues}
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                <option value="contact">Contato</option>
                <option value="conversation">Conversa</option>
              </select>
              {hasExistingValues && (
                <p className="text-xs text-amber-400 mt-1">
                  Não é possível alterar a entidade pois já existem dados
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tipo *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CustomFieldType })}
                disabled={hasExistingValues}
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
              >
                {FIELD_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {hasExistingValues && (
                <p className="text-xs text-amber-400 mt-1">
                  Não é possível alterar o tipo pois já existem dados
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Chave *
              </label>
              <input
                type="text"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="ex: renda_mensal"
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Apenas letras minúsculas, números e underscore
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Label *
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="ex: Renda Mensal"
                className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.is_required}
                onChange={(e) => setForm({ ...form, is_required: e.target.checked })}
                className="rounded border-[#334155] bg-[#0f172a] text-indigo-400 focus:ring-indigo-400"
              />
              <span className="text-sm text-gray-300">Campo obrigatório</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.is_indexed}
                onChange={(e) => setForm({ ...form, is_indexed: e.target.checked })}
                className="rounded border-[#334155] bg-[#0f172a] text-indigo-400 focus:ring-indigo-400"
              />
              <span className="text-sm text-gray-300">Indexado (busca rápida)</span>
            </label>
          </div>

          {needsOptions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Opções de Seleção
                </label>
                <button
                  type="button"
                  onClick={addOption}
                  className="flex items-center space-x-1 px-3 py-1 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <Plus size={14} />
                  <span>Adicionar</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={option.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      placeholder="Valor"
                      className="flex-1 px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      placeholder="Label"
                      className="flex-1 px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={allowOther}
                  onChange={(e) => setAllowOther(e.target.checked)}
                  className="rounded border-[#334155] bg-[#0f172a] text-indigo-400 focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-300">Permitir "Outro" (valor customizado)</span>
              </label>
            </div>
          )}

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
              {saving ? 'Salvando...' : 'Salvar Campo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};