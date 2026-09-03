import { useEffect, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import logo from '../assets/logo.png'
import {
  IconAccount,
  IconBell,
  IconBike,
  IconBox,
  IconCart,
  IconChevron,
  IconChevronDown,
  IconClipboard,
  IconCustomers,
  IconDispatch,
  IconGear,
  IconGrid,
  IconHelmet,
  IconInventory,
  IconLogout,
  IconMenu,
  IconOrders,
  IconReports,
} from './Icons'
import OrderManagement from './OrderManagement'
import MenuManagement from './MenuManagement'
import InventoryPage from './InventoryPage'
import DispatchManagement from './DispatchManagement'
import RecordsReports from './RecordsReports'
import CustomerManagement from './CustomerManagement'
import AccountManagement from './AccountManagement'
import DeliveryRatesSettings from './DeliveryRatesSettings'
import DriverManagement from './DriverManagement'
import { dashboardApi } from '../api/client'
import './SuperAdminDashboard.css'

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly']

const STATUS_COLORS = {
  Preparing: '#f0a020',
  Pending: '#2e9b4a',
  Completed: '#2f7de0',
  Cancelled: '#e53935',
  'Out for Delivery': '#7b61ff',
}

const adminNavItems = [
  { label: 'Dashboard', icon: IconGrid },
  { label: 'Orders', icon: IconOrders },
  { label: 'Menu', icon: IconMenu },
  { label: 'Inventory', icon: IconInventory },
  { label: 'Dispatch', icon: IconDispatch },
  { label: 'Reports', icon: IconReports },
  { label: 'Customers', icon: IconCustomers },
  { label: 'Account', icon: IconAccount },
  { label: 'Settings', icon: IconGear },
]

const cashierNavItems = [
  { label: 'Dashboard', icon: IconGrid },
  { label: 'Orders', icon: IconOrders },
  { label: 'Menu', icon: IconMenu },
  { label: 'Inventory', icon: IconInventory },
  { label: 'Dispatch', icon: IconDispatch },
  { label: 'Reports', icon: IconReports },
  { label: 'Driver', icon: IconHelmet },
]

const notifications = []

const notifTabs = ['All', 'Orders', 'Inventory', 'Dispatch', 'System']

function stockTone(level) {
  if (level <= 15) return 'critical'
  if (level <= 35) return 'low'
  return 'ok'
}

export default function SuperAdminDashboard({ user, onLogout }) {
  const isCashier = user?.role === 'cashier'
  const visibleNavItems = isCashier ? cashierNavItems : adminNavItems
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [salesPeriod, setSalesPeriod] = useState('Daily')
  const [periodOpen, setPeriodOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifTab, setNotifTab] = useState('All')
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [salesData, setSalesData] = useState([])
  const [salesTotalLabel, setSalesTotalLabel] = useState('₱0.00')
  const [totalOrdersToday, setTotalOrdersToday] = useState(0)
  const [activeOrders, setActiveOrders] = useState(0)
  const [orderStatus, setOrderStatus] = useState([])
  const [orders, setOrders] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [lowStocks, setLowStocks] = useState([])
  const notifRef = useRef(null)
  const periodRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    dashboardApi
      .get(salesPeriod)
      .then((res) => {
        if (cancelled) return
        const d = res.data?.data || {}
        const stats = d.stats || {}
        setSalesTotalLabel(stats.total_sales_label || '₱0.00')
        setTotalOrdersToday(stats.total_orders || 0)
        setActiveOrders(stats.active_orders || 0)
        setSalesData(d.sales || [])
        setOrderStatus(
          (d.order_status || []).map((row) => ({
            ...row,
            color: STATUS_COLORS[row.name] || '#888',
          })),
        )
        setOrders(
          (d.recent_orders || []).map((o) => ({
            ...o,
            tone:
              o.status === 'Completed'
                ? 'green'
                : o.status === 'Out for Delivery'
                  ? 'blue'
                  : 'orange',
          })),
        )
        setActivityLog(d.activity_log || [])
        setLowStocks(d.low_stocks || [])
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [salesPeriod])

  const displayName = user?.name || 'John Doe'
  const displayRole =
    user?.role === 'super_admin' || user?.role === 'admin'
      ? 'Administrator'
      : user?.role === 'cashier'
        ? 'Cashier'
        : user?.role || 'Administrator'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'JD'

  useEffect(() => {
    function onDocClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setShowLogoutModal(false)
      }
    }
    if (showLogoutModal) {
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [showLogoutModal])

  const filteredNotifs =
    notifTab === 'All' ? notifications : notifications.filter((n) => n.tab === notifTab)


  const orderTotal = orderStatus.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className="sa-layout">
      <aside className="sa-sidebar">
        <div className="sa-logo-wrap">
          <img src={logo} alt="MOREBYTES LOGO.png" className="sa-logo" />
        </div>
        <div className="sa-sidebar-divider" />

        <nav className="sa-nav">
          {visibleNavItems.map(({ label, icon: Icon }) => {
            const isActive = activeNav === label
            return (
              <button
                key={label}
                type="button"
                className={`sa-nav-item${isActive ? ' active' : ''}`}
                onClick={() => setActiveNav(label)}
              >
                {isActive && <span className="sa-nav-accent" />}
                <Icon className="sa-nav-icon" />
                <span className="sa-nav-label">{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sa-sidebar-footer">
          <div className="sa-sidebar-divider" />
          <div className="sa-profile">
            <div className="sa-avatar">{initials}</div>
            <div className="sa-profile-text">
              <div className="sa-profile-name" title={displayName}>{displayName}</div>
              <div className="sa-profile-role" title={displayRole}>{displayRole}</div>
            </div>
            <button
              type="button"
              className="sa-logout-btn"
              aria-label="Log Out"
              title="Log Out"
              onClick={() => setShowLogoutModal(true)}
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {showLogoutModal && (
        <div
          className="sa-logout-backdrop"
          onClick={() => setShowLogoutModal(false)}
          role="presentation"
        >
          <div
            className="sa-logout-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sa-logout-title"
          >
            <h3 id="sa-logout-title" className="sa-logout-title">
              Log Out?
            </h3>
            <p className="sa-logout-text">
              Are you sure you want to log out of your account?
            </p>
            <div className="sa-logout-actions">
              <button
                type="button"
                className="sa-logout-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sa-logout-confirm"
                onClick={() => {
                  setShowLogoutModal(false)
                  onLogout?.()
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="sa-main">
        {activeNav === 'Orders' ? (
          <OrderManagement />
        ) : activeNav === 'Menu' ? (
          <MenuManagement />
        ) : activeNav === 'Inventory' ? (
          <InventoryPage />
        ) : activeNav === 'Dispatch' ? (
          <DispatchManagement />
        ) : activeNav === 'Reports' ? (
          <RecordsReports />
        ) : activeNav === 'Driver' ? (
          <DriverManagement />
        ) : !isCashier && activeNav === 'Customers' ? (
          <CustomerManagement />
        ) : !isCashier && activeNav === 'Account' ? (
          <AccountManagement />
        ) : !isCashier && activeNav === 'Settings' ? (
          <DeliveryRatesSettings />
        ) : (
          <>
        <header className="sa-header">
          <div>
            <h1>Dashboard</h1>
            <p>{isCashier ? 'Welcome Back, Cashier' : 'Welcome Back, Super Admin'}</p>
          </div>

          <div className="sa-bell-wrap" ref={notifRef}>
            <button
              type="button"
              className="sa-bell"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <IconBell />
              {notifications.some((n) => n.unread) ? <span className="sa-bell-dot" /> : null}
            </button>

            {notifOpen && (
              <div className="sa-notif">
                <div className="sa-notif-head">
                  <h3>Notifications</h3>
                  <button type="button" className="sa-link">
                    Mark all as read
                  </button>
                </div>

                <div className="sa-notif-tabs">
                  {notifTabs.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`sa-notif-tab${notifTab === tab ? ' active' : ''}`}
                      onClick={() => setNotifTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="sa-notif-list">
                  {filteredNotifs.length === 0 ? (
                    <div className="sa-notif-empty" style={{ padding: '24px 16px', textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
                      No notifications
                    </div>
                  ) : (
                    filteredNotifs.map((n) => {
                    const Icon = n.icon
                    return (
                      <div key={n.id} className="sa-notif-item">
                        <div
                          className="sa-notif-icon"
                          style={{ background: n.tone.bg, color: n.tone.color }}
                        >
                          <Icon />
                        </div>
                        <div className="sa-notif-body">
                          <strong>{n.title}</strong>
                          <p>{n.body}</p>
                        </div>
                        <div className="sa-notif-meta">
                          <span className="sa-notif-time">{n.time}</span>
                          {n.unread && <span className="sa-unread" />}
                        </div>
                      </div>
                    )
                  })
                  )}
                </div>

                <div className="sa-notif-foot">
                  <button type="button">
                    View All Notifications <IconChevron />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="sa-stats">
          <article className="sa-card sa-stat">
            <div className="sa-stat-icon yellow">
              <IconCart />
            </div>
            <div>
              <div className="sa-stat-label">Total Sales (Today)</div>
              <div className="sa-stat-value">{salesTotalLabel}</div>
            </div>
          </article>

          <article className="sa-card sa-stat">
            <div className="sa-stat-icon green">
              <IconClipboard />
            </div>
            <div>
              <div className="sa-stat-label">Total Orders (Today)</div>
              <div className="sa-stat-value">{totalOrdersToday}</div>
            </div>
          </article>

          <article className="sa-card sa-stat">
            <div className="sa-stat-icon blue">
              <IconBike />
            </div>
            <div>
              <div className="sa-stat-label">Active Orders</div>
              <div className="sa-stat-value">{activeOrders}</div>
            </div>
          </article>
        </section>

        <section className="sa-row-mid">
          <article className="sa-card">
            <div className="sa-card-head">
              <h2 className="sa-card-title">Sales Overview</h2>
            </div>

            <div className="sa-sales-controls">
              <div className="sa-select-wrap" ref={periodRef}>
                <button
                  type="button"
                  className="sa-select-btn"
                  onClick={() => setPeriodOpen((v) => !v)}
                >
                  {salesPeriod} <IconChevronDown />
                </button>
                {periodOpen && (
                  <div className="sa-select-menu">
                    {PERIODS.map((period) => (
                      <button
                        key={period}
                        type="button"
                        className={`sa-select-option${salesPeriod === period ? ' active' : ''}`}
                        onClick={() => {
                          setSalesPeriod(period)
                          setPeriodOpen(false)
                        }}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sa-time-range">
                From <span>8:00 AM</span> To <span>8:00 PM</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesData} barSize={26}>
                <XAxis
                  dataKey="t"
                  tick={{ fill: '#8a8a8a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#8a8a8a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(240,160,32,0.08)' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #eee',
                    fontSize: 12,
                  }}
                  formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Sales']}
                />
                <Bar dataKey="v" fill="#f0a020" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </article>

          <article className="sa-card">
            <div className="sa-card-head">
              <h2 className="sa-card-title">Activity Log</h2>
              <span style={{ fontSize: 11, color: '#6b6b6b' }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activityLog.map((row) => (
                  <tr key={`${row.time}-${row.action}`}>
                    <td style={{ color: '#6b6b6b', whiteSpace: 'nowrap' }}>{row.time}</td>
                    <td>{row.user}</td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </section>

        <section className="sa-row-bot">
          <article className="sa-card">
            <div className="sa-card-head">
              <h2 className="sa-card-title">Order Status (Today)</h2>
            </div>
            <div className="sa-donut-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderStatus}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={2}
                  >
                    {orderStatus.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="sa-donut-center">
                <div>
                  <strong>{orderTotal}</strong>
                  <span>Total Orders</span>
                </div>
              </div>
            </div>
            <div className="sa-legend">
              {orderStatus.map((s) => (
                <div key={s.name} className="sa-legend-row">
                  <i className="sa-dot" style={{ background: s.color }} />
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <strong style={{ color: '#1a1a1a' }}>{s.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="sa-card">
            <div className="sa-card-head">
              <h2 className="sa-card-title">Order Status (Today)</h2>
              <button type="button" className="sa-link">
                View All
              </button>
            </div>
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="sa-order-id">{o.id}</td>
                    <td>{o.customer}</td>
                    <td>
                      <span className={`sa-badge ${o.tone}`}>{o.status}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{o.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="sa-card">
            <div className="sa-card-head">
              <h2 className="sa-card-title">Low Stocks Alert</h2>
              <button type="button" className="sa-link">
                View All
              </button>
            </div>
            {lowStocks.map((item) => {
              const tone = stockTone(item.level)
              return (
                <div key={item.name} className="sa-stock">
                  <div className="sa-stock-top">
                    <span className={`sa-stock-name ${tone}`}>{item.name}</span>
                    <span className="sa-stock-qty">{item.qty}</span>
                  </div>
                  <div className="sa-bar">
                    <i className={tone} style={{ width: `${item.level}%` }} />
                  </div>
                </div>
              )
            })}
          </article>
        </section>
          </>
        )}
      </main>
    </div>
  )
}
