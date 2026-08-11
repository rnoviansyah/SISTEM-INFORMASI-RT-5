// ============================================================
// tableHelper.js - Render Tabel Generik (HILANGKAN DUPLIKASI)
// ============================================================

export function renderTable(containerId, data, config = {}) {
  const {
    headers = [],
    rows = [],
    onClickRow = null,
    customColumns = {},
    actionButtons = null,
    emptyMessage = 'Tidak ada data.',
    showHeader = true,
    className = 'table table-hover'
  } = config;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="alert alert-light text-muted">${emptyMessage}</div>`;
    return;
  }
  
  let html = `<table class="${className}"><thead><tr>`;
  if (showHeader) {
    headers.forEach(h => {
      html += `<th>${h.toUpperCase()}</th>`;
    });
    html += `<th class="text-center">AKSI</th></tr></thead><tbody>`;
  }
  
  rows.forEach((row, idx) => {
    const rowId = row[0] || row.id || idx;
    html += `<tr ${onClickRow ? `onclick="onClickRow('${rowId}')"` : ''}>`;
    headers.forEach((h, colIdx) => {
      const val = row[colIdx] !== undefined ? row[colIdx] : '-';
      if (customColumns[h]) {
        html += `<td>${customColumns[h](val, row)}</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });
    html += `<td class="text-center">${actionButtons ? actionButtons(row) : '-'}</td>`;
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

export function filterTable(searchInput, rows, headers, callback) {
  // ... (logika filter generik)
}