import { View, StyleSheet, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../lib/ThemeContext'

interface ScreenLayoutProps {
  children: React.ReactNode
}

export default function ScreenLayout({ children }: ScreenLayoutProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          // Push header content below status bar / notch on native devices.
          // On web the status bar emulation is handled differently, so we
          // clamp the padding so content doesn't get pushed too far down
          // when safe-area-inset-top is unusually large (e.g. dev tools).
          paddingTop: Platform.OS === 'web' ? Math.min(insets.top, 48) : insets.top,
        },
      ]}
    >
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
