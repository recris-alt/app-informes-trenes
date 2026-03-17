import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import './Navigation.css'

export default function Navigation({ currentPage, setCurrentPage, isLoggedIn, setIsLoggedIn }) {
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserEmail(session.user.email)
        setIsLoggedIn(true)
      } else {
        setUserEmail('')
        setIsLoggedIn(false)
      }
    }

    getUser()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email)
        setIsLoggedIn(true)
      } else {
        setUserEmail('')
        setIsLoggedIn(false)
      }
    })

    return () => subscription?.unsubscribe()
  }, [setIsLoggedIn])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setUserEmail('')
    setCurrentPage('create')
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <h1 className="nav-title">Informes de Rework - Trenes</h1>
          {isLoggedIn && userEmail && (
            <p className="nav-subtitle">Bienvenido, {userEmail}</p>
          )}
        </div>

        <div className="nav-center">
          {isLoggedIn && (
            <div className="nav-buttons">
              <button
                className={`nav-btn ${currentPage === 'create' ? 'active' : ''}`}
                onClick={() => setCurrentPage('create')}
              >
                ➕ Crear Informe
              </button>
              <button
                className={`nav-btn ${currentPage === 'view' ? 'active' : ''}`}
                onClick={() => setCurrentPage('view')}
              >
                📋 Ver Informes
              </button>
            </div>
          )}
        </div>

        <div className="nav-right">
          {isLoggedIn && userEmail && (
            <button className="nav-logout-btn" onClick={handleLogout}>
              ✕ Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
