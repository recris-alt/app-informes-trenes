import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { jsPDF } from 'jspdf'
import '../styles/ViewReports.css'

export default function ViewReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState(null)
  const [exporting, setExporting] = useState(false)

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
      let yPosition = 15

      pdf.setFontSize(14)
      pdf.setTextColor(255, 0, 15)
      pdf.text('INFORME DE REWORK - ABB', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8

      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text('Field Service Report', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8

      pdf.setDrawColor(255, 0, 15)
      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 8

      if (selectedReport.ticket_number) {
        pdf.setFontSize(10)
        pdf.setTextColor(0, 0, 0)
        pdf.setFont(undefined, 'bold')
        const ticketText = 'Ticket: ' + selectedReport.ticket_number
        pdf.text(ticketText, 15, yPosition)
        yPosition += 7
      }

      pdf.setFontSize(9)
      pdf.setTextColor(0, 0, 0)

      const sections = [
        { title: 'INFORMACIÓN GENERAL', items: [
          ['Técnico', selectedReport.technician_name],
          ['Fecha', new Date(selectedReport.date).toLocaleDateString('es-ES')],
          ['Cliente', selectedReport.customer],
          ['Depósito', selectedReport.depot],
          ['Proyecto', selectedReport.project]
        ]},
        { title: 'EQUIPO', items: [
          ['Unidad', selectedReport.unit],
          ['Nº Convertidor', selectedReport.converter_number],
          ...(selectedReport.material_number ? [['Material Nr', selectedReport.material_number]] : [])
        ]},
        { title: 'DESCRIPCIÓN DEL TRABAJO', items: [
          ['Defecto Detectado', selectedReport.detected_defect],
          ['Rework Ejecutado', selectedReport.rework_name],
          ['Puntos Ejecutados', selectedReport.rework_points],
          ...(selectedReport.comments ? [['Observaciones', selectedReport.comments]] : [])
        ]}
      ]

      let currentY = yPosition

      sections.forEach((section) => {
        if (currentY > pageHeight - 40) {
          pdf.addPage()
          currentY = 15
        }

        pdf.setFont(undefined, 'bold')
        pdf.setFillColor(240, 240, 240)
        pdf.rect(15, currentY - 4, pageWidth - 30, 5, 'F')
        pdf.text(section.title, 17, currentY)
        currentY += 6

        section.items.forEach((item) => {
          if (currentY > pageHeight - 40) {
            pdf.addPage()
            currentY = 15
          }

          pdf.setFont(undefined, 'bold')
          const labelText = item[0] + ':'
          pdf.text(labelText, 17, currentY)
          pdf.setFont(undefined, 'normal')
          
          const splitText = pdf.splitTextToSize(item[1], 100)
          pdf.text(splitText, 80, currentY)
          currentY += splitText.length * 5 + 2
        })

        currentY += 3
      })

      if (selectedReport.signature_url) {
        if (currentY > pageHeight - 60) {
          pdf.addPage()
          currentY = 15
        }

        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(10)
        pdf.text('Firma del Técnico', 15, currentY)
        currentY += 10

        try {
          const response = await fetch(selectedReport.signature_url)
          const blob = await response.blob()
          const reader = new FileReader()
          reader.onload = (e) => {
            pdf.addImage(e.target.result, 'PNG', 15, currentY, 60, 25)
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.log('No se pudo cargar firma')
        }
      }

      const pageCount = pdf.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        const pageText = 'Página ' + i + ' de ' + pageCount
        pdf.text(pageText, pageWidth / 2, pageHeight - 8, { align: 'center' })
      }

      const fileName = 'Informe_' + selectedReport.rework_name + '_' + Date.now() + '.pdf'
      pdf.save(fileName)
      setExporting(false)
    } catch (error) {
      console.error('Error PDF:', error)
      setExporting(false)
    }
  }

  const exportToWord = () => {
    alert('Exportación a Word - Función en desarrollo')
    setExporting(false)
  }

  const printReport = () => {
    if (!selectedReport) return

    const printWindow = window.open('', '', 'height=800,width=1000')
    
    let htmlContent = '<html><head><title>Informe</title><style>' +
      'body{font-family:Arial;margin:40px;line-height:1.6}' +
      'h1{color:#FF000F;text-align:center;margin-bottom:5px}' +
      '.subtitle{text-align:center;color:#666;margin-bottom:30px}' +
      '.section{margin-top:30px;margin-bottom:25px}' +
      '.section-title{font-weight:bold;color:#FF000F;background:#f5f5f5;padding:10px;margin-bottom:10px}' +
      '.row{margin:15px 0;display:grid;grid-template-columns:200px 1fr;border-bottom:1px solid #eee;padding-bottom:10px}' +
      '.label{font-weight:bold;color:#333}' +
      '.value{color:#666}' +
      'img{max-width:400px;margin:10px 0}' +
      '</style></head><body>' +
      '<h1>INFORME DE REWORK - ABB</h1>' +
      '<div class="subtitle">Field Service Report</div>'
    
    htmlContent += '<div class="section">'
    htmlContent += '<div class="section-title">INFORMACIÓN GENERAL</div>'
    htmlContent += '<div class="row"><div class="label">Técnico:</div><div class="value">' + selectedReport.technician_name + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Fecha:</div><div class="value">' + new Date(selectedReport.date).toLocaleDateString('es-ES') + '</div></div>'
    
    if (selectedReport.ticket_number) {
      htmlContent += '<div class="row"><div class="label">Ticket:</div><div class="value">' + selectedReport.ticket_number + '</div></div>'
    }
    
    htmlContent += '<div class="row"><div class="label">Cliente:</div><div class="value">' + selectedReport.customer + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Depósito:</div><div class="value">' + selectedReport.depot + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Proyecto:</div><div class="value">' + selectedReport.project + '</div></div>'
    htmlContent += '</div>'

    htmlContent += '<div class="section">'
    htmlContent += '<div class="section-title">EQUIPO</div>'
    htmlContent += '<div class="row"><div class="label">Unidad:</div><div class="value">' + selectedReport.unit + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Convertidor:</div><div class="value">' + selectedReport.converter_number + '</div></div>'
    
    if (selectedReport.material_number) {
      htmlContent += '<div class="row"><div class="label">Material:</div><div class="value">' + selectedReport.material_number + '</div></div>'
    }
    htmlContent += '</div>'

    htmlContent += '<div class="section">'
    htmlContent += '<div class="section-title">DESCRIPCIÓN</div>'
    htmlContent += '<div class="row"><div class="label">Defecto:</div><div class="value">' + selectedReport.detected_defect + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Rework:</div><div class="value">' + selectedReport.rework_name + '</div></div>'
    htmlContent += '<div class="row"><div class="label">Puntos:</div><div class="value">' + selectedReport.rework_points + '</div></div>'
    
    if (selectedReport.comments) {
      htmlContent += '<div class="row"><div class="label">Observaciones:</div><div class="value">' + selectedReport.comments + '</div></div>'
    }
    htmlContent += '</div>'

    if (selectedReport.signature_url) {
      htmlContent += '<div class="section"><div class="section-title">FIRMA</div><img src="' + selectedReport.signature_url + '" /></div>'
    }

    htmlContent += '</body></html>'

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div className="view-reports">
      {reports.length === 0 ? (
        <p className="no-reports">No hay informes guardados</p>
      ) : (
        <>
          <div className="reports-list">
            {reports.map(report => (
              <div 
                key={report.id} 
                className={'report-item ' + (selectedReport?.id === report.id ? 'active' : '')}
                onClick={() => setSelectedReport(report)}
              >
                <h3>{report.rework_name}</h3>
                <p>{report.technician_name}</p>
              </div>
            ))}
          </div>

          {selectedReport && (
            <div className="report-detail">
              <h2>{selectedReport.rework_name}</h2>

              <div className="export-buttons">
                <button onClick={exportToPDF} className="export-btn">PDF</button>
                <button onClick={exportToWord} className="export-btn">Word</button>
                <button onClick={printReport} className="export-btn">Imprimir</button>
              </div>

              <div className="detail-row">
                <span className="label">Técnico:</span>
                <span className="value">{selectedReport.technician_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Fecha:</span>
                <span className="value">{new Date(selectedReport.date).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="detail-row">
                <span className="label">Cliente:</span>
                <span className="value">{selectedReport.customer}</span>
              </div>
              <div className="detail-row">
                <span className="label">Depósito:</span>
                <span className="value">{selectedReport.depot}</span>
              </div>
              <div className="detail-row">
                <span className="label">Proyecto:</span>
                <span className="value">{selectedReport.project}</span>
              </div>
              <div className="detail-row">
                <span className="label">Unidad:</span>
                <span className="value">{selectedReport.unit}</span>
              </div>
              <div className="detail-row">
                <span className="label">Convertidor:</span>
                <span className="value">{selectedReport.converter_number}</span>
              </div>

              {selectedReport.material_number && (
                <div className="detail-row">
                  <span className="label">Material:</span>
                  <span className="value">{selectedReport.material_number}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="label">Defecto:</span>
                <span className="value">{selectedReport.detected_defect}</span>
              </div>
              <div className="detail-row">
                <span className="label">Rework:</span>
                <span className="value">{selectedReport.rework_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Puntos:</span>
                <span className="value">{selectedReport.rework_points}</span>
              </div>

              {selectedReport.comments && (
                <div className="detail-row">
                  <span className="label">Observaciones:</span>
                  <span className="value">{selectedReport.comments}</span>
                </div>
              )}

              {selectedReport.signature_url && (
                <div className="signature-section">
                  <h4>Firma</h4>
                  <img src={selectedReport.signature_url} alt="Firma" />
                </div>
              )}

              {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                <div className="photos-section">
                  <h4>Fotos ({selectedReport.photo_urls.length})</h4>
                  <div className="photos-grid">
                    {selectedReport.photo_urls.map((url, index) => (
                      <img key={index} src={url} alt={'Foto ' + index} />
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => deleteReport(selectedReport.id)} className="delete-btn">
                Eliminar
              </button>
              <button onClick={() => setSelectedReport(null)} className="close-btn">
                Cerrar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}