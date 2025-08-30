import { supabase } from '../supabaseClient';
import { setEvolutionConfig } from './evolution';

export interface UserInstanceInfo {
  INSTANCE_ID: string;
  INSTANCE_KEY: string;
  INSTANCE: string;
  SERVER_URL: string;
  USER_ID: string;
  WORKSPACE_ID: string;
  USER_DATA_LOGIN: any;
}

export async function getUserInstances(): Promise<UserInstanceInfo[]> {
  const { data, error } = await supabase
    .schema('crm')
    .from('v_instance_scoped')
    .select('*');

  if (error || !data || data.length === 0) {
    throw new Error('Nenhuma instância encontrada!');
  }

  return (data as any[]).map((d) => ({
    INSTANCE_ID: d.id,
    INSTANCE_KEY: d.token,
    INSTANCE: d.name,
    SERVER_URL: d.server_url,
    USER_ID: d.member_user_id,
    WORKSPACE_ID: d.workspace_id,
    USER_DATA_LOGIN: d,
  }));
}

export async function getUserInstance(): Promise<UserInstanceInfo> {
  const list = await getUserInstances();
  const first = list[0];
  setEvolutionConfig({
    INSTANCE_ID: first.INSTANCE_ID,
    INSTANCE_KEY: first.INSTANCE_KEY,
    INSTANCE: first.INSTANCE,
    SERVER_URL: first.SERVER_URL,
  });
  return first;
}
