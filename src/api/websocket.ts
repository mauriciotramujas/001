// src/api/websocket.ts
// Cliente WebSocket centralizado usando socket.io-client para Evolution API

import { io, Socket } from 'socket.io-client';
import { SERVER_URL, INSTANCE, INSTANCE_ID } from './evolution';

// URL é montada dinamicamente para respeitar configurações carregadas em runtime

// Tipos básicos dos eventos conhecidos
export type EvolutionSocketEvent =
  | 'messages.update'
  | 'messages.upsert'
  | 'contacts.update'
  | 'contacts.upsert'
  | 'chats.update'
  | 'chats.upsert'
  | 'connection.update'
  | 'presence.update';

export interface EvolutionSocketPayload {
  event: EvolutionSocketEvent;
  instance: string;
  data: any; // Pode ser refinado conforme os eventos
  server_url: string;
  date_time: string;
  sender: string;
  apikey: string | null;
}

// Handler genérico para qualquer evento
export type EvolutionAnyHandler = (event: EvolutionSocketEvent, payload: any) => void;

class EvolutionWebSocket {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket && this.isConnected) return;
    const url = `wss://${SERVER_URL}/${INSTANCE}`;
    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });
    this.socket.on('connect', () => {
      this.isConnected = true;
      // console.log('✅ Conectado ao WebSocket!');
    });
    this.socket.on('disconnect', () => {
      this.isConnected = false;
      // console.log('🔌 Desconectado do WebSocket');
    });
    this.socket.on('connect_error', (err: any) => {
      // console.error('❌ Erro ao conectar:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Registra callback para qualquer evento (tipo onAny do socket.io)
   */
  onAny(cb: EvolutionAnyHandler) {
    if (!this.socket) return () => {};
    this.socket.onAny((event: EvolutionSocketEvent, ...args: any[]) => {
      const payload = args[0];
      // Filtro global: só repassa eventos da instância e servidor corretos
      if (
        payload?.server_url?.includes(SERVER_URL) &&
        payload?.instance === INSTANCE &&
        (payload?.data?.instanceId ? payload.data.instanceId === INSTANCE_ID : true)
      ) {
        cb(event, payload);
      }
    });
    // Retorna unsubscribe
    return () => {
      if (this.socket) this.socket.offAny(cb as any);
    };
  }

  /**
   * Registra callback para evento específico
   */
  on<T = any>(event: EvolutionSocketEvent, cb: (payload: T) => void) {
    if (!this.socket) return () => {};
    this.socket.on(event, cb);
    // Retorna unsubscribe
    return () => {
      if (this.socket) this.socket.off(event, cb);
    };
  }

  /**
   * Envia dado pelo socket (se backend aceitar)
   */
  emit(event: string, data: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }
}

// Exporta singleton
export const wsClient = new EvolutionWebSocket();
