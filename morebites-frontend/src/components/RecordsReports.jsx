import { useEffect, useMemo, useState } from 'react'
import {
  IconClose,
  IconDownload,
  IconFile,
  IconSearch,
  IconTrash,
} from './Icons'
import { reportsApi } from '../api/client'
import './RecordsReports.css'

function peso(n) {
  return `₱ ${Number(n).toLocaleString('en-PH')}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function escapeXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function exportCsv(filename, headers, rows) {
  const lines = rows.map((row) =>
    row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','),
  )
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  downloadBlob(blob, filename)
}

async function exportXlsx(filename, title, headers, rows) {
  if (typeof window !== 'undefined' && window.XLSX) {
    const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = window.XLSX.utils.book_new()
    window.XLSX.utils.book_append_sheet(wb, ws, 'Report')
    window.XLSX.writeFile(wb, filename)
    return
  }

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Report">
  <Table>
   <Row>
    ${headers.map((h) => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}
   </Row>
   ${rows
     .map(
       (r) =>
         `<Row>${r
           .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`)
           .join('')}</Row>`,
     )
     .join('\n   ')}
  </Table>
 </Worksheet>
</Workbook>`
  const blob = new Blob([xml], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;',
  })
  downloadBlob(blob, filename)
}

async function exportPdf(filename, title, headers, rows) {
  if (typeof window !== 'undefined' && (window.jsPDF || window.jspdf?.jsPDF)) {
    const JsPdf = window.jsPDF || window.jspdf.jsPDF
    const doc = new JsPdf()
    doc.text(title, 14, 16)
    let y = 26
    doc.text(headers.join('  |  '), 14, y)
    y += 8
    rows.slice(0, 30).forEach((r) => {
      if (y > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(r.join('  |  '), 14, y)
      y += 7
    })
    doc.save(filename)
    return
  }

  const lines = [
    title,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    headers.join(' | '),
    '-'.repeat(Math.min(80, headers.join(' | ').length)),
    ...rows.map((r) => r.join(' | ')),
  ]

  const pdfStream = [
    'BT',
    '/F1 10 Tf',
    '40 760 Td',
    '14 TL',
    ...lines.map((l) => `(${String(l).replace(/[()\\]/g, '\\$&')}) '`),
    'ET',
  ].join('\n')

  const pdfBody = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${pdfStream.length} >> stream\n${pdfStream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'xref',
    '0 6',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    '0000000244 00000 n ',
    '0000000350 00000 n ',
    'trailer << /Size 6 /Root 1 0 R >>',
    'startxref',
    '450',
    '%%EOF',
  ].join('\n')

  const blob = new Blob([pdfBody], { type: 'application/pdf' })
  downloadBlob(blob, filename)
}

export default function RecordsReports() {
  const [allRecords, setAllRecords] = useState([])
  const [deliveryRecords, setDeliveryRecords] = useState([])
  const [customerRecords, setCustomerRecords] = useState([])
  const [topItems, setTopItems] = useState([])
  const [exportsList, setExportsList] = useState([])
  const [reportStats, setReportStats] = useState({
    total_sales_today: 0,
    completed_deliveries: 0,
    avg_delivery_time: 0,
    total_orders: 0,
  })
  const [tab, setTab] = useState('all')

  useEffect(() => {
    reportsApi
      .get()
      .then((r) => {
        const d = r.data?.data || r.data || {}
        setAllRecords(d.all_records || d.records || [])
        setDeliveryRecords(d.delivery_records || [])
        setCustomerRecords(d.customer_records || [])
        setTopItems(d.top_items || [])
        setExportsList(d.exports || [])
        setReportStats(
          d.stats || {
            total_sales_today: 0,
            completed_deliveries: 0,
            avg_delivery_time: 0,
            total_orders: 0,
          },
        )
      })
      .catch(console.error)
  }, [])
  const [search, setSearch] = useState('')
  const [generateOpen, setGenerateOpen] = useState(false)
  const [topOpen, setTopOpen] = useState(false)
  const [exportsOpen, setExportsOpen] = useState(false)
  const [period, setPeriod] = useState('Weekly')
  const [format, setFormat] = useState('Sales Summary Report')
  const [exportAs, setExportAs] = useState('PDF')
  const [page, setPage] = useState(1)

  function getReportData(formatType, periodValue) {
    if (formatType === 'Sales Per Delivery Person') {
      const headers = ['Order ID', 'Driver Name', 'Date & Time', 'Delivery Time', 'Distance', 'Status']
      const rows = deliveryRecords.map((r) => [
        r.id,
        r.driver,
        r.datetime,
        r.time,
        r.distance,
        r.status,
      ])
      return { title: `Sales Per Delivery Person (${periodValue})`, headers, rows }
    }

    if (formatType === 'Full Report') {
      const headers = ['Order ID', 'Customer Name', 'Date & Time', 'Order Type', 'Total Amount', 'Payment Method', 'Status']
      const rows = allRecords.map((r) => [
        r.id,
        r.customer,
        r.datetime,
        r.type,
        peso(r.amount),
        r.payment,
        r.status,
      ])
      return { title: `Full Sales Report (${periodValue})`, headers, rows }
    }

    const headers = ['Order ID', 'Customer Name', 'Date & Time', 'Order Type', 'Total Amount', 'Payment Method', 'Status']
    const rows = allRecords.map((r) => [
      r.id,
      r.customer,
      r.datetime,
      r.type,
      peso(r.amount),
      r.payment,
      r.status,
    ])
    return { title: `Sales Summary Report (${periodValue})`, headers, rows }
  }

  function handleCancel() {
    setPeriod('Weekly')
    setFormat('Sales Summary Report')
    setExportAs('PDF')
    setGenerateOpen(false)
  }

  async function triggerFileDownload(fileName, formatType, periodValue, exportType) {
    const { title, headers, rows: reportRows } = getReportData(formatType, periodValue)
    const normalizedExport = (exportType || 'PDF').toUpperCase()
    if (normalizedExport === 'CSV') {
      exportCsv(fileName, headers, reportRows)
    } else if (normalizedExport === 'PDF') {
      await exportPdf(fileName, title, headers, reportRows)
    } else {
      await exportXlsx(fileName, title, headers, reportRows)
    }
  }

  async function generateReport() {
    const selectedPeriod = period
    const selectedFormat = format
    const selectedExportAs = exportAs
    const ext = selectedExportAs.toLowerCase() === 'csv' ? 'csv' : selectedExportAs.toLowerCase() === 'pdf' ? 'pdf' : 'xlsx'
    const fallbackName = `${selectedFormat.replace(/\s+/g, '_')}_${selectedPeriod}.${ext}`

    let report = null
    try {
      const { data } = await reportsApi.generate({
        period: selectedPeriod,
        format_type: selectedFormat,
        export_as: selectedExportAs,
      })
      report = data?.data || data
    } catch (err) {
      console.warn('Backend generate call error, proceeding with download:', err)
    }

    const fileName = report?.name || fallbackName

    try {
      await triggerFileDownload(fileName, selectedFormat, selectedPeriod, selectedExportAs)

      setExportsList((prev) => [
        {
          id: report?.id || Date.now(),
          name: fileName,
          date: report?.created_at
            ? new Date(report.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Today',
          size: report?.size || '1.2 MB',
          format: selectedExportAs,
        },
        ...prev,
      ])
      handleCancel()
      setExportsOpen(true)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Failed to generate report.')
    }
  }

  function handleDownloadExport(file) {
    const ext = file.name.split('.').pop()?.toUpperCase() || file.format?.toUpperCase() || 'PDF'
    triggerFileDownload(file.name, 'Sales Summary Report', 'Weekly', ext).catch(console.error)
  }
  const pageSize = 5

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRecords.filter((r) => !q || r.id.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q))
  }, [search])

  const rows = filteredAll.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="rr-page">
      <header className="rr-header">
        <h1>Records & Reports</h1>
      </header>

      <section className="rr-stats">
        <article className="rr-stat sa-card">
          <div className="rr-stat-label">Total sales today</div>
          <div className="rr-stat-value green">{peso(reportStats.total_sales_today || 0)}</div>
        </article>
        <article className="rr-stat sa-card">
          <div className="rr-stat-label">Completed deliveries</div>
          <div className="rr-stat-value">{reportStats.completed_deliveries || 0}</div>
        </article>
        <article className="rr-stat sa-card">
          <div className="rr-stat-label">Avg. delivery time</div>
          <div className="rr-stat-value">
            {reportStats.avg_delivery_time ? `${reportStats.avg_delivery_time} mins` : '—'}
          </div>
        </article>
        <article className="rr-stat sa-card">
          <div className="rr-stat-label">Total orders</div>
          <div className="rr-stat-value">{reportStats.total_orders || 0}</div>
        </article>
      </section>

      <div className="rr-tabs">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'delivery', label: 'Delivery Records' },
          { id: 'customer', label: 'Customer Records' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rr-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => {
              setTab(t.id)
              setPage(1)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="rr-toolbar sa-card">
        <div className="rr-search">
          <IconSearch />
          <input
            type="search"
            placeholder="Search Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="button" className="rr-btn-primary" onClick={() => setGenerateOpen(true)}>
          Generate Report
        </button>
      </section>

      <section className="rr-table-card sa-card">
        <div className="rr-table-wrap">
          {tab === 'all' && (
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Name</th>
                  <th>Date & Time</th>
                  <th>Order Type</th>
                  <th>Total Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="rr-id">{r.id}</td>
                    <td>{r.customer}</td>
                    <td>{r.datetime}</td>
                    <td>{r.type}</td>
                    <td>{peso(r.amount)}</td>
                    <td>{r.payment}</td>
                    <td><span className="rr-badge ok">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'delivery' && (
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Driver Name</th>
                  <th>Date & Time</th>
                  <th>Delivery Time</th>
                  <th>Distance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveryRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="rr-id">{r.id}</td>
                    <td>{r.driver}</td>
                    <td>{r.datetime}</td>
                    <td>{r.time}</td>
                    <td>{r.distance}</td>
                    <td><span className="rr-badge ok">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'customer' && (
            <table className="rr-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Total Orders</th>
                  <th>Total Spent</th>
                  <th>Last Order Date</th>
                  <th>Frequent Status</th>
                </tr>
              </thead>
              <tbody>
                {customerRecords.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.orders}</td>
                    <td>{peso(r.spent)}</td>
                    <td>{r.last}</td>
                    <td><span className={`rr-badge ${r.freq === 'Frequent' ? 'freq' : 'reg'}`}>{r.freq}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {tab === 'all' && (
          <div className="rr-pagination">
            <span>Showing 1 to {rows.length} of {filteredAll.length} transactions</span>
          </div>
        )}
      </section>

      <div className="rr-bottom">
        <section className="rr-side-card sa-card">
          <div className="rr-side-head">
            <h3>Top Selling Items</h3>
            <button type="button" className="rr-link" onClick={() => setTopOpen(true)}>View all</button>
          </div>
          <ul className="rr-top-list">
            {topItems.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.units} units</span>
                </div>
                <em>{item.change}</em>
              </li>
            ))}
          </ul>
        </section>

        <section className="rr-side-card sa-card">
          <div className="rr-side-head">
            <h3>Recent Exported Reports</h3>
            <button type="button" className="rr-link" onClick={() => setExportsOpen(true)}>View all</button>
          </div>
          <ul className="rr-export-list">
            {exportsList.map((file) => (
              <li key={file.id}>
                <span className="rr-file-icon"><IconFile /></span>
                <div>
                  <strong>{file.name}</strong>
                  <span>{file.date}</span>
                </div>
                <button
                  type="button"
                  className="rr-icon-btn"
                  aria-label="Download"
                  onClick={() => handleDownloadExport(file)}
                >
                  <IconDownload />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {generateOpen && (
        <div className="rr-backdrop" onClick={handleCancel} role="presentation">
          <div className="rr-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="rr-modal-head">
              <h2>Generate Sales Report</h2>
              <button type="button" className="rr-icon-btn" onClick={handleCancel} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div className="rr-modal-body">
              <label>
                Select Period
                <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                  <option>Yearly</option>
                </select>
              </label>
              <div className="rr-radio-group">
                <span>Select Format</span>
                {['Sales Summary Report', 'Sales Per Delivery Person', 'Full Report'].map((opt) => (
                  <label key={opt} className="rr-radio">
                    <input
                      type="radio"
                      name="format"
                      checked={format === opt}
                      onChange={() => setFormat(opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              <label>
                Export As
                <select value={exportAs} onChange={(e) => setExportAs(e.target.value)}>
                  <option value="PDF">PDF</option>
                  <option value="CSV">CSV</option>
                  <option value="XLSX">XLSX</option>
                </select>
              </label>
            </div>
            <div className="rr-modal-foot">
              <button
                type="button"
                className="rr-btn-ghost"
                onClick={handleCancel}
                aria-label="Cancel"
                title="Cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rr-btn-primary"
                onClick={generateReport}
                aria-label="Generate & Download"
                title="Generate & Download"
              >
                Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}

      {topOpen && (
        <div className="rr-backdrop" onClick={() => setTopOpen(false)} role="presentation">
          <div className="rr-modal rr-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="rr-modal-head">
              <h2>Top Selling Items - Monthly</h2>
              <button type="button" className="rr-icon-btn" onClick={() => setTopOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div className="rr-table-wrap">
              <table className="rr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Name</th>
                    <th>Units Sold</th>
                    <th>Total Sales</th>
                    <th>Avg Sale per Day</th>
                  </tr>
                </thead>
                <tbody>
                  {topItems.map((item, i) => (
                    <tr key={item.name}>
                      <td>{i + 1}</td>
                      <td>{item.name}</td>
                      <td>{item.units}</td>
                      <td>{peso(item.units * 250)}</td>
                      <td>{peso(Math.round((item.units * 250) / 30))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rr-modal-foot">
              <button type="button" className="rr-btn-cancel" onClick={() => setTopOpen(false)}>Back</button>
              <button type="button" className="rr-btn-primary">Export Items</button>
            </div>
          </div>
        </div>
      )}

      {exportsOpen && (
        <div className="rr-backdrop" onClick={() => setExportsOpen(false)} role="presentation">
          <div className="rr-modal rr-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="rr-modal-head">
              <h2>All Exported Reports <span className="rr-count">{exportsList.length}</span></h2>
              <button type="button" className="rr-icon-btn" onClick={() => setExportsOpen(false)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <ul className="rr-export-list rr-export-modal-list">
              {exportsList.map((file) => (
                <li key={file.id}>
                  <span className="rr-file-icon"><IconFile /></span>
                  <div>
                    <strong>{file.name}</strong>
                    <span>{file.size} · {file.date}</span>
                  </div>
                  <button
                    type="button"
                    className="rr-icon-btn"
                    aria-label="Download"
                    onClick={() => handleDownloadExport(file)}
                  >
                    <IconDownload />
                  </button>
                  <button type="button" className="rr-icon-btn danger" aria-label="Delete"><IconTrash /></button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
