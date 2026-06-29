import { useState, useEffect } from 'react'
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useTheme } from '../../lib/ThemeContext'
import ScreenLayout from '../../components/ScreenLayout'

export default function SettingsScreen() {
  const router = useRouter()
  const { theme, themeMode, setThemeMode, resolvedScheme } = useTheme()
  const [username, setUsername] = useState('')
  const [displayUsername, setDisplayUsername] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Use display_name from user_metadata, fall back to extracting from email
      const name = user.user_metadata?.display_name || (user.email ? user.email.split('@')[0] : '')
      setDisplayUsername(name)
      setUsername(name)
    }
  }

  const handleChangeDisplayName = async () => {
    const trimmed = username.trim()
    if (!trimmed) {
      Alert.alert('Missing name', 'Please enter a display name.')
      return
    }
    if (trimmed === displayUsername) return

    setSavingUsername(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: trimmed },
      })
      if (error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert('Display name updated', 'Your display name has been changed. Your login username stays the same — use your original username to sign in.')
        setDisplayUsername(trimmed)
      }
    } catch (err) {
      Alert.alert('Error', 'Could not update display name.')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Missing password', 'Enter your current password.')
      return
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Weak password', 'New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.')
      return
    }

    setSavingPassword(true)
    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) {
        Alert.alert('Error', 'Could not verify your identity.')
        return
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        Alert.alert('Wrong password', 'Current password is incorrect.')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        Alert.alert('Error', updateError.message)
      } else {
        Alert.alert('Password changed', 'Your password has been updated successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      Alert.alert('Error', 'Could not change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/login')
        },
      },
    ])
  }

  const handleResetToCurrentMonth = () => {
    // Navigate to the main expenses tab — already the default home
    router.push('/(protected)' as any)
  }

  return (
    <ScreenLayout>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
        {/* Page title */}
        <View style={[styles.pageTitleBar, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Settings</Text>
        </View>

        {/* Account section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Username */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Display name</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }, savingUsername && { opacity: 0.6 }]}
            onPress={handleChangeDisplayName}
            disabled={savingUsername}
          >
            {savingUsername ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update display name</Text>
            )}
          </Pressable>

          <View style={[styles.divider, { borderBottomColor: theme.borderLight }]} />

          {/* Change password */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Current password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="Enter current password"
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={[styles.eyeButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              hitSlop={8}
            >
              <Text style={[styles.eyeIcon, { color: theme.textMuted }]}>
                {showCurrentPassword ? '👁' : '👁‍🗨'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>New password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="At least 6 characters"
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={[styles.eyeButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
              onPress={() => setShowNewPassword(!showNewPassword)}
              hitSlop={8}
            >
              <Text style={[styles.eyeIcon, { color: theme.textMuted }]}>
                {showNewPassword ? '👁' : '👁‍🗨'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm new password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholder="Re-enter new password"
              placeholderTextColor={theme.textMuted}
            />
            <Pressable
              style={[styles.eyeButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              hitSlop={8}
            >
              <Text style={[styles.eyeIcon, { color: theme.textMuted }]}>
                {showConfirmPassword ? '👁' : '👁‍🗨'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: theme.accent }, savingPassword && { opacity: 0.6 }]}
            onPress={handleChangePassword}
            disabled={savingPassword}
          >
            {savingPassword ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Change password</Text>
            )}
          </Pressable>
        </View>

        {/* Appearance section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Theme</Text>
          <View style={styles.themeOptions}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === mode ? theme.accent : theme.bg,
                    borderColor: themeMode === mode ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => setThemeMode(mode)}
              >
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === mode ? '#fff' : theme.text },
                  ]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Logout — distinct section */}
        <View style={styles.logoutSection}>
          <Pressable
            style={[styles.logoutButton, { borderColor: theme.destructive }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: theme.destructive }]}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenLayout>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageTitleBar: {
    marginHorizontal: -16, marginBottom: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 22, fontWeight: 'bold',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, marginTop: 8 },
  card: { borderRadius: 18, padding: 16, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15,
    marginBottom: 10,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  passwordInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 15,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  eyeButton: {
    borderWidth: 1, borderLeftWidth: 0, borderRadius: 12,
    borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
    paddingHorizontal: 12, height: 44, justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  button: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12,
    alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  divider: { borderBottomWidth: 1, marginVertical: 16 },

  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOption: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  themeOptionText: { fontSize: 14, fontWeight: '600' },

  logoutSection: { marginTop: 20, alignItems: 'center' },
  logoutButton: {
    borderWidth: 1.5, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 40,
    alignItems: 'center', width: '100%',
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
})
