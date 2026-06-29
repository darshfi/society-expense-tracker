import { Text, View, TextInput, StyleSheet, Alert, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, Redirect } from 'expo-router'
import { PROTECTED_HOME } from '../lib/redirects'
import { useTheme } from '../lib/ThemeContext'

const FAKE_EMAIL_DOMAIN = '@society-tracker.local'

export default function LoginScreen() {
  const router = useRouter()
  const { theme, resolvedScheme } = useTheme()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setSessionChecked(true)
    })
  }, [])

  if (!sessionChecked) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    )
  }

  if (hasSession) {
    return <Redirect href={PROTECTED_HOME} />
  }

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Missing username', 'Please enter your username.')
      return
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter your password.')
      return
    }

    setLoading(true)
    try {
      const fakeEmail = `${username.trim().toLowerCase()}${FAKE_EMAIL_DOMAIN}`
      const { error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
        password,
      })
      if (error) {
        Alert.alert('Login failed', error.message)
      } else {
        router.replace(PROTECTED_HOME)
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        {/* Logo / branding */}
        <View style={styles.brandArea}>
          <View style={[styles.logoCircle, { backgroundColor: theme.accent }]}>
            <Text style={styles.logoText}>SE</Text>
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Society Expense</Text>
          <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>
            Track expenses, share bills
          </Text>
        </View>

        {/* Login card */}
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Sign in</Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Username</Text>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
            placeholder="Your username"
            placeholderTextColor={theme.textMuted}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.passwordInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
              placeholder="Your password"
              placeholderTextColor={theme.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
            <Pressable
              style={[styles.eyeButton, { backgroundColor: theme.bg, borderColor: theme.border }]}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={8}
            >
              <Text style={[styles.eyeIcon, { color: theme.textMuted }]}>
                {showPassword ? '👁' : '👁‍🗨'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.loginButton, { backgroundColor: theme.accent }, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign in</Text>
            )}
          </Pressable>
        </View>

        {/* Footer hint */}
        <Text style={[styles.footerHint, { color: theme.textMuted }]}>
          Use your society account credentials
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // Brand
  brandArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  appName: { fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  appSubtitle: { fontSize: 14 },

  // Card
  card: { borderRadius: 20, padding: 24, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  passwordInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16,
    borderTopRightRadius: 0, borderBottomRightRadius: 0,
  },
  eyeButton: {
    borderWidth: 1, borderLeftWidth: 0, borderRadius: 12,
    borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
    paddingHorizontal: 12, height: 50, justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Footer
  footerHint: { fontSize: 12, textAlign: 'center' },
})
