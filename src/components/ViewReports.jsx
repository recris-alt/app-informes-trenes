import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { jsPDF } from 'jspdf'
import { Document, Packer, Paragraph, Table, TableCell, TableRow, AlignmentType } from 'docx'
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
        pdf.text('Ticket: ' + selectedReport.ticket_number, 15, yPosition)
        yPosition += 7
      }

      const tableData = [
        ['INFORMACIÓN GENERAL', ''],
        ['Técnico', selectedReport.technician_name],
        ['Fecha', new Date(selectedReport.date).toLocaleDateString('es-ES')],
        ['Cliente', selectedReport.customer],
        ['Depósito', selectedReport.depot],
        ['Proyecto', selectedReport.project],
        ['', ''],
        ['EQUIPO', ''],
        ['Unidad', selectedReport.unit],
        ['Nº Convertidor', selectedReport.converter_number],
        ...(selectedReport.material_number ? [['Material Nr', selectedReport.material_number]] : []),
        ['', ''],
        ['DESCRIPCIÓN DEL TRABAJO', ''],
        ['Defecto Detectado', selectedReport.detected_defect],
        ['Rework Ejecutado', selectedReport.rework_name],
        ['Puntos Ejecutados', selectedReport.rework_points],
        ...(selectedReport.comments ? [['Observaciones', selectedReport.comments]] : []),
      ]

      pdf.setFontSize(9)
      pdf.setTextColor(0, 0, 0)

      let currentY = yPosition
      tableData.forEach((row) => {
        if (row[0] === '') {
          currentY += 2
          return
        }

        if (['INFORMACIÓN GENERAL', 'EQUIPO', 'DESCRIPCIÓN DEL TRABAJO'].includes(row[0])) {
          pdf.setFont(undefined, 'bold')
          pdf.setFillColor(240, 240, 240)
          pdf.rect(15, currentY - 4, pageWidth - 30, 5, 'F')
          pdf.text(row[0], 17, currentY)
          currentY += 6
        } else {
          pdf.setFont(undefined, 'bold')
          pdf.text(row[0] + ':', 17, currentY)
          pdf.setFont(undefined, 'normal')
          
          const splitText = pdf.splitTextToSize(row[1], 100)
          pdf.text(splitText, 80, currentY)
          currentY += splitText.length * 5 + 2
        }

        if (currentY > pageHeight - 40) {
          pdf.addPage()
          currentY = 15
        }
      })

      currentY += 5

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
          currentY += 30
        } catch (err) {
          console.log('No se pudo cargar la firma')
        }
      }

      if (selectedReport.photo_urls && selectedReport.photo_urls.length > 0) {
        if (currentY > pageHeight - 50) {
          pdf.addPage()
          currentY = 15
        }

        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(10)
        pdf.text('Fotografías del Trabajo', 15, currentY)
        currentY += 10

        let photosPerPage = 0
        const photosPerRow = 2
        const photoWidth = 40
        const photoHeight = 40

        selectedReport.photo_urls.forEach((photoUrl) => {
          if (photosPerPage > 0 && photosPerPage % (photosPerRow * 3) === 0) {
            pdf.addPage()
            currentY = 15
            photosPerPage = 0
          }

          const col = photosPerPage % photosPerRow
          const row = Math.floor(photosPerPage / photosPerRow)
          const xPos = 15 + col * (photoWidth + 15)
          const yPos = currentY + row * (photoHeight + 10)

          try {
            fetch(photoUrl)
              .then(r => r.blob())
              .then(blob => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  pdf.addImage(e.target.result, 'JPEG', xPos, yPos, photoWidth, photoHeight)
                }
                reader.readAsDataURL(blob)
              })
          } catch (err) {
            console.log('No se pudo cargar la foto')
          }

          photosPerPage++
        })
      }

      const pageCount = pdf.internal.pages.length - 1
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.text('Página ' + i + ' de ' + pageCount, pageWidth / 2, pageHeight - 8, { align: 'center' })
      }

      const fileName = 'Informe_' + selectedReport.rework_name + '_' + new Date().getTime() + '.pdf'
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
            new TableCell({ children: [new Paragraph({ text: 'Técnico', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.technician_name)], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Fecha', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(new Date(selectedReport.date).toLocaleDateString('es-ES'))], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Cliente', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.customer)], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Depósito', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.depot)], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Proyecto', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.project)], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Unidad', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.unit)], width: { size: 70, type: 'pct' } }),
          ],
        }),
        new TableRow({
          cells: [
            new TableCell({ children: [new Paragraph({ text: 'Nº Convertidor', bold: true })], width: { size: 30, type: 'pct' } }),
            new TableCell({ children: [new Paragraph(selectedReport.converter_number.toString())], width: { size: 70, type: 'pct' } }),
          ],
        }),
      ]

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: 'INFORME DE REWORK - ABB',
              bold: true,
              fontSize: 24,
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
            }),
            new Table({
              rows: rows,
              width: { size: 100, type: 'pct' },
            }),
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'Defecto Detectado:',
              bold: true,
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              text: selectedReport.detected_defect,
              spacing: { after: 200 },
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
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Informe_' + selectedReport.rework_name + '_' + new Date().getTime() + '.docx'
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
    const html = '<html><head><title>Informe de Rework</title><style>' +
      'body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }' +
      'h1 { color: #FF000F; text-align: center; margin-bottom: 5px; }' +
      '.subtitle { text-align: center; color: #666; margin-bottom: 30px; }' +
      '.row { margin: 15px 0; display: grid; grid-template-columns: 200px 1fr; border-bottom: 1px solid #eee; padding-bottom: 10px; }' +
      '.label { font-weight: bold; color: #333; }' +
      '.value { color: #666; }' +
      '.section { margin-top: 30px; margin-bottom: 25px; }' +
      '.section-title { font-weight: bold; color: #FF000F; margin-bottom: 10px; background: #f5f5f5; padding: 10px; }' +
      '.signature { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; }' +
      'img { max-width: 400px; margin: 10px 0; }' +
      '.photos { margin-top: 20px; }' +
      '.photo-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }' +
      '.photo-grid img { max-width: 100%; height: auto; border: 1px solid #ddd; }' +
      '</style></head><body>' +
      '<h1>INFORME DE REWORK - ABB</h1>' +
      '<div class="subtitle">Field Service Report</div>' +
      '<div class="section">' +
      '<div class="section-title">INFORMACIÓN GENERAL</div>' +
      '<div class="row"><div class="label">Técnico:</div><div class="value">' + selectedReport.technician_name + '</div></div>' +
      '<div class="row"><div class="label">Fecha:</div><div class="value">' + new Date(selectedReport.date).toLocaleDateString('es-ES') + '</div></div>' +
      (selectedReport.ticket_number ? '<div class="row"><div class="label">Ticket:</div><div class="value">' + selectedReport.ticket_number + '</div></div>' : '') +
      '<div class="row"><div class="label">Cliente:</div><div class="value">' + selectedReport.customer + '</div></div>' +
      '<div class="row"><div class="label">Depósito:</div><div class="value">' + selectedReport.depot + '</div></div>' +
      '<div class="row"><div class="label">Proyecto:</div><div class="value">' + selectedReport.project + '</div></div>' +
      '</div>' +
      '<div class="section">' +
      '<div class="section-title">EQUIPO</div>' +
      '<div class="row"><div class="label">Unidad:</div><div class="value">' + selectedReport.unit + '</div></div>' +
      '<div class="row"><div class="label">Nº Convertidor:</div><div class="value">' + selectedReport.converter_number + '</div></div>' +
      (selectedReport.material_number ? '<div class="row"><div class="label">Material Nr:</div><div class="value">' + selectedReport.material_number + '</div></div>' : '') +
      '</div>' +
      '<div class="section">' +
      '<div class="section-title">DESCRIPCIÓN DEL TRABAJO</div>' +
      '<div class="row"><div class="label">Defecto Detectado:</div><div class="value">' + selectedReport.detected_defect.replace(/
/g, '<br>') + '</div></div>' +
      '<div class="row"><div class="label">Rework Ejecutado:</div><div class="value">' + selectedReport.rework_name + '</div></div>' +
      '<div class="row"><div class="label">Puntos Ejecutados:</div><div class="value">' + selectedReport.rework_points.replace(/
/g, '<br>') + '</div></div>' +
      (selectedReport.comments ? '<div class="row"><div class="label">Observaciones:</div><div class="value">' + selectedReport.comments.replace(/
/g, '<br>') + '</div></div>' : '') +
      '</div>' +
      (selectedReport.signature_url ? '<div class="signature"><div class="section-title">FIRMA DEL TÉCNICO</div><img src="' + selectedReport.signature_url + '" style="max-width: 400px;" /></div>' : '') +
      (selectedReport.photo_urls && selectedReport.photo_urls.length > 0 ? '<div class="photos"><div class="section-title">FOTOGRAFÍAS DEL TRABAJO</div><div class="photo-grid">' + selectedReport.photo_urls.map(url => '<img src="' + url + '" />').join('') + '</div></div>' : '') +
      '</body></html>'
    
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
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
                className={'report-item ' + (selectedReport?.id === report.id ? 'active' : '')}
                onClick={() => setSelectedReport(report)}
              >
                <div className="report-header">
                  <h3>{report.rework_name}</h3>
                  <span className="date">{new Date(report.date).toLocaleDateString('es-ES')}</span>
                </div>
                <p className="tech-name">👤 {report.technician_name}</p>
                <p className="customer-name">🏢 {report.customer}</p>
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
                  <span className="value">{new Date(selectedReport.date).toLocaleDateString('es-ES')}</span>
                </div>
                {selectedReport.ticket_number && (
                  <div className="detail-row">
                    <span className="label">🎫 Ticket:</span>
                    <span className="value">{selectedReport.ticket_number}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">🏢 Cliente:</span>
                  <span className="value">{selectedReport.customer}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📍 Depósito:</span>
                  <span className="value">{selectedReport.depot}</span>
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
                {selectedReport.material_number && (
                  <div className="detail-row">
                    <span className="label">📦 Material Nr:</span>
                    <span className="value">{selectedReport.material_number}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">⚠️ Defecto Detectado:</span>
                  <span className="value">{selectedReport.detected_defect}</span>
                </div>
                <div className="detail-row">
                  <span className="label">🔨 Rework Ejecutado:</span>
                  <span className="value">{selectedReport.rework_name}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📝 Puntos Ejecutados:</span>
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
                        <img key={index} src={url} alt={'Foto ' + (index + 1)} />
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