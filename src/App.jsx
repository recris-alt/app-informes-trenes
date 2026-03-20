import { useState, useEffect } from 'react'
import Login from './components/Login'
import Navigation from './components/Navigation'
import CreateReport from './components/CreateReport'
import ViewReports from './components/ViewReports'
import ReportsTable from './components/ReportsTable'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState('create')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    const savedSession = localStorage.getItem('userSession')
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession)
        setCurrentUser(user)
        setIsLoggedIn(true)
      } catch (err) {
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

  // Cuando se selecciona un informe desde la tabla, ir a la vista de detalle
  const handleSelectReport = (report) => {
    setSelectedReport(report)
    setCurrentPage('view')
  }

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app-container">
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
        {currentPage === 'view' && <ViewReports preselectedReport={selectedReport} onClearPreselected={() => setSelectedReport(null)} />}
        {currentPage === 'table' && <ReportsTable onSelectReport={handleSelectReport} />}
      </main>
    </div>
  )
}
