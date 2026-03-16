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
      let yPosition = 10

      // HEADER
      pdf.setFontSize(20)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(255, 0, 15)
      pdf.text('ABB', 15, yPosition)
      
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)
      pdf.text('Field Service Report', 60, yPosition + 2)
      
      pdf.setFontSize(9)
      pdf.setTextColor(0, 0, 0)
      pdf.text('Motion Business', 140, yPosition)
      pdf.text('LD: ' + (selectedReport.motion_business || ''), 140, yPosition + 5)
      pdf.text('Ticket Nr: ' + (selectedReport.ticket_number || ''), 140, yPosition + 10)
      
      yPosition += 20
      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 5

      // AFFECTED PLANT
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('AFFECTED PLANT', 15, yPosition)
      yPosition += 7

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      
      pdf.text('Customer:', 15, yPosition)
      pdf.text(selectedReport.customer || '', 45, yPosition)
      pdf.text('Depot:', 120, yPosition)
      pdf.text(selectedReport.depot || '', 140, yPosition)
      yPosition += 6

      pdf.text('Project:', 15, yPosition)
      pdf.text(selectedReport.project || '', 45, yPosition)
      pdf.text('Vehicle #:', 120, yPosition)
      pdf.text(selectedReport.unit || '', 140, yPosition)
      yPosition += 8

      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 5

      // CONVERTER
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('CONVERTER', 15, yPosition)
      yPosition += 7

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('Type:', 15, yPosition)
      const converterTypeLines = pdf.splitTextToSize(selectedReport.converter_type || '', 150)
      pdf.text(converterTypeLines, 45, yPosition)
      yPosition += converterTypeLines.length * 5 + 3

      pdf.text('SN:', 15, yPosition)
      pdf.text(selectedReport.converter_sn || '', 45, yPosition)
      yPosition += 8

      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 5

      // FAILURE DESCRIPTION
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('FAILURE DESCRIPTION', 15, yPosition)
      yPosition += 7

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text('First Message recorded in DDS:', 15, yPosition)
      const firstMsgDate = selectedReport.first_message_date ? new Date(selectedReport.first_message_date).toLocaleString() : ''
      pdf.text(firstMsgDate, 80, yPosition)
      yPosition += 6

      pdf.text('Date:', 120, yPosition - 6)
      pdf.text(new Date(selectedReport.date).toLocaleString(), 135, yPosition - 6)

      yPosition += 8
      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 5

      // SERVICE DESCRIPTION
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('SERVICE DESCRIPTION', 15, yPosition)
      yPosition += 6

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'bold')
      pdf.text('Detected Defect / Error Caused by:', 15, yPosition)
      yPosition += 5

      pdf.setFont(undefined, 'normal')
      const defectLines = pdf.splitTextToSize(selectedReport.detected_defect || '', 170)
      pdf.text(defectLines, 15, yPosition)
      yPosition += defectLines.length * 4 + 5

      if (selectedReport.failure_classification) {
        pdf.setFont(undefined, 'bold')
        pdf.text('Failure Classification:', 15, yPosition)
        yPosition += 5
        pdf.setFont(undefined, 'normal')
        pdf.text(selectedReport.failure_classification, 15, yPosition)
        yPosition += 5
      }

      pdf.setFont(undefined, 'bold')
      pdf.text('Executed Work:', 15, yPosition)
      yPosition += 5

      pdf.setFont(undefined, 'normal')
      const workLines = pdf.splitTextToSize(selectedReport.rework_points || '', 170)
      pdf.text(workLines, 15, yPosition)
      yPosition += workLines.length * 4 + 10

      if (yPosition > pageHeight - 80) {
        pdf.addPage()
        yPosition = 15
      }

      // FAULT CORRECTED
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('FAULT CORRECTED?', 15, yPosition)
      yPosition += 6

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      pdf.text(selectedReport.fault_corrected ? selectedReport.fault_corrected.toUpperCase() : 'YES', 15, yPosition)
      yPosition += 8

      pdf.setLineWidth(0.5)
      pdf.line(15, yPosition, pageWidth - 15, yPosition)
      yPosition += 5

      // REPLACED MATERIAL
      const materials = selectedReport.replaced_materials || []
      if (materials.length > 0) {
        pdf.setFontSize(10)
        pdf.setFont(undefined, 'bold')
        pdf.text('REPLACED MATERIAL', 15, yPosition)
        yPosition += 6

        materials.forEach((material, idx) => {
          if (yPosition > pageHeight - 50) {
            pdf.addPage()
            yPosition = 15
          }

          pdf.setFontSize(9)
          pdf.setFont(undefined, 'bold')
          pdf.text('Material ' + (idx + 1), 15, yPosition)
          yPosition += 5

          pdf.setFont(undefined, 'normal')
          pdf.text('Old Material:', 15, yPosition)
          pdf.text('Material Nr: ' + (material.material_number_old || ''), 15, yPosition + 4)
          pdf.text('Serial Nr: ' + (material.serial_number_old || ''), 15, yPosition + 8)
          
          pdf.text('New Material:', 105, yPosition)
          pdf.text('Material Nr: ' + (material.material_number_new || ''), 105, yPosition + 4)
          pdf.text('Serial Nr: ' + (material.serial_number_new || ''), 105, yPosition + 8)
          
          yPosition += 15
        })

        pdf.setLineWidth(0.5)
        pdf.line(15, yPosition, pageWidth - 15, yPosition)
        yPosition += 5
      }

      // SERVICE CONFIRMATION
      pdf.setFontSize(10)
      pdf.setFont(undefined, 'bold')
      pdf.text('SERVICE CONFIRMATION', 15, yPosition)
      yPosition += 6

      pdf.setFontSize(9)
      pdf.setFont(undefined, 'normal')
      const repairDateTime = selectedReport.date + ' ' + (selectedReport.start_time || '00:00') + ' - ' + (selectedReport.end_time || '00:00')
      pdf.text('Repair Date & Time:', 15, yPosition)
      pdf.text(repairDateTime, 60, yPosition)
      
      pdf.text('Repair Location:', 15, yPosition + 6)
      pdf.text(selectedReport.repair_location || '', 60, yPosition + 6)
      
      yPosition += 15

      // PICTURES
      if (selectedReport.photo_urls && selectedReport.photo_urls.length > 0) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage()
          yPosition = 15
        }

        pdf.setFontSize(10)
        pdf.setFont(undefined, 'bold')
        pdf.text('PICTURES', 15, yPosition)
        yPosition += 8

        selectedReport.photo_urls.forEach((photoUrl) => {
          if (yPosition > pageHeight - 60) {
            pdf.addPage()
            yPosition = 15
          }

          try {
            fetch(photoUrl)
              .then(r => r.blob())
              .then(blob => {
                const reader = new FileReader()
                reader.onload = (e) => {
                  pdf.addImage(e.target.result, 'JPEG', 15, yPosition, 80, 60)
                }
                reader.readAsDataURL(blob)
              })
          } catch (err) {
            console.log('Could not load photo')
          }

          yPosition += 65
        })
      }

      // SIGNATURE
      if (selectedReport.signature_url) {
        if (yPosition > pageHeight - 50) {
          pdf.addPage()
          yPosition = 15
        }

        pdf.setLineWidth(0.5)
        pdf.line(15, yPosition, pageWidth - 15, yPosition)
        yPosition += 8

        pdf.setFontSize(10)
        pdf.setFont(undefined, 'bold')
        pdf.text('SIGNATURE OF SERVICE ENGINEER', 15, yPosition)
        yPosition += 8

        pdf.text('Service Engineer:', 15, yPosition)
        pdf.text(selectedReport.technician_name || '', 60, yPosition)
        
        pdf.text('Date:', 120, yPosition)
        pdf.text(new Date(selectedReport.date).toLocaleDateString(), 135, yPosition)

        yPosition += 15

        try {
          fetch(selectedReport.signature_url)
            .then(r => r.blob())
            .then(blob => {
              const reader = new FileReader()
              reader.onload = (e) => {
                pdf.addImage(e.target.result, 'PNG', 15, yPosition, 60, 25)
              }
              reader.readAsDataURL(blob)
            })
        } catch (err) {
          console.log('Could not load signature')
        }
      }

      const fileName = 'Report_' + selectedReport.ticket_number + '_' + Date.now() + '.pdf'
      pdf.save(fileName)
      setExporting(false)
    } catch (error) {
      console.error('PDF Error:', error)
      setExporting(false)
    }
  }

  const printReport = () => {
    if (!selectedReport) return

    const printWindow = window.open('', '', 'height=800,width=1000')
    
    const materials = selectedReport.replaced_materials || []
    let materialsHTML = ''
    if (materials.length > 0) {
      materialsHTML = '<h3>REPLACED MATERIALS</h3>'
      materials.forEach((material, idx) => {
        materialsHTML += '<div style="margin-bottom:15px; padding:10px; background:#f5f5f5; border-radius:5px;">'
        materialsHTML += '<b>Material ' + (idx + 1) + ':</b><br>'
        materialsHTML += '<b>Old:</b> Nr: ' + (material.material_number_old || '') + ' | SN: ' + (material.serial_number_old || '') + '<br>'
        materialsHTML += '<b>New:</b> Nr: ' + (material.material_number_new || '') + ' | SN: ' + (material.serial_number_new || '') + '<br>'
        materialsHTML += '</div>'
      })
    }
    
    let html = '<html><head><title>Field Service Report</title><style>' +
      'body{font-family:Arial;margin:30px;line-height:1.4;font-size:10pt}' +
      'h2{color:#FF000F;font-size:14pt;margin:15px 0 10px 0}' +
      'h3{color:#333;font-size:12pt;margin:15px 0 8px 0}' +
      'p{margin:5px 0}' +
      'b{font-weight:bold}' +
      'img{max-width:400px;margin:10px 0;border:1px solid #ccc}' +
      '</style></head><body>' +
      '<h2>FIELD SERVICE REPORT</h2>' +
      '<p><b>Ticket Nr:</b> ' + (selectedReport.ticket_number || '') + '</p>' +
      '<p><b>Motion Business:</b> ' + (selectedReport.motion_business || '') + '</p>' +
      '<h3>AFFECTED PLANT</h3>' +
      '<p><b>Customer:</b> ' + selectedReport.customer + '</p>' +
      '<p><b>Depot:</b> ' + selectedReport.depot + '</p>' +
      '<p><b>Project:</b> ' + selectedReport.project + '</p>' +
      '<p><b>Vehicle #:</b> ' + selectedReport.unit + '</p>' +
      '<h3>CONVERTER</h3>' +
      '<p><b>Type:</b> ' + (selectedReport.converter_type || '') + '</p>' +
      '<p><b>SN:</b> ' + (selectedReport.converter_sn || '') + '</p>' +
      '<h3>FAILURE DESCRIPTION</h3>' +
      '<p><b>Detected Defect:</b><br>' + (selectedReport.detected_defect || '') + '</p>' +
      '<p><b>Failure Classification:</b> ' + (selectedReport.failure_classification || '') + '</p>' +
      '<h3>SERVICE TIMES</h3>' +
      '<p><b>Start:</b> ' + (selectedReport.start_time || '') + ' | <b>End:</b> ' + (selectedReport.end_time || '') + '</p>' +
      '<h3>EXECUTED WORK</h3>' +
      '<p>' + (selectedReport.rework_points || '') + '</p>' +
      materialsHTML +
      '<h3>SERVICE CONFIRMATION</h3>' +
      '<p><b>Repair Date:</b> ' + new Date(selectedReport.date).toLocaleString() + '</p>' +
      '<p><b>Repair Location:</b> ' + (selectedReport.repair_location || '') + '</p>' +
      '<h3>CONCLUSION</h3>' +
      '<p>' + (selectedReport.conclusion || '') + '</p>' +
      '<h3>SIGNATURE</h3>' +
      '<p><b>Service Engineer:</b> ' + selectedReport.technician_name + '</p>' +
      '</body></html>'

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
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
                className={'report-item ' + (selectedReport?.id === report.id ? 'active' : '')}
                onClick={() => setSelectedReport(report)}
              >
                <h3>{report.ticket_number || 'Report'}</h3>
                <p>{report.customer}</p>
                <p>{report.unit}</p>
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
                  <button onClick={exportToPDF} disabled={exporting} className="export-btn pdf-btn">PDF</button>
                  <button onClick={printReport} disabled={exporting} className="export-btn print-btn">Print</button>
                </div>

                <div className="detail-section">
                  <h4>AFFECTED PLANT</h4>
                  <p><b>Customer:</b> {selectedReport.customer}</p>
                  <p><b>Depot:</b> {selectedReport.depot}</p>
                  <p><b>Vehicle #:</b> {selectedReport.unit}</p>
                </div>

                <div className="detail-section">
                  <h4>CONVERTER</h4>
                  <p><b>Type:</b> {selectedReport.converter_type}</p>
                  <p><b>SN:</b> {selectedReport.converter_sn}</p>
                </div>

                <div className="detail-section">
                  <h4>SERVICE TIMES</h4>
                  <p><b>Start:</b> {selectedReport.start_time} | <b>End:</b> {selectedReport.end_time}</p>
                </div>

                <div className="detail-section">
                  <h4>DETECTED DEFECT</h4>
                  <p>{selectedReport.detected_defect}</p>
                </div>

                <div className="detail-section">
                  <h4>EXECUTED WORK</h4>
                  <p>{selectedReport.rework_points}</p>
                </div>

                {selectedReport.replaced_materials && selectedReport.replaced_materials.length > 0 && (
                  <div className="detail-section">
                    <h4>REPLACED MATERIALS</h4>
                    {selectedReport.replaced_materials.map((material, idx) => (
                      <div key={idx} className="material-display">
                        <p><b>Material {idx + 1}:</b></p>
                        <p><b>Old:</b> Nr: {material.material_number_old} | SN: {material.serial_number_old}</p>
                        <p><b>New:</b> Nr: {material.material_number_new} | SN: {material.serial_number_new}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="detail-section">
                  <h4>CONCLUSION</h4>
                  <p>{selectedReport.conclusion}</p>
                </div>

                {selectedReport.signature_url && (
                  <div className="detail-section">
                    <h4>SIGNATURE</h4>
                    <img src={selectedReport.signature_url} alt="Signature" style={{maxWidth: '300px'}} />
                  </div>
                )}

                <button onClick={() => deleteReport(selectedReport.id)} className="delete-btn">Delete Report</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
