/* Funções REST centralizadas – Evolution API & credenciais de teste */

/**
 * Envia mensagem de texto via Evolution API.
 * @param params
 *   number: número do destinatário (com DDI, ex: 5531999999999)
 *   text: conteúdo da mensagem
 *   delay, quoted, linkPreview, mentionsEveryOne, mentioned: opcionais
 * @returns resposta JSON da API
 */
export async function sendTextMessage(params: {
  number: string;
  text: string;
  delay?: number;
  quoted?: object;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}) {
  const url = `https://${SERVER_URL}/message/sendText/${INSTANCE}`;
  const body = {
    number: params.number,
    text: params.text,
    ...(params.delay !== undefined && { delay: params.delay }),
    ...(params.quoted && { quoted: params.quoted }),
    ...(params.linkPreview !== undefined && { linkPreview: params.linkPreview }),
    ...(params.mentionsEveryOne !== undefined && { mentionsEveryOne: params.mentionsEveryOne }),
    ...(params.mentioned && { mentioned: params.mentioned }),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': INSTANCE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Erro ao enviar mensagem: ' + err);
  }
  return res.json();
}

/**
 * Envia mensagem de mídia via Evolution API.
 * @param params
 *   number: número do destinatário (com DDI, ex: 5531999999999)
 *   mediatype: categoria da mídia (ex: image, video, audio)
 *   mimetype: MIME type do arquivo
 *   caption: legenda da mídia
 *   media: conteúdo da mídia (base64 ou URL)
 *   fileName: nome do arquivo da mídia
 *   delay, linkPreview, mentionsEveryOne, mentioned: opcionais
 * @returns resposta JSON da API
 */
export async function sendMediaMessage(params: {
  number: string;
  mediatype: string;
  mimetype: string;
  caption: string;
  media: string;
  fileName: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}) {
  const url = `https://${SERVER_URL}/message/sendMedia/${INSTANCE}`;
  const body = {
    number: params.number,
    mediatype: params.mediatype,
    mimetype: params.mimetype,
    caption: params.caption,
    media: params.media,
    fileName: params.fileName,
    ...(params.delay !== undefined && { delay: params.delay }),
    ...(params.linkPreview !== undefined && { linkPreview: params.linkPreview }),
    ...(params.mentionsEveryOne !== undefined && { mentionsEveryOne: params.mentionsEveryOne }),
    ...(params.mentioned && { mentioned: params.mentioned }),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: INSTANCE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Erro ao enviar mensagem: ' + err);
  }
  return res.json();
}

/**
 * Envia mensagem de áudio via Evolution API.
 * @param params
 *   number: número do destinatário (com DDI, ex: 5531999999999)
 *   audio: conteúdo do áudio em base64 ou URL
 *   delay, linkPreview, mentionsEveryOne, mentioned, quoted: opcionais
 * @returns resposta JSON da API
 */
export async function sendAudioMessage(params: {
  number: string;
  audio: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: object;
}) {
  const url = `https://${SERVER_URL}/message/sendWhatsAppAudio/${INSTANCE}`;
  const body = {
    number: params.number,
    audio: params.audio,
    ...(params.delay !== undefined && { delay: params.delay }),
    ...(params.linkPreview !== undefined && { linkPreview: params.linkPreview }),
    ...(params.mentionsEveryOne !== undefined && { mentionsEveryOne: params.mentionsEveryOne }),
    ...(params.mentioned && { mentioned: params.mentioned }),
    ...(params.quoted && { quoted: params.quoted }),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: INSTANCE_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error('Erro ao enviar áudio: ' + err);
  }
  return res.json();
}

export interface EvolutionConfig {
  INSTANCE_ID: string;
  INSTANCE_KEY: string;
  INSTANCE: string;
  SERVER_URL: string;
}

export let SERVER_URL = '';
export let INSTANCE = '';
export let INSTANCE_KEY = '';
export let INSTANCE_ID = '';

export function setEvolutionConfig(cfg: EvolutionConfig) {
  SERVER_URL = cfg.SERVER_URL;
  INSTANCE = cfg.INSTANCE;
  INSTANCE_KEY = cfg.INSTANCE_KEY;
  INSTANCE_ID = cfg.INSTANCE_ID;
  if (typeof window !== 'undefined') {
    localStorage.setItem('evo_config', JSON.stringify(cfg));
  }
}

export function loadEvolutionConfig() {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem('evo_config');
  if (!stored) return;
  try {
    const cfg = JSON.parse(stored) as EvolutionConfig;
    SERVER_URL = cfg.SERVER_URL;
    INSTANCE = cfg.INSTANCE;
    INSTANCE_KEY = cfg.INSTANCE_KEY;
    INSTANCE_ID = cfg.INSTANCE_ID;
  } catch {
    // ignore malformed data
  }
}

export function clearEvolutionConfig() {
  SERVER_URL = '';
  INSTANCE = '';
  INSTANCE_KEY = '';
  INSTANCE_ID = '';
  if (typeof window !== 'undefined') {
    localStorage.removeItem('evo_config');
  }
}

// load config on module import
loadEvolutionConfig();


export async function fetchConnectionState() {
  const res = await fetch(`https://${SERVER_URL}/instance/connectionState/${INSTANCE}`, {
    headers: { apikey: INSTANCE_KEY },
  });
  if (!res.ok) throw new Error('Erro ao buscar status da conexão');
  const data = await res.json();
  return data.instance?.state as string;
}

export async function fetchQrCode() {
  const res = await fetch(`https://${SERVER_URL}/instance/connect/${INSTANCE}`, {
    headers: { apikey: INSTANCE_KEY },
  });
  if (!res.ok) throw new Error('Erro ao gerar QR code de conexão');
  return res.json();
}

export async function logoutInstance() {
  const res = await fetch(`https://${SERVER_URL}/instance/logout/${INSTANCE}`, {
    method: 'DELETE',
    headers: { apikey: INSTANCE_KEY },
  });
  if (!res.ok) throw new Error('Erro ao desconectar');
  return res.json();
}
