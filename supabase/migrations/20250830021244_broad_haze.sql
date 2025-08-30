/*
  # Views para página de contatos

  1. Views criadas
    - `crm.v_contacts_full` - dados completos do contato com custom fields, tags e identidades
    - `crm.v_contacts_list` - versão otimizada para listagem com payload menor
  
  2. Funcionalidades
    - Agregação de custom fields em objeto JSON
    - Tags como array de objetos
    - Identidades WhatsApp como array
    - Otimização para performance na listagem
*/

-- View completa para detalhes do contato
CREATE OR REPLACE VIEW crm.v_contacts_full AS
SELECT
  c.id,
  c.workspace_id,
  c.name,
  c.avatar_url,
  c.city,
  c.age,
  c.status,
  c.automation_enabled,
  c.bot_id,
  c.assigned_to,
  c.last_interaction_at,
  c.last_message_at,
  c.last_message_text,
  c.last_instance_id,
  c.merged_into_id,
  c.created_at,
  -- identidades (WhatsApp etc.)
  COALESCE(jsonb_agg(
    jsonb_build_object('instance_id', ci.instance_id, 'remote_jid', ci.remote_jid)
  ) FILTER (WHERE ci.contact_id IS NOT NULL), '[]'::jsonb) AS identities,
  -- tags
  COALESCE(jsonb_agg(
    DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color)
  ) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS tags,
  -- campos customizados (apenas entity_type='contact')
  COALESCE(
    jsonb_object_agg(cf.key, v.value_json)
      FILTER (WHERE cf.id IS NOT NULL), '{}'::jsonb
  ) AS custom
FROM crm.contacts c
LEFT JOIN crm.contact_identities ci
  ON ci.contact_id = c.id
LEFT JOIN crm.contact_tags ct
  ON ct.contact_id = c.id
LEFT JOIN crm.tags t
  ON t.id = ct.tag_id
LEFT JOIN crm.custom_field_values v
  ON v.workspace_id = c.workspace_id
 AND v.entity_type = 'contact'
 AND v.entity_id = c.id
LEFT JOIN crm.custom_fields cf
  ON cf.id = v.field_id
GROUP BY c.id;

-- View otimizada para listagem
CREATE OR REPLACE VIEW crm.v_contacts_list AS
SELECT
  c.id,
  c.workspace_id,
  c.name,
  c.avatar_url,
  c.city,
  c.age,
  c.status,
  c.automation_enabled,
  c.last_message_at,
  LEFT(c.last_message_text, 140) AS last_message_preview,
  -- campos custom mais usados (email, telefone, cpf)
  (SELECT jsonb_object_agg(cf.key, v.value_json)
     FROM crm.custom_field_values v
     JOIN crm.custom_fields cf ON cf.id = v.field_id
    WHERE v.workspace_id = c.workspace_id
      AND v.entity_type = 'contact'
      AND v.entity_id = c.id
      AND cf.key = ANY (ARRAY['email','telefone','cpf'])
  ) AS custom_small,
  -- tags resumidas (nomes)
  (SELECT array_agg(DISTINCT t.name)
     FROM crm.contact_tags ct
     JOIN crm.tags t ON t.id = ct.tag_id
    WHERE ct.contact_id = c.id
  ) AS tag_names,
  c.created_at
FROM crm.contacts c;