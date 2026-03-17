import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import './Navigation.css'

export default function Navigation({ currentPage, setCurrentPage, isLoggedIn, setIsLoggedIn }) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentPage('create')
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo">
          <h1>Informes Rework</h1>
        </div>

        {isLoggedIn && (
          <>
            <div className="nav-menu">
              <button 
                className={`nav-link ${currentPage === 'create' ? 'active' : ''}`}
                onClick={() => setCurrentPage('create')}
              >
                ➕ Crear Informe
              </button>
              <button 
                className={`nav-link ${currentPage === 'view' ? 'active' : ''}`}
                onClick={() => setCurrentPage('view')}
              >
                📋 Ver Informes
              </button>
            </div>

            <button className="nav-logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
