import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import '../styles/ReportsTable.css'

export default function ReportsTable({ onSelectReport }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [typeFilter, setTypeFilter] = useState([])

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
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return reports.filter(r => {
      // Type filter
      if (typeFilter.length > 0 && !typeFilter.includes(r.ticket_type || 'rework')) return false
      if (!q) return true
      return (
        (r.ticket_number || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q) ||
        (r.customer || '').toLowerCase().includes(q) ||
        (r.depot || '').toLowerCase().includes(q) ||
        (r.technician_name || '').toLowerCase().includes(q) ||
        (r.converter_type || '').toLowerCase().includes(q) ||
        (r.converter_sn || '').toLowerCase().includes(q) ||
        (r.fault_corrected || '').toLowerCase().includes(q) ||
        (r.repair_location || '').toLowerCase().includes(q) ||
        (r.project || '').toLowerCase().includes(q) ||
        (r.ticket_type || '').toLowerCase().includes(q) ||
        (r.motion_business || '').toLowerCase().includes(q) ||
        (r.detected_defect || '').toLowerCase().includes(q) ||
        (r.rework_points || '').toLowerCase().includes(q) ||
        (r.conclusion || '').toLowerCase().includes(q) ||
        ((r.service_days || []).some(d => (d.date || '').includes(q))) ||
        new Date(r.date).toLocaleDateString().includes(q)
      )
    })
  }, [reports, search, typeFilter])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      if (sortField === 'date' || sortField === 'created_at') {
        aVal = new Date(aVal)
        bVal = new Date(bVal)
      } else {
        aVal = aVal.toString().toLowerCase()
        bVal = bVal.toString().toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortField, sortDir])

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span className="sort-icon inactive">↕</span>
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const toggleType = (type) => {
    setTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const TYPE_LABELS = {
    rework: { label: 'Rework', color: '#6764f6' },
    fault:  { label: 'Avería', color: '#f44336' },
    ticket: { label: 'Ticket', color: '#ff9800' },
  }

  if (loading) return <div className="table-loading">Cargando informes...</div>

  return (
    <div className="reports-table-container">
      <div className="table-header">
        <div className="table-title">
          <h2>📊 Tabla de Informes</h2>
          <span className="table-count">{sorted.length} informe{sorted.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por ticket, cliente, técnico, tipo de convertidor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="clear-search" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div className="type-filters">
          <span className="filter-label">Filtrar por tipo:</span>
          {Object.entries(TYPE_LABELS).map(([type, { label, color }]) => (
            <button
              key={type}
              className={`type-filter-btn ${typeFilter.includes(type) ? 'active' : ''}`}
              style={typeFilter.includes(type) ? { background: color, borderColor: color, color: '#fff' } : { borderColor: color, color: color }}
              onClick={() => toggleType(type)}
            >
              {label}
            </button>
          ))}
          {typeFilter.length > 0 && (
            <button className="type-filter-clear" onClick={() => setTypeFilter([])}>✕ Todos</button>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="table-empty">
          {search ? `No se encontraron resultados para "${search}"` : 'No hay informes guardados'}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="reports-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('title')}>
                  Título <SortIcon field="title" />
                </th>
                <th onClick={() => handleSort('ticket_type')}>
                  Tipo <SortIcon field="ticket_type" />
                </th>
                <th onClick={() => handleSort('customer')}>
                  Cliente <SortIcon field="customer" />
                </th>
                <th onClick={() => handleSort('depot')}>
                  Depot <SortIcon field="depot" />
                </th>
                <th onClick={() => handleSort('technician_name')}>
                  Técnico <SortIcon field="technician_name" />
                </th>
                <th onClick={() => handleSort('project')}>
                  Proyecto <SortIcon field="project" />
                </th>
                <th onClick={() => handleSort('date')}>
                  Fecha <SortIcon field="date" />
                </th>
                <th onClick={() => handleSort('converter_type')}>
                  Tipo Convertidor <SortIcon field="converter_type" />
                </th>
                <th onClick={() => handleSort('converter_sn')}>
                  Converter SN <SortIcon field="converter_sn" />
                </th>
                <th>
                  Service Days
                </th>
                <th onClick={() => handleSort('fault_corrected')}>
                  Fault Corrected <SortIcon field="fault_corrected" />
                </th>
                <th onClick={() => handleSort('repair_location')}>
                  Repair Location <SortIcon field="repair_location" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(report => (
                <tr key={report.id} onClick={() => onSelectReport(report)} className="table-row">
                  <td className="cell-ticket">
                    {report.ticket_type === 'ticket'
                      ? (report.ticket_number || '—')
                      : (report.title || '—')}
                  </td>
                  <td>
                    {(() => {
                      const t = report.ticket_type || 'rework'
                      const colors = { rework: '#6764f6', fault: '#f44336', ticket: '#ff9800' }
                      const labels = { rework: 'Rework', fault: 'Avería', ticket: 'Ticket' }
                      return <span className="badge" style={{background: colors[t]+'22', color: colors[t], border: `1px solid ${colors[t]}55`}}>{labels[t] || t}</span>
                    })()}
                  </td>
                  <td>{report.customer || '—'}</td>
                  <td>{report.depot || '—'}</td>
                  <td>{report.technician_name || '—'}</td>
                  <td>{report.project || '—'}</td>
                  <td>{new Date(report.date).toLocaleDateString()}</td>
                  <td className="cell-converter">{report.converter_type || '—'}</td>
                  <td className="cell-sn">{report.converter_sn || '—'}</td>
                  <td className="cell-days">
                    {report.service_days && report.service_days.length > 0
                      ? report.service_days.map((d, i) => (
                          <span key={i} className="day-tag">{d.date}</span>
                        ))
                      : '—'}
                  </td>
                  <td>
                    {(() => {
                      const fc = report.fault_corrected || 'yes'
                      const cfg = {
                        yes:     { cls: 'badge-yes', label: '✓ Yes' },
                        no:      { cls: 'badge-no',  label: '✗ No' },
                        pending: { cls: 'badge-pending', label: '⏳ Pending' },
                      }
                      const { cls, label } = cfg[fc] || cfg.yes
                      return <span className={`badge ${cls}`}>{label}</span>
                    })()}
                  </td>
                  <td className="cell-location">{report.repair_location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
