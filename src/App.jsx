import { useState } from 'react'
import Navigation from './components/Navigation'
import CreateReport from './components/CreateReport'
import ViewReports from './components/ViewReports'

function App() {
  const [currentPage, setCurrentPage] = useState('create')

  return (
    <div className="app-container">
      <header className="header">
        <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/ABB_logo.svg/1280px-ABB_logo.svg.png" alt="ABB Logo" className="logo" />
        <h1>Informes de Rework - Trenes</h1>
      </header>
      
      <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="main-content">
        {currentPage === 'create' && <CreateReport />}
        {currentPage === 'view' && <ViewReports />}
      </main>
    </div>
  )
}

export default App