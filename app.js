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

// Parse dates as local Timezone to prevent UTC offsets
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();
  const parts = dateStr.split(' ');
  const dateParts = parts[0].split('-');
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1;
  const day = parseInt(dateParts[2], 10);
  
  let hrs = 0, mins = 0;
  if (parts[1]) {
    const timeParts = parts[1].split(':');
    hrs = parseInt(timeParts[0], 10);
    mins = parseInt(timeParts[1], 10);
  }
  return new Date(year, month, day, hrs, mins, 0, 0);
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  
  switchView('dashboard');
  renderApp();
  
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
            splitWith: ['我', '阿明', '小華'],
            locationName: '一蘭拉麵 新宿東口店',
            lat: 35.6909,
            lng: 139.7003
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
            splitWith: ['我', '阿明', '小華'],
            locationName: '東京鐵塔展望台',
            lat: 35.6586,
            lng: 139.7454
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
            splitWith: ['我'],
            locationName: '松本清 新宿三丁目店',
            lat: 35.6917,
            lng: 139.7015
          },
          {
            id: 't4',
            date: '2026-05-18 16:00',
            amountForeign: 32000,
            amountBase: 6880,
            category: 'lodging',
            paymentMethod: 'card',
            desc: '新宿新宿歌舞伎町設計酒店',
            payer: '我',
            splitWith: ['我', '阿明', '小華'],
            locationName: '新宿歌舞伎町設計酒店',
            lat: 35.6938,
            lng: 139.7035
          },
          {
            id: 't5',
            date: '2026-05-15 11:30',
            amountForeign: 3000,
            amountBase: 645,
            category: 'transport',
            paymentMethod: 'cash',
            desc: 'Skyliner 京成電鐵特急',
            payer: '小華',
            splitWith: ['我', '阿明', '小華'],
            locationName: '成田機場 第一航廈',
            lat: 35.7720,
            lng: 140.3929
          },
          {
            id: 't6',
            date: '2026-05-19 19:30',
            amountForeign: 15000,
            amountBase: 3225,
            category: 'food',
            paymentMethod: 'split',
            desc: '築地市場奢華壽司饗宴',
            payer: '阿明',
            splitWith: ['我', '阿明', '小華'],
            locationName: '築地市場 青空三代目',
            lat: 35.6655,
            lng: 139.7702
          },
          {
            id: 't7',
            date: '2026-05-20 16:20',
            amountForeign: 8000,
            amountBase: 1720,
            category: 'souvenir',
            paymentMethod: 'cash',
            desc: '淺草雷門人形燒伴手禮',
            payer: '我',
            splitWith: ['我'],
            locationName: '淺草雷門 人形燒伴手禮店',
            lat: 35.7110,
            lng: 139.7967
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
  } else {
    localStorage.removeItem('travel_active_trip_id');
  }
}

// Get active trip object
function getActiveTrip() {
  const trip = trips.find(t => t.id === activeTripId);
  if (trip) {
    if (!trip.liveTrack) trip.liveTrack = [];
    if (!trip.unlockedGrids) trip.unlockedGrids = {};
  }
  return trip;
}

// Render dynamic components of the application
function renderApp() {
  const trip = getActiveTrip();
  
  // Render header trip title
  const tripBadge = document.getElementById('current-trip-badge');
  if (trip) {
    tripBadge.innerHTML = `✈️ ${trip.name}`;
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
  renderMap();
}

// Navigation controller
function switchView(viewName) {
  playClickSound();
  activeView = viewName;
  
  // Clean up simulation intervals when navigating away from the map
  if (viewName !== 'map') {
    if (window.exploreSimInterval) {
      clearInterval(window.exploreSimInterval);
      window.exploreSimInterval = null;
    }
  }
  
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

  const waterPct = totalWithdrawn > 0 ? Math.round((remainingCashForeign / totalWithdrawn) * 100) : 0;
  const waterPctClamped = Math.max(0, Math.min(100, waterPct));
  let waterClass = '';
  if (waterPctClamped < 10) {
    waterClass = 'danger';
  } else if (waterPctClamped < 30) {
    waterClass = 'warning';
  }

  // Daily Allowance Calculation
  // 使用 parseLocalDate 精確解析日期，並將時間部分設為 0 以便進行日期比對
  const start = parseLocalDate(trip.startDate);
  start.setHours(0, 0, 0, 0);
  const end = parseLocalDate(trip.endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  let remainingDays = Math.round((end - today) / (1000 * 60 * 60 * 24)) + 1;
  if (remainingDays < 1) remainingDays = 0; // 旅程已結束
  if (today < start) remainingDays = totalDays; // 旅程尚未開始

  // 計算「今天以前的消費」與「今天的消費」
  let spentBeforeTodayBase = 0;
  let spentTodayBase = 0;

  trip.transactions.forEach(t => {
    const txDate = parseLocalDate(t.date);
    txDate.setHours(0, 0, 0, 0);
    
    if (txDate < today) {
      spentBeforeTodayBase += t.amountBase;
    } else if (txDate.getTime() === today.getTime()) {
      spentTodayBase += t.amountBase;
    }
  });

  // 今日可用平攤預算 = (總預算 - 今天以前的消費) / 剩餘天數
  const dailyBudgetLimitBase = remainingDays > 0 ? Math.max(0, Math.round((totalBudget - spentBeforeTodayBase) / remainingDays)) : 0;
  // 今日剩餘可用額度 = 今日可用平攤預算 - 今日已消費
  const dailyAllowanceBase = Math.max(0, dailyBudgetLimitBase - spentTodayBase);
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
  const cashSpentBase = trip.transactions.filter(t => t.paymentMethod === 'cash').reduce((acc, t) => acc + t.amountBase, 0);

  const cashPct = totalSpentBase > 0 ? Math.round(cashSpentBase / totalSpentBase * 100) : 0;
  const cardPct = totalSpentBase > 0 ? Math.round(cardSpentBase / totalSpentBase * 100) : 0;
  const splitPct = totalSpentBase > 0 ? 100 - cashPct - cardPct : 0;
  const splitPctClamped = Math.max(0, splitPct);

  // Render dynamic dashboard HTML
  const dashHtml = `
    <!-- Quick Action Shortcut Buttons -->
    <div class="quick-actions-row">
      <div class="quick-action-btn" onclick="showAddExpenseDrawer()">
        <span class="qa-icon">✏️</span>
        <span class="qa-label">快速記帳</span>
      </div>
      <div class="quick-action-btn" onclick="showCashWithdrawalDrawer()">
        <span class="qa-icon">💸</span>
        <span class="qa-label">提領現金</span>
      </div>
      <div class="quick-action-btn" onclick="switchView('ledger')">
        <span class="qa-icon">📋</span>
        <span class="qa-label">查看帳本</span>
      </div>
      <div class="quick-action-btn" onclick="switchView('split-bill')">
        <span class="qa-icon">👥</span>
        <span class="qa-label">旅伴拆帳</span>
      </div>
    </div>

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
            <circle class="circular-bar" cx="40" cy="40" r="34" style="stroke-dashoffset: ${214 - (214 * percentUsed / 100)}"></circle>
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
        <div class="detail-sub" style="margin-bottom: 6px;">
          約合 NT$ ${remainingCashBase.toLocaleString()}
        </div>
        <div class="wallet-water-wrapper" title="手頭現金水位：${waterPct}%">
          <div class="wallet-water-track">
            <div class="wallet-water-fill ${waterClass}" style="width: ${waterPctClamped}%"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted); margin-top: 4px;">
            <span>手頭現金水位</span>
            <span>${waterPct}%</span>
          </div>
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
          平攤限額 NT$ ${dailyBudgetLimitBase.toLocaleString()}/天 · 今日已花 NT$ ${spentTodayBase.toLocaleString()}
        </div>
      </div>
    </div>

    <!-- Today Spending Summary Card -->
    <div class="card today-summary-card">
      <div class="card-title" style="color: var(--accent);">📊 今日花費摘要</div>
      <div class="today-stats-grid">
        <div class="today-stat-item">
          <div class="today-stat-label">💰 今日已花費</div>
          <div class="today-stat-value accent">NT$ ${spentTodayBase.toLocaleString()}</div>
        </div>
        <div class="today-stat-item">
          <div class="today-stat-label">🎯 今日剩餘額度</div>
          <div class="today-stat-value ${dailyAllowanceBase <= 0 ? 'danger' : 'warning'}">NT$ ${dailyAllowanceBase.toLocaleString()}</div>
        </div>
      </div>
      ${(() => {
        // 今日花費類別分布
        const todayCats = {};
        trip.transactions.forEach(t => {
          const txDate = parseLocalDate(t.date);
          txDate.setHours(0, 0, 0, 0);
          if (txDate.getTime() === today.getTime()) {
            const catKey = t.category || 'others';
            const cat = CATEGORIES[catKey] || CATEGORIES.others;
            if (!todayCats[catKey]) todayCats[catKey] = { name: cat.name, icon: cat.icon, total: 0 };
            todayCats[catKey].total += t.amountBase;
          }
        });
        const todayCatList = Object.values(todayCats).sort((a, b) => b.total - a.total);
        if (todayCatList.length === 0) {
          return '<div style="text-align: center; padding: 10px; font-size: 12px; color: var(--text-muted); margin-top: 8px;">今天還沒有任何消費記錄 🎉</div>';
        }
        return '<div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">' +
          todayCatList.map(c => 
            '<span style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; padding: 4px 10px; font-size: 11px;">' +
            c.icon + ' ' + c.name + ' <strong style="color: var(--accent); margin-left: 2px;">NT$' + c.total.toLocaleString() + '</strong></span>'
          ).join('') + '</div>';
      })()}

      <!-- Daily Spending Spark Chart (最近7天) -->
      ${(() => {
        const days = [];
        for (let d = 6; d >= 0; d--) {
          const dayDate = new Date(today);
          dayDate.setDate(today.getDate() - d);
          dayDate.setHours(0, 0, 0, 0);
          let dayTotal = 0;
          trip.transactions.forEach(t => {
            const txDate = parseLocalDate(t.date);
            txDate.setHours(0, 0, 0, 0);
            if (txDate.getTime() === dayDate.getTime()) {
              dayTotal += t.amountBase;
            }
          });
          const month = dayDate.getMonth() + 1;
          const day = dayDate.getDate();
          const isToday = dayDate.getTime() === today.getTime();
          days.push({ label: month + '/' + day, total: dayTotal, isToday });
        }
        const maxVal = Math.max(...days.map(d => d.total), 1);
        return '<div class="spark-chart-container">' +
          '<div class="spark-chart-title"><span>📈 最近 7 日消費趨勢</span><span style="font-size: 10px; color: var(--accent);">(NT$)</span></div>' +
          '<div class="spark-chart-bars">' +
          days.map(d => {
            const pct = Math.max(3, Math.round((d.total / maxVal) * 100));
            return '<div class="spark-bar-col">' +
              (d.total > 0 ? '<div style="font-size: 8px; color: var(--text-muted); margin-bottom: 2px;">' + d.total.toLocaleString() + '</div>' : '') +
              '<div class="spark-bar ' + (d.isToday ? 'today' : '') + '" style="height: ' + pct + '%;"></div>' +
              '<div class="spark-bar-label">' + d.label + (d.isToday ? ' 🔸' : '') + '</div>' +
            '</div>';
          }).join('') +
          '</div></div>';
      })()}
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
      <div class="card-title" style="margin-bottom: 4px;">支付管道佔比</div>
      
      <div class="segmented-bar-container">
        ${cashPct > 0 ? `<div class="segmented-bar-segment cash" style="width: ${cashPct}%" title="現金: ${cashPct}%"></div>` : ''}
        ${cardPct > 0 ? `<div class="segmented-bar-segment card" style="width: ${cardPct}%" title="刷卡: ${cardPct}%"></div>` : ''}
        ${splitPctClamped > 0 ? `<div class="segmented-bar-segment split" style="width: ${splitPctClamped}%" title="多人拆帳: ${splitPctClamped}%"></div>` : ''}
        ${totalSpentBase === 0 ? `<div style="width: 100%; height: 100%; background-color: rgba(255,255,255,0.05);"></div>` : ''}
      </div>

      <div style="display: flex; gap: 8px; font-size: 11px; color: var(--text-muted); justify-content: space-between; align-items: center; margin-top: 10px;">
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--secondary); margin-bottom: 4px;"></div>
          <span>現金現鈔</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${cashPct}%</strong>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--accent); margin-bottom: 4px;"></div>
          <span>信用卡</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${cardPct}%</strong>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #b37feb; margin-bottom: 4px;"></div>
          <span>拆帳分算</span>
          <strong style="color: var(--text-main); font-size: 13px; margin-top: 2px;">${totalSpentBase > 0 ? 100 - cashPct - cardPct : 0}%</strong>
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
let ledgerSortMode = 'date-desc';

function setLedgerSort(mode) {
  ledgerSortMode = mode;
  renderLedger();
}

function renderLedger() {
  const trip = getActiveTrip();
  const ledgerContainer = document.getElementById('view-ledger');
  
  if (!trip) {
    ledgerContainer.innerHTML = '';
    return;
  }

  const myIdentity = getMyIdentity(trip);
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

  // Sort transactions based on sort mode
  let sorted;
  switch (ledgerSortMode) {
    case 'date-asc':
      sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case 'amount-desc':
      sorted = [...filtered].sort((a, b) => b.amountForeign - a.amountForeign);
      break;
    case 'amount-asc':
      sorted = [...filtered].sort((a, b) => a.amountForeign - b.amountForeign);
      break;
    case 'category':
      sorted = [...filtered].sort((a, b) => {
        const catA = (CATEGORIES[a.category]?.name || 'zzz');
        const catB = (CATEGORIES[b.category]?.name || 'zzz');
        return catA.localeCompare(catB) || new Date(b.date) - new Date(a.date);
      });
      break;
    default: // date-desc
      sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // Calculate total for filtered results
  const filteredTotal = filtered.reduce((acc, t) => acc + t.amountBase, 0);

  let html = `
    <div class="ledger-header">
      <h2 class="ledger-title">消費明細 (${sorted.length}筆)</h2>
      <select class="ledger-sort-select" onchange="setLedgerSort(this.value)" id="ledger-sort-sel">
        <option value="date-desc" ${ledgerSortMode === 'date-desc' ? 'selected' : ''}>📅 最新優先</option>
        <option value="date-asc" ${ledgerSortMode === 'date-asc' ? 'selected' : ''}>📅 最早優先</option>
        <option value="amount-desc" ${ledgerSortMode === 'amount-desc' ? 'selected' : ''}>💰 金額高→低</option>
        <option value="amount-asc" ${ledgerSortMode === 'amount-asc' ? 'selected' : ''}>💰 金額低→高</option>
        <option value="category" ${ledgerSortMode === 'category' ? 'selected' : ''}>🏷️ 按類別分組</option>
      </select>
    </div>
    
    <div class="search-input-wrapper">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" id="ledger-search-input" class="search-input" placeholder="搜尋備註、分類或支付方式..." value="${query}" oninput="renderLedger()">
    </div>

    ${filtered.length > 0 ? `
      <div style="text-align: right; font-size: 11px; color: var(--text-muted); margin-bottom: 10px; padding-right: 4px;">
        篩選總計：<strong style="color: var(--accent);">NT$ ${filteredTotal.toLocaleString()}</strong>
      </div>
    ` : ''}
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
    
    // Group by date for date header display
    let lastDateKey = '';
    
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

      // Date group header (only for date sort modes)
      if (ledgerSortMode === 'date-desc' || ledgerSortMode === 'date-asc') {
        const txDateObj = parseLocalDate(t.date);
        const dateKey = `${txDateObj.getFullYear()}-${String(txDateObj.getMonth()+1).padStart(2,'0')}-${String(txDateObj.getDate()).padStart(2,'0')}`;
        if (dateKey !== lastDateKey) {
          // Calculate daily subtotal
          const dayTotal = sorted.filter(s => {
            const sd = parseLocalDate(s.date);
            return `${sd.getFullYear()}-${String(sd.getMonth()+1).padStart(2,'0')}-${String(sd.getDate()).padStart(2,'0')}` === dateKey;
          }).reduce((acc, s) => acc + s.amountBase, 0);

          const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
          const dayName = dayNames[txDateObj.getDay()];
          
          html += `
            <div class="ledger-date-group">
              <div class="ledger-date-line"></div>
              <div class="ledger-date-label">📅 ${dateKey} (週${dayName})</div>
              <div class="ledger-date-total">NT$ ${dayTotal.toLocaleString()}</div>
              <div class="ledger-date-line"></div>
            </div>
          `;
          lastDateKey = dateKey;
        }
      }

      html += `
        <div class="ledger-swipe-container" data-tx-id="${t.id}">
          <div class="ledger-swipe-content" onclick="editTransaction('${t.id}')">
            <div class="ledger-icon-box ${cat.class}">${cat.icon}</div>
            <div class="ledger-info">
              <div class="ledger-meta">
                <span class="ledger-category">${cat.name}</span>
                <span class="ledger-paymethod ${payClass}">${payMethodStr}</span>
              </div>
              <div class="ledger-desc">${t.desc || '（無備註內容）'}</div>
              <div style="font-size: 9px; color: var(--text-muted); margin-top: 4px;">${t.date} · 由 ${getPayerDisplayName(t.payer || '我', myIdentity)} 付款</div>
            </div>
            <div class="ledger-amounts">
              <div class="ledger-amount-base" style="font-family: var(--font-title); font-size: 15px; font-weight: 700; color: var(--text-main);">${t.amountForeign.toLocaleString()} <span style="font-size: 11px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</span></div>
              <div class="ledger-amount-foreign" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">NT$ ${t.amountBase.toLocaleString()}</div>
            </div>
          </div>
          <div class="ledger-swipe-action-delete" onclick="confirmDeleteTransaction('${t.id}', event)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            刪除
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }

  ledgerContainer.innerHTML = html;
  initLedgerSwipeToDelete();
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
  const myIdentity = getMyIdentity(trip);

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
              <strong>${s.debtor === myIdentity ? `${s.debtor} (我)` : (s.debtor === '我' ? '記帳發起人' : s.debtor)}</strong> <span>👉</span> <strong>${s.creditor === myIdentity ? `${s.creditor} (我)` : (s.creditor === '我' ? '記帳發起人' : s.creditor)}</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="split-matrix-amount" style="color: var(--accent); font-weight: 700; font-family: var(--font-title); text-align: right;">
                ${Math.round(s.amount).toLocaleString()} <span style="font-size: 10px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</span>
                <div style="font-size: 9px; color: var(--text-muted); text-align: right; font-weight: normal; margin-top: 2px;">
                  NT$ ${Math.round(s.amount * trip.exchangeRate).toLocaleString()}
                </div>
              </div>
              <button class="btn-settle-debt" onclick="settleSplitDebt('${s.debtor}', '${s.creditor}', ${s.amount})">
                💵 結清
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Companions management -->
    <div class="card">
      <div class="card-title" style="margin-bottom: 6px;">管理旅伴群組</div>
      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
        💡 提示：<b>點擊下方旅伴項目卡片</b>，即可將其設為您的「本機記帳身份」，該身份將連動預設付款人，並在拆帳列表中為您打上 <span style="color: #ff7a45; font-weight: bold;">(我)</span> 標記，共同記帳更精確！
      </div>
      <div class="form-row-inline" style="margin-bottom: 16px;">
        <input type="text" id="companion-add-input" class="drawer-text-input" style="padding: 8px 14px;" placeholder="輸入旅伴名字...">
        <button class="btn-primary" onclick="addCompanion()">添加</button>
      </div>

      <div class="split-companion-list">
        <!-- Self is implicit -->
        <div class="split-companion-item ${myIdentity === '我' ? 'active-identity' : ''}" onclick="setMyIdentity('我')">
          <div class="companion-name">
            <div class="companion-avatar" style="background-color: var(--secondary);">我</div>
            ${myIdentity === '我' ? '我（記帳發起人）' : '記帳發起人'}
          </div>
          ${myIdentity === '我' ? `
            <span style="font-size: 10px; background: rgba(255, 122, 69, 0.15); color: #ff7a45; padding: 2px 8px; border-radius: 10px; font-weight: bold; margin-left: auto; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px rgba(255, 122, 69, 0.2);">我的身份 👤</span>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted);">發起人</span>
          `}
        </div>
        
        ${companions.map(c => {
          const isActive = myIdentity === c;
          return `
            <div class="split-companion-item ${isActive ? 'active-identity' : ''}" onclick="setMyIdentity('${c}')">
              <div class="companion-name">
                <div class="companion-avatar">${c.charAt(0)}</div>
                ${isActive ? `${c} (我)` : c}
              </div>
              <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                ${isActive ? `
                  <span style="font-size: 10px; background: rgba(255, 122, 69, 0.15); color: #ff7a45; padding: 2px 8px; border-radius: 10px; font-weight: bold; display: flex; align-items: center; gap: 4px; box-shadow: 0 0 8px rgba(255, 122, 69, 0.2);">我的身份 👤</span>
                ` : ''}
                <button class="btn-remove-companion" onclick="event.stopPropagation(); removeCompanion('${c}')">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          `;
        }).join('')}
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
      <div class="settings-list" style="overflow: visible;">
        ${trips.map(t => `
          <div class="swipe-container" data-trip-id="${t.id}">
            <div class="swipe-content" onclick="switchTrip('${t.id}')" style="${t.id === activeTripId ? 'border-left: 3px solid var(--primary); background-color: rgba(255,122,69,0.03);' : ''}">
              <div class="settings-item-left">
                <div class="settings-icon-box ${t.id === activeTripId ? 'primary' : ''}">🗺️</div>
                <div>
                  <div class="settings-label" style="font-weight: ${t.id === activeTripId ? '700' : '500'};">${t.name}</div>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    匯率 1 : ${t.exchangeRate} · ${t.foreignCurrency} ➔ ${t.baseCurrency}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 12px;">
                ${t.id === activeTripId ? '<span style="font-size: 11px; color: var(--primary); font-weight: 700;">使用中</span>' : ''}
                <button class="btn-delete-trip-direct" onclick="confirmDeleteTripById('${t.id}', event)" onpointerdown="event.stopPropagation()" ontouchstart="event.stopPropagation()" title="刪除此旅程">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
            <div class="swipe-action-delete" onclick="confirmDeleteTripById('${t.id}', event)">
              🗑️ 刪除
            </div>
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

          <div class="settings-item" onclick="showDataPreviewViewer('json')">
            <div class="settings-item-left">
              <div class="settings-icon-box" style="color: var(--accent); background-color: rgba(54,207,201,0.08);">📋</div>
              <div>
                <div class="settings-label">檢視 JSON 完整資料</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">直接在 App 內預覽所有旅程與記帳數據</div>
              </div>
            </div>
            <span class="settings-value" style="color: var(--accent);">檢視 ❯</span>
          </div>

          <div class="settings-item" onclick="showDataPreviewViewer('csv')">
            <div class="settings-item-left">
              <div class="settings-icon-box" style="color: var(--secondary); background-color: rgba(255,192,105,0.08);">📊</div>
              <div>
                <div class="settings-label">檢視 CSV 消費報表</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">以精美表格預覽消費明細並即時搜尋</div>
              </div>
            </div>
            <span class="settings-value" style="color: var(--secondary);">檢視 ❯</span>
          </div>

          <div class="settings-item" onclick="exportTripJSON()">
            <div class="settings-item-left">
              <div class="settings-icon-box">📤</div>
              <div>
                <div class="settings-label">下載 JSON 備份檔</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">下載備份檔案，可換手機還原</div>
              </div>
            </div>
          </div>

          <div class="settings-item" onclick="exportTripCSV()">
            <div class="settings-item-left">
              <div class="settings-icon-box">💾</div>
              <div>
                <div class="settings-label">下載 CSV 試算表</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">下載 Excel 相容的 CSV 試算表檔案</div>
              </div>
            </div>
          </div>

          <div class="settings-item" onclick="document.getElementById('import-file-input').click()">
            <input type="file" id="import-file-input" style="display: none;" accept=".json" onchange="importTripJSON(event)">
            <div class="settings-item-left">
              <div class="settings-icon-box">📥</div>
              <div>
                <div class="settings-label">匯入 JSON 備份檔</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">選擇先前下載的 .json 檔以還原帳本</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Danger Zone Card -->
      <div class="card" style="border-color: rgba(255, 77, 79, 0.2); background: linear-gradient(135deg, #1f1315 0%, #0f0809 100%); margin-top: 16px;">
        <div class="card-title" style="color: #ff4d4f;">危險區域 🚨</div>
        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.5;">
          清除所有記帳與旅程資料。此操作不可逆，請確保已下載備份檔案。
        </p>
        <button class="btn-primary" onclick="clearAllAppData()" style="background: #ff4d4f; color: white; border: none; width: 100%; height: 40px; border-radius: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(255, 77, 79, 0.2);">
          🚨 刪除 App 所有本機資料
        </button>
      </div>
    `;
  }

  // App Footer / Version
  html += `
    <div style="text-align: center; margin-top: 30px; margin-bottom: 15px; color: var(--text-muted); font-size: 11px;">
      <p>✈️ 出國記帳 PWA 離線工具 v5.0</p>
      <p style="margin-top: 5px; opacity: 0.6;">極致精簡 · 離線優先 · 智能平攤 · 全面優化</p>
    </div>
  `;

  settingsContainer.innerHTML = html;
  
  // 初始化旅程列表項目左右手勢滑動刪除功能
  initSwipeToDelete();
}

// -------------------------------------------------------------
// Swipe to delete touch and pointer event gesture handlers for Trips
function initSwipeToDelete() {
  const containers = document.querySelectorAll('.swipe-container');
  containers.forEach(container => {
    const content = container.querySelector('.swipe-content');
    const deleteBtn = container.querySelector('.swipe-action-delete');
    if (!content || !deleteBtn) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    const maxSwipe = -80; // 刪除按鈕寬度為 80px，所以最大往左滑動 80px

    // Touch events for mobile compatibility
    content.addEventListener('touchstart', (e) => {
      // 關閉其他可能已開啟的滑動按鈕
      document.querySelectorAll('.swipe-container.swipe-open').forEach(el => {
        if (el !== container) {
          const c = el.querySelector('.swipe-content');
          const d = el.querySelector('.swipe-action-delete');
          if (c && d) {
            c.style.transition = 'transform 0.2s ease';
            d.style.transition = 'transform 0.2s ease';
            c.style.transform = 'translateX(0px)';
            d.style.transform = 'translateX(100%)';
          }
          el.classList.remove('swipe-open');
        }
      });

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
      content.style.transition = 'none';
      deleteBtn.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startX;
      const diffY = touchY - startY;

      // 當水平位移明顯大於垂直位移，判定為左右滑動
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping = true;
        
        if (diffX < 0) {
          let moveX = diffX;
          if (moveX < maxSwipe) {
            // 超過 maxSwipe 之後，套用對數阻尼
            moveX = maxSwipe + (moveX - maxSwipe) * 0.2;
          }
          
          content.style.transform = `translateX(${moveX}px)`;
          deleteBtn.style.transform = `translateX(calc(100% + ${moveX}px))`;
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
        }
      }
    }, { passive: true });

    content.addEventListener('touchend', (e) => {
      if (!isSwiping) return;

      const changeX = e.changedTouches[0].clientX - startX;
      content.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      deleteBtn.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

      // 往左滑動超過 35px 則自動 Snap 至開口狀態
      if (changeX < -35) {
        content.style.transform = `translateX(${maxSwipe}px)`;
        deleteBtn.style.transform = `translateX(0px)`;
        container.classList.add('swipe-open');
      } else {
        content.style.transform = `translateX(0px)`;
        deleteBtn.style.transform = `translateX(100%)`;
        container.classList.remove('swipe-open');
      }
      
      startX = 0;
      startY = 0;
    });

    // Pointer events compatibility for desktops/touch laptops
    content.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      
      startX = e.clientX;
      startY = e.clientY;
      isSwiping = false;
      content.style.transition = 'none';
      deleteBtn.style.transition = 'none';
    });

    content.addEventListener('pointermove', (e) => {
      if (startX === 0) return;
      
      const diffX = e.clientX - startX;
      const diffY = e.clientY - startY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping = true;
        try { content.setPointerCapture(e.pointerId); } catch(err){}
        
        if (diffX < 0) {
          let moveX = diffX;
          if (moveX < maxSwipe) {
            moveX = maxSwipe + (moveX - maxSwipe) * 0.2;
          }
          content.style.transform = `translateX(${moveX}px)`;
          deleteBtn.style.transform = `translateX(calc(100% + ${moveX}px))`;
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
        }
      }
    });

    content.addEventListener('pointerup', (e) => {
      try { content.releasePointerCapture(e.pointerId); } catch(err){}
      if (startX === 0) return;
      
      const changeX = e.clientX - startX;
      if (isSwiping) {
        content.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        deleteBtn.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

        if (changeX < -35) {
          content.style.transform = `translateX(${maxSwipe}px)`;
          deleteBtn.style.transform = `translateX(0px)`;
          container.classList.add('swipe-open');
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
          container.classList.remove('swipe-open');
        }
      }
      startX = 0;
      startY = 0;
    });

    content.addEventListener('pointercancel', (e) => {
      try { content.releasePointerCapture(e.pointerId); } catch(err){}
      content.style.transition = 'transform 0.2s ease';
      deleteBtn.style.transition = 'transform 0.2s ease';
      content.style.transform = 'translateX(0px)';
      deleteBtn.style.transform = 'translateX(100%)';
      container.classList.remove('swipe-open');
      startX = 0;
      startY = 0;
    });
  });
}

// -------------------------------------------------------------
// Swipe to delete touch and pointer event gesture handlers for Ledger Transactions
function initLedgerSwipeToDelete() {
  const containers = document.querySelectorAll('.ledger-swipe-container');
  containers.forEach(container => {
    const content = container.querySelector('.ledger-swipe-content');
    const deleteBtn = container.querySelector('.ledger-swipe-action-delete');
    if (!content || !deleteBtn) return;

    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    const maxSwipe = -80;

    content.addEventListener('touchstart', (e) => {
      document.querySelectorAll('.ledger-swipe-container.swipe-open').forEach(el => {
        if (el !== container) {
          const c = el.querySelector('.ledger-swipe-content');
          const d = el.querySelector('.ledger-swipe-action-delete');
          if (c && d) {
            c.style.transition = 'transform 0.2s ease';
            d.style.transition = 'transform 0.2s ease';
            c.style.transform = 'translateX(0px)';
            d.style.transform = 'translateX(100%)';
          }
          el.classList.remove('swipe-open');
        }
      });

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = false;
      content.style.transition = 'none';
      deleteBtn.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const diffX = touchX - startX;
      const diffY = touchY - startY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping = true;
        if (diffX < 0) {
          let moveX = diffX;
          if (moveX < maxSwipe) {
            moveX = maxSwipe + (moveX - maxSwipe) * 0.2;
          }
          content.style.transform = `translateX(${moveX}px)`;
          deleteBtn.style.transform = `translateX(calc(100% + ${moveX}px))`;
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
        }
      }
    }, { passive: true });

    content.addEventListener('touchend', (e) => {
      if (!isSwiping) return;
      const changeX = e.changedTouches[0].clientX - startX;
      content.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
      deleteBtn.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

      if (changeX < -35) {
        content.style.transform = `translateX(${maxSwipe}px)`;
        deleteBtn.style.transform = `translateX(0px)`;
        container.classList.add('swipe-open');
      } else {
        content.style.transform = `translateX(0px)`;
        deleteBtn.style.transform = `translateX(100%)`;
        container.classList.remove('swipe-open');
      }
      startX = 0;
      startY = 0;
    });

    content.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      isSwiping = false;
      content.style.transition = 'none';
      deleteBtn.style.transition = 'none';
    });

    content.addEventListener('pointermove', (e) => {
      if (startX === 0) return;
      const diffX = e.clientX - startX;
      const diffY = e.clientY - startY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        isSwiping = true;
        try { content.setPointerCapture(e.pointerId); } catch(err){}
        if (diffX < 0) {
          let moveX = diffX;
          if (moveX < maxSwipe) {
            moveX = maxSwipe + (moveX - maxSwipe) * 0.2;
          }
          content.style.transform = `translateX(${moveX}px)`;
          deleteBtn.style.transform = `translateX(calc(100% + ${moveX}px))`;
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
        }
      }
    });

    content.addEventListener('pointerup', (e) => {
      try { content.releasePointerCapture(e.pointerId); } catch(err){}
      if (startX === 0) return;
      const changeX = e.clientX - startX;
      if (isSwiping) {
        content.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        deleteBtn.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

        if (changeX < -35) {
          content.style.transform = `translateX(${maxSwipe}px)`;
          deleteBtn.style.transform = `translateX(0px)`;
          container.classList.add('swipe-open');
        } else {
          content.style.transform = `translateX(0px)`;
          deleteBtn.style.transform = `translateX(100%)`;
          container.classList.remove('swipe-open');
        }
      }
      startX = 0;
      startY = 0;
    });

    content.addEventListener('pointercancel', (e) => {
      try { content.releasePointerCapture(e.pointerId); } catch(err){}
      content.style.transition = 'transform 0.2s ease';
      deleteBtn.style.transition = 'transform 0.2s ease';
      content.style.transform = 'translateX(0px)';
      deleteBtn.style.transform = 'translateX(100%)';
      container.classList.remove('swipe-open');
      startX = 0;
      startY = 0;
    });
  });
}

async function confirmDeleteTransaction(txId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  playClickSound();

  const trip = getActiveTrip();
  if (!trip) return;
  const tx = trip.transactions.find(t => t.id === txId);
  if (!tx) return;

  const ok = await showCustomConfirm(
    '🗑️ 刪除記帳項目',
    `確定要刪除 「${tx.desc || '未命名消費'}」 嗎？此操作將無法還原。`
  );

  if (ok) {
    trip.transactions = trip.transactions.filter(t => t.id !== txId);
    saveData();
    renderApp();
    showToast('🗑️ 交易已成功刪除');
  } else {
    const container = document.querySelector(`.ledger-swipe-container[data-tx-id="${txId}"]`);
    if (container) {
      const content = container.querySelector('.ledger-swipe-content');
      const deleteBtn = container.querySelector('.ledger-swipe-action-delete');
      if (content && deleteBtn) {
        content.style.transition = 'transform 0.2s ease';
        deleteBtn.style.transition = 'transform 0.2s ease';
        content.style.transform = 'translateX(0px)';
        deleteBtn.style.transform = 'translateX(100%)';
      }
      container.classList.remove('swipe-open');
    }
  }
}

// -------------------------------------------------------------
// Swipe to delete touch and pointer event gesture handlers for Trips removed.


// -------------------------------------------------------------
// Transaction Adding & Drawer Functionality

function showAddExpenseDrawer() {
  playClickSound();
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
  
  // Reset location & GPS
  const locNameInput = document.getElementById('drawer-loc-name');
  const locLatInput = document.getElementById('drawer-loc-lat');
  const locLngInput = document.getElementById('drawer-loc-lng');
  if (locNameInput) locNameInput.value = '';
  if (locLatInput) locLatInput.value = '';
  if (locLngInput) locLngInput.value = '';
  
  const gpsBtn = document.getElementById('btn-get-location');
  if (gpsBtn) {
    gpsBtn.innerHTML = `🎯 自動定位`;
    gpsBtn.disabled = false;
  }
  
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

// Quick amount add shortcut buttons
function quickAddAmount(amount) {
  playClickSound();
  if (navigator.vibrate) navigator.vibrate(12);
  
  const currentVal = parseFloat(keypadBuffer) || 0;
  const newVal = currentVal + amount;
  keypadBuffer = newVal.toString();
  
  document.getElementById('drawer-amt-foreign').value = keypadBuffer;
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
  
  const myIdentity = getMyIdentity(trip);
  
  // Payer select dropdown
  const payerSelect = document.getElementById('drawer-payer-select');
  payerSelect.innerHTML = `<option value="我">${myIdentity === '我' ? '我 (記帳發起人)' : '記帳發起人'}</option>` + 
    companions.map(c => `<option value="${c}">${c === myIdentity ? `${c} (我)` : c}</option>`).join('');
  
  // Auto-default the payer select to the current user's local identity
  payerSelect.value = myIdentity;

  // Checklist of companions who splits
  let checkHtml = `
    <div class="split-checkbox-row">
      <label class="split-checkbox-label">
        <input type="checkbox" class="split-checkbox-input" value="我" checked onchange="recalculateSplitShares()">
        ${myIdentity === '我' ? '我 (記帳發起人)' : '記帳發起人'}
      </label>
      <span id="split-share-我" style="font-size: 11px; color: var(--accent);">NT$ 0</span>
    </div>
  `;
  
  companions.forEach(c => {
    checkHtml += `
      <div class="split-checkbox-row">
        <label class="split-checkbox-label">
          <input type="checkbox" class="split-checkbox-input" value="${c}" checked onchange="recalculateSplitShares()">
          ${c === myIdentity ? `${c} (我)` : c}
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
  
  // Location Name & coordinates
  const locationName = document.getElementById('drawer-loc-name').value.trim();
  const latVal = document.getElementById('drawer-loc-lat').value.trim();
  const lngVal = document.getElementById('drawer-loc-lng').value.trim();
  const lat = latVal ? parseFloat(latVal) : null;
  const lng = lngVal ? parseFloat(lngVal) : null;
  
  // Category
  const activeCatEl = document.querySelector('.category-pill.active');
  const category = activeCatEl ? activeCatEl.dataset.category : 'others';
  
  // Payment method
  const activeMethodEl = document.querySelector('#method-toggle .toggle-option.active');
  let paymentMethod = activeMethodEl ? activeMethodEl.dataset.method : 'cash';
  
  // Multi-party Split calculation
  const myIdentity = getMyIdentity(trip);
  let payer = myIdentity;
  let splitWith = [myIdentity];
  
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
        locationName, lat, lng,
        updatedAt: Date.now()
      };
      showToast('✅ 交易修改成功！');
    }
  } else {
    // New transaction
    const newTx = {
      id: 'tx-' + Date.now(),
      date, amountForeign, amountBase, category, paymentMethod, desc, payer, splitWith,
      locationName, lat, lng,
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
  playClickSound();
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
  
  // Populate location & GPS
  document.getElementById('drawer-loc-name').value = tx.locationName || '';
  document.getElementById('drawer-loc-lat').value = (tx.lat !== undefined && tx.lat !== null) ? tx.lat : '';
  document.getElementById('drawer-loc-lng').value = (tx.lng !== undefined && tx.lng !== null) ? tx.lng : '';
  
  const gpsBtn = document.getElementById('btn-get-location');
  if (gpsBtn) {
    gpsBtn.innerHTML = `🎯 自動定位`;
    gpsBtn.disabled = false;
  }
  
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

async function removeCompanion(name) {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Confirm deletion safety check
  const isConfirmed = await showCustomConfirm(
    '確認移除旅伴',
    `確定要將旅伴 「${name}」 移出群組嗎？他所有的拆帳項目會被保留，但不能新增含有他的新項目。`
  );
  if (isConfirmed) {
    trip.companions = trip.companions.filter(c => c !== name);
    showToast(`🗑️ 已移除旅伴：${name}`);
    saveData();
    renderApp();
  }
}

// Get local user identity for the trip
function getMyIdentity(trip) {
  if (!trip) return '我';
  const savedIdentity = localStorage.getItem(`travel_trip_identity_${trip.id}`);
  return savedIdentity || '我';
}

// Set local user identity for the trip
function setMyIdentity(identity) {
  const trip = getActiveTrip();
  if (!trip) return;
  localStorage.setItem(`travel_trip_identity_${trip.id}`, identity);
  showToast(`👤 已將本機身份設為：${identity === '我' ? '我 (記帳發起人)' : identity}`);
  renderApp();
}

// Get payer display name relative to my identity
function getPayerDisplayName(payer, myIdentity) {
  if (payer === myIdentity) {
    return '我';
  }
  if (payer === '我') {
    return '記帳發起人';
  }
  return payer;
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

async function settleSplitDebt(debtor, creditor, amount) {
  playClickSound();
  const trip = getActiveTrip();
  if (!trip) return;

  const myIdentity = getMyIdentity(trip);

  const debtorDisp = debtor === myIdentity ? `${debtor} (我)` : debtor;
  const creditorDisp = creditor === myIdentity ? `${creditor} (我)` : creditor;

  const ok = await showCustomConfirm(
    '💵 旅伴債務結清',
    `確定要記錄這筆結清款項嗎？\n\n成員 「${debtorDisp}」 已支付給 「${creditorDisp}」 共計 ${Math.round(amount).toLocaleString()} ${trip.foreignCurrency} (約合 NT$ ${Math.round(amount * trip.exchangeRate).toLocaleString()})。\n\n系統將自動在帳本中新增一筆互補的記帳以扣抵此債務。`
  );

  if (!ok) return;

  const rate = trip.exchangeRate;
  const amountForeign = amount;
  const amountBase = Math.round(amount * rate);
  const date = getFormattedCurrentTime();

  const settlementTx = {
    id: 'tx-' + Date.now(),
    date,
    amountForeign,
    amountBase,
    category: 'others',
    paymentMethod: 'split',
    desc: `💵 拆帳結清：${debtor} 結清給 ${creditor}`,
    payer: debtor,
    splitWith: [creditor],
    updatedAt: Date.now()
  };

  trip.transactions.push(settlementTx);
  showToast('💵 債務已成功結清並記錄！');
  saveData();
  renderApp();
}

// -------------------------------------------------------------
// PWA Cash Wallet Withdrawals

async function showCashWithdrawalDrawer() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Prompt user for amount using native popup for simplicity and security
  const amountStr = await showCustomPrompt(
    '提領 / 儲備外幣現金',
    `這將增加您的錢包現金水位，可用於後續記帳選擇現金付款方式。`,
    `請輸入提領/兌換的 [${trip.foreignCurrency}] 金額`,
    ''
  );
  if (amountStr === null || amountStr === '') return;
  
  const amt = parseFloat(amountStr);
  if (isNaN(amt) || amt <= 0) {
    await showCustomConfirm('輸入無效', '❌ 請輸入大於 0 的有效數字金額！', true);
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

async function editTripSubmit() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const name = document.getElementById('edit-trip-name').value.trim();
  const foreignCurrency = document.getElementById('edit-trip-foreign').value.trim().toUpperCase();
  const exchangeRate = parseFloat(document.getElementById('edit-trip-rate').value) || trip.exchangeRate;
  const budget = parseFloat(document.getElementById('edit-trip-budget').value) || trip.budget;
  const startDate = document.getElementById('edit-trip-start').value;
  const endDate = document.getElementById('edit-trip-end').value;

  if (!name || !foreignCurrency) {
    await showCustomConfirm('輸入有誤', '❌ 請填寫完整的旅程名稱與外幣代號！', true);
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
    const isConfirmed = await showCustomConfirm(
      '匯率變更提示',
      `偵測到幣別或匯率已變更！\n是否要將現有所有外幣記帳明細，依新匯率 (${exchangeRate}) 重新計算折合台幣 (TWD) 的金額？\n\n(選擇「確定」會重新校正過往台幣金額；選擇「取消」則僅套用至之後的新增記帳)`
    );
    if (isConfirmed) {
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

async function createTripSubmit() {
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
    await showCustomConfirm('輸入有誤', '❌ 請填寫完整的旅程名稱與外幣代號！', true);
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
  // If there's an active swipe open, do not switch, just close it and return
  const openSwipe = document.querySelector('.swipe-container.swipe-open');
  if (openSwipe) {
    document.querySelectorAll('.swipe-container').forEach(el => {
      const content = el.querySelector('.swipe-content');
      const deleteBtn = el.querySelector('.swipe-action-delete');
      if (content && deleteBtn) {
        content.style.transition = 'transform 0.2s ease';
        deleteBtn.style.transition = 'transform 0.2s ease';
        content.style.transform = 'translateX(0px)';
        deleteBtn.style.transform = 'translateX(100%)';
      }
      el.classList.remove('swipe-open');
    });
    return;
  }
  
  activeTripId = tripId;
  saveData();
  renderApp();
  showToast('🗺️ 已切換旅程記帳本');
}

async function confirmDeleteTripById(tripId, event) {
  if (event) event.stopPropagation(); // Stop click bubbling to switchTrip
  
  const tripToDelete = trips.find(t => t.id === tripId);
  if (!tripToDelete) return;
  
  const isConfirmed = await showCustomConfirm(
    '刪除旅程確認',
    `🚨 警告！你即將永久刪除 「${tripToDelete.name}」 旅程記帳本。\n此動作將不可逆，所有消費明細與拆帳記錄都將消失！是否確認刪除？`
  );
  if (isConfirmed) {
    trips = trips.filter(t => t.id !== tripId);
    if (activeTripId === tripId) {
      if (trips.length > 0) {
        activeTripId = trips[0].id;
      } else {
        activeTripId = null;
      }
    }
    saveData();
    renderApp();
    showToast('🗑️ 旅程已成功刪除');
  } else {
    // Smoothly snap back swipe delete button
    const container = document.querySelector(`.swipe-container[data-trip-id="${tripId}"]`);
    if (container) {
      const content = container.querySelector('.swipe-content');
      const deleteBtn = container.querySelector('.swipe-action-delete');
      if (content && deleteBtn) {
        content.style.transition = 'transform 0.2s ease';
        deleteBtn.style.transition = 'transform 0.2s ease';
        content.style.transform = 'translateX(0px)';
        deleteBtn.style.transform = 'translateX(100%)';
      }
      container.classList.remove('swipe-open');
    }
  }
}

async function editExchangeRate() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const newRateStr = await showCustomPrompt(
    '修改鎖定匯率',
    `請輸入新的鎖定匯率：\n(1 ${trip.foreignCurrency} 等於多少 ${trip.baseCurrency})`,
    '外幣匯率',
    trip.exchangeRate
  );
  if (newRateStr === null || newRateStr === '') return;
  
  const rate = parseFloat(newRateStr);
  if (isNaN(rate) || rate <= 0) {
    await showCustomConfirm('輸入有誤', '❌ 請輸入大於 0 的有效數字匯率！', true);
    return;
  }
  
  trip.exchangeRate = rate;
  
  // Recalculate transaction base currency values based on new rate
  const isConfirmed = await showCustomConfirm(
    '重新計算台幣總額',
    '是否將已記帳的外幣項目，以新匯率重新計算台幣總額？\n(取消則僅影響之後記的新項目)'
  );
  if (isConfirmed) {
    trip.transactions.forEach(t => {
      t.amountBase = Math.round(t.amountForeign * rate);
    });
  }

  saveData();
  renderApp();
  showToast('💹 匯率修改成功！');
}

async function editTripBudget() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const newBudgetStr = await showCustomPrompt(
    '修改旅程預算',
    `請輸入此旅程的全新預算 (TWD)：`,
    '旅程預算 (TWD)',
    trip.budget
  );
  if (newBudgetStr === null || newBudgetStr === '') return;
  
  const budget = Math.round(parseFloat(newBudgetStr));
  if (isNaN(budget) || budget <= 0) {
    await showCustomConfirm('輸入有誤', '❌ 請輸入有效金額！', true);
    return;
  }
  
  trip.budget = budget;
  saveData();
  renderApp();
  showToast('💰 預算修改成功！');
}

async function confirmDeleteTrip() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const isConfirmed = await showCustomConfirm(
    '刪除旅程確認',
    `🚨 警告！你即將永久刪除 「${trip.name}」 旅程記帳本。\n此動作將不可逆，所有消費明細與拆帳記錄都將消失！是否確認刪除？`
  );
  if (isConfirmed) {
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

async function clearAllAppData() {
  const firstConfirm = await showCustomConfirm(
    '重設所有本機資料警告',
    "🚨 警告！你即將刪除此 APP 在這台裝置上的所有本機資料（包括所有旅程、所有消費明細與拆帳記錄）。\n此操作將不可逆！是否確認刪除？"
  );
  if (!firstConfirm) return;

  const secondConfirm = await showCustomConfirm(
    '徹底清除確認',
    "⚠️ 請再次確認！這會徹底清空這台裝置的本機快取與所有設定。\n若您沒有下載備份，資料將會永久消失。確定真的要刪除全部本機資料嗎？"
  );
  if (!secondConfirm) return;

  // Gather keys to delete
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('travel_')) {
      keysToRemove.push(key);
    }
  }

  // Perform deletion
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Initialize empty state correctly so next load or render won't inject default data
  localStorage.setItem('travel_trips', '[]');
  localStorage.removeItem('travel_active_trip_id');

  // Reset internal memory variables
  trips = [];
  activeTripId = null;

  // Switch back to dashboard view first
  switchView('dashboard');

  // Show a beautiful toast notification
  showToast('🚨 所有本機資料已成功刪除，帳本已重置！');
}

// -------------------------------------------------------------
// JSON and CSV Exports / Imports

// Data backup and migration viewer screen for mobile devices & desktop
// Data backup, migration and report viewer screen for mobile devices & desktop
function showReportViewer(title, content, fileType) {
  const overlay = document.getElementById('dialog-overlay');
  if (!overlay) return;
  
  const displayContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  window.lastBackupContent = displayContent;
  window.lastBackupTitle = title;
  
  if (fileType === 'csv') {
    const trip = getActiveTrip();
    const totalTx = trip ? trip.transactions.length : 0;
    const totalForeignSpent = trip ? trip.transactions.reduce((acc, t) => acc + t.amountForeign, 0) : 0;
    const totalBaseSpent = trip ? trip.transactions.reduce((acc, t) => acc + t.amountBase, 0) : 0;
    
    // Breakdown of cash vs card vs split spending
    const cashSpent = trip ? trip.transactions.filter(t => t.paymentMethod === 'cash').reduce((acc, t) => acc + t.amountBase, 0) : 0;
    const cardSpent = trip ? trip.transactions.filter(t => t.paymentMethod === 'card').reduce((acc, t) => acc + t.amountBase, 0) : 0;
    const splitSpent = trip ? trip.transactions.filter(t => t.paymentMethod === 'split').reduce((acc, t) => acc + t.amountBase, 0) : 0;
    const totalSpentBase = cashSpent + cardSpent + splitSpent;
    
    const cashPct = totalSpentBase > 0 ? Math.round(cashSpent / totalSpentBase * 100) : 0;
    const cardPct = totalSpentBase > 0 ? Math.round(cardSpent / totalSpentBase * 100) : 0;
    const splitPct = totalSpentBase > 0 ? Math.round(splitSpent / totalSpentBase * 100) : 0;

    overlay.innerHTML = `
      <div class="dialog report-viewer-dialog" onclick="event.stopPropagation()">
        <h3 class="dialog-title" style="font-size: 17px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span>📊 ${title}</span>
          <button onclick="closeDialog()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px;">&times;</button>
        </h3>
        <p class="dialog-desc" style="font-size: 11px; margin-bottom: 12px; line-height: 1.4;">
          您已成功生成消費記帳報表！您可在下方預覽並篩選明細項目，或直接點擊按鈕下載 CSV 試算表及複製內容。
        </p>
        
        <!-- Expense Summary Cards -->
        <div class="report-summary-box">
          <div class="report-summary-item">
            <span class="report-summary-label">📊 總明細筆數</span>
            <span class="report-summary-val" style="color: var(--secondary);"><span id="report-filtered-count">${totalTx}</span> 筆</span>
          </div>
          <div class="report-summary-item">
            <span class="report-summary-label">💰 外幣總支出</span>
            <span class="report-summary-val"><span id="report-filtered-fsum">${Math.round(totalForeignSpent).toLocaleString()}</span> <span style="font-size: 11px; color: var(--text-muted);">${trip ? trip.foreignCurrency : ''}</span></span>
          </div>
          <div class="report-summary-item">
            <span class="report-summary-label">💵 折合台幣總額</span>
            <span class="report-summary-val" style="color: var(--accent);">NT$ <span id="report-filtered-bsum">${Math.round(totalBaseSpent).toLocaleString()}</span></span>
          </div>
        </div>

        <!-- Payment methods bar in report -->
        <div style="display: flex; gap: 8px; font-size: 10px; color: var(--text-muted); margin-bottom: 12px; justify-content: space-around; background: rgba(255,255,255,0.01); padding: 8px; border-radius: 10px; border: 1px dashed var(--border-color);">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--secondary);"></div>
            <span>現金消費: <strong>${cashPct}%</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--accent);"></div>
            <span>信用卡: <strong>${cardPct}%</strong></span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #b37feb;"></div>
            <span>多人拆帳: <strong>${splitPct}%</strong></span>
          </div>
        </div>
        
        <!-- Live Search Field in Report -->
        <div class="report-search-bar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="report-search-input" placeholder="在報表中即時搜尋備註、分類、付款管道或日期..." oninput="filterReportViewerTable(this.value)">
        </div>

        <!-- Responsive scrollable table -->
        <div class="report-table-wrapper">
          <table class="report-table">
            <thead>
              <tr>
                <th>日期時間</th>
                <th>消費類別</th>
                <th>支付管道</th>
                <th>項目描述</th>
                <th class="text-right">外幣金額</th>
                <th class="text-right">折合台幣</th>
                <th>付款人</th>
                <th>分攤名單</th>
              </tr>
            </thead>
            <tbody id="report-table-body">
              <!-- Populated dynamically via initial filterReportViewerTable call -->
            </tbody>
          </table>
        </div>

        <!-- Collapsible raw CSV text area -->
        <div class="accordion-title" onclick="toggleRawReportData()">
          <span>📄 檢視原始 CSV 純文字資料 (供複製貼上)</span>
          <span id="accordion-arrow">▼</span>
        </div>
        <div id="raw-report-container" style="display: none; margin-top: 8px; margin-bottom: 12px; animation: fadeIn 0.2s ease;">
          <textarea id="backup-text-area" class="drawer-text-input" readonly style="height: 90px; font-family: monospace; font-size: 10px; line-height: 1.4; background-color: rgba(0,0,0,0.3); color: #a5a5cd; white-space: pre; overflow-x: auto; resize: none; border-radius: 10px; padding: 8px; width: 100%; box-sizing: border-box; border: 1px solid var(--border-color);">${displayContent}</textarea>
        </div>

        <!-- Dialogue Action Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
          <button class="btn-primary" onclick="copyBackupToClipboard()" style="height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--accent) 0%, #36cfc1 100%); color: var(--text-dark); border-radius: 12px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(54, 207, 201, 0.2);">
            📋 複製 CSV 報表
          </button>
          <button class="btn-primary" onclick="triggerFileDownload('${fileType}')" style="height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--primary) 0%, #ff7a45 100%); color: white; border-radius: 12px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 122, 69, 0.25);">
            💾 下載 CSV 檔案
          </button>
        </div>
        
        <button class="btn-secondary" onclick="closeDialog()" style="width: 100%; height: 38px; margin-top: 8px; border-color: rgba(255,255,255,0.06); color: var(--text-muted); border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer;">
          ✕ 關閉報表檢視
        </button>
      </div>
    `;
    
    // Initialize the report table with all transactions
    filterReportViewerTable('');
    
  } else {
    // JSON Backup view (Standard backup look)
    overlay.innerHTML = `
      <div class="dialog" onclick="event.stopPropagation()" style="max-width: 420px; width: 92%; box-sizing: border-box; padding: 20px;">
        <h3 class="dialog-title" style="font-size: 17px; margin-bottom: 6px;">${title} 📋</h3>
        <p class="dialog-desc" style="font-size: 12px; margin-bottom: 14px; line-height: 1.4;">
          您的 JSON 系統備份資料已成功生成。這包含您在此手機上登錄的所有旅程與記帳記錄。您可以下載備份檔或複製至其他手機進行還原。
        </p>
        
        <div class="form-group" style="margin-bottom: 14px;">
          <textarea id="backup-text-area" class="drawer-text-input" readonly style="height: 140px; font-family: monospace; font-size: 11px; line-height: 1.4; background-color: rgba(0,0,0,0.3); color: #a5a5cd; white-space: pre; overflow-x: auto; resize: none; border-radius: 12px; padding: 10px; width: 100%; box-sizing: border-box; border: 1px solid var(--border-color);">${displayContent}</textarea>
        </div>
        
        <div class="dialog-buttons" style="display: flex; flex-direction: column; gap: 8px; justify-content: stretch; align-items: stretch;">
          <button class="btn-primary" onclick="copyBackupToClipboard()" style="width: 100%; height: 42px; display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--accent) 0%, #36cfc1 100%); color: var(--text-dark); border-radius: 12px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(54, 207, 201, 0.2);">
            📋 複製 JSON 備份文字
          </button>
          <button class="btn-secondary" onclick="triggerFileDownload('${fileType}')" style="width: 100%; height: 42px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer;">
            💾 下載 JSON 備份檔案
          </button>
          <button class="btn-secondary" onclick="closeDialog()" style="width: 100%; height: 38px; margin-top: 4px; border-color: rgba(255,255,255,0.08); color: var(--text-muted); border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer;">
            關閉檢視視窗
          </button>
        </div>
      </div>
    `;
  }
  
  overlay.classList.add('active');
}

// Interactive filter for the report viewer table
function filterReportViewerTable(query) {
  const trip = getActiveTrip();
  if (!trip) return;
  
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;
  
  const q = query.toLowerCase().trim();
  let count = 0;
  let foreignSum = 0;
  let baseSum = 0;
  
  let html = '';
  
  trip.transactions.forEach(t => {
    const catName = CATEGORIES[t.category]?.name || '其他';
    const catIcon = CATEGORIES[t.category]?.icon || '❓';
    let payMethodStr = '現金';
    let payClass = 'cash';
    if (t.paymentMethod === 'card') {
      payMethodStr = '刷卡';
      payClass = 'card';
    } else if (t.paymentMethod === 'split') {
      payMethodStr = '多人拆帳';
      payClass = 'split';
    }
    
    const desc = t.desc || '';
    const payer = t.payer || '我';
    const splitWith = (t.splitWith || []).join(', ');
    
    // Check if matching search query
    const match = 
      desc.toLowerCase().includes(q) || 
      catName.toLowerCase().includes(q) || 
      payMethodStr.toLowerCase().includes(q) || 
      payer.toLowerCase().includes(q) ||
      t.date.toLowerCase().includes(q);
      
    if (q === '' || match) {
      count++;
      foreignSum += t.amountForeign;
      baseSum += t.amountBase;
      
      html += `
        <tr>
          <td><span class="report-cell-date">${t.date}</span></td>
          <td><span class="report-cell-cat">${catIcon} ${catName}</span></td>
          <td><span class="ledger-paymethod ${payClass}">${payMethodStr}</span></td>
          <td><span class="report-cell-desc">${desc || '—'}</span></td>
          <td class="report-cell-amt text-right">${t.amountForeign.toLocaleString()} ${trip.foreignCurrency}</td>
          <td class="report-cell-amt text-right" style="color: var(--accent);">NT$ ${t.amountBase.toLocaleString()}</td>
          <td><span class="report-cell-payer">${payer}</span></td>
          <td><span class="report-cell-split" title="${splitWith}">${splitWith || '無'}</span></td>
        </tr>
      `;
    }
  });
  
  tbody.innerHTML = html;
  
  // Update dynamic count and sum in preview
  const countEl = document.getElementById('report-filtered-count');
  const fSumEl = document.getElementById('report-filtered-fsum');
  const bSumEl = document.getElementById('report-filtered-bsum');
  
  if (countEl) countEl.innerText = count.toString();
  if (fSumEl) fSumEl.innerText = Math.round(foreignSum).toLocaleString();
  if (bSumEl) bSumEl.innerText = Math.round(baseSum).toLocaleString();
  
  if (count === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
          🔍 找不到符合「${query}」的記帳項目
        </td>
      </tr>
    `;
  }
}

// Toggle raw report data accordion
function toggleRawReportData() {
  const container = document.getElementById('raw-report-container');
  const arrow = document.getElementById('accordion-arrow');
  if (!container || !arrow) return;
  
  if (container.style.display === 'none') {
    container.style.display = 'block';
    arrow.innerText = '▲';
  } else {
    container.style.display = 'none';
    arrow.innerText = '▼';
  }
}

// Global helpers for backup window
window.copyBackupToClipboard = function() {
  const textarea = document.getElementById('backup-text-area');
  if (!textarea) return;
  
  textarea.select();
  textarea.setSelectionRange(0, 99999);
  
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(window.lastBackupContent).then(() => {
        showToast('📋 備份內容已成功複製！');
      }).catch(() => {
        document.execCommand('copy');
        showToast('📋 備份內容已成功複製！');
      });
    } else {
      document.execCommand('copy');
      showToast('📋 備份內容已成功複製！');
    }
  } catch (err) {
    showToast('❌ 複製失敗，請手動複製');
  }
};

window.triggerFileDownload = function(fileType) {
  try {
    const content = window.lastBackupContent;
    const dateStr = new Date().toISOString().split('T')[0];
    
    let blob, filename;
    if (fileType === 'json') {
      blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
      filename = `出國記帳備份_${dateStr}.json`;
    } else {
      blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const activeTrip = trips.find(t => t.id === activeTripId);
      const tripName = activeTrip ? activeTrip.name : '旅程';
      filename = `${tripName}_記帳明細_${dateStr}.csv`;
    }
    
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    setTimeout(() => {
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);
    }, 100);
    
    showToast('💾 備份檔案下載已觸發！');
  } catch (err) {
    showToast('❌ 下載失敗，請使用複製功能');
  }
};

// 直接在 App 內預覽資料的全新檢視器
function showDataPreviewViewer(type) {
  if (type === 'csv') {
    // CSV 模式：觸發互動式報表檢視器
    const trip = getActiveTrip();
    if (!trip) {
      showToast('⚠️ 目前沒有使用中的旅程');
      return;
    }
    
    let csvContent = "\ufeff";
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
    
    showReportViewer(`${trip.name} 記帳明細`, csvContent, 'csv');
    return;
  }
  
  // JSON 模式：以精美的樹狀卡片方式呈現所有旅程與帳目資料
  const overlay = document.getElementById('dialog-overlay');
  if (!overlay) return;
  
  let tripsHtml = '';
  
  if (trips.length === 0) {
    tripsHtml = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
        <p>目前沒有任何旅程資料。</p>
      </div>
    `;
  } else {
    trips.forEach((trip, idx) => {
      const isCurrent = trip.id === activeTripId;
      const txCount = trip.transactions ? trip.transactions.length : 0;
      const totalF = trip.transactions ? trip.transactions.reduce((a, t) => a + t.amountForeign, 0) : 0;
      const totalB = trip.transactions ? trip.transactions.reduce((a, t) => a + t.amountBase, 0) : 0;
      const companions = trip.companions || [];
      const withdrawals = trip.cashWithdrawals || [];
      
      tripsHtml += `
        <div class="data-preview-trip-card ${isCurrent ? 'current' : ''}">
          <div class="data-preview-trip-header">
            <span class="data-preview-trip-name">${isCurrent ? '🔸 ' : ''}${trip.name}</span>
            ${isCurrent ? '<span class="data-preview-badge-current">使用中</span>' : ''}
          </div>
          <div class="data-preview-meta-grid">
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">幣別</span>
              <span class="data-preview-meta-val">${trip.foreignCurrency} → ${trip.baseCurrency}</span>
            </div>
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">匯率</span>
              <span class="data-preview-meta-val">1:${trip.exchangeRate}</span>
            </div>
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">預算</span>
              <span class="data-preview-meta-val">NT$ ${(trip.budget || 0).toLocaleString()}</span>
            </div>
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">旅伴</span>
              <span class="data-preview-meta-val">${companions.length > 0 ? companions.join(', ') : '無'}</span>
            </div>
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">日期</span>
              <span class="data-preview-meta-val">${trip.startDate || '—'} ~ ${trip.endDate || '—'}</span>
            </div>
            <div class="data-preview-meta-item">
              <span class="data-preview-meta-label">提領</span>
              <span class="data-preview-meta-val">${withdrawals.length} 筆</span>
            </div>
          </div>
          
          <div class="data-preview-stats-row">
            <div class="data-preview-stat">
              <span class="data-preview-stat-num" style="color: var(--secondary);">${txCount}</span>
              <span class="data-preview-stat-label">消費筆數</span>
            </div>
            <div class="data-preview-stat">
              <span class="data-preview-stat-num">${Math.round(totalF).toLocaleString()} <small>${trip.foreignCurrency}</small></span>
              <span class="data-preview-stat-label">外幣總支出</span>
            </div>
            <div class="data-preview-stat">
              <span class="data-preview-stat-num" style="color: var(--accent);">NT$ ${Math.round(totalB).toLocaleString()}</span>
              <span class="data-preview-stat-label">折合台幣</span>
            </div>
          </div>
          
          ${txCount > 0 ? `
            <div class="data-preview-tx-list">
              <div class="data-preview-tx-title">📝 消費紀錄明細 (${txCount} 筆)</div>
              ${trip.transactions.map((t, tIdx) => {
                const catInfo = CATEGORIES[t.category] || CATEGORIES.others;
                let payStr = '💵 現金';
                if (t.paymentMethod === 'card') payStr = '💳 刷卡';
                if (t.paymentMethod === 'split') payStr = '👥 拆帳';
                return `
                  <div class="data-preview-tx-row">
                    <span class="data-preview-tx-idx">${tIdx + 1}</span>
                    <span class="data-preview-tx-icon">${catInfo.icon}</span>
                    <div class="data-preview-tx-info">
                      <div class="data-preview-tx-desc">${t.desc || '（無備註）'}</div>
                      <div class="data-preview-tx-sub">${t.date} · ${payStr} · ${t.payer || '我'}付</div>
                    </div>
                    <div class="data-preview-tx-amt">
                      <div>${t.amountForeign.toLocaleString()} ${trip.foreignCurrency}</div>
                      <div style="font-size: 10px; color: var(--text-muted);">NT$ ${t.amountBase.toLocaleString()}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 12px;">尚無消費記錄</div>
          `}

          ${withdrawals.length > 0 ? `
            <div class="data-preview-tx-list" style="margin-top: 10px;">
              <div class="data-preview-tx-title">💸 外幣提領紀錄 (${withdrawals.length} 筆)</div>
              ${withdrawals.map((w, wIdx) => `
                <div class="data-preview-tx-row">
                  <span class="data-preview-tx-idx">${wIdx + 1}</span>
                  <span class="data-preview-tx-icon">🏧</span>
                  <div class="data-preview-tx-info">
                    <div class="data-preview-tx-desc">提領外幣現金</div>
                    <div class="data-preview-tx-sub">${w.date} · 匯率 ${w.rate}</div>
                  </div>
                  <div class="data-preview-tx-amt">
                    <div style="color: var(--success);">+${w.amountForeign.toLocaleString()} ${trip.foreignCurrency}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });
  }
  
  overlay.innerHTML = `
    <div class="dialog report-viewer-dialog" onclick="event.stopPropagation()" style="max-height: 90vh;">
      <h3 class="dialog-title" style="font-size: 17px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <span>📋 完整資料檢視器</span>
        <button onclick="closeDialog()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 20px; padding: 4px;">&times;</button>
      </h3>
      <p class="dialog-desc" style="font-size: 11px; margin-bottom: 12px; line-height: 1.4; color: var(--text-muted);">
        以下列出本裝置上所有旅程與記帳數據 (共 ${trips.length} 個旅程)。您可以直接在此檢視每筆消費的完整資訊。
      </p>
      
      <div class="data-preview-scroll-area">
        ${tripsHtml}
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
        <button class="btn-primary" onclick="exportTripJSON()" style="height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--accent) 0%, #36cfc1 100%); color: var(--text-dark); border-radius: 12px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(54, 207, 201, 0.2);">
          💾 下載 JSON 備份
        </button>
        <button class="btn-primary" onclick="exportTripCSV()" style="height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--primary) 0%, #ff7a45 100%); color: white; border-radius: 12px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(255, 122, 69, 0.25);">
          💾 下載 CSV 檔案
        </button>
      </div>
      
      <button class="btn-secondary" onclick="closeDialog()" style="width: 100%; height: 38px; margin-top: 8px; border-color: rgba(255,255,255,0.06); color: var(--text-muted); border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer;">
        ✕ 關閉檢視器
      </button>
    </div>
  `;
  
  overlay.classList.add('active');
}

function exportTripJSON() {
  const content = JSON.stringify(trips, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const filename = `出國記帳備份_${dateStr}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  showToast('💾 JSON 備份檔案已下載！');
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
  
  const dateStr = new Date().toISOString().split('T')[0];
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${trip.name}_記帳明細_${dateStr}.csv`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  showToast('💾 CSV 試算表已下載！');
}

function importTripJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        const isConfirmed = await showCustomConfirm(
          '備份還原合併確認',
          '是否將匯入的旅程合併至您現有的記帳本中？\n(選擇「取消」將會覆蓋您目前的全部帳目喔！)'
        );
        if (isConfirmed) {
          trips = [...trips, ...imported];
        } else {
          trips = imported;
        }
        if (trips.length > 0) activeTripId = trips[0].id;
        saveData();
        renderApp();
        showToast('📥 備份還原成功！');
      } else {
        await showCustomConfirm('格式錯誤', '❌ 檔案格式錯誤，必須為旅程 JSON 陣列！', true);
      }
    } catch (err) {
      await showCustomConfirm('讀取失敗', '❌ 無法讀取此檔案，請確認 JSON 格式是否正確！', true);
    }
  };
  reader.readAsText(file);
}

// -------------------------------------------------------------
// Interactive Helpers & Event Listeners setup

// Global Web Audio click sound synthesizer
let audioCtx = null;
function playClickSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    // Organic wooden haptic click sweep (extremely short, mimicking mobile haptic engine)
    osc.frequency.setValueAtTime(2200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.015);
    
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime); // Subtle volume
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.015);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.015);
  } catch (e) {
    console.log('AudioContext haptic click error:', e);
  }
}

// Global Web Audio achievement level-up sound synthesizer
function playUnlockSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const now = audioCtx.currentTime;
    
    // Play a lovely 8-bit retro coin-like double chime: Note 1 (E6) -> Note 2 (B6)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(987.77, now); // B5 (987.77Hz)
    osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6 (1318.51Hz)
    
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.setValueAtTime(0.04, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(now + 0.35);
  } catch (e) {
    console.log('AudioContext achievement sound error:', e);
  }
}

// Promise-based Custom Premium Confirm Dialog Modal
function showCustomConfirm(title, desc, isAlert = false) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-confirm-overlay');
    const titleEl = document.getElementById('custom-confirm-title');
    const descEl = document.getElementById('custom-confirm-desc');
    const cancelBtn = document.getElementById('btn-confirm-cancel');
    const okBtn = document.getElementById('btn-confirm-ok');
    
    titleEl.innerText = title;
    descEl.innerText = desc;
    
    if (isAlert) {
      cancelBtn.style.display = 'none';
    } else {
      cancelBtn.style.display = '';
    }
    
    overlay.classList.add('active');
    
    function cleanUp() {
      overlay.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
    }
    
    function onCancel() {
      playClickSound();
      cleanUp();
      resolve(false);
    }
    
    function onOk() {
      playClickSound();
      cleanUp();
      resolve(true);
    }
    
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
  });
}

// Promise-based Custom Premium Prompt Dialog Drawer
function showCustomPrompt(title, desc, label, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.getElementById('custom-prompt-overlay');
    const titleEl = document.getElementById('custom-prompt-title');
    const descEl = document.getElementById('custom-prompt-desc');
    const labelEl = document.getElementById('custom-prompt-label');
    const inputEl = document.getElementById('custom-prompt-input');
    const cancelBtn = document.getElementById('btn-prompt-cancel');
    const okBtn = document.getElementById('btn-prompt-ok');
    
    titleEl.innerText = title;
    descEl.innerText = desc;
    labelEl.innerText = label;
    inputEl.value = defaultValue;
    
    overlay.classList.add('active');
    
    // Focus input on load for immediate typing
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 150);
    
    function cleanUp() {
      overlay.classList.remove('active');
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
    }
    
    function onCancel() {
      playClickSound();
      cleanUp();
      resolve(null);
    }
    
    function onOk() {
      playClickSound();
      const val = inputEl.value.trim();
      cleanUp();
      resolve(val);
    }
    
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
    
    // Allow pressing Enter key to submit
    inputEl.addEventListener('keydown', function onEnter(e) {
      if (e.key === 'Enter') {
        inputEl.removeEventListener('keydown', onEnter);
        onOk();
      }
    });
  });
}

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
      playClickSound();
      document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Payment method selection inside drawer
  document.querySelectorAll('#method-toggle .toggle-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      playClickSound();
      document.querySelectorAll('#method-toggle .toggle-option').forEach(el => el.classList.remove('active'));
      const activeOpt = e.currentTarget;
      activeOpt.classList.add('active');
      
      const method = activeOpt.dataset.method;
      toggleSplitSection(method === 'split');
    });
  });

  // =====================================================
  // 自訂鍵盤觸控最終修正版 v3.3
  // =====================================================
  // 核心原理：
  // 1. 不再使用 touchstart + preventDefault（它會阻斷原生滾動與震動 API）
  // 2. CSS 已設定 touch-action: manipulation，消除 300ms click 延遲
  // 3. 使用 click 事件觸發全部操作（click 是最可靠的 User Activation，能觸發震動）
  // 4. 使用 pointerdown/up 做即時視覺回饋（不呼叫 preventDefault，不阻斷滾動）
  // 5. 鍵盤容器允許垂直滑動（touch-action: pan-y），解決無法向下捲動的問題
  // =====================================================

  // 讓鍵盤容器允許垂直滑動穿透
  const keypadContainer = document.querySelector('.keypad-container');
  if (keypadContainer) {
    keypadContainer.style.touchAction = 'pan-y';
  }

  document.querySelectorAll('.keypad-btn').forEach(btn => {
    const val = btn.dataset.val;
    let startX = 0;
    let startY = 0;
    let isMoving = false;

    // 視覺回饋：pointerdown 即時高亮（不阻斷預設行為，不阻斷滾動）
    btn.addEventListener('pointerdown', (e) => {
      btn.classList.add('active-flash');
      startX = e.clientX;
      startY = e.clientY;
      isMoving = false;
    });

    btn.addEventListener('pointermove', (e) => {
      if (startX === 0 && startY === 0) return;
      const diffX = Math.abs(e.clientX - startX);
      const diffY = Math.abs(e.clientY - startY);
      // 如果滑動距離大於 10px，則判定為滑動
      if (diffX > 10 || diffY > 10) {
        isMoving = true;
        btn.classList.remove('active-flash');
      }
    });

    btn.addEventListener('pointerup', () => {
      btn.classList.remove('active-flash');
      startX = 0;
      startY = 0;
    });
    btn.addEventListener('pointercancel', () => {
      btn.classList.remove('active-flash');
      startX = 0;
      startY = 0;
    });
    btn.addEventListener('pointerleave', () => {
      btn.classList.remove('active-flash');
      startX = 0;
      startY = 0;
    });

    // 核心操作：click 觸發全部邏輯（音效 + 按鍵輸入）
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // 如果判定為滑動，則略過點擊（防止誤觸數字）
      if (isMoving) {
        isMoving = false;
        return;
      }

      // 1. 機械式音效（所有裝置通用）
      playClickSound();

      // 2. 觸覺震動回饋（支援的裝置）
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }

      // 3. 按鍵輸入處理
      if (val === 'save') {
        saveTransaction();
      } else {
        keypadTap(val);
      }
    });
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
// Transaction Deletion

async function deleteTransactionFromDrawer() {
  const trip = getActiveTrip();
  if (!trip || !editingTransactionId) return;
  
  const isConfirmed = await showCustomConfirm(
    '刪除記帳確認',
    '⚠️ 確定要刪除這筆記帳紀錄嗎？此動作將無法復原。'
  );
  if (isConfirmed) {
    trip.transactions = trip.transactions.filter(t => t.id !== editingTransactionId);
    
    saveData();
    closeDrawer();
    renderApp();
    showToast('🗑️ 已成功刪除該筆消費');
  }
}

// -------------------------------------------------------------
// 🌐 旅遊地圖軌跡與消費地點可視化功能 (Map & GPS Feature)
// -------------------------------------------------------------

// Global references for map objects
window.travelMap = null;
window.travelMarkers = {};
window.travelPolyline = null;

// HTML5 Geolocation API capture current coordinates
function getCurrentGPSLocation() {
  const btn = document.getElementById('btn-get-location');
  if (!navigator.geolocation) {
    showToast('❌ 您的瀏覽器不支援 Geolocation 定位');
    return;
  }
  
  btn.innerHTML = `🌀 定位中...`;
  btn.disabled = true;
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      document.getElementById('drawer-loc-lat').value = lat.toFixed(6);
      document.getElementById('drawer-loc-lng').value = lng.toFixed(6);
      btn.innerHTML = `✅ 定位成功`;
      btn.disabled = false;
      showToast('🎯 GPS 定位獲取成功！');
      
      // Reset button after 3 seconds
      setTimeout(() => {
        btn.innerHTML = `🎯 自動定位`;
      }, 3000);
    },
    (error) => {
      console.error(error);
      let errMsg = '定位失敗，請手動輸入';
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = '未授權定位權限，請手動輸入';
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        errMsg = '定位訊號不足，請手動輸入';
      }
      btn.innerHTML = `❌ 定位失敗`;
      btn.disabled = false;
      showToast('⚠️ ' + errMsg);
      
      setTimeout(() => {
        btn.innerHTML = `🎯 自動定位`;
      }, 3000);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Inject realistic Tokyo landmark coordinates into current active trip transactions
function injectDemoCoordinates() {
  const trip = getActiveTrip();
  if (!trip) return;
  
  // Define realistic coordinates mapping based on transaction description keywords or index
  const landmarkCoords = [
    { desc: '一蘭拉麵', name: '一蘭拉麵 新宿東口店', lat: 35.6909, lng: 139.7003 },
    { desc: '東京鐵塔', name: '東京鐵塔展望台', lat: 35.6586, lng: 139.7454 },
    { desc: '藥妝店', name: '松本清 新宿三丁目店', lat: 35.6917, lng: 139.7015 },
    { desc: '新宿歌舞伎町', name: '新宿格拉斯麗酒店', lat: 35.6938, lng: 139.7035 },
    { desc: 'Skyliner', name: '京成成田機場站', lat: 35.7720, lng: 140.3929 },
    { desc: '築地市場', name: '築地青空三代目壽司', lat: 35.6655, lng: 139.7702 },
    { desc: '淺草雷門', name: '淺草寺雷門', lat: 35.7110, lng: 139.7967 }
  ];

  let injectedCount = 0;
  
  trip.transactions.forEach((t, i) => {
    // Try to find a match by keyword
    let match = landmarkCoords.find(item => t.desc.includes(item.desc));
    if (!match) {
      // If no keyword match, distribute them around Tokyo sequentially
      const backupSpots = [
        { name: '澀谷十字路口', lat: 35.6595, lng: 139.7005 },
        { name: '明治神宮', lat: 35.6764, lng: 139.6993 },
        { name: '上野恩賜公園', lat: 35.7142, lng: 139.7732 },
        { name: '銀座三越', lat: 35.6717, lng: 139.7650 },
        { name: '秋葉原電器街', lat: 35.6983, lng: 139.7730 }
      ];
      match = backupSpots[i % backupSpots.length];
    }
    
    t.locationName = match.name;
    t.lat = match.lat;
    t.lng = match.lng;
    injectedCount++;
  });
  
  saveData();
  renderMap();
  showToast(`🪄 已成功為 ${injectedCount} 筆交易載入東京範例地圖軌跡！`);
}

// Render travel map route paths and visual timeline components
// Render travel map route paths and visual timeline components
function renderMap() {
  const trip = getActiveTrip();
  const mapContainer = document.getElementById('view-map');
  if (!mapContainer) return;

  if (!trip) {
    mapContainer.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>
        <h3>開始您的旅程地圖</h3>
        <p style="margin-top: 8px; margin-bottom: 20px;">目前沒有任何使用中的旅程。請先在設定中切換或建立旅程！</p>
      </div>
    `;
    return;
  }

  // Double Mode Tabs
  window.activeMapSubTab = window.activeMapSubTab || 'route';
  window.watchPositionId = window.watchPositionId || null;
  window.exploreSimInterval = window.exploreSimInterval || null;

  let html = `
    <!-- Sub-tabs for Map Modes -->
    <div class="map-sub-tabs">
      <button class="map-sub-tab tab-route ${window.activeMapSubTab === 'route' ? 'active' : ''}" onclick="switchMapSubTab('route')">
        🗺️ 消費足跡軌跡
      </button>
      <button class="map-sub-tab tab-explore ${window.activeMapSubTab === 'explore' ? 'active' : ''}" onclick="switchMapSubTab('explore')">
        🎮 生活與探索開圖
      </button>
    </div>
  `;

  const locTransactions = trip.transactions
    .filter(t => t.lat !== undefined && t.lat !== null && t.lng !== undefined && t.lng !== null)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // chronological order

  const hasCoords = locTransactions.length > 0;

  if (window.activeMapSubTab === 'route') {
    // Mode 1: Expense Route
    if (!hasCoords) {
      mapContainer.innerHTML = html + `
        <div class="empty-state" style="padding: 40px 16px;">
          <div style="font-size: 50px; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(255, 122, 69, 0.4)); animation: pulse 2s infinite;">🗺️</div>
          <h3 style="font-family: var(--font-title); font-size: 18px; color: var(--secondary); margin-bottom: 8px;">未有地圖軌跡數據</h3>
          <p style="margin-bottom: 24px; font-size: 13px; color: var(--text-muted); line-height: 1.5; max-width: 320px;">
            本旅程尚未記錄任何包含經緯度座標的交易花費！<br><br>
            您可以在記帳時點擊 <b>「🎯 自動定位」</b> 獲取當前 GPS 位置，或是點擊下方按鈕一鍵為您現有的交易<b>注入逼真的東京知名地標軌跡</b>，立即體驗地圖魅力！
          </p>
          <button class="btn-primary" onclick="injectDemoCoordinates()" style="background: linear-gradient(135deg, var(--primary) 0%, #ff4d4f 100%); border: none; font-weight: bold; border-radius: 14px; padding: 12px 24px; width: 100%; max-width: 280px; box-shadow: 0 4px 15px rgba(255, 122, 69, 0.4); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            🪄 點我自動載入範例地圖軌跡
          </button>
        </div>
      `;
      return;
    }

    // Calculate Map Stats
    const totalSpots = locTransactions.length;
    const mapSpentBase = locTransactions.reduce((acc, t) => acc + t.amountBase, 0);
    const mapSpentForeign = locTransactions.reduce((acc, t) => acc + t.amountForeign, 0);

    html += `
      <!-- Map Dashboard Header -->
      <div class="card" style="background: linear-gradient(145deg, #1b1b2f 0%, #11111d 100%); margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-family: var(--font-title); font-size: 14px; font-weight: 700; color: var(--secondary);">🗺️ 旅遊軌跡看板</span>
          <button onclick="injectDemoCoordinates()" style="background: rgba(255, 255, 255, 0.04); border: 1px dashed var(--accent); color: var(--accent); font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 8px; cursor: pointer;">
            🪄 重新載入範例
          </button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; margin-bottom: 10px;">
          <div style="background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">📍 踏足足跡點</div>
            <div style="font-family: var(--font-title); font-size: 18px; font-weight: 800; color: var(--text-main);">${totalSpots} 處</div>
          </div>
          <div style="background: rgba(255,255,255,0.02); padding: 8px 12px; border-radius: 12px; border: 1px solid var(--border-color);">
            <div style="font-size: 9px; color: var(--text-muted); margin-bottom: 2px;">💰 地圖累計支出</div>
            <div style="font-family: var(--font-title); font-size: 15px; font-weight: 800; color: var(--primary);">
              ${Math.round(mapSpentForeign).toLocaleString()} <small style="font-size: 10px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</small>
              <div style="font-size: 9px; color: var(--text-muted); font-weight: normal; margin-top: 1px;">≈ NT$ ${Math.round(mapSpentBase).toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <button id="btn-play-playback" class="btn-primary" onclick="playRouteAnimation()" style="width: 100%; height: 38px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, var(--accent) 0%, #1890ff 100%); color: var(--text-dark); border-radius: 12px; font-weight: 700; font-size: 12px; border: none; cursor: pointer; box-shadow: 0 4px 10px rgba(54, 207, 201, 0.2);">
          ▶️ 播放旅程足跡動畫
        </button>
      </div>

      <!-- Leaflet Map Container -->
      <div id="travel-leaflet-map" style="width: 100%; height: 340px; border-radius: 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); margin-bottom: 16px; overflow: hidden; position: relative;"></div>

      <!-- Timeline header -->
      <div class="ledger-header" style="margin-bottom: 10px;">
        <h2 class="ledger-title" style="font-size: 15px;">📍 足跡時空時間軸</h2>
      </div>

      <!-- Timeline spots list -->
      <div class="timeline-spots-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
    `;

    locTransactions.forEach((t, i) => {
      const cat = CATEGORIES[t.category] || CATEGORIES.others;
      const isFirst = i === 0;
      const isLast = i === totalSpots - 1;
      
      let neonColor = 'var(--primary)';
      if (t.category === 'food') neonColor = '#ff7a45';
      else if (t.category === 'transport') neonColor = '#2490ff';
      else if (t.category === 'lodging') neonColor = '#b37feb';
      else if (t.category === 'shopping') neonColor = '#ff85c0';
      else if (t.category === 'play') neonColor = '#36cfc9';
      else if (t.category === 'flight') neonColor = '#ffd666';
      else if (t.category === 'souvenir') neonColor = '#ff4d4f';
      else if (t.category === 'fee') neonColor = '#52c41a';

      html += `
        <div class="timeline-spot-item" onclick="focusOnMapSpot(${t.lat}, ${t.lng}, '${t.id}')" style="background-color: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer; position: relative; overflow: hidden;">
          <div style="position: absolute; left: 24px; top: ${isFirst ? '50%' : '0'}; bottom: ${isLast ? '50%' : '0'}; width: 2px; background: rgba(255,255,255,0.06); z-index: 1;"></div>
          
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #0d0d15; border: 2px solid ${neonColor}; box-shadow: 0 0 6px ${neonColor}; display: flex; align-items: center; justify-content: center; z-index: 2; font-family: monospace; font-size: 10px; font-weight: bold; color: var(--text-main);">
            ${i + 1}
          </div>
          
          <div class="ledger-icon-box ${cat.class}" style="width: 32px; height: 32px; border-radius: 10px; font-size: 16px; z-index: 2;">
            ${cat.icon}
          </div>
          
          <div style="flex: 1; min-width: 0; z-index: 2;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${t.locationName || t.desc}
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${t.date} · ${t.desc || '無備註'}
            </div>
          </div>
          
          <div style="text-align: right; z-index: 2;">
            <div style="font-family: var(--font-title); font-size: 13px; font-weight: 700; color: var(--text-main);">
              ${Math.round(t.amountForeign).toLocaleString()} <span style="font-size: 10px; font-weight: 500; color: var(--text-muted);">${trip.foreignCurrency}</span>
            </div>
            <div style="font-size: 9px; color: var(--text-muted); margin-top: 1px;">
              NT$ ${Math.round(t.amountBase).toLocaleString()}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
  } else {
    // Mode 2: Life Exploration fog grids
    const unlockCount = Object.keys(trip.unlockedGrids || {}).length;
    const explorerLevel = getExplorerLevelName(unlockCount);
    const totalDist = calculateLiveTrackDistance(trip.liveTrack || []);

    html += `
      <!-- Explore Stats Dashboard -->
      <div class="card" style="background: linear-gradient(145deg, #0d0f1b 0%, #080911 100%); margin-bottom: 12px; border: 1px solid rgba(54, 207, 201, 0.15); box-shadow: 0 4px 15px rgba(54, 207, 201, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-family: var(--font-title); font-size: 14px; font-weight: 700; color: var(--accent);">📡 生活探索迷霧開圖</span>
          <span id="explore-lvl-badge" class="explorer-level-badge">${explorerLevel}</span>
        </div>
        
        <div class="explorer-stats-box">
          <div class="explorer-stats-card highlight">
            <div class="explorer-stats-label">🔓 解鎖區域 (網格)</div>
            <div id="explore-grids-count" class="explorer-stats-val accent">${unlockCount} 個</div>
          </div>
          <div class="explorer-stats-card">
            <div class="explorer-stats-label">🏃 累積移動距離</div>
            <div class="explorer-stats-val">${totalDist.toFixed(2)} km</div>
          </div>
          <div class="explorer-stats-card">
            <div class="explorer-stats-label">🗺️ 探索開圖程度</div>
            <div class="explorer-stats-val">${Math.min(100, Math.round(unlockCount / 50 * 100))}%</div>
          </div>
        </div>
        
        <!-- Action Control Buttons -->
        <div class="explore-action-row">
          <button class="btn-explore-toggle ${window.watchPositionId ? 'active' : ''}" onclick="toggleLiveTracking()">
            ${window.watchPositionId ? '<span class="radar-pulse-dot"><span class="radar-pulse-ring"></span></span> 📡 追蹤中...' : '📡 啟動實時追蹤'}
          </button>
        </div>
      </div>

      <!-- Leaflet Map Container -->
      <div id="travel-leaflet-map" style="width: 100%; height: 340px; border-radius: 20px; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); margin-bottom: 16px; overflow: hidden; position: relative;"></div>

      <!-- Timeline header -->
      <div class="ledger-header" style="margin-bottom: 10px;">
        <h2 class="ledger-title" style="font-size: 15px;">🎮 網格開圖歷史足跡</h2>
      </div>

      <!-- Timeline spots list -->
      <div class="timeline-spots-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
    `;

    const unlockedList = Object.values(trip.unlockedGrids || {}).sort((a, b) => new Date(b.time) - new Date(a.time));
    if (unlockedList.length === 0) {
      html += `
        <div style="text-align: center; padding: 40px 16px; color: var(--text-muted); font-size: 12.5px; border: 1px dashed var(--border-color); border-radius: 18px; background: rgba(255,255,255,0.01);">
          🧭 尚未有任何生活開圖區域網格！<br><br>
          請開啟下方的「<b>📡 啟動實時追蹤</b>」按鈕，隨身散步即可實時開圖！
        </div>
      `;
    } else {
      unlockedList.forEach((grid) => {
        html += `
          <div class="timeline-spot-item" onclick="focusOnExploreGrid(${grid.latCenter}, ${grid.lngCenter})" style="background-color: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; cursor: pointer;">
            <div class="ledger-icon-box cat-transport" style="width: 32px; height: 32px; border-radius: 10px; font-size: 16px;">
              🧭
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 12px; font-weight: 700; color: var(--text-main);">
                解鎖未知區域網格 [${grid.latGrid}, ${grid.lngGrid}]
              </div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                解鎖時間: ${grid.time} · 中心地點: ${grid.latCenter.toFixed(4)}, ${grid.lngCenter.toFixed(4)}
              </div>
            </div>
            <div style="font-size: 10px; color: var(--accent); font-weight: bold;">
              🔓 已開圖
            </div>
          </div>
        `;
      });
    }

    html += `</div>`;
  }

  mapContainer.innerHTML = html;

  // Initialize the Leaflet map asynchronously
  setTimeout(() => {
    initLeafletMap(locTransactions);
  }, 100);
}

// Tab switcher for map modes
function switchMapSubTab(tabName) {
  playClickSound();
  window.activeMapSubTab = tabName;
  
  // Clear simulated walking interval when switching modes
  if (window.exploreSimInterval) {
    clearInterval(window.exploreSimInterval);
    window.exploreSimInterval = null;
  }
  
  // Clear mock line layer reference
  window.exploreLivePolyline = null;
  window.currentLocationMarker = null;

  renderMap();
}

// Mount and initialize Leaflet map
function initLeafletMap(locTransactions) {
  if (window.travelMap) {
    try {
      window.travelMap.off();
      window.travelMap.remove();
    } catch (e) {
      console.error("Error removing old map instance:", e);
    }
    window.travelMap = null;
  }

  window.travelMarkers = {};
  window.travelPolyline = null;

  const mapDiv = document.getElementById('travel-leaflet-map');
  if (!mapDiv) return;

  const firstTx = locTransactions[0];
  const centerLat = firstTx ? firstTx.lat : 35.6762;
  const centerLng = firstTx ? firstTx.lng : 139.6503;

  window.travelMap = L.map('travel-leaflet-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([centerLat, centerLng], 12);

  // CartoDB Dark Matter tile layer
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(window.travelMap);

  // Check sub tab mode
  if (window.activeMapSubTab === 'explore') {
    const trip = getActiveTrip();
    if (!trip) return;

    // 1. Draw all unlocked grid rectangles on map
    if (trip.unlockedGrids) {
      Object.values(trip.unlockedGrids).forEach(grid => {
        const bounds = [
          [grid.latGrid * 0.002, grid.lngGrid * 0.002],
          [(grid.latGrid + 1) * 0.002, (grid.lngGrid + 1) * 0.002]
        ];
        L.rectangle(bounds, {
          color: '#36cfc9',
          weight: 1,
          fillColor: '#36cfc9',
          fillOpacity: 0.18,
          className: 'leaflet-unlocked-grid-rect'
        }).addTo(window.travelMap);
      });
    }

    // 2. Draw live tracking polyline and current location
    if (trip.liveTrack && trip.liveTrack.length > 0) {
      const fullPath = trip.liveTrack.map(p => [p.lat, p.lng]);
      window.exploreLivePolyline = L.polyline(fullPath, {
        color: '#36cfc9',
        weight: 4,
        opacity: 0.9
      }).addTo(window.travelMap);

      const lastPt = trip.liveTrack[trip.liveTrack.length - 1];
      window.travelMap.setView([lastPt.lat, lastPt.lng], 15);

      const currentIcon = L.divIcon({
        html: '<div class="leaflet-current-loc-dot"><div class="leaflet-current-loc-pulse"></div></div>',
        className: 'custom-leaflet-icon',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      window.currentLocationMarker = L.marker([lastPt.lat, lastPt.lng], { icon: currentIcon }).addTo(window.travelMap);
    } else {
      // Default to Tokyo shibuya if nothing tracked
      window.travelMap.setView([35.6580, 139.7016], 14);
    }
    return;
  }

  // Original Expense Route Drawing
  const coordinates = [];

  locTransactions.forEach((t, i) => {
    coordinates.push([t.lat, t.lng]);

    // Neon colors mapping matching categories
    let markerColor = '#ff7a45'; // food
    if (t.category === 'transport') markerColor = '#2490ff';
    else if (t.category === 'lodging') markerColor = '#b37feb';
    else if (t.category === 'shopping') markerColor = '#ff85c0';
    else if (t.category === 'play') markerColor = '#36cfc9';
    else if (t.category === 'flight') markerColor = '#ffd666';
    else if (t.category === 'souvenir') markerColor = '#ff4d4f';
    else if (t.category === 'fee') markerColor = '#52c41a';

    // Pulse neon marker div
    const markerHtml = `
      <div class="custom-neon-marker" style="--marker-color: ${markerColor};">
        <span class="marker-number">${i + 1}</span>
        <div class="marker-pulse" style="--marker-color: ${markerColor};"></div>
      </div>
    `;

    const neonIcon = L.divIcon({
      html: markerHtml,
      className: 'custom-leaflet-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });

    const trip = getActiveTrip();
    const cat = CATEGORIES[t.category] || CATEGORIES.others;
    const popupHtml = `
      <div class="leaflet-dark-popup">
        <div class="popup-header">
          <span class="popup-icon">${cat.icon}</span>
          <span class="popup-title">${t.locationName || t.desc}</span>
        </div>
        <div class="popup-body">
          <div class="popup-amount">${Math.round(t.amountForeign).toLocaleString()} ${trip.foreignCurrency}</div>
          <div class="popup-amount-base">≈ NT$ ${Math.round(t.amountBase).toLocaleString()}</div>
          <div class="popup-desc">${t.desc || '無備註'}</div>
          <div class="popup-time">${t.date}</div>
        </div>
      </div>
    `;

    const marker = L.marker([t.lat, t.lng], { icon: neonIcon })
      .addTo(window.travelMap)
      .bindPopup(popupHtml, {
        className: 'leaflet-custom-popup-container',
        closeButton: false,
        offset: L.point(0, -5)
      });

    window.travelMarkers[t.id] = marker;
  });

  // Chronologically connect with neon orange dashed polyline trajectory
  if (coordinates.length > 1) {
    window.travelPolyline = L.polyline(coordinates, {
      color: '#ff7a45',
      dashArray: '8, 8',
      weight: 3,
      opacity: 0.85
    }).addTo(window.travelMap);

    try {
      window.travelMap.fitBounds(window.travelPolyline.getBounds(), {
        padding: [30, 30]
      });
    } catch (e) {
      console.warn("Could not fitBounds:", e);
    }
  }
}

// High-accuracy background GPS watch positioning toggle
function toggleLiveTracking() {
  playClickSound();
  const trip = getActiveTrip();
  if (!trip) return;

  if (window.watchPositionId) {
    navigator.geolocation.clearWatch(window.watchPositionId);
    window.watchPositionId = null;
    showToast('📡 實時軌跡追蹤已關閉');
  } else {
    if (!navigator.geolocation) {
      showToast('❌ 您的瀏覽器不支援實時 GPS 追蹤！');
      return;
    }

    showToast('📡 啟動高精度 GPS 實時探索追蹤...');
    window.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        if (!trip.liveTrack) trip.liveTrack = [];
        
        // Anti-shaking coordinate capture filter
        const lastPt = trip.liveTrack[trip.liveTrack.length - 1];
        if (!lastPt || Math.abs(lastPt.lat - lat) > 0.00002 || Math.abs(lastPt.lng - lng) > 0.00002) {
          trip.liveTrack.push({ lat, lng, time: getFormattedCurrentTime() });
          checkGridUnlock(lat, lng);
        }
      },
      (error) => {
        console.error("GPS Watch error:", error);
        showToast(`⚠️ 位置監聽失敗: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  renderMap();
}

// 200m area geofence grids calculator & unlocked status manager
function checkGridUnlock(lat, lng) {
  const trip = getActiveTrip();
  if (!trip) return;

  if (!trip.unlockedGrids) trip.unlockedGrids = {};

  // 0.002 lat/lng unit is approx. 200m grid cell
  const latGrid = Math.floor(lat / 0.002);
  const lngGrid = Math.floor(lng / 0.002);
  const gridKey = `${latGrid}_${lngGrid}`;

  if (!trip.unlockedGrids[gridKey]) {
    trip.unlockedGrids[gridKey] = {
      latGrid,
      lngGrid,
      latCenter: (latGrid + 0.5) * 0.002,
      lngCenter: (lngGrid + 0.5) * 0.002,
      time: getFormattedCurrentTime()
    };

    saveData();
    playUnlockSound();

    // Haptic vibration feedback for gaming controller feel
    if (navigator.vibrate) {
      navigator.vibrate([120, 80, 120]);
    }

    const unlockCount = Object.keys(trip.unlockedGrids).length;
    const levelName = getExplorerLevelName(unlockCount);
    showToast(`🎉 恭喜解鎖全新探索區域！已探索 ${unlockCount} 個網格 (${levelName})`);

    // Live update map if actively viewing explore subtab
    if (activeView === 'map' && window.activeMapSubTab === 'explore') {
      renderMap();
    }
  }
}

// Achievement Explorer Level Names Calculator
function getExplorerLevelName(gridsCount) {
  if (gridsCount <= 2) return 'LV.1 戶外初學者 🐣';
  if (gridsCount <= 7) return 'LV.2 巷弄冒險家 🧭';
  if (gridsCount <= 15) return 'LV.3 街區征服者 🏃';
  if (gridsCount <= 30) return 'LV.4 城市巡邏員 📡';
  return 'LV.5 世紀大探險家 🌟';
}



// Pan focus to explore grid centers
function focusOnExploreGrid(lat, lng) {
  if (!window.travelMap) return;
  playClickSound();
  window.travelMap.setView([lat, lng], 16, { animate: true, duration: 0.8 });
}

// Haversine Distance helper (KM)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cumulative tracked route distance calculator
function calculateLiveTrackDistance(track) {
  if (!track || track.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < track.length - 1; i++) {
    total += getHaversineDistance(track[i].lat, track[i].lng, track[i+1].lat, track[i+1].lng);
  }
  return total;
}

// Pan to spot, zoom in, and open the marker's popup on item clicks
function focusOnMapSpot(lat, lng, txId) {
  if (!window.travelMap) return;
  playClickSound();

  window.travelMap.setView([lat, lng], 15, {
    animate: true,
    duration: 0.8
  });

  const marker = window.travelMarkers[txId];
  if (marker) {
    setTimeout(() => {
      marker.openPopup();
    }, 400);
  }
}

// Cinematic animation playback tracing routes point-by-point
async function playRouteAnimation() {
  const trip = getActiveTrip();
  if (!trip || !window.travelMap) return;
  playClickSound();

  const locTransactions = trip.transactions
    .filter(t => t.lat !== undefined && t.lat !== null && t.lng !== undefined && t.lng !== null)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (locTransactions.length < 2) {
    showToast('⚠️ 至少需要 2 個座標點才能播放軌跡動畫！');
    return;
  }

  const btn = document.getElementById('btn-play-playback');
  if (btn) {
    btn.innerHTML = `🌀 正在播放動畫軌跡...`;
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  // Clear existing polyline
  if (window.travelPolyline) {
    window.travelMap.removeLayer(window.travelPolyline);
  }

  const animCoordinates = [];
  const animPolyline = L.polyline(animCoordinates, {
    color: '#36cfc9',
    weight: 4,
    opacity: 0.9,
    dashArray: null
  }).addTo(window.travelMap);

  window.travelMap.closePopup();

  for (let i = 0; i < locTransactions.length; i++) {
    const t = locTransactions[i];
    animCoordinates.push([t.lat, t.lng]);
    animPolyline.setLatLngs(animCoordinates);

    window.travelMap.setView([t.lat, t.lng], 15, {
      animate: true,
      duration: 0.8
    });

    await new Promise(resolve => setTimeout(resolve, 800));
    
    const marker = window.travelMarkers[t.id];
    if (marker) {
      marker.openPopup();
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  window.travelMap.removeLayer(animPolyline);
  
  const fullCoordinates = locTransactions.map(t => [t.lat, t.lng]);
  window.travelPolyline = L.polyline(fullCoordinates, {
    color: '#ff7a45',
    dashArray: '8, 8',
    weight: 3,
    opacity: 0.85
  }).addTo(window.travelMap);

  if (btn) {
    btn.innerHTML = `▶️ 播放旅程足跡動畫`;
    btn.disabled = false;
    btn.style.opacity = '1';
  }

  window.travelMap.fitBounds(window.travelPolyline.getBounds(), {
    padding: [30, 30]
  });

  showToast('🎬 旅程足跡播放完畢！');
}


