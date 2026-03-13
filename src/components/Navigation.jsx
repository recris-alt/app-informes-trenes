export default function Navigation({ currentPage, setCurrentPage }) {
  return (
    <nav className="navigation">
      <button 
        className={`nav-button ${currentPage === 'create' ? 'active' : ''}`}
        onClick={() => setCurrentPage('create')}
      >
        ➕ Crear Informe
      </button>
      <button 
        className={`nav-button ${currentPage === 'view' ? 'active' : ''}`}
        onClick={() => setCurrentPage('view')}
      >
        📋 Ver Informes
      </button>
    </nav>
  )
}
