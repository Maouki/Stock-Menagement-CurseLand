import { useState, useCallback } from 'react'

const SESSION_KEY = 'curseland_auth'
const USERS = {
  admin: '1234',
}

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    localStorage.getItem(SESSION_KEY) === 'true'
  )
  const [currentUser, setCurrentUser] = useState(() =>
    localStorage.getItem(SESSION_KEY + '_user') || null
  )

  const login = useCallback((username, password) => {
    if (USERS[username] && USERS[username] === password) {
      localStorage.setItem(SESSION_KEY, 'true')
      localStorage.setItem(SESSION_KEY + '_user', username)
      setIsLoggedIn(true)
      setCurrentUser(username)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SESSION_KEY + '_user')
    setIsLoggedIn(false)
    setCurrentUser(null)
  }, [])

  return { isLoggedIn, currentUser, login, logout }
}
