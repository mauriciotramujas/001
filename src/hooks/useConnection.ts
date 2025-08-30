import { useState, useRef, useEffect } from 'react';
import {
  fetchConnectionState,
  fetchQrCode,
  logoutInstance,
} from '../api/evolution';
import { ConnectionStatus } from '../types';

export function useConnection(
  options?: {
    onConnected?: () => void;
    onTimeout?: () => void;
    onDisconnected?: () => void;
    pollingEnabled?: boolean;
    pollingActive?: boolean;
  }
) {
  const [connectionStatus, setStatus] = useState<ConnectionStatus>('disconnected');
  const [qrData, setQrData] = useState<{ code: string; pairingCode?: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [errorQr, setErrorQr] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Polling state
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detecta estado atual ao montar
  useEffect(() => {
    (async () => {
      try {
        const state = await fetchConnectionState();
        if (state === 'open') setStatus('connected');
      } catch {
        setStatus('disconnected');
      }
    })();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Expor função para abrir modal e já conectar se necessário
  function openConnectionModal() {
    setShowModal(true);
    if (connectionStatus !== 'connected') {
      connect();
    }
  }

  // Polling para detectar conexão após gerar QR
  const startPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    let elapsed = 0;
    pollingRef.current = setInterval(async () => {
      elapsed += 3000;
      try {
        const state = await fetchConnectionState();
        if (state === 'open') {
          setStatus('connected');
          setQrData(null);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          options?.onConnected?.();
        }
      } catch {
        // Ignora erros de polling
      }
    }, 3000);
    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      options?.onTimeout?.();
    }, 60000);
  };

  // Ações
  async function connect() {
    setStatus('connecting');
    setErrorQr(null);
    setLoadingQr(true);
    try {
      const state = await fetchConnectionState();
      if (state === 'open') {
        setStatus('connected');
        setQrData(null);
        options?.onConnected?.();
        return;
      }
      const qr = await fetchQrCode();
      setQrData(qr);
      setStatus('disconnected');
      // Iniciar polling se ativado
      if (options?.pollingEnabled !== false) {
        startPolling();
      }
    } catch (err: any) {
      setErrorQr(err.message || 'Erro ao conectar');
      setStatus('disconnected');
    } finally {
      setLoadingQr(false);
    }
  }

  async function disconnect() {
    // Feche o modal imediatamente antes de alterar status para evitar flashes
    setShowModal(false);
    setStatus('connecting');
    try {
      await logoutInstance();
      setStatus('disconnected');
      setQrData(null);
      options?.onDisconnected?.();
    } catch {
      setStatus('connected');
      setErrorQr('Erro ao desconectar');
    }
  }

  // Limpa polling ao desmontar ou ao conectar
  useEffect(() => {
    if (connectionStatus === 'connected') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  return {
    connectionStatus,
    qrData,
    loadingQr,
    errorQr,
    connect,
    disconnect,
    setQrData,
    showConnectionModal: showModal,
    setShowConnectionModal: setShowModal,
    openConnectionModal,
  };
}