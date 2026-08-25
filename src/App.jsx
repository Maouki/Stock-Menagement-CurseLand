import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase, isConfigured } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import FilterBar from './components/FilterBar'
import ProductTable from './components/ProductTable'
import ProductModal from './components/ProductModal'
import DeleteModal from './components/DeleteModal'
import ShipmentModal from './components/ShipmentModal'
import Toast from './components/Toast'
import AlertBanner from './components/AlertBanner'
import SetupGuide from './components/SetupGuide'
import LoginPage from './components/LoginPage'

// App only decides which top-level view to show — no inventory hooks here.
export default function App() {
  const { isLoggedIn, currentUser, login, logout } = useAuth()

  if (!isLoggedIn) return <LoginPage onLogin={login} />
  if (!isConfigured) return <SetupGuide />
  return <MainApp currentUser={currentUser} onLogout={logout} />
}

// All inventory state and hooks live here, so they always run in the same order.
function MainApp({ currentUser, onLogout }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [activeGroup, setActiveGroup] = useState(null)
  const [activeMain, setActiveMain] = useState('')
  const [activeSub, setActiveSub] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('id')
  const [alertDismissed, setAlertDismissed] = useState(false)

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768)
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true })
    if (!error) setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    const channel = supabase
      .channel('products_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' },
        ({ eventType, new: newRow, old: oldRow }) => {
          if (eventType === 'INSERT') setProducts(p => [...p, newRow])
          else if (eventType === 'UPDATE') setProducts(p => p.map(x => x.id === newRow.id ? newRow : x))
          else if (eventType === 'DELETE') setProducts(p => p.filter(x => x.id !== oldRow.id))
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const groups = useMemo(() =>
    [...new Set(products.map(p => p.group_name).filter(Boolean))].sort(),
    [products]
  )

  const categories = useMemo(() => {
    const scope = activeGroup ? products.filter(p => p.group_name === activeGroup) : products
    const cat = {}
    scope.forEach(p => {
      if (!p.main_category) return
      if (!cat[p.main_category]) cat[p.main_category] = new Set()
      if (p.sub_category) cat[p.main_category].add(p.sub_category)
    })
    return Object.fromEntries(
      Object.entries(cat).sort().map(([k, v]) => [k, [...v].sort()])
    )
  }, [products, activeGroup])

  const stats = useMemo(() => {
    const today = new Date()
    const scope = activeGroup ? products.filter(p => p.group_name === activeGroup) : products
    return {
      total: scope.length,
      low_stock: scope.filter(p => p.current_stock > 0 && p.current_stock <= (p.min_stock ?? 10)).length,
      out_of_stock: scope.filter(p => p.current_stock <= 0).length,
      expiring_soon: scope.filter(p => {
        if (!p.expiry) return false
        const days = Math.ceil((new Date(p.expiry) - today) / 86400000)
        return days >= 0 && days <= 90
      }).length,
    }
  }, [products, activeGroup])

  const filteredProducts = useMemo(() => {
    const today = new Date()
    let items = products

    if (activeGroup) items = items.filter(p => p.group_name === activeGroup)
    if (activeMain) {
      items = items.filter(p => p.main_category === activeMain)
      if (activeSub) items = items.filter(p => p.sub_category === activeSub)
    }

    if (activeFilter === 'low') {
      items = items.filter(p => p.current_stock > 0 && p.current_stock <= (p.min_stock ?? 10))
    } else if (activeFilter === 'out') {
      items = items.filter(p => p.current_stock <= 0)
    } else if (activeFilter === 'expiring') {
      items = items.filter(p => {
        if (!p.expiry) return false
        const days = Math.ceil((new Date(p.expiry) - today) / 86400000)
        return days >= 0 && days <= 90
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.lot || '').toLowerCase().includes(q) ||
        (p.main_category || '').toLowerCase().includes(q) ||
        (p.sub_category || '').toLowerCase().includes(q)
      )
    }

    return [...items].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'th')
      if (sortBy === 'current_stock') return a.current_stock - b.current_stock
      if (sortBy === 'expiry') {
        if (!a.expiry && !b.expiry) return 0
        if (!a.expiry) return 1
        if (!b.expiry) return -1
        return a.expiry.localeCompare(b.expiry)
      }
      return a.id - b.id
    })
  }, [products, activeGroup, activeMain, activeSub, activeFilter, searchQuery, sortBy])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() })
  }, [])

  const handleSave = useCallback(async (data) => {
    const isEdit = Boolean(data.id)
    let error
    if (isEdit) {
      const { id, created_at, updated_at, ...updates } = data
      ;({ error } = await supabase.from('products').update(updates).eq('id', id))
    } else {
      ;({ error } = await supabase.from('products').insert(data))
    }
    if (error) { showToast(error.message, 'error'); return false }
    showToast(isEdit ? 'แก้ไขสินค้าเรียบร้อย' : 'เพิ่มสินค้าเรียบร้อย', 'success')
    setModal(null)
    return true
  }, [showToast])

  const handleDelete = useCallback(async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    showToast('ลบสินค้าเรียบร้อย', 'success')
    setModal(null)
  }, [showToast])

  const handleShipment = useCallback(async ({ productId, quantity, date, notes }) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const { error: shipErr } = await supabase.from('shipments').insert({
      product_id: productId,
      quantity,
      shipment_date: date,
      notes,
    })
    if (shipErr) { showToast(shipErr.message, 'error'); return }

    const { error: stockErr } = await supabase
      .from('products')
      .update({ current_stock: product.current_stock + quantity })
      .eq('id', productId)
    if (stockErr) { showToast(stockErr.message, 'error'); return }

    showToast(`รับเข้า ${quantity} หน่วยเรียบร้อย`, 'success')
    setModal(null)
  }, [products, showToast])

  const handleCategoryChange = useCallback((main, sub) => {
    setActiveMain(main)
    setActiveSub(sub)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }, [])

  const handleGroupChange = useCallback((g) => {
    setActiveGroup(g)
    setActiveMain('')
    setActiveSub('')
  }, [])

  useEffect(() => { setAlertDismissed(false) }, [stats.low_stock, stats.out_of_stock])

  const showAlert = !alertDismissed && (stats.low_stock > 0 || stats.out_of_stock > 0)

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        groups={groups}
        activeGroup={activeGroup}
        onGroupChange={handleGroupChange}
        categories={categories}
        activeMain={activeMain}
        activeSub={activeSub}
        onCategoryChange={handleCategoryChange}
        stats={stats}
      />

      <main className={`flex flex-col flex-1 h-screen overflow-hidden transition-all duration-200 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}>
        <Topbar
          onToggleSidebar={() => setSidebarOpen(v => !v)}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          currentUser={currentUser}
          onLogout={onLogout}
          onAdd={() => setModal({
            type: 'add',
            product: {
              group_name: activeGroup || groups[0] || 'รายการสินค้า',
              main_category: activeMain,
              sub_category: activeSub,
              barcode: '', brand: '', lab: '', lot: '', expiry: '',
              initial_stock: 0, current_stock: 0, min_stock: 10,
            }
          })}
        />

        {showAlert && (
          <AlertBanner
            lowCount={stats.low_stock}
            outCount={stats.out_of_stock}
            onFilter={setActiveFilter}
            onDismiss={() => setAlertDismissed(true)}
          />
        )}

        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        <ProductTable
          products={filteredProducts}
          loading={loading}
          onEdit={p => setModal({ type: 'edit', product: p })}
          onDelete={p => setModal({ type: 'delete', product: p })}
          onShipment={p => setModal({ type: 'shipment', product: p })}
        />

        <div className="px-6 py-2 text-sm text-slate-500 flex-shrink-0 border-t border-slate-200 bg-white">
          {filteredProducts.length} รายการ
        </div>
      </main>

      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <ProductModal
          product={modal.product}
          isEdit={modal.type === 'edit'}
          categories={categories}
          groups={groups}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'delete' && (
        <DeleteModal
          product={modal.product}
          onConfirm={() => handleDelete(modal.product.id)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'shipment' && (
        <ShipmentModal
          product={modal.product}
          onSave={handleShipment}
          onClose={() => setModal(null)}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
