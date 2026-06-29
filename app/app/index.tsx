import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { supabase } from '../lib/supabase'
import { PROTECTED_HOME } from '../lib/redirects'

export default function Index() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setSessionChecked(true)
    })
  }, [])

  if (!sessionChecked) {
    return null
  }

  if (hasSession) {
    return <Redirect href={PROTECTED_HOME} />
  }

  return <Redirect href="/login" />
}