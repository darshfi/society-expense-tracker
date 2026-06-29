import { Stack, Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import TabBar from '../../components/TabBar'

export default function ProtectedLayout() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { theme } = useTheme()

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
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 300 }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="add-expense" />
        <Stack.Screen name="expense-detail/[expenseId]" />
      </Stack>
      <TabBar />
    </View>
  )
}
