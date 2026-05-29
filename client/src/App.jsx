import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'

import LandingPage     from './pages/LandingPage'
import LoginPage       from './pages/LoginPage'
import UploadPage      from './pages/UploadPage'
import OwnerDashboard  from './pages/OwnerDashboard'

// Always send session cookie with requests
axios.defaults.withCredentials = true

// ── Auth context shared across all pages ───────────────────
export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// ── Route guard component ──────────────────────────────────
function Protected({ children, ownerOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div className="spinner spinner-dark" style={{ width:32, height:32 }} />
      </div>
    )
  }
  if (!user)                       return <Navigate to="/"       replace />
  if (ownerOnly && !user.isOwner)  return <Navigate to="/upload" replace />
  return children
}

// ── App root ───────────────────────────────────────────────
export default function App() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  // On first load: ask server if a session already exists
  useEffect(() => {
    axios.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await axios.post('/auth/logout')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      <Routes>
        <Route path="/"      element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/upload" element={
          <Protected>
            <UploadPage />
          </Protected>
        } />

        <Route path="/owner" element={
          <Protected ownerOnly>
            <OwnerDashboard />
          </Protected>
        } />

        {/* Any unknown URL → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  )
}
