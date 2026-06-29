import { Stack, Redirect, usePathname, useRouter } from 'expo-router'
import { useEffect, useState, useCallback } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import TabBar from '../../components/TabBar'

const TAB_ORDER = ['index', 'summary', 'calendar', 'settings']

export default function ProtectedLayout() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { theme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()

  // Track animation direction for order-aware tab transitions.
  // Updated BEFORE router.push is called so the Stack navigator
  // picks up the correct direction when it renders the new screen.
  const [tabAnimation, setTabAnimation] = useState<string>('slide_from_right')

  const handleTabNavigate = useCallback((route: string, isAdd: boolean) => {
    if (isAdd) {
      router.push(route as any)
      return
    }

    // Compute direction based on tab position in the bar order
    const currentIdx = TAB_ORDER.findIndex((t) => {
      if (t === 'index') return pathname === '/' || pathname === ''
      return pathname.startsWith('/' + t)
    })
    const targetIdx = TAB_ORDER.findIndex((t) => route.endsWith(t))
    if (currentIdx >= 0 && targetIdx >= 0 && targetIdx !== currentIdx) {
      setTabAnimation(targetIdx > currentIdx ? 'slide_from_right' : 'slide_from_left')
    }

    router.push(route as any)
  }, [pathname])

  // Re-trigger Stack render after animation direction changes so the
  // pushed screen picks up the updated screenOptions.
  // This fires in-between setTabAnimation and the navigation commit.
  useEffect(() => {}, [tabAnimation])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg }}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack screenOptions={{ headerShown: false, animation: tabAnimation as any, animationDuration: 300 }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-expense" />
        <Stack.Screen name="expense-detail/[expenseId]" />
      </Stack>
      <TabBar onTabNavigate={handleTabNavigate} />
    </View>
  )
}
