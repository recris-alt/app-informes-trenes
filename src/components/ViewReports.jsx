import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, AlignmentType, convertInchesToTwip } from 'docx'
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
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Header
      pdf.setFontSize(16)
      pdf.setTextColor(255, 0, 15)
      pdf.text('INFORME DE REWORK', pageWidth / 2, yPosition, { align: 'center' })
      
      yPosition += 15
      pdf.setDrawColor(255, 0, 15)
      pdf.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 10

      // Contenido
      pdf.setFontSize(11)
      pdf.setTextColor(0, 0, 0)

      const data = [
        ['Técnico', selectedReport.technician_name],
        ['Fecha', new Date(selectedReport.date).toLocaleDateString('es-ES')],
        ['Proyecto', selectedReport.project],
        ['Unidad', selectedReport.unit],
        ['Nº Convertidor', selectedReport.converter_number],
        ['Rework', selectedReport.rework_name],
      ]

      data.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold')
        pdf.text(label + ':', 20, yPosition)
        pdf.setFont(undefined, 'normal')
        const splitText = pdf.splitTextToSize(value, 120)
        pdf.text(splitText, 60, yPosition)
        yPosition += 8
      })

      yPosition += 5
      pdf.setFont(undefined, 'bold')
      pdf.text('Puntos ejecutados:', 20, yPosition)
      yPosition += 7
      pdf.setFont(undefined, 'normal')
      const splitPoints = pdf.splitTextToSize(selectedReport.rework_points, 170)
      pdf.text(splitPoints, 20, yPosition)
      yPosition += splitPoints.length * 6 + 5

      if (selectedReport.comments) {
        pdf.setFont(undefined, 'bold')
        pdf.text('Observaciones:', 20, yPosition)
        yPosition += 7
        pdf.setFont(undefined, 'normal')
        const splitComments = pdf.splitTextToSize(selectedReport.comments, 170)
        pdf.text(splitComments, 20, yPosition)
        yPosition += splitComments.length * 6 + 5
      }

      // Firma
      if (selectedReport.signature_url) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage()
          yPosition = 20
        }
        pdf.setFont(undefined, 'bold')
        pdf.text('Firma del Técnico:', 20, yPosition)
        yPosition += 10
        
        try {
          const response = await fetch(selectedReport.signature_url)
          const blob = await response.blob()
          const reader = new FileReader()
          reader.onload = (e) => {
            pdf.addImage(e.target.result, 'PNG', 20, yPosition, 80, 30)
          }
          reader.readAsDataURL(blob)
        } catch (err) {
          console.log('No se pudo cargar la firma')
        }
      }

      // Descargar PDF
      const fileName = `Informe_${selectedReport.rework_name}_${new Date().getTime()}.pdf`
      pdf.save(fileName)
      setExporting(false)
    } catch (error) {
      console.error('Error exportando PDF:', error)
      setExporting(false)
    }
  }

  const exportToWord = async () => {
    if (!selectedReport) return
    setExporting(true)

    try {
      const rows = [
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Técnico', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.technician_name)], width: { size: 75, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Fecha', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(new Date(selectedReport.date).toLocaleDateString('es-ES'))], width: { size: 75, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Proyecto', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.project)], width: { size: 75, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Unidad', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.unit)], width: { size: 75, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Nº Convertidor', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.converter_number.toString())], width: { size: 75, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Rework', bold: true })], width: { size: 25, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.rework_name)], width: { size: 75, type: 'pct' } }),
          ],
        }),
      ]

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: 'INFORME DE REWORK',
              bold: true,
              fontSize: 24,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Table({
              rows: rows,
              width: { size: 100, type: 'pct' },
            }),
            new Paragraph({
              text: 'Puntos ejecutados:',
              bold: true,
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              text: selectedReport.rework_points,
              spacing: { after: 200 },
            }),
            ...(selectedReport.comments ? [
              new Paragraph({
                text: 'Observaciones:',
                bold: true,
                spacing: { before: 200, after: 100 },
              }),
              new Paragraph({
                text: selectedReport.comments,
                spacing: { after: 200 },
              }),
            ] : []),
            new Paragraph({
              text: 'Firma del Técnico:',
              bold: true,
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              text: '[Firma digital]',
              spacing: { after: 200 },
            }),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Informe_${selectedReport.rework_name}_${new Date().getTime()}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setExporting(false)
    } catch (error) {
      console.error('Error exportando Word:', error)
      setExporting(false)
    }
  }

  const printReport = () => {
    if (!selectedReport) return

    const printWindow = window.open('', '', 'height=800,width=1000')
    const html = `
      <html>
        <head>
          <title>Informe de Rework</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #FF000F; text-align: center; margin-bottom: 30px; }
            .row { margin: 15px 0; display: grid; grid-template-columns: 200px 1fr; }
            .label { font-weight: bold; color: #333; }
            .value { color: #666; }
            .section { margin-top: 25px; margin-bottom: 25px; }
            .section-title { font-weight: bold; color: #FF000F; margin-bottom: 10px; }
            .signature { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }
          </style>
        </head>
        <body>
          <h1>INFORME DE REWORK</h1>
          <div class="row">
            <div class="label">Técnico:</div>
            <div class="value">${selectedReport.technician_name}</div>
          </div>
          <div class="row">
            <div class="label">Fecha:</div>
            <div class="value">${new Date(selectedReport.date).toLocaleDateString('es-ES')}</div>
          </div>
          <div class="row">
            <div class="label">Proyecto:</div>
            <div class="value">${selectedReport.project}</div>
          </div>
          <div class="row">
            <div class="label">Unidad:</div>
            <div class="value">${selectedReport.unit}</div>
          </div>
          <div class="row">
            <div class="label">Nº Convertidor:</div>
            <div class="value">${selectedReport.converter_number}</div>
          </div>
          <div class="row">
            <div class="label">Rework:</div>
            <div class="value">${selectedReport.rework_name}</div>
          </div>
          <div class="section">
            <div class="section-title">Puntos ejecutados:</div>
            <div class="value">${selectedReport.rework_points.replace(/\n/g, '<br>')}</div>
          </div>
          ${selectedReport.comments ? `
            <div class="section">
              <div class="section-title">Observaciones:</div>
              <div class="value">${selectedReport.comments.replace(/\n/g, '<br>')}</div>
            </div>
          ` : ''}
          <div class="signature">
            <div class="section-title">Firma del Técnico</div>
            ${selectedReport.signature_url ? `<img src="${selectedReport.signature_url}" style="max-width: 400px; margin-top: 10px;" />` : '<p>Sin firma digital</p>'}
          </div>
        </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
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
                <div className="export-buttons">
                  <button onClick={exportToPDF} disabled={exporting} className="export-btn pdf-btn" title="Descargar como PDF">
                    📄 PDF
                  </button>
                  <button onClick={exportToWord} disabled={exporting} className="export-btn word-btn" title="Descargar como Word">
                    📝 Word
                  </button>
                  <button onClick={printReport} disabled={exporting} className="export-btn print-btn" title="Imprimir">
                    🖨️ Imprimir
                  </button>
                </div>

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