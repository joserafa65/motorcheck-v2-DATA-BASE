import { dbClient } from './database';

export const getAppConfigValue = async (key: string): Promise<string | null> => {
  const { data, error } = await dbClient
    .from('app_config')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error('Error fetching app config:', error);
    return null;
  }

  return data?.value ?? null;
};