import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useInstances } from '../hooks/useInstances';
import { Sidebar } from './Sidebar';
import { ContactsList } from './contacts/ContactsList';
import { ContactDetails } from './contacts/ContactDetails';
import { ArrowLeft, Users, Plus } from 'lucide-react';

export interface ContactListItem {
  id: string;
  workspace_id: string;
  name: string;
  avatar_url: string | null;
  city: string | null;
  age: number | null;
  status: 'new' | 'open' | 'pending' | 'closed';
  automation_enabled: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  custom_small: Record<string, unknown> | null;
  tag_names: string[] | null;
  created_at: string;
}

export interface ContactFull extends ContactListItem {
  bot_id: string | null;
  assigned_to: string | null;
  last_interaction_at: string | null;
  last_message_text: string | null;
  last_instance_id: string | null;
  merged_into_id: string | null;
  identities: Array<{ instance_id: string; remote_jid: string }>;
  tags: Array<{ id: string; name: string; color: string | null }>;
  custom: Record<string, unknown>;
}

export const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { current } = useInstances();
  
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tagFilter, setTagFilter] = useState<string>('');

  const fetchContacts = useCallback(async () => {
    if (!current?.WORKSPACE_ID) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .schema('crm')
        .from('v_contacts_list')
        .select('*', { count: 'exact' })
        .eq('workspace_id', current.WORKSPACE_ID)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }
      
      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setContacts(data as ContactListItem[]);
      setTotalCount(count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [current?.WORKSPACE_ID, page, searchTerm, statusFilter, tagFilter]);

  const fetchContactDetails = useCallback(async (contactId: string) => {
    if (!current?.WORKSPACE_ID) return;
    
    setDetailsLoading(true);
    
    try {
      const { data, error } = await supabase
        .schema('crm')
        .from('v_contacts_full')
        .select('*')
        .eq('workspace_id', current.WORKSPACE_ID)
        .eq('id', contactId)
        .single();
      
      if (error) throw error;
      
      setSelectedContact(data as ContactFull);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err);
    } finally {
      setDetailsLoading(false);
    }
  }, [current?.WORKSPACE_ID]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleSelectContact = (contact: ContactListItem) => {
    fetchContactDetails(contact.id);
  };

  const handleContactUpdated = () => {
    fetchContacts();
    if (selectedContact) {
      fetchContactDetails(selectedContact.id);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="flex h-screen bg-[#0f172a] text-white">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex">
        {/* Lista de contatos */}
        <div className="w-96 border-r border-[#334155] bg-[#1e293b] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0f172a]/50 text-gray-400 hover:text-white hover:bg-[#0f172a] transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span className="text-sm">Voltar</span>
                </button>
                <div className="flex items-center space-x-2">
                  <Users size={20} className="text-indigo-400" />
                  <h1 className="text-lg font-semibold text-white">Contatos</h1>
                </div>
              </div>
              <button className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-400 to-cyan-400 rounded-lg text-white text-sm hover:from-indigo-500 hover:to-cyan-500 transition-all">
                <Plus size={14} />
                <span>Novo</span>
              </button>
            </div>
            
            <div className="text-sm text-gray-400">
              {totalCount} contatos • Página {page + 1} de {totalPages || 1}
            </div>
          </div>

          <ContactsList
            contacts={contacts}
            selectedContact={selectedContact}
            onSelectContact={handleSelectContact}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            tagFilter={tagFilter}
            onTagFilterChange={setTagFilter}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Detalhes do contato */}
        <div className="flex-1 bg-gradient-to-br from-[#0f172a] to-[#1e293b]">
          {selectedContact ? (
            <ContactDetails
              contact={selectedContact}
              loading={detailsLoading}
              onContactUpdated={handleContactUpdated}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Users size={64} className="mx-auto text-gray-600 mb-4" />
                <h2 className="text-xl font-medium text-gray-400 mb-2">
                  Selecione um contato
                </h2>
                <p className="text-gray-500">
                  Escolha um contato da lista para ver os detalhes
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactsPage;