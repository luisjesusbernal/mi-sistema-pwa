import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const configured = Boolean(
  url && key && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url) &&
  !url.includes('TU_PROYECTO') && !key.includes('TU_PUBLISHABLE_KEY'),
);

// En web Supabase usa localStorage del navegador; en Android/iOS AsyncStorage.
// Una clave publishable (o anon heredada) se puede usar en el cliente.
// NUNCA colocar la service_role/secret key en una app.
export const supabase: SupabaseClient | null = configured
  ? createClient(url!, key!, {
      auth: {
        ...(Platform.OS === 'web' ? {} : { storage: AsyncStorage }),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
