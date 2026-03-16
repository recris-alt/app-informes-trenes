import { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/CreateReport.css'

export default function CreateReport() {
  const [formData, setFormData] = useState({
    technician_name: '',
    date: new Date().toISOString().split('T')[0],
    ticket_number: '',
    motion_business: '',
    customer: '',
    depot: '',
    project: '',
    unit: '',
    converter_type: '',
    converter_sn: '',
    first_message_date: '',
    detected_defect: '',
    failure_classification: '',
    start_time: '',
    end_time: '',
    rework_points: '',
    fault_corrected: 'yes',
    replaced_materials: [],
    repair_location: '',
    conclusion: '',
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

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.offsetWidth * 2
    canvas.height = 150 * 2
    canvas.style.width = canvas.offsetWidth + 'px'
    canvas.style.height = '150px'

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
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const addMaterial = () => {
    const newMaterial = {
      material_number_old: '',
      serial_number_old: '',
      material_number_new: '',
      serial_number_new: ''
    }
    setFormData(prev => ({
      ...prev,
      replaced_materials: [...prev.replaced_materials, newMaterial]
    }))
  }

  const removeMaterial = (index) => {
    setFormData(prev => ({
      ...prev,
      replaced_materials: prev.replaced_materials.filter((_, i) => i !== index)
    }))
  }

  const handleMaterialChange = (index, field, value) => {
    setFormData(prev => {
      const updatedMaterials = [...prev.replaced_materials]
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        [field]: value
      }
      return { ...prev, replaced_materials: updatedMaterials }
    })
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
          motion_business: formData.motion_business,
          customer: formData.customer,
          depot: formData.depot,
          project: formData.project,
          unit: formData.unit,
          converter_type: formData.converter_type,
          converter_sn: formData.converter_sn,
          first_message_date: formData.first_message_date,
          detected_defect: formData.detected_defect,
          failure_classification: formData.failure_classification,
          start_time: formData.start_time,
          end_time: formData.end_time,
          rework_points: formData.rework_points,
          fault_corrected: formData.fault_corrected,
          replaced_materials: formData.replaced_materials,
          repair_location: formData.repair_location,
          conclusion: formData.conclusion,
          photo_urls: photoUrls,
          signature_url: signatureUrl,
          created_at: new Date().toISOString()
        }])

      if (error) throw error

      setMessage('Report saved successfully')
      
      setFormData({
        technician_name: '',
        date: new Date().toISOString().split('T')[0],
        ticket_number: '',
        motion_business: '',
        customer: '',
        depot: '',
        project: '',
        unit: '',
        converter_type: '',
        converter_sn: '',
        first_message_date: '',
        detected_defect: '',
        failure_classification: '',
        start_time: '',
        end_time: '',
        rework_points: '',
        fault_corrected: 'yes',
        replaced_materials: [],
        repair_location: '',
        conclusion: '',
        photos: [],
        signature: null
      })
      setPhotoPreview([])
      clearSignature()
      localStorage.removeItem('reportDraft')

      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-report">
      <form onSubmit={handleSubmit}>
        <h2>Field Service Report</h2>

        <div className="form-section">
          <h3>Header Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Ticket Number</label>
              <input type="text" name="ticket_number" value={formData.ticket_number} onChange={handleInputChange} placeholder="Ticket Nr" />
            </div>
            <div className="form-group">
              <label>Motion Business</label>
              <input type="text" name="motion_business" value={formData.motion_business} onChange={handleInputChange} placeholder="e.g., MOTR India" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Affected Plant</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Customer *</label>
              <input type="text" name="customer" value={formData.customer} onChange={handleInputChange} required placeholder="Customer name" />
            </div>
            <div className="form-group">
              <label>Depot *</label>
              <input type="text" name="depot" value={formData.depot} onChange={handleInputChange} required placeholder="Depot" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Project *</label>
              <input type="text" name="project" value={formData.project} onChange={handleInputChange} required placeholder="Project" />
            </div>
            <div className="form-group">
              <label>Vehicle Number *</label>
              <input type="text" name="unit" value={formData.unit} onChange={handleInputChange} required placeholder="Vehicle number" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Converter Information</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Converter Type *</label>
              <input type="text" name="converter_type" value={formData.converter_type} onChange={handleInputChange} required placeholder="e.g., CC1500_MS_25-3KV..." />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Serial Number (SN)</label>
              <input type="text" name="converter_sn" value={formData.converter_sn} onChange={handleInputChange} placeholder="SN" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Failure Description</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>First Message Date</label>
              <input type="datetime-local" name="first_message_date" value={formData.first_message_date} onChange={handleInputChange} />
            </div>
          </div>

          <div className="form-group">
            <label>Detected Defect/Error Caused by *</label>
            <textarea name="detected_defect" value={formData.detected_defect} onChange={handleInputChange} required placeholder="Describe the defect..." rows="4" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Failure Classification</label>
              <input type="text" name="failure_classification" value={formData.failure_classification} onChange={handleInputChange} placeholder="e.g., Power Supply" />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Service Times</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" name="start_time" value={formData.start_time} onChange={handleInputChange} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" name="end_time" value={formData.end_time} onChange={handleInputChange} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Executed Work</h3>
          
          <div className="form-group">
            <label>Detailed Work Points *</label>
            <textarea name="rework_points" value={formData.rework_points} onChange={handleInputChange} required placeholder="Detailed list of work points..." rows="6" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fault Corrected?</label>
              <select name="fault_corrected" value={formData.fault_corrected} onChange={handleInputChange}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Replaced Material</h3>
          
          {formData.replaced_materials.length === 0 ? (
            <p className="no-materials">No materials added yet</p>
          ) : (
            formData.replaced_materials.map((material, index) => (
              <div key={index} className="form-section-sub">
                <div className="material-header">
                  <h4>Material {index + 1}</h4>
                  <button 
                    type="button" 
                    onClick={() => removeMaterial(index)}
                    className="remove-material-btn"
                  >
                    Remove
                  </button>
                </div>

                <div className="material-group">
                  <div className="material-column">
                    <h5>Old Material</h5>
                    <div className="form-group">
                      <label>Material Number</label>
                      <input
                        type="text"
                        value={material.material_number_old}
                        onChange={(e) => handleMaterialChange(index, 'material_number_old', e.target.value)}
                        placeholder="e.g., 3BHE0573918R002"
                      />
                    </div>
                    <div className="form-group">
                      <label>Serial Number</label>
                      <input
                        type="text"
                        value={material.serial_number_old}
                        onChange={(e) => handleMaterialChange(index, 'serial_number_old', e.target.value)}
                        placeholder="e.g., 106"
                      />
                    </div>
                  </div>

                  <div className="material-column">
                    <h5>New Material</h5>
                    <div className="form-group">
                      <label>Material Number</label>
                      <input
                        type="text"
                        value={material.material_number_new}
                        onChange={(e) => handleMaterialChange(index, 'material_number_new', e.target.value)}
                        placeholder="e.g., 3BHE0573918R002"
                      />
                    </div>
                    <div className="form-group">
                      <label>Serial Number</label>
                      <input
                        type="text"
                        value={material.serial_number_new}
                        onChange={(e) => handleMaterialChange(index, 'serial_number_new', e.target.value)}
                        placeholder="e.g., 58"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          <button 
            type="button" 
            onClick={addMaterial}
            className="add-material-btn"
          >
            + Add Material
          </button>
        </div>

        <div className="form-section">
          <h3>Service Confirmation</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Repair Location</label>
              <input type="text" name="repair_location" value={formData.repair_location} onChange={handleInputChange} placeholder="Location" />
            </div>
          </div>

          <div className="form-group">
            <label>Pictures</label>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handlePhotoCapture} 
            />
            <small>Upload pictures from camera, gallery or files</small>
          </div>

          {photoPreview.length > 0 && (
            <div className="photo-preview">
              <p>Photos uploaded: {photoPreview.length}</p>
              <div className="preview-grid">
                {photoPreview.map((photo, index) => (
                  <div key={index} className="preview-item">
                    <img src={photo} alt={'Preview ' + index} />
                    <button type="button" onClick={() => removePhoto(index)} className="remove-btn">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Service Engineer Signature *</label>
            <div className="signature-container">
              <canvas ref={canvasRef} className="signature-canvas" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
              <div className="signature-buttons">
                <button type="button" onClick={clearSignature} className="clear-signature-btn">Clear Signature</button>
              </div>
            </div>
            <small>Draw your signature with your finger or mouse</small>
          </div>
        </div>

        <div className="form-section">
          <h3>Conclusion</h3>
          
          <div className="form-group">
            <label>Conclusion / Additional Notes</label>
            <textarea name="conclusion" value={formData.conclusion} onChange={handleInputChange} placeholder="Final notes..." rows="3" />
          </div>
        </div>

        {message && <div className="message">{message}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Saving Report...' : 'Save Field Service Report'}
        </button>
      </form>
    </div>
  )
}
