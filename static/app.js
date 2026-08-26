/* ─── State ──────────────────────────────────────────────────────────────── */
let allItems = [];
let allCategories = {};
let activeFilter = 'all';
let activeMain = '';
let activeSub = '';
let deleteTarget = null;
let editingSheet = null;

/* ─── DOM refs ───────────────────────────────────────────────────────────── */
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const rowCount = document.getElementById('rowCount');
const modalOverlay = document.getElementById('modalOverlay');
const confirmOverlay = document.getElementById('confirmOverlay');
const toast = document.getElementById('toast');

/* ─── Init ───────────────────────────────────────────────────────────────── */
async function init() {
  await loadData();
}

async function loadData() {
  tableBody.innerHTML = `<tr><td colspan="10" class="loading-row"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>`;
  const [dataRes, statsRes] = await Promise.all([
    fetch('/api/items'),
    fetch('/api/stats')
  ]);
  const data = await dataRes.json();
  const stats = await statsRes.json();

  allItems = data.items;
  allCategories = data.categories;

  updateStats(stats);
  buildCategoryTree();
  renderTable();
}

/* ─── Stats ──────────────────────────────────────────────────────────────── */
function updateStats(stats) {
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statLow').textContent = stats.low_stock;
  document.getElementById('statOut').textContent = stats.out_of_stock;
  document.getElementById('statExp').textContent = stats.expiring_soon;
}

/* ─── Category Tree ──────────────────────────────────────────────────────── */
function buildCategoryTree() {
  const tree = document.getElementById('categoryTree');
  let html = `<div class="cat-item ${activeMain === '' ? 'active' : ''}" data-main="" data-sub="">
    <i class="fas fa-th-large"></i> ทั้งหมด (${allItems.length})
  </div>`;

  for (const [main, subs] of Object.entries(allCategories)) {
    const mainCount = allItems.filter(i => i.main_category === main).length;
    html += `<div class="cat-group">
      <div class="cat-item cat-main ${activeMain === main && activeSub === '' ? 'active' : ''}" data-main="${main}" data-sub="">
        <i class="fas fa-folder"></i> ${main} (${mainCount})
      </div>`;
    for (const sub of subs) {
      const subCount = allItems.filter(i => i.main_category === main && i.sub_category === sub).length;
      html += `<div class="cat-item cat-sub ${activeMain === main && activeSub === sub ? 'active' : ''}" data-main="${main}" data-sub="${sub}">
        <i class="fas fa-tag"></i> ${sub} (${subCount})
      </div>`;
    }
    html += `</div>`;
  }

  tree.innerHTML = html;
  tree.querySelectorAll('.cat-item').forEach(el => {
    el.addEventListener('click', () => {
      activeMain = el.dataset.main;
      activeSub = el.dataset.sub;
      buildCategoryTree();
      renderTable();
    });
  });
}

/* ─── Render Table ───────────────────────────────────────────────────────── */
function getFilteredItems() {
  let items = allItems;

  // Category filter
  if (activeMain) {
    items = items.filter(i => i.main_category === activeMain);
    if (activeSub) {
      items = items.filter(i => i.sub_category === activeSub);
    }
  }

  // Quick filter
  const today = new Date();
  if (activeFilter === 'low') {
    items = items.filter(i => i.current_stock > 0 && i.current_stock <= 10);
  } else if (activeFilter === 'out') {
    items = items.filter(i => i.current_stock <= 0);
  } else if (activeFilter === 'expiring') {
    items = items.filter(i => {
      if (!i.expiry) return false;
      const exp = new Date(i.expiry);
      const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 90;
    });
  }

  // Search
  const q = searchInput.value.trim().toLowerCase();
  if (q) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.barcode.toLowerCase().includes(q) ||
      i.brand.toLowerCase().includes(q) ||
      i.lot.toLowerCase().includes(q) ||
      i.main_category.toLowerCase().includes(q) ||
      i.sub_category.toLowerCase().includes(q)
    );
  }

  // Sort
  const sortBy = document.getElementById('sortSelect').value;
  items = [...items].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'th');
    if (sortBy === 'current_stock') return a.current_stock - b.current_stock;
    if (sortBy === 'expiry') {
      if (!a.expiry) return 1;
      if (!b.expiry) return -1;
      return a.expiry.localeCompare(b.expiry);
    }
    return (a.index || 0) - (b.index || 0);
  });

  return items;
}

function stockClass(n) {
  if (n <= 0) return 'stock-out';
  if (n <= 10) return 'stock-low';
  return 'stock-ok';
}

function expiryClass(dateStr) {
  if (!dateStr) return '';
  const today = new Date();
  const exp = new Date(dateStr);
  const days = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'expiry-danger';
  if (days <= 90) return 'expiry-warn';
  return '';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

function renderTable() {
  const items = getFilteredItems();
  rowCount.textContent = `${items.length} รายการ`;

  if (items.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="10" class="loading-row">
      <i class="fas fa-inbox" style="color:#94a3b8"></i> ไม่พบรายการสินค้า
    </td></tr>`;
    return;
  }

  tableBody.innerHTML = items.map(item => {
    const sc = stockClass(item.current_stock);
    const ec = expiryClass(item.expiry);
    const rowCls = item.current_stock <= 0 ? 'row-out' : item.current_stock <= 10 ? 'row-low' : '';
    return `<tr class="${rowCls}" data-row="${item.row}" data-sheet="${item.sheet}">
      <td style="font-weight:600;color:#64748b">${item.index || '-'}</td>
      <td>
        <div style="font-weight:600;line-height:1.3">${escHtml(item.name)}</div>
        ${item.barcode && item.barcode !== 'None' ? `<div style="font-size:11px;color:#94a3b8">${escHtml(item.barcode)}</div>` : ''}
      </td>
      <td>${item.barcode && item.barcode !== 'None' ? `<span style="font-size:11px;color:#64748b">${escHtml(item.barcode)}</span>` : '-'}</td>
      <td>${item.main_category ? `<span class="cat-pill">${escHtml(item.main_category)}</span>` : '-'}</td>
      <td>${item.sub_category ? `<span class="cat-pill sub">${escHtml(item.sub_category)}</span>` : '-'}</td>
      <td>${item.brand && item.brand !== 'None' ? escHtml(item.brand) : '-'}</td>
      <td style="font-size:13px;color:#64748b">${item.lot && item.lot !== 'None' ? escHtml(item.lot) : '-'}</td>
      <td class="${ec}">${formatDate(item.expiry)}</td>
      <td style="text-align:center">
        <span class="stock-badge ${sc}">${item.current_stock}</span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-action btn-edit" onclick="openEdit(${item.row},'${item.sheet}')" title="แก้ไข">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-action btn-delete" onclick="openDelete(${item.row},'${item.sheet}','${escHtml(item.name).replace(/'/g, "\\'")}')" title="ลบ">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Filter tabs ────────────────────────────────────────────────────────── */
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderTable();
  });
});

/* ─── Search / Sort ──────────────────────────────────────────────────────── */
searchInput.addEventListener('input', renderTable);
document.getElementById('sortSelect').addEventListener('change', renderTable);

/* ─── Sidebar Toggle ─────────────────────────────────────────────────────── */
document.getElementById('sidebarToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('.main-content');
  sidebar.classList.toggle('collapsed');
  main.classList.toggle('expanded');
});

/* ─── Modal helpers ──────────────────────────────────────────────────────── */
function openModal() {
  modalOverlay.classList.add('active');
  // Populate datalists
  const mainCatList = document.getElementById('mainCatList');
  mainCatList.innerHTML = Object.keys(allCategories)
    .map(c => `<option value="${c}">`)
    .join('');

  const subCatList = document.getElementById('subCatList');
  const allSubs = [...new Set(Object.values(allCategories).flat())].sort();
  subCatList.innerHTML = allSubs.map(s => `<option value="${s}">`).join('');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  document.getElementById('itemForm').reset();
  document.getElementById('fRow').value = '';
  editingSheet = null;
}

function openAdd() {
  document.getElementById('modalTitle').textContent = 'เพิ่มสินค้าใหม่';
  if (activeMain) document.getElementById('fMainCat').value = activeMain;
  if (activeSub) document.getElementById('fSubCat').value = activeSub;
  openModal();
}

function openEdit(row, sheet) {
  const item = allItems.find(i => i.row === row && i.sheet === sheet);
  if (!item) return;
  document.getElementById('modalTitle').textContent = 'แก้ไขสินค้า';
  document.getElementById('fRow').value = row;
  editingSheet = sheet;
  document.getElementById('fName').value = item.name;
  document.getElementById('fBarcode').value = item.barcode !== 'None' ? item.barcode : '';
  document.getElementById('fMainCat').value = item.main_category;
  document.getElementById('fSubCat').value = item.sub_category;
  document.getElementById('fBrand').value = item.brand !== 'None' ? item.brand : '';
  document.getElementById('fLab').value = item.lab !== 'None' ? item.lab : '';
  document.getElementById('fLot').value = item.lot !== 'None' ? item.lot : '';
  document.getElementById('fExpiry').value = item.expiry || '';
  document.getElementById('fCurrentStock').value = item.current_stock;
  openModal();
}

document.getElementById('addBtn').addEventListener('click', openAdd);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

/* ─── Save ───────────────────────────────────────────────────────────────── */
document.getElementById('saveBtn').addEventListener('click', async () => {
  const name = document.getElementById('fName').value.trim();
  if (!name) { showToast('กรุณาระบุชื่อสินค้า', 'error'); return; }

  const row = parseInt(document.getElementById('fRow').value) || 0;
  const sheet = editingSheet || '';

  const payload = {
    name,
    barcode: document.getElementById('fBarcode').value.trim(),
    main_category: document.getElementById('fMainCat').value.trim(),
    sub_category: document.getElementById('fSubCat').value.trim(),
    brand: document.getElementById('fBrand').value.trim(),
    lab: document.getElementById('fLab').value.trim(),
    lot: document.getElementById('fLot').value.trim(),
    expiry: document.getElementById('fExpiry').value,
    current_stock: parseInt(document.getElementById('fCurrentStock').value) || 0,
  };

  try {
    let res;
    if (row) {
      res = await fetch(`/api/items/${row}?sheet=${encodeURIComponent(sheet)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      payload.sheet = sheet;
      res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const result = await res.json();
    if (result.success) {
      closeModal();
      showToast(row ? 'แก้ไขสินค้าเรียบร้อย' : 'เพิ่มสินค้าเรียบร้อย', 'success');
      await loadData();
    } else {
      showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
});

/* ─── Delete ─────────────────────────────────────────────────────────────── */
function openDelete(row, sheet, name) {
  deleteTarget = { row, sheet };
  document.getElementById('confirmText').textContent = `ต้องการลบ "${name}" ใช่หรือไม่?`;
  confirmOverlay.classList.add('active');
}

document.getElementById('confirmCancel').addEventListener('click', () => {
  confirmOverlay.classList.remove('active');
  deleteTarget = null;
});

confirmOverlay.addEventListener('click', e => {
  if (e.target === confirmOverlay) {
    confirmOverlay.classList.remove('active');
    deleteTarget = null;
  }
});

document.getElementById('confirmOk').addEventListener('click', async () => {
  if (!deleteTarget) return;
  const { row, sheet } = deleteTarget;
  confirmOverlay.classList.remove('active');
  deleteTarget = null;

  try {
    const res = await fetch(`/api/items/${row}?sheet=${encodeURIComponent(sheet)}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast('ลบสินค้าเรียบร้อย', 'success');
      await loadData();
    } else {
      showToast(result.error || 'เกิดข้อผิดพลาด', 'error');
    }
  } catch (err) {
    showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
  }
});

/* ─── Toast ──────────────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 3000);
}

/* ─── Start ──────────────────────────────────────────────────────────────── */
init();
