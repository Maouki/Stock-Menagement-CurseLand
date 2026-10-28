import { useState, useEffect, useCallback } from 'react'
import { supabase, isConfigured } from '../lib/supabase'

// Users log in with a plain username; Supabase Auth needs an email,
// so a username without "@" maps to <username>@<USERNAME_DOMAIN>.
export const USERNAME_DOMAIN = 'curseland.app'

const toEmail = (username) =>
  username.includes('@') ? username : `${username}@${USERNAME_DOMAIN}`

const toDisplayName = (user) => {
  if (!user) return null
  const name = user.user_metadata?.display_name
  if (name) return name
  const email = user.email || ''
  return email.endsWith('@' + USERNAME_DOMAIN) ? email.split('@')[0] : email
}

export function useAuth() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(isConfigured)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Returns null on success, or a Thai error message.
  const login = useCallback(async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username.toLowerCase()),
      password,
    })
    if (!error) return null
    if (error.message?.includes('Invalid login credentials')) return 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
    if (error.message?.includes('Email not confirmed')) return 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล'
    return 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    checking,
    isLoggedIn: Boolean(session),
    currentUser: toDisplayName(session?.user),
    login,
    logout,
  }
}
