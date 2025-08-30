import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useInstances } from '../hooks/useInstances';

interface TagSummary {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: string;
  priority: number;
}

interface TagConfigModalProps {
  open: boolean;
  initialTag?: TagSummary | null;
  onClose: () => void;
  onSaved: () => void;
}

// Enums according to contract
const CONTACT_STATUS = ['new','open','pending','closed'] as const;
const SESSION_STATUS = ['active','paused','done','abandoned','error'] as const;
const LABEL_TYPES = ['badge','status','stage','automation','other'] as const;
const RULE_SOURCES = ['session','contact'] as const;
const RULE_OPS: Record<string,string[]> = {
  number: ['eq','neq','gt','gte','lt','lte'],
  text: ['eq','neq','in','not_in'],
  select: ['eq','neq','in','not_in'],
  multi_select: ['in','not_in'],
  boolean: ['eq','is_true','is_false'],
  date: ['eq','neq','gt','gte','lt','lte'],
  datetime: ['eq','neq','gt','gte','lt','lte'],
  json: ['eq','neq']
};

interface Stage {
  id: string;
  name: string;
  flow_id: string;
  flow_name: string;
}

interface StageRow {
  id: string;
  name: string;
  flow_id: string;
  stage_order: number | null;
  flows: { name: string; workspace_id: string };
}

interface Variable {
  id: string;
  key: string;
  description: string | null;
  type: string;
}

interface RuleForm {
  variableId: string;
  source: typeof RULE_SOURCES[number];
  op: string;
  valueNumber?: number;
  valueText?: string;
  valueBool?: boolean;
  valueDate?: string;
  valueTextArray?: string;
}

interface RuleRow {
  variable_id: string;
  source: typeof RULE_SOURCES[number];
  op: string;
  value_number: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  value_date: string | null;
  value_text_array: string[] | null;
}

export const TagConfigModal: React.FC<TagConfigModalProps> = ({
  open,
  initialTag,
  onClose,
  onSaved,
}) => {
  const { current } = useInstances();
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('');
  const [type, setType] = useState<typeof LABEL_TYPES[number]>('badge');
  const [priority, setPriority] = useState(100);
  const [contactStatusAny, setContactStatusAny] = useState<string[]>([]);
  const [sessionStatusAny, setSessionStatusAny] = useState<string[]>([]);
  const [stageAny, setStageAny] = useState<string[]>([]);
  const [requireAutomationEnabled, setRequireAutomationEnabled] = useState<'true'|'false'|'null'>('null');

  const [stages, setStages] = useState<Stage[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);

  const [rules, setRules] = useState<RuleForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string|null>(null);

  // Load stages and variables
  useEffect(() => {
    if (!current?.WORKSPACE_ID) return;

    // Fetch stages grouped by flow
    supabase
      .schema('bot')
      .from('stages')
      .select('id,name,flow_id,flows!inner(name,workspace_id)')
      .eq('flows.workspace_id', current.WORKSPACE_ID)
      .order('name', { foreignTable: 'flows' })
      .order('stage_order', { nullsFirst: false })
      .order('name')
      .then(({ data }) => {
        const mapped = ((data as StageRow[]) || []).map(s => ({
          id: s.id,
          name: s.name,
          flow_id: s.flow_id,
          flow_name: s.flows?.name || '',
        }));
        setStages(mapped);
      });

    // Fetch variables for rule builder
    supabase
      .schema('bot')
      .from('variables')
      .select('id,key,description,type')
      .eq('workspace_id', current.WORKSPACE_ID)
      .order('key')
      .then(({ data }) => {
        setVariables((data as Variable[]) || []);
      });
  }, [current?.WORKSPACE_ID]);

  // Reset and load form when modal opens or tag changes
  useEffect(() => {
    if (!open) return;

    if (initialTag) {
      (async () => {
        const { data } = await supabase
          .schema('crm')
          .from('label_configs')
          .select(
            'name,color,icon,type,priority,contact_status_any,session_status_any,stage_any,require_automation_enabled'
          )
          .eq('id', initialTag.id)
          .single();

        if (data) {
          setName(data.name || '');
          setColor(data.color || '');
          setIcon(data.icon || '');
          setType(data.type as typeof LABEL_TYPES[number]);
          setPriority(data.priority || 0);
          setContactStatusAny(data.contact_status_any || []);
          setSessionStatusAny(data.session_status_any || []);
          setStageAny(data.stage_any || []);
          setRequireAutomationEnabled(
            data.require_automation_enabled === null
              ? 'null'
              : data.require_automation_enabled
              ? 'true'
              : 'false'
          );
        }

        const { data: ruleData } = await supabase
          .schema('crm')
          .from('label_config_rules')
          .select(
            'variable_id,source,op,value_number,value_text,value_bool,value_date,value_text_array'
          )
          .eq('label_config_id', initialTag.id);

        if (ruleData) {
          setRules(
            (ruleData as RuleRow[]).map(r => ({
              variableId: r.variable_id,
              source: r.source,
              op: r.op,
              valueNumber: r.value_number ?? undefined,
              valueText: r.value_text ?? undefined,
              valueBool: r.value_bool ?? undefined,
              valueDate: r.value_date ?? undefined,
              valueTextArray: r.value_text_array
                ? r.value_text_array.join(',')
                : undefined,
            }))
          );
        }
      })();
    } else {
      setName('');
      setColor('');
      setIcon('');
      setType('badge');
      setPriority(100);
      setContactStatusAny([]);
      setSessionStatusAny([]);
      setStageAny([]);
      setRequireAutomationEnabled('null');
      setRules([]);
      setMessage(null);
    }
  }, [open, initialTag]);

  const addRule = () => {
    setRules(r => [...r, { variableId: '', source: 'session', op: '' }]);
  };

  const updateRule = <K extends keyof RuleForm>(idx: number, field: K, value: RuleForm[K]) => {
    setRules(r => {
      const copy = [...r];
      copy[idx] = { ...copy[idx], [field]: value };
      // reset values when variable changes
      if (field === 'variableId') {
        copy[idx].op = '';
        copy[idx].valueNumber = undefined;
        copy[idx].valueText = undefined;
        copy[idx].valueBool = undefined;
        copy[idx].valueDate = undefined;
        copy[idx].valueTextArray = undefined;
      }
      return copy;
    });
  };

  const removeRule = (idx: number) => {
    setRules(r => r.filter((_,i)=>i!==idx));
  };

  const groupedStages = stages.reduce<Record<string, Stage[]>>((acc, st) => {
    acc[st.flow_name] = acc[st.flow_name] || [];
    acc[st.flow_name].push(st);
    return acc;
  }, {});

  const handleSave = async () => {
    if (!current?.WORKSPACE_ID) {
      setMessage('Workspace não encontrada');
      return;
    }
    setSaving(true);
    setMessage(null);

    const commonData = {
      name,
      color: color || null,
      icon: icon || null,
      type,
      priority,
      ...(contactStatusAny.length
        ? { contact_status_any: contactStatusAny }
        : {}),
      ...(sessionStatusAny.length
        ? { session_status_any: sessionStatusAny }
        : {}),
      ...(stageAny.length ? { stage_any: stageAny } : {}),
      ...(requireAutomationEnabled === 'null'
        ? {}
        : {
            require_automation_enabled:
              requireAutomationEnabled === 'true',
          }),
    };


    let labelId = initialTag?.id;
    if (initialTag) {
      const { error } = await supabase
        .schema('crm')
        .from('label_configs')

        .update({
          name,
          color: color || null,
          icon: icon || null,
          type,
          priority,
          contact_status_any: contactStatusAny.length ? contactStatusAny : null,
          session_status_any: sessionStatusAny.length ? sessionStatusAny : null,
          stage_any: stageAny.length ? stageAny : null,
          require_automation_enabled:
            requireAutomationEnabled === 'null'
              ? null
              : requireAutomationEnabled === 'true',
        })

        .eq('id', initialTag.id)
        .eq('workspace_id', current.WORKSPACE_ID);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      await supabase
        .schema('crm')
        .from('label_config_rules')
        .delete()
        .eq('label_config_id', initialTag.id);
    } else {
      const { data, error } = await supabase
        .schema('crm')
        .from('label_configs')
        .insert({
          workspace_id: current.WORKSPACE_ID,

          name,
          color: color || null,
          icon: icon || null,
          type,
          priority,
          contact_status_any: contactStatusAny.length ? contactStatusAny : null,
          session_status_any: sessionStatusAny.length ? sessionStatusAny : null,
          stage_any: stageAny.length ? stageAny : null,
          require_automation_enabled:
            requireAutomationEnabled === 'null'
              ? null
              : requireAutomationEnabled === 'true',

        })
        .select('id')
        .single();

      if (error || !data) {
        setMessage(error?.message || 'Erro ao salvar');
        setSaving(false);
        return;
      }
      labelId = data.id;
    }

    if (labelId) {
      for (const rule of rules) {
        await supabase.schema('crm').from('label_config_rules').insert({
          label_config_id: labelId,
          variable_id: rule.variableId,
          source: rule.source,
          op: rule.op,
          value_number: rule.valueNumber ?? null,
          value_text: rule.valueText ?? null,
          value_bool: rule.valueBool ?? null,
          value_date: rule.valueDate ?? null,
          value_text_array: rule.valueTextArray
            ? rule.valueTextArray.split(',').map(s => s.trim())
            : null,
        });
      }
    }

    setMessage('Tag salva com sucesso');
    setSaving(false);
    onSaved();
    onClose();
  };
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-[#1e293b] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 text-white">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ×
        </button>
        <div className="space-y-6 text-sm">
          {message && (
            <div className="p-3 rounded bg-emerald-600/20 text-emerald-400">
              {message}
            </div>
          )}

          <div className="bg-[#1e293b] rounded-lg p-6 shadow space-y-4">
            <h1 className="text-2xl font-semibold">
              {initialTag ? 'Editar Tag' : 'Criar Tag'}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              />
            </div>
            <div>
              <label className="block mb-1">Cor</label>
              <input
                value={color}
                onChange={e => setColor(e.target.value)}
                placeholder="#10B981"
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              />
            </div>
            <div>
              <label className="block mb-1">Ícone</label>
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                placeholder="CheckCircle2"
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              />
            </div>
            <div>
              <label className="block mb-1">Tipo</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as typeof LABEL_TYPES[number])}
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              >
                {LABEL_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Prioridade</label>
              <input
                type="number"
                value={priority}
                onChange={e => setPriority(Number(e.target.value))}
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block">Contact status</label>
                <button
                  type="button"
                  className="text-sm text-blue-500"
                  onClick={() => setContactStatusAny([])}
                >
                  Limpar
                </button>
              </div>
              <select
                multiple
                value={contactStatusAny}
                onChange={e =>
                  setContactStatusAny(
                    Array.from(e.target.selectedOptions, o => o.value)
                  )
                }
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2 h-32"
              >
                {CONTACT_STATUS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block">Session status</label>
                <button
                  type="button"
                  className="text-sm text-blue-500"
                  onClick={() => setSessionStatusAny([])}
                >
                  Limpar
                </button>
              </div>
              <select
                multiple
                value={sessionStatusAny}
                onChange={e =>
                  setSessionStatusAny(
                    Array.from(e.target.selectedOptions, o => o.value)
                  )
                }
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2 h-32"
              >
                {SESSION_STATUS.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block">Stages</label>
                <button
                  type="button"
                  className="text-sm text-blue-500"
                  onClick={() => setStageAny([])}
                >
                  Limpar
                </button>
              </div>
              <select
                multiple
                value={stageAny}
                onChange={e =>
                  setStageAny(Array.from(e.target.selectedOptions, o => o.value))
                }
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2 h-32"
              >
                {Object.entries(groupedStages).map(([flow, sts]) => (
                  <optgroup key={flow} label={flow}>
                    {sts.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1">Automação habilitada</label>
              <select
                value={requireAutomationEnabled}
                onChange={e =>
                  setRequireAutomationEnabled(
                    e.target.value as 'true' | 'false' | 'null'
                  )
                }
                className="w-full rounded bg-[#0f172a] border border-slate-600 p-2"
              >
                <option value="null">Ignorar</option>
                <option value="true">Apenas com automação</option>
                <option value="false">Apenas sem automação</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-lg p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Regras</h2>
          {rules.map((rule, idx) => {
            const variable = variables.find(v => v.id === rule.variableId);
            const ops = variable ? RULE_OPS[variable.type] || [] : [];
            return (
              <div
                key={idx}
                className="border border-slate-600 rounded p-4 mb-4 space-y-3"
              >
                <div className="flex gap-2">
                  <select
                    value={rule.variableId}
                    onChange={e => updateRule(idx, 'variableId', e.target.value)}
                    className="flex-1 rounded bg-[#0f172a] border border-slate-600 p-2"
                  >
                    <option value="">Variável</option>
                    {variables.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.key} ({v.type}){v.description ? ' - ' + v.description : ''}
                      </option>
                    ))}
                  </select>
                  <select
                    value={rule.source}
                    onChange={e =>
                      updateRule(idx, 'source', e.target.value as RuleForm['source'])
                    }
                    className="w-40 rounded bg-[#0f172a] border border-slate-600 p-2"
                  >
                    {RULE_SOURCES.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRule(idx)}
                    className="px-2 text-red-400"
                  >
                    Remover
                  </button>
                </div>

                {variable && (
                  <div className="flex gap-2 items-center">
                    <select
                      value={rule.op}
                      onChange={e => updateRule(idx, 'op', e.target.value)}
                      className="rounded bg-[#0f172a] border border-slate-600 p-2"
                    >
                      <option value="">Operador</option>
                      {ops.map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>

                    {['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(rule.op) &&
                      variable.type === 'number' && (
                        <input
                          type="number"
                          value={rule.valueNumber ?? ''}
                          onChange={e =>
                            updateRule(idx, 'valueNumber', Number(e.target.value))
                          }
                          className="rounded bg-[#0f172a] border border-slate-600 p-2"
                        />
                      )}

                    {['eq', 'neq', 'in', 'not_in'].includes(rule.op) &&
                      ['text', 'select', 'multi_select'].includes(variable.type) && (
                        <input
                          value={rule.valueText ?? ''}
                          onChange={e => updateRule(idx, 'valueText', e.target.value)}
                          placeholder={
                            rule.op === 'in' || rule.op === 'not_in'
                              ? 'separe por vírgula'
                              : ''
                          }
                          className="rounded bg-[#0f172a] border border-slate-600 p-2"
                        />
                      )}

                    {['eq'].includes(rule.op) && variable.type === 'boolean' && (
                      <select
                        value={String(rule.valueBool)}
                        onChange={e =>
                          updateRule(idx, 'valueBool', e.target.value === 'true')
                        }
                        className="rounded bg-[#0f172a] border border-slate-600 p-2"
                      >
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    )}

                    {['is_true', 'is_false'].includes(rule.op) &&
                      variable.type === 'boolean' && null}

                    {['eq', 'neq', 'gt', 'gte', 'lt', 'lte'].includes(rule.op) &&
                      ['date', 'datetime'].includes(variable.type) && (
                        <input
                          type="date"
                          value={rule.valueDate ?? ''}
                          onChange={e => updateRule(idx, 'valueDate', e.target.value)}
                          className="rounded bg-[#0f172a] border border-slate-600 p-2"
                        />
                      )}

                    {['in', 'not_in'].includes(rule.op) &&
                      ['text', 'select', 'multi_select'].includes(variable.type) && (
                        <input
                          value={rule.valueTextArray ?? ''}
                          onChange={e =>
                            updateRule(idx, 'valueTextArray', e.target.value)
                          }
                          placeholder="valor1,valor2"
                          className="rounded bg-[#0f172a] border border-slate-600 p-2"
                        />
                      )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addRule}
            className="mt-2 px-3 py-1 bg-slate-700 rounded hover:bg-slate-600"
          >
            Adicionar regra
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 rounded hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Tag'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default TagConfigModal;

