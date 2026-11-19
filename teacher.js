/**
 * 智慧朗讀教練 - 教師管理看板核心腳本 (teacher.js)
 * 負責即時監聽學生作答、多維度篩選分析、大數據成效指標、作答逐字診斷與 CSV 匯出
 */

(function () {
  'use strict';

  // 全域狀態
  let rawRecords = [];
  let filteredRecords = [];
  let unsubscribeLive = null;
  let currentTab = 'feed'; // 'feed' | 'students'
  let isInitialLoad = true;

  // DOM 元素快取
  const badgeCloudStatus = document.getElementById('badge-cloud-status');
  const badgeCloudText = document.getElementById('badge-cloud-text');
  const btnManualRefresh = document.getElementById('btn-manual-refresh');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnOpenFirebaseModal = document.getElementById('btn-open-firebase-modal');
  const liveToastContainer = document.getElementById('live-toast-container');

  // 驗證與安全鎖定 DOM
  const teacherAuthOverlay = document.getElementById('teacher-auth-overlay');
  const formTeacherLogin = document.getElementById('form-teacher-login');
  const inputTeacherPwd = document.getElementById('input-teacher-pwd');
  const btnTogglePwdVisibility = document.getElementById('btn-toggle-pwd-visibility');
  const iconPwdEye = document.getElementById('icon-pwd-eye');
  const pwdErrorMsg = document.getElementById('pwd-error-msg');
  const pwdErrorText = document.getElementById('pwd-error-text');
  const cbRememberTeacher = document.getElementById('cb-remember-teacher');
  const btnSubmitTeacherPwd = document.getElementById('btn-submit-teacher-pwd');
  const btnTeacherLock = document.getElementById('btn-teacher-lock');
  const btnLoginWithGoogle = document.getElementById('btn-login-with-google');

  // 安全設定 Modal DOM
  const securityModal = document.getElementById('security-modal');
  const btnOpenSecurityModal = document.getElementById('btn-open-security-modal');
  const btnCloseSecurityModal = document.getElementById('btn-close-security-modal');
  const inputNewTeacherPwd = document.getElementById('input-new-teacher-pwd');
  const inputConfirmTeacherPwd = document.getElementById('input-confirm-teacher-pwd');
  const cbHideTeacherBtn = document.getElementById('cb-hide-teacher-btn');
  const btnResetTeacherPwdDefault = document.getElementById('btn-reset-teacher-pwd-default');
  const btnSaveSecuritySettings = document.getElementById('btn-save-security-settings');

  // 安全金鑰常數
  const STORAGE_KEY_TEACHER_PWD = 'reading_coach_teacher_pwd';
  const STORAGE_KEY_REMEMBER_AUTH = 'reading_coach_teacher_auth_until';
  const STORAGE_KEY_HIDE_BTN = 'reading_coach_hide_teacher_btn';
  const SESSION_KEY_AUTH = 'reading_coach_teacher_session_auth';
  const DEFAULT_TEACHER_PWD = '8888';

  // 指標看板
  const metricTotalSubmissions = document.getElementById('metric-total-submissions');
  const metricUniqueStudents = document.getElementById('metric-unique-students');
  const metricAvgAccuracy = document.getElementById('metric-avg-accuracy');
  const metricAccuracyBar = document.getElementById('metric-accuracy-bar');
  const metricExcellentCount = document.getElementById('metric-excellent-count');
  const metricNeedsHelpCount = document.getElementById('metric-needs-help-count');
  const metricBestScoreTag = document.getElementById('metric-best-score-tag');
  const btnQuickFilterNeedsHelp = document.getElementById('btn-quick-filter-needs-help');

  // 四級分佈長條圖
  const barDistExcellent = document.getElementById('bar-dist-excellent');
  const barDistGood = document.getElementById('bar-dist-good');
  const barDistFair = document.getElementById('bar-dist-fair');
  const barDistPoor = document.getElementById('bar-dist-poor');
  const legendDistExcellent = document.getElementById('legend-dist-excellent');
  const legendDistGood = document.getElementById('legend-dist-good');
  const legendDistFair = document.getElementById('legend-dist-fair');
  const legendDistPoor = document.getElementById('legend-dist-poor');
  const distributionSummaryText = document.getElementById('distribution-summary-text');

  // 篩選工具列
  const filterClass = document.getElementById('filter-class');
  const filterArticle = document.getElementById('filter-article');
  const filterGrade = document.getElementById('filter-grade');
  const filterSearchInput = document.getElementById('filter-search-input');
  const filterSortBy = document.getElementById('filter-sort-by');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnOpenClearModal = document.getElementById('btn-open-clear-modal');
  const filteredRecordsCount = document.getElementById('filtered-records-count');

  // 標籤切換
  const tabBtnFeed = document.getElementById('tab-btn-feed');
  const tabBtnStudents = document.getElementById('tab-btn-students');
  const feedCountBadge = document.getElementById('feed-count-badge');
  const studentsCountBadge = document.getElementById('students-count-badge');
  const sectionViewFeed = document.getElementById('section-view-feed');
  const sectionViewStudents = document.getElementById('section-view-students');
  const recordsFeedContainer = document.getElementById('records-feed-container');
  const studentsGridContainer = document.getElementById('students-grid-container');

  // 診斷 Modal
  const diagnosticModal = document.getElementById('diagnostic-modal');
  const btnCloseDiagnosticModal = document.getElementById('btn-close-diagnostic-modal');
  const btnCloseDiagnosticModalBottom = document.getElementById('btn-close-diagnostic-modal-bottom');
  const diagStudentTitle = document.getElementById('diag-student-title');
  const diagStudentSub = document.getElementById('diag-student-sub');
  const diagScoreRate = document.getElementById('diag-score-rate');
  const diagScoreCorrect = document.getElementById('diag-score-correct');
  const diagScoreMissed = document.getElementById('diag-score-missed');
  const diagScoreExtra = document.getElementById('diag-score-extra');
  const diagScoreStars = document.getElementById('diag-score-stars');
  const diagTotalChars = document.getElementById('diag-total-chars');
  const diagDuration = document.getElementById('diag-duration');
  const diagTimestamp = document.getElementById('diag-timestamp');
  const diagTargetText = document.getElementById('diag-target-text');
  const diagSpokenText = document.getElementById('diag-spoken-text');
  const diagFeedbackText = document.getElementById('diag-feedback-text');

  // 學生歷程 Modal
  const studentHistoryModal = document.getElementById('student-history-modal');
  const btnCloseStudentHistoryModal = document.getElementById('btn-close-student-history-modal');
  const btnCloseStudentHistoryModalBottom = document.getElementById('btn-close-student-history-modal-bottom');
  const histModalTitle = document.getElementById('hist-modal-title');
  const histModalSub = document.getElementById('hist-modal-sub');
  const histModalCount = document.getElementById('hist-modal-count');
  const histModalBest = document.getElementById('hist-modal-best');
  const histModalAvg = document.getElementById('hist-modal-avg');
  const studentHistoryList = document.getElementById('student-history-list');

  // 清除資料 Modal
  const clearDataModal = document.getElementById('clear-data-modal');
  const btnCancelClear = document.getElementById('btn-cancel-clear');
  const btnConfirmClear = document.getElementById('btn-confirm-clear');

  // Firebase 設定 Modal
  const firebaseModal = document.getElementById('firebase-modal');
  const btnCloseFirebaseModal = document.getElementById('btn-close-firebase-modal');
  const fbStatusBanner = document.getElementById('fb-status-banner');
  const fbStatusText = document.getElementById('fb-status-text');
  const fbInputApiKey = document.getElementById('fb-input-apikey');
  const fbInputProjectId = document.getElementById('fb-input-projectid');
  const fbInputAuthDomain = document.getElementById('fb-input-authdomain');
  const btnSaveFirebaseConfig = document.getElementById('btn-save-firebase-config');
  const btnResetFirebaseConfig = document.getElementById('btn-reset-firebase-config');

  // ========================================================
  // 0. 教師安全身分驗證與鎖定控制
  // ========================================================
  function getStoredPassword() {
    return localStorage.getItem(STORAGE_KEY_TEACHER_PWD) || DEFAULT_TEACHER_PWD;
  }

  function isTeacherAuthenticated() {
    if (sessionStorage.getItem(SESSION_KEY_AUTH) === 'true') return true;
    const rememberUntil = localStorage.getItem(STORAGE_KEY_REMEMBER_AUTH);
    if (rememberUntil && Number(rememberUntil) > Date.now()) return true;
    return false;
  }

  function setAuthenticated(remember7Days = false) {
    sessionStorage.setItem(SESSION_KEY_AUTH, 'true');
    if (remember7Days) {
      const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY_REMEMBER_AUTH, sevenDays.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY_REMEMBER_AUTH);
    }
  }

  function clearAuthentication() {
    sessionStorage.removeItem(SESSION_KEY_AUTH);
    localStorage.removeItem(STORAGE_KEY_REMEMBER_AUTH);
  }

  function unlockDashboard() {
    if (teacherAuthOverlay) {
      teacherAuthOverlay.classList.add('transition-opacity', 'duration-300', 'opacity-0', 'pointer-events-none');
      setTimeout(() => teacherAuthOverlay.classList.add('hidden'), 300);
    }
    updateCloudConnectionBadge();
    startLiveSubscription();
  }

  function lockDashboard() {
    clearAuthentication();
    if (unsubscribeLive && typeof unsubscribeLive === 'function') {
      try { unsubscribeLive(); } catch (e) {}
      unsubscribeLive = null;
    }
    rawRecords = [];
    filteredRecords = [];
    if (recordsFeedContainer) recordsFeedContainer.innerHTML = '';
    if (studentsGridContainer) studentsGridContainer.innerHTML = '';
    renderAnalyticsCards([]);

    if (teacherAuthOverlay) {
      teacherAuthOverlay.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
      if (inputTeacherPwd) {
        inputTeacherPwd.value = '';
        setTimeout(() => inputTeacherPwd.focus(), 100);
      }
      if (pwdErrorMsg) pwdErrorMsg.classList.add('hidden');
    }
  }

  function handleTeacherLogin() {
    const entered = (inputTeacherPwd ? inputTeacherPwd.value : '').trim();
    const correctPwd = getStoredPassword();

    if (!entered) {
      if (pwdErrorMsg) {
        pwdErrorText.textContent = '請輸入教師通關密碼！';
        pwdErrorMsg.classList.remove('hidden');
      }
      return;
    }

    if (entered === correctPwd) {
      const remember = cbRememberTeacher ? cbRememberTeacher.checked : false;
      setAuthenticated(remember);
      if (pwdErrorMsg) pwdErrorMsg.classList.add('hidden');
      unlockDashboard();
    } else {
      if (pwdErrorMsg) {
        pwdErrorText.textContent = '通關密碼錯誤，請重新輸入！(預設密碼為 8888)';
        pwdErrorMsg.classList.remove('hidden');
      }
      if (inputTeacherPwd) {
        inputTeacherPwd.classList.add('border-rose-500');
        setTimeout(() => inputTeacherPwd.classList.remove('border-rose-500'), 800);
        inputTeacherPwd.select();
      }
    }
  }

  function openSecurityModal() {
    if (inputNewTeacherPwd) inputNewTeacherPwd.value = '';
    if (inputConfirmTeacherPwd) inputConfirmTeacherPwd.value = '';
    if (cbHideTeacherBtn) {
      cbHideTeacherBtn.checked = localStorage.getItem(STORAGE_KEY_HIDE_BTN) === 'true';
    }
    if (securityModal) securityModal.classList.remove('hidden');
  }

  function closeSecurityModal() {
    if (securityModal) securityModal.classList.add('hidden');
  }

  function handleSaveSecuritySettings() {
    const newPwd = inputNewTeacherPwd ? inputNewTeacherPwd.value.trim() : '';
    const confirmPwd = inputConfirmTeacherPwd ? inputConfirmTeacherPwd.value.trim() : '';

    if (newPwd) {
      if (newPwd.length < 4) {
        alert('新密碼長度建議至少為 4 碼！');
        return;
      }
      if (newPwd !== confirmPwd) {
        alert('兩次輸入的新密碼不一致，請再次確認！');
        return;
      }
      localStorage.setItem(STORAGE_KEY_TEACHER_PWD, newPwd);
    }

    if (cbHideTeacherBtn) {
      localStorage.setItem(STORAGE_KEY_HIDE_BTN, cbHideTeacherBtn.checked ? 'true' : 'false');
    }

    closeSecurityModal();
    alert('✅ 教師安全與入口設定已成功儲存！');
  }

  function handleResetTeacherPwdDefault() {
    if (confirm('確定要將教師通關密碼恢復為預設值 (8888) 嗎？')) {
      localStorage.removeItem(STORAGE_KEY_TEACHER_PWD);
      if (inputNewTeacherPwd) inputNewTeacherPwd.value = '';
      if (inputConfirmTeacherPwd) inputConfirmTeacherPwd.value = '';
      alert('已恢復預設通關密碼：8888');
    }
  }

  // ========================================================
  // 1. 初始化與即時資料訂閱
  // ========================================================
  function initDashboard() {
    if (!window.ReadingCoachFirebase) {
      setTimeout(initDashboard, 200);
      return;
    }

    setupEventListeners();

    if (isTeacherAuthenticated()) {
      unlockDashboard();
    } else {
      lockDashboard();
    }
  }

  // 啟動即時訂閱監聽
  function startLiveSubscription() {
    if (unsubscribeLive && typeof unsubscribeLive === 'function') {
      try { unsubscribeLive(); } catch (e) {}
    }

    unsubscribeLive = window.ReadingCoachFirebase.subscribeAllRecords((records, meta) => {
      updateCloudConnectionBadge(meta ? meta.source : null);

      // 若有新作答送達 (非首次載入且有新增 docChanges)
      if (!isInitialLoad && meta && meta.docChanges) {
        meta.docChanges.forEach(change => {
          if (change.type === 'added') {
            const newDoc = change.doc.data ? change.doc.data() : null;
            if (newDoc) {
              showLiveToastNotification(newDoc);
            }
          }
        });
      }

      rawRecords = records || [];
      isInitialLoad = false;

      updateFilterDropdownOptions();
      applyFiltersAndRender();
    });
  }

  // 更新雲端連線狀態標籤
  function updateCloudConnectionBadge(source) {
    const isCloud = window.ReadingCoachFirebase.isFirebaseReady();
    if (isCloud && source !== 'local_fallback') {
      badgeCloudStatus.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs';
      badgeCloudStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span><span class="hidden sm:inline">Cloud Firestore 即時連線中</span><span class="sm:hidden">雲端即時</span>';
    } else {
      badgeCloudStatus.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs';
      badgeCloudStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span><span class="hidden sm:inline">本機快取模式 (LocalStorage)</span><span class="sm:hidden">本機模式</span>';
    }
  }

  // 即時收到新作答時在右上角跳出浮動通知
  function showLiveToastNotification(record) {
    if (!liveToastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'bg-white rounded-2xl p-4 shadow-xl border border-purple-200 flex items-center space-x-3 pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 max-w-sm';

    const accuracy = Number(record.accuracyRate) || 0;
    const isHigh = accuracy >= 90;
    const iconColor = isHigh ? 'text-emerald-500 bg-emerald-50' : 'text-purple-600 bg-purple-50';

    toast.innerHTML = `
      <div class="w-9 h-9 rounded-xl ${iconColor} flex items-center justify-center shrink-0">
        <i data-lucide="${isHigh ? 'award' : 'bell'}" class="w-5 h-5"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-800 truncate">${record.studentName || '同學'} (${record.classId || ''}-${record.seatNum || ''})</span>
          <span class="text-2xs font-mono font-bold ${isHigh ? 'text-emerald-600' : 'text-purple-600'}">${accuracy}%</span>
        </div>
        <p class="text-2xs text-slate-500 truncate mt-0.5">剛完成《${record.articleTitle || '課文'}》朗讀練習！</p>
      </div>
    `;

    liveToastContainer.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    // 動畫進場
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // 5 秒後自動退場
    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 5000);

    // 高分放一點彩帶
    if (isHigh && window.confetti) {
      window.confetti({ particleCount: 40, spread: 50, origin: { x: 0.9, y: 0.2 } });
    }
  }

  // ========================================================
  // 2. 篩選與大數據計算
  // ========================================================

  // 動態更新下拉選單選項 (班級、課文標題)
  function updateFilterDropdownOptions() {
    const currentClass = filterClass.value;
    const currentArticle = filterArticle.value;

    // 取得所有唯一班級
    const classSet = new Set();
    const articleSet = new Set();

    rawRecords.forEach(r => {
      if (r.classId) classSet.add(r.classId);
      if (r.articleTitle) articleSet.add(r.articleTitle);
    });

    // 重填班級選單
    const sortedClasses = Array.from(classSet).sort();
    filterClass.innerHTML = '<option value="all">所有班級 (全部)</option>';
    sortedClasses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = `${c} 班`;
      if (c === currentClass) opt.selected = true;
      filterClass.appendChild(opt);
    });

    // 重填課文選單
    const sortedArticles = Array.from(articleSet).sort();
    filterArticle.innerHTML = '<option value="all">所有課文 (全部)</option>';
    sortedArticles.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      if (a === currentArticle) opt.selected = true;
      filterArticle.appendChild(opt);
    });
  }

  // 套用所有篩選條件並重新渲染
  function applyFiltersAndRender() {
    const selectedClass = filterClass.value;
    const selectedArticle = filterArticle.value;
    const selectedGrade = filterGrade.value;
    const searchQuery = (filterSearchInput.value || '').trim().toLowerCase();
    const sortBy = filterSortBy.value;

    filteredRecords = rawRecords.filter(r => {
      // 班級篩選
      if (selectedClass !== 'all' && r.classId !== selectedClass) return false;

      // 課文題目篩選
      if (selectedArticle !== 'all' && r.articleTitle !== selectedArticle) return false;

      // 等級篩選
      const acc = Number(r.accuracyRate) || 0;
      if (selectedGrade === 'excellent' && acc < 90) return false;
      if (selectedGrade === 'good' && (acc < 80 || acc >= 90)) return false;
      if (selectedGrade === 'fair' && (acc < 70 || acc >= 80)) return false;
      if (selectedGrade === 'needs_help' && acc >= 70) return false;

      // 搜尋字串 (姓名或座號)
      if (searchQuery) {
        const nameMatch = (r.studentName || '').toLowerCase().includes(searchQuery);
        const seatMatch = (r.seatNum || '').toString().toLowerCase().includes(searchQuery);
        const classMatch = (r.classId || '').toLowerCase().includes(searchQuery);
        if (!nameMatch && !seatMatch && !classMatch) return false;
      }

      return true;
    });

    // 排序
    filteredRecords.sort((a, b) => {
      const tA = Number(a.timestamp) || 0;
      const tB = Number(b.timestamp) || 0;
      const sA = Number(a.accuracyRate) || 0;
      const sB = Number(b.accuracyRate) || 0;
      const seatA = parseInt(a.seatNum, 10) || 0;
      const seatB = parseInt(b.seatNum, 10) || 0;

      if (sortBy === 'time_desc') return tB - tA;
      if (sortBy === 'time_asc') return tA - tB;
      if (sortBy === 'score_desc') return sB - sA;
      if (sortBy === 'score_asc') return sA - sB;
      if (sortBy === 'seat_asc') return seatA - seatB;
      return tB - tA;
    });

    // 渲染統計指標與圖表
    renderAnalyticsCards(filteredRecords);

    // 渲染清單
    if (currentTab === 'feed') {
      renderRecordsFeed(filteredRecords);
    } else {
      renderStudentsMatrix(filteredRecords);
    }

    // 更新篩選筆數標籤
    filteredRecordsCount.textContent = filteredRecords.length;
    feedCountBadge.textContent = filteredRecords.length;

    if (window.lucide) window.lucide.createIcons();
  }

  // 計算並渲染 4 大成效指標卡片與分佈直方條
  function renderAnalyticsCards(records) {
    const totalCount = records.length;

    if (totalCount === 0) {
      metricTotalSubmissions.textContent = '0';
      metricUniqueStudents.textContent = '0';
      metricAvgAccuracy.textContent = '--%';
      metricAccuracyBar.style.width = '0%';
      metricExcellentCount.textContent = '0';
      metricNeedsHelpCount.textContent = '0';
      metricBestScoreTag.textContent = '最高 0%';
      distributionSummaryText.textContent = '共 0 筆作答';

      barDistExcellent.style.width = '0%';
      barDistGood.style.width = '0%';
      barDistFair.style.width = '0%';
      barDistPoor.style.width = '0%';
      legendDistExcellent.textContent = '0%';
      legendDistGood.textContent = '0%';
      legendDistFair.textContent = '0%';
      legendDistPoor.textContent = '0%';
      return;
    }

    // 1. 總作答次數
    metricTotalSubmissions.textContent = totalCount;

    // 2. 參與學生數 (不重複 key)
    const studentSet = new Set();
    records.forEach(r => {
      const key = `${r.classId || 'default'}_${r.seatNum || 'none'}_${r.studentName || 'anonymous'}`;
      studentSet.add(key);
    });
    metricUniqueStudents.textContent = studentSet.size;
    studentsCountBadge.textContent = studentSet.size;

    // 3. 全班平均正確率與最佳成績
    const totalAccuracy = records.reduce((sum, r) => sum + (Number(r.accuracyRate) || 0), 0);
    const avgAccuracy = Math.round(totalAccuracy / totalCount);
    const bestScore = Math.max(...records.map(r => Number(r.accuracyRate) || 0));

    metricAvgAccuracy.textContent = `${avgAccuracy}%`;
    metricAccuracyBar.style.width = `${avgAccuracy}%`;
    metricBestScoreTag.textContent = `全班最高 ${bestScore}%`;

    // 4. 四級表現分佈
    let countExcellent = 0; // >= 90
    let countGood = 0;      // 80~89
    let countFair = 0;      // 70~79
    let countPoor = 0;      // < 70

    records.forEach(r => {
      const acc = Number(r.accuracyRate) || 0;
      if (acc >= 90) countExcellent++;
      else if (acc >= 80) countGood++;
      else if (acc >= 70) countFair++;
      else countPoor++;
    });

    metricExcellentCount.textContent = countExcellent;
    metricNeedsHelpCount.textContent = countPoor;

    const pctExc = Math.round((countExcellent / totalCount) * 100);
    const pctGood = Math.round((countGood / totalCount) * 100);
    const pctFair = Math.round((countFair / totalCount) * 100);
    const pctPoor = 100 - pctExc - pctGood - pctFair;

    barDistExcellent.style.width = `${pctExc}%`;
    barDistGood.style.width = `${pctGood}%`;
    barDistFair.style.width = `${pctFair}%`;
    barDistPoor.style.width = `${Math.max(0, pctPoor)}%`;

    legendDistExcellent.textContent = `${pctExc}% (${countExcellent}次)`;
    legendDistGood.textContent = `${pctGood}% (${countGood}次)`;
    legendDistFair.textContent = `${pctFair}% (${countFair}次)`;
    legendDistPoor.textContent = `${pctPoor}% (${countPoor}次)`;

    distributionSummaryText.textContent = `共 ${totalCount} 筆作答紀錄 (${studentSet.size} 位同學)`;
  }

  // ========================================================
  // 3. 檢視模式 A：每一次作答流水帳 (Feed / Table)
  // ========================================================
  function renderRecordsFeed(records) {
    if (!recordsFeedContainer) return;

    if (records.length === 0) {
      recordsFeedContainer.innerHTML = `
        <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
          <div class="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="inbox" class="w-6 h-6"></i>
          </div>
          <p class="text-xs font-semibold text-slate-600">目前沒有符合篩選條件的作答紀錄</p>
          <p class="text-2xs text-slate-400 mt-1">學生在平板完成朗讀錄音後，作答資料將即時自動送達於此！</p>
          <button onclick="document.getElementById('btn-reset-filters').click()" class="mt-4 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-bold text-xs transition">
            重設篩選條件
          </button>
        </div>
      `;
      return;
    }

    recordsFeedContainer.innerHTML = '';

    records.forEach(r => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:border-purple-200 hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4';

      const accuracy = Number(r.accuracyRate) || 0;
      let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
      if (accuracy >= 90) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      else if (accuracy >= 80) badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
      else if (accuracy >= 70) badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';

      const stars = '★'.repeat(r.starRating || 1) + '☆'.repeat(Math.max(0, 5 - (r.starRating || 1)));
      const timeStr = formatRelativeTime(r.recordedAt || r.timestamp);

      // 辨識出的文字預覽
      const spokenPreview = r.spokenText ? r.spokenText.slice(0, 45) + (r.spokenText.length > 45 ? '...' : '') : null;

      card.innerHTML = `
        <div class="flex items-start space-x-3.5 flex-1 min-w-0">
          <!-- 班級座號徽章 -->
          <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-50 to-indigo-50 text-purple-700 border border-purple-100 flex flex-col items-center justify-center shrink-0">
            <span class="text-2xs font-bold leading-none">${r.classId || '班級'}</span>
            <span class="text-base font-black font-mono leading-none mt-1">${r.seatNum || '--'}</span>
          </div>

          <!-- 學生與課文詳情 -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-bold text-slate-900">${r.studentName || '未命名學生'}</span>
              <span class="text-2xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">座號 ${r.seatNum || '--'}</span>
              <span class="text-2xs text-slate-400 font-mono flex items-center">
                <i data-lucide="clock" class="w-3 h-3 mr-1"></i>${timeStr}
              </span>
            </div>

            <!-- 課文題目與字數 -->
            <div class="mt-1 flex items-center space-x-2">
              <span class="text-xs font-semibold text-purple-700 flex items-center truncate">
                <i data-lucide="book-open" class="w-3.5 h-3.5 mr-1 text-purple-500 shrink-0"></i>
                《${r.articleTitle || '未命名課文'}》
              </span>
              <span class="text-2xs text-slate-400">(${r.totalChars || 0} 字)</span>
            </div>

            <!-- 錄音文字摘要 (如果有保存) -->
            ${spokenPreview ? `
              <div class="mt-1.5 text-2xs text-slate-500 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 truncate">
                <span class="text-purple-600 font-semibold mr-1">🎙️ 辨識：</span>${escapeHtml(spokenPreview)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 右側：成績數據與操作按鈕 -->
        <div class="flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <!-- 數據指標組 -->
          <div class="flex items-center space-x-3 text-xs">
            <div class="text-center">
              <span class="text-2xs text-slate-400 block font-semibold">正確率</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-lg border text-xs font-black font-mono ${badgeColor}">
                ${accuracy}%
              </span>
            </div>
            <div class="text-center hidden sm:block">
              <span class="text-2xs text-slate-400 block font-semibold">星級</span>
              <span class="text-amber-400 text-xs font-mono font-bold">${stars}</span>
            </div>
            <div class="text-center">
              <span class="text-2xs text-slate-400 block font-semibold">對 / 漏 / 贅</span>
              <span class="font-mono font-bold text-2xs">
                <span class="text-emerald-600">${r.correctCount || 0}</span> /
                <span class="text-rose-600">${r.missedCount || 0}</span> /
                <span class="text-amber-600">${r.extraCount || 0}</span>
              </span>
            </div>
            <div class="text-center hidden sm:block">
              <span class="text-2xs text-slate-400 block font-semibold">耗時</span>
              <span class="font-mono font-bold text-slate-700 text-xs">${r.durationSeconds || 0}s</span>
            </div>
          </div>

          <!-- 操作按鈕組 -->
          <div class="flex items-center space-x-1.5 ml-2">
            <!-- 深度診斷 -->
            <button type="button" class="btn-inspect-record px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold flex items-center transition shadow-2xs" data-id="${r.id}" title="查看原文與學生發音逐字診斷">
              <i data-lucide="stethoscope" class="w-3.5 h-3.5 mr-1"></i>診斷
            </button>
            <!-- 該生歷程 -->
            <button type="button" class="btn-inspect-student px-2 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center transition" data-student="${r.studentUid || (r.classId + '_' + r.seatNum)}" title="檢視該生歷次練習檔案">
              <i data-lucide="user" class="w-3.5 h-3.5"></i>
            </button>
            <!-- 刪除紀錄 -->
            <button type="button" class="btn-delete-record p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" data-id="${r.id}" title="刪除此筆測試紀錄">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;

      recordsFeedContainer.appendChild(card);
    });

    // 綁定卡片按鈕事件
    recordsFeedContainer.querySelectorAll('.btn-inspect-record').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openDiagnosticModal(id);
      });
    });

    recordsFeedContainer.querySelectorAll('.btn-inspect-student').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentUid = e.currentTarget.getAttribute('data-student');
        openStudentHistoryModal(studentUid);
      });
    });

    recordsFeedContainer.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm('確定要刪除這筆學生的作答紀錄嗎？（刪除後無法復原）')) {
          await window.ReadingCoachFirebase.deleteReadingRecord(id);
        }
      });
    });
  }

  // ========================================================
  // 4. 檢視模式 B：學生學習成果檔案 (以學生為單位彙整)
  // ========================================================
  function renderStudentsMatrix(records) {
    if (!studentsGridContainer) return;

    // 依學生分組
    const studentMap = new Map();

    records.forEach(r => {
      const key = `${r.classId || 'default'}_${r.seatNum || 'none'}`;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          classId: r.classId,
          seatNum: r.seatNum,
          name: r.studentName,
          studentUid: r.studentUid,
          records: []
        });
      }
      studentMap.get(key).records.push(r);
    });

    const studentList = Array.from(studentMap.values());

    // 依座號排序
    studentList.sort((a, b) => {
      const sA = parseInt(a.seatNum, 10) || 0;
      const sB = parseInt(b.seatNum, 10) || 0;
      return sA - sB;
    });

    studentsCountBadge.textContent = studentList.length;

    if (studentList.length === 0) {
      studentsGridContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
          <p class="text-xs">尚無任何學生作答檔案。</p>
        </div>
      `;
      return;
    }

    studentsGridContainer.innerHTML = '';

    studentList.forEach(student => {
      const recs = student.records;
      const count = recs.length;
      const scores = recs.map(r => Number(r.accuracyRate) || 0);
      const best = Math.max(...scores);
      const latest = scores[0]; // 已依 timestamp desc
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / count);

      let statusBadge = '<span class="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">表現優異</span>';
      if (avg < 70) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-2xs font-bold bg-rose-100 text-rose-800">建議輔導</span>';
      } else if (avg < 85) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-2xs font-bold bg-indigo-100 text-indigo-800">穩定練習</span>';
      }

      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-purple-200 hover:shadow-xs transition flex flex-col justify-between';

      card.innerHTML = `
        <div>
          <!-- 頂部學生身分資訊 -->
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 font-mono font-black text-sm flex items-center justify-center border border-purple-100">
                ${student.seatNum || '--'}
              </div>
              <div>
                <h4 class="text-sm font-bold text-slate-900">${student.name || '同學'}</h4>
                <p class="text-2xs text-slate-400">${student.classId} 班 • 座號 ${student.seatNum}</p>
              </div>
            </div>
            ${statusBadge}
          </div>

          <!-- 3大數據方塊 -->
          <div class="grid grid-cols-3 gap-2 mb-3">
            <div class="p-2.5 bg-slate-50 rounded-xl text-center">
              <span class="text-2xs text-slate-400 block font-semibold">練習次數</span>
              <span class="text-base font-black text-slate-800 font-mono">${count}</span>
            </div>
            <div class="p-2.5 bg-emerald-50 rounded-xl text-center">
              <span class="text-2xs text-emerald-700 block font-semibold">最佳成績</span>
              <span class="text-base font-black text-emerald-900 font-mono">${best}%</span>
            </div>
            <div class="p-2.5 bg-purple-50 rounded-xl text-center">
              <span class="text-2xs text-purple-700 block font-semibold">平均分數</span>
              <span class="text-base font-black text-purple-900 font-mono">${avg}%</span>
            </div>
          </div>

          <!-- 最近一次練習課文與時間 -->
          <div class="text-2xs text-slate-500 space-y-1 mb-3">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">最近練習：</span>
              <span class="font-bold text-slate-700 truncate max-w-[150px]">《${recs[0].articleTitle || '課文'}》</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">最新作答：</span>
              <span class="font-mono text-slate-600">${formatRelativeTime(recs[0].recordedAt || recs[0].timestamp)}</span>
            </div>
          </div>
        </div>

        <!-- 底部展開該生歷程按鈕 -->
        <button type="button" class="btn-open-student-history w-full py-2 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-bold rounded-xl text-xs transition border border-slate-200/80 flex items-center justify-center" data-student="${student.studentUid || (student.classId + '_' + student.seatNum)}">
          <i data-lucide="line-chart" class="w-3.5 h-3.5 mr-1.5"></i>
          查看 ${student.name} 的朗讀成長歷程
        </button>
      `;

      studentsGridContainer.appendChild(card);
    });

    // 綁定展開歷程按鈕
    studentsGridContainer.querySelectorAll('.btn-open-student-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentUid = e.currentTarget.getAttribute('data-student');
        openStudentHistoryModal(studentUid);
      });
    });
  }

  // ========================================================
  // 5. 深度診斷 Modal (逐字對照與語音辨識內容)
  // ========================================================
  function openDiagnosticModal(recordId) {
    const record = rawRecords.find(r => r.id === recordId);
    if (!record) return;

    diagStudentTitle.textContent = `${record.studentName || '學生'} 的作答診斷報告`;
    diagStudentSub.textContent = `班級：${record.classId || '--'} 班 | 座號：${record.seatNum || '--'} 號 | 課文：《${record.articleTitle || '--'}》`;

    const accuracy = Number(record.accuracyRate) || 0;
    diagScoreRate.textContent = `${accuracy}%`;
    diagScoreCorrect.textContent = record.correctCount || 0;
    diagScoreMissed.textContent = record.missedCount || 0;
    diagScoreExtra.textContent = record.extraCount || 0;

    diagScoreStars.textContent = '★'.repeat(record.starRating || 1) + '☆'.repeat(Math.max(0, 5 - (record.starRating || 1)));
    diagTotalChars.textContent = record.totalChars || 0;
    diagDuration.textContent = record.durationSeconds || 0;
    diagTimestamp.textContent = new Date(record.recordedAt || record.timestamp).toLocaleString('zh-TW');

    // 原文
    diagTargetText.textContent = record.targetText || '（此筆紀錄為初期版本未記錄課文原文，請直接參考課文題目）';

    // 學生實際朗讀語音內容 (STT)
    if (record.spokenText) {
      diagSpokenText.textContent = record.spokenText;
      diagSpokenText.className = 'p-3 bg-purple-50/60 border border-purple-200 rounded-xl text-xs sm:text-sm text-purple-950 font-sans leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap';
    } else {
      diagSpokenText.textContent = '（學生朗讀時麥克風未收錄到足夠聲音或使用的是舊版作答）';
      diagSpokenText.className = 'p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic';
    }

    // 教師診斷建議
    let advice = '';
    if (accuracy >= 95) {
      advice = '🌟 卓越精熟！學生發音清晰準確，節奏非常穩健，幾乎沒有任何錯漏字，表現堪稱全班示範！';
    } else if (accuracy >= 85) {
      advice = '👍 良好穩定！學生能流暢朗讀完整文章，僅有極少數個別字詞發音或標點停頓略有微差，持續練習即可邁向滿分！';
    } else if (accuracy >= 70) {
      advice = '📖 基礎掌握！學生有朗讀意願，但存在部分漏字或添字情況，建議老師可引導學生先以 0.75x 慢速聆聽示範朗讀，再行跟讀。';
    } else {
      advice = '⚠️ 需個別關懷！本次朗讀漏讀或誤讀字數較多，請老師確認學生是否具備字詞認讀基礎，或是錄音時距離麥克風過遠導致收音不全。';
    }
    diagFeedbackText.textContent = advice;

    diagnosticModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  function closeDiagnosticModal() {
    diagnosticModal.classList.add('hidden');
  }

  // ========================================================
  // 6. 個別學生歷史歷程 Modal
  // ========================================================
  function openStudentHistoryModal(studentUidOrKey) {
    // 找出該學生的所有作答紀錄
    const studentRecords = rawRecords.filter(r => {
      return (r.studentUid && r.studentUid === studentUidOrKey) ||
             (`${r.classId}_${r.seatNum}` === studentUidOrKey);
    });

    if (studentRecords.length === 0) return;

    const studentInfo = studentRecords[0];
    histModalTitle.textContent = `【${studentInfo.studentName || '同學'}】的個人朗讀成長檔案`;
    histModalSub.textContent = `${studentInfo.classId} 班 ${studentInfo.seatNum} 號 • 累計練習 ${studentRecords.length} 次`;

    const scores = studentRecords.map(r => Number(r.accuracyRate) || 0);
    const best = Math.max(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    histModalCount.textContent = studentRecords.length;
    histModalBest.textContent = `${best}%`;
    histModalAvg.textContent = `${avg}%`;

    studentHistoryList.innerHTML = '';
    studentRecords.forEach((r, idx) => {
      const row = document.createElement('div');
      row.className = 'p-3 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-white transition flex items-center justify-between gap-3 text-xs';

      const acc = Number(r.accuracyRate) || 0;
      let badgeCls = 'text-rose-700 bg-rose-50 border-rose-200';
      if (acc >= 90) badgeCls = 'text-emerald-800 bg-emerald-50 border-emerald-200';
      else if (acc >= 75) badgeCls = 'text-indigo-800 bg-indigo-50 border-indigo-200';

      row.innerHTML = `
        <div class="flex items-center space-x-2.5 min-w-0">
          <span class="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 font-bold font-mono text-2xs flex items-center justify-center shrink-0">
            #${studentRecords.length - idx}
          </span>
          <div class="truncate">
            <span class="font-bold text-slate-800 truncate block">《${r.articleTitle || '課文'}》</span>
            <span class="text-2xs text-slate-400 font-mono">${new Date(r.recordedAt || r.timestamp).toLocaleString('zh-TW')}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2 shrink-0">
          <span class="text-2xs text-slate-400">對:${r.correctCount || 0} 漏:${r.missedCount || 0}</span>
          <span class="px-2 py-0.5 rounded-lg border font-black font-mono text-xs ${badgeCls}">${acc}%</span>
          <button type="button" class="btn-sub-inspect p-1 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-slate-100 transition" data-id="${r.id}" title="查看診斷">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      studentHistoryList.appendChild(row);
    });

    studentHistoryList.querySelectorAll('.btn-sub-inspect').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openDiagnosticModal(id);
      });
    });

    studentHistoryModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  function closeStudentHistoryModal() {
    studentHistoryModal.classList.add('hidden');
  }

  // ========================================================
  // 7. 清理資料與 Firebase 設定
  // ========================================================
  function openClearModal() {
    clearDataModal.classList.remove('hidden');
  }
  function closeClearModal() {
    clearDataModal.classList.add('hidden');
  }

  async function handleConfirmClear() {
    const scope = document.querySelector('input[name="clear-scope"]:checked').value;
    const targetClass = scope === 'current_class' ? filterClass.value : 'all';

    const promptText = scope === 'current_class' && targetClass !== 'all'
      ? `確定要清理【${targetClass} 班】的所有作答紀錄嗎？`
      : '確定要清空【所有班級】的全部作答紀錄嗎？（此動作不可復原）';

    if (confirm(promptText)) {
      await window.ReadingCoachFirebase.clearAllRecords(targetClass);
      closeClearModal();
      alert('已完成作答紀錄清理！');
      startLiveSubscription();
    }
  }

  // Firebase 設定 Modal
  function openFirebaseModal() {
    const cfg = window.ReadingCoachFirebase.getEffectiveConfig();
    fbInputApiKey.value = cfg.apiKey || '';
    fbInputProjectId.value = cfg.projectId || '';
    fbInputAuthDomain.value = cfg.authDomain || '';

    const isReady = window.ReadingCoachFirebase.isFirebaseReady();
    if (isReady) {
      fbStatusBanner.className = 'mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center justify-between';
      fbStatusText.textContent = `已成功連線至 Firestore 專案：${cfg.projectId}`;
    } else {
      fbStatusBanner.className = 'mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between';
      fbStatusText.textContent = '目前處於本機離線模式 (LocalStorage)';
    }

    firebaseModal.classList.remove('hidden');
  }

  function closeFirebaseModal() {
    firebaseModal.classList.add('hidden');
  }

  function handleSaveFirebaseConfig() {
    const apiKey = fbInputApiKey.value.trim();
    const projectId = fbInputProjectId.value.trim();
    const authDomain = fbInputAuthDomain.value.trim();

    if (!apiKey || !projectId) {
      alert('請至少填寫 apiKey 與 projectId！');
      return;
    }

    window.ReadingCoachFirebase.saveFirebaseConfig({ apiKey, projectId, authDomain });
    closeFirebaseModal();
    alert('Firebase 設定已更新！頁面即將重新連線。');
    location.reload();
  }

  function handleResetFirebaseConfig() {
    if (confirm('確定要恢復官方預設的 Firebase 雲端配置嗎？')) {
      window.ReadingCoachFirebase.clearFirebaseConfig();
    }
  }

  // ========================================================
  // 8. 事件監聽綁定
  // ========================================================
  function setupEventListeners() {
    // 手動重整
    btnManualRefresh.addEventListener('click', () => {
      btnManualRefresh.classList.add('opacity-50');
      startLiveSubscription();
      setTimeout(() => btnManualRefresh.classList.remove('opacity-50'), 600);
    });

    // 匯出 CSV
    btnExportCsv.addEventListener('click', () => {
      const className = filterClass.value !== 'all' ? `${filterClass.value}班` : '全校班級';
      const filename = `智慧朗讀教練_${className}_學生作答歷程總表_${new Date().toISOString().slice(0, 10)}.csv`;
      window.ReadingCoachFirebase.exportRecordsToCsv(filteredRecords, filename);
    });

    // 篩選監聽
    filterClass.addEventListener('change', applyFiltersAndRender);
    filterArticle.addEventListener('change', applyFiltersAndRender);
    filterGrade.addEventListener('change', applyFiltersAndRender);
    filterSearchInput.addEventListener('input', debounce(applyFiltersAndRender, 200));
    filterSortBy.addEventListener('change', applyFiltersAndRender);

    // 一鍵查看待加強名單
    btnQuickFilterNeedsHelp.addEventListener('click', () => {
      filterGrade.value = 'needs_help';
      applyFiltersAndRender();
    });

    // 重設篩選
    btnResetFilters.addEventListener('click', () => {
      filterClass.value = 'all';
      filterArticle.value = 'all';
      filterGrade.value = 'all';
      filterSearchInput.value = '';
      filterSortBy.value = 'time_desc';
      applyFiltersAndRender();
    });

    // 標籤切換
    tabBtnFeed.addEventListener('click', () => {
      currentTab = 'feed';
      tabBtnFeed.className = 'px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-xs transition flex items-center';
      tabBtnStudents.className = 'px-4 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center shadow-2xs';
      sectionViewFeed.classList.remove('hidden');
      sectionViewStudents.classList.add('hidden');
      renderRecordsFeed(filteredRecords);
    });

    tabBtnStudents.addEventListener('click', () => {
      currentTab = 'students';
      tabBtnStudents.className = 'px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white shadow-xs transition flex items-center';
      tabBtnFeed.className = 'px-4 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition flex items-center shadow-2xs';
      sectionViewStudents.classList.remove('hidden');
      sectionViewFeed.classList.add('hidden');
      renderStudentsMatrix(filteredRecords);
    });

    // 診斷 Modal
    btnCloseDiagnosticModal.addEventListener('click', closeDiagnosticModal);
    btnCloseDiagnosticModalBottom.addEventListener('click', closeDiagnosticModal);

    // 學生歷程 Modal
    btnCloseStudentHistoryModal.addEventListener('click', closeStudentHistoryModal);
    btnCloseStudentHistoryModalBottom.addEventListener('click', closeStudentHistoryModal);

    // 清理資料 Modal
    btnOpenClearModal.addEventListener('click', openClearModal);
    btnCancelClear.addEventListener('click', closeClearModal);
    btnConfirmClear.addEventListener('click', handleConfirmClear);

    // Firebase Modal
    btnOpenFirebaseModal.addEventListener('click', openFirebaseModal);
    btnCloseFirebaseModal.addEventListener('click', closeFirebaseModal);
    btnSaveFirebaseConfig.addEventListener('click', handleSaveFirebaseConfig);
    btnResetFirebaseConfig.addEventListener('click', handleResetFirebaseConfig);

    // 教師驗證表單
    if (formTeacherLogin) {
      formTeacherLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        handleTeacherLogin();
      });
    }
    if (btnSubmitTeacherPwd) {
      btnSubmitTeacherPwd.addEventListener('click', handleTeacherLogin);
    }
    if (inputTeacherPwd) {
      inputTeacherPwd.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleTeacherLogin();
      });
    }

    // 密碼顯示/隱藏切換
    if (btnTogglePwdVisibility && inputTeacherPwd) {
      btnTogglePwdVisibility.addEventListener('click', () => {
        const isPwd = inputTeacherPwd.type === 'password';
        inputTeacherPwd.type = isPwd ? 'text' : 'password';
        if (iconPwdEye) {
          iconPwdEye.setAttribute('data-lucide', isPwd ? 'eye-off' : 'eye');
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }

    // Google 登入解鎖
    if (btnLoginWithGoogle) {
      btnLoginWithGoogle.addEventListener('click', async () => {
        try {
          await window.ReadingCoachFirebase.loginWithGoogle();
          setAuthenticated(true);
          unlockDashboard();
        } catch (e) {
          alert('Google 驗證提示：' + (e.message || '請確認 Firebase 配置'));
        }
      });
    }

    // 鎖定看板
    if (btnTeacherLock) {
      btnTeacherLock.addEventListener('click', () => {
        if (confirm('確定要立即鎖定教師看板嗎？（解鎖需重新輸入密碼）')) {
          lockDashboard();
        }
      });
    }

    // 安全設定 Modal
    if (btnOpenSecurityModal) btnOpenSecurityModal.addEventListener('click', openSecurityModal);
    if (btnCloseSecurityModal) btnCloseSecurityModal.addEventListener('click', closeSecurityModal);
    if (btnSaveSecuritySettings) btnSaveSecuritySettings.addEventListener('click', handleSaveSecuritySettings);
    if (btnResetTeacherPwdDefault) btnResetTeacherPwdDefault.addEventListener('click', handleResetTeacherPwdDefault);
  }

  // ========================================================
  // 9. 輔助函數 (時間格式化、防抖、防 XSS)
  // ========================================================
  function formatRelativeTime(dateInput) {
    if (!dateInput) return '--';
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 15) return '剛剛';
    if (diffSec < 60) return `${diffSec} 秒前`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} 分鐘前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小時前`;
    return date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // 網頁載入時啟動
  document.addEventListener('DOMContentLoaded', initDashboard);
})();
