# Contrato de Dados — “Tags Inteligentes” (Frontend)

Guia para o dev criar a UI de criação/edição de **tags** (labels) 100% compatível com o banco já existente.
**Você NÃO roda DDL.** O backend/banco já tem as tabelas e a view criadas. O app só faz **CRUD de dados** e **leituras**.

---

## Visão Geral

* **Modelos de escrita**

  * `crm.label_configs` → define a **tag** (nome, cor, tipo, prioridade, filtros fixos).
  * `crm.label_config_rules` → define **regras por variável** (idade > 60, cidade IN …, etc.).

* **Modelo de leitura**

  * `crm.v_contact_labels` → já devolve, por **contato**, as **tags ativas** (após avaliar filtros fixos + regras).
  * Frontend só lê e renderiza as “chips”. Uma tag pode aparecer para **vários contatos**; um contato pode ter **várias tags**.
  * No frontend, conversas carregam **duas** coleções:
    - `whatsappFilters`: rótulos simples vindos de `crm.v_labels_scoped`, usados apenas para filtrar a lista.
    - `contactFlags`: tags completas (icone, cor, label, labelId, prioridade) retornadas pela RPC `rpc_labels_for_chats`, usadas para exibir ícones ao lado de cada conversa.

* **RLS**

  * Todas as operações devem usar o `workspace_id` do usuário logado (ele precisa ser membro).

---

## Tabelas (para CRUD)

### 1) `crm.label_configs` — Tags

**Campos principais**

| Campo                        | Tipo                   | Obrigatório | Observações                                                 |
| ---------------------------- | ---------------------- | ----------: | ----------------------------------------------------------- |
| `id`                         | `uuid`                 |           — | Gerado pelo banco                                           |
| `workspace_id`               | `uuid`                 |           ✅ | Do workspace atual do usuário                               |
| `name`                       | `text`                 |           ✅ | Único por `workspace_id`                                    |
| `color`                      | `text`                 |           — | Ex.: `#10B981` ou token de cor                              |
| `icon`                       | `text`                 |           — | Ex.: `CheckCircle2` (lucide)                                |
| `type`                       | `crm.label_type`       |           — | `badge` (default), `status`, `stage`, `automation`, `other` |
| `priority`                   | `int`                  |           — | Default `100`; **menor aparece antes**                      |
| `contact_status_any`         | `crm.contact_status[]` |           — | Ex.: `{'open','pending'}`. `NULL` = não filtra              |
| `session_status_any`         | `bot.session_status[]` |           — | Ex.: `{'abandoned'}`. `NULL` = não filtra                   |
| `stage_any`                  | `uuid[]`               |           — | IDs de `bot.stages`. `NULL` = não filtra                    |
| `require_automation_enabled` | `boolean`              |           — | `true/false` exige; `NULL` = ignora                         |
| `is_active`                  | `boolean`              |           — | Default `true`                                              |
| `created_at`, `updated_at`   | `timestamptz`          |           — | Auto                                                        |

**Enums de apoio**

* `crm.contact_status`: `new | open | pending | closed`
* `bot.session_status`: `active | paused | done | abandoned | error`
* `crm.label_type`: `badge | status | stage | automation | other`

**Operações típicas**

* **Listar tags do workspace**

  ```sql
  select * from crm.label_configs
  where workspace_id = :ws
  order by priority, name;
  ```

* **Criar tag (somente fixos)**

  ```sql
  insert into crm.label_configs
    (workspace_id, name, color, type, priority, contact_status_any, session_status_any, stage_any, require_automation_enabled)
  values
    (:ws, :name, :color, :type, :priority, :contact_status_any, :session_status_any, :stage_any, :require_automation_enabled)
  returning *;
  ```

* **Atualizar tag**

  ```sql
  update crm.label_configs
  set name=:name, color=:color, type=:type, priority=:priority,
      contact_status_any=:contact_status_any,
      session_status_any=:session_status_any,
      stage_any=:stage_any,
      require_automation_enabled=:require_automation_enabled,
      is_active=:is_active,
      updated_at=now()
  where id=:label_id and workspace_id=:ws
  returning *;
  ```

* **Desativar/Ativar**

  ```sql
  update crm.label_configs
  set is_active=:is_active, updated_at=now()
  where id=:label_id and workspace_id=:ws;
  ```

---

### 2) `crm.label_config_rules` — Regras por variável

Cada linha é **uma regra**. Regras da **mesma tag** são combinadas por **AND** (todas devem passar).

**Campos**

| Campo              | Tipo              | Obrigatório | Observações                             |
| ------------------ | ----------------- | ----------: | --------------------------------------- |
| `id`               | `uuid`            |           — | Gerado pelo banco                       |
| `label_config_id`  | `uuid`            |           ✅ | FK → `crm.label_configs.id`             |
| `variable_id`      | `uuid`            |           ✅ | FK → `bot.variables.id`                 |
| `source`           | `crm.rule_source` |           — | `session` (default) ou `contact`        |
| `op`               | `crm.rule_op`     |           ✅ | Ver abaixo                              |
| `value_number`     | `numeric`         |           — | Preencher **um** conforme tipo do valor |
| `value_text`       | `text`            |           — | —                                       |
| `value_bool`       | `boolean`         |           — | —                                       |
| `value_date`       | `date`            |           — | —                                       |
| `value_text_array` | `text[]`          |           — | Para `in`/`not_in`                      |
| `created_at`       | `timestamptz`     |           — | Auto                                    |

**Enums**

* `crm.rule_source`: `session | contact`

  * `session`: lê a **última resposta** da variável na sessão (tabela `bot.answers`).
  * `contact`: lê o valor **salvo no EAV** (`crm.custom_field_values`) via `variable.crm_field_id`.

* `crm.rule_op`:

  * Comparação: `eq | neq | gt | gte | lt | lte`
  * Listas (texto): `in | not_in` (usa `value_text_array`)
  * Presença/booleano: `is_true | is_false | is_null | not_null`

**Boas práticas por tipo da variável**

| Tipo (`bot.variables.type`) | Operadores                                    | Campo(s) de valor                                      |
| --------------------------- | --------------------------------------------- | ------------------------------------------------------ |
| `number`                    | `eq, neq, gt, gte, lt, lte`                   | `value_number`                                         |
| `text` / `select`           | `eq, neq, in, not_in`                         | `value_text` ou `value_text_array`                     |
| `multi_select`              | (comparar texto bruto) `in, not_in`           | `value_text_array` (definir convenção de serialização) |
| `boolean`                   | `eq` (com `value_bool`) ou `is_true/is_false` | `value_bool` (se `eq`)                                 |
| `date` / `datetime`         | `eq, neq, gt, gte, lt, lte`                   | `value_date` (ou padronize ISO e use `value_text`)     |
| `json`                      | `eq/neq` (pontual)                            | `value_text`                                           |

**Operações típicas**

* **Adicionar regra**

  ```sql
  insert into crm.label_config_rules
    (label_config_id, variable_id, source, op, value_number, value_text, value_bool, value_date, value_text_array)
  values
    (:label_id, :variable_id, :source, :op, :value_number, :value_text, :value_bool, :value_date, :value_text_array)
  returning *;
  ```

* **Listar regras de uma tag**

  ```sql
  select * from crm.label_config_rules
  where label_config_id = :label_id
  order by created_at;
  ```

* **Remover regra**

  ```sql
  delete from crm.label_config_rules
  where id = :rule_id and label_config_id = :label_id;
  ```

---

## View de Leitura

### `crm.v_contact_labels`

**O que faz**
Para cada contato do workspace, retorna as **tags ativas** após aplicar:

1. Filtros fixos da tag (`contact_status_any`, `session_status_any`, `stage_any`, `require_automation_enabled`)
2. Regras por variável da tag (`crm.label_config_rules`, AND)

**Campos disponibilizados (importante para UI)**

| Campo              | Descrição                                                             |
| ------------------ | --------------------------------------------------------------------- |
| `workspace_id`     | workspace do contato                                                  |
| `contact_id`       | id do contato                                                         |
| `label_id`         | id da tag (config)                                                    |
| `label`            | nome da tag                                                           |
| `label_type`       | categoria visual (badge/status/…)                                     |
| `color`, `icon`    | aparência                                                             |
| `priority`         | ordenação (menor primeiro)                                            |
| `contact_status`   | status atual do contato (contexto)                                    |
| `session_status`   | status da **última sessão** (se houver)                               |
| `current_stage_id` | etapa atual (se houver)                                               |
| `total_rules`      | qtde de regras da tag                                                 |
| `passed_rules`     | qtde de regras satisfeitas (se `total_rules = passed_rules` → passou) |

**Leituras comuns**

* **Chips por contato (app)**

  ```sql
  select label_id, label, label_type, color, icon, priority
  from crm.v_contact_labels
  where workspace_id = :ws and contact_id = :contact_id
  order by priority, label;
  ```

* **Pré-visualizar efeito de uma tag**

  ```sql
  select c.id as contact_id, c.name
  from crm.v_contact_labels v
  join crm.contacts c on c.id = v.contact_id
  where v.workspace_id = :ws and v.label_id = :label_id
  order by c.name;
  ```

* **Contato → lista de tags**

  ```sql
  select c.id as contact_id, c.name, array_agg(v.label order by v.priority) as labels
  from crm.v_contact_labels v
  join crm.contacts c on c.id = v.contact_id
  where v.workspace_id = :ws
  group by c.id, c.name
  order by c.name;
  ```

---

## UX / Validações no Frontend

1. **Workspace**

   * Sempre use o `workspace_id` do usuário atual (RLS exige ser membro).

2. **Criar/Editar Tag**

   * `name` único dentro do workspace (mostrar erro amigável se duplicado).
   * `type`: dropdown fixo (`badge`, `status`, `stage`, `automation`, `other`).
   * `priority`: número (default 100). Mostrar dica “menor = mais alta”.
   * **Filtros fixos** (opcionais):

     * `contact_status_any`: multiselect dos enums `new/open/pending/closed`.
     * `session_status_any`: multiselect dos enums `active/paused/done/abandoned/error`.
     * `stage_any`: multiselect de `bot.stages` → listar `id,name` do mesmo workspace.
     * `require_automation_enabled`: toggle tri-state (`null` = “ignorar”, `true` = “apenas com automação”, `false` = “apenas sem automação”).

3. **Regras por variável**

   * Picker de `variable_id` a partir de `bot.variables` do workspace.
   * Mostrar **operadores compatíveis** com o tipo da variável (matriz acima).
   * **Exigir exatamente um campo de valor** por regra (ou nenhum para `is_null/not_null/is_true/is_false`).
   * `source`: `session` (última resposta) ou `contact` (EAV) — default `session`.
   * Permitir **múltiplas regras** na mesma tag (AND).

4. **Preview**

   * Antes de salvar (ou após), oferecer “**Ver quem ativa**” com a query de pré-visualização.
   * Mostrar contador (ex.: “32 contatos ativam esta tag”).

5. **Erros comuns & mensagens**

   * **RLS/403**: “Você não tem permissão neste workspace.”
   * **FK inválida (variable/stage)**: “Selecione uma opção válida.”
   * **ENUM inválido**: “Valor não permitido; use as opções disponíveis.”
   * **Duplicidade de nome**: “Já existe uma tag com esse nome neste workspace.”

---

## Fluxos típicos

### A) Criar tag apenas com filtros fixos

1. Preencher `name`, `color`, `type`, `priority`.
2. (Opcional) marcar `contact_status_any` / `session_status_any` / `stage_any` / `require_automation_enabled`.
3. `INSERT` em `crm.label_configs`.
4. (Opcional) rodar pré-visualização pela view.

### B) Criar tag apenas com variáveis

1. Criar tag com metadados (`label_configs`).
2. Adicionar 1..N regras em `crm.label_config_rules` (ex.: `idade > 60`).
3. Pré-visualizar.

### C) Criar tag “mista”

1. Combinar filtros fixos **e** regras (AND).
2. Pré-visualizar.

### D) Clonar tag

1. `INSERT INTO crm.label_configs (...) SELECT ... FROM crm.label_configs WHERE id=:orig`.
2. Copiar regras: `INSERT INTO crm.label_config_rules (...) SELECT :new_id, variable_id, ... FROM crm.label_config_rules WHERE label_config_id=:orig`.

---

## Segurança / Compatibilidade

* **RLS**: políticas já aplicadas; use sempre o `workspace_id` do usuário logado.
* **Compatibilidade**: não rodar DDL (criação de tipos, tabelas, views, policies).
  O app só usa **CRUD** nas duas tabelas e **SELECT** na view.
* **Tipos de valores**: o banco aceita variações; comparações são **protegidas** (casts safe). Mesmo assim, a UI deve **guiar** o valor conforme o tipo da variável para evitar “lixo”.

---

## Testes rápidos (SQL prontos)

* **Contato → labels**

  ```sql
  select c.id, c.name, array_agg(v.label order by v.priority) as labels
  from crm.v_contact_labels v
  join crm.contacts c on c.id = v.contact_id
  where v.workspace_id = :ws
  group by c.id, c.name
  order by c.name;
  ```

* **Label → contatos**

  ```sql
  select c.id, c.name
  from crm.v_contact_labels v
  join crm.contacts c on c.id = v.contact_id
  where v.workspace_id = :ws and v.label_id = :label_id
  order by c.name;
  ```

* **Debug por contato**

  ```sql
  select v.label, v.priority, v.contact_status, v.session_status, v.current_stage_id,
         v.total_rules, v.passed_rules
  from crm.v_contact_labels v
  where v.workspace_id = :ws and v.contact_id = :contact_id
  order by v.priority;
  ```

---

## Checklist para PR do Frontend

* [ ] CRUD de `crm.label_configs` (create/update/activate/deactivate/delete opcional)
* [ ] CRUD de `crm.label_config_rules` (add/remove/editar)
* [ ] Inputs validados conforme tipo/operador
* [ ] Multiselects populados de **enums** e `bot.stages` corretos (do workspace)
* [ ] Preview via `crm.v_contact_labels`
* [ ] Ordenação por `priority` na renderização
* [ ] Tratamento de erros (403 RLS, 409 nome duplicado, 400 FK inválida)
* [ ] Usar sempre `workspace_id` do usuário logado

---

Se quiser, eu também te entrego um **mock JSON** de payloads (para chamar do client) e um **wireframe básico** da tela (layout dos campos, UX dos operadores).

