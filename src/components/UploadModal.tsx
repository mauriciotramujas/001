import React from 'react';
import { Upload } from 'lucide-react';
import { useInstances } from '../hooks/useInstances';
import { uploadWorkspaceFile } from '../api/files';

interface UploadModalProps {
  visible: boolean;
  hide: () => void;
  onUploaded: () => void;
  currentFolder: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  visible,
  hide,
  onUploaded,
  currentFolder,
}) => {
  const [form, setForm] = React.useState<{
    name: string;
    description: string;
    file: File | null;
  }>({ name: '', description: '', file: null });

  const { current } = useInstances();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1e293b] rounded-lg p-6 w-96">
        <h3 className="text-lg font-medium text-white mb-4">Adicionar Anexo</h3>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.file || !form.name || !current) return;
            await uploadWorkspaceFile(
              current.WORKSPACE_ID,
              form.file,
              currentFolder
            );
            setForm({ name: '', description: '', file: null });
            onUploaded();
            hide();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm text-gray-400">Nome do arquivo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full mt-1 px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">Arquivo</label>
            <label
              htmlFor="upload-file-input"
              className="mt-1 cursor-pointer flex items-center justify-center w-full px-3 py-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-indigo-400"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setForm((p) => ({ ...p, file: dropped }));
              }}
            >
              <div className="text-center pointer-events-none">
                {form.file ? (
                  <p className="text-sm text-white">{form.file.name}</p>
                ) : (
                  <>
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-400">Clique para selecionar um arquivo</p>
                  </>
                )}
              </div>
              <input
                id="upload-file-input"
                type="file"
                onChange={(e) =>
                  setForm((p) => ({ ...p, file: e.target.files?.[0] || null }))
                }
                className="hidden"
                accept="image/*,.pdf,.doc,.docx"
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
              disabled={!form.file || !form.name}
              className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
            >
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
