import React, { useState, useEffect } from 'react';
import { ContactFull } from '../ContactsPage';
import { supabase } from '../../supabaseClient';
import { useInstances } from '../../hooks/useInstances';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import SimpleBar from 'simplebar-react';

interface ContactFieldsTabProps {
  contact: ContactFull;
  onContactUpdated: () => void;
}

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: string;
  options: any;
  is_required: boolean;
  is_indexed: boolean;
}

interface FieldValue {
  fieldId: string;
  key: string;
  label: string;
  type: string;
  value: unknown;
  options?: any;
  isRequired: boolean;
}

export const ContactFieldsTab: React.FC<ContactFieldsTabProps> = ({
  contact,
  onContactUpdated,
}) => {
  const { current } = useInstances();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!current?.WORKSPACE_ID) return;
    
    setLoading(true);
    
    // Buscar definições dos campos customizados
    supabase
      .schema('crm')
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', current.WORKSPACE_ID)
      .eq('entity_type', 'contact')
      .order('label')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          const customFields = data as CustomField[];
          setFields(customFields);
          
          // Mapear valores atuais
          const values = customFields.map(field => ({
            fieldId: field.id,
            key: field.key,
            label: field.label,
            type: field.type,
            value: contact.custom[field.key] ?? null,
            options: field.options,
            isRequired: field.is_required,
          }));
          
          setFieldValues(values);
        }
        setLoading(false);
      });
  }, [current?.WORKSPACE_ID, contact.custom]);

  const handleValueChange = (fieldId: string, value: unknown) => {
    setFieldValues(prev => 
      prev.map(field => 
        field.fieldId === fieldId ? { ...field, value } : field
      )
    );
  };

  const handleSave = async () => {
    if (!current?.WORKSPACE_ID) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Preparar dados para upsert
      const rows = fieldValues.map(field => ({
        workspace_id: current.WORKSPACE_ID,
        entity_type: 'contact' as const,
        entity_id: contact.id,
        field_id: field.fieldId,
        value_json: field.value,
      }));

      const { error } = await supabase
        .schema('crm')
        .from('custom_field_values')
        .upsert(rows, { 
          onConflict: 'workspace_id,entity_type,entity_id,field_id' 
        });

      if (error) throw error;
      
      onContactUpdated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (field: FieldValue) => {
    const baseClasses = "w-full px-3 py-2 bg-[#0f172a] rounded-lg text-white border border-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-400";
    
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={String(field.value || '')}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value)}
            className={baseClasses}
            required={field.isRequired}
          />
        );
        
      case 'number':
        return (
          <input
            type="number"
            value={field.value ? String(field.value) : ''}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value ? Number(e.target.value) : null)}
            className={baseClasses}
            required={field.isRequired}
          />
        );
        
      case 'boolean':
        return (
          <select
            value={field.value === null ? '' : String(field.value)}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value === '' ? null : e.target.value === 'true')}
            className={baseClasses}
            required={field.isRequired}
          >
            <option value="">Selecione...</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        );
        
      case 'date':
        return (
          <input
            type="date"
            value={field.value ? String(field.value) : ''}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value || null)}
            className={baseClasses}
            required={field.isRequired}
          />
        );
        
      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={field.value ? String(field.value) : ''}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value || null)}
            className={baseClasses}
            required={field.isRequired}
          />
        );
        
      case 'select':
        return (
          <select
            value={String(field.value || '')}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value || null)}
            className={baseClasses}
            required={field.isRequired}
          >
            <option value="">Selecione...</option>
            {field.options?.options?.map((opt: any, idx: number) => (
              <option key={idx} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
        
      case 'multi_select':
        const currentValues = Array.isArray(field.value) ? field.value : [];
        return (
          <div className="space-y-2">
            {field.options?.options?.map((opt: any, idx: number) => (
              <label key={idx} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentValues.includes(opt.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...currentValues, opt.value]
                      : currentValues.filter(v => v !== opt.value);
                    handleValueChange(field.fieldId, newValues);
                  }}
                  className="rounded border-[#334155] bg-[#0f172a] text-indigo-400 focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-300">{opt.label}</span>
              </label>
            ))}
          </div>
        );
        
      case 'json':
        return (
          <textarea
            value={field.value ? JSON.stringify(field.value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                handleValueChange(field.fieldId, parsed);
              } catch {
                // Mantém o valor inválido para o usuário corrigir
                handleValueChange(field.fieldId, e.target.value);
              }
            }}
            className={`${baseClasses} resize-none`}
            rows={4}
            required={field.isRequired}
          />
        );
        
      default:
        return (
          <input
            type="text"
            value={String(field.value || '')}
            onChange={(e) => handleValueChange(field.fieldId, e.target.value)}
            className={baseClasses}
            required={field.isRequired}
          />
        );
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Campos Customizados</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white hover:from-indigo-500 hover:to-cyan-500 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-600/20 text-red-400 border border-red-600/30">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400">Carregando campos...</p>
          </div>
        ) : (
          <SimpleBar className="h-full">
            <div className="space-y-6">
              {fieldValues.map((field) => (
                <div key={field.fieldId} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    {field.label}
                    {field.isRequired && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Tipo: {field.type} • Chave: <code className="bg-[#0f172a] px-1 rounded">{field.key}</code>
                  </div>
                  {renderFieldInput(field)}
                </div>
              ))}

              {fieldValues.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Plus size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum campo customizado</p>
                  <p className="text-sm text-center">
                    Configure campos customizados nas configurações para capturar dados específicos dos contatos.
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