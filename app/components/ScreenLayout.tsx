import { View, StyleSheet } from 'react-native'
import { useTheme } from '../lib/ThemeContext'
import TabBar from './TabBar'

interface ScreenLayoutProps {
  children: React.ReactNode
  /** Set to true on screens that should NOT show the tab bar (add-expense, expense-detail) */
  hideTabBar?: boolean
}

export default function ScreenLayout({ children, hideTabBar }: ScreenLayoutProps) {
  const { theme } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>{children}</View>
      {!hideTabBar && <TabBar />}
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
