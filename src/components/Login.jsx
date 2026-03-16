import { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/Login.css'

export default function Login({ onLoginSuccess }) {
  const [accessCode, setAccessCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const code = accessCode.trim().toUpperCase()

      if (!code) {
        setError('Ingresa el código de acceso')
        setLoading(false)
        return
      }

      console.log('Buscando código:', code)

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, name, access_code')

      console.log('Datos de usuarios:', data)
      console.log('Error:', fetchError)

      if (fetchError) {
        setError('Error al conectar con la base de datos')
        setLoading(false)
        return
      }

      const user = data.find(u => u.access_code.trim().toUpperCase() === code)

      if (!user) {
        setError('Código de acceso incorrecto')
        setLoading(false)
        return
      }

      localStorage.setItem('userSession', JSON.stringify({
        id: user.id,
        name: user.name,
        accessCode: user.access_code,
        loginTime: new Date().toISOString()
      }))

      setAccessCode('')
      onLoginSuccess(user)
    } catch (err) {
      console.error('Error:', err)
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Informe de Rework</h1>
          <p>Sistema de Reportes ABB</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Código de Acceso</label>
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Ingresa tu código"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? 'Verificando...' : 'Acceder'}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2024 ABB - Sistemas de Rework</p>
        </div>
      </div>
    </div>
  )
}
