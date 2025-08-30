/* Tipagens globais usadas em todo o app */

export interface Attachment {
    id: number;
    name: string;
    type: 'pdf' | 'image' | 'document';
    url?: string;
  }

// Representa um campo customizado de CRM e seu valor
export interface CustomFieldValue {
  fieldId?: string;
  key: string;
  label: string;
  type: string;
  value: unknown;
  createdAt?: string;
}
  
export interface ChatSummary {
    chatId: number;
    crmContactId?: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
    lastSeen: string;
    isVip: boolean;
    ticketStatus: 'active' | 'resolved' | 'pending' | 'closed';
    automationEnabled: boolean;
    notes: string;
    phone: string;
    attachments: Attachment[];
}

  /* View ‑ Supabase */

export interface ContactFlag {
    icon: string;
    color: string;
    label: string;
    labelId: string;
    priority: number;
}

export interface Conversation {
    chat_id: string;
    remote_jid: string;
    nome_contato: string | null;
    foto_contato: string | null;
    whatsappFilters: string[] | null;
    contactFlags: ContactFlag[];
    mensagens_nao_lidas: number;
    ultima_mensagem: string | null;
    data_ultima_mensagem: string | null;
    instance_id: string;
    contactId?: string | null;
    labelCount?: number;
  }
  
  /* Mensagens */
  export interface MessageDb {
    id: string;
    id_key: string | null;
    remote_jid: string;
    participant: string | null;
    autor: string | null;
    message_type: string | null;
    conteudo_texto: string | null;
    mediaurl: string | null;
    legenda: string | null;
    imagem_thumb_base64?: string | null;
    speech_to_text?: string | null;
    message_timestamp: number | null;
    message_status: string | null;
    instance_id: string;
  }

  export interface MessageDbView {
    id: string; // id do banco, se disponível
    key_id?: string | null; // id_key do banco, se disponível
    text: string;
    media_url: string | null;
    thumb_base64?: string | null;
    legenda: string | null;
    speechToText?: string | null;
    sent: boolean;
    timestamp: Date | null;
    autor: string | null;
    participant: string | null;
    message_type: string | null;
    message_status: string | null;
  }
  
  export interface QuickMessage {
    id: number;
    title: string;
    text: string;
  }
  
  export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';