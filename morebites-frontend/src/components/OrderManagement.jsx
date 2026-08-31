import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IconBag,
  IconCheck,
  IconChevronDown,
  IconClock,
  IconClose,
  IconDoc,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTruck,
} from './Icons'
import { ordersApi } from '../api/client'
import { MoreButton, RowActionMenuPopup, useRowActionMenu } from './RowActionMenu'
import './OrderManagement.css'

const STATUS_OPTIONS = ['All', 'Pending', 'Preparing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled']
const TYPE_OPTIONS = ['All', 'Online Order', 'Walk-in', 'Takeout', 'Dine-in', 'Room Service']
const DATE_OPTIONS = ['Today', 'This Week', 'This Month']
const MENU_TABS = ['All', 'Pizza', 'Pasta', 'Sides', 'Drinks', 'Desserts']

const INITIAL_ORDERS = []

const MENU_ITEMS_UNUSED = []

const PAGE_SIZE = 5

function peso(n) {
  return `₱ ${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
}

function statusClass(status) {
  const map = {
    Pending: 'pending',
    Preparing: 'preparing',
    Ready: 'ready',
    'Out for Delivery': 'delivery',
    Completed: 'completed',
    Cancelled: 'cancelled',
  }
  return map[status] || 'pending'
}

function FilterSelect({ label, value, options, open, onToggle, onSelect, menuRef }) {
  return (
    <div className="om-filter" ref={menuRef}>
      <button type="button" className="om-filter-btn" onClick={onToggle}>
        <span className="om-filter-label">{label}:</span>
        <span className="om-filter-value">{value}</span>
        <IconChevronDown />
      </button>
      {open && (
        <div className="om-filter-menu">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`om-filter-option${value === opt ? ' active' : ''}`}
              onClick={() => onSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CreateOrderModal({ orderId, onClose, onPlace, menuCatalog = [] }) {
  const [menuTab, setMenuTab] = useState('All')
  const [orderType, setOrderType] = useState('Dine-in')
  const [customerName, setCustomerName] = useState('')
  const [typeOpen, setTypeOpen] = useState(false)
  const [activeItem, setActiveItem] = useState(null)
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState([])
  const typeRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const visibleMenu = menuCatalog.filter(
    (item) => menuTab === 'All' || item.category === menuTab,
  )

  const total = cart.reduce((sum, line) => sum + line.price * line.qty, 0)

  function openItem(item) {
    setActiveItem(item.id)
    setQty(1)
  }

  function addToCart(item) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id)
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + qty } : p))
      }
      return [...prev, { ...item, qty }]
    })
    setActiveItem(null)
    setQty(1)
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((p) => p.id !== id))
  }

  function changeLineQty(id, next) {
    if (next < 1) {
      removeLine(id)
      return
    }
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: next } : p)))
  }

  function placeOrder() {
    if (!customerName.trim() || cart.length === 0) return
    onPlace({
      customer_name: customerName.trim(),
      order_type: orderType,
      items: cart.map((c) => ({
        name: c.name,
        menu_item_id: c.id,
        qty: c.qty,
        unit_price: c.price,
      })),
    })
  }

  return (
    <div className="om-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="om-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="om-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="om-modal-head">
          <h2 id="om-modal-title">Create New Order - {orderId}</h2>
          <button type="button" className="om-modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="om-modal-body">
          <section className="om-menu-pane">
            <h3>Select Items from Menu</h3>
            <div className="om-menu-tabs">
              {MENU_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`om-menu-tab${menuTab === tab ? ' active' : ''}`}
                  onClick={() => setMenuTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="om-menu-grid">
              {visibleMenu.map((item) => {
                const isActive = activeItem === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`om-menu-card${isActive ? ' active' : ''}`}
                    onClick={() => openItem(item)}
                  >
                    <div className="om-menu-card-name">{item.name}</div>
                    <div className="om-menu-card-meta">
                      {item.category.toUpperCase()} - {peso(item.price)}
                    </div>
                    <div className="om-menu-card-price">{peso(item.price)}.00</div>

                    {isActive && (
                      <div
                        className="om-menu-overlay"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <div className="om-qty">
                          <button
                            type="button"
                            onClick={() => setQty((q) => Math.max(1, q - 1))}
                            aria-label="Decrease quantity"
                          >
                            <IconMinus />
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty((q) => q + 1)}
                            aria-label="Increase quantity"
                          >
                            <IconPlus />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="om-add-cart"
                          onClick={() => addToCart(item)}
                        >
                          Add to Cart
                        </button>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="om-details-pane">
            <h3>Customer & Details</h3>

            <label className="om-field-label" htmlFor="order-type">
              Order Type
            </label>
            <div className="om-type-select" ref={typeRef}>
              <button
                id="order-type"
                type="button"
                className="om-type-btn"
                onClick={() => setTypeOpen((v) => !v)}
              >
                {orderType}
                <IconChevronDown />
              </button>
              {typeOpen && (
                <div className="om-filter-menu om-type-menu">
                  {TYPE_OPTIONS.filter((t) => t !== 'All').map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`om-filter-option${orderType === opt ? ' active' : ''}`}
                      onClick={() => {
                        setOrderType(opt)
                        setTypeOpen(false)
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="om-field-label" htmlFor="customer-name">
              Customer Name
            </label>
            <input
              id="customer-name"
              className="om-input"
              placeholder="e.g. John Henry"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <div className="om-cart">
              {cart.length === 0 ? (
                <div className="om-cart-empty">
                  <IconBag />
                  <p>No items yet. Select items from the menu.</p>
                </div>
              ) : (
                <ul className="om-cart-list">
                  {cart.map((line) => (
                    <li key={line.id}>
                      <div>
                        <strong>
                          {line.qty}x {line.name}
                        </strong>
                        <span>{peso(line.price * line.qty)}.00</span>
                      </div>
                      <div className="om-cart-actions">
                        <button type="button" onClick={() => changeLineQty(line.id, line.qty - 1)}>
                          <IconMinus />
                        </button>
                        <button type="button" onClick={() => changeLineQty(line.id, line.qty + 1)}>
                          <IconPlus />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="om-modal-footer">
              <div className="om-order-total">
                <span>Order Total</span>
                <strong>{peso(total)}.00</strong>
              </div>
              <div className="om-modal-actions">
                <button type="button" className="om-btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="om-btn-primary"
                  disabled={!customerName.trim() || cart.length === 0}
                  onClick={placeOrder}
                >
                  Place Order
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [menuCatalog, setMenuCatalog] = useState([])
  const [status, setStatus] = useState('All')

  async function loadOrders() {
    const [o, m] = await Promise.all([ordersApi.list(), ordersApi.menuOptions()])
    setOrders(o.data?.data || o.data || [])
    setMenuCatalog(m.data?.data || m.data || [])
  }

  useEffect(() => {
    loadOrders().catch(console.error)
  }, [])
  const [type, setType] = useState('All')
  const [date, setDate] = useState('Today')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [openFilter, setOpenFilter] = useState(null)
  const [saving, setSaving] = useState(false)
  const { menuRef, menu: rowMenu, toggleMenu, closeMenu: closeRowMenu } = useRowActionMenu()
  const [viewOrder, setViewOrder] = useState(null)

  const statusRef = useRef(null)
  const typeRef = useRef(null)
  const dateRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      const refs = [statusRef, typeRef, dateRef]
      if (refs.every((r) => r.current && !r.current.contains(e.target))) {
        setOpenFilter(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (status !== 'All' && o.status !== status) return false
      if (type !== 'All' && o.type !== type) return false
      if (q && !o.id.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [orders, status, type, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rowMenuOrder = rowMenu?.orderId
    ? orders.find((o) => o.db_id === rowMenu.orderId) || null
    : null

  const stats = {
    total: orders.length,
    completed: orders.filter((o) => o.status === 'Completed').length,
    pending: orders.filter((o) => o.status === 'Pending').length,
    delivery: orders.filter((o) => o.status === 'Out for Delivery').length,
  }

  const nextOrderId = `#ORD-${String(orders.length + 21).padStart(5, '0')}`

  function refresh() {
    setStatus('All')
    setType('All')
    setDate('Today')
    setSearch('')
    setPage(1)
  }

  async function handlePlace(payload) {
    setSaving(true)
    try {
      await ordersApi.create(payload)
      await loadOrders()
      setCreateOpen(false)
      setPage(1)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to create order.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(order) {
    if (order.action === 'View' || order.action === 'Track') {
      setViewOrder(order)
      return
    }
    const next =
      order.action === 'Confirm' ? 'Preparing' : order.action === 'Mark Ready' ? 'Ready' : null
    if (!next || !order.db_id) return
    try {
      const { data } = await ordersApi.updateStatus(order.db_id, next)
      const updated = data?.data || data
      setOrders((prev) => prev.map((o) => (o.db_id === order.db_id ? updated : o)))
    } catch (err) {
      console.error(err)
    }
  }

  async function cancelOrder(order) {
    if (!order?.db_id) return
    if (!window.confirm(`Cancel order ${order.id}?`)) return
    closeRowMenu()
    try {
      const { data } = await ordersApi.updateStatus(order.db_id, 'Cancelled')
      const updated = data?.data || data
      setOrders((prev) => prev.map((o) => (o.db_id === order.db_id ? updated : o)))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to cancel order.')
    }
  }

  async function markCompleted(order) {
    if (!order?.db_id) return
    closeRowMenu()
    try {
      const { data } = await ordersApi.updateStatus(order.db_id, 'Completed')
      const updated = data?.data || data
      setOrders((prev) => prev.map((o) => (o.db_id === order.db_id ? updated : o)))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Failed to update order.')
    }
  }

  return (
    <div className="om-page">
      <header className="om-header">
        <h1>Order Management</h1>
      </header>

      <section className="om-stats">
        <article className="om-stat sa-card">
          <div className="om-stat-icon yellow">
            <IconDoc />
          </div>
          <div>
            <div className="om-stat-label">Total Orders Today</div>
            <div className="om-stat-value">{stats.total}</div>
          </div>
        </article>
        <article className="om-stat sa-card">
          <div className="om-stat-icon green">
            <IconCheck />
          </div>
          <div>
            <div className="om-stat-label">Orders Completed</div>
            <div className="om-stat-value">{stats.completed}</div>
          </div>
        </article>
        <article className="om-stat sa-card">
          <div className="om-stat-icon amber">
            <IconClock />
          </div>
          <div>
            <div className="om-stat-label">Pending Orders</div>
            <div className="om-stat-value">{stats.pending}</div>
          </div>
        </article>
        <article className="om-stat sa-card">
          <div className="om-stat-icon blue">
            <IconTruck />
          </div>
          <div>
            <div className="om-stat-label">Out for Delivery</div>
            <div className="om-stat-value">{stats.delivery}</div>
          </div>
        </article>
      </section>

      <section className="om-toolbar sa-card">
        <div className="om-filters">
          <FilterSelect
            label="Status"
            value={status}
            options={STATUS_OPTIONS}
            open={openFilter === 'status'}
            onToggle={() => setOpenFilter((v) => (v === 'status' ? null : 'status'))}
            onSelect={(v) => {
              setStatus(v)
              setOpenFilter(null)
              setPage(1)
            }}
            menuRef={statusRef}
          />
          <FilterSelect
            label="Type"
            value={type}
            options={TYPE_OPTIONS}
            open={openFilter === 'type'}
            onToggle={() => setOpenFilter((v) => (v === 'type' ? null : 'type'))}
            onSelect={(v) => {
              setType(v)
              setOpenFilter(null)
              setPage(1)
            }}
            menuRef={typeRef}
          />
          <FilterSelect
            label="Date"
            value={date}
            options={DATE_OPTIONS}
            open={openFilter === 'date'}
            onToggle={() => setOpenFilter((v) => (v === 'date' ? null : 'date'))}
            onSelect={(v) => {
              setDate(v)
              setOpenFilter(null)
              setPage(1)
            }}
            menuRef={dateRef}
          />
        </div>

        <div className="om-toolbar-right">
          <div className="om-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Search by ID or Customer"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <button type="button" className="om-refresh" onClick={refresh}>
            <IconRefresh />
            Refresh
          </button>
          <button type="button" className="om-create" onClick={() => setCreateOpen(true)}>
            <IconPlus />
            Create Order
          </button>
        </div>
      </section>

      <section className="om-table-card sa-card">
        <div className="om-table-wrap">
          <table className="om-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Order Type</th>
                <th>Items</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="om-empty">
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((o) => (
                  <tr key={o.id}>
                    <td className="om-id">{o.id}</td>
                    <td>{o.customer}</td>
                    <td>{o.type}</td>
                    <td className="om-items">{o.items}</td>
                    <td className="om-price">{peso(o.price)}</td>
                    <td>
                      <span className={`om-badge ${statusClass(o.status)}`}>{o.status}</span>
                    </td>
                    <td>
                      <div className="om-actions">
                        <button
                          type="button"
                          className="om-action-btn"
                          onClick={() => handleAction(o)}
                          disabled={!['Confirm', 'Mark Ready', 'View', 'Track'].includes(o.action)}
                        >
                          {o.action}
                        </button>
                        <div className="om-more-wrap">
                          <MoreButton
                            onClick={(e) => toggleMenu(e, `order-${o.db_id}`, { orderId: o.db_id })}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="om-pagination">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + (filtered.length ? 1 : 0)} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} orders
          </span>
          <div className="om-pages">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {'<'}
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={n === currentPage ? 'active' : ''}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {'>'}
            </button>
          </div>
        </div>
      </section>

      {rowMenu && rowMenuOrder && (
        <RowActionMenuPopup menuRef={menuRef} top={rowMenu.top} left={rowMenu.left}>
          <button
            type="button"
            onClick={() => {
              setViewOrder(rowMenuOrder)
              closeRowMenu()
            }}
          >
            View Details
          </button>
          {['Ready', 'Out for Delivery'].includes(rowMenuOrder.status) ? (
            <button type="button" onClick={() => markCompleted(rowMenuOrder)}>
              Mark Completed
            </button>
          ) : null}
          {!['Completed', 'Cancelled'].includes(rowMenuOrder.status) ? (
            <button
              type="button"
              className="danger"
              onClick={() => cancelOrder(rowMenuOrder)}
            >
              Cancel Order
            </button>
          ) : null}
        </RowActionMenuPopup>
      )}

      {createOpen && (
        <CreateOrderModal
        orderId={nextOrderId}
        menuCatalog={menuCatalog}
        onClose={() => setCreateOpen(false)}
        onPlace={handlePlace}
      />
      )}

      {viewOrder && (
        <div className="om-modal-backdrop" onClick={() => setViewOrder(null)} role="presentation">
          <div
            className="om-detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="om-detail-head">
              <h2>Order Details</h2>
              <button
                type="button"
                className="om-modal-close"
                onClick={() => setViewOrder(null)}
                aria-label="Close"
              >
                <IconClose />
              </button>
            </div>
            <dl className="om-detail-grid">
              <div>
                <dt>Order ID</dt>
                <dd>{viewOrder.id}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`om-badge ${statusClass(viewOrder.status)}`}>
                    {viewOrder.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Customer</dt>
                <dd>{viewOrder.customer}</dd>
              </div>
              <div>
                <dt>Order Type</dt>
                <dd>{viewOrder.type}</dd>
              </div>
              <div className="full">
                <dt>Items</dt>
                <dd>{viewOrder.items || '—'}</dd>
              </div>
              <div className="full">
                <dt>Delivery Address</dt>
                <dd>{viewOrder.address || '—'}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className="om-price">{peso(viewOrder.price)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>
                  {viewOrder.created_at
                    ? new Date(viewOrder.created_at).toLocaleString()
                    : '—'}
                </dd>
              </div>
            </dl>
            <div className="om-detail-foot">
              <button type="button" className="om-btn-ghost" onClick={() => setViewOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
