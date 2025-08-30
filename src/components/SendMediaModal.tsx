import React from 'react';
import { Upload } from 'lucide-react';
import { sendMediaMessage } from '../api/evolution';
import { ChatSummary } from '../types';

interface SendMediaModalProps {
  visible: boolean;
  hide: () => void;
  chat: ChatSummary;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const SendMediaModal: React.FC<SendMediaModalProps> = ({ visible, hide, chat }) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [caption, setCaption] = React.useState('');
  const [sending, setSending] = React.useState(false);

  if (!visible) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    try {
      setSending(true);
      const base64 = await fileToBase64(file);
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'audio'
        : 'document';
      await sendMediaMessage({
        number: chat.phone,
        mediatype: type,
        mimetype: file.type,
        caption,
        media: base64,
        fileName: file.name,
      });
    } catch (err) {
      console.error('Erro ao enviar mídia:', err);
    } finally {
      setSending(false);
      setFile(null);
      setCaption('');
      hide();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-white mb-4">Enviar Mídia</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Legenda</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Arquivo</label>
            <label
              htmlFor="send-media-input"
              className="mt-1 cursor-pointer flex items-center justify-center w-full px-3 py-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
            >
              <div className="text-center pointer-events-none">
                {file ? (
                  <p className="text-sm text-white">{file.name}</p>
                ) : (
                  <>
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-400">Clique ou arraste para selecionar</p>
                  </>
                )}
              </div>
              <input
                id="send-media-input"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                accept="image/*,video/*,audio/*,application/*"
              />
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={hide}
              className="px-4 py-2 bg-[#0f172a] rounded-lg text-gray-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!file || sending}
              className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
