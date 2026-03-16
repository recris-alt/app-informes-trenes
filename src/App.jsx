import { useState, useEffect } from 'react'
import Login from './components/Login'
import Navigation from './components/Navigation'
import CreateReport from './components/CreateReport'
import ViewReports from './components/ViewReports'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('create')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    const savedSession = localStorage.getItem('userSession')
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession)
        setCurrentUser(user)
        setIsLoggedIn(true)
      } catch (err) {
        console.log('Sesión inválida')
        localStorage.removeItem('userSession')
      }
    }
  }, [])

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('userSession')
    setCurrentUser(null)
    setIsLoggedIn(false)
    setCurrentPage('create')
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <h1>Informes de Rework - Trenes</h1>
          </div>
          <div className="header-right">
            <span className="user-info">Bienvenido, {currentUser?.name}</span>
            <button onClick={handleLogout} className="logout-btn">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <main className="main-content">
        {currentPage === 'create' && <CreateReport />}
        {currentPage === 'view' && <ViewReports />}
      </main>
    </div>
  )
}
