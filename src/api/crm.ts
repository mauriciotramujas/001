import { supabase } from '../supabaseClient';
import { INSTANCE_ID } from './evolution';
import type { CustomFieldValue, ContactFlag } from '../types';

export interface ContactCustomFieldsResult {
  crmContactId: string | null;
  fields: CustomFieldValue[];
}

export function sortCustomFieldValues(fields: CustomFieldValue[]): CustomFieldValue[] {
  return [...fields].sort((a, b) => {
    if (a.createdAt && b.createdAt) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return a.label.localeCompare(b.label);
  });
}

// Busca os campos customizados de um contato a partir do remote_jid (telefone)
export async function fetchContactCustomFields(
  remoteJid: string,
  workspaceId?: string
): Promise<ContactCustomFieldsResult> {
  if (!remoteJid) return { crmContactId: null, fields: [] };

  const { data: identity, error: identityError } = await supabase
    .schema('crm')
    .from('contact_identities')
    .select('contact_id')
    .eq('instance_id', INSTANCE_ID)
    .eq('remote_jid', remoteJid)
    .maybeSingle();

  if (identityError || !identity) return { crmContactId: null, fields: [] };

  const customFieldsQuery = supabase
    .schema('crm')
    .from('custom_field_values')
    // NOTE: custom_fields.created_at is fetched solely to keep creation order.
    // If alphabetical ordering is preferred in the future, drop created_at from the select.
    .select('field_id,value_json,custom_fields(id,key,label,type,created_at)')
    .eq('entity_type', 'contact')
    .eq('entity_id', identity.contact_id)
    .order('created_at', { foreignTable: 'custom_fields' });


  if (workspaceId) {
    customFieldsQuery
      .eq('workspace_id', workspaceId)
      .eq('custom_fields.workspace_id', workspaceId);
  }

    const contactQuery = workspaceId
      ? supabase
          .schema('crm')
          .from('contacts')
          .select(
            'name, avatar_url, city, age, status, automation_enabled, notas'
          )
          .eq('id', identity.contact_id)
          .eq('workspace_id', workspaceId)
          .maybeSingle()
      : Promise.resolve<{ data: null }>({ data: null });

  const [{ data, error }, { data: contactData }] = await Promise.all([
    customFieldsQuery,
    contactQuery,
  ]);

  if (error || !data)
    return { crmContactId: identity.contact_id, fields: [] };

    const customFieldValues: CustomFieldValue[] = (
      data as {
        field_id: string;
        value_json: unknown;
        custom_fields: {
          id: string;
          key: string;
          label: string;
          type: string;
          created_at: string;
        };
      }[]
    ).map(row => ({
      fieldId: row.field_id || row.custom_fields.id,
      key: row.custom_fields.key,
      label: row.custom_fields.label,
      type: row.custom_fields.type,
      value: row.value_json,
      // created_at is used only for sorting; remove if ordering alphabetically.
      createdAt: row.custom_fields.created_at,
    }));

    const sortedCustomFieldValues = sortCustomFieldValues(customFieldValues);

  let contactFields: CustomFieldValue[] = [];
  if (contactData) {
    contactFields = [
      { key: 'name', label: 'Nome', type: 'text', value: contactData.name },
      {
        key: 'avatar_url',
        label: 'Avatar',
        type: 'text',
        value: contactData.avatar_url,
      },
      { key: 'city', label: 'Cidade', type: 'text', value: contactData.city },
      { key: 'age', label: 'Idade', type: 'number', value: contactData.age },
      { key: 'status', label: 'Status', type: 'text', value: contactData.status },
      {
        key: 'automation_enabled',
        label: 'Automation Enabled',
        type: 'boolean',
        value: contactData.automation_enabled,
      },
      { key: 'notas', label: 'Notas', type: 'text', value: contactData.notas },
    ];
  }

  const fields: CustomFieldValue[] = [...contactFields, ...sortedCustomFieldValues];

  return { crmContactId: identity.contact_id, fields };
}

export async function saveContactFields(
  crmContactId: string,
  fields: CustomFieldValue[],
  workspaceId?: string
) {
  const base: Record<string, unknown> = {};
  const custom: { fieldId: string; value: unknown }[] = [];


  if (!workspaceId) {
    console.warn('saveContactFields called without workspaceId');
    return fields;
  }

  for (const f of fields) {
    if (f.fieldId) custom.push({ fieldId: f.fieldId, value: f.value });
    else base[f.key] = f.value;

  }

  if (Object.keys(base).length) {
    await supabase
      .schema('crm')
      .from('contacts')
      .update(base)
      .eq('id', crmContactId)
      .eq('workspace_id', workspaceId);
  }

  for (const cf of custom) {
    await supabase
      .schema('crm')
      .from('custom_field_values')
      .upsert(
        {
          entity_type: 'contact',
          entity_id: crmContactId,
          field_id: cf.fieldId,
          value_json: cf.value,
          workspace_id: workspaceId,
        },
        { onConflict: 'workspace_id,entity_type,entity_id,field_id' }

      );
  }

  return fields;
}

// -----------------------------------------------------------------------------
// Labels for chats
// -----------------------------------------------------------------------------

export interface ContactFlagsForChatResult {
  remote_jid: string;
  contact_id: string | null;
  label_count: number;
  labels: ContactFlag[];
}

const contactFlagsCache = new Map<string, ContactFlagsForChatResult>();

/**
 * Busca contact flags para uma lista de remoteJids. Resultados são cacheados para
 * evitar chamadas repetidas à RPC.
 */
export async function fetchContactFlagsForChats(
  remoteJids: string[],
  workspaceId: string
): Promise<ContactFlagsForChatResult[]> {
  const missing = remoteJids.filter(jid => !contactFlagsCache.has(jid));

  if (missing.length) {
    console.log('Calling rpc_labels_for_chats', {
      p_workspace_id: workspaceId,
      p_instance_id: INSTANCE_ID,
      p_remote_jids: missing,
    });

    const { data, error } = await supabase
      .schema('crm')
      .rpc('rpc_labels_for_chats', {
        p_workspace_id: workspaceId,
        p_instance_id: INSTANCE_ID,
        p_remote_jids: missing,
      });

    console.log('rpc_labels_for_chats result', { data, error });

    if (!error && Array.isArray(data)) {
      (data as ContactFlagsForChatResult[]).forEach(row => {
        contactFlagsCache.set(row.remote_jid, row);
      });
    }
  }

  return remoteJids.map(jid =>
    contactFlagsCache.get(jid) || {
      remote_jid: jid,
      contact_id: null,
      label_count: 0,
      labels: [],
    }
  );
}

export function getCachedContactFlags(jid: string) {
  return contactFlagsCache.get(jid);
}
