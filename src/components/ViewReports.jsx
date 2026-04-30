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
        pdf.addImage(ABB_LOGO_B64, 'PNG', ML, 2, 22, 22)
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
      pdf.text('Field Service Report', ML + 28, 18)

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
