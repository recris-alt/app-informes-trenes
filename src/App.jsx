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
      {/* FIX: Se eliminó el <header> duplicado que coexistía con Navigation */}
      <Navigation
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {currentPage === 'create' && <CreateReport />}
        {currentPage === 'view' && <ViewReports />}
      </main>
    </div>
  )
}
