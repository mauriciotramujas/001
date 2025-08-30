import React, { RefObject } from 'react';
import {
  Smile,
  Paperclip,
  Image as ImageIcon,
  Send,
  Mic,
  Plus,
  Edit,
  X,
} from 'lucide-react';
import SimpleBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { MessageDbView } from '../types';
import { sendAudioMessage } from '../api/evolution';

// Imagem com carregamento usando thumbnail
const ImageWithThumb: React.FC<{ src?: string | null; thumb?: string | null; alt?: string }> = ({ src, thumb, alt }) => {
  const [loadedSrc, setLoadedSrc] = React.useState(thumb ? `data:image/jpeg;base64,${thumb}` : src || undefined);

  React.useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setLoadedSrc(src);
  }, [src]);

  if (!loadedSrc) return null;
  return <img src={loadedSrc} alt={alt ?? 'media'} className="max-w-full rounded" />;
};

interface ChatAreaProps {
  searchTerm?: string;
  showNotes: boolean;
  notes: string;
  setNotes: (v: string) => void;

  /* messages */
  messagesToRender: MessageDbView[];
  chatRef: RefObject<HTMLElement>;
  loadingMessages: boolean;
  errorMessages: string | null;
  loadingMore: boolean;
  hasMore: boolean;
  getMessageStatusIcon: (status: string | null) => React.ReactNode;

  /* input */
  newMessage: string;
  setNewMessage: (v: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  textareaRef: RefObject<HTMLTextAreaElement>;

  /* quick‑messages */
  quick: ReturnType<typeof import('../hooks/useQuickMessages')['useQuickMessages']>;

  onPaperclipClick: () => void;

  /** número do contato selecionado para envio de áudio */
  contactPhone: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  showNotes,
  notes,
  setNotes,
  messagesToRender,
  chatRef,
  loadingMessages,
  errorMessages,
  loadingMore,
  // hasMore, // removido pois não está sendo usado

  getMessageStatusIcon,
  newMessage,
  setNewMessage,
  handleSendMessage,
  textareaRef,
  quick,
  onPaperclipClick,
  contactPhone,
}) => {
  // --- Filtro e navegação rápidas ---
  const [quickFilter, setQuickFilter] = React.useState('');
  const [selectedQuickIdx, setSelectedQuickIdx] = React.useState(0);

  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingError, setRecordingError] = React.useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const shouldSendRef = React.useRef(true);

  function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1]);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function startRecording() {
    if (isRecording) return;
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const possibleTypes = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const mimeType = possibleTypes.find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType) {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingError('Gravação não suportada neste navegador.');
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      shouldSendRef.current = true;
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type });
        stream.getTracks().forEach((t) => t.stop());
        if (shouldSendRef.current) {
          try {
            const base64 = await blobToBase64(blob);
            await sendAudioMessage({ number: contactPhone, audio: base64 });
          } catch (err) {
            console.error('Erro ao enviar áudio:', err);
          }
        }
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
      setRecordingError('Não foi possível iniciar a gravação.');
    }
  }

  function stopRecording(send: boolean) {
    if (!isRecording) return;
    shouldSendRef.current = send;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function cancelRecording() {
    stopRecording(false);
  }
  
  // Atualiza filtro conforme digitação após /
  React.useEffect(() => {
    const match = newMessage.match(/\/(\w*)$/);
    if (quick.open && match) {
      setQuickFilter(match[1] || '');
      setSelectedQuickIdx(0);
    } else {
      setQuickFilter('');
    }
  }, [newMessage, quick.open]);
  
  // Lista filtrada
  const filteredQuickList = React.useMemo(() => {
    if (!quickFilter) return quick.list;
    const f = quickFilter.toLowerCase();
    return quick.list.filter(q =>
      q.title.toLowerCase().includes(f) ||
      q.text.toLowerCase().includes(f)
    );
  }, [quick.list, quickFilter]);

  // Fecha menu rápidas ao clicar fora
  React.useEffect(() => {
    if (!quick.open) return;
    function handleClick(e: MouseEvent) {
      const menu = quick.menuRef?.current;
      const textarea = textareaRef?.current;
      if (
        menu &&
        !menu.contains(e.target as Node) &&
        textarea &&
        !textarea.contains(e.target as Node)
      ) {
        quick.setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [quick.open, quick.menuRef, textareaRef]);

  return (
  <div className="flex flex-col h-full min-h-0 min-w-0">
    {/* --------- Mensagens ou Notas --------- */}
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0">
        {showNotes ? (
            <div className="h-full flex-1 min-h-0 p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione suas anotações..."
                className="w-full h-full bg-[#1e293b]/30 rounded-lg p-4 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                style={{ minHeight: 0, maxHeight: 'none' }}
              />
            </div>
          ) : (
            <SimpleBar className="h-full p-6" style={{ maxHeight: '100%', minHeight: 0 }} autoHide={true} scrollableNodeProps={{ ref: chatRef }}>
            <div className="space-y-4 h-full">
              {loadingMessages && messagesToRender.length === 0 && (
                <p className="text-gray-400 text-xs">Carregando mensagens…</p>
              )}
              {errorMessages && <p className="text-red-400 text-xs">{errorMessages}</p>}
              {recordingError && <p className="text-red-400 text-xs">{recordingError}</p>}
              {loadingMore && <p className="text-gray-400 text-xs">Carregando mais…</p>}

              {messagesToRender.map((msg: MessageDbView) => (
                <div key={msg.id} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[70%] break-words text-sm shadow ${
                      msg.sent
                        ? 'bg-gradient-to-br from-indigo-500 to-cyan-500 text-white'
                        : 'bg-[#334155] text-gray-100'
                    }`}
                  >
                    {(() => {
                      const isSticker =
                        msg.message_type?.includes('sticker') ||
                        msg.message_type?.includes('stickerMessage');
                      return msg.media_url || msg.thumb_base64 || isSticker ? (
                        <div className="space-y-2">
                          {msg.message_type?.includes('image') && (
                            <ImageWithThumb src={msg.media_url} thumb={msg.thumb_base64 ?? undefined} alt="media" />
                          )}
                          {msg.message_type?.includes('video') && (
                            <video
                              controls
                              src={msg.media_url ?? undefined}
                              poster={msg.thumb_base64 ? `data:image/jpeg;base64,${msg.thumb_base64}` : undefined}
                              className="max-w-full rounded"
                            />
                          )}
                          {msg.message_type?.includes('audio') && (
                            <audio controls src={msg.media_url} className="w-full" />
                          )}
                          {isSticker && (
                            msg.media_url ? (
                              <ImageWithThumb src={msg.media_url} alt="sticker" />
                            ) : (
                              <span>Sticker</span>
                            )
                          )}
                          {!msg.message_type?.includes('image') &&
                            !msg.message_type?.includes('video') &&
                            !msg.message_type?.includes('audio') &&
                            !isSticker && (
                              <>
                                {msg.thumb_base64 && (
                                  <ImageWithThumb thumb={msg.thumb_base64} src={undefined} alt="document preview" />
                                )}
                                <a
                                  href={msg.media_url ?? undefined}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline text-sky-300 break-all"
                                >
                                  Arquivo
                                </a>
                              </>
                            )}
                          {msg.legenda && <div>{msg.legenda}</div>}
                          {msg.speechToText && (
                            <div className="text-xs text-gray-300">
                              {msg.speechToText}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {msg.text && <>{msg.text}</>}
                          {msg.speechToText && (
                            <div className="text-xs text-gray-300">
                              {msg.speechToText}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex items-center justify-end gap-1 mt-1 text-xs">
                      {msg.timestamp && (
                        <span className="text-gray-400">
                          {msg.timestamp.toLocaleString()}
                        </span>
                      )}
                      {getMessageStatusIcon(msg.message_status)}
                    </div>
                  </div>
                </div>
              ))}

              {/* {!hasMore && messagesToRender.length > 0 && (
                <p className="text-center text-xs text-gray-500">Início do histórico</p>
              )} */}
            </div>
            </SimpleBar>
          )}

      </div>

      {/* --------- Input --------- */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 bg-[#1e293b]/50 flex items-center space-x-2 mt-0"
        style={{ marginTop: 0 }}
      >
        <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
          <Smile size={16} />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
          onClick={onPaperclipClick}
        >
          <Paperclip size={16} />
        </button>
        <button type="button" className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white">
          <ImageIcon size={16} />
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              // Fecha menu se não houver '/'
              if (!e.target.value.includes('/')) {
                quick.setOpen(false);
              }
            }}
            onKeyDown={(e) => {
              // Navegação rápidas
              if (quick.open && filteredQuickList.length > 0) {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedQuickIdx(i => Math.min(i + 1, filteredQuickList.length - 1));
                  return;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedQuickIdx(i => Math.max(i - 1, 0));
                  return;
                }
                if (e.key === 'Enter') {
                  if (selectedQuickIdx >= 0 && selectedQuickIdx < filteredQuickList.length) {
                    e.preventDefault();
                    setNewMessage(filteredQuickList[selectedQuickIdx].text);
                    quick.setOpen(false);
                    return;
                  }
                }
              }
              // Permite digitar / normalmente e só abre o menu
              if (e.key === '/') {
                quick.setOpen(true);
                return;
              }
              // Envia mensagem com Enter (sem Shift)
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  return;
                } else {
                  e.preventDefault();
                  handleSendMessage(e);
                  quick.setOpen(false);
                }
              }
              // Fecha menu com ESC
              if (e.key === 'Escape') {
                quick.setOpen(false);
              }
            }}
            placeholder='Digite sua mensagem… ("/" para rápidas)'
            className="w-full px-4 py-2 bg-[#0f172a]/50 rounded-lg text-sm text-white placeholder-gray-500 resize-none min-h-[40px] max-h-[160px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />

          {quick.open && (
            <div
              className="absolute bottom-full left-0 mb-2 w-96 bg-[#1e293b] rounded-lg shadow-lg shadow-indigo-500/20 p-2 space-y-1 z-50"
              ref={quick.menuRef}
            >
              {filteredQuickList.map((m, idx) => (
                <div key={m.id}>
                  {quick.editing?.id === m.id ? (
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        value={quick.editing ? quick.editing.title : ''}
                        onChange={(e) => quick.editing && quick.setEditing({ ...quick.editing, title: e.target.value, id: quick.editing.id, text: quick.editing.text })}
                        className="w-full px-2 py-1 bg-[#0f172a] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        placeholder="Título"
                      />
                      <textarea
                        value={quick.editing ? quick.editing.text : ''}
                        onChange={(e) => quick.editing && quick.setEditing({ ...quick.editing, text: e.target.value, id: quick.editing.id, title: quick.editing.title })}
                        className="w-full px-2 py-1 bg-[#0f172a] rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                        placeholder="Mensagem"
                      />
                      <button
                        onClick={() => {
                          if (!quick.editing) return;
                          quick.save(quick.editing.id, quick.editing.title, quick.editing.text);
                        }}
                        className="w-full px-2 py-1 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded text-sm text-white"
                      >
                        Salvar
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`p-2 hover:bg-[#0f172a] rounded-lg flex items-center justify-between group cursor-pointer ${selectedQuickIdx === idx ? 'bg-sky-900/60' : ''}`}
                      onClick={() => {
                        setNewMessage(m.text);
                        quick.setOpen(false);
                      }}
                    >
                      <div>
                        <h4 className="text-sm font-medium text-white">{m.title}</h4>
                        <p className="text-xs text-gray-400 truncate">{m.text}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          quick.setEditing(m);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded bg-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300"
                      >
                        <Edit size={12} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={quick.add}
                className="w-full p-2 hover:bg-[#0f172a] rounded-lg flex items-center justify-center space-x-2 text-gray-400 hover:text-white transition-all duration-300"
              >
                <Plus size={14} />
                <span className="text-sm">Adicionar mensagem rápida</span>
              </button>
            </div>
          )}
        </div>

        {newMessage ? (
          <button type="submit" className="w-8 h-8 rounded-lg bg-gradient-to-r from-indigo-400 to-cyan-400 flex items-center justify-center">
            <Send size={16} className="text-white" />
          </button>
        ) : (
          isRecording ? (
            <>
              <button
                type="button"
                onClick={cancelRecording}
                className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white"
              >
                <Mic size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="w-8 h-8 rounded-lg bg-[#0f172a]/50 flex items-center justify-center text-gray-400 hover:text-white"
            >
              <Mic size={16} />
            </button>
          )
        )}
      </form>
    </div>
  </div>
  );
}