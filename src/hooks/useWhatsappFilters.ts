import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { INSTANCE_ID } from '../api/evolution';

export interface WhatsappFilter {
  id: string;
  labelId: string;
  name: string;
  color: string;
}

export function useWhatsappFilters() {
  const [filters, setFilters] = useState<WhatsappFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    supabase
      .schema('crm')
      .from('v_labels_scoped')
      .select('id,labelId,name,color')
      .eq('instanceId', INSTANCE_ID)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setFilters(data as WhatsappFilter[]);
        setLoading(false);
      });
  }, []);

  return { filters, loading, error };
}
