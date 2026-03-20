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

  // FIX: exportToPDF ahora es completamente async/await.
  // Primero pre-carga TODAS las imágenes y firma en paralelo (Promise.all),
  // y sólo llama a pdf.save() cuando todo está listo.
  const exportToPDF = async () => {
    if (!selectedReport) return
    setExporting(true)

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let y = 10

      // --- Pre-load all images in parallel BEFORE building PDF ---
      const photoUrls = selectedReport.photo_urls || []
      const [photoBase64Array, signatureBase64] = await Promise.all([
        Promise.all(photoUrls.map(url => loadImageAsBase64(url))),
        selectedReport.signature_url ? loadImageAsBase64(selectedReport.signature_url) : Promise.resolve(null)
      ])

      const addPageIfNeeded = (neededSpace = 40) => {
        if (y > pageHeight - neededSpace) {
          pdf.addPage()
          y = 15
        }
      }

      const drawLine = () => {
        pdf.setLineWidth(0.4)
        pdf.line(15, y, pageWidth - 15, y)
        y += 5
      }

      const sectionTitle = (title) => {
        addPageIfNeeded(20)
        pdf.setFontSize(10)
        pdf.setFont(undefined, 'bold')
        pdf.setTextColor(204, 0, 0)
        pdf.text(title, 15, y)
        pdf.setTextColor(0, 0, 0)
        y += 7
      }

      // HEADER
      pdf.setFontSize(22)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(204, 0, 0)
      pdf.text('ABB', 15, y)

      pdf.setFontSize(13)
      pdf.setTextColor(50, 50, 50)
      pdf.text('Field Service Report', 35, y)

      pdf.setFontSize(9)
      pdf.setTextColor(80, 80, 80)
      pdf.text('Motion Business: ' + (selectedReport.motion_business || '—'), 140, y)
      pdf.text('Ticket Nr: ' + (selectedReport.ticket_number || '—'), 140, y + 5)
      pdf.text('Date: ' + new Date(selectedReport.date).toLocaleDateString(), 140, y + 10)
      pdf.setTextColor(0, 0, 0)

      y += 18
      drawLine()

      // AFFECTED PLANT
      sectionTitle('AFFECTED PLANT')
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('Customer:', 15, y)
      pdf.text(selectedReport.customer || '—', 45, y)
      pdf.text('Depot:', 110, y)
      pdf.text(selectedReport.depot || '—', 130, y)
      y += 6
      pdf.text('Project:', 15, y)
      pdf.text(selectedReport.project || '—', 45, y)
      pdf.text('Vehicle #:', 110, y)
      pdf.text(selectedReport.unit || '—', 130, y)
      y += 8
      drawLine()

      // CONVERTER
      sectionTitle('CONVERTER INFORMATION')
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('Type:', 15, y)
      const converterTypeLines = pdf.splitTextToSize(selectedReport.converter_type || '—', 150)
      pdf.text(converterTypeLines, 45, y)
      y += converterTypeLines.length * 5 + 2
      pdf.text('SN:', 15, y)
      pdf.text(selectedReport.converter_sn || '—', 45, y)
      y += 8
      drawLine()

      // FAILURE DESCRIPTION
      sectionTitle('FAILURE DESCRIPTION')
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')

      if (selectedReport.first_message_date) {
        pdf.text('First Message Date:', 15, y)
        pdf.text(new Date(selectedReport.first_message_date).toLocaleString(), 60, y)
        y += 6
      }

      pdf.setFont(undefined, 'bold')
      pdf.text('Detected Defect / Error Caused by:', 15, y)
      y += 5
      pdf.setFont(undefined, 'normal')
      const defectLines = pdf.splitTextToSize(selectedReport.detected_defect || '—', 170)
      pdf.text(defectLines, 15, y)
      y += defectLines.length * 4.5 + 4

      if (selectedReport.failure_classification) {
        pdf.setFont(undefined, 'bold')
        pdf.text('Failure Classification:', 15, y)
        y += 5
        pdf.setFont(undefined, 'normal')
        pdf.text(selectedReport.failure_classification, 15, y)
        y += 6
      }
      drawLine()

      // EXECUTED WORK
      sectionTitle('EXECUTED WORK')
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')

      if (selectedReport.start_time || selectedReport.end_time) {
        pdf.text('Service Times:', 15, y)
        pdf.text((selectedReport.start_time || '—') + '  →  ' + (selectedReport.end_time || '—'), 50, y)
        y += 6
      }

      const workLines = pdf.splitTextToSize(selectedReport.rework_points || '—', 170)
      pdf.text(workLines, 15, y)
      y += workLines.length * 4.5 + 4

      pdf.setFont(undefined, 'bold')
      pdf.text('Fault Corrected: ', 15, y)
      pdf.setFont(undefined, 'normal')
      pdf.text((selectedReport.fault_corrected || 'yes').toUpperCase(), 55, y)
      y += 8
      drawLine()

      // REPLACED MATERIAL
      const materials = selectedReport.replaced_materials || []
      if (materials.length > 0) {
        sectionTitle('REPLACED MATERIAL')
        materials.forEach((mat, idx) => {
          addPageIfNeeded(30)
          pdf.setFontSize(9)
          pdf.setFont(undefined, 'bold')
          pdf.text('Material ' + (idx + 1), 15, y)
          y += 5
          pdf.setFont(undefined, 'normal')
          pdf.text('Old — Nr: ' + (mat.material_number_old || '—') + '  |  SN: ' + (mat.serial_number_old || '—'), 15, y)
          y += 5
          pdf.text('New — Nr: ' + (mat.material_number_new || '—') + '  |  SN: ' + (mat.serial_number_new || '—'), 15, y)
          y += 8
        })
        drawLine()
      }

      // SERVICE CONFIRMATION
      sectionTitle('SERVICE CONFIRMATION')
      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('Repair Date:', 15, y)
      pdf.text(new Date(selectedReport.date).toLocaleDateString(), 50, y)
      pdf.text('Repair Location:', 100, y)
      pdf.text(selectedReport.repair_location || '—', 135, y)
      y += 8

      if (selectedReport.conclusion) {
        pdf.setFont(undefined, 'bold')
        pdf.text('Conclusion:', 15, y)
        y += 5
        pdf.setFont(undefined, 'normal')
        const conclusionLines = pdf.splitTextToSize(selectedReport.conclusion, 170)
        pdf.text(conclusionLines, 15, y)
        y += conclusionLines.length * 4.5 + 5
      }
      drawLine()

      // PICTURES — now loaded correctly before pdf.save()
      if (photoBase64Array.length > 0) {
        sectionTitle('PICTURES')
        for (const base64 of photoBase64Array) {
          if (!base64) continue
          addPageIfNeeded(70)
          try {
            pdf.addImage(base64, 'JPEG', 15, y, 85, 65)
            y += 70
          } catch (err) {
            console.log('Could not embed photo:', err)
          }
        }
        drawLine()
      }

      // SIGNATURE — now loaded correctly before pdf.save()
      addPageIfNeeded(50)
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(204, 0, 0)
      pdf.text('SIGNATURE OF SERVICE ENGINEER', 15, y)
      pdf.setTextColor(0, 0, 0)
      y += 8

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('Service Engineer:', 15, y)
      pdf.text(selectedReport.technician_name || '—', 55, y)
      pdf.text('Date:', 120, y)
      pdf.text(new Date(selectedReport.date).toLocaleDateString(), 133, y)
      y += 10

      if (signatureBase64) {
        try {
          pdf.addImage(signatureBase64, 'PNG', 15, y, 65, 28)
          y += 32
        } catch (err) {
          console.log('Could not embed signature:', err)
        }
      }

      // SAVE — called only after all images are embedded
      const fileName = 'Report_' + (selectedReport.ticket_number || 'FSR') + '_' + Date.now() + '.pdf'
      pdf.save(fileName)
    } catch (error) {
      console.error('PDF Error:', error)
      alert('Error al generar el PDF: ' + error.message)
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
                <div className="export-buttons">
                  <button onClick={exportToPDF} disabled={exporting} className="export-btn pdf-btn">
                    {exporting ? '⏳ Generando...' : '📄 Export PDF'}
                  </button>
                  <button onClick={printReport} disabled={exporting} className="export-btn print-btn">
                    🖨️ Print
                  </button>
                </div>

                <div className="detail-section">
                  <h4>HEADER</h4>
                  <p><b>Ticket Nr:</b> {selectedReport.ticket_number}</p>
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
                  <p><b>Start:</b> {selectedReport.start_time} &nbsp;→&nbsp; <b>End:</b> {selectedReport.end_time}</p>
                </div>

                <div className="detail-section">
                  <h4>DETECTED DEFECT</h4>
                  <p style={{whiteSpace: 'pre-wrap'}}>{selectedReport.detected_defect}</p>
                </div>

                <div className="detail-section">
                  <h4>EXECUTED WORK</h4>
                  <p style={{whiteSpace: 'pre-wrap'}}>{selectedReport.rework_points}</p>
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
