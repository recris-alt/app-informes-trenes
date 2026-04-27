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

      // ABB logo text
      pdf.setFontSize(22)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 255, 255)
      pdf.text('ABB', ML, 18)

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
        fieldRow([['First Message Date', new Date(selectedReport.first_message_date).toLocaleString('es-ES')], ['Failure Classification', selectedReport.failure_classification]])
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
          const dateStr = day.date ? day.date.split('-').reverse().join('/') : '—'
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
