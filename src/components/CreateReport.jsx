import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/CreateReport.css'

export default function CreateReport() {
  const [formData, setFormData] = useState({
    technician_name: '',
    date: new Date().toISOString().split('T')[0],
    ticket_number: '',
    customer: '',
    depot: '',
    project: '',
    unit: '',
    converter_number: '',
    rework_name: '',
    rework_points: '',
    material_number: '',
    detected_defect: '',
    comments: '',
    photos: [],
    signature: null
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [photoPreview, setPhotoPreview] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  
  const canvasRef = useRef(null)
  const contextRef = useRef(null)

  useEffect(() => {
    const savedDraft = localStorage.getItem('reportDraft')
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('reportDraft', JSON.stringify(formData))
  }, [formData])

  // Inicializar canvas de firma
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = 200 * 2
    canvas.style.width = canvas.offsetWidth + 'px'
    canvas.style.height = '200px'

    const context = canvas.getContext('2d')
    context.scale(2, 2)
    context.lineCap = 'round'
    context.strokeStyle = '#000'
    context.lineWidth = 2
    contextRef.current = context
  }, [])

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent
    contextRef.current.beginPath()
    contextRef.current.moveTo(offsetX, offsetY)
    setIsDrawing(true)
  }

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return
    const { offsetX, offsetY } = nativeEvent
    contextRef.current.lineTo(offsetX, offsetY)
    contextRef.current.stroke()
  }

  const stopDrawing = () => {
    contextRef.current.closePath()
    setIsDrawing(false)
    
    const canvas = canvasRef.current
    const signatureData = canvas.toDataURL('image/png')
    setFormData(prev => ({ ...prev, signature: signatureData }))
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = contextRef.current
    context.clearRect(0, 0, canvas.width, canvas.height)
    setFormData(prev => ({ ...prev, signature: null }))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...files]
    }))
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPhotoPreview(prev => [...prev, event.target.result])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
    setPhotoPreview(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      let photoUrls = []
      
      for (let i = 0; i < formData.photos.length; i++) {
        const file = formData.photos[i]
        const fileName = Date.now() + '_' + i + '_' + file.name
        
        const { data, error } = await supabase.storage
          .from('report-photos')
          .upload(fileName, file)

        if (error) throw error
        
        const { data: publicData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName)
        
        photoUrls.push(publicData.publicUrl)
      }

      let signatureUrl = null
      if (formData.signature) {
        const signatureBlob = await fetch(formData.signature).then(r => r.blob())
        const signatureFileName = 'signature_' + Date.now() + '.png'
        
        const { error: signatureError } = await supabase.storage
          .from('report-photos')
          .upload(signatureFileName, signatureBlob)

        if (signatureError) throw signatureError

        const { data: signaturePublicData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(signatureFileName)
        
        signatureUrl = signaturePublicData.publicUrl
      }

      const { error } = await supabase
        .from('reports')
        .insert([{
          technician_name: formData.technician_name,
          date: formData.date,
          ticket_number: formData.ticket_number,
          customer: formData.customer,
          depot: formData.depot,
          project: formData.project,
          unit: formData.unit,
          converter_number: formData.converter_number,
          rework_name: formData.rework_name,
          rework_points: formData.rework_points,
          material_number: formData.material_number,
          detected_defect: formData.detected_defect,
          comments: formData.comments,
          photo_urls: photoUrls,
          signature_url: signatureUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setMessage('✅ Informe guardado correctamente')
      
      setFormData({
        technician_name: '',
        date: new Date().toISOString().split('T')[0],
        ticket_number: '',
        customer: '',
        depot: '',
        project: '',
        unit: '',
        converter_number: '',
        rework_name: '',
        rework_points: '',
        material_number: '',
        detected_defect: '',
        comments: '',
        photos: [],
        signature: null
      })
      setPhotoPreview([])
      clearSignature()
      localStorage.removeItem('reportDraft')

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('❌ Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-report">
      <form onSubmit={handleSubmit}>
        <h2>Crear Nuevo Informe de Rework</h2>

        <div className="form-section">
          <h3>Información General</h3>
          
          <div className="form-group">
            <label>Número de Ticket (opcional)</label>
            <input
              type="text"
              name="ticket_number"
              value={formData.ticket_number}
              onChange={handleInputChange}
              placeholder="Ej: TKT-2024-001"
            />
          </div>

          <div className="form-group">
            <label>Nombre del Técnico *</label>
            <input
              type="text"
              name="technician_name"
              value={formData.technician_name}
              onChange={handleInputChange}
              required
              placeholder="Introduce tu nombre completo"
            />
          </div>

          <div className="form-group">
            <label>Fecha del Trabajo *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Datos del Cliente</h3>

          <div className="form-group">
            <label>Cliente *</label>
            <input
              type="text"
              name="customer"
              value={formData.customer}
              onChange={handleInputChange}
              required
              placeholder="Nombre del cliente"
            />
          </div>

          <div className="form-group">
            <label>Depósito *</label>
            <input
              type="text"
              name="depot"
              value={formData.depot}
              onChange={handleInputChange}
              required
              placeholder="Ubicación del depósito"
            />
          </div>

          <div className="form-group">
            <label>Proyecto *</label>
            <input
              type="text"
              name="project"
              value={formData.project}
              onChange={handleInputChange}
              required
              placeholder="Nombre del proyecto"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Información del Equipo</h3>

          <div className="form-group">
            <label>Unidad *</label>
            <input
              type="text"
              name="unit"
              value={formData.unit}
              onChange={handleInputChange}
              required
              placeholder="Identificación de la unidad"
            />
          </div>

          <div className="form-group">
            <label>Nº Convertidor *</label>
            <input
              type="text"
              name="converter_number"
              value={formData.converter_number}
              onChange={handleInputChange}
              required
              placeholder="Número del convertidor"
            />
          </div>

          <div className="form-group">
            <label>Número de Material (opcional)</label>
            <input
              type="text"
              name="material_number"
              value={formData.material_number}
              onChange={handleInputChange}
              placeholder="Ej: MAT-123456"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Descripción del Trabajo</h3>

          <div className="form-group">
            <label>Defecto Detectado *</label>
            <textarea
              name="detected_defect"
              value={formData.detected_defect}
              onChange={handleInputChange}
              required
              placeholder="Describe el defecto identificado..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Nombre del Rework *</label>
            <input
              type="text"
              name="rework_name"
              value={formData.rework_name}
              onChange={handleInputChange}
              required
              placeholder="Descripción breve del rework"
            />
          </div>

          <div className="form-group">
            <label>Puntos del Rework Ejecutados *</label>
            <textarea
              name="rework_points"
              value={formData.rework_points}
              onChange={handleInputChange}
              required
              placeholder="Detalla los puntos completados del rework..."
              rows="5"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Documentación</h3>

          <div className="form-group">
            <label>Fotografías del Trabajo</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoCapture}
              capture="environment"
            />
            <small>Puedes subir varias fotos del trabajo realizado</small>
          </div>

          {photoPreview.length > 0 && (
            <div className="photo-preview">
              <p>📸 Fotos cargadas: {photoPreview.length}</p>
              <div className="preview-grid">
                {photoPreview.map((photo, index) => (
                  <div key={index} className="preview-item">
                    <img src={photo} alt={'Preview ' + index} />
                    <button 
                      type="button" 
                      onClick={() => removePhoto(index)}
                      className="remove-btn"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Firma del Técnico *</label>
            <div className="signature-container">
              <canvas
                ref={canvasRef}
                className="signature-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <div className="signature-buttons">
                <button 
                  type="button" 
                  onClick={clearSignature}
                  className="clear-signature-btn"
                >
                  🗑️ Limpiar Firma
                </button>
              </div>
            </div>
            <small>Dibuja tu firma con el ratón o con el dedo (táctil)</small>
          </div>

          <div className="form-group">
            <label>Observaciones Adicionales</label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleInputChange}
              placeholder="Comentarios, notas o detalles adicionales..."
              rows="3"
            />
          </div>
        </div>

        {message && <div className="message">{message}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? '⏳ Guardando Informe...' : '💾 Guardar Informe Completo'}
        </button>
      </form>
    </div>
  )
}