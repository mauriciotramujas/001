import React, { useState } from 'react';
import { QuickMessage } from '../types';

const initial: QuickMessage[] = [
  { id: 1, title: 'Saudação',    text: 'Olá! Como posso ajudar?' },
  { id: 2, title: 'Agradecimento', text: 'Muito obrigado pelo contato!' },
  { id: 3, title: 'Despedida',   text: 'Tenha um ótimo dia! Estamos à disposição.' },
  { id: 4, title: 'Retorno',     text: 'Voltarei a entrar em contato em breve com mais informações.' },
];

export function useQuickMessages() {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [list, setList] = useState<QuickMessage[]>(initial);
  const [editing, setEditing]   = React.useState<QuickMessage | null>(null);
  const [open, setOpen]         = useState(false);

  function add() {
    const item: QuickMessage = { id: Date.now(), title: 'Nova', text: '' };
    setList([...list, item]);
    setEditing(item);
  }

  function save(id: number, title: string, text: string) {
    setList(xs =>
      xs.map(m => (m.id === id ? { ...m, title, text } : m)),
    );
    setEditing(null);
  }

  return {
    list,
    editing,
    open,
    setOpen,
    setEditing,
    add,
    save,
    menuRef,
  };
}