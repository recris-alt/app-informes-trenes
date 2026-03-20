import './Navigation.css'

export default function Navigation({ currentPage, setCurrentPage, isLoggedIn, currentUser, onLogout }) {
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
              <button
                className={`nav-link ${currentPage === 'table' ? 'active' : ''}`}
                onClick={() => setCurrentPage('table')}
              >
                📊 Tabla
              </button>
            </div>

            <div className="nav-right">
              {currentUser?.name && (
                <span className="nav-username">👤 {currentUser.name}</span>
              )}
              <button className="nav-logout" onClick={onLogout}>
                Cerrar Sesión
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
