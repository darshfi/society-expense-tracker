import { Stack } from 'expo-router'
import { ThemeProvider } from '../lib/ThemeContext'

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(protected)" options={{ animation: 'slide_from_right', animationDuration: 300 }} />
      </Stack>
    </ThemeProvider>
  )
}
