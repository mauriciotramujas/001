O código cria a conexão com o Supabase em src/supabaseClient.ts, lendo as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY:

1  import { createClient } from '@supabase/supabase-js';
3  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
4  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
6  export const supabase = createClient(supabaseUrl, supabaseAnonKey);

Leitura de dados
Labels (etiquetas de conversas)

Função useWhatsappFilters consulta a view `crm.v_labels_scoped` (via `.schema('crm')`) filtrando por instanceId. A view precisa ter as colunas id, labelId, name, color e instanceId.

Conversas (lista de chats)

Função useConversations busca na view `crm.v_conversas_scoped` com filtro em instance_id e ordenação por data_ultima_mensagem. A interface esperada inclui:
chat_id, remote_jid, nome_contato, foto_contato, **whatsappFilters**, mensagens_nao_lidas, ultima_mensagem, data_ultima_mensagem, instance_id.

Após carregar as conversas, uma RPC (`rpc_labels_for_chats`) fornece para cada `remote_jid`:
- `contactId`
- `labelCount`
- `contactFlags` (icone, cor, label, labelId, prioridade)

`whatsappFilters` são usados apenas para filtrar a lista (view `crm.v_labels_scoped`); `contactFlags` determinam os ícones exibidos em cada conversa.

Mensagens de cada contato

Função useMessages carrega mensagens da view `crm.v_mensagens_scoped`, filtrando por remote_jid e instance_id. São buscados lotes iniciais (200) e lotes de “infinite scroll” (500). A estrutura MessageDb indica as colunas esperadas:
id, id_key, remote_jid, participant, autor, message_type, conteudo_texto, mediaurl, legenda, imagem_thumb_base64, speech_to_text, message_timestamp, message_status, instance_id.

Escrita no banco
Nos arquivos do projeto não há chamadas de .insert, .update ou .delete via Supabase. A aplicação apenas lê dados dessas views. O envio de mensagens e outras ações são feitos por requisições HTTP ou WebSocket para a API Evolution (src/api/evolution.ts e src/api/websocket.ts), não diretamente pelo Supabase.

Fluxo geral
Inicialização

supabaseClient cria o cliente a partir das variáveis de ambiente.

Hooks personalizados (useWhatsappFilters, useConversations, useMessages) realizam as consultas às views para carregar dados iniciais.

WebSocket

src/api/websocket.ts conecta à Evolution API via Socket.IO e repassa eventos (novas mensagens, atualização de status etc.) para a UI.

Os eventos chamam funções como addMessageToCache ou updateMessageStatusInCache (no hook useMessages) para atualizar o estado local.

Envio de mensagens

src/api/evolution.ts contém funções sendTextMessage, sendMediaMessage, sendAudioMessage etc., que enviam HTTP POST para a Evolution API usando INSTANCE, INSTANCE_ID e API_KEY das variáveis de ambiente.

Após o envio, a confirmação chega via WebSocket e é adicionada ao cache de mensagens.

Persistência

Não há escrita no Supabase. O front-end apenas consome as views mencionadas. A gravação de mensagens no banco provavelmente ocorre do lado do backend/Evolution API.

Esquema necessário no Supabase
Com base nas interfaces usadas, as views/tabelas devem conter ao menos:

crm.v_labels_scoped

id (string)

labelId (string)

name (string)

color (string)

instanceId (string) – filtrada no frontend

crm.v_conversas_scoped

chat_id (string)

remote_jid (string)

nome_contato (string ou null)

foto_contato (string ou null)

labels (array de strings ou JSON)

mensagens_nao_lidas (number)

ultima_mensagem (string ou null)

data_ultima_mensagem (string ou timestamp)

instance_id (string)

crm.v_mensagens_scoped

id (string)

id_key (string ou null)

remote_jid (string)

participant (string ou null)

autor (string ou null)

message_type (string ou null)

conteudo_texto (string ou null)

mediaurl (string ou null)

legenda (string ou null)

imagem_thumb_base64 (string ou null)

speech_to_text (string ou null)

message_timestamp (number ou timestamp)

message_status (string ou null)

instance_id (string)

Essas views devem estar populadas com os dados da aplicação (provavelmente replicados do backend Evolution), possibilitando ao front-end ler conversas, mensagens e etiquetas. Como não há operações de escrita via Supabase, nenhuma permissão de insert/update é necessária para o front-end.







tabelas do postgress original do evoapi (originarias das views do supabase):
CREATE VIEW "my_views"."mensagens"
AS
 SELECT m.id,
    (m.key ->> 'id'::text) AS id_key,
    (m.key ->> 'remoteJid'::text) AS remote_jid,
    m.participant,
        CASE
            WHEN ((m.key ->> 'fromMe'::text) = 'true'::text) THEN 'me'::text
            ELSE 'contact'::text
        END AS autor,
    m."messageType" AS message_type,
    COALESCE((m.message ->> 'conversation'::text), (m.message ->> 'speechToText'::text)) AS conteudo_texto,
    m."messageTimestamp" AS message_timestamp,
    mu.status AS message_status,
    m."instanceId" AS instance_id,
    (m.message ->> 'mediaUrl'::text) AS mediaurl,
    COALESCE(((m.message -> 'imageMessage'::text) ->> 'caption'::text), ((m.message -> 'videoMessage'::text) ->> 'caption'::text), ((m.message -> 'documentMessage'::text) ->> 'caption'::text), (m.message ->> 'speechToText'::text)) AS legenda,
    COALESCE(((m.message -> 'imageMessage'::text) ->> 'jpegThumbnail'::text), ((m.message -> 'videoMessage'::text) ->> 'jpegThumbnail'::text), ((m.message -> 'documentMessage'::text) ->> 'jpegThumbnail'::text)) AS imagem_thumb_base64
   FROM ("Message" m
     LEFT JOIN LATERAL ( SELECT mu_1.status
           FROM "MessageUpdate" mu_1
          WHERE (mu_1."messageId" = m.id)
          ORDER BY mu_1.id DESC
         LIMIT 1) mu ON (true));


CREATE VIEW "my_views"."conversas"
AS
 SELECT ch.id AS chat_id,
    ch."remoteJid" AS remote_jid,
    ct."pushName" AS nome_contato,
    ct."profilePicUrl" AS foto_contato,
    ch.labels,
    ch."unreadMessages" AS mensagens_nao_lidas,
    m.conteudo_texto AS ultima_mensagem,
    m.message_timestamp AS data_ultima_mensagem,
    ch."instanceId" AS instance_id
   FROM (("Chat" ch
     LEFT JOIN "Contact" ct ON ((((ct."remoteJid")::text = (ch."remoteJid")::text) AND (ct."instanceId" = ch."instanceId"))))
     LEFT JOIN LATERAL ( SELECT (m1.message ->> 'conversation'::text) AS conteudo_texto,
            m1."messageTimestamp" AS message_timestamp
           FROM "Message" m1
          WHERE (((m1.key ->> 'remoteJid'::text) = (ch."remoteJid")::text) AND (m1."instanceId" = ch."instanceId") AND ((m1."messageType")::text = ANY ((ARRAY['conversation'::character varying, 'text'::character varying])::text[])))
          ORDER BY m1."messageTimestamp" DESC
         LIMIT 1) m ON (true));




















NO SUPABASE!!!!!!!!!!!!!!!

criacao das views:

 CREATE FOREIGN TABLE public."View_Evolution_Conversas" (
   chat_id text,
   remote_jid varchar,
   nome_contato varchar,
   foto_contato varchar,
   labels jsonb,
   mensagens_nao_lidas integer,
   ultima_mensagem text,
   data_ultima_mensagem integer,
   instance_id text
 )
 SERVER servidor_remoto
 OPTIONS (schema_name 'my_views', table_name 'conversas');

 CREATE USER MAPPING FOR authenticated
 SERVER servidor_remoto
 OPTIONS (user 'postgres', password 'b45aee4f3c3c3e272767');

CREATE FOREIGN TABLE public."View_Evolution_Instance" (
  id text,
  name varchar(255),
  connectionstatus text,          -- Coloque 'text' se não tem esse tipo criado no Supabase
  ownerjid varchar(100),
  profilepicurl varchar(500),
  integration varchar(100),
  number varchar(100),
  token varchar(255),
  clientname varchar(100),
  createdat timestamp,
  updatedat timestamp,
  profilename varchar(100),
  businessid varchar(100),
  disconnectionat timestamp,
  disconnectionobject jsonb,
  disconnectionreasoncode integer
)
SERVER servidor_remoto
OPTIONS (schema_name 'public', table_name 'Instance');


-- Etapa 1: Apagar a foreign table antiga (sem afetar os dados reais, que estão na view remota)
DROP FOREIGN TABLE IF EXISTS public."View_Evolution_Mensagens";

-- Etapa 2: Recriar a foreign table com os campos antigos + novos
CREATE FOREIGN TABLE public."View_Evolution_Mensagens" (
  id text,
  id_key text,
  remote_jid character varying,
  participant character varying,
  autor character varying,
  message_type character varying,
  conteudo_texto text,
  message_timestamp integer,
  message_status character varying,
  instance_id text,

  -- Novos campos que agora existem na view remota:
  mediaurl text,
  legenda text,
  imagem_thumb_base64 text
)
SERVER servidor_remoto
OPTIONS (schema_name 'my_views', table_name 'mensagens');



DROP FOREIGN TABLE IF EXISTS public."View_Evolution_Labels";

CREATE FOREIGN TABLE public."View_Evolution_Labels" (
  id text NOT NULL,
  "labelId" varchar(100),
  name varchar(100) NOT NULL,
  color varchar(100) NOT NULL,
  "predefinedId" varchar(100),
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp NOT NULL,
  "instanceId" text NOT NULL
)
SERVER servidor_remoto
OPTIONS (schema_name 'public', table_name 'Label');













query robusta:
-- =========================
-- Extensões (apenas rode uma vez no projeto)
-- =========================
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- =========================
-- 1) Multi-tenant: Workspaces
-- =========================
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','member')),
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create or replace function public.is_workspace_member(w_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = w_id
      and wm.user_id = auth.uid()
      and wm.is_active
  );
$$;

-- Vincular suas instâncias Evolution a Workspaces sem alterar a tabela original
create table if not exists public.instance_workspaces (
  instance_id text primary key,           -- REMOVIDA FK para public."Instance"
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Helper: checar se o usuário logado é membro da workspace dona da instância
create or replace function public.instance_belongs_to_current_user(inst_id text)
returns boolean language sql stable as $$
  select public.is_workspace_member(iw.workspace_id)
  from public.instance_workspaces iw
  where iw.instance_id = inst_id;
$$;

-- =========================
-- 2) CRM schema (somente dados de negócio)
-- =========================
create schema if not exists crm;

create type crm.contact_status as enum ('new','open','pending','closed');

create table if not exists crm.bots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  config jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on crm.bots(workspace_id);

create table if not exists crm.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  -- dados canônicos do CRM
  name text,
  avatar_url text,
  city text,
  age int,
  status crm.contact_status not null default 'new',
  automation_enabled boolean not null default false,
  bot_id uuid references crm.bots(id),
  assigned_to uuid references auth.users(id),
  -- snapshots (atualizados por trigger de mensagens)
  last_interaction_at timestamptz,
  last_message_at timestamptz,
  last_message_text text,
  last_instance_id text,               -- REMOVIDA FK para public."Instance"
  merged_into_id uuid references crm.contacts(id),
  created_at timestamptz not null default now()
);
create index on crm.contacts(workspace_id, status);
create index on crm.contacts(workspace_id, last_message_at desc);

-- Ponte contato-CRM -> identidades WhatsApp existentes (sem FK para remoteJid)
create table if not exists crm.contact_identities (
  contact_id uuid not null references crm.contacts(id) on delete cascade,
  instance_id text not null,           -- REMOVIDA FK para public."Instance"
  remote_jid text not null,
  primary key (contact_id, instance_id, remote_jid)
);
create index on crm.contact_identities(instance_id, remote_jid);

-- Tags
create table if not exists crm.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text,
  unique (workspace_id, name)
);
create table if not exists crm.contact_tags (
  contact_id uuid not null references crm.contacts(id) on delete cascade,
  tag_id uuid not null references crm.tags(id) on delete cascade,
  primary key (contact_id, tag_id)
);

-- Campos customizados (EAV tipado)
create type crm.custom_field_type as enum ('text','number','boolean','date','datetime','select','multi_select','json');

create table if not exists crm.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('contact','conversation')),
  key text not null,
  label text not null,
  type crm.custom_field_type not null,
  options jsonb,
  is_required boolean not null default false,
  is_indexed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (workspace_id, entity_type, key)
);
create index on crm.custom_fields(workspace_id);

create table if not exists crm.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('contact','conversation')),
  entity_id uuid not null,        -- id do contato ou conversa
  field_id uuid not null references crm.custom_fields(id) on delete cascade,
  value_json jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, entity_type, entity_id, field_id)
);
create index on crm.custom_field_values using gin (value_json);
create index on crm.custom_field_values(workspace_id, entity_type, entity_id);

-- -- =========================
-- -- 4) Trigger: atualizar snapshot do contato ao inserir mensagem nova
-- --     (não altera dados do Evolution; só "ouve" inserts em Message)
-- -- =========================
-- =========================
-- 5) RLS em tudo que é seu (não mexe no Evolution)
-- =========================
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.instance_workspaces enable row level security;

alter table crm.bots enable row level security;
alter table crm.contacts enable row level security;
alter table crm.contact_identities enable row level security;
alter table crm.tags enable row level security;
alter table crm.contact_tags enable row level security;
alter table crm.custom_fields enable row level security;
alter table crm.custom_field_values enable row level security;

-- Policies: o usuário só vê/edita suas coisas via workspace
create policy "workspaces: member select"
on public.workspaces for select using (public.is_workspace_member(id));
create policy "workspaces: member update"
on public.workspaces for update using (public.is_workspace_member(id));
create policy "workspace_members: member select"
on public.workspace_members for select using (public.is_workspace_member(workspace_id));

create policy "instance_workspaces: member all"
on public.instance_workspaces for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "crm: bots all"
on crm.bots for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "crm: contacts all"
on crm.contacts for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "crm: contact_identities all"
on crm.contact_identities for all
using (
  public.instance_belongs_to_current_user(instance_id) and
  exists (select 1 from crm.contacts c where c.id = contact_id and public.is_workspace_member(c.workspace_id))
)
with check (
  public.instance_belongs_to_current_user(instance_id) and
  exists (select 1 from crm.contacts c where c.id = contact_id and public.is_workspace_member(c.workspace_id))
);

create policy "crm: tags all"
on crm.tags for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "crm: contact_tags all"
on crm.contact_tags for all
using (exists (select 1 from crm.contacts c where c.id = contact_id and public.is_workspace_member(c.workspace_id)))
with check (exists (select 1 from crm.contacts c where c.id = contact_id and public.is_workspace_member(c.workspace_id)));

create policy "crm: custom_fields all"
on crm.custom_fields for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create policy "crm: custom_field_values all"
on crm.custom_field_values for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

-- =========================
-- 6) Auto-onboarding: cria Workspace no 1º login
-- =========================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_ws uuid;
begin
  insert into public.workspaces (name, created_by)
  values (coalesce(new.raw_user_meta_data->>'company', 'Meu Workspace'), new.id)
  returning id into v_ws;

  insert into public.workspace_members (workspace_id, user_id, role, is_active)
  values (v_ws, new.id, 'owner', true);

  return new;
end;
$$;

--drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();


--relacoes nao foram implementadas pois usamos views de fora de outro banco, e triger nao foi usado pelo mesmo motivo
-- ALTER TABLE public.instance_workspaces
-- ADD CONSTRAINT fk_instance
-- FOREIGN KEY (instance_id)
-- REFERENCES public."Instance"(id)
-- ON DELETE CASCADE;

-- ALTER TABLE crm.contact_identities
-- ADD CONSTRAINT fk_instance_contact_identity
-- FOREIGN KEY (instance_id)
-- REFERENCES public."Instance"(id)
-- ON DELETE CASCADE;

-- ALTER TABLE crm.contacts
-- ADD CONSTRAINT fk_contacts_instance
-- FOREIGN KEY (last_instance_id)
-- REFERENCES public."Instance"(id);

-- -- =========================
-- -- 4) Trigger: atualizar snapshot do contato ao inserir mensagem nova
-- --     (não altera dados do Evolution; só "ouve" inserts em Message)
-- -- =========================
-- create or replace function crm.update_contact_snapshot_from_message()
-- returns trigger language plpgsql as $$
-- declare
--   v_remote_jid text := (new.key ->> 'remoteJid');
--   v_contact_id uuid;
-- begin
--   -- encontra contato vinculado a (instanceId, remoteJid)
--   select ci.contact_id into v_contact_id
--   from crm.contact_identities ci
--   where ci.instance_id = new."instanceId"
--     and ci.remote_jid  = v_remote_jid
--   limit 1;

--   if v_contact_id is not null then
--     update crm.contacts c
--        set last_message_at   = greatest(coalesce(c.last_message_at, 'epoch'), to_timestamp(new."messageTimestamp")),
--            last_message_text = coalesce(
--              case
--                when new."messageType" in ('conversation','text')
--                   then left(new."message"->>'conversation', 280)
--                else c.last_message_text
--              end,
--              c.last_message_text
--            ),
--            last_instance_id   = new."instanceId",
--            last_interaction_at= greatest(coalesce(c.last_interaction_at, 'epoch'), to_timestamp(new."messageTimestamp"))
--      where c.id = v_contact_id
--        and (c.last_message_at is null or to_timestamp(new."messageTimestamp") >= c.last_message_at);
--   end if;

--   return null;
-- end;
-- $$;

-- --drop trigger if exists trg_crm_contact_snapshot on public."Message";
-- create trigger trg_crm_contact_snapshot
-- after insert on public."Message"
-- for each row execute function crm.update_contact_snapshot_from_message();


--SECURITY SCOPED VIEWS -- colocando filtro de seguranca nas views que vem de banco externo (com cuidado case-sensitive)
-- Conversas
create or replace view crm.v_conversas_scoped as
select
  c.*
from "View_Evolution_Conversas" c
join public.instance_workspaces iw
  on iw.instance_id = c.instance_id;

-- Labels
create or replace view crm.v_labels_scoped as
select
  l.*
from "View_Evolution_Labels" l
join public.instance_workspaces iw
  on iw.instance_id = l."instanceId";

-- Mensagens
create or replace view crm.v_mensagens_scoped as
select
  m.*
from "View_Evolution_Mensagens" m
join public.instance_workspaces iw
  on iw.instance_id = m.instance_id;

-- Instances
create or replace view crm.v_instance_scoped as
select
  i.*
from "View_Evolution_Instance" i
join public.instance_workspaces iw
  on iw.instance_id = i.id;
