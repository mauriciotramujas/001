import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../supabaseClient';
import { useInstances } from '../hooks/useInstances';
import { TagConfigModal } from './TagConfigPage';
import { Sidebar } from './Sidebar';

interface Tag {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: string;
  priority: number;
}

export const TagListPage: React.FC = () => {
  const { current } = useInstances();
  const navigate = useNavigate();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  const fetchTags = useCallback(async () => {
    if (!current?.WORKSPACE_ID) return;
    setLoading(true);
    const { data, error } = await supabase
      .schema('crm')
      .from('label_configs')
      .select('id,name,color,icon,type,priority')
      .eq('workspace_id', current.WORKSPACE_ID);
    if (!error && data) {
      setTags(data as Tag[]);
    }
    setLoading(false);
  }, [current?.WORKSPACE_ID]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreate = () => {
    setEditingTag(null);
    setModalOpen(true);
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setModalOpen(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!current?.WORKSPACE_ID) return;
    await supabase
      .schema('crm')
      .from('label_configs')
      .delete()
      .eq('id', tag.id)
      .eq('workspace_id', current.WORKSPACE_ID);
    fetchTags();
  };

  const handleSaved = async () => {
    await fetchTags();
    setModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded bg-[#1e293b] border border-[#334155] hover:bg-[#334155]"
            >
              Voltar
            </button>

            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-500"
            >
              Criar Tag
            </button>
          </div>

          {loading ? (
            <div className="bg-[#1e293b] rounded-lg p-6 text-center">Carregando...</div>
          ) : (
            <table className="w-full text-sm bg-[#1e293b] rounded-lg overflow-hidden">
              <thead className="bg-[#334155]">
                <tr className="text-left">
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Prioridade</th>
                  <th className="p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tags.map(tag => (
                  <tr
                    key={tag.id}
                    className="border-b border-[#334155] last:border-0 hover:bg-[#334155]/50"
                  >
                    <td className="p-3 flex items-center gap-2">
                      {tag.color && (
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                      {tag.name}
                    </td>
                    <td className="p-3">{tag.type}</td>
                    <td className="p-3">{tag.priority}</td>
                    <td className="p-3 space-x-2">
                      <button
                        onClick={() => handleEdit(tag)}
                        className="text-emerald-400 hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="text-red-400 hover:underline"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <TagConfigModal
        open={modalOpen}
        initialTag={editingTag}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
};

export default TagListPage;
