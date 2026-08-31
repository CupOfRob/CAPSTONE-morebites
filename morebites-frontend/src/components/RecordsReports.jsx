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

  async function generateReport() {
    try {
      const { data } = await reportsApi.generate({
        period,
        format_type: format,
        export_as: exportAs,
      })
      const report = data?.data || data
      setExportsList((prev) => [
        {
          id: report.id,
          name: report.name,
          date: report.created_at
            ? new Date(report.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Today',
          size: report.size || '1.2 MB',
          format: report.format || exportAs,
        },
        ...prev,
      ])
      setGenerateOpen(false)
      setExportsOpen(true)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to generate report.')
    }
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
                <button type="button" className="rr-icon-btn" aria-label="Download">
                  <IconDownload />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {generateOpen && (
        <div className="rr-backdrop" onClick={() => setGenerateOpen(false)} role="presentation">
          <div className="rr-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="rr-modal-head">
              <h2>Generate Sales Report</h2>
              <button type="button" className="rr-icon-btn" onClick={() => setGenerateOpen(false)} aria-label="Close">
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
                  <option>PDF</option>
                  <option>Excel</option>
                </select>
              </label>
            </div>
            <div className="rr-modal-foot">
              <button type="button" className="rr-btn-ghost" onClick={() => setGenerateOpen(false)}>Close</button>
              <button type="button" className="rr-btn-primary" onClick={generateReport}>
                Generate Report
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
                  <button type="button" className="rr-icon-btn" aria-label="Download"><IconDownload /></button>
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
