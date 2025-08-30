import React from 'react';
import { defaultAvatar } from '../utils';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import {
  Info,
  FileBox,
  Edit,
  Plus,
  File as FilePdf,
  FileImage,
  FileText,
} from 'lucide-react';
import { Attachment, ChatSummary, CustomFieldValue } from '../types';
import {
  fetchContactCustomFields,
  saveContactFields,
  sortCustomFieldValues,
} from '../api/crm';
import { useInstances } from '../hooks/useInstances';
import { listWorkspaceFiles, downloadWorkspaceFile } from '../api/files';
import { UploadModal } from './UploadModal';

interface CrmPanelProps {
  showCrmPanel: boolean;
  showAttachments: boolean;
  setShowAttachments: (v: boolean) => void;

  selectedChat: ChatSummary;
  setSelectedChat: (c: ChatSummary) => void;

  editingContact: boolean;
  setEditingContact: (v: boolean) => void;
}

function truncateField(value: string, max: number = 24): string {
  if (!value) return '';
  return value.length > max ? value.slice(0, max) + '...' : value;
}

function formatPhone(phone: string): string {
  if (phone.includes('@')) {
    return phone.split('@')[0];
  }
  return phone.length > 18 ? phone.slice(0, 18) + '...' : phone;
}

const CONTACT_FIELD_KEYS = [
  'name',
  'avatar_url',
  'city',
  'age',
  'status',
  'automation_enabled',
  'notas',
];

export const CrmPanel: React.FC<CrmPanelProps> = ({
  showCrmPanel,
  showAttachments,
  setShowAttachments,
  selectedChat,
  setSelectedChat,
  editingContact,
  setEditingContact,
}) => {
  const [customFields, setCustomFields] = React.useState<CustomFieldValue[]>([]);
  const [editedFields, setEditedFields] = React.useState<CustomFieldValue[]>([]);
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [uploadVisible, setUploadVisible] = React.useState(false);
  const [currentFolder, setCurrentFolder] = React.useState<string>('general');
  const { current } = useInstances();

  React.useEffect(() => {
    fetchContactCustomFields(selectedChat.phone, current?.WORKSPACE_ID).then(
      res => {
        setCustomFields(res.fields);
        if (res.crmContactId) {
          setSelectedChat(prev => ({ ...prev, crmContactId: res.crmContactId }));
        }
      }
    );
  }, [selectedChat.phone, setSelectedChat, current?.WORKSPACE_ID]);

  React.useEffect(() => {
    setEditedFields(customFields);
  }, [customFields]);

  React.useEffect(() => {
    if (
      currentFolder !== 'general' &&
      !currentFolder.startsWith('evolution-api/') &&
      selectedChat.crmContactId
    ) {
      setCurrentFolder(selectedChat.crmContactId);
    }
  }, [selectedChat.crmContactId, currentFolder]);

  const loadAttachments = React.useCallback(async () => {
    if (!current) return;
    try {
      let workspaceId = current.WORKSPACE_ID;
      let folder = currentFolder;
      if (currentFolder.startsWith('evolution-api/')) {
        workspaceId = 'evolution-api';
        folder = currentFolder.replace('evolution-api/', '');
      }
      const files = await listWorkspaceFiles(workspaceId, folder);
      const mapped = files.map((f, idx) => {
        const ext = f.fileName.split('.').pop()?.toLowerCase();
        const type =
          ext === 'pdf'
            ? 'pdf'
            : ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext || '')
            ? 'image'
            : 'document';
        return {
          id: idx,
          name: f.fileName,
          type,
        };
      });
      setAttachments(mapped);
    } catch (err) {
      console.error(err);
    }
  }, [current, currentFolder]);

  React.useEffect(() => {
    if (showAttachments) {
      loadAttachments();
    }
  }, [showAttachments, current?.WORKSPACE_ID, currentFolder, loadAttachments]);

  const getAttachmentIcon = (type: string) =>
    type === 'pdf' ? (
      <FilePdf size={16} />
    ) : type === 'image' ? (
      <FileImage size={16} />
    ) : (
      <FileText size={16} />
    );

  const handleOpenAttachment = async (att: Attachment) => {
    if (!current) return;
    try {
      let workspaceId = current.WORKSPACE_ID;
      let folder = currentFolder;
      if (currentFolder.startsWith('evolution-api/')) {
        workspaceId = 'evolution-api';
        folder = currentFolder.replace('evolution-api/', '');
      }
      const url = await downloadWorkspaceFile(workspaceId, att.name, folder);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
    }
  };

  if (!showCrmPanel) return null;

  return (
    <>
      <div className="w-80 min-w-80 max-w-80 bg-[#1e293b] border-l border-[#334155] h-full flex flex-col overflow-x-clip">
        <div className="p-4 flex-1 overflow-hidden flex flex-col ">
          {/* ---------------- botões ---------------- */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setShowAttachments(false)}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center ${
                !showAttachments
                  ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                  : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
              }`}
            >
              <Info size={14} className="mr-2" /> Informações
            </button>
            <button
              onClick={() => setShowAttachments(true)}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center ${
                showAttachments
                  ? 'bg-gradient-to-r from-indigo-400 to-cyan-400 text-white'
                  : 'bg-[#0f172a]/50 text-gray-400 hover:text-white'
              }`}
            >
              <FileBox size={14} className="mr-2" /> Anexos
            </button>
          </div>

          {/* --------------- avatar --------------- */}
          <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-[#0f172a]">
            <img
              src={selectedChat.avatar}
              alt={selectedChat.name}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = defaultAvatar(selectedChat.name);
              }}
              className="w-full h-full object-cover"
            />
          </div>

          {/* --------------- info ou anexos --------------- */}
          <SimpleBar className="flex-1" style={{ maxHeight: '100%', minHeight: 0 }} autoHide={true}>
            {!showAttachments ? (
              /* ------------ INFO ------------ */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2
                    className="text-lg font-medium text-white truncate break-words max-w-[160px]"
                    title={selectedChat.name}
                  >
                    {truncateField(selectedChat.name)}
                  </h2>
                  <button
                    onClick={() => setEditingContact(!editingContact)}
                    className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
                  >
                    <Edit size={14} />
                  </button>
                </div>

                <p
                  className="text-sm text-white truncate break-words max-w-[160px]"
                  title={selectedChat.phone}
                >
                  {truncateField(formatPhone(selectedChat.phone))}
                </p>

                {/* -------- grid de campos -------- */}
                <div className="grid grid-cols-2 gap-4">
                  {editingContact ? (
                    <>
                      {editedFields
                        .filter(cf => !['name', 'phone', 'avatar_url'].includes(cf.key))
                        .map(cf => (
                          <div key={cf.fieldId || cf.key} className="space-y-2">

                            <label className="text-xs text-gray-400">{cf.label}</label>
                            <input
                              type={cf.type === 'number' ? 'number' : cf.type === 'boolean' ? 'checkbox' : 'text'}
                              value={cf.type === 'boolean' ? undefined : (cf.value ?? '')}
                              checked={cf.type === 'boolean' ? Boolean(cf.value) : undefined}
                              onChange={e => {
                                const value =
                                  cf.type === 'number'
                                    ? Number(e.target.value)
                                    : cf.type === 'boolean'
                                    ? e.target.checked
                                    : e.target.value;
                                setEditedFields(prev =>
                                  prev.map(p =>
                                    (p.fieldId && cf.fieldId
                                      ? p.fieldId === cf.fieldId
                                      : p.key === cf.key)
                                      ? { ...p, value }
                                      : p

                                  )
                                );
                              }}
                              className="w-full px-3 py-2 bg-[#0f172a] rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      <div className="col-span-2">
                        <button
                          onClick={async () => {
                            if (selectedChat.crmContactId) {
                              const updated = await saveContactFields(
                                selectedChat.crmContactId,
                                editedFields,
                                current?.WORKSPACE_ID
                              );
                              const base = updated.filter(cf =>
                                CONTACT_FIELD_KEYS.includes(cf.key)
                              );
                              const sortedCustom = sortCustomFieldValues(
                                updated.filter(
                                  cf => !CONTACT_FIELD_KEYS.includes(cf.key)
                                )
                              );
                              const ordered = [...base, ...sortedCustom];
                              setCustomFields(ordered);
                              setEditedFields(ordered);
                            }
                            setEditingContact(false);
                          }}
                          className="w-full px-4 py-2 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white"
                        >
                          Salvar alterações
                        </button>
                      </div>
                    </>
                  ) : (
                    customFields
                      .filter(cf => !['name', 'phone', 'avatar_url'].includes(cf.key))
                      .map(cf => {
                        const val =
                          cf.value === null || cf.value === undefined
                            ? ''
                            : typeof cf.value === 'object'
                            ? JSON.stringify(cf.value)
                            : String(cf.value);
                        return (
                          <div key={cf.fieldId || cf.key}>
                            <label className="text-xs text-gray-400">{cf.label}</label>
                            <p
                              className="text-sm text-white truncate break-words max-w-[140px]"
                              title={val}
                            >
                              {truncateField(val)}
                            </p>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ) : (
              /* ------------ ANEXOS ------------ */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Anexos</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={currentFolder}
                      onChange={(e) => setCurrentFolder(e.target.value)}
                      className="bg-[#0f172a]/50 text-gray-400 hover:text-white rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="general">Workspace</option>
                      {selectedChat.crmContactId && (
                        <option value={selectedChat.crmContactId}>Contato</option>
                      )}
                      {current && selectedChat.phone && (
                        <option value={`evolution-api/${current.INSTANCE_ID}/${selectedChat.phone}`}>
                          Conversa
                        </option>
                      )}

                    </select>
                    {!currentFolder.startsWith('evolution-api/') && (
                      <button
                        onClick={() => setUploadVisible(true)}
                        className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#0f172a]"
                      onClick={() => handleOpenAttachment(att)}
                    >
                      <div className="flex items-center space-x-3">
                        {getAttachmentIcon(att.type)}
                        <span className="text-sm text-white truncate break-words max-w-[120px]" title={att.name}>{truncateField(att.name)}</span>
                      </div>
                    </div>
                  ))}

                  {attachments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">Nenhum anexo disponível</p>
                  )}
                </div>
              </div>
            )}
          </SimpleBar>
        </div>
      </div>
      <UploadModal
        visible={uploadVisible}
        hide={() => setUploadVisible(false)}
        onUploaded={loadAttachments}
        currentFolder={currentFolder}
      />
    </>
  );
};
