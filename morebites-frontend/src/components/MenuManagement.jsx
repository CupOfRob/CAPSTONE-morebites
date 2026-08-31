import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconChevronDown,
  IconClose,
  IconEdit,
  IconImage,
  IconPlus,
  IconRestore,
  IconSearch,
  IconTrash,
} from './Icons'
import { inventoryApi, mediaUrl, menuApi } from '../api/client'
import './MenuManagement.css'

const CATEGORIES = ['Pizza', 'Pasta', 'Sides', 'Beverages', 'Desserts']
const PAGE_SIZE = 8

function peso(n) {
  return `₱ ${Number(n).toLocaleString('en-PH')}`
}

function formatPrice(item) {
  if (item.hasSizes && item.sizes.length) {
    const prices = item.sizes.map((s) => Number(s.price))
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    return min === max ? peso(min) : `${peso(min)} - ${peso(max)}`
  }
  return peso(item.price)
}

function formatSizes(item) {
  if (item.hasSizes && item.sizes.length) {
    return item.sizes.map((s) => s.name).join(', ')
  }
  return 'No sizes'
}

function formatRecipeHint(item) {
  const list = item.ingredients || []
  if (!list.length) return 'No recipe linked'
  if (list.length === 1) {
    const row = list[0]
    return `${row.name || 'Ingredient'} · ${row.qty_per_serving} ${row.unit || ''}`.trim()
  }
  return `${list.length} ingredients linked`
}

function emptyForm() {
  return {
    id: null,
    name: '',
    description: '',
    category: '',
    image: '',
    imageFile: null,
    hasSizes: false,
    sizes: [{ name: '', price: '' }],
    ingredients: [],
    price: '',
    available: true,
  }
}

function ItemFormModal({ mode, initial, inventoryOptions, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...emptyForm(),
    ...initial,
    description: initial?.description || '',
    price: initial?.price ?? '',
    imageFile: null,
    sizes:
      initial?.hasSizes && initial?.sizes?.length
        ? initial.sizes.map((s) => ({ name: s.name, price: String(s.price) }))
        : [{ name: '', price: '' }],
    ingredients: (initial?.ingredients || []).map((row) => ({
      inventory_item_id: String(row.inventory_item_id || ''),
      qty_per_serving: row.qty_per_serving != null ? String(row.qty_per_serving) : '',
    })),
  }))
  const [catOpen, setCatOpen] = useState(false)
  const [ingOpenIndex, setIngOpenIndex] = useState(null)
  const [saving, setSaving] = useState(false)
  const catRef = useRef(null)
  const fileRef = useRef(null)
  const ingRefs = useRef({})

  useEffect(() => {
    function onDoc(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false)
      if (ingOpenIndex != null) {
        const ref = ingRefs.current[ingOpenIndex]
        if (ref && !ref.contains(e.target)) setIngOpenIndex(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [ingOpenIndex])

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setForm((prev) => ({ ...prev, image: url, imageFile: file }))
  }

  function updateSize(index, key, value) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }))
  }

  function addSizeRow() {
    setForm((prev) => ({
      ...prev,
      sizes: [...prev.sizes, { name: '', price: '' }],
    }))
  }

  function removeSizeRow(index) {
    setForm((prev) => ({
      ...prev,
      sizes: prev.sizes.length <= 1 ? prev.sizes : prev.sizes.filter((_, i) => i !== index),
    }))
  }

  function updateIngredient(index, key, value) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((row, i) =>
        i === index ? { ...row, [key]: value } : row,
      ),
    }))
  }

  function addIngredientRow() {
    setForm((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventory_item_id: '', qty_per_serving: '' }],
    }))
  }

  function removeIngredientRow(index) {
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }))
    setIngOpenIndex(null)
  }

  async function submit() {
    try {
      if (!String(form.name || '').trim()) {
        alert('Enter an item name.')
        return
      }
      if (!form.category) {
        alert('Select a category.')
        return
      }

      const recipeRows = form.ingredients.filter(
        (row) => row.inventory_item_id && row.qty_per_serving !== '',
      )
      for (const row of recipeRows) {
        if (Number(row.qty_per_serving) <= 0 || Number.isNaN(Number(row.qty_per_serving))) {
          alert('Each linked ingredient needs a quantity greater than 0.')
          return
        }
      }
      const ids = recipeRows.map((r) => r.inventory_item_id)
      if (new Set(ids).size !== ids.length) {
        alert('Each inventory item can only be linked once.')
        return
      }

      const ingredients = recipeRows.map((row) => ({
        inventory_item_id: Number(row.inventory_item_id),
        qty_per_serving: Number(row.qty_per_serving),
      }))

      const description = String(form.description || '').trim()
      let payload
      if (form.hasSizes) {
        const validSizes = form.sizes.filter((s) => s.name.trim() && s.price !== '')
        if (!validSizes.length) {
          alert('Add at least one size with a price.')
          return
        }
        payload = {
          ...form,
          name: String(form.name).trim(),
          description,
          price: 0,
          sizes: validSizes.map((s) => ({ name: s.name.trim(), price: Number(s.price) })),
          ingredients,
        }
      } else {
        if (form.price === '' || Number.isNaN(Number(form.price))) {
          alert('Enter a price.')
          return
        }
        payload = {
          ...form,
          name: String(form.name).trim(),
          description,
          price: Number(form.price),
          sizes: [],
          ingredients,
        }
      }

      setSaving(true)
      await onSave(payload)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || err.message || 'Failed to save menu item.')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'edit' ? 'Edit Menu Item' : 'Add Menu Item'
  const primaryLabel = mode === 'edit' ? 'Save Changes' : 'Add Item'
  const selectedIds = new Set(
    form.ingredients.map((r) => r.inventory_item_id).filter(Boolean),
  )

  return (
    <div className="mm-backdrop" onClick={onClose} role="presentation">
      <div
        className="mm-modal mm-form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-form-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mm-modal-head">
          <h2 id="mm-form-title">{title}</h2>
          <button type="button" className="mm-icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="mm-form-body">
          <button
            type="button"
            className="mm-upload"
            onClick={() => fileRef.current?.click()}
          >
            {form.image ? (
              <img src={mediaUrl(form.image)} alt="" />
            ) : (
              <>
                <IconImage />
                <span>Upload Image</span>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onImagePick}
            />
          </button>

          <div className="mm-form-fields">
            <label className="mm-label" htmlFor="mm-name">
              Item Name
            </label>
            <input
              id="mm-name"
              className="mm-input"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="e.g. Hawaiian Overload"
            />

            <label className="mm-label" htmlFor="mm-desc">
              Description
            </label>
            <textarea
              id="mm-desc"
              className="mm-textarea"
              rows={3}
              value={form.description || ''}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Short description of the item"
            />

            <label className="mm-label">Category</label>
            <div className="mm-select" ref={catRef}>
              <button
                type="button"
                className="mm-select-btn"
                onClick={() => setCatOpen((v) => !v)}
              >
                {form.category || 'Select Category'}
                <IconChevronDown />
              </button>
              {catOpen && (
                <div className="mm-select-menu">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`mm-select-option${form.category === c ? ' active' : ''}`}
                      onClick={() => {
                        setField('category', c)
                        setCatOpen(false)
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mm-toggle-row">
              <span>This item has size options</span>
              <button
                type="button"
                className={`mm-toggle${form.hasSizes ? ' on' : ''}`}
                aria-pressed={form.hasSizes}
                onClick={() => setField('hasSizes', !form.hasSizes)}
              >
                <span />
              </button>
            </div>

            {!form.hasSizes ? (
              <>
                <label className="mm-label" htmlFor="mm-price">
                  Fixed Price
                </label>
                <div className="mm-price-wrap">
                  <span>₱</span>
                  <input
                    id="mm-price"
                    className="mm-input"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            ) : (
              <div className="mm-sizes">
                <div className="mm-sizes-head">
                  <span>Size</span>
                  <span>Price (₱)</span>
                  <span />
                </div>
                {form.sizes.map((row, i) => (
                  <div key={i} className="mm-size-row">
                    <input
                      className="mm-input"
                      placeholder="e.g. Small"
                      value={row.name}
                      onChange={(e) => updateSize(i, 'name', e.target.value)}
                    />
                    <input
                      className="mm-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={row.price}
                      onChange={(e) => updateSize(i, 'price', e.target.value)}
                    />
                    <button
                      type="button"
                      className="mm-icon-btn danger"
                      aria-label="Remove size"
                      onClick={() => removeSizeRow(i)}
                    >
                      <IconClose />
                    </button>
                  </div>
                ))}
                <button type="button" className="mm-add-size" onClick={addSizeRow}>
                  <IconPlus /> Add Sizes
                </button>
              </div>
            )}

            <div className="mm-recipe">
              <label className="mm-label">Link Ingredients</label>
              <p className="mm-recipe-hint">
                Connect inventory stock used per serving. Orders deduct these amounts.
                Leave empty to manage availability manually.
              </p>

              {form.ingredients.length > 0 && (
                <div className="mm-recipe-head">
                  <span>Inventory item</span>
                  <span>Qty / serving</span>
                  <span />
                </div>
              )}

              {form.ingredients.map((row, i) => {
                const selected = inventoryOptions.find(
                  (opt) => String(opt.id) === String(row.inventory_item_id),
                )
                return (
                  <div key={i} className="mm-recipe-row">
                    <div
                      className="mm-select mm-recipe-select"
                      ref={(el) => {
                        ingRefs.current[i] = el
                      }}
                    >
                      <button
                        type="button"
                        className="mm-select-btn"
                        onClick={() => setIngOpenIndex((v) => (v === i ? null : i))}
                      >
                        <span className="mm-recipe-select-label">
                          {selected
                            ? `${selected.name} (${selected.stock} ${selected.unit})`
                            : 'Select ingredient'}
                        </span>
                        <IconChevronDown />
                      </button>
                      {ingOpenIndex === i && (
                        <div className="mm-select-menu mm-recipe-menu">
                          {inventoryOptions.length === 0 ? (
                            <div className="mm-select-empty">No inventory items yet</div>
                          ) : (
                            inventoryOptions.map((opt) => {
                              const taken =
                                selectedIds.has(String(opt.id)) &&
                                String(opt.id) !== String(row.inventory_item_id)
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={taken}
                                  className={`mm-select-option${
                                    String(opt.id) === String(row.inventory_item_id)
                                      ? ' active'
                                      : ''
                                  }`}
                                  onClick={() => {
                                    if (taken) return
                                    updateIngredient(i, 'inventory_item_id', String(opt.id))
                                    setIngOpenIndex(null)
                                  }}
                                >
                                  {opt.name}
                                  <span className="mm-recipe-stock">
                                    {opt.stock} {opt.unit}
                                  </span>
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mm-recipe-qty">
                      <input
                        className="mm-input"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={row.qty_per_serving}
                        onChange={(e) => updateIngredient(i, 'qty_per_serving', e.target.value)}
                      />
                      <span className="mm-recipe-unit">{selected?.unit || 'unit'}</span>
                    </div>

                    <button
                      type="button"
                      className="mm-icon-btn danger"
                      aria-label="Remove ingredient"
                      onClick={() => removeIngredientRow(i)}
                    >
                      <IconClose />
                    </button>
                  </div>
                )
              })}

              <button type="button" className="mm-add-size" onClick={addIngredientRow}>
                <IconPlus /> Add Ingredient
              </button>
            </div>
          </div>
        </div>

        <div className="mm-modal-foot">
          <button type="button" className="mm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mm-btn-primary" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, confirmLabel, onClose, onConfirm }) {
  return (
    <div className="mm-backdrop" onClick={onClose} role="presentation">
      <div
        className="mm-modal mm-confirm"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="mm-modal-foot">
          <button type="button" className="mm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="mm-btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MenuManagement() {
  const [items, setItems] = useState([])
  const [inventoryOptions, setInventoryOptions] = useState([])

  const reloadMenu = useCallback(() => {
    menuApi.list().then((r) => setItems(r.data?.data || r.data || [])).catch(console.error)
  }, [])

  const reloadInventory = useCallback(() => {
    inventoryApi
      .list()
      .then((r) => setInventoryOptions(r.data?.data || r.data || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    reloadMenu()
    reloadInventory()
    const onInv = () => {
      reloadMenu()
      reloadInventory()
    }
    window.addEventListener('mb:inventory-changed', onInv)
    const timer = setInterval(reloadMenu, 15000)
    return () => {
      window.removeEventListener('mb:inventory-changed', onInv)
      clearInterval(timer)
    }
  }, [reloadMenu, reloadInventory])
  const [tab, setTab] = useState('active')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All Categories')
  const [catOpen, setCatOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [formState, setFormState] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const catRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const activeCount = items.filter((i) => !i.archived).length
  const archivedCount = items.filter((i) => i.archived).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (tab === 'active' && item.archived) return false
      if (tab === 'archived' && !item.archived) return false
      if (category !== 'All Categories' && item.category !== category) return false
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false
      }
      return true
    })
  }, [items, tab, search, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function toggleAvailable(item) {
    if (item.stockOk === false) return
    try {
      const { data } = await menuApi.toggleAvailability(item.id)
      const updated = data?.data || data
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)))
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Could not update availability.')
    }
  }

  async function saveItem(data) {
    const payload = {
      name: data.name,
      description: data.description || null,
      category: data.category,
      image: data.imageFile ? null : data.image || null,
      imageFile: data.imageFile || null,
      has_sizes: Boolean(data.hasSizes),
      price: data.hasSizes ? 0 : data.price,
      sizes: data.hasSizes ? data.sizes : [],
      ingredients: data.ingredients || [],
    }
    try {
      if (formState?.mode === 'edit') {
        const { data: res } = await menuApi.update(data.id, payload)
        const updated = res?.data || res
        setItems((prev) => prev.map((item) => (item.id === data.id ? updated : item)))
      } else {
        const { data: res } = await menuApi.create(payload)
        const created = res?.data || res
        setItems((prev) => [created, ...prev])
        setTab('active')
        setPage(1)
      }
      setFormState(null)
      window.dispatchEvent(new CustomEvent('mb:inventory-changed'))
    } catch (err) {
      console.error(err)
      const errors = err.response?.data?.errors
      const firstError = errors
        ? Object.values(errors).flat()[0]
        : null
      alert(firstError || err.response?.data?.message || 'Failed to save menu item.')
    }
  }

  async function runConfirm() {
    if (!confirm) return
    try {
      if (confirm.type === 'archive') {
        const { data } = await menuApi.archive(confirm.item.id)
        const updated = data?.data || data
        setItems((prev) => prev.map((item) => (item.id === confirm.item.id ? updated : item)))
      }
      if (confirm.type === 'restore') {
        const { data } = await menuApi.restore(confirm.item.id)
        const updated = data?.data || data
        setItems((prev) => prev.map((item) => (item.id === confirm.item.id ? updated : item)))
      }
      setConfirm(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="mm-page">
      <header className="mm-header">
        <h1>Menu Management</h1>
        <div className="mm-header-actions">
          <div className="mm-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Search menu items by name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className="mm-select" ref={catRef}>
            <button
              type="button"
              className="mm-select-btn"
              onClick={() => setCatOpen((v) => !v)}
            >
              {category}
              <IconChevronDown />
            </button>
            {catOpen && (
              <div className="mm-select-menu">
                {['All Categories', ...CATEGORIES].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`mm-select-option${category === c ? ' active' : ''}`}
                    onClick={() => {
                      setCategory(c)
                      setCatOpen(false)
                      setPage(1)
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="mm-btn-primary mm-add-btn"
            onClick={() => {
              reloadInventory()
              setFormState({ mode: 'add', item: emptyForm() })
            }}
          >
            <IconPlus /> Add New Item
          </button>
        </div>
      </header>

      <div className="mm-tabs">
        <button
          type="button"
          className={`mm-tab${tab === 'active' ? ' active' : ''}`}
          onClick={() => {
            setTab('active')
            setPage(1)
          }}
        >
          Active Items <span>{activeCount}</span>
        </button>
        <button
          type="button"
          className={`mm-tab${tab === 'archived' ? ' active' : ''}`}
          onClick={() => {
            setTab('archived')
            setPage(1)
          }}
        >
          Archived <span>{archivedCount}</span>
        </button>
      </div>

      <section className="mm-table-card sa-card">
        <div className="mm-table-wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>{tab === 'active' ? 'Availability' : 'Size Options'}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="mm-empty">
                    No menu items found.
                  </td>
                </tr>
              ) : (
                rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <img className="mm-thumb" src={mediaUrl(item.image)} alt="" />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mm-item-name"
                        onClick={() => {
                          reloadInventory()
                          setFormState({ mode: 'edit', item })
                        }}
                      >
                        {item.name}
                      </button>
                      <div className="mm-size-hint">{formatRecipeHint(item)}</div>
                      {tab === 'archived' && (
                        <div className="mm-size-hint">{formatSizes(item)}</div>
                      )}
                      {tab === 'active' && item.stockOk === false ? (
                        <div className="mm-size-hint">Disabled — insufficient ingredients</div>
                      ) : null}
                    </td>
                    <td>
                      <span className="mm-cat-badge">{item.category}</span>
                    </td>
                    <td className="mm-price">{formatPrice(item)}</td>
                    <td>
                      {tab === 'active' ? (
                        <button
                          type="button"
                          className={`mm-toggle${item.available ? ' on' : ''}`}
                          aria-label={`Toggle availability for ${item.name}`}
                          aria-pressed={item.available}
                          disabled={item.stockOk === false}
                          title={
                            item.stockOk === false
                              ? 'Disabled because ingredients are insufficient'
                              : undefined
                          }
                          onClick={() => toggleAvailable(item)}
                        >
                          <span />
                        </button>
                      ) : (
                        <span className="mm-size-text">{formatSizes(item)}</span>
                      )}
                    </td>
                    <td>
                      <div className="mm-row-actions">
                        <button
                          type="button"
                          className="mm-action edit"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            reloadInventory()
                            setFormState({ mode: 'edit', item })
                          }}
                        >
                          <IconEdit />
                        </button>
                        {tab === 'active' ? (
                          <button
                            type="button"
                            className="mm-action danger"
                            aria-label={`Archive ${item.name}`}
                            onClick={() =>
                              setConfirm({
                                type: 'archive',
                                item,
                                title: 'Archive Item',
                                message: `${item.name} will be removed from the active menu and moved to Archived.`,
                                confirmLabel: 'Archive',
                              })
                            }
                          >
                            <IconTrash />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="mm-action restore"
                            aria-label={`Restore ${item.name}`}
                            onClick={() =>
                              setConfirm({
                                type: 'restore',
                                item,
                                title: 'Restore Menu Item',
                                message: `${item.name}. This item will be moved back to Active Menu and visible to customers again.`,
                                confirmLabel: 'Yes, Restore it',
                              })
                            }
                          >
                            <IconRestore />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mm-pagination">
          <span>
            Showing {(currentPage - 1) * PAGE_SIZE + (filtered.length ? 1 : 0)}-
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} items
          </span>
          <div className="mm-pages">
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

      {formState && (
        <ItemFormModal
          mode={formState.mode}
          initial={formState.item}
          inventoryOptions={inventoryOptions}
          onClose={() => setFormState(null)}
          onSave={saveItem}
        />
      )}

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </div>
  )
}
