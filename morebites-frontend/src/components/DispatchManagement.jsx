import { useEffect, useMemo, useState } from 'react'
import {
  IconBike,
  IconCheck,
  IconClock,
  IconClose,
  IconEye,
  IconMapPin,
  IconSend,
} from './Icons'
import { dispatchApi } from '../api/client'
import FleetMap from './FleetMap'
import './DispatchManagement.css'

function badgeClass(status) {
  if (status === 'Delivered') return 'delivered'
  if (status === 'Cancelled') return 'cancelled'
  if (status === 'Out for Delivery') return 'delivery'
  if (status === 'Picked Up') return 'delivery'
  if (status === 'Assigned') return 'waiting'
  return 'waiting'
}

export default function DispatchManagement() {
  const [pending, setPending] = useState([])
  const [riders, setRiders] = useState([])
  const [monitoring, setMonitoring] = useState([])
  const [fleet, setFleet] = useState({ deliveries: [], store: null })
  const [page, setPage] = useState(1)
  const [assignOrder, setAssignOrder] = useState(null)
  const [viewDelivery, setViewDelivery] = useState(null)
  const [focusId, setFocusId] = useState(null)
  const [rider, setRider] = useState('')

  async function loadDispatch() {
    const r = await dispatchApi.get()
    const d = r.data?.data || r.data || {}
    setPending(d.pending || [])
    setRiders(d.riders || [])
    setMonitoring(d.monitoring || [])
  }

  async function loadFleet() {
    const r = await dispatchApi.fleet()
    const d = r.data?.data || r.data || {}
    setFleet({
      deliveries: d.deliveries || [],
      store: d.store || null,
    })
  }

  useEffect(() => {
    loadDispatch().catch(console.error)
    loadFleet().catch(console.error)
    const timer = setInterval(() => {
      loadDispatch().catch(() => {})
      loadFleet().catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const mapStats = useMemo(() => {
    const focused = fleet.deliveries.find((d) => String(d.db_id) === String(focusId))
    const active = focused || fleet.deliveries[0]
    if (!active) {
      return { distance: '—', eta: '—' }
    }
    return {
      distance: `${Number(active.distance_km || 0).toFixed(1)} km`,
      eta: `${active.eta_mins || '—'} mins`,
    }
  }, [fleet.deliveries, focusId])

  const pageSize = 2
  const totalPages = Math.max(1, Math.ceil(pending.length / pageSize))
  const rows = pending.slice((page - 1) * pageSize, page * pageSize)

  async function assignDelivery() {
    if (!assignOrder || !rider) return
    const orderId = assignOrder.db_id || assignOrder.id
    try {
      await dispatchApi.assign(orderId, rider)
      await Promise.all([loadDispatch(), loadFleet()])
      setAssignOrder(null)
      setRider('')
      setPage(1)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to assign rider.')
    }
  }

  return (
    <div className="dp-page">
      <header className="dp-header">
        <h1>Dispatch Management</h1>
      </header>

      <section className="dp-card sa-card">
        <div className="dp-card-head">
          <div className="dp-title">
            <span className="dp-icon yellow">
              <IconClock />
            </span>
            <h2>Pending Deliveries</h2>
          </div>
        </div>
        <div className="dp-table-wrap">
          <table className="dp-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Order Total</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id}>
                  <td className="dp-id">{o.id}</td>
                  <td>{o.customer}</td>
                  <td>{o.address}</td>
                  <td>₱{o.total}</td>
                  <td>
                    <span className={`dp-badge ${badgeClass(o.status)}`}>{o.status}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="dp-assign"
                      onClick={() => {
                        setAssignOrder(o)
                        setRider('')
                      }}
                    >
                      Assign Rider
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dp-pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={n === page ? 'active' : ''}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <div className="dp-grid">
        <section className="dp-card sa-card dp-map-card">
          <div className="dp-card-head">
            <div className="dp-title">
              <span className="dp-icon green">
                <IconMapPin />
              </span>
              <div>
                <h2>Live Delivery Map</h2>
                <p>Real-time view of customer location, rider location, and route.</p>
              </div>
            </div>
          </div>
          <div className="dp-map dp-map-live">
            <FleetMap
              store={fleet.store}
              deliveries={fleet.deliveries}
              focusId={focusId}
            />
            <div className="dp-legend">
              <span><i className="dot red" /> Customer Location</span>
              <span><i className="dot blue" /> Rider Location</span>
              <span><i className="line" /> Delivery Route</span>
            </div>
          </div>
          <div className="dp-map-foot">
            <span>Estimated Distance: <strong>{mapStats.distance}</strong></span>
            <span>Estimated Time: <strong>{mapStats.eta}</strong></span>
            <span>Active: <strong>{fleet.deliveries.length}</strong></span>
          </div>
        </section>

        <section className="dp-card sa-card">
          <div className="dp-card-head">
            <div className="dp-title">
              <span className="dp-icon green">
                <IconCheck />
              </span>
              <div>
                <h2>Delivery Status Monitoring</h2>
                <p>Track the status of ongoing deliveries.</p>
              </div>
            </div>
          </div>
          <div className="dp-monitor-list">
            {monitoring.length === 0 ? (
              <p className="dp-empty-monitor">No active deliveries to monitor yet.</p>
            ) : (
              monitoring.map((m) => (
                <div key={`${m.db_id || m.id}-${m.status}`} className="dp-monitor-row">
                  <div className="dp-avatar">{(m.name || '?')[0]}</div>
                  <div className="dp-monitor-info">
                    <strong>{m.name}</strong>
                    <span>{m.phone || 'No phone'}</span>
                    <span className="dp-order-ref">{m.id}</span>
                  </div>
                  <div className="dp-monitor-meta">
                    <span className={`dp-badge ${badgeClass(m.status)}`}>{m.status}</span>
                    <span className="dp-updated">Last update: {m.updated}</span>
                    <button
                      type="button"
                      className="dp-view"
                      onClick={() => {
                        setViewDelivery(m)
                        setFocusId(m.db_id || null)
                      }}
                    >
                      <IconEye /> View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="dp-status-legend">
            <span><i className="dot blue" /> Out for Delivery</span>
            <span><i className="dot green" /> Delivered</span>
            <span><i className="dot orange" /> Cancelled</span>
          </div>
        </section>
      </div>

      {assignOrder && (
        <div className="dp-backdrop" onClick={() => setAssignOrder(null)} role="presentation">
          <div className="dp-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dp-modal-head">
              <div className="dp-title">
                <span className="dp-icon yellow">
                  <IconBike />
                </span>
                <h2>Assign Rider</h2>
              </div>
              <button type="button" className="dp-close" onClick={() => setAssignOrder(null)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div className="dp-order-summary">
              <div><span>Order ID</span><strong>{assignOrder.id}</strong></div>
              <div><span>Customer</span><strong>{assignOrder.customer}</strong></div>
              <div><span>Address</span><strong>{assignOrder.address}</strong></div>
              <div><span>Order Total</span><strong>₱{assignOrder.total}</strong></div>
            </div>
            <label className="dp-label">
              Select Rider*
              <select value={rider} onChange={(e) => setRider(e.target.value)}>
                <option value="">Select an available rider</option>
                {riders.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="dp-assign-delivery"
              disabled={!rider}
              onClick={assignDelivery}
            >
              <IconSend /> Assign Delivery
            </button>
          </div>
        </div>
      )}

      {viewDelivery && (
        <div className="dp-backdrop" onClick={() => setViewDelivery(null)} role="presentation">
          <div className="dp-modal dp-view-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="dp-modal-head">
              <div className="dp-title">
                <span className="dp-icon green">
                  <IconEye />
                </span>
                <h2>Delivery Details</h2>
              </div>
              <button type="button" className="dp-close" onClick={() => setViewDelivery(null)} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <div className="dp-order-summary">
              <div><span>Order ID</span><strong>{viewDelivery.id}</strong></div>
              <div><span>Status</span><strong>{viewDelivery.status}</strong></div>
              <div><span>Rider</span><strong>{viewDelivery.name}</strong></div>
              <div><span>Rider Phone</span><strong>{viewDelivery.phone || 'N/A'}</strong></div>
              <div><span>Customer</span><strong>{viewDelivery.customer || 'N/A'}</strong></div>
              <div><span>Customer Phone</span><strong>{viewDelivery.customer_phone || 'N/A'}</strong></div>
              <div><span>Address</span><strong>{viewDelivery.address || 'N/A'}</strong></div>
              <div><span>Items</span><strong>{viewDelivery.items || 'N/A'}</strong></div>
              <div><span>Payment</span><strong>{viewDelivery.payment_method || 'COD'}</strong></div>
              <div><span>Order Total</span><strong>₱{Number(viewDelivery.total || 0).toFixed(2)}</strong></div>
              <div><span>Assigned</span><strong>{viewDelivery.assigned_at || '—'}</strong></div>
              <div><span>Last Update</span><strong>{viewDelivery.updated || '—'}</strong></div>
            </div>
            <button type="button" className="dp-assign-delivery" onClick={() => setViewDelivery(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
