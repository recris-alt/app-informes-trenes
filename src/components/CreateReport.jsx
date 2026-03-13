import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/CreateReport.css'

export default function CreateReport() {
  const [formData, setFormData] = useState({
    technician_name: '',
    date: new Date().toISOString().split('T')[0],
    project: '',
    unit: '',
    converter_number: '',
    rework_name: '',
    rework_points: '',
    comments: '',
    photos: []
  })

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [photoPreview, setPhotoPreview] = useState([])

  useEffect(() => {
    const savedDraft = localStorage.getItem('reportDraft')
    if (savedDraft) {
      setFormData(JSON.parse(savedDraft))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('reportDraft', JSON.stringify(formData))
  }, [formData])

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
        const fileName = `${Date.now()}_${i}_${file.name}`
        
        const { data, error } = await supabase.storage
          .from('report-photos')
          .upload(fileName, file)

        if (error) throw error
        
        const { data: publicData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName)
        
        photoUrls.push(publicData.publicUrl)
      }

      const { error } = await supabase
        .from('reports')
        .insert([{
          technician_name: formData.technician_name,
          date: formData.date,
          project: formData.project,
          unit: formData.unit,
          converter_number: formData.converter_number,
          rework_name: formData.rework_name,
          rework_points: formData.rework_points,
          comments: formData.comments,
          photo_urls: photoUrls,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setMessage('✅ Informe guardado correctamente')
      
      setFormData({
        technician_name: '',
        date: new Date().toISOString().split('T')[0],
        project: '',
        unit: '',
        converter_number: '',
        rework_name: '',
        rework_points: '',
        comments: '',
        photos: []
      })
      setPhotoPreview([])
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
        <div className="form-group">
          <label>Nombre del Técnico *</label>
          <input
            type="text"
            name="technician_name"
            value={formData.technician_name}
            onChange={handleInputChange}
            required
            placeholder="Tu nombre"
          />
        </div>

        <div className="form-group">
          <label>Fecha *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
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
            type="number"
            name="converter_number"
            value={formData.converter_number}
            onChange={handleInputChange}
            required
            placeholder="123456"
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
            placeholder="Descripción del rework"
          />
        </div>

        <div className="form-group">
          <label>Puntos del Rework Ejecutados *</label>
          <textarea
            name="rework_points"
            value={formData.rework_points}
            onChange={handleInputChange}
            required
            placeholder="Detalla los puntos completados..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label>Fotos</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoCapture}
            capture="environment"
          />
          <small>Puedes subir varias fotos</small>
        </div>

        {photoPreview.length > 0 && (
          <div className="photo-preview">
            <p>Fotos cargadas: {photoPreview.length}</p>
            <div className="preview-grid">
              {photoPreview.map((photo, index) => (
                <div key={index} className="preview-item">
                  <img src={photo} alt={`Preview ${index}`} />
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
          <label>Comentarios</label>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleInputChange}
            placeholder="Observaciones adicionales..."
            rows="3"
          />
        </div>

        {message && <div className="message">{message}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? '⏳ Guardando...' : '💾 Guardar Informe'}
        </button>
      </form>
    </div>
  )
}
