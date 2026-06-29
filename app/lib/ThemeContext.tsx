import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useColorScheme, ColorSchemeName } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { lightTheme, darkTheme, Theme } from './theme'

type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  resolvedScheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
  resolvedScheme: 'light',
})

const THEME_MODE_KEY = '@society-tracker/theme-mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme() ?? 'light'
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored)
      }
    })
  }, [])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode)
    AsyncStorage.setItem(THEME_MODE_KEY, mode)
  }, [])

  const resolvedScheme: 'light' | 'dark' =
    themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light')
    : themeMode === 'dark' ? 'dark' : 'light'

  const isDark = resolvedScheme === 'dark'
  const theme = isDark ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, setThemeMode, resolvedScheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
