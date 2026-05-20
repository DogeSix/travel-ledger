// Travel Expense Tracker - Main Logic

// Global state
let trips = [];
let activeTripId = null;
let activeView = 'dashboard';
let keypadBuffer = '0';
let activeInputType = 'foreign'; // 'foreign' or 'base'
let editingTransactionId = null;
let activeCategoryFilter = null;

// Categories configuration with icons and CSS class mappings
const CATEGORIES = {
  food: { name: '餐飲美食', icon: '🍔', class: 'cat-food' },
  transport: { name: '交通票券', icon: '🚇', class: 'cat-transport' },
  lodging: { name: '住宿飯店', icon: '🏨', class: 'cat-lodging' },
  shopping: { name: '購物血拼', icon: '🛍️', class: 'cat-shopping' },
  play: { name: '景點娛樂', icon: '🎟️', class: 'cat-play' },
  flight: { name: '機票行前', icon: '✈️', class: 'cat-flight' },
  souvenir: { name: '伴手禮物', icon: '🎁', class: 'cat-souvenir' },
  fee: { name: '手續保險', icon: '💼', class: 'cat-fee' },
  others: { name: '其他雜支', icon: '❓', class: 'cat-others' }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  
  // Intercept and handle room queries for cloud syncing (Lightsplit clone)
  if (checkURLRoomQuery()) {
    return; // Stop standard view setup, as checkURLRoomQuery handles asynchronous loading UI
  }
  
  switchView('dashboard');
  renderApp();
  startCloudSyncPolling(); // Start background sync polling if active trip is connected
  
  // Register service worker if available for PWA support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered.'))
        .catch(err => console.log('Service Worker registration failed: ', err));
    });
  }
});

// Load data from LocalStorage
function loadData() {
  const savedTrips = localStorage.getItem('travel_trips');
  const savedActiveId = localStorage.getItem('travel_active_trip_id');
  
  if (savedTrips) {
    trips = JSON.parse(savedTrips);
  } else {
    // Inject default sample trip for instant onboarding
    trips = [
      {
        id: 'sample-tokyo',
        name: '東京探險之旅 🇯🇵',
        startDate: '2026-05-15',
        endDate: '2026-05-22',
        budget: 50000,
        baseCurrency: 'TWD',
        foreignCurrency: 'JPY',
        exchangeRate: 0.215,
        companions: ['阿明', '小華'],
        transactions: [
          {
            id: 't1',
            date: '2026-05-20 09:30',
            amountForeign: 1500,
            amountBase: 323,
            category: 'food',
            paymentMethod: 'cash',
            desc: '一蘭拉麵早餐',
            payer: '我',
            splitWith: ['我', '阿明', '小華']
          },
          {
            id: 't2',
            date: '2026-05-20 11:15',
            amountForeign: 5400,
            amountBase: 1161,
            category: 'play',
            paymentMethod: 'card',
            desc: '東京鐵塔門票',
            payer: '阿明',
            splitWith: ['我', '阿明', '小華']
          },
          {
            id: 't3',
            date: '2026-05-20 14:00',
            amountForeign: 12000,
            amountBase: 2580,
            category: 'shopping',
            paymentMethod: 'card',
            desc: '藥妝店美妝藥品',
            payer: '我',
            splitWith: ['我']
          }
        ],
        cashWithdrawals: [
          { id: 'w1', date: '2026-05-15 10:00', amountForeign: 80000, rate: 0.215 }
        ]
      }
    ];
    localStorage.setItem('travel_trips', JSON.stringify(trips));
  }
  
  if (savedActiveId && trips.some(t => t.id === savedActiveId)) {
    activeTripId = savedActiveId;
  } else if (trips.length > 0) {
    activeTripId = trips[0].id;
  } else {
    activeTripId = null;
  }
}

// Save data to LocalStorage
function saveData() {
  localStorage.setItem('travel_trips', JSON.stringify(trips));
  if (activeTripId) {
    localStorage.setItem('travel_active_trip_id', activeTripId);
    
    // Auto sync push to cloud if active trip is synced
    const trip = getActiveTrip();
    if (trip && trip.cloudRoomId) {
      syncPushCloud();
    }
  } else {
    localStorage.removeItem('travel_active_trip_id');
  }
}

// Get active trip object
function getActiveTrip() {
  return trips.find(t => t.id === activeTripId);
}

// Render dynamic components of the application
function renderApp() {
  const trip = getActiveTrip();
  
  // Render header trip title
  const tripBadge = document.getElementById('current-trip-badge');
  if (trip) {
    const syncDot = trip.cloudRoomId ? `<span class="sync-indicator-dot" title="雲端即時同步中"></span>` : '';
    tripBadge.innerHTML = `✈️ ${trip.name}${syncDot}`;
    document.getElementById('fab-add').style.display = 'flex';
  } else {
    tripBadge.innerHTML = `➕ 點擊新增旅程`;
    document.getElementById('fab-add').style.display = 'none';
  }

  // Render respective views
  renderDashboard();
  renderLedger();
  renderSplitBill();
  renderSettings();
}

// Navigation controller
function switchView(viewName) {
  activeView = viewName;
  
  // Dynamic Header Back button controller for native app feeling
  const backBtn = document.getElementById('btn-back');
  const appTitle = document.getElementById('app-title');
  if (backBtn) {
    if (viewName === 'dashboard') {
      backBtn.style.display = 'none';
      if (appTitle) appTitle.style.display = 'block';
    } else {
      backBtn.style.display = 'flex';
      // On small screens, hide "出國記帳" text to give space for back button if needed
      if (appTitle && window.innerWidth < 360) {
        appTitle.style.display = 'none';
      } else if (appTitle) {
        appTitle.style.display = 'block';
      }
    }
  }
  
  // Update view section visibility
  document.querySelectorAll('.view-section').forEach(el => {
    el.classList.remove('active');
  });
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.classList.add('active');
  
  // Update nav bar items
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
  });
  const activeNavItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
  if (activeNavItem) activeNavItem.classList.add('active');
  
  renderApp();
}

// Render 1: Dashboard View
function renderDashboard() {
  const trip = getActiveTrip();
  const dashContainer = document.getElementById('view-dashboard');
  
  if (!trip) {
    dashContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <h3>開始您的海外旅程</h3>
        <p style="margin-top: 8px; margin-bottom: 20px;">目前沒有任何旅程。快來建立一個專屬您的旅遊記帳本吧！</p>
        <button class="btn-primary" onclick="showCreateTripDialog()">➕ 建立新旅程</button>
      </div>
    `;
    return;
  }

  // Calculate totals
  const totalSpentBase = trip.transactions.reduce((acc, t) => acc + t.amountBase, 0);
  const totalSpentForeign = trip.transactions.reduce((acc, t) => acc + t.amountForeign, 0);
  const totalBudget = trip.budget;
  const totalBudgetForeign = Math.round(totalBudget / trip.exchangeRate);
  const percentUsed = totalBudget > 0 ? Math.min(100, Math.round((totalSpentBase / totalBudget) * 100)) : 0;
  
  // Cash Wallet calculation
  const totalWithdrawn = trip.cashWithdrawals ? trip.cashWithdrawals.reduce((acc, w) => acc + w.amountForeign, 0) : 0;
  const cashSpentForeign = trip.transactions.filter(t => t.paymentMethod === 'cash').reduce((acc, t) => acc + t.amountForeign, 0);
  const remainingCashForeign = totalWithdrawn - cashSpentForeign;
  const remainingCashBase = Math.round(remainingCashForeign * trip.exchangeRate);

  // Daily Allowance Calculation
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  let remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24)) + 1;
  if (remainingDays < 1) remainingDays = 0; // trip ended
  if (today < start) remainingDays = totalDays; // trip hasn't started yet

  const budgetLeft = totalBudget - totalSpentBase;
  const dailyAllowanceBase = remainingDays > 0 ? Math.max(0, Math.round(budgetLeft / remainingDays)) : 0;
  const dailyAllowanceForeign = Math.round(dailyAllowanceBase / trip.exchangeRate);

  // Spent by categories grouping in foreign currency
  const categorySpent = {};
  Object.keys(CATEGORIES).forEach(k => { categorySpent[k] = 0; });
  trip.transactions.forEach(t => {
    if (categorySpent[t.category] !== undefined) {
      categorySpent[t.category] += t.amountForeign;
    } else {
      categorySpent['others'] += t.amountForeign;
    }
  });

  const sortedCategories = Object.keys(CATEGORIES)
    .map(key => ({
      key,
      name: CATEGORIES[key].name,
      icon: CATEGORIES[key].icon,
      class: CATEGORIES[key].class,
      amount: categorySpent[key],
      pct: totalSpentForeign > 0 ? Math.round((categorySpent[key] / totalSpentForeign) * 100) : 0
    }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Card Payment vs Cash ratio
  const cardSpentBase = trip.transactions.filter(t => t.paymentMethod === 'card').reduce((acc, t) => acc + t.amountBase, 0);
  const splitSpentBase = trip.transactions.filter(t => t.paymentMethod === 'split').reduce((acc, t) => acc + t.amountBase, 0);
  const cashSpentBase = totalSpentBase - cardSpentBase - splitSpentBase;

  // Render dynamic dashboard HTML
  const dashHtml = `
    <!-- Trip Budget Overview Card -->
    <div class="card trip-summary-card">
      <div class="card-title">
        <span>${trip.name}</span>
        <span style="font-size: 11px; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px;">
          ${trip.startDate} ~ ${trip.endDate} (${totalDays}天)
        </span>
      </div>
      <div class="budget-stats">
        <div class="budget-main">
          <div class="budget-amount" id="dash-spent-base">
            ${Math.round(totalSpentForeign).toLocaleString()}<span>${trip.foreignCurrency}</span>
          </div>
          <div class="budget-subtitle">
            總預算：${totalBudgetForeign.toLocaleString()} ${trip.foreignCurrency} (約合 NT$ ${totalBudget.toLocaleString()} TWD) · ${percentUsed}% 已使用
          </div>
        </div>
        
        <!-- Premium CSS Circular progress bar -->
        <div class="circular-progress-container">
          <svg class="circular-svg">
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--secondary)" />
                <stop offset="100%" stop-color="var(--primary)" />
              </linearGradient>
            </defs>
            <circle class="circular-bg" cx="40" cy="40" r="34"></circle>
            <circle class="circular-bar" cx="40" cy="40" r="34" style="stroke-dashoffset: ${213 - (213 * percentUsed / 100)}"></circle>
          </svg>
          <div class="circular-text">
            ${percentUsed}%
            <span>已花</span>
          </div>
        </div>
      </div>
      
      <div class="progress-bar-wrapper">
        <div class="progress-track">
          <div class="progress-fill" style="width: ${percentUsed}%"></div>
        </div>
      </div>
    </div>

    <!-- Detail Statistics Grid -->
    <div class="detail-grid">
      <div class="detail-card">
        <div class="detail-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          錢包現金餘額
        </div>
        <div class="detail-value ${remainingCashForeign < 0 ? 'danger' : 'accent'}">
          ${remainingCashForeign.toLocaleString()} <span>${trip.foreignCurrency}</span>
        </div>
        <div class="detail-sub">
          約合 NT$ ${remainingCashBase.toLocaleString()}
        </div>
      </div>
      
      <div class="detail-card">
        <div class="detail-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          剩餘每日額度
        </div>
        <div class="detail-value">
          ${dailyAllowanceForeign.toLocaleString()} <span>${trip.foreignCurrency}</span>
        </div>
        <div class="detail-sub">
          剩餘 ${remainingDays} 天，約合 NT$ ${dailyAllowanceBase.toLocaleString()}/天
        </div>
      </div>
    </div>

    <!-- Category Spent Chart Card (Clickable to view details) -->
    <div class="card">
      <div class="card-title">消費類別分析 <span style="font-size: 10px; color: var(--text-muted); font-weight: normal;">(點擊類別查看細節)</span></div>
      ${sortedCategories.length === 0 ? `
        <div class="empty-state" style="padding: 20px 0;">
          <p>尚無消費記錄，點擊下方的 ＋ 開始記帳！</p>
        </div>
      ` : `
        <div class="chart-list">
          ${sortedCategories.map(c => `
            <div class="chart-item" onclick="viewCategoryDetails('${c.key}')" style="cursor: pointer;">
              <div class="chart-icon-box ${c.class}">${c.icon}</div>
              <div class="chart-info">
                <div class="chart-info-header">
                  <span>${c.name}</span>
                  <span class="chart-pct">${c.pct}%</span>
                </div>
                <div class="chart-bar-bg">
                  <div class="chart-bar-fill ${c.class}" style="width: ${c.pct}%"></div>
                </div>
              </div>
              <div class="chart-amount-text">
                ${Math.round(c.amount).toLocaleString()} ${trip.foreignCurrency}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Payment Methods Analysis -->
    <div class="card" style="padding: 16px 20px;">
      <div class="card-title" style="margin-bottom: 8px;">支付管道佔比</div>
      <div style="display: flex; gap: 8px; font-size: 11px; color: var(--text-muted); justify-content: space-between; align-items: center; margin-top: 10px;">
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--secondary); margin-bottom: 4px;"></div>
          <span>現金現鈔</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${totalSpentBase > 0 ? Math.round(cashSpentBase / totalSpentBase * 100) : 0}%</strong>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent); margin-bottom: 4px;"></div>
          <span>信用卡</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${totalSpentBase > 0 ? Math.round(cardSpentBase / totalSpentBase * 100) : 0}%</strong>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #b37feb; margin-bottom: 4px;"></div>
          <span>拆帳分算</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${totalSpentBase > 0 ? Math.round(splitSpentBase / totalSpentBase * 100) : 0}%</strong>
        </div>
      </div>
    </div>
  `;
  
  dashContainer.innerHTML = dashHtml;
}

// Redirect and search category transactions in Ledger
function viewCategoryDetails(catKey) {
  if (!CATEGORIES[catKey]) return;
  activeCategoryFilter = catKey;
  switchView('ledger');
}

// Clear category filter in Ledger
function clearCategoryFilter() {
  activeCategoryFilter = null;
  renderLedger();
}


// Render 2: Ledger View
function renderLedger() {
  const trip = getActiveTrip();
  const ledgerContainer = document.getElementById('view-ledger');
  
  if (!trip) {
    ledgerContainer.innerHTML = '';
    return;
  }

  const query = (document.getElementById('ledger-search-input')?.value || '').toLowerCase();
  
  // Filter transactions
  const filtered = trip.transactions.filter(t => {
    if (activeCategoryFilter && t.category !== activeCategoryFilter) {
      return false;
    }
    const descMatch = t.desc.toLowerCase().includes(query);
    const catMatch = (CATEGORIES[t.category]?.name || '').toLowerCase().includes(query);
    const methodMatch = t.paymentMethod.toLowerCase().includes(query);
    return descMatch || catMatch || methodMatch;
  });

  // Sort transaction dates desc
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  let html = `
    <div class="ledger-header">
      <h2 class="ledger-title">消費明細 (${sorted.length}筆)</h2>
    </div>
    
    <div class="search-input-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="ledger-search-input" class="search-input" placeholder="搜尋備註、分類或支付方式..." value="${query}" oninput="renderLedger()">
    </div>
  `;

  if (activeCategoryFilter && CATEGORIES[activeCategoryFilter]) {
    const cat = CATEGORIES[activeCategoryFilter];
    html += `
      <div class="filter-badge-row">
        <span class="filter-badge">
          篩選類別：${cat.icon} ${cat.name}
          <span class="filter-badge-close" onclick="clearCategoryFilter()" title="清除篩選">&times;</span>
        </span>
      </div>
    `;
  }

  if (sorted.length === 0) {
    html += `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3>無消費明細</h3>
        <p>目前查無符合條件的記帳紀錄。</p>
      </div>
    `;
  } else {
    html += `<div class="ledger-list">`;
    sorted.forEach(t => {
      const cat = CATEGORIES[t.category] || CATEGORIES.others;
      let payMethodStr = '現金';
      let payClass = 'cash';
      if (t.paymentMethod === 'card') {
        payMethodStr = '刷卡';
        payClass = 'card';
      } else if (t.paymentMethod === 'split') {
        payMethodStr = '多人拆帳';
        payClass = 'split';
      }

      html += `
        <div class="ledger-item" onclick="editTransaction('${t.id}')">
          <div class="ledger-icon-box ${cat.class}">${cat.icon}</div>
          <div class="ledger-info">
            <div class="ledger-meta">
              <span class="ledger-category">${cat.name}</span>
              <span class="ledger-paymethod ${payClass}">${payMethodStr}</span>
            </div>
            <div class="ledger-desc">${t.desc || '（無備註內容）'}</div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t.date} · 由 ${t.payer || '我'} 付款</div>
          </div>
          <div class="ledger-amounts">
            <div class="ledger-amount-base" style="font-family: var(--font-title); font-size: 15px; font-weight: 700; color: var(--text-main);">${t.amountForeign.toLocaleString()} <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</span></div>
            <div class="ledger-amount-foreign" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">NT$ ${t.amountBase.toLocaleString()}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  ledgerContainer.innerHTML = html;
}

// Render 3: Split Bill View
function renderSplitBill() {
  const trip = getActiveTrip();
  const splitContainer = document.getElementById('view-split-bill');
  
  if (!trip) {
    splitContainer.innerHTML = '';
    return;
  }

  const companions = trip.companions || [];
  const settlements = calculateSettlements(trip);

  const isSynced = !!trip.cloudRoomId;
  const syncRoomId = trip.cloudRoomId || '';
  
  let cloudCardHtml = '';
  if (isSynced) {
    cloudCardHtml = `
      <!-- Cloud Sync Active State Card -->
      <div class="card" style="border-color: rgba(7, 193, 96, 0.3); background: linear-gradient(135deg, #0e1e13 0%, #060e0a 100%);">
        <div class="card-title" style="color: #07c160; display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span>💬</span> LINE 雲端即時同步中
          <span style="font-size: 11px; background: rgba(7,193,96,0.1); color: #07c160; padding: 2px 8px; border-radius: 10px; font-weight: bold; margin-left: auto;">房號: ${syncRoomId}</span>
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.5;">
          此帳本已成功連接雲端！好友在 LINE 內點擊下方專屬連結即可加入。往後任何人的新增修改都會在背景秒級自動同步更新，操作體驗與 Lightsplit 完全一致！
        </p>
        <button class="btn-primary" onclick="shareActiveTripToLINE()" style="background: #07c160; color: white; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px; border-radius: 14px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(7, 193, 96, 0.25);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          透過 LINE 分享/邀請好友加入
        </button>
      </div>
    `;
  } else {
    cloudCardHtml = `
      <!-- Cloud Sync Inactive State Card -->
      <div class="card" style="border-color: rgba(255, 255, 255, 0.05); background: linear-gradient(135deg, #12121c 0%, #0c0c12 100%);">
        <div class="card-title" style="color: var(--secondary); display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span>💬</span> 共同記帳與 LINE 邀請 (像 Lightsplit)
        </div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.5;">
          想和旅伴一起記帳嗎？點擊下方按鈕，一鍵開啟雲端多人共同記帳！系統會為您開啟專屬雲端房號，並能產生專屬連結，讓好友點擊即可加入，任何消費秒級同步！
        </p>
        <button class="btn-primary" onclick="enableCloudSync()" style="background: linear-gradient(135deg, var(--primary) 0%, #ff4d4f 100%); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px; border-radius: 14px; border: none; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 122, 69, 0.25);">
          🌐 開啟 Lightsplit 雲端同步共同記帳
        </button>
      </div>
    `;
  }

  let html = `
    <!-- Split Bill Balance Card -->
    <div class="card split-summary-card">
      <div class="card-title" style="color: #b37feb;">旅伴拆帳分算 👥</div>
      <div style="margin-top: 10px;">
        <span style="font-size: 12px; color: var(--text-muted);">結算金額為所有共用帳目的總和。綠色箭頭表示「誰應付給誰多少錢」，回國結清超方便！</span>
      </div>
      
      <div class="split-matrix-list" style="margin-top: 18px;">
        ${settlements.length === 0 ? `
          <div style="text-align: center; padding: 15px; font-size: 13px; color: var(--text-muted);">
            目前所有帳目均已結清，沒有人欠款！🎉
          </div>
        ` : settlements.map(s => `
          <div class="split-matrix-row">
            <div class="split-matrix-who">
              <strong>${s.debtor}</strong> <span>👉</span> <strong>${s.creditor}</strong>
            </div>
            <div class="split-matrix-amount" style="color: var(--accent); font-weight: 700; font-family: var(--font-title); text-align: right;">
              ${Math.round(s.amount).toLocaleString()} <span style="font-size: 10px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</span>
              <div style="font-size: 9px; color: var(--text-muted); text-align: right; font-weight: normal; margin-top: 2px;">
                NT$ ${Math.round(s.amount * trip.exchangeRate).toLocaleString()}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    ${cloudCardHtml}

    <!-- Companions management -->
    <div class="card">
      <div class="card-title">管理旅伴群組</div>
      <div class="form-row-inline">
        <input type="text" id="companion-add-input" class="drawer-text-input" style="padding: 8px 14px;" placeholder="輸入旅伴名字...">
        <button class="btn-primary" onclick="addCompanion()">添加</button>
      </div>

      <div class="split-companion-list">
        <!-- Self is implicit -->
        <div class="split-companion-item">
          <div class="companion-name">
            <div class="companion-avatar" style="background-color: var(--secondary);">我</div>
            我（記帳發起人）
          </div>
          <span style="font-size: 11px; color: var(--text-muted);">發起人</span>
        </div>
        
        ${companions.map(c => `
          <div class="split-companion-item">
            <div class="companion-name">
              <div class="companion-avatar">${c.charAt(0)}</div>
              ${c}
            </div>
            <button class="btn-remove-companion" onclick="removeCompanion('${c}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  splitContainer.innerHTML = html;
}

// Render 4: Settings View
function renderSettings() {
  const trip = getActiveTrip();
  const settingsContainer = document.getElementById('view-settings');
  
  let html = `
    <h2 class="ledger-title" style="margin-bottom: 16px;">設定與系統管理</h2>

    <!-- Trip Selection Card -->
    <div class="card">
      <div class="card-title">旅程選單</div>
      <div class="settings-list">
        ${trips.map(t => `
          <div class="settings-item" onclick="switchTrip('${t.id}')" style="${t.id === activeTripId ? 'border-color: var(--primary); background-color: rgba(255,122,69,0.03);' : ''}">
            <div class="settings-item-left">
              <div class="settings-icon-box ${t.id === activeTripId ? 'primary' : ''}">🗺️</div>
              <div>
                <div class="settings-label" style="font-weight: ${t.id === activeTripId ? '700' : '500'};">${t.name}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  匯率 1 : ${t.exchangeRate} · ${t.foreignCurrency} ➔ ${t.baseCurrency}
                </div>
              </div>
            </div>
            ${t.id === activeTripId ? '<span style="font-size: 11px; color: var(--primary); font-weight: 700;">使用中</span>' : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn-save" style="background: rgba(255,255,255,0.04); color: var(--secondary); border: 1px dashed var(--secondary); box-shadow: none;" onclick="showCreateTripDialog()">
        ➕ 建立全新旅程
      </button>
    </div>
  `;

  if (trip) {
    html += `
      <!-- Active Trip Properties Customization -->
      <div class="card">
        <div class="card-title">目前旅程參數 (${trip.name})</div>
        <div class="settings-list">
          <div class="settings-item" onclick="showEditTripDialog()">
            <div class="settings-item-left">
              <div class="settings-icon-box" style="color: var(--accent); background-color: rgba(54,207,201,0.08);">📅</div>
              <div>
                <div class="settings-label">修改旅程基本資訊</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">編輯名稱、去回日期、外幣、匯率與預算</div>
              </div>
            </div>
            <span class="settings-value">點擊修改 ❯</span>
          </div>

          <div class="settings-item" onclick="editExchangeRate()">
            <div class="settings-item-left">
              <div class="settings-icon-box accent">💹</div>
              <div>
                <div class="settings-label">修改鎖定匯率</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">目前匯率：1 ${trip.foreignCurrency} = ${trip.exchangeRate} ${trip.baseCurrency}</div>
              </div>
            </div>
            <span class="settings-value">點擊修改 ❯</span>
          </div>

          <div class="settings-item" onclick="editTripBudget()">
            <div class="settings-item-left">
              <div class="settings-icon-box primary">💰</div>
              <div>
                <div class="settings-label">修改總預算額度</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  預算總額：NT$ ${trip.budget.toLocaleString()} (約合 ${Math.round(trip.budget / trip.exchangeRate).toLocaleString()} ${trip.foreignCurrency})
                </div>
              </div>
            </div>
            <span class="settings-value">點擊修改 ❯</span>
          </div>
          
          <div class="settings-item" onclick="showCashWithdrawalDrawer()">
            <div class="settings-item-left">
              <div class="settings-icon-box" style="color: var(--secondary); background-color: rgba(255,192,105,0.08);">💸</div>
              <div>
                <div class="settings-label">外幣現金提領 / 充值</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">增加手頭上的外幣現鈔水位</div>
              </div>
            </div>
            <span class="settings-value">點擊記帳 ❯</span>
          </div>
        </div>
      </div>

      <!-- Backup Export and Import Section -->
      <div class="card">
        <div class="card-title">資料備份與搬移</div>
        <div class="settings-list">
          <div class="settings-item" onclick="exportTripJSON()">
            <div class="settings-item-left">
              <div class="settings-icon-box">📤</div>
              <div>
                <div class="settings-label">匯出完整 JSON 備份</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">匯出所有旅程與記帳，可換手機還原</div>
              </div>
            </div>
          </div>

          <div class="settings-item" onclick="exportTripCSV()">
            <div class="settings-item-left">
              <div class="settings-icon-box">📊</div>
              <div>
                <div class="settings-label">匯出 CSV 試算表</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">可用 Excel 或 Google 試算表直接編輯</div>
              </div>
            </div>
          </div>

          <div class="settings-item" onclick="document.getElementById('import-file-input').click()">
            <input type="file" id="import-file-input" style="display: none;" accept=".json" onchange="importTripJSON(event)">
            <div class="settings-item-left">
              <div class="settings-icon-box">📥</div>
              <div>
                <div class="settings-label">匯入 JSON 備份還原</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">選擇 JSON 檔案以還原記帳紀錄</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card" style="border-color: rgba(255, 77, 79, 0.2);">
        <div class="card-title" style="color: var(--danger);">危險區域</div>
        <div class="settings-list">
          <div class="settings-item" onclick="confirmDeleteTrip()" style="border: 1px solid rgba(255,77,79,0.15);">
            <div class="settings-item-left">
              <div class="settings-icon-box danger">🗑️</div>
              <div>
                <div class="settings-label" style="color: var(--danger);">刪除目前旅程</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">此動作將永久移除目前旅程內的所有帳目</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Add Version 3.0 Elegant Footer badge in Traditional Chinese
  html += `
    <div style="text-align: center; margin-top: 30px; margin-bottom: 20px; padding: 10px; opacity: 0.7;">
      <div style="font-family: var(--font-title); font-size: 14px; font-weight: 700; color: var(--secondary);">v3.0 行動優化尊爵版 📱</div>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">支援觸覺震動回饋 · 防凍結順暢滑動 · 原生操作導航</div>
      <div style="font-size: 9px; color: var(--text-muted); margin-top: 6px; opacity: 0.5;">Antigravity Design Team © 2026</div>
    </div>
  `;

  settingsContainer.innerHTML = html;
}

// -------------------------------------------------------------
// Transaction Adding & Drawer Functionality

function showAddExpenseDrawer() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  editingTransactionId = null;
  document.getElementById('drawer-title-text').innerText = '記下一筆海外花費 ✈️';
  
  // Update currency badge text dynamically
  const badgeForeign = document.getElementById('currency-badge-foreign');
  const badgeBase = document.getElementById('currency-badge-base');
  if (badgeForeign && badgeBase) {
    badgeForeign.innerText = trip.foreignCurrency;
    badgeBase.innerText = trip.baseCurrency;
  }
  
  // Set default values in inputs
  keypadBuffer = '0';
  activeInputType = 'foreign';
  document.getElementById('drawer-amt-foreign').value = '0';
  updateDrawerEquivalentText();
  
  // Description and Date
  document.getElementById('drawer-desc-input').value = '';
  document.getElementById('drawer-date-input').value = getFormattedCurrentTime();
  
  // Reset active category
  document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
  document.querySelector('.category-pill[data-category="food"]')?.classList.add('active');
  
  // Reset payment method
  document.querySelectorAll('#method-toggle .toggle-option').forEach(el => el.classList.remove('active'));
  document.querySelector('#method-toggle .toggle-option[data-method="cash"]')?.classList.add('active');
  
  // Reset Split bill UI
  document.getElementById('split-bill-section').style.display = 'none';
  
  // Hide delete button for new entries
  const btnDelete = document.getElementById('btn-delete-tx');
  if (btnDelete) btnDelete.style.display = 'none';
  
  // Display Drawer
  document.getElementById('drawer-overlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
  
  // Populate companions inside Split section if any
  populateSplitCheckboxSection();
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('active');
  document.getElementById('drawer').classList.remove('active');
  editingTransactionId = null;
}

// Custom Keypad Tap Handlers
function keypadTap(val) {
  if (val === 'C') {
    keypadBuffer = '0';
  } else if (val === 'backspace') {
    if (keypadBuffer.length > 1) {
      keypadBuffer = keypadBuffer.slice(0, -1);
    } else {
      keypadBuffer = '0';
    }
  } else if (val === '.') {
    if (!keypadBuffer.includes('.')) {
      keypadBuffer += '.';
    }
  } else {
    // Number typed
    if (keypadBuffer === '0') {
      keypadBuffer = val;
    } else {
      // Prevent typing more than 2 decimal points
      const parts = keypadBuffer.split('.');
      if (parts.length > 1 && parts[1].length >= 2) {
        // Already has 2 decimal digits, do nothing
        return;
      }
      keypadBuffer += val;
    }
  }
  
  // Update UI values
  if (activeInputType === 'foreign') {
    document.getElementById('drawer-amt-foreign').value = keypadBuffer;
  } else {
    // In base currency
    document.getElementById('drawer-amt-foreign').value = keypadBuffer; 
  }
  
  updateDrawerEquivalentText();
}

function setInputType(type) {
  if (activeInputType === type) return;
  
  const trip = getActiveTrip();
  if (!trip) return;
  
  const currentVal = parseFloat(keypadBuffer) || 0;
  const rate = trip.exchangeRate;
  
  if (type === 'base' && activeInputType === 'foreign') {
    // Foreign to Base: multiply by rate
    const converted = Math.round(currentVal * rate);
    keypadBuffer = converted.toString();
  } else if (type === 'foreign' && activeInputType === 'base') {
    // Base to Foreign: divide by rate
    const converted = parseFloat((currentVal / rate).toFixed(2));
    keypadBuffer = converted.toString();
  }
  
  activeInputType = type;
  const badgeForeign = document.getElementById('currency-badge-foreign');
  const badgeBase = document.getElementById('currency-badge-base');
  
  if (type === 'foreign') {
    badgeForeign.style.color = 'var(--secondary)';
    badgeBase.style.color = 'var(--text-muted)';
  } else {
    badgeForeign.style.color = 'var(--text-muted)';
    badgeBase.style.color = 'var(--secondary)';
  }
  
  document.getElementById('drawer-amt-foreign').value = keypadBuffer;
  updateDrawerEquivalentText();
}

function updateDrawerEquivalentText() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const amt = parseFloat(keypadBuffer) || 0;
  const rate = trip.exchangeRate;
  
  const equivEl = document.getElementById('drawer-equivalent-val');
  if (activeInputType === 'foreign') {
    const equiv = Math.round(amt * rate);
    equivEl.innerText = `≈ NT$ ${equiv.toLocaleString()} (鎖定匯率 ${rate})`;
  } else {
    const equiv = parseFloat((amt / rate).toFixed(2));
    equivEl.innerText = `≈ ${equiv.toLocaleString()} ${trip.foreignCurrency}`;
  }
}

// Generate current local date & time formatted "YYYY-MM-DD HH:MM"
function getFormattedCurrentTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hrs = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hrs}:${mins}`;
}

// Set up companions checkbox picker in split drawer section
function populateSplitCheckboxSection() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const splitContainer = document.getElementById('split-checkboxes-container');
  const companions = trip.companions || [];
  
  if (companions.length === 0) {
    splitContainer.innerHTML = `<span style="font-size: 12px; color: var(--text-muted);">目前沒有其他旅群組成員。可在「拆帳」頁面添加！</span>`;
    return;
  }
  
  // Payer select dropdown
  const payerSelect = document.getElementById('drawer-payer-select');
  payerSelect.innerHTML = `<option value="我">我</option>` + companions.map(c => `<option value="${c}">${c}</option>`).join('');

  // Checklist of companions who splits
  let checkHtml = `
    <div class="split-checkbox-row">
      <label class="split-checkbox-label">
        <input type="checkbox" class="split-checkbox-input" value="我" checked onchange="recalculateSplitShares()">
        我 (記帳發起人)
      </label>
      <span id="split-share-我" style="font-size: 11px; color: var(--accent);">NT$ 0</span>
    </div>
  `;
  
  companions.forEach(c => {
    checkHtml += `
      <div class="split-checkbox-row">
        <label class="split-checkbox-label">
          <input type="checkbox" class="split-checkbox-input" value="${c}" checked onchange="recalculateSplitShares()">
          ${c}
        </label>
        <span id="split-share-${c}" style="font-size: 11px; color: var(--accent);">NT$ 0</span>
      </div>
    `;
  });
  
  splitContainer.innerHTML = checkHtml;
  recalculateSplitShares();
}

function toggleSplitSection(show) {
  const section = document.getElementById('split-bill-section');
  section.style.display = show ? 'block' : 'none';
  if (show) {
    recalculateSplitShares();
  }
}

function recalculateSplitShares() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const rawAmt = parseFloat(document.getElementById('drawer-amt-foreign').value) || 0;
  const rate = trip.exchangeRate;
  
  let amtBase = 0;
  if (activeInputType === 'foreign') {
    amtBase = Math.round(rawAmt * rate);
  } else {
    amtBase = Math.round(rawAmt);
  }
  
  // Find checked splitters
  const checkedEls = document.querySelectorAll('.split-checkbox-input:checked');
  const count = checkedEls.length;
  
  // Clear all shares text
  document.querySelectorAll('.split-checkbox-input').forEach(el => {
    const shareEl = document.getElementById(`split-share-${el.value}`);
    if (shareEl) shareEl.innerText = `NT$ 0`;
  });
  
  if (count === 0) return;
  
  // Divide equally
  const share = Math.round(amtBase / count);
  checkedEls.forEach(el => {
    const shareEl = document.getElementById(`split-share-${el.value}`);
    if (shareEl) shareEl.innerText = `NT$ ${share.toLocaleString()}`;
  });
}

// -------------------------------------------------------------
// Transaction Save / Delete Operation

function saveTransaction() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const rawAmt = parseFloat(document.getElementById('drawer-amt-foreign').value) || 0;
  if (rawAmt <= 0) {
    showToast('⚠️ 金額必須大於 0');
    return;
  }
  
  const rate = trip.exchangeRate;
  let amountForeign = 0;
  let amountBase = 0;
  
  if (activeInputType === 'foreign') {
    amountForeign = rawAmt;
    amountBase = Math.round(rawAmt * rate);
  } else {
    amountBase = Math.round(rawAmt);
    amountForeign = parseFloat((rawAmt / rate).toFixed(2));
  }
  
  const desc = document.getElementById('drawer-desc-input').value.trim();
  const date = document.getElementById('drawer-date-input').value || getFormattedCurrentTime();
  
  // Category
  const activeCatEl = document.querySelector('.category-pill.active');
  const category = activeCatEl ? activeCatEl.dataset.category : 'others';
  
  // Payment method
  const activeMethodEl = document.querySelector('#method-toggle .toggle-option.active');
  let paymentMethod = activeMethodEl ? activeMethodEl.dataset.method : 'cash';
  
  // Multi-party Split calculation
  let payer = '我';
  let splitWith = ['我'];
  
  if (paymentMethod === 'split') {
    payer = document.getElementById('drawer-payer-select').value;
    const checkedEls = document.querySelectorAll('.split-checkbox-input:checked');
    splitWith = Array.from(checkedEls).map(el => el.value);
    
    if (splitWith.length === 0) {
      showToast('⚠️ 請至少勾選一位分攤人');
      return;
    }
  }

  if (editingTransactionId) {
    // Edit transaction
    const index = trip.transactions.findIndex(t => t.id === editingTransactionId);
    if (index !== -1) {
      trip.transactions[index] = {
        ...trip.transactions[index],
        date, amountForeign, amountBase, category, paymentMethod, desc, payer, splitWith,
        updatedAt: Date.now()
      };
      showToast('✅ 交易修改成功！');
    }
  } else {
    // New transaction
    const newTx = {
      id: 'tx-' + Date.now(),
      date, amountForeign, amountBase, category, paymentMethod, desc, payer, splitWith,
      updatedAt: Date.now()
    };
    trip.transactions.push(newTx);
    showToast('📝 記帳成功！');
  }
  
  saveData();
  closeDrawer();
  renderApp();
}

function editTransaction(txId) {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const tx = trip.transactions.find(t => t.id === txId);
  if (!tx) return;
  
  editingTransactionId = txId;
  document.getElementById('drawer-title-text').innerText = '修改記帳明細 ✏️';
  
  // Update currency badge text dynamically
  const badgeForeign = document.getElementById('currency-badge-foreign');
  const badgeBase = document.getElementById('currency-badge-base');
  if (badgeForeign && badgeBase) {
    badgeForeign.innerText = trip.foreignCurrency;
    badgeBase.innerText = trip.baseCurrency;
  }
  
  // Populate form
  activeInputType = 'foreign';
  keypadBuffer = tx.amountForeign.toString();
  document.getElementById('drawer-amt-foreign').value = keypadBuffer;
  updateDrawerEquivalentText();
  
  document.getElementById('drawer-desc-input').value = tx.desc;
  document.getElementById('drawer-date-input').value = tx.date;
  
  // Populate category pill
  document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
  document.querySelector(`.category-pill[data-category="${tx.category}"]`)?.classList.add('active');
  
  // Populate method toggle
  document.querySelectorAll('#method-toggle .toggle-option').forEach(el => el.classList.remove('active'));
  document.querySelector(`#method-toggle .toggle-option[data-method="${tx.paymentMethod}"]`)?.classList.add('active');
  
  // Toggle split view
  if (tx.paymentMethod === 'split') {
    toggleSplitSection(true);
    
    // Set payer and checkboxes
    setTimeout(() => {
      document.getElementById('drawer-payer-select').value = tx.payer || '我';
      document.querySelectorAll('.split-checkbox-input').forEach(el => {
        el.checked = tx.splitWith.includes(el.value);
      });
      recalculateSplitShares();
    }, 50);
  } else {
    toggleSplitSection(false);
  }
  
  // Show delete button for editing existing entries
  const btnDelete = document.getElementById('btn-delete-tx');
  if (btnDelete) btnDelete.style.display = 'flex';
  
  // Show drawer
  document.getElementById('drawer-overlay').classList.add('active');
  document.getElementById('drawer').classList.add('active');
}

// -------------------------------------------------------------
// Companions Management

function addCompanion() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const input = document.getElementById('companion-add-input');
  const name = input.value.trim();
  
  if (!name) {
    showToast('⚠️ 名字不能為空');
    return;
  }
  
  if (name === '我') {
    showToast('⚠️ 「我」為預設名稱');
    return;
  }
  
  if (!trip.companions) trip.companions = [];
  if (trip.companions.includes(name)) {
    showToast('⚠️ 旅伴名字已存在');
    return;
  }
  
  trip.companions.push(name);
  input.value = '';
  showToast(`👥 已添加旅伴：${name}`);
  saveData();
  renderApp();
}

function removeCompanion(name) {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Confirm deletion safety check
  if (confirm(`確定要將旅伴 「${name}」 移出群組嗎？他所有的拆帳項目會被保留，但不能新增含有他的新項目。`)) {
    trip.companions = trip.companions.filter(c => c !== name);
    showToast(`🗑️ 已移除旅伴：${name}`);
    saveData();
    renderApp();
  }
}

// Netting Algorithm for Settlement - Fully protected from floating-point infinite loops
function calculateSettlements(trip) {
  const companions = trip.companions || [];
  const members = ['我', ...companions];
  
  // Initialize balances to 0 for all trip group members
  const balances = {};
  members.forEach(m => { balances[m] = 0; });
  
  // Run balances accumulator
  trip.transactions.forEach(t => {
    if (t.paymentMethod === 'split') {
      const payer = t.payer || '我';
      const splitWith = t.splitWith || ['我'];
      const totalAmt = t.amountForeign || 0; // Calculate settlements in foreign/local currency directly!
      
      if (balances[payer] === undefined) balances[payer] = 0;
      
      // The payer lent money
      balances[payer] += totalAmt;
      
      // Debited equally
      if (splitWith.length > 0) {
        const share = totalAmt / splitWith.length;
        splitWith.forEach(person => {
          if (balances[person] === undefined) balances[person] = 0;
          balances[person] -= share;
        });
      }
    }
  });

  // Split into creditors and debtors
  const creditors = [];
  const debtors = [];
  
  Object.keys(balances).forEach(person => {
    const bal = balances[person];
    if (isNaN(bal) || !isFinite(bal)) return; // Skip invalid NaN or Infinity values
    
    if (bal > 0.5) {
      creditors.push({ name: person, balance: bal });
    } else if (bal < -0.5) {
      debtors.push({ name: person, balance: -bal }); // positive debt amount
    }
  });

  // greedy match
  const settlements = [];
  
  // Sort descending
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);
  
  let cIdx = 0;
  let dIdx = 0;
  let iterations = 0; // Safe iteration counter guard
  
  while (cIdx < creditors.length && dIdx < debtors.length) {
    iterations++;
    if (iterations > 1000) {
      console.warn("Settlement calculation exceeded iteration safety limit.");
      break; // Force break to prevent main-thread freeze
    }
    
    const cred = creditors[cIdx];
    const debt = debtors[dIdx];
    
    // Safety check for empty or finished balances
    if (cred.balance < 0.1) {
      cIdx++;
      continue;
    }
    if (debt.balance < 0.1) {
      dIdx++;
      continue;
    }
    
    const settleAmt = Math.min(cred.balance, debt.balance);
    if (settleAmt < 0.01) {
      cIdx++;
      dIdx++;
      continue; // Skip negligible amounts to prevent sub-precision locks
    }

    settlements.push({
      debtor: debt.name,
      creditor: cred.name,
      amount: settleAmt
    });
    
    cred.balance -= settleAmt;
    debt.balance -= settleAmt;
    
    if (cred.balance < 0.5) cIdx++;
    if (debt.balance < 0.5) dIdx++;
  }
  
  return settlements;
}

// -------------------------------------------------------------
// PWA Cash Wallet Withdrawals

function showCashWithdrawalDrawer() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Prompt user for amount using native popup for simplicity and security
  const amountStr = prompt(`請輸入提領/兌換的 [${trip.foreignCurrency}] 金額：\n(這將增加您的錢包現金水位，可用於現金支付)`);
  if (!amountStr) return;
  
  const amt = parseFloat(amountStr);
  if (isNaN(amt) || amt <= 0) {
    alert('❌ 請輸入大於 0 的有效數字金額！');
    return;
  }
  
  if (!trip.cashWithdrawals) trip.cashWithdrawals = [];
  
  const newWithdrawal = {
    id: 'w-' + Date.now(),
    date: getFormattedCurrentTime(),
    amountForeign: amt,
    rate: trip.exchangeRate
  };
  
  trip.cashWithdrawals.push(newWithdrawal);
  showToast(`💵 已提領/儲備現金 ${amt.toLocaleString()} ${trip.foreignCurrency}`);
  saveData();
  renderApp();
}

// -------------------------------------------------------------
// Dialog Modals & Settings Management

const BUILTIN_CURRENCIES = {
  JPY: { rate: 0.215, placeholder: '例如：日本東京櫻花季 🇯🇵' },
  KRW: { rate: 0.024, placeholder: '例如：韓國首爾購物趣 🇰🇷' },
  USD: { rate: 32.5, placeholder: '例如：美國紐約商務行 🇺🇸' },
  CNY: { rate: 4.5, placeholder: '例如：中國上海探險 🇨🇳' },
  THB: { rate: 0.91, placeholder: '例如：泰國曼谷避暑之旅 🇹🇭' },
  TWD: { rate: 1.0, placeholder: '例如：環島鐵路漫遊 🇹🇼' }
};

function onNewTripCurrencyChange() {
  const select = document.getElementById('new-trip-currency-select');
  const foreignInput = document.getElementById('new-trip-foreign');
  const rateInput = document.getElementById('new-trip-rate');
  const nameInput = document.getElementById('new-trip-name');
  
  const val = select.value;
  if (val === 'CUSTOM') {
    foreignInput.value = '';
    foreignInput.readOnly = false;
    rateInput.value = '';
    nameInput.placeholder = '例如：歐洲多國浪漫遊 🇪🇺';
  } else {
    const cur = BUILTIN_CURRENCIES[val];
    if (cur) {
      foreignInput.value = val;
      foreignInput.readOnly = true;
      rateInput.value = cur.rate;
      nameInput.placeholder = cur.placeholder;
    }
  }
}

function showCreateTripDialog() {
  const overlay = document.getElementById('dialog-overlay');
  overlay.innerHTML = `
    <div class="dialog" onclick="event.stopPropagation()">
      <h3 class="dialog-title">新增旅遊記帳本 🛫</h3>
      <p class="dialog-desc">建立您的海外行前計畫，自訂專屬外國匯率與預算。</p>

      <div class="form-group">
        <label class="form-label">選擇目標外幣 (自動帶入常用匯率)</label>
        <select id="new-trip-currency-select" class="drawer-text-input" onchange="onNewTripCurrencyChange()" style="padding: 10px 14px; background-color: rgba(255, 255, 255, 0.03); color: var(--text-main); font-size: 13px;">
          <option value="THB" selected>🇹🇭 泰銖 (THB) · 匯率 0.91</option>
          <option value="JPY">🇯🇵 日幣 (JPY) · 匯率 0.215</option>
          <option value="KRW">🇰🇷 韓幣 (KRW) · 匯率 0.024</option>
          <option value="USD">🇺🇸 美金 (USD) · 匯率 32.5</option>
          <option value="CNY">🇨🇳 人民幣 (CNY) · 匯率 4.5</option>
          <option value="TWD">🇹🇼 台幣 (TWD) · 匯率 1.0</option>
          <option value="CUSTOM">➕ 其他自訂外幣</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">旅程名稱 (含小國旗)</label>
        <input type="text" id="new-trip-name" class="drawer-text-input" placeholder="例如：泰國曼谷避暑之旅 🇹🇭" required>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">主台幣</label>
          <input type="text" id="new-trip-base" class="drawer-text-input" value="TWD" readonly>
        </div>
        <div style="flex: 1;">
          <label class="form-label">目標外幣</label>
          <input type="text" id="new-trip-foreign" class="drawer-text-input" value="THB" readonly>
        </div>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">預設匯率 (外幣對台幣)</label>
          <input type="number" id="new-trip-rate" class="drawer-text-input" step="0.0001" placeholder="如 0.91" value="0.91">
        </div>
        <div style="flex: 1;">
          <label class="form-label">預算額度 (TWD)</label>
          <input type="number" id="new-trip-budget" class="drawer-text-input" placeholder="50000" value="50000">
        </div>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">啟程日期</label>
          <input type="date" id="new-trip-start" class="drawer-text-input" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div style="flex: 1;">
          <label class="form-label">回國日期</label>
          <input type="date" id="new-trip-end" class="drawer-text-input" value="${new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0]}">
        </div>
      </div>

      <div class="dialog-buttons">
        <button class="btn-secondary" onclick="closeDialog()">取消</button>
        <button class="btn-primary" onclick="createTripSubmit()">確認建立</button>
      </div>
    </div>
  `;
  overlay.classList.add('active');
}

function closeDialog(e) {
  // Enforce strict event target checking to ignore bubbling pointer events from inputs/keyboards
  if (e && e.target !== document.getElementById('dialog-overlay')) {
    return;
  }
  document.getElementById('dialog-overlay').classList.remove('active');
}

// Edit Trip basic properties (name, dates) dialog
function showEditTripDialog() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const overlay = document.getElementById('dialog-overlay');
  overlay.innerHTML = `
    <div class="dialog" onclick="event.stopPropagation()">
      <h3 class="dialog-title">修改旅程資訊 ✏️</h3>
      <p class="dialog-desc">修改您目前旅程的名稱、出發與回國日期，以及外幣幣別、鎖定匯率與預算金額。</p>
      
      <div class="form-group">
        <label class="form-label">旅程名稱 (含小國旗)</label>
        <input type="text" id="edit-trip-name" class="drawer-text-input" value="${trip.name}" required>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">目標外幣代號</label>
          <input type="text" id="edit-trip-foreign" class="drawer-text-input" value="${trip.foreignCurrency}" placeholder="如 THB, JPY" style="text-transform: uppercase;">
        </div>
        <div style="flex: 1;">
          <label class="form-label">鎖定匯率 (外幣對台幣)</label>
          <input type="number" id="edit-trip-rate" class="drawer-text-input" step="0.0001" value="${trip.exchangeRate}" placeholder="如 0.91">
        </div>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">總預算額度 (TWD)</label>
          <input type="number" id="edit-trip-budget" class="drawer-text-input" value="${trip.budget}" placeholder="50000">
        </div>
      </div>

      <div class="form-row-inline" style="gap: 8px;">
        <div style="flex: 1;">
          <label class="form-label">啟程日期</label>
          <input type="date" id="edit-trip-start" class="drawer-text-input" value="${trip.startDate}">
        </div>
        <div style="flex: 1;">
          <label class="form-label">回國日期</label>
          <input type="date" id="edit-trip-end" class="drawer-text-input" value="${trip.endDate}">
        </div>
      </div>

      <div class="dialog-buttons">
        <button class="btn-secondary" onclick="closeDialog()">取消</button>
        <button class="btn-primary" onclick="editTripSubmit()">確認修改</button>
      </div>
    </div>
  `;
  overlay.classList.add('active');
}

function editTripSubmit() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const name = document.getElementById('edit-trip-name').value.trim();
  const foreignCurrency = document.getElementById('edit-trip-foreign').value.trim().toUpperCase();
  const exchangeRate = parseFloat(document.getElementById('edit-trip-rate').value) || trip.exchangeRate;
  const budget = parseFloat(document.getElementById('edit-trip-budget').value) || trip.budget;
  const startDate = document.getElementById('edit-trip-start').value;
  const endDate = document.getElementById('edit-trip-end').value;

  if (!name || !foreignCurrency) {
    alert('❌ 請填寫完整的旅程名稱與外幣代號！');
    return;
  }

  const oldRate = trip.exchangeRate;
  const oldForeign = trip.foreignCurrency;
  const rateChanged = oldRate !== exchangeRate || oldForeign !== foreignCurrency;

  trip.name = name;
  trip.foreignCurrency = foreignCurrency;
  trip.exchangeRate = exchangeRate;
  trip.budget = budget;
  trip.startDate = startDate;
  trip.endDate = endDate;

  if (rateChanged) {
    if (confirm(`偵測到幣別或匯率已變更！\n是否要將現有所有外幣記帳明細，依新匯率 (${exchangeRate}) 重新計算折合台幣 (TWD) 的金額？\n\n(選擇「確定」會重新校正過往台幣金額；選擇「取消」則僅套用至之後的新增記帳)`)) {
      trip.transactions.forEach(t => {
        t.amountBase = Math.round(t.amountForeign * exchangeRate);
      });
      if (trip.cashWithdrawals) {
        trip.cashWithdrawals.forEach(w => {
          w.rate = exchangeRate;
        });
      }
    }
  }

  saveData();
  closeDialog();
  renderApp();
  showToast('📝 旅程資訊修改成功！');
}

function createTripSubmit() {
  const name = document.getElementById('new-trip-name').value.trim();
  const foreignCurrency = document.getElementById('new-trip-foreign').value.trim().toUpperCase();
  const currencySelect = document.getElementById('new-trip-currency-select');
  const selectedCurrency = currencySelect ? currencySelect.value : 'CUSTOM';
  const defaultRate = BUILTIN_CURRENCIES[selectedCurrency] ? BUILTIN_CURRENCIES[selectedCurrency].rate : 0.91;
  
  const exchangeRate = parseFloat(document.getElementById('new-trip-rate').value) || defaultRate;
  const budget = parseFloat(document.getElementById('new-trip-budget').value) || 50000;
  const startDate = document.getElementById('new-trip-start').value;
  const endDate = document.getElementById('new-trip-end').value;

  if (!name || !foreignCurrency) {
    alert('❌ 請填寫完整的旅程名稱與外幣代號！');
    return;
  }

  const newTrip = {
    id: 'trip-' + Date.now(),
    name,
    startDate,
    endDate,
    budget,
    baseCurrency: 'TWD',
    foreignCurrency,
    exchangeRate,
    companions: [],
    transactions: [],
    cashWithdrawals: []
  };

  trips.push(newTrip);
  activeTripId = newTrip.id;
  
  saveData();
  closeDialog();
  renderApp();
  switchView('dashboard');
  showToast('✈️ 成功建立全新旅程！');
}

function switchTrip(tripId) {
  activeTripId = tripId;
  saveData();
  renderApp();
  startCloudSyncPolling(); // Restart polling for the active trip
  showToast('🗺️ 已切換旅程記帳本');
}

function editExchangeRate() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const newRateStr = prompt(`請輸入新的鎖定匯率：\n(1 ${trip.foreignCurrency} 等於多少 ${trip.baseCurrency})`, trip.exchangeRate);
  if (!newRateStr) return;
  
  const rate = parseFloat(newRateStr);
  if (isNaN(rate) || rate <= 0) {
    alert('❌ 請輸入大於 0 的有效數字匯率！');
    return;
  }
  
  trip.exchangeRate = rate;
  
  // Recalculate transaction base currency values based on new rate
  if (confirm('是否將已記帳的外幣項目，以新匯率重新計算台幣總額？\n(取消則僅影響之後記的新項目)')) {
    trip.transactions.forEach(t => {
      if (t.paymentMethod !== 'split') { // Standard single payments
        t.amountBase = Math.round(t.amountForeign * rate);
      }
    });
  }

  saveData();
  renderApp();
  showToast('💹 匯率修改成功！');
}

function editTripBudget() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const newBudgetStr = prompt(`請輸入此旅程的全新預算 (TWD)：`, trip.budget);
  if (!newBudgetStr) return;
  
  const budget = Math.round(parseFloat(newBudgetStr));
  if (isNaN(budget) || budget <= 0) {
    alert('❌ 請輸入有效金額！');
    return;
  }
  
  trip.budget = budget;
  saveData();
  renderApp();
  showToast('💰 預算修改成功！');
}

function confirmDeleteTrip() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  if (confirm(`🚨 警告！你即將永久刪除 「${trip.name}」 旅程記帳本。\n此動作將不可逆，所有消費明細與拆帳記錄都將消失！是否確認刪除？`)) {
    trips = trips.filter(t => t.id !== activeTripId);
    if (trips.length > 0) {
      activeTripId = trips[0].id;
    } else {
      activeTripId = null;
    }
    saveData();
    renderApp();
    showToast('🗑️ 旅程已成功刪除');
  }
}

// -------------------------------------------------------------
// JSON and CSV Exports / Imports

function exportTripJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trips, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `出國記帳備份_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('📤 JSON 備份檔案已成功匯出');
}

function exportTripCSV() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  let csvContent = "\ufeff"; // Add BOM to fix Excel Chinese character display problems
  csvContent += "日期時間,消費類別,支付方式,項目描述,外幣金額,外幣幣別,台幣金額,付款人,分攤旅伴\n";
  
  trip.transactions.forEach(t => {
    const cat = CATEGORIES[t.category]?.name || '其他';
    let payMethod = '現金';
    if (t.paymentMethod === 'card') payMethod = '刷卡';
    if (t.paymentMethod === 'split') payMethod = '多人拆帳';
    
    const desc = t.desc.replace(/"/g, '""');
    const companions = (t.splitWith || []).join(';');
    
    csvContent += `"${t.date}","${cat}","${payMethod}","${desc}",${t.amountForeign},"${trip.foreignCurrency}",${t.amountBase},"${t.payer || '我'}","${companions}"\n`;
  });
  
  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", encodedUri);
  downloadAnchor.setAttribute("download", `${trip.name}_記帳明細.csv`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('📊 CSV 試算表已成功匯出');
}

function importTripJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        if (confirm('是否將匯入的旅程合併至您現有的記帳本中？\n(選擇「取消」將會覆蓋您目前的全部帳目喔！)')) {
          trips = [...trips, ...imported];
        } else {
          trips = imported;
        }
        if (trips.length > 0) activeTripId = trips[0].id;
        saveData();
        renderApp();
        showToast('📥 備份還原成功！');
      } else {
        alert('❌ 檔案格式錯誤，必須為旅程 JSON 陣列！');
      }
    } catch (err) {
      alert('❌ 無法讀取此檔案，請確認 JSON 格式是否正確！');
    }
  };
  reader.readAsText(file);
}

// -------------------------------------------------------------
// Interactive Helpers & Event Listeners setup

function setupEventListeners() {
  // Bottom navigation clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      if (view) switchView(view);
    });
  });

  // FAB button click for drawer add
  const fab = document.getElementById('fab-add');
  if (fab) {
    fab.addEventListener('click', showAddExpenseDrawer);
  }

  // Category pill selections inside drawer
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Payment method selection inside drawer
  document.querySelectorAll('#method-toggle .toggle-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      document.querySelectorAll('#method-toggle .toggle-option').forEach(el => el.classList.remove('active'));
      const activeOpt = e.currentTarget;
      activeOpt.classList.add('active');
      
      const method = activeOpt.dataset.method;
      toggleSplitSection(method === 'split');
    });
  });

  // Keypad clicks setup
  document.querySelectorAll('.keypad-btn').forEach(btn => {
    // Premium 120Hz Native Mobile feeling: bind touchstart and mousedown to completely eliminate 300ms delay,
    // execute haptic vibrations, and dynamic visuals instantly
    const handleKeypress = (e) => {
      e.preventDefault(); // Stop secondary double-triggers between mousedown & touchstart
      
      // 1. Tactile haptic feedback (vibrate 15ms)
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
      
      // 2. High-performance visual keypad-btn flash
      const targetBtn = e.currentTarget;
      targetBtn.classList.add('active-flash');
      setTimeout(() => {
        targetBtn.classList.remove('active-flash');
      }, 100);
      
      // 3. Trigger logic
      const val = targetBtn.dataset.val;
      if (val === 'save') {
        saveTransaction();
      } else {
        keypadTap(val);
      }
    };
    
    btn.addEventListener('touchstart', handleKeypress, { passive: false });
    btn.addEventListener('mousedown', handleKeypress);
  });
}

// Show a sleek micro UI toast notification
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.querySelector('span').innerText = msg;
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 2200);
}

// -------------------------------------------------------------
// Version 2.0 Collaborative Syncing & Lightsplit Engine (LINE integration)

function deleteTransactionFromDrawer() {
  const trip = getActiveTrip();
  if (!trip || !editingTransactionId) return;
  
  if (confirm('⚠️ 確定要刪除這筆記帳紀錄嗎？此動作將無法復原。')) {
    if (!trip.deletedTxIds) trip.deletedTxIds = [];
    trip.deletedTxIds.push(editingTransactionId);
    
    trip.transactions = trip.transactions.filter(t => t.id !== editingTransactionId);
    
    saveData();
    closeDrawer();
    renderApp();
    showToast('🗑️ 已成功刪除該筆消費');
  }
}

async function enableCloudSync() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Generate a random 6-character room code
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  trip.cloudRoomId = roomId;
  
  showToast('🌐 正在開啟雲端即時同步...');
  
  // Push the current trip to the cloud
  const success = await syncPushCloud();
  if (success) {
    saveData();
    renderApp();
    startCloudSyncPolling(); // Start polling immediately
    alert(`🎉 成功開啟 Lightsplit 雲端同步！\n您的專屬房號為：${roomId}\n\n現在您可以點擊「透過 LINE 分享」邀請好友共同記帳！`);
  } else {
    // Rollback
    trip.cloudRoomId = null;
    alert('❌ 無法連接到雲端伺服器，請檢查您的網路連線後再試一次！');
  }
}

let isPushing = false;
async function syncPushCloud() {
  const trip = getActiveTrip();
  if (!trip || !trip.cloudRoomId) return false;
  
  if (isPushing) return false;
  isPushing = true;
  
  const roomId = trip.cloudRoomId;
  const url = `https://kvdb.io/9Yf3une7gVqwgYRu33cVnF/${roomId}`;
  
  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(trip)
    });
    
    if (response.ok) {
      console.log(`Cloud sync push success for room ${roomId}`);
      isPushing = false;
      return true;
    } else {
      console.error(`Cloud sync push failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('Cloud sync push network error:', error);
  }
  
  isPushing = false;
  return false;
}

let isPulling = false;
async function syncPullCloud(quiet = false) {
  const trip = getActiveTrip();
  if (!trip || !trip.cloudRoomId) return false;
  
  if (isPulling) return false;
  isPulling = true;
  
  const roomId = trip.cloudRoomId;
  const url = `https://kvdb.io/9Yf3une7gVqwgYRu33cVnF/${roomId}`;
  
  try {
    const response = await fetch(url);
    if (response.ok) {
      const cloudTrip = await response.json();
      if (cloudTrip && cloudTrip.id) {
        // Merge cloud data into local trip
        let hasChanges = false;
        
        // 1. Merge Companions (Union)
        const localCompanions = trip.companions || [];
        const cloudCompanions = cloudTrip.companions || [];
        const mergedCompanions = Array.from(new Set([...localCompanions, ...cloudCompanions]));
        if (JSON.stringify(trip.companions) !== JSON.stringify(mergedCompanions)) {
          trip.companions = mergedCompanions;
          hasChanges = true;
        }
        
        // 2. Merge Deleted Transaction IDs (Union)
        const localDeleted = trip.deletedTxIds || [];
        const cloudDeleted = cloudTrip.deletedTxIds || [];
        const mergedDeleted = Array.from(new Set([...localDeleted, ...cloudDeleted]));
        if (JSON.stringify(trip.deletedTxIds) !== JSON.stringify(mergedDeleted)) {
          trip.deletedTxIds = mergedDeleted;
          hasChanges = true;
        }
        
        // 3. Merge Transactions
        const txMap = {};
        const localTx = trip.transactions || [];
        const cloudTx = cloudTrip.transactions || [];
        
        // Populate map with local transactions (excluding those marked as deleted)
        localTx.forEach(t => {
          if (trip.deletedTxIds && trip.deletedTxIds.includes(t.id)) return;
          txMap[t.id] = t;
        });
        
        // Merge cloud transactions
        cloudTx.forEach(t => {
          if (trip.deletedTxIds && trip.deletedTxIds.includes(t.id)) return;
          const local = txMap[t.id];
          if (!local) {
            txMap[t.id] = t;
            hasChanges = true;
          } else {
            // Compare updatedAt
            const localTime = local.updatedAt || 0;
            const cloudTime = t.updatedAt || 0;
            if (cloudTime > localTime) {
              txMap[t.id] = t;
              hasChanges = true;
            }
          }
        });
        
        // Re-filter local transactions that might have been deleted in cloud
        const finalTransactions = [];
        Object.values(txMap).forEach(t => {
          if (trip.deletedTxIds && trip.deletedTxIds.includes(t.id)) {
            hasChanges = true;
            return;
          }
          finalTransactions.push(t);
        });
        
        if (trip.transactions.length !== finalTransactions.length || hasChanges) {
          trip.transactions = finalTransactions;
          hasChanges = true;
        }
        
        // 4. Merge Cash Withdrawals
        const localWithdrawals = trip.cashWithdrawals || [];
        const cloudWithdrawals = cloudTrip.cashWithdrawals || [];
        const withdrawalMap = {};
        localWithdrawals.forEach(w => { withdrawalMap[w.id] = w; });
        cloudWithdrawals.forEach(w => {
          if (!withdrawalMap[w.id]) {
            withdrawalMap[w.id] = w;
            hasChanges = true;
          }
        });
        
        if (trip.cashWithdrawals.length !== Object.keys(withdrawalMap).length) {
          trip.cashWithdrawals = Object.values(withdrawalMap);
          hasChanges = true;
        }
        
        // 5. Merge basic attributes if changed
        if (trip.name !== cloudTrip.name) { trip.name = cloudTrip.name; hasChanges = true; }
        if (trip.budget !== cloudTrip.budget) { trip.budget = cloudTrip.budget; hasChanges = true; }
        if (trip.exchangeRate !== cloudTrip.exchangeRate) { trip.exchangeRate = cloudTrip.exchangeRate; hasChanges = true; }
        if (trip.startDate !== cloudTrip.startDate) { trip.startDate = cloudTrip.startDate; hasChanges = true; }
        if (trip.endDate !== cloudTrip.endDate) { trip.endDate = cloudTrip.endDate; hasChanges = true; }
        
        if (hasChanges) {
          // Save directly to localStorage bypassing saveData auto-push
          localStorage.setItem('travel_trips', JSON.stringify(trips));
          renderApp();
          if (!quiet) showToast('🔄 帳本已與雲端同步更新');
        }
      }
    }
  } catch (error) {
    console.error('Cloud sync pull network error:', error);
  }
  
  isPulling = false;
  return true;
}

let syncIntervalId = null;
function startCloudSyncPolling() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
  
  const trip = getActiveTrip();
  if (trip && trip.cloudRoomId) {
    console.log(`Starting cloud sync background polling for room: ${trip.cloudRoomId}`);
    // Run initial pull silently
    syncPullCloud(true);
    
    // Poll every 8 seconds
    syncIntervalId = setInterval(() => {
      syncPullCloud(true);
    }, 8000);
  }
}

function checkURLRoomQuery() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  
  if (roomId) {
    // Render beautiful premium fullscreen loader screen over app viewport
    const loader = document.createElement('div');
    loader.id = 'cloud-loading-screen';
    loader.style = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100dvh;
      background-color: #0b0b10;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f0f0f5;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    loader.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 24px; animation: pulse 1.5s infinite ease-in-out;">✈️</div>
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px; background: linear-gradient(135deg, #fff 30%, #ffc069 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">正在連線並同步 LINE 共同記帳本...</h3>
      <p style="font-size: 13px; color: #8c8c9e;">房號：${roomId} · 請稍候</p>
      <div style="margin-top: 30px; width: 40px; height: 40px; border: 3px solid rgba(255, 122, 69, 0.1); border-top-color: #ff7a45; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      </style>
    `;
    document.body.appendChild(loader);
    
    // Connect and retrieve cloud data asynchronously
    const url = `https://kvdb.io/9Yf3une7gVqwgYRu33cVnF/${roomId}`;
    fetch(url)
      .then(response => {
        if (!response.ok) throw new Error('Shared room not found');
        return response.json();
      })
      .then(cloudTrip => {
        if (cloudTrip && cloudTrip.id) {
          // Merge or add to our local trips
          const existingIndex = trips.findIndex(t => t.id === cloudTrip.id);
          if (existingIndex !== -1) {
            trips[existingIndex] = cloudTrip;
          } else {
            trips.push(cloudTrip);
          }
          activeTripId = cloudTrip.id;
          saveData();
          
          // Clear query params so refresh doesn't trigger loading screen again
          window.history.replaceState({}, document.title, window.location.pathname);
          
          loader.remove();
          
          switchView('dashboard');
          renderApp();
          startCloudSyncPolling();
          showToast('✈️ 成功加入共同記帳群組！');
        } else {
          throw new Error('Invalid trip data structure');
        }
      })
      .catch(err => {
        console.error(err);
        loader.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 24px;">⚠️</div>
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #ff4d4f;">連線共同記帳本失敗</h3>
          <p style="font-size: 13px; color: #8c8c9e; max-width: 280px; text-align: center; margin-bottom: 24px;">找不到該記帳房號，或者網路連線中斷。請確認分享連結是否正確。</p>
          <button class="btn-primary" onclick="window.location.replace(window.location.pathname)" style="background-color: rgba(255,255,255,0.05); color: #8c8c9e; border: 1px solid rgba(255,255,255,0.08); font-size: 13px; padding: 10px 20px; border-radius: 12px; cursor: pointer;">返回我的記帳本</button>
        `;
      });
      
    return true;
  }
  
  return false;
}

function shareActiveTripToLINE() {
  const trip = getActiveTrip();
  if (!trip || !trip.cloudRoomId) return;
  
  const shareUrl = window.location.origin + window.location.pathname + '?room=' + trip.cloudRoomId;
  const shareText = `我建立了一個出國記帳本「${trip.name}」，邀請你加入共同記帳，旅伴即時拆帳超方便！\n點擊下方連結即可加入：\n${shareUrl}`;
  
  if (navigator.share) {
    navigator.share({
      title: '出國記帳旅伴分享',
      text: shareText,
      url: shareUrl
    }).catch(err => {
      console.log('Native sharing cancelled/failed:', err);
      // Fallback
      const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;
      window.open(lineUrl, '_blank');
    });
  } else {
    // Fallback to direct LINE sharing
    const lineUrl = `https://line.me/R/share?text=${encodeURIComponent(shareText)}`;
    window.open(lineUrl, '_blank');
  }
}
