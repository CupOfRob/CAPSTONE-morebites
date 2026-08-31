import { useEffect, useState } from 'react'
import { IconCheck, IconTrash } from './Icons'
import { archiveApi } from '../api/client'
import './ArchivePage.css'

const INITIAL_ADMINS = []

const INITIAL_DRIVERS = []

export default function ArchivePage({ embedded = false }) {
  const [admins, setAdmins] = useState([])
  const [drivers, setDrivers] = useState([])
  const [stats, setStats] = useState({ active_admins: 0, active_drivers: 0 })
  const [confirm, setConfirm] = useState(null)
  const [adminPage, setAdminPage] = useState(1)
  const [driverPage, setDriverPage] = useState(1)

  async function loadArchive() {
    const r = await archiveApi.list()
    const d = r.data?.data || r.data || {}
    setAdmins(d.admins || [])
    setDrivers(d.drivers || [])
    setStats(d.stats || { active_admins: 0, active_drivers: 0 })
  }

  useEffect(() => {
    loadArchive().catch(console.error)
  }, [])

  async function restore(type, item) {
    const id = item.db_id
    if (!id) return
    try {
      await archiveApi.restore(id)
      await loadArchive()
    } catch (err) {
      console.error(err)
    }
  }

  function askDelete(type, item) {
    setConfirm({
      type,
      item,
      message:
        type === 'admin'
          ? `Are you sure you're going to permanently delete ${item.name} as admin?`
          : `Are you sure you're going to permanently delete ${item.name} as Driver?`,
    })
  }

  async function doDelete() {
    if (!confirm?.item?.db_id) return
    try {
      await archiveApi.destroy(confirm.item.db_id)
      await loadArchive()
      setConfirm(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="ar-page">
      {!embedded ? (
        <header className="ar-header">
          <h1>Archive</h1>
        </header>
      ) : null}

      <section className="ar-stats">
        <article className="ar-stat sa-card">
          <div className="ar-stat-label">Active Admin</div>
          <div className="ar-stat-value">{stats.active_admins ?? 0}</div>
        </article>
        <article className="ar-stat sa-card">
          <div className="ar-stat-label">Active Drivers</div>
          <div className="ar-stat-value">{stats.active_drivers ?? 0}</div>
        </article>
      </section>

      <section className="ar-section sa-card">
        <h2>Admin Archives</h2>
        <div className="ar-table-wrap">
          <table className="ar-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ar-empty">No archived admins.</td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id}>
                    <td className="ar-id">{a.id}</td>
                    <td>{a.name}</td>
                    <td>{a.email}</td>
                    <td><span className="ar-badge">{a.status}</span></td>
                    <td>
                      <div className="ar-actions">
                        <button type="button" className="ar-icon restore" aria-label="Restore" onClick={() => restore('admin', a)}>
                          <IconCheck />
                        </button>
                        <button type="button" className="ar-icon danger" aria-label="Delete" onClick={() => askDelete('admin', a)}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="ar-pages">
          <button type="button" className={adminPage === 1 ? 'active' : ''} onClick={() => setAdminPage(1)}>1</button>
          <button type="button" className={adminPage === 2 ? 'active' : ''} onClick={() => setAdminPage(2)}>2</button>
          <button type="button">{'>'}</button>
        </div>
      </section>

      <section className="ar-section sa-card">
        <h2>Driver Archives</h2>
        <div className="ar-table-wrap">
          <table className="ar-table">
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Driver Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ar-empty">No archived drivers.</td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id}>
                    <td className="ar-id">{d.id}</td>
                    <td>{d.name}</td>
                    <td>{d.email}</td>
                    <td><span className="ar-badge">{d.status}</span></td>
                    <td>
                      <div className="ar-actions">
                        <button type="button" className="ar-icon restore" aria-label="Restore" onClick={() => restore('driver', d)}>
                          <IconCheck />
                        </button>
                        <button type="button" className="ar-icon danger" aria-label="Delete" onClick={() => askDelete('driver', d)}>
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="ar-pages">
          <button type="button" className={driverPage === 1 ? 'active' : ''} onClick={() => setDriverPage(1)}>1</button>
          <button type="button" className={driverPage === 2 ? 'active' : ''} onClick={() => setDriverPage(2)}>2</button>
          <button type="button">{'>'}</button>
        </div>
      </section>

      {confirm && (
        <div className="ar-backdrop" onClick={() => setConfirm(null)} role="presentation">
          <div className="ar-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h2>WARNING!</h2>
            <p>{confirm.message}</p>
            <div className="ar-modal-foot">
              <button type="button" className="ar-btn-cancel" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="ar-btn-yes" onClick={doDelete}>Yes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
