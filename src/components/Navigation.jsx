import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import './Navigation.css'

export default function Navigation({ currentPage, setCurrentPage, isLoggedIn, setIsLoggedIn }) {
  const [userEmail, setUserEmail] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentPage('create')
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-left">
          <h1 className="nav-title">Informes de Rework - Trenes</h1>
          {isLoggedIn && <p className="nav-subtitle">Bienvenido, {userEmail}</p>}
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
          {isLoggedIn && (
            <button className="nav-logout-btn" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
