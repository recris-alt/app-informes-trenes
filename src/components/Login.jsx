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
      if (!accessCode.trim()) {
        setError('Ingresa el código de acceso')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('access_code', accessCode.trim())
        .single()

      if (fetchError || !data) {
        setError('Código de acceso incorrecto')
        setLoading(false)
        return
      }

      localStorage.setItem('userSession', JSON.stringify({
        id: data.id,
        name: data.name,
        accessCode: data.access_code,
        loginTime: new Date().toISOString()
      }))

      setAccessCode('')
      onLoginSuccess(data)
    } catch (err) {
      setError('Error al verificar código: ' + err.message)
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
