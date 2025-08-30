import React from 'react';

interface ConnectionModalProps {
  visible: boolean;
  hide: () => void;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  connect: () => void;
  disconnect: () => void;
  loadingQr: boolean;
  qrData: { code?: string; pairingCode?: string } | null;
  errorQr: string | null;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  visible,
  hide,
  connectionStatus,
  connect,
  disconnect,
  loadingQr,
  qrData,
  errorQr,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg p-6 w-96 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl"
          onClick={hide}
        >
          ×
        </button>

        {connectionStatus !== 'connected' ? (
          <>
            <h3 className="text-lg font-medium text-white mb-4">Conectar WhatsApp</h3>
            <div className="bg-white p-4 rounded-lg mb-4 flex flex-col items-center justify-center min-h-[220px]">
              {loadingQr ? (
                <p className="text-gray-400">Carregando QR code…</p>
              ) : errorQr ? (
                <p className="text-red-500">{errorQr}</p>
              ) : qrData?.code ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    qrData.code,
                  )}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              ) : (
                <p className="text-gray-400">Nenhum QR code disponível.</p>
              )}

              {qrData?.pairingCode && (
                <span className="mt-2 text-xs text-gray-600">Código: {qrData.pairingCode}</span>
              )}
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Escaneie o QR code com seu WhatsApp
            </p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={hide}
                className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={connect}
                disabled={loadingQr}
                className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
              >
                Gerar QR
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-white mb-4">Desconectar WhatsApp</h3>
            <p className="text-sm text-gray-400 mb-4">Tem certeza que deseja desconectar?</p>

            <div className="flex justify-end space-x-2">
              <button
                onClick={hide}
                className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-500 rounded-lg text-white"
              >
                Desconectar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};