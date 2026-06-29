import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// AsyncStorage-based storage adapter for Supabase auth session persistence.
// On web, localStorage is used by default; on native, we explicitly wire up
// AsyncStorage so the session survives app restarts.
const storageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value)
    } catch {
      // Silently fail — session persistence is best-effort
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for native, we handle redirects ourselves
  },
})
