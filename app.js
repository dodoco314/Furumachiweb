// ===== 状態管理 =====
let visited = JSON.parse(localStorage.getItem('furumachi_visited') || '[]');
let mapInstance = null;
let qrScanner = null;

function saveVisited() {
  localStorage.setItem('furumachi_visited', JSON.stringify(visited));
}

function updateProgress() {
  const pct = Math.round((visited.length / shops.length) * 100);
  document.getElementById('pct-display').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
}

const typeLabel = {
   food: '🍽 グルメ',
   cafe: '☕ カフェ',
   vintage: '👗 古着', 
   culture: '🎭 文化', 
   kamihuru: '上古町', 
   town5: '５番町' 
  };

// ===== お店一覧 =====
function renderShopList() {
  const container = document.getElementById('shop-list-container');
  const sorted = [...shops].sort((a, b) => {
    const aVisited = visited.includes(a.id) ? 1 : 0;
    const bVisited = visited.includes(b.id) ? 1 : 0;
    return aVisited - bVisited;
  });
  container.innerHTML = sorted.map(shop => `
    <div class="shop-card ${visited.includes(shop.id) ? 'visited' : ''}" onclick="openShopModal('${shop.id}')">
      <div class="shop-card-image ${shop.image ? '' : 'shop-card-image--empty'}">
        ${shop.image
          ? `<img src="${shop.image}" alt="${shop.name}">`
          : `<span>${shop.icon}</span>`
        }
      </div>
      <div class="shop-info">
        <h3>${shop.name}</h3>
        <p>${shop.desc.substring(0, 40)}…</p>
        <span class="tag ${shop.types}">${typeLabel[shop.types] || shop.types}</span>
      </div>
    </div>
  `).join('');
}

// ===== 地図 =====
function initMap() {
  if (mapInstance) return;
  mapInstance = L.map('map').setView([37.9155, 139.0355], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance);

  shops.forEach(shop => {
    const isVisited = visited.includes(shop.id);
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:40px;height:40px;border-radius:50%;
        background:${isVisited ? '#4a6741' : '#f5efe6'};
        border:2.5px solid #1a1208;
        display:flex;align-items:center;justify-content:center;
        font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.2);
        cursor:pointer;
      ">${shop.icon}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker([shop.lat, shop.lng], { icon })
      .addTo(mapInstance)
      .bindPopup(`<b>${shop.name}</b><br><small>${shop.address}</small>`)
      .on('click', () => openShopModal(shop.id));
  });
}

// ===== スタンプ積み上げ =====
function renderStamps() {
  const tower = document.getElementById('stamp-tower');
  const empty = document.getElementById('stamp-empty');
  const shareArea = document.getElementById('share-area');

  tower.querySelectorAll('.stamp-item').forEach(el => el.remove());

  if (visited.length === 0) {
    empty.style.display = 'block';
    shareArea.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  shareArea.style.display = 'flex';

  visited.forEach((id, i) => {
    const shop = shops.find(s => s.id === id);
    if (!shop) return;
    const el = document.createElement('div');
    el.className = `stamp-item ${shop.type}`;
    el.style.animationDelay = `${i * 0.08}s`;
    el.innerHTML = `${shop.icon}<span class="stamp-name">${shop.name.substring(0, 6)}</span>`;
    tower.insertBefore(el, tower.querySelector('.stamp-ground').nextSibling);
  });
}

// ===== 訪問記録 =====
function markVisited(shopId) {
  if (!visited.includes(shopId)) {
    visited.push(shopId);
    saveVisited();
    updateProgress();
    renderShopList();
    renderStamps();
    return true;
  }
  return false;
}

// ===== QRスキャン =====
function openQR() {
  document.getElementById('qr-modal').classList.add('show');
  document.getElementById('qr-result').className = 'qr-result';
  document.getElementById('qr-result').innerHTML = '';

  setTimeout(() => {
    qrScanner = new Html5Qrcode('qr-reader');
    qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => handleQRResult(decodedText),
      () => {}
    ).catch(() => {
      document.getElementById('qr-reader').innerHTML =
        '<p style="text-align:center;padding:20px;font-size:13px;color:#888">カメラにアクセスできませんでした</p>';
    });
  }, 300);
}

function closeQR() {
  if (qrScanner) {
    qrScanner.stop().catch(() => {});
    qrScanner = null;
  }
  document.getElementById('qr-modal').classList.remove('show');
}

function handleQRResult(text) {
  const shop = shops.find(s => s.id === text);
  const resultEl = document.getElementById('qr-result');

  if (!shop) {
    resultEl.className = 'qr-result show';
    resultEl.innerHTML = '<h3>❌ 対応していないQRコードです</h3>';
    return;
  }

  const isNew = markVisited(shop.id);
  resultEl.className = `qr-result show ${isNew ? 'success' : 'already'}`;
  resultEl.innerHTML = isNew
    ? `<h3>✅ ${shop.icon} ${shop.name}</h3><p>スタンプを獲得しました！</p>`
    : `<h3>⚡ ${shop.icon} ${shop.name}</h3><p>すでに訪問済みです</p>`;

  if (qrScanner) {
    qrScanner.stop().catch(() => {});
    qrScanner = null;
  }
}

// ===== お店詳細モーダル =====
function openShopModal(shopId) {
  const shop = shops.find(s => s.id === shopId);
  if (!shop) return;
  const isVisited = visited.includes(shopId);

  const imageHTML = shop.image
    ? `<div class="shop-detail-image"><img src="${shop.image}" alt="${shop.name}"></div>`
    : `<div class="shop-detail-image shop-detail-image--empty"><span>${shop.icon}</span><small>画像準備中</small></div>`;

  document.getElementById('shop-modal-content').innerHTML = `
    ${imageHTML}
    <div class="shop-detail-name">${shop.name}</div>
    <span class="tag ${shop.type}" style="display:block;text-align:center;margin-bottom:16px">
      ${typeLabel[shop.type] || shop.type}
    </span>
    <p class="shop-detail-desc">${shop.desc}</p>
    <div class="shop-detail-info">
      <div class="info-row"><span class="label">住所</span><span>${shop.address}</span></div>
      <div class="info-row"><span class="label">営業</span><span>${shop.hours}</span></div>
      <div class="info-row"><span class="label">定休日</span><span>${shop.closed}</span></div>
      <div class="info-row"><span class="label">TIPS</span><span style="color:#c94a2a">${shop.tip}</span></div>
    </div>
    ${!isVisited ? `
    <button class="btn btn-primary" onclick="markVisited('${shopId}');closeShopModal();" style="width:100%">
      📍 訪問済みにする（QRなし）
    </button>` : `
    <div style="text-align:center;color:#4a6741;font-size:14px;padding:12px;border:1px solid #4a6741;border-radius:4px">
      ✅ 訪問済み
    </div>`}
  `;

  document.getElementById('shop-modal').classList.add('show');
}

function closeShopModal() {
  document.getElementById('shop-modal').classList.remove('show');
}

// ===== シェア =====
function shareProgress() {
  const pct = Math.round((visited.length / shops.length) * 100);
  const text = `古町ひとめぐり ${pct}%達成！\n${visited.length}/${shops.length}店舗を制覇しました 🎯\n\n#古町ひとめぐり #新潟観光 #古町`;

  if (navigator.share) {
    navigator.share({ title: '古町ひとめぐり', text });
  } else {
    navigator.clipboard.writeText(text).then(() => alert('クリップボードにコピーしました'));
  }
}

function resetProgress() {
  if (confirm('訪問記録をリセットしますか？')) {
    visited = [];
    saveVisited();
    updateProgress();
    renderShopList();
    renderStamps();
  }
}

// ===== タブ切り替え =====
function switchTab(tab, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  btn.classList.add('active');

  if (tab === 'map') {
    setTimeout(() => {
      initMap();
      mapInstance && mapInstance.invalidateSize();
    }, 100);
  }
}

// ===== モーダル外クリックで閉じる =====
document.getElementById('qr-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('qr-modal')) closeQR();
});
document.getElementById('shop-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('shop-modal')) closeShopModal();
});

// ===== 初期化 =====
updateProgress();
renderShopList();
renderStamps();