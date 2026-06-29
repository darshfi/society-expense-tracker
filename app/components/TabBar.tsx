import { View, Text, Pressable, StyleSheet, Platform } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useTheme } from '../lib/ThemeContext'

interface TabItem {
  key: string
  label: string
  icon: string
  route: string
  isAdd?: boolean
}

const TABS: TabItem[] = [
  { key: 'index', label: 'Expenses', icon: '📋', route: '/(protected)' },
  { key: 'summary', label: 'Summary', icon: '📊', route: '/(protected)/summary' },
  { key: 'add', label: 'Add', icon: '+', route: '/(protected)/add-expense', isAdd: true },
  { key: 'calendar', label: 'Calendar', icon: '📅', route: '/(protected)/calendar' },
  { key: 'settings', label: 'Settings', icon: '⚙️', route: '/(protected)/settings' },
]

export default function TabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()

  // Auto-hide on screens that shouldn't show the tab bar
  if (
    pathname.startsWith('/add-expense') ||
    pathname.startsWith('/expense-detail/')
  ) {
    return null
  }

  const isActive = (tab: TabItem) => {
    if (tab.key === 'index') {
      return pathname === '/'
    }
    if (tab.isAdd) return false
    const suffix = tab.route.replace('/(protected)', '')
    return suffix ? pathname.includes(suffix) : false
  }

  const handlePress = (tab: TabItem) => {
    // Guard: don't re-navigate if already on this tab (avoid accidental refresh)
    if (!tab.isAdd && isActive(tab)) return
    router.push(tab.route as any)
  }

  return (
    <View testID="TabBarContainer" style={[styles.container, { backgroundColor: theme.surfaceSecondary, borderTopColor: theme.border }]}>
      {TABS.map((tab) => {
        const active = isActive(tab)
        if (tab.isAdd) {
          return (
            <Pressable
              key={tab.key}
              style={[styles.addButton, { backgroundColor: theme.accent }]}
              onPress={() => handlePress(tab)}
            >
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          )
        }
        return (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handlePress(tab)}
          >
            <Text style={[styles.tabIcon, active && { opacity: 1 }]}>
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: active ? theme.accent : theme.textMuted,
                  fontWeight: active ? '600' : '400',
                },
              ]}
            >
              {tab.label}
            </Text>
            {active && <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />}
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 8 : 20,
    borderTopWidth: 1,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingHorizontal: 8,
    position: 'relative',
    flex: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 11,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 30,
    marginTop: -2,
  },
})
