import { View, StyleSheet } from 'react-native'
import { useTheme } from '../lib/ThemeContext'

interface ScreenLayoutProps {
  children: React.ReactNode
}

export default function ScreenLayout({ children }: ScreenLayoutProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
