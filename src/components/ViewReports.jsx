import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/ViewReports.css'

export default function ViewReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteReport = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este informe?')) return

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id)

      if (error) throw error
      setReports(reports.filter(r => r.id !== id))
      setSelectedReport(null)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (loading) return <div className="loading">⏳ Cargando informes...</div>

  return (
    <div className="view-reports">
      {reports.length === 0 ? (
        <p className="no-reports">📋 No hay informes guardados aún. ¡Crea el primero!</p>
      ) : (
        <>
          <div className="reports-list">
            {reports.map(report => (
              <div 
                key={report.id} 
                className={`report-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-header">
                  <h3>{report.rework_name}</h3>
                  <span className="date">{new Date(report.date).toLocaleDateString('es-ES')}</span>
                </div>
                <p className="tech-name">👤 {report.technician_name}</p>
                <p className="project-name">📁 {report.project}</p>
              </div>
            ))}
          </div>

          {selectedReport && (
            <div className="report-detail">
              <div className="detail-header">
                <h2>{selectedReport.rework_name}</h2>
                <button onClick={() => setSelectedReport(null)} className="close-btn">✕</button>
              </div>

              <div className="detail-body">
                <div className="detail-row">
                  <span className="label">👤 Técnico:</span>
                  <span className="value">{selectedReport.technician_name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📅 Fecha:</span>
                  <span className="value">{new Date(selectedReport.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📁 Proyecto:</span>
                  <span className="value">{selectedReport.project}</span>
                </div>
                <div className="detail-row">
                  <span className="label">🔧 Unidad:</span>
                  <span className="value">{selectedReport.unit}</span>
                </div>
                <div className="detail-row">
                  <span className="label">⚡ Nº Convertidor:</span>
                  <span className="value">{selectedReport.converter_number}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📝 Puntos ejecutados:</span>
                  <span className="value">{selectedReport.rework_points}</span>
                </div>
                {selectedReport.comments && (
                  <div className="detail-row">
                    <span className="label">💬 Observaciones:</span>
                    <span className="value">{selectedReport.comments}</span>
                  </div>
                )}

                {selectedReport.signature_url && (
                  <div className="signature-section">
                    <h4>✍️ Firma del Técnico</h4>
                    <div className="signature-display">
                      <img src={selectedReport.signature_url} alt="Firma" />
                    </div>
                  </div>
                )}

                {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                  <div className="photos-section">
                    <h4>📸 Fotografías del Trabajo ({selectedReport.photo_urls.length})</h4>
                    <div className="photos-grid">
                      {selectedReport.photo_urls.map((url, index) => (
                        <img key={index} src={url} alt={`Foto ${index + 1}`} />
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => deleteReport(selectedReport.id)}
                  className="delete-btn"
                >
                  🗑️ Eliminar Informe
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
