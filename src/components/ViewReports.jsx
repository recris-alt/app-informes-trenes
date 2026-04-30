import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { jsPDF } from 'jspdf'
import '../styles/ViewReports.css'

// FIX: Helper que carga una imagen como base64 de forma asíncrona y correcta.
// Antes, fetch().then() se ejecutaba DESPUÉS de pdf.save(), por lo que las
// imágenes nunca aparecían en el PDF exportado.
const loadImageAsBase64 = (url) => {
  return new Promise((resolve) => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
      .catch(() => resolve(null))
  })
}

const ABB_LOGO_B64 = "data:image/png;base64,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"

export default function ViewReports({ preselectedReport, onClearPreselected }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  // Cuando se llega desde la tabla con un informe preseleccionado, abrirlo automáticamente
  useEffect(() => {
    if (preselectedReport) {
      setSelectedReport(preselectedReport)
      if (onClearPreselected) onClearPreselected()
    }
  }, [preselectedReport])

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
    if (!confirm('Are you sure you want to delete this report?')) return

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


  const startEdit = () => {
    setEditData({ ...selectedReport })
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditData(null)
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditData(prev => ({ ...prev, [name]: value }))
  }


  const handleEditServiceDayChange = (index, field, value) => {
    setEditData(prev => {
      const days = [...(prev.service_days || [])]
      days[index] = { ...days[index], [field]: value }
      return { ...prev, service_days: days }
    })
  }

  const addEditServiceDay = () => {
    setEditData(prev => ({
      ...prev,
      service_days: [...(prev.service_days || []), {
        date: new Date().toISOString().split('T')[0],
        start_time: '',
        end_time: ''
      }]
    }))
  }

  const removeEditServiceDay = (index) => {
    setEditData(prev => ({
      ...prev,
      service_days: (prev.service_days || []).filter((_, i) => i !== index)
    }))
  }


  const addEditMaterial = () => {
    setEditData(prev => ({
      ...prev,
      replaced_materials: [...(prev.replaced_materials || []), {
        material_number_old: '',
        serial_number_old: '',
        material_number_new: '',
        serial_number_new: ''
      }]
    }))
  }

  const removeEditMaterial = (index) => {
    setEditData(prev => ({
      ...prev,
      replaced_materials: (prev.replaced_materials || []).filter((_, i) => i !== index)
    }))
  }

  const handleEditMaterialChange = (index, field, value) => {
    setEditData(prev => {
      const mats = [...(prev.replaced_materials || [])]
      mats[index] = { ...mats[index], [field]: value }
      return { ...prev, replaced_materials: mats }
    })
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('reports')
        .update({
          ticket_type: editData.ticket_type,
          ticket_number: editData.ticket_number,
          title: editData.title,
          motion_business: editData.motion_business,
          technician_name: editData.technician_name,
          date: editData.date,
          customer: editData.customer,
          depot: editData.depot,
          project: editData.project,
          unit: editData.unit,
          converter_type: editData.converter_type,
          converter_sn: editData.converter_sn,
          first_message_date: editData.first_message_date || null,
          detected_defect: editData.detected_defect,
          failure_classification: editData.failure_classification,
          service_days: editData.service_days || [],
          rework_points: editData.rework_points,
          work_permit: editData.work_permit,
          permit_not_completed_reason: editData.permit_not_completed_reason,
          fault_corrected: editData.fault_corrected,
          replaced_materials: editData.replaced_materials || [],
          repair_location: editData.repair_location,
          conclusion: editData.conclusion,
        })
        .eq('id', editData.id)

      if (error) throw error

      // Update local state
      const updated = { ...selectedReport, ...editData }
      setReports(reports.map(r => r.id === updated.id ? updated : r))
      setSelectedReport(updated)
      setEditing(false)
      setEditData(null)
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // FIX: exportToPDF ahora es completamente async/await.
  // Primero pre-carga TODAS las imágenes y firma en paralelo (Promise.all),
  // y sólo llama a pdf.save() cuando todo está listo.
  const exportToPDF = async () => {
    if (!selectedReport) return
    setExporting(true)

    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = pdf.internal.pageSize.getWidth()
      const H = pdf.internal.pageSize.getHeight()
      const ML = 14, MR = 14, CONTENT_W = W - ML - MR
      let y = 0

      // Pre-load images
      const photoUrls = selectedReport.photo_urls || []
      const [photoBase64Array, signatureBase64] = await Promise.all([
        Promise.all(photoUrls.map(url => loadImageAsBase64(url))),
        selectedReport.signature_url ? loadImageAsBase64(selectedReport.signature_url) : Promise.resolve(null)
      ])

      const addPage = () => { pdf.addPage(); y = 42 }
      const checkY = (needed = 30) => { if (y + needed > H - 16) addPage() }

      // ── Helper: section header band ──────────────────────────────────────
      const section = (title) => {
        checkY(22)
        pdf.setFillColor(240, 240, 240)
        pdf.roundedRect(ML, y, CONTENT_W, 8, 1, 1, 'F')
        pdf.setFontSize(8)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(180, 0, 0)
        pdf.text(title, ML + 3, y + 5.5)
        pdf.setTextColor(0, 0, 0)
        y += 12
      }

      // ── Helper: field pair (label + value) ───────────────────────────────
      const field = (label, value, x = ML, colW = CONTENT_W) => {
        checkY(10)
        pdf.setFontSize(7.5)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(120, 120, 120)
        pdf.text(label.toUpperCase(), x, y)
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(30, 30, 30)
        const lines = pdf.splitTextToSize(value || '—', colW - 2)
        pdf.text(lines, x, y + 4)
        return lines.length * 4.2 + 6
      }

      // ── Helper: two fields side by side ──────────────────────────────────
      const fieldRow = (pairs) => {
        const colW = CONTENT_W / pairs.length
        let maxH = 0
        pairs.forEach(([label, value], i) => {
          const h = field(label, value, ML + i * colW, colW)
          if (h > maxH) maxH = h
        })
        y += maxH
      }

      // ── Helper: separator ────────────────────────────────────────────────
      const sep = (gap = 4) => {
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.3)
        pdf.line(ML, y, W - MR, y)
        y += gap
      }

      // ════════════════════════════════════════════════════════════════════
      // HEADER BAND
      // ════════════════════════════════════════════════════════════════════
      pdf.setFillColor(204, 0, 0)
      pdf.rect(0, 0, W, 28, 'F')

      // ABB logo image
      try {
        pdf.addImage(ABB_LOGO_B64, 'PNG', ML, 4, 28, 16)
      } catch(e) {
        pdf.setFontSize(22)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(255, 255, 255)
        pdf.text('ABB', ML, 18)
      }

      // Report title
      pdf.setFontSize(11)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(255, 220, 220)
      pdf.text('Field Service Report', ML + 22, 18)

      // Top-right info block
      const typeLabel = selectedReport.ticket_type === 'fault' ? 'Fault / Avería'
        : selectedReport.ticket_type === 'ticket' ? 'Ticket' : 'Rework'
      const titleOrNr = selectedReport.ticket_type === 'ticket'
        ? (selectedReport.ticket_number || '—')
        : (selectedReport.title || '—')

      pdf.setFontSize(7.5)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 220, 220)
      pdf.text('TYPE', W - MR - 55, 10)
      pdf.text('REF', W - MR - 25, 10)
      pdf.text('DATE', W - MR, 10, { align: 'right' })
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(255, 255, 255)
      pdf.text(typeLabel, W - MR - 55, 15)
      pdf.text(titleOrNr, W - MR - 25, 15)
      pdf.text(new Date(selectedReport.date).toLocaleDateString('es-ES'), W - MR, 15, { align: 'right' })
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 220, 220)
      pdf.text('TECHNICIAN', W - MR - 55, 21)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(255, 255, 255)
      pdf.text(selectedReport.technician_name || '—', W - MR - 55, 26)

      // White sub-header band
      pdf.setFillColor(250, 250, 250)
      pdf.rect(0, 28, W, 12, 'F')
      pdf.setFontSize(7.5)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(150, 150, 150)
      pdf.text('MOTION BUSINESS', ML, 35)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(50, 50, 50)
      pdf.text(selectedReport.motion_business || '—', ML + 35, 35)

      y = 46

      // ════════════════════════════════════════════════════════════════════
      // AFFECTED PLANT
      // ════════════════════════════════════════════════════════════════════
      section('AFFECTED PLANT')
      fieldRow([['Customer', selectedReport.customer], ['Depot', selectedReport.depot]])
      fieldRow([['Project', selectedReport.project], ['Vehicle #', selectedReport.unit]])
      sep()

      // ════════════════════════════════════════════════════════════════════
      // CONVERTER
      // ════════════════════════════════════════════════════════════════════
      section('CONVERTER INFORMATION')
      fieldRow([['Converter Type', selectedReport.converter_type], ['Serial Number', selectedReport.converter_sn]])
      sep()

      // ════════════════════════════════════════════════════════════════════
      // FAILURE DESCRIPTION
      // ════════════════════════════════════════════════════════════════════
      section('FAILURE DESCRIPTION')
      if (selectedReport.first_message_date) {
        fieldRow([['First Message Date', new Date(selectedReport.first_message_date).toLocaleString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})], ['Failure Classification', selectedReport.failure_classification]])
      } else if (selectedReport.failure_classification) {
        fieldRow([['Failure Classification', selectedReport.failure_classification]])
      }
      checkY(20)
      pdf.setFontSize(7.5)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(120, 120, 120)
      pdf.text('DETECTED DEFECT / ERROR CAUSED BY', ML, y)
      y += 4
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(30, 30, 30)
      const defectLines = pdf.splitTextToSize(selectedReport.detected_defect || '—', CONTENT_W)
      checkY(defectLines.length * 4.5 + 4)
      pdf.text(defectLines, ML, y)
      y += defectLines.length * 4.5 + 4
      sep()

      // ════════════════════════════════════════════════════════════════════
      // SERVICE TIMES
      // ════════════════════════════════════════════════════════════════════
      const serviceDays = selectedReport.service_days || []
      if (serviceDays.length > 0) {
        section('SERVICE TIMES')
        serviceDays.forEach((day, i) => {
          checkY(8)
          pdf.setFontSize(8)
          pdf.setFont(undefined, 'bold')
          pdf.setTextColor(180, 0, 0)
          pdf.text('Day ' + (i + 1), ML, y)
          pdf.setFont(undefined, 'normal')
          pdf.setTextColor(30, 30, 30)
          const parts = day.date ? day.date.split('-') : null
          const dateStr = parts && parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : '—'
          pdf.text(dateStr + '   ' + (day.start_time || '—') + ' → ' + (day.end_time || '—'), ML + 15, y)
          y += 6
        })
        sep()
      }

      // ════════════════════════════════════════════════════════════════════
      // EXECUTED WORK
      // ════════════════════════════════════════════════════════════════════
      section('EXECUTED WORK')
      checkY(20)
      pdf.setFontSize(7.5)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(120, 120, 120)
      pdf.text('WORK PERFORMED', ML, y)
      y += 4
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(30, 30, 30)
      const workLines = pdf.splitTextToSize(selectedReport.rework_points || '—', CONTENT_W)
      checkY(workLines.length * 4.5 + 4)
      pdf.text(workLines, ML, y)
      y += workLines.length * 4.5 + 5

      // Work permit + fault corrected pills
      const fcColors = { yes: [46,125,50], no: [198,40,40], pending: [230,119,0] }
      const fcLabels = { yes: 'YES', no: 'NO', pending: 'PENDING' }
      const fc = selectedReport.fault_corrected || 'yes'
      const wp = selectedReport.work_permit || 'yes'

      checkY(14)
      pdf.setFillColor(245, 245, 245)
      pdf.roundedRect(ML, y, CONTENT_W, 10, 2, 2, 'F')
      pdf.setFontSize(7)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(120, 120, 120)
      pdf.text('WORK PERMIT', ML + 3, y + 4)
      pdf.text('FAULT CORRECTED', ML + 55, y + 4)
      pdf.setTextColor(...(fcColors[wp] || fcColors.yes))
      pdf.text(fcLabels[wp] || 'YES', ML + 3, y + 8.5)
      pdf.setTextColor(...(fcColors[fc] || fcColors.yes))
      pdf.text(fcLabels[fc] || 'YES', ML + 55, y + 8.5)
      pdf.setTextColor(0, 0, 0)
      y += 14

      if (selectedReport.work_permit === 'no' && selectedReport.permit_not_completed_reason) {
        checkY(10)
        pdf.setFontSize(7.5)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(120, 120, 120)
        pdf.text('REASON PERMIT NOT COMPLETED', ML, y)
        y += 4
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(30, 30, 30)
        const reasonLines = pdf.splitTextToSize(selectedReport.permit_not_completed_reason, CONTENT_W)
        pdf.text(reasonLines, ML, y)
        y += reasonLines.length * 4.2 + 4
      }
      sep()

      // ════════════════════════════════════════════════════════════════════
      // REPLACED MATERIALS
      // ════════════════════════════════════════════════════════════════════
      const materials = selectedReport.replaced_materials || []
      if (materials.length > 0) {
        section('REPLACED MATERIALS')
        materials.forEach((mat, idx) => {
          checkY(20)
          // Card background
          pdf.setFillColor(248, 248, 252)
          pdf.roundedRect(ML, y, CONTENT_W, 16, 2, 2, 'F')
          pdf.setDrawColor(103, 100, 246)
          pdf.setLineWidth(0.6)
          pdf.line(ML, y, ML, y + 16)
          pdf.setLineWidth(0.3)
          pdf.setDrawColor(220, 220, 220)

          pdf.setFontSize(7.5)
          pdf.setFont(undefined, 'bold')
          pdf.setTextColor(103, 100, 246)
          pdf.text('MATERIAL ' + (idx + 1), ML + 3, y + 5)

          const halfW = (CONTENT_W - 4) / 2
          pdf.setFont(undefined, 'bold')
          pdf.setTextColor(120, 120, 120)
          pdf.text('OLD', ML + 3, y + 10)
          pdf.text('NEW', ML + 3 + halfW, y + 10)
          pdf.setFont(undefined, 'normal')
          pdf.setTextColor(30, 30, 30)
          pdf.text('Nr: ' + (mat.material_number_old || '—') + '   SN: ' + (mat.serial_number_old || '—'), ML + 10, y + 10)
          pdf.text('Nr: ' + (mat.material_number_new || '—') + '   SN: ' + (mat.serial_number_new || '—'), ML + 10 + halfW, y + 10)

          y += 20
        })
        sep()
      }

      // ════════════════════════════════════════════════════════════════════
      // SERVICE CONFIRMATION
      // ════════════════════════════════════════════════════════════════════
      section('SERVICE CONFIRMATION')
      fieldRow([
        ['Repair Date', new Date(selectedReport.date).toLocaleDateString('es-ES')],
        ['Repair Location', selectedReport.repair_location]
      ])
      if (selectedReport.conclusion) {
        checkY(14)
        pdf.setFontSize(7.5)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(120, 120, 120)
        pdf.text('CONCLUSION', ML, y)
        y += 4
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(30, 30, 30)
        const conclusionLines = pdf.splitTextToSize(selectedReport.conclusion, CONTENT_W)
        checkY(conclusionLines.length * 4.5)
        pdf.text(conclusionLines, ML, y)
        y += conclusionLines.length * 4.5 + 4
      }
      sep()

      // ════════════════════════════════════════════════════════════════════
      // PICTURES
      // ════════════════════════════════════════════════════════════════════
      if (photoBase64Array.length > 0) {
        section('PICTURES')
        let imgX = ML
        let rowH = 0
        for (let i = 0; i < photoBase64Array.length; i++) {
          const base64 = photoBase64Array[i]
          if (!base64) continue
          const imgW = (CONTENT_W - 4) / 2
          const imgH = imgW * 0.75
          if (i % 2 === 0) {
            checkY(imgH + 4)
            imgX = ML
            rowH = imgH
          } else {
            imgX = ML + imgW + 4
          }
          try {
            pdf.addImage(base64, 'JPEG', imgX, y, imgW, imgH)
          } catch (e) { console.log('photo err', e) }
          if (i % 2 === 1 || i === photoBase64Array.length - 1) {
            y += rowH + 4
          }
        }
        sep()
      }

      // ════════════════════════════════════════════════════════════════════
      // SIGNATURE
      // ════════════════════════════════════════════════════════════════════
      checkY(45)
      section('SIGNATURE OF SERVICE ENGINEER')
      fieldRow([['Service Engineer', selectedReport.technician_name], ['Date', new Date(selectedReport.date).toLocaleDateString('es-ES')]])

      if (signatureBase64) {
        checkY(32)
        pdf.setDrawColor(220, 220, 220)
        pdf.setLineWidth(0.3)
        pdf.roundedRect(ML, y, 70, 28, 2, 2, 'S')
        try {
          pdf.addImage(signatureBase64, 'PNG', ML + 2, y + 2, 66, 24)
        } catch (e) { console.log('sig err', e) }
        y += 32
      }

      // ── Page numbers footer ───────────────────────────────────────────
      const totalPages = pdf.internal.getNumberOfPages()
      for (let p = 1; p <= totalPages; p++) {
        pdf.setPage(p)
        pdf.setFontSize(7)
        pdf.setFont(undefined, 'normal')
        pdf.setTextColor(180, 180, 180)
        pdf.text('ABB Field Service Report  |  Page ' + p + ' of ' + totalPages, W / 2, H - 6, { align: 'center' })
        pdf.setDrawColor(204, 0, 0)
        pdf.setLineWidth(0.5)
        pdf.line(ML, H - 10, W - MR, H - 10)
      }

      const ref = selectedReport.ticket_type === 'ticket'
        ? (selectedReport.ticket_number || 'FSR')
        : (selectedReport.title || 'FSR')
      const fileName = 'ABB_FSR_' + ref.replace(/\s+/g, '_') + '_' + new Date(selectedReport.date).toLocaleDateString('es-ES').replace(/\//g, '-') + '.pdf'
      pdf.save(fileName)

    } catch (error) {
      console.error('PDF Error:', error)
      alert('Error generating PDF: ' + error.message)
    } finally {
      setExporting(false)
    }
  }

  const printReport = () => {
    if (!selectedReport) return

    const materials = selectedReport.replaced_materials || []
    let materialsHTML = ''
    if (materials.length > 0) {
      materialsHTML = '<h3>REPLACED MATERIALS</h3>'
      materials.forEach((material, idx) => {
        materialsHTML += `<div style="margin-bottom:12px;padding:10px;background:#f5f5f5;border-radius:5px;border-left:3px solid #CC0000">
          <b>Material ${idx + 1}:</b><br>
          <b>Old:</b> Nr: ${material.material_number_old || '—'} | SN: ${material.serial_number_old || '—'}<br>
          <b>New:</b> Nr: ${material.material_number_new || '—'} | SN: ${material.serial_number_new || '—'}
        </div>`
      })
    }

    const photosHTML = (selectedReport.photo_urls || []).length > 0
      ? '<h3>PICTURES</h3>' + selectedReport.photo_urls.map(url =>
          `<img src="${url}" style="max-width:380px;margin:8px 0;border:1px solid #ccc;border-radius:4px;display:block">`
        ).join('')
      : ''

    const signatureHTML = selectedReport.signature_url
      ? `<h3>SIGNATURE</h3><img src="${selectedReport.signature_url}" style="max-width:220px;border:1px solid #ccc;border-radius:4px">`
      : ''

    const printWindow = window.open('', '', 'height=900,width=1000')
    printWindow.document.write(`
      <html><head><title>Field Service Report - ${selectedReport.ticket_number || ''}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:30px;line-height:1.5;font-size:10pt;color:#222}
        h2{color:#CC0000;font-size:15pt;margin:0 0 4px 0}
        h3{color:#CC0000;font-size:11pt;margin:18px 0 8px 0;border-bottom:1px solid #eee;padding-bottom:4px}
        p{margin:4px 0}
        b{font-weight:600}
        .meta{color:#555;font-size:9pt;margin-bottom:20px}
        @media print{body{margin:15px}}
      </style></head><body>
      <h2>FIELD SERVICE REPORT</h2>
      <p class="meta">Ticket Nr: <b>${selectedReport.ticket_number || '—'}</b> &nbsp;|&nbsp; Motion Business: <b>${selectedReport.motion_business || '—'}</b> &nbsp;|&nbsp; Date: <b>${new Date(selectedReport.date).toLocaleDateString()}</b></p>
      <h3>AFFECTED PLANT</h3>
      <p><b>Customer:</b> ${selectedReport.customer} &nbsp;&nbsp; <b>Depot:</b> ${selectedReport.depot}</p>
      <p><b>Project:</b> ${selectedReport.project} &nbsp;&nbsp; <b>Vehicle #:</b> ${selectedReport.unit}</p>
      <h3>CONVERTER</h3>
      <p><b>Type:</b> ${selectedReport.converter_type || '—'}</p>
      <p><b>SN:</b> ${selectedReport.converter_sn || '—'}</p>
      <h3>FAILURE DESCRIPTION</h3>
      <p><b>Detected Defect:</b><br>${(selectedReport.detected_defect || '').replace(/\n/g,'<br>')}</p>
      <p><b>Failure Classification:</b> ${selectedReport.failure_classification || '—'}</p>
      <h3>SERVICE TIMES</h3>
      <p><b>Start:</b> ${selectedReport.start_time || '—'} &nbsp;→&nbsp; <b>End:</b> ${selectedReport.end_time || '—'}</p>
      <h3>EXECUTED WORK</h3>
      <p>${(selectedReport.rework_points || '').replace(/\n/g,'<br>')}</p>
      <p><b>Fault Corrected:</b> ${(selectedReport.fault_corrected || 'yes').toUpperCase()}</p>
      ${materialsHTML}
      <h3>SERVICE CONFIRMATION</h3>
      <p><b>Repair Date:</b> ${new Date(selectedReport.date).toLocaleDateString()} &nbsp;&nbsp; <b>Location:</b> ${selectedReport.repair_location || '—'}</p>
      <h3>CONCLUSION</h3>
      <p>${(selectedReport.conclusion || '—').replace(/\n/g,'<br>')}</p>
      ${photosHTML}
      ${signatureHTML}
      <h3>SERVICE ENGINEER</h3>
      <p><b>${selectedReport.technician_name}</b></p>
      </body></html>
    `)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 300)
  }

  if (loading) return <div className="loading">Loading reports...</div>

  return (
    <div className="view-reports">
      {reports.length === 0 ? (
        <p className="no-reports">No reports saved yet</p>
      ) : (
        <>
          <div className="reports-list">
            {reports.map(report => (
              <div
                key={report.id}
                className={`report-item ${selectedReport?.id === report.id ? 'active' : ''}`}
                onClick={() => setSelectedReport(report)}
              >
                <h3>{report.ticket_number || 'Report'}</h3>
                <p>{report.customer}</p>
                <p>{report.unit}</p>
                <p className="report-date">{new Date(report.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          {selectedReport && (
            <div className="report-detail">
              <div className="detail-header">
                <h2>{selectedReport.ticket_number || 'Field Service Report'}</h2>
                <button onClick={() => setSelectedReport(null)} className="close-btn">✕</button>
              </div>

              <div className="detail-body">
                {!editing ? (
                  <>
                    <div className="export-buttons">
                      <button onClick={exportToPDF} disabled={exporting} className="export-btn pdf-btn">
                        {exporting ? '⏳ Generando...' : '📄 Export PDF'}
                      </button>
                      <button onClick={printReport} disabled={exporting} className="export-btn print-btn">
                        🖨️ Print
                      </button>
                      <button onClick={startEdit} className="export-btn edit-btn">
                        ✏️ Editar
                      </button>
                    </div>

                    <div className="detail-section">
                      <h4>HEADER</h4>
                      <p><b>Type:</b> {selectedReport.ticket_type === 'fault' ? 'Fault / Avería' : selectedReport.ticket_type === 'ticket' ? 'Ticket' : 'Rework'}</p>
                      {selectedReport.ticket_type === 'ticket'
                        ? <p><b>Ticket Nr:</b> {selectedReport.ticket_number}</p>
                        : <p><b>Title:</b> {selectedReport.title || '—'}</p>}
                      <p><b>Motion Business:</b> {selectedReport.motion_business}</p>
                      <p><b>Date:</b> {new Date(selectedReport.date).toLocaleDateString()}</p>
                      <p><b>Technician:</b> {selectedReport.technician_name}</p>
                    </div>

                    <div className="detail-section">
                      <h4>AFFECTED PLANT</h4>
                      <p><b>Customer:</b> {selectedReport.customer}</p>
                      <p><b>Depot:</b> {selectedReport.depot}</p>
                      <p><b>Project:</b> {selectedReport.project}</p>
                      <p><b>Vehicle #:</b> {selectedReport.unit}</p>
                    </div>

                    <div className="detail-section">
                      <h4>CONVERTER</h4>
                      <p><b>Type:</b> {selectedReport.converter_type}</p>
                      <p><b>SN:</b> {selectedReport.converter_sn}</p>
                    </div>

                    <div className="detail-section">
                      <h4>SERVICE TIMES</h4>
                      {selectedReport.service_days && selectedReport.service_days.length > 0 ? (
                        selectedReport.service_days.map((day, idx) => (
                          <div key={idx} className="material-display">
                            <p><b>Day {idx + 1}:</b> {day.date} &nbsp;|&nbsp; {day.start_time || '—'} → {day.end_time || '—'}</p>
                          </div>
                        ))
                      ) : (
                        <p>No service days recorded</p>
                      )}
                    </div>

                    <div className="detail-section">
                      <h4>DETECTED DEFECT</h4>
                      <p style={{whiteSpace: 'pre-wrap'}}>{selectedReport.detected_defect}</p>
                    </div>

                    <div className="detail-section">
                      <h4>EXECUTED WORK</h4>
                      <p style={{whiteSpace: 'pre-wrap'}}>{selectedReport.rework_points}</p>
                      <p style={{marginTop: '8px'}}><b>Work Permit Completed:</b> {(selectedReport.work_permit || 'yes').toUpperCase()}</p>
                      {selectedReport.work_permit === 'no' && selectedReport.permit_not_completed_reason && (
                        <p style={{marginTop: '4px'}}><b>Reason:</b> {selectedReport.permit_not_completed_reason}</p>
                      )}
                      <p style={{marginTop: '8px'}}><b>Fault Corrected:</b> {(selectedReport.fault_corrected || 'yes').toUpperCase()}</p>
                    </div>

                    {selectedReport.replaced_materials && selectedReport.replaced_materials.length > 0 && (
                      <div className="detail-section">
                        <h4>REPLACED MATERIALS</h4>
                        {selectedReport.replaced_materials.map((material, idx) => (
                          <div key={idx} className="material-display">
                            <p><b>Material {idx + 1}</b></p>
                            <p><b>Old:</b> Nr: {material.material_number_old} | SN: {material.serial_number_old}</p>
                            <p><b>New:</b> Nr: {material.material_number_new} | SN: {material.serial_number_new}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="detail-section">
                      <h4>CONCLUSION</h4>
                      <p style={{whiteSpace: 'pre-wrap'}}>{selectedReport.conclusion}</p>
                    </div>

                    {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                      <div className="detail-section">
                        <h4>PICTURES ({selectedReport.photo_urls.length})</h4>
                        <div className="photo-grid">
                          {selectedReport.photo_urls.map((url, idx) => (
                            <img key={idx} src={url} alt={`Photo ${idx + 1}`} />
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedReport.signature_url && (
                      <div className="detail-section">
                        <h4>SIGNATURE</h4>
                        <img src={selectedReport.signature_url} alt="Signature" style={{maxWidth: '260px', background: '#fff', padding: '8px', borderRadius: '4px'}} />
                      </div>
                    )}

                    <button onClick={() => deleteReport(selectedReport.id)} className="delete-btn">
                      🗑️ Delete Report
                    </button>
                  </>
                ) : (
                  <div className="edit-form">
                    <div className="edit-section">
                      <h4>HEADER</h4>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Service Type</label>
                          <select style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="ticket_type" value={editData.ticket_type || 'rework'} onChange={handleEditChange}>
                            <option value="rework">Rework</option>
                            <option value="fault">Fault / Avería</option>
                            <option value="ticket">Ticket</option>
                          </select>
                        </div>
                        {editData.ticket_type === 'ticket' ? (
                          <div className="edit-group">
                            <label>Ticket Nr</label>
                            <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="ticket_number" value={editData.ticket_number || ''} onChange={handleEditChange} />
                          </div>
                        ) : (
                          <div className="edit-group">
                            <label>Title</label>
                            <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="title" value={editData.title || ''} onChange={handleEditChange} />
                          </div>
                        )}
                      </div>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Motion Business</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="motion_business" value={editData.motion_business || ''} onChange={handleEditChange} />
                        </div>
                        <div className="edit-group">
                          <label>Technician</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="technician_name" value={editData.technician_name || ''} onChange={handleEditChange} />
                        </div>
                      </div>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Date</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} type="date" name="date" value={editData.date || ''} onChange={handleEditChange} />
                        </div>
                        <div className="edit-group">
                          <label>First Message Date</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} type="datetime-local" name="first_message_date" value={editData.first_message_date || ''} onChange={handleEditChange} />
                        </div>
                      </div>
                    </div>

                    <div className="edit-section">
                      <h4>AFFECTED PLANT</h4>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Customer</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="customer" value={editData.customer || ''} onChange={handleEditChange} />
                        </div>
                        <div className="edit-group">
                          <label>Depot</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="depot" value={editData.depot || ''} onChange={handleEditChange} />
                        </div>
                      </div>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Project</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="project" value={editData.project || ''} onChange={handleEditChange} />
                        </div>
                        <div className="edit-group">
                          <label>Vehicle #</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="unit" value={editData.unit || ''} onChange={handleEditChange} />
                        </div>
                      </div>
                    </div>

                    <div className="edit-section">
                      <h4>CONVERTER</h4>
                      <div className="edit-row">
                        <div className="edit-group">
                          <label>Type</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="converter_type" value={editData.converter_type || ''} onChange={handleEditChange} />
                        </div>
                        <div className="edit-group">
                          <label>SN</label>
                          <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="converter_sn" value={editData.converter_sn || ''} onChange={handleEditChange} />
                        </div>
                      </div>
                    </div>

                    <div className="edit-section">
                      <h4>FAILURE DESCRIPTION</h4>
                      <div className="edit-group">
                        <label>Detected Defect</label>
                        <textarea style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="detected_defect" value={editData.detected_defect || ''} onChange={handleEditChange} rows="4" />
                      </div>
                      <div className="edit-group" style={{marginTop:'12px'}}>
                        <label>Failure Classification</label>
                        <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="failure_classification" value={editData.failure_classification || ''} onChange={handleEditChange} />
                      </div>
                    </div>

                    <div className="edit-section">
                      <h4>SERVICE TIMES</h4>
                      {(editData.service_days || []).map((day, idx) => (
                        <div key={idx} className="edit-service-day">
                          <div className="edit-service-day-header">
                            <span>Day {idx + 1}</span>
                            <button type="button" onClick={() => removeEditServiceDay(idx)} className="remove-day-btn">Remove</button>
                          </div>
                          <div className="edit-row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                            <div className="edit-group">
                              <label>Date</label>
                              <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} type="date" value={day.date || ''} onChange={e => handleEditServiceDayChange(idx, 'date', e.target.value)} />
                            </div>
                            <div className="edit-group">
                              <label>Start Time</label>
                              <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} type="time" value={day.start_time || ''} onChange={e => handleEditServiceDayChange(idx, 'start_time', e.target.value)} />
                            </div>
                            <div className="edit-group">
                              <label>End Time</label>
                              <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} type="time" value={day.end_time || ''} onChange={e => handleEditServiceDayChange(idx, 'end_time', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addEditServiceDay} className="add-day-btn">+ Add Day</button>
                    </div>

                    <div className="edit-section">
                      <h4>EXECUTED WORK</h4>
                      <div className="edit-group">
                        <label>Work Points</label>
                        <textarea style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="rework_points" value={editData.rework_points || ''} onChange={handleEditChange} rows="6" />
                      </div>
                      <div className="edit-row" style={{marginTop:'12px'}}>
                        <div className="edit-group">
                          <label>Work Permit Completed?</label>
                          <select style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="work_permit" value={editData.work_permit || 'yes'} onChange={handleEditChange}>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        <div className="edit-group">
                          <label>Fault Corrected?</label>
                          <select style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="fault_corrected" value={editData.fault_corrected || 'yes'} onChange={handleEditChange}>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="pending">Pending</option>
                          </select>
                        </div>
                      </div>
                      {editData.work_permit === 'no' && (
                        <div className="edit-group" style={{marginTop:'12px'}}>
                          <label>Reason permit not completed</label>
                          <textarea style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="permit_not_completed_reason" value={editData.permit_not_completed_reason || ''} onChange={handleEditChange} rows="3" />
                        </div>
                      )}
                    </div>

                    <div className="edit-section">
                      <h4>REPLACED MATERIALS</h4>
                      {(editData.replaced_materials || []).map((mat, idx) => (
                        <div key={idx} className="edit-material-card">
                          <div className="edit-material-header">
                            <span>Material {idx + 1}</span>
                            <button type="button" onClick={() => removeEditMaterial(idx)} className="remove-day-btn">Remove</button>
                          </div>
                          <div className="edit-material-cols">
                            <div className="edit-material-col">
                              <p className="edit-material-col-title">Old</p>
                              <div className="edit-group">
                                <label>Material Nr</label>
                                <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} value={mat.material_number_old || ''} onChange={e => handleEditMaterialChange(idx, 'material_number_old', e.target.value)} placeholder="e.g. 3BHE057391R002" />
                              </div>
                              <div className="edit-group">
                                <label>Serial Nr</label>
                                <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} value={mat.serial_number_old || ''} onChange={e => handleEditMaterialChange(idx, 'serial_number_old', e.target.value)} placeholder="e.g. 106" />
                              </div>
                            </div>
                            <div className="edit-material-col">
                              <p className="edit-material-col-title">New</p>
                              <div className="edit-group">
                                <label>Material Nr</label>
                                <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} value={mat.material_number_new || ''} onChange={e => handleEditMaterialChange(idx, 'material_number_new', e.target.value)} placeholder="e.g. 3BHE057391R002" />
                              </div>
                              <div className="edit-group">
                                <label>Serial Nr</label>
                                <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} value={mat.serial_number_new || ''} onChange={e => handleEditMaterialChange(idx, 'serial_number_new', e.target.value)} placeholder="e.g. 58" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addEditMaterial} className="add-day-btn" style={{background:'linear-gradient(135deg,#4CAF50,#45a049)'}}>+ Add Material</button>
                    </div>

                    <div className="edit-section">
                      <h4>SERVICE CONFIRMATION</h4>
                      <div className="edit-group">
                        <label>Repair Location</label>
                        <input style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="repair_location" value={editData.repair_location || ''} onChange={handleEditChange} />
                      </div>
                    </div>

                    <div className="edit-section">
                      <h4>CONCLUSION</h4>
                      <div className="edit-group">
                        <label>Notes</label>
                        <textarea style={{backgroundColor:'#fff',color:'#333',colorScheme:'light'}} name="conclusion" value={editData.conclusion || ''} onChange={handleEditChange} rows="3" />
                      </div>
                    </div>

                    <div className="edit-actions">
                      <button onClick={cancelEdit} className="cancel-edit-btn">Cancel</button>
                      <button onClick={saveEdit} disabled={saving} className="save-edit-btn">
                        {saving ? '💾 Saving...' : '💾 Save Changes'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
