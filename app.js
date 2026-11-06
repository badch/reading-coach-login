/**
 * 智慧朗讀教練 - 核心前端邏輯
 * 包含：拍照 OCR (Tesseract.js)、語音示範朗讀 (TTS)、跟讀錄音辨識 (STT)、逐字比對評分演算法
 */

document.addEventListener('DOMContentLoaded', () => {
  // 初始化 Lucide 圖標
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // --- 系統內建範例庫 ---
  const DEFAULT_SAMPLES = [
    {
      id: 'poem',
      title: '唐詩《春曉》',
      content: `春眠不覺曉，處處聞啼鳥。\n夜來風雨聲，花落知多少。`,
      isDefault: true
    },
    {
      id: 'essay',
      title: '《雅量》節錄',
      content: `朋友買了一件衣料，綠色的底子帶白色的圓點，一見面就高興地問我們：\n「你猜這像什麼？」\n「我看倒有點像棋盤似的。」我看了一看，說。\n「我看倒有點像稿紙。」我的一個朋友說。`,
      isDefault: true
    },
    {
      id: 'prose',
      title: '《背影》片段',
      content: `我與父親不相見已二年餘了，我最不能忘記的是他的背影。\n那年冬天，祖母死了，父親的差使也交卸了，正是禍不單行的日子。`,
      isDefault: true
    }
  ];

  const CUSTOM_SAMPLES_STORAGE_KEY = 'reading_coach_custom_samples_v1';

  // --- DOM 元素獲取 ---
  // 步驟導航
  const stepNavs = [1, 2, 3, 4].map(n => document.getElementById(`step-nav-${n}`));

  // 步驟 1: 上傳、文字與範例
  const dropZone = document.getElementById('drop-zone');
  const imageInput = document.getElementById('image-input');
  const btnBrowse = document.getElementById('btn-browse');
  const uploadPrompt = document.getElementById('upload-prompt');
  const previewWrapper = document.getElementById('preview-wrapper');
  const imagePreview = document.getElementById('image-preview');
  const btnRemoveImage = document.getElementById('btn-remove-image');
  const ocrStatusCard = document.getElementById('ocr-status-card');
  const ocrStatusText = document.getElementById('ocr-status-text');
  const ocrProgressBar = document.getElementById('ocr-progress-bar');
  const ocrProgressPercent = document.getElementById('ocr-progress-percent');
  const articleText = document.getElementById('article-text');
  const charCount = document.getElementById('char-count');
  const btnClearText = document.getElementById('btn-clear-text');
  const sampleButtonsWrapper = document.getElementById('sample-buttons-wrapper');
  const btnOpenAddSample = document.getElementById('btn-open-add-sample');
  const btnOpenManageSamples = document.getElementById('btn-open-manage-samples');
  const btnSaveAsSampleQuick = document.getElementById('btn-save-as-sample-quick');

  // 範例管理 Modal 彈窗元素
  const sampleModal = document.getElementById('sample-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCloseModalBottom = document.getElementById('btn-close-modal-bottom');
  const modalSampleTitle = document.getElementById('modal-sample-title');
  const modalSampleContent = document.getElementById('modal-sample-content');
  const btnModalPasteCurrent = document.getElementById('btn-modal-paste-current');
  const btnSaveSample = document.getElementById('btn-save-sample');
  const modalCustomList = document.getElementById('modal-custom-list');
  const customSampleCountBadge = document.getElementById('custom-sample-count-badge');
  const btnExportSamples = document.getElementById('btn-export-samples');
  const importSamplesFile = document.getElementById('import-samples-file');

  // 導航列與雲端班級同步元素
  const btnClassSync = document.getElementById('btn-class-sync');
  const currentClassBadgeText = document.getElementById('current-class-badge-text');
  const cloudClassIdInput = document.getElementById('cloud-class-id');
  const btnCloudUpload = document.getElementById('btn-cloud-upload');
  const btnCloudDownload = document.getElementById('btn-cloud-download');
  const btnCopyStudentLink = document.getElementById('btn-copy-student-link');
  const btnShowStudentQr = document.getElementById('btn-show-student-qr');
  const cloudSyncStatus = document.getElementById('cloud-sync-status');
  const qrCodePopup = document.getElementById('qr-code-popup');
  const studentQrcodeBox = document.getElementById('student-qrcode-box');

  // 步驟 2: 示範朗讀
  const ttsSpeedSelect = document.getElementById('tts-speed');
  const ttsVoiceSelect = document.getElementById('tts-voice');
  const btnTtsPlay = document.getElementById('btn-tts-play');
  const ttsPlayText = document.getElementById('tts-play-text');
  const btnTtsStop = document.getElementById('btn-tts-stop');
  const ttsDot = document.getElementById('tts-dot');
  const ttsStatusMsg = document.getElementById('tts-status-msg');

  // 步驟 3: 朗讀錄音與讀稿機
  const teleprompterBox = document.getElementById('teleprompter-box');
  const teleprompterContentWrapper = document.getElementById('teleprompter-content-wrapper');
  const teleprompterText = document.getElementById('teleprompter-text');
  const btnFontSmaller = document.getElementById('btn-font-smaller');
  const btnFontNormal = document.getElementById('btn-font-normal');
  const btnFontBigger = document.getElementById('btn-font-bigger');
  const btnToggleVertical = document.getElementById('btn-toggle-vertical');
  const verticalModeText = document.getElementById('vertical-mode-text');

  const btnRecord = document.getElementById('btn-record');
  const recordIcon = document.getElementById('record-icon');
  const recordBtnText = document.getElementById('record-btn-text');
  const recordingPulse = document.getElementById('recording-pulse');
  const recordingTime = document.getElementById('recording-time');
  const recordHint = document.getElementById('record-hint');
  const sttResultBox = document.getElementById('stt-result-box');
  const recordedCharCount = document.getElementById('recorded-char-count');
  const sttSupportTag = document.getElementById('stt-support-tag');
  const btnTestMic = document.getElementById('btn-test-mic');
  const visualizerCanvas = document.getElementById('audio-visualizer');
  const visualizerStatusDot = document.getElementById('visualizer-status-dot');
  const visualizerStatusText = document.getElementById('visualizer-status-text');
  const visualizerLevel = document.getElementById('visualizer-level');
  const audioPlaybackContainer = document.getElementById('audio-playback-container');
  const audioPlayback = document.getElementById('audio-playback');
  const btnEditTranscript = document.getElementById('btn-edit-transcript');

  // 步驟 4: 評分報告
  const resultSection = document.getElementById('result-section');
  const btnReEval = document.getElementById('btn-re-eval');
  const scoreAccuracy = document.getElementById('score-accuracy');
  const scoreStars = document.getElementById('score-stars');
  const scoreCorrectCount = document.getElementById('score-correct-count');
  const scoreMissedCount = document.getElementById('score-missed-count');
  const scoreExtraCount = document.getElementById('score-extra-count');
  const coachCommentText = document.getElementById('coach-comment-text');
  const diffVisualization = document.getElementById('diff-visualization');

  // --- 全域狀態 ---
  let isTtsPlaying = false;
  let isRecording = false;
  let recognition = null;
  let recordedTranscript = '';
  let recordTimer = null;
  let recordSeconds = 0;
  let availableVoices = [];
  let activeUtterance = null; // 重要：全域保留引用，避免 iOS Safari GC 垃圾回收導致無聲
  let ttsAudioUnlockCtx = null;

  // 硬體音訊串流與可視化狀態
  let mediaStream = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let audioContext = null;
  let analyserNode = null;
  let visualizerAnimId = null;
  let isMicTesting = false;

  // 班級同步與讀稿機狀態
  let currentClassId = localStorage.getItem('reading_coach_class_id') || '';
  let teleprompterFontSize = 'normal'; // 'smaller' | 'normal' | 'bigger'
  let isVerticalMode = false;
  let qrcodeInstance = null;
  let currentArticleTitle = '';
  let lastScoreResult = null;

  // ==========================================
  // 1. 步驟切換輔助
  // ==========================================
  function setStepActive(stepNum) {
    stepNavs.forEach((nav, idx) => {
      if (idx + 1 < stepNum) {
        nav.className = 'step-badge completed flex flex-col sm:flex-row items-center justify-center p-2 rounded-xl text-center sm:text-left transition-all';
      } else if (idx + 1 === stepNum) {
        nav.className = 'step-badge active flex flex-col sm:flex-row items-center justify-center p-2 rounded-xl text-center sm:text-left transition-all';
      } else {
        nav.className = 'step-badge flex flex-col sm:flex-row items-center justify-center p-2 rounded-xl text-center sm:text-left transition-all';
      }
    });
  }

  // ==========================================
  // ==========================================
  // 2. 文章文字輸入與讀稿機同步
  // ==========================================
  function updateTeleprompter() {
    const text = articleText.value.trim();
    if (!teleprompterText) return;
    if (!text) {
      teleprompterText.innerHTML = '<span class="text-slate-400 font-sans text-sm italic">請先於步驟 1 準備文章或選擇範例...</span>';
      return;
    }
    teleprompterText.textContent = text;
  }

  function applyTeleprompterFontSize() {
    if (!teleprompterText) return;
    teleprompterText.classList.remove('text-base', 'text-lg', 'text-xl', 'text-2xl', 'sm:text-3xl');
    if (teleprompterFontSize === 'smaller') {
      teleprompterText.classList.add('text-base');
    } else if (teleprompterFontSize === 'bigger') {
      teleprompterText.classList.add('text-2xl', 'sm:text-3xl');
    } else {
      teleprompterText.classList.add('text-lg', 'sm:text-xl');
    }
  }

  if (btnFontSmaller) {
    btnFontSmaller.addEventListener('click', () => {
      teleprompterFontSize = 'smaller';
      applyTeleprompterFontSize();
    });
  }
  if (btnFontNormal) {
    btnFontNormal.addEventListener('click', () => {
      teleprompterFontSize = 'normal';
      applyTeleprompterFontSize();
    });
  }
  if (btnFontBigger) {
    btnFontBigger.addEventListener('click', () => {
      teleprompterFontSize = 'bigger';
      applyTeleprompterFontSize();
    });
  }

  if (btnToggleVertical) {
    btnToggleVertical.addEventListener('click', () => {
      isVerticalMode = !isVerticalMode;
      if (isVerticalMode) {
        teleprompterText.classList.add('teleprompter-vertical');
        if (verticalModeText) verticalModeText.textContent = '橫排模式';
      } else {
        teleprompterText.classList.remove('teleprompter-vertical');
        if (verticalModeText) verticalModeText.textContent = '直排模式';
      }
    });
  }

  function updateCharCount() {
    const text = articleText.value;
    const chineseChars = text.replace(/[\s\p{P}]/gu, '');
    charCount.textContent = chineseChars.length;
    updateTeleprompter();
  }

  articleText.addEventListener('input', () => {
    updateCharCount();
    if (articleText.value.trim().length > 0) {
      setStepActive(2);
    }
  });

  btnClearText.addEventListener('click', () => {
    articleText.value = '';
    updateCharCount();
  });

  // --- 自訂範例庫核心邏輯 (支援 LocalStorage 持久化、自訂增刪、匯入/匯出) ---
  function getCustomSamples() {
    try {
      const data = localStorage.getItem(CUSTOM_SAMPLES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Failed to load custom samples from localStorage:', e);
      return [];
    }
  }

  function saveCustomSamples(list) {
    try {
      localStorage.setItem(CUSTOM_SAMPLES_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save custom samples to localStorage:', e);
    }
  }

  // 載入某篇範例到文章文字框
  function loadSampleContent(title, content, btnEl = null) {
    currentArticleTitle = title;
    articleText.value = content;
    updateCharCount();
    setStepActive(2);

    if (btnEl) {
      btnEl.classList.add('bg-indigo-600', 'text-white');
      setTimeout(() => {
        btnEl.classList.remove('bg-indigo-600', 'text-white');
      }, 350);
    }
  }

  // 動態渲染範例按鈕列（頂部工具列）
  function renderSampleButtons() {
    if (!sampleButtonsWrapper) return;
    sampleButtonsWrapper.innerHTML = '';

    const customSamples = getCustomSamples();

    // 1. 預設範例按鈕
    DEFAULT_SAMPLES.forEach(sample => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-btn px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium';
      btn.textContent = sample.title;
      btn.addEventListener('click', () => loadSampleContent(sample.title, sample.content, btn));
      sampleButtonsWrapper.appendChild(btn);
    });

    // 2. 自訂範例按鈕
    customSamples.forEach(sample => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-btn px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg transition font-medium flex items-center shadow-2xs';
      btn.title = `自訂範例：${sample.title} (${sample.content.length}字)`;
      btn.innerHTML = `<span class="truncate max-w-[120px]">${escapeHTML(sample.title)}</span>`;
      btn.addEventListener('click', () => loadSampleContent(sample.title, sample.content, btn));
      sampleButtonsWrapper.appendChild(btn);
    });

    // 更新管理彈窗的計數
    if (customSampleCountBadge) {
      customSampleCountBadge.textContent = `共 ${customSamples.length} 篇自訂`;
    }
  }

  // 渲染管理 Modal 裡的自訂範例列表
  function renderModalCustomList() {
    if (!modalCustomList) return;
    const customSamples = getCustomSamples();
    modalCustomList.innerHTML = '';

    if (customSamples.length === 0) {
      modalCustomList.innerHTML = `
        <div class="text-center py-6 text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
          目前尚未新增自訂範例，可利用上方表單或點擊「存為範例」建立！
        </div>
      `;
      return;
    }

    customSamples.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2 hover:border-indigo-200 transition';
      
      const charNum = item.content.replace(/[\s\p{P}]/gu, '').length;
      
      row.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-slate-800 truncate">${escapeHTML(item.title)}</div>
          <div class="text-2xs text-slate-400 truncate mt-0.5">${escapeHTML(item.content.slice(0, 30))}... (${charNum}字)</div>
        </div>
        <div class="flex items-center space-x-1 shrink-0">
          <button type="button" class="btn-load-modal px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-2xs font-semibold rounded-lg transition">載入</button>
          <button type="button" class="btn-delete-modal p-1 text-slate-400 hover:text-rose-500 rounded-lg transition" title="刪除此範例">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;

      // 載入按鈕
      row.querySelector('.btn-load-modal').addEventListener('click', () => {
        loadSampleContent(item.title, item.content);
        closeSampleModal();
      });

      // 刪除按鈕
      row.querySelector('.btn-delete-modal').addEventListener('click', () => {
        if (confirm(`確定要刪除範例「${item.title}」嗎？`)) {
          deleteCustomSample(item.id);
        }
      });

      modalCustomList.appendChild(row);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // 刪除自訂範例
  function deleteCustomSample(id) {
    let customSamples = getCustomSamples();
    customSamples = customSamples.filter(item => item.id !== id);
    saveCustomSamples(customSamples);
    renderSampleButtons();
    renderModalCustomList();
  }

  // Modal 彈窗控制
  function openSampleModal(prefillTitle = '', prefillContent = '') {
    if (modalSampleTitle) modalSampleTitle.value = prefillTitle;
    if (modalSampleContent) modalSampleContent.value = prefillContent;
    renderModalCustomList();
    if (sampleModal) sampleModal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  function closeSampleModal() {
    if (sampleModal) sampleModal.classList.add('hidden');
  }

  // 儲存新自訂範例
  function handleSaveNewSample() {
    const title = (modalSampleTitle.value || '').trim();
    const content = (modalSampleContent.value || '').trim();

    if (!title) {
      alert('請輸入範例名稱或標題！');
      modalSampleTitle.focus();
      return;
    }

    if (!content) {
      alert('請輸入範例文章內容！');
      modalSampleContent.focus();
      return;
    }

    const customSamples = getCustomSamples();
    const newItem = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title,
      content: content,
      createdAt: Date.now()
    };

    customSamples.unshift(newItem); // 加到最前面
    saveCustomSamples(customSamples);

    renderSampleButtons();
    renderModalCustomList();

    // 清空表單
    modalSampleTitle.value = '';
    modalSampleContent.value = '';

    alert(`🎉 成功新增自訂範例：「${title}」！已儲存至瀏覽器。`);
  }

  // 快捷「存為範例」按鈕（文字框右下角）
  if (btnSaveAsSampleQuick) {
    btnSaveAsSampleQuick.addEventListener('click', () => {
      const currentText = articleText.value.trim();
      if (!currentText) {
        alert('請先在文字框中輸入或拍照辨識文章，才能存為範例喔！');
        articleText.focus();
        return;
      }
      // 自動推測一個預設標題（取前 10 個字）
      const guessedTitle = currentText.slice(0, 10).replace(/[\n\s\p{P}]/gu, '') || '自訂文章';
      openSampleModal(guessedTitle, currentText);
    });
  }

  // Modal 事件綁定
  if (btnOpenAddSample) {
    btnOpenAddSample.addEventListener('click', () => {
      const currentText = articleText.value.trim();
      openSampleModal('', currentText);
    });
  }

  if (btnOpenManageSamples) {
    btnOpenManageSamples.addEventListener('click', () => {
      openSampleModal('', '');
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeSampleModal);
  if (btnCloseModalBottom) btnCloseModalBottom.addEventListener('click', closeSampleModal);

  // 點擊 Modal 背景關閉
  if (sampleModal) {
    sampleModal.addEventListener('click', (e) => {
      if (e.target === sampleModal) closeSampleModal();
    });
  }

  if (btnModalPasteCurrent) {
    btnModalPasteCurrent.addEventListener('click', () => {
      if (modalSampleContent) {
        modalSampleContent.value = articleText.value.trim();
      }
    });
  }

  if (btnSaveSample) {
    btnSaveSample.addEventListener('click', handleSaveNewSample);
  }

  // 匯出備份 JSON
  if (btnExportSamples) {
    btnExportSamples.addEventListener('click', () => {
      const customSamples = getCustomSamples();
      if (customSamples.length === 0) {
        alert('目前還沒有任何自訂範例可匯出喔！');
        return;
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customSamples, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `reading_samples_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // 匯入 JSON
  if (importSamplesFile) {
    importSamplesFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            const current = getCustomSamples();
            const currentIds = new Set(current.map(item => item.id));
            let addedCount = 0;
            imported.forEach(item => {
              if (item.title && item.content) {
                if (!item.id || currentIds.has(item.id)) {
                  item.id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
                }
                current.push(item);
                addedCount++;
              }
            });
            saveCustomSamples(current);
            renderSampleButtons();
            renderModalCustomList();
            alert(`🎉 成功匯入 ${addedCount} 篇自訂範例！`);
          } else {
            alert('匯入的檔案格式不正確，需為範例 JSON 陣列！');
          }
        } catch (err) {
          alert('解析 JSON 檔案失敗，請確認檔案格式是否正確。');
        }
        importSamplesFile.value = '';
      };
      reader.readAsText(file);
    });
  }

  // ==========================================
  // --- 100% 跨瀏覽器零失敗：自帶教材分享 (Data-in-URL) & Google 試算表連動 ---
  // ==========================================
  // 安全 UTF-8 Base64 編碼（支援繁體中文字元）
  function encodeSamplesData(samples) {
    try {
      const jsonStr = JSON.stringify(samples);
      const utf8Bytes = new TextEncoder().encode(jsonStr);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binary += String.fromCharCode(utf8Bytes[i]);
      }
      return btoa(binary);
    } catch (e) {
      return encodeURIComponent(JSON.stringify(samples));
    }
  }

  function decodeSamplesData(encodedStr) {
    try {
      const binary = atob(encodedStr);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonStr = new TextDecoder().decode(bytes);
      return JSON.parse(jsonStr);
    } catch (e) {
      try {
        return JSON.parse(decodeURIComponent(encodedStr));
      } catch (err) {
        return null;
      }
    }
  }

  // 取得目前欲分享之班級代碼
  const shareClassCodeInput = document.getElementById('share-class-code-input');
  const qrModeBadge = document.getElementById('qr-mode-badge');
  const qrCodeStatusMsg = document.getElementById('qr-code-status-msg');
  const btnQrDirectSite = document.getElementById('btn-qr-direct-site');
  const btnQrCloudMaterials = document.getElementById('btn-qr-cloud-materials');

  function getTargetClassCode() {
    if (shareClassCodeInput && shareClassCodeInput.value.trim()) {
      return shareClassCodeInput.value.trim();
    }
    const student = window.ReadingCoachFirebase ? window.ReadingCoachFirebase.getCurrentStudent() : null;
    if (student && student.classId && student.classId !== 'Google帳號') {
      return student.classId;
    }
    return currentClassId || '301';
  }

  // 100% 防空白、安全可靠的 QRCode 渲染引擎 (含自動防溢位備援)
  function renderSafeQRCode(container, targetUrl, size = 200) {
    if (!container) return;
    container.innerHTML = '';

    let isSuccess = false;

    // 優先使用本地 QRCode.js 引擎 (採用 CorrectLevel.L 獲得最低密度與最大黑白方塊，平板相機最好對焦)
    if (window.QRCode) {
      try {
        new QRCode(container, {
          text: targetUrl,
          width: size,
          height: size,
          colorDark: '#1e1b4b',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.L
        });

        // 檢查是否有產生有效的 canvas 或 img
        const canvas = container.querySelector('canvas');
        const img = container.querySelector('img');
        if (canvas || (img && img.src)) {
          isSuccess = true;
        }
      } catch (err) {
        console.warn('QRCode 本地渲染因長度或瀏覽器異常拋出錯誤，無縫切換備援引擎：', err);
        isSuccess = false;
      }
    }

    // 備援保證機制：若本機 JS 引擎因字串過長或 DOM 限制無法產圖，使用高可用 CDN QR 引擎，100% 絕不留白！
    if (!isSuccess) {
      const safeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=4&data=${encodeURIComponent(targetUrl)}`;
      container.innerHTML = `
        <img src="${safeApiUrl}" alt="全班學生連線 QR Code" class="w-[${size}px] h-[${size}px] max-w-full rounded-xl shadow-xs" loading="eager" />
      `;
    }
  }

  // 產生學生直達網址（智慧模式：優先 Firebase 雲端短網址，長度極短永不溢位）
  async function generateStudentShareUrl(forcedMode = 'auto') {
    const classId = getTargetClassCode();
    const customSamples = getCustomSamples();
    const base = window.location.origin + window.location.pathname;

    // 模式 1：純網站首頁直達
    if (forcedMode === 'site') {
      return {
        url: base,
        mode: 'site',
        desc: '直達網站入口：學生掃描後開啟智慧朗讀教練網站'
      };
    }

    // 模式 2：Firebase 雲端教材同步 (推薦，長度只有約 50 個字元，QR Code 最清晰最好掃)
    if (window.ReadingCoachFirebase && window.ReadingCoachFirebase.isFirebaseReady()) {
      if (customSamples.length > 0) {
        try {
          await window.ReadingCoachFirebase.publishClassMaterials(classId, customSamples);
        } catch (e) {
          console.warn('發布班級教材至雲端提示：', e);
        }
      }
      return {
        url: `${base}?class=${encodeURIComponent(classId)}`,
        mode: 'cloud',
        desc: `☁️ 雲端同步模式：學生掃描後將自動載入【${classId} 班】專屬課文教材與設定！`
      };
    }

    // 模式 3：若尚未連線 Firebase，使用本機自帶封包（短課文）或直達入口（長課文防溢位）
    if (customSamples.length > 0) {
      const token = encodeSamplesData(customSamples);
      // 若 Token 小於 800 字元，安全放入 URL Hash
      if (token.length < 800) {
        return {
          url: `${base}#share=${token}`,
          mode: 'local_token',
          desc: `自帶教材模式：已將 ${customSamples.length} 篇課文打包，掃描秒載入！`
        };
      }
    }

    // 預設或課文過長時：回傳帶有班級參數的簡潔直達網址，防爆碼
    return {
      url: `${base}?class=${encodeURIComponent(classId)}`,
      mode: 'simple_class',
      desc: `直達班級入口：學生掃描後將進入網站並綁定【${classId} 班】！`
    };
  }

  // 顯示學生 QR Code 彈窗
  async function showStudentQrCodePopup(forcedMode = 'auto') {
    if (!qrCodePopup || !studentQrcodeBox) return;

    qrCodePopup.classList.remove('hidden');
    studentQrcodeBox.innerHTML = '<div class="text-xs text-slate-400 p-6 flex items-center justify-center"><i data-lucide="loader" class="w-4 h-4 mr-2 animate-spin text-indigo-500"></i>正在生成高畫質 QR Code...</div>';
    if (window.lucide) window.lucide.createIcons();

    if (shareClassCodeInput && !shareClassCodeInput.value) {
      shareClassCodeInput.value = getTargetClassCode();
    }

    const shareData = await generateStudentShareUrl(forcedMode);
    currentGeneratedShareUrl = shareData.url;

    // 渲染 QR Code (大尺寸 200x200，保證清晰)
    renderSafeQRCode(studentQrcodeBox, shareData.url, 200);

    if (qrCodeStatusMsg) {
      qrCodeStatusMsg.innerHTML = `<span class="font-semibold text-indigo-900">${escapeHTML(shareData.desc)}</span><br><span class="text-2xs text-slate-400 break-all">${escapeHTML(shareData.url)}</span>`;
    }

    if (qrModeBadge) {
      if (shareData.mode === 'cloud') {
        qrModeBadge.className = 'text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
        qrModeBadge.textContent = '🟢 雲端短碼模式 (極致清晰)';
      } else {
        qrModeBadge.className = 'text-2xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200';
        qrModeBadge.textContent = '🔵 課堂直達模式';
      }
    }

    qrCodePopup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  let currentGeneratedShareUrl = '';

  // 投影學生 QR Code 按鈕事件
  if (btnShowStudentQr) {
    btnShowStudentQr.addEventListener('click', () => {
      showStudentQrCodePopup('auto');
    });
  }

  // 切換模式按鈕
  if (btnQrDirectSite) {
    btnQrDirectSite.addEventListener('click', () => {
      showStudentQrCodePopup('site');
    });
  }

  if (btnQrCloudMaterials) {
    btnQrCloudMaterials.addEventListener('click', () => {
      showStudentQrCodePopup('cloud');
    });
  }

  // 複製學生直達網址
  if (btnCopyStudentLink) {
    btnCopyStudentLink.addEventListener('click', async () => {
      const shareData = await generateStudentShareUrl('auto');
      const shareUrl = shareData.url;
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert(`📋 已複製學生直達網址！\n\n網址：${shareUrl}\n傳到學生平板或群組，點開立刻同步！`);
      } catch (e) {
        prompt('請手動複製下方學生直達網址：', shareUrl);
      }
    });
  }

  // 學生端載入時（跨任何瀏覽器、任何裝置）自動解包或從 Firebase 雲端讀取班級教材
  async function checkAndLoadSharedSamples() {
    let rawToken = '';
    let targetClass = '';
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    // 檢查班級參數
    if (params.get('class')) {
      targetClass = params.get('class');
    } else if (hash && hash.startsWith('#class=')) {
      targetClass = hash.replace('#class=', '');
    }

    if (targetClass) {
      currentClassId = targetClass;
      localStorage.setItem('reading_coach_class_id', targetClass);
      if (currentClassBadgeText) currentClassBadgeText.textContent = `${targetClass} 班同步`;
      if (loginInputClass) loginInputClass.value = targetClass;

      // 若 Firebase 已連線，自動嘗試從 Firestore 下載該班最新的課文教材
      if (window.ReadingCoachFirebase && window.ReadingCoachFirebase.isFirebaseReady()) {
        try {
          const classData = await window.ReadingCoachFirebase.fetchClassMaterials(targetClass);
          if (classData && Array.isArray(classData.materials) && classData.materials.length > 0) {
            const current = getCustomSamples();
            const currentTitles = new Set(current.map(i => i.title));
            let addedCount = 0;
            classData.materials.forEach(item => {
              if (item.title && item.content && !currentTitles.has(item.title)) {
                current.unshift(item);
                addedCount++;
              }
            });
            if (addedCount > 0) {
              saveCustomSamples(current);
              renderSampleButtons();
              renderModalCustomList();
              if (classData.materials[0]) {
                loadSampleContent(classData.materials[0].title, classData.materials[0].content);
              }
            }
          }
        } catch (e) {
          console.warn('載入雲端教材提示：', e);
        }
      }
    }

    // 檢查 URL Token 自帶教材 (相容舊版)
    if (hash && hash.startsWith('#share=')) {
      rawToken = hash.replace('#share=', '');
    } else if (params.get('share')) {
      rawToken = params.get('share');
    }

    if (rawToken) {
      const imported = decodeSamplesData(rawToken);
      if (Array.isArray(imported) && imported.length > 0) {
        const current = getCustomSamples();
        const currentTitles = new Set(current.map(i => i.title));
        let addedCount = 0;
        imported.forEach(item => {
          if (item.title && item.content) {
            if (!currentTitles.has(item.title)) {
              current.unshift({
                id: 'shared_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                title: item.title,
                content: item.content,
                createdAt: Date.now()
              });
              addedCount++;
            }
          }
        });
        saveCustomSamples(current);
        renderSampleButtons();
        renderModalCustomList();

        // 自動將第一篇課文載入文字框與讀稿窗
        if (imported[0] && imported[0].content) {
          loadSampleContent(imported[0].title, imported[0].content);
        }

        // 清理網址中的長 Hash，保持乾淨
        try {
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (e) {}
      }
    }
  }

  checkAndLoadSharedSamples();

  // 進階方式：Google Sheets 試算表連動
  const sheetsUrlInput = document.getElementById('sheets-url-input');
  const btnSyncSheets = document.getElementById('btn-sync-sheets');

  if (btnSyncSheets && sheetsUrlInput) {
    btnSyncSheets.addEventListener('click', async () => {
      const rawUrl = sheetsUrlInput.value.trim();
      if (!rawUrl) {
        alert('請先貼上 Google 試算表共用網址！');
        sheetsUrlInput.focus();
        return;
      }

      const match = rawUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        alert('無法識別 Google 試算表網址，請確認格式為：\nhttps://docs.google.com/spreadsheets/d/試算表ID/edit');
        return;
      }
      const sheetId = match[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

      btnSyncSheets.disabled = true;
      btnSyncSheets.textContent = '連線同步中...';

      try {
        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error('無法讀取試算表，請確認試算表「共用」已設為「知道連結的使用者均可檢視」！');
        const csvText = await res.text();

        const lines = csvText.split(/\r?\n/).filter(line => line.trim());
        const imported = [];
        lines.forEach((line, idx) => {
          if (idx === 0 && (line.includes('標題') || line.includes('Title'))) return;
          const parts = line.split(',');
          if (parts.length >= 2) {
            const title = parts[0].replace(/^["']|["']$/g, '').trim();
            const content = parts.slice(1).join(',').replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
            if (title && content) {
              imported.push({ id: 'gsheet_' + Date.now() + '_' + idx, title, content, createdAt: Date.now() });
            }
          }
        });

        if (imported.length > 0) {
          saveCustomSamples(imported);
          renderSampleButtons();
          renderModalCustomList();
          alert(`🎉 成功從 Google 試算表同步 ${imported.length} 篇課文！`);
        } else {
          alert('試算表中未找到課文資料，請確保 A 欄為標題、B 欄為文章內容！');
        }
      } catch (err) {
        alert(`同步失敗：${err.message}`);
      } finally {
        btnSyncSheets.disabled = false;
        btnSyncSheets.textContent = '同步試算表';
      }
    });
  }

  if (btnClassSync) {
    btnClassSync.addEventListener('click', () => {
      openSampleModal('', '');
    });
  }

  // 初始渲染範例按鈕列
  renderSampleButtons();

  // ==========================================
  // 3. 圖片上傳與 OCR 文字辨識 (Tesseract.js)
  // ==========================================
  dropZone.addEventListener('click', (e) => {
    if (e.target !== btnRemoveImage && !btnRemoveImage.contains(e.target)) {
      imageInput.click();
    }
  });

  btnBrowse.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-indigo-500', 'bg-indigo-50/40');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/40');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageFile(files[0]);
    }
  });

  imageInput.addEventListener('change', () => {
    if (imageInput.files.length > 0) {
      handleImageFile(imageInput.files[0]);
    }
  });

  btnRemoveImage.addEventListener('click', (e) => {
    e.stopPropagation();
    resetImagePreview();
  });

  function resetImagePreview() {
    imageInput.value = '';
    imagePreview.src = '';
    previewWrapper.classList.add('hidden');
    uploadPrompt.classList.remove('hidden');
    ocrStatusCard.classList.add('hidden');
  }

  async function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      imagePreview.src = e.target.result;
      uploadPrompt.classList.add('hidden');
      previewWrapper.classList.remove('hidden');

      // 開始 OCR
      await runOCR(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function runOCR(imageSource) {
    ocrStatusCard.classList.remove('hidden');
    ocrProgressBar.style.width = '0%';
    ocrProgressPercent.textContent = '0%';
    ocrStatusText.innerHTML = `<i data-lucide="loader" class="w-4 h-4 mr-1.5 animate-spin text-indigo-600"></i>AI 正在載入繁體中文辨識模型...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const worker = await Tesseract.createWorker('chi_tra+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            ocrProgressBar.style.width = `${progress}%`;
            ocrProgressPercent.textContent = `${progress}%`;
            ocrStatusText.innerHTML = `<i data-lucide="loader" class="w-4 h-4 mr-1.5 animate-spin text-indigo-600"></i>正在辨識圖片文章中 (${progress}%)...`;
            if (window.lucide) window.lucide.createIcons();
          } else if (m.status === 'loading tesseract core') {
            ocrStatusText.innerHTML = `正在初始化辨識引擎...`;
          } else if (m.status.includes('loading language')) {
            ocrStatusText.innerHTML = `正在下載/載入中文詞庫...`;
          }
        }
      });

      const ret = await worker.recognize(imageSource);
      await worker.terminate();

      let recognizedText = ret.data.text.trim();
      // 稍微整理 OCR 常見的額外多餘換行
      recognizedText = recognizedText.replace(/\n\s*\n/g, '\n');

      if (recognizedText.length > 0) {
        articleText.value = recognizedText;
        updateCharCount();
        setStepActive(2);

        ocrStatusCard.classList.remove('hidden');
        ocrProgressBar.style.width = '100%';
        ocrProgressPercent.textContent = '100%';
        ocrStatusText.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 mr-1.5 text-emerald-600"></i>辨識完成！可於右側檢視或修正文字`;
      } else {
        ocrStatusText.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 mr-1.5 text-amber-600"></i>未能在圖片中辨識出文字，請手動輸入`;
      }
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      console.error('OCR Error:', err);
      ocrStatusText.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 mr-1.5 text-rose-600"></i>辨識發生錯誤，請手動輸入文字`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // ==========================================
  // 4. 示範朗讀功能 (Web Speech Synthesis - 手機與桌面完美適配)
  // ==========================================
  // 行動裝置音訊解鎖（解決 iOS Safari 首次靜音）
  function unlockMobileAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!ttsAudioUnlockCtx) {
        ttsAudioUnlockCtx = new AudioCtx();
      }
      if (ttsAudioUnlockCtx.state === 'suspended') {
        ttsAudioUnlockCtx.resume();
      }
      const buffer = ttsAudioUnlockCtx.createBuffer(1, 1, 22050);
      const src = ttsAudioUnlockCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(ttsAudioUnlockCtx.destination);
      src.start(0);
    } catch (e) {}
  }

  function getBestChineseVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. 優先尋找台灣 zh-TW 繁中語音 (如 Mei-Jia, HanHan, 台灣國語)
    let v = voices.find(item => item.lang === 'zh-TW' || item.lang === 'zh_TW' || item.name.includes('Taiwan') || item.name.includes('Mei-Jia') || item.name.includes('HanHan'));
    if (v) return v;

    // 2. 次選香港繁中 zh-HK (如 Sin-Ji)
    v = voices.find(item => item.lang.startsWith('zh-HK') || item.name.includes('Hong Kong') || item.name.includes('Sin-Ji'));
    if (v) return v;

    // 3. 次選任何中文
    v = voices.find(item => item.lang.startsWith('zh'));
    return v || null;
  }

  function initTTSVoices() {
    if (!('speechSynthesis' in window)) {
      ttsStatusMsg.textContent = '此瀏覽器不支援 Web Speech API 語音合成';
      return;
    }

    function populateVoices() {
      availableVoices = window.speechSynthesis.getVoices();
      ttsVoiceSelect.innerHTML = '';

      const chineseVoices = availableVoices.filter(v => v.lang.startsWith('zh'));
      const voiceList = chineseVoices.length > 0 ? chineseVoices : availableVoices;

      voiceList.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.lang === 'zh-TW' || voice.name.includes('Taiwan') || voice.name.includes('Mei-Jia') || voice.name.includes('HanHan')) {
          option.selected = true;
        }
        ttsVoiceSelect.appendChild(option);
      });

      if (ttsVoiceSelect.children.length === 0) {
        const option = document.createElement('option');
        option.textContent = '系統預設中文語音';
        option.value = '';
        ttsVoiceSelect.appendChild(option);
      }
    }

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  initTTSVoices();

  function stopTTS() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtterance = null;
    isTtsPlaying = false;
    ttsPlayText.textContent = '播放示範朗讀';
    btnTtsPlay.classList.remove('bg-amber-600', 'hover:bg-amber-700');
    btnTtsPlay.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
    btnTtsStop.disabled = true;
    ttsDot.className = 'w-2 h-2 rounded-full bg-slate-300 mr-2';
    ttsStatusMsg.textContent = '準備就緒，點擊播放即可聆聽示範';
  }

  function playTTS() {
    const text = articleText.value.trim();
    if (!text) {
      alert('請先輸入或上傳要朗讀的文章！');
      articleText.focus();
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('抱歉，您的手機瀏覽器不支援語音朗讀功能！');
      return;
    }

    // 1. 解鎖行動端硬體音訊通道
    unlockMobileAudio();

    // 2. 取消先前的朗讀，但延遲啟動以防 iOS 取消事件競爭
    window.speechSynthesis.cancel();

    setTimeout(() => {
      // 建立全新實例並保留在全域變數，防止 iOS Safari 垃圾回收 (Garbage Collection)
      const utterance = new SpeechSynthesisUtterance(text);
      activeUtterance = utterance;

      utterance.rate = parseFloat(ttsSpeedSelect.value) || 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'zh-TW';

      // 智慧配對語音
      const voices = window.speechSynthesis.getVoices();
      const selectedVoiceName = ttsVoiceSelect.value;
      let matchedVoice = voices.find(v => v.name === selectedVoiceName) || getBestChineseVoice();

      if (matchedVoice) {
        utterance.voice = matchedVoice;
        utterance.lang = matchedVoice.lang || 'zh-TW';
      }

      utterance.onstart = () => {
        isTtsPlaying = true;
        ttsPlayText.textContent = '暫停示範';
        btnTtsPlay.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
        btnTtsPlay.classList.add('bg-amber-600', 'hover:bg-amber-700');
        btnTtsStop.disabled = false;
        ttsDot.className = 'w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse';
        ttsStatusMsg.textContent = '正在示範朗讀...（手機若無聲請確認側邊靜音撥片與音量）';
      };

      utterance.onend = () => {
        activeUtterance = null;
        stopTTS();
        ttsStatusMsg.textContent = '示範朗讀結束！現在換您試試看囉（前往步驟 3）';
        setStepActive(3);
      };

      utterance.onerror = (e) => {
        console.warn('TTS Error:', e);
        activeUtterance = null;
        stopTTS();
      };

      window.speechSynthesis.speak(utterance);
    }, 50);
  }

  btnTtsPlay.addEventListener('click', () => {
    if (isTtsPlaying) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        ttsPlayText.textContent = '暫停示範';
      } else {
        window.speechSynthesis.pause();
        ttsPlayText.textContent = '繼續播放';
        ttsStatusMsg.textContent = '已暫停朗讀';
      }
    } else {
      playTTS();
    }
  });

  btnTtsStop.addEventListener('click', stopTTS);

  // ==========================================
  // 5. 使用者朗讀錄音 (MediaRecorder + 語音辨識 + 即時波形)
  // ==========================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    sttSupportTag.textContent = '未支援語音辨識（可錄音回放與手動微調比對）';
    sttSupportTag.className = 'text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
  }

  let isRecordingSessionActive = false;
  let sessionBaseTranscript = ''; // 跨 instance 累加的已確認文字

  // --- 音訊視覺化 Canvas 初始化與繪製 ---
  function initVisualizerCanvas() {
    if (!visualizerCanvas) return;
    const ctx = visualizerCanvas.getContext('2d');
    const width = visualizerCanvas.width = visualizerCanvas.clientWidth || 320;
    const height = visualizerCanvas.height = visualizerCanvas.clientHeight || 48;
    
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  initVisualizerCanvas();

  function startAudioVisualizer(stream) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioCtx();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 64;
      source.connect(analyserNode);

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const ctx = visualizerCanvas.getContext('2d');

      function draw() {
        if (!isRecordingSessionActive && !isMicTesting) {
          initVisualizerCanvas();
          return;
        }

        visualizerAnimId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);

        const width = visualizerCanvas.width;
        const height = visualizerCanvas.height;
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);

        let sum = 0;
        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.9;
          sum += dataArray[i];

          // 頻譜漸層色
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(0.5, '#06b6d4');
          gradient.addColorStop(1, '#818cf8');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
          x += barWidth;
        }

        const avg = sum / bufferLength;
        const volumePercent = Math.min(100, Math.round((avg / 128) * 100));
        visualizerLevel.textContent = `音量: ${volumePercent}%`;

        if (volumePercent > 4) {
          visualizerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse';
          visualizerStatusText.textContent = '收音訊號良好 🟢';
        } else {
          visualizerStatusDot.className = 'w-2 h-2 rounded-full bg-amber-400 mr-1.5';
          visualizerStatusText.textContent = '等待聲音輸入中...';
        }
      }

      draw();
    } catch (err) {
      console.warn('Audio visualizer error:', err);
    }
  }

  function stopAudioVisualizer() {
    if (visualizerAnimId) {
      cancelAnimationFrame(visualizerAnimId);
      visualizerAnimId = null;
    }
    visualizerStatusDot.className = 'w-2 h-2 rounded-full bg-slate-500 mr-1.5';
    visualizerStatusText.textContent = '麥克風待命中';
    visualizerLevel.textContent = '音量: 0%';
    initVisualizerCanvas();
  }

  // --- 麥克風測試功能 (3秒快速自檢) ---
  btnTestMic.addEventListener('click', async () => {
    if (isRecording || isMicTesting) return;
    try {
      btnTestMic.disabled = true;
      btnTestMic.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 mr-1 animate-spin text-indigo-600"></i>正在測試麥克風...`;
      if (window.lucide) window.lucide.createIcons();

      const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isMicTesting = true;
      startAudioVisualizer(testStream);

      recordHint.textContent = '🎙️ 正在測試麥克風：請對著平板/電腦發出聲音，觀察上方波形條...';

      setTimeout(() => {
        isMicTesting = false;
        testStream.getTracks().forEach(t => t.stop());
        stopAudioVisualizer();
        btnTestMic.disabled = false;
        btnTestMic.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 mr-1 text-emerald-600"></i>麥克風正常！`;
        recordHint.textContent = '✅ 麥克風測試完畢！請點擊下方紅色按鈕開始正式朗讀。';
        if (window.lucide) window.lucide.createIcons();
      }, 4000);
    } catch (err) {
      console.error('Mic test error:', err);
      btnTestMic.disabled = false;
      btnTestMic.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 mr-1 text-rose-500"></i>無法使用麥克風`;
      alert('無法存取麥克風！請確認平板或瀏覽器設定已允許「麥克風權限」。');
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // --- 徹底銷毀語音辨識器 ---
  function cleanupRecognition() {
    if (recognition) {
      try {
        recognition.onstart = null;
        recognition.onaudiostart = null;
        recognition.onspeechstart = null;
        recognition.onspeechend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      } catch (e) {}
      recognition = null;
    }
  }

  // --- 安全啟動語音辨識器 ---
  function launchRecognitionInstance() {
    if (!isRecordingSessionActive || !SpeechRecognition) return;

    cleanupRecognition();

    try {
      const inst = new SpeechRecognition();
      recognition = inst;
      inst.lang = 'zh-TW';
      inst.continuous = true;
      inst.interimResults = true;
      inst.maxAlternatives = 1;

      let localFinalText = '';

      inst.onstart = () => {
        if (!isRecordingSessionActive) {
          cleanupRecognition();
          return;
        }
      };

      inst.onresult = (event) => {
        if (!isRecordingSessionActive) return;

        let interimText = '';
        localFinalText = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            localFinalText += item[0].transcript;
          } else {
            interimText += item[0].transcript;
          }
        }

        const totalFinal = sessionBaseTranscript + localFinalText;
        recordedTranscript = totalFinal + interimText;

        sttResultBox.innerHTML = `<span>${escapeHTML(totalFinal)}</span><span class="text-slate-400 italic">${escapeHTML(interimText)}</span>`;
        const pureRecordedChars = recordedTranscript.replace(/[\s\p{P}]/gu, '');
        recordedCharCount.textContent = `${pureRecordedChars.length} 字`;
      };

      inst.onerror = (event) => {
        console.warn('SpeechRecognition notice:', event.error);
        if (event.error === 'not-allowed') {
          stopRecording(false);
          alert('請允許麥克風權限以進行語音識別！');
        }
      };

      inst.onend = () => {
        if (isRecordingSessionActive) {
          sessionBaseTranscript += localFinalText;
          localFinalText = '';
          setTimeout(() => {
            if (isRecordingSessionActive) launchRecognitionInstance();
          }, 60);
        }
      };

      inst.start();
    } catch (err) {
      console.warn('Recognition start exception:', err);
    }
  }

  // --- 開始錄音 (硬體串流 + 語音辨識雙保險) ---
  async function startRecording() {
    const text = articleText.value.trim();
    if (!text) {
      alert('請先準備文章內容再開始錄音！');
      return;
    }

    // 若示範朗讀還在播放，先行停止
    stopTTS();

    try {
      // 1. 取得真實硬體麥克風串流 (100% 穩定，不受網路影響)
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (micErr) {
      console.error('Microphone access denied:', micErr);
      alert('無法開啟麥克風！請檢查瀏覽器麥克風權限設定。');
      return;
    }

    // 重設狀態與文字
    isRecordingSessionActive = true;
    isRecording = true;
    sessionBaseTranscript = '';
    recordedTranscript = '';
    audioChunks = [];
    sttResultBox.innerHTML = '<span class="text-slate-400 italic">正在聆聽您的朗讀，請大聲唸出課文...</span>';
    recordedCharCount.textContent = '0 字';
    audioPlaybackContainer.classList.add('hidden');

    // 2. 啟動即時動態音量波形
    startAudioVisualizer(mediaStream);

    // 3. 啟動 MediaRecorder 本地真實錄音
    try {
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
      let selectedMime = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      mediaRecorder = selectedMime ? new MediaRecorder(mediaStream, { mimeType: selectedMime }) : new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };
      mediaRecorder.start(200);
    } catch (recErr) {
      console.warn('MediaRecorder init warning:', recErr);
    }

    // 4. 啟動 SpeechRecognition 進行繁中語音即時轉文字
    launchRecognitionInstance();

    // 更新 UI 狀態
    recordBtnText.textContent = '結束朗讀';
    btnRecord.classList.add('recording-active');
    recordingPulse.classList.remove('hidden');
    recordingTime.classList.remove('hidden');
    recordHint.textContent = '🔴 錄音中！請直接看上方讀稿窗朗讀，完成後再次點擊按鈕';
    setStepActive(3);

    // 讀稿窗高亮鎖定與捲動防禦（避免手勢上下滑動中斷音訊）
    document.body.classList.add('recording-active-mode');
    if (teleprompterBox) {
      teleprompterBox.classList.add('teleprompter-recording');
      // 自動平滑將讀稿窗置於眼前，徹底免去使用者用手滑動螢幕的需求！
      setTimeout(() => {
        teleprompterBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    // 計時器啟動
    if (recordTimer) clearInterval(recordTimer);
    recordSeconds = 0;
    updateRecordTimerUI();
    recordTimer = setInterval(() => {
      recordSeconds++;
      updateRecordTimerUI();
    }, 1000);
  }

  function updateRecordTimerUI() {
    const mins = Math.floor(recordSeconds / 60).toString().padStart(2, '0');
    const secs = (recordSeconds % 60).toString().padStart(2, '0');
    recordingTime.textContent = `${mins}:${secs}`;
  }

  // --- 停止錄音與處理音訊回放 ---
  function stopRecording(triggerEvaluation = true) {
    if (!isRecording && !isRecordingSessionActive) return;

    isRecordingSessionActive = false;
    isRecording = false;

    // 解除讀稿窗高亮與滑動防護
    document.body.classList.remove('recording-active-mode');
    if (teleprompterBox) {
      teleprompterBox.classList.remove('teleprompter-recording');
    }

    if (recordTimer) {
      clearInterval(recordTimer);
      recordTimer = null;
    }

    // 徹底釋放語音辨識器
    cleanupRecognition();

    // 停止 MediaRecorder 並產生音訊回放
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.onstop = () => {
          if (audioChunks.length > 0) {
            const blobType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: blobType });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayback.src = audioUrl;
            audioPlaybackContainer.classList.remove('hidden');
          }
        };
        mediaRecorder.stop();
      } catch (e) {}
    }

    // 關閉硬體串流與波形動畫
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
    }
    stopAudioVisualizer();

    recordBtnText.textContent = '重新朗讀';
    btnRecord.classList.remove('recording-active');
    recordingPulse.classList.add('hidden');
    recordHint.textContent = '錄音結束！可於下方回放您的聲音，並查看正確率報告';

    // 若有錄音文字，觸發評分；若語音辨識因遠端中斷為空，提供貼心救援
    if (triggerEvaluation) {
      setTimeout(() => {
        if (!recordedTranscript.trim()) {
          // 語音伺服器未辨識到文字的救援處理
          const fallbackText = prompt('🎙️ 您的音訊已成功錄製！但瀏覽器語音伺服器暫未傳回文字（可能因網路延遲）。\n\n您可以直接在此確認或輸入您剛才唸出的句子：', articleText.value.trim());
          if (fallbackText) {
            recordedTranscript = fallbackText;
            sttResultBox.innerHTML = `<span>${escapeHTML(fallbackText)}</span>`;
            const pureChars = fallbackText.replace(/[\s\p{P}]/gu, '');
            recordedCharCount.textContent = `${pureChars.length} 字`;
          }
        }
        evaluateReading();
        setStepActive(4);
        resultSection.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }

  // --- 手動微調聽辨文字按鈕 ---
  btnEditTranscript.addEventListener('click', () => {
    const current = recordedTranscript || '';
    const newText = prompt('微調修改剛才錄音辨識出的內容：', current);
    if (newText !== null) {
      recordedTranscript = newText;
      sttResultBox.innerHTML = `<span>${escapeHTML(newText)}</span>`;
      const pureChars = newText.replace(/[\s\p{P}]/gu, '');
      recordedCharCount.textContent = `${pureChars.length} 字`;
      evaluateReading();
    }
  });

  // 全域滑動手勢與可視狀態守護：避免手機滑動時 AudioContext 被系統掛起
  function keepAudioAliveOnScroll() {
    if (isRecordingSessionActive && audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  }
  window.addEventListener('scroll', keepAudioAliveOnScroll, { passive: true });
  window.addEventListener('touchmove', keepAudioAliveOnScroll, { passive: true });
  document.addEventListener('visibilitychange', keepAudioAliveOnScroll);

  btnRecord.addEventListener('click', () => {
    if (isRecording) {
      stopRecording(true);
    } else {
      startRecording();
    }
  });

  // ==========================================
  // 6. 比對評分與視覺化診斷演算法 (LCS + Diff)
  // ==========================================
  function evaluateReading() {
    const rawTarget = articleText.value.trim();
    const rawSpoken = recordedTranscript.trim();

    if (!rawTarget) {
      alert('請先輸入標準文章');
      return;
    }

    if (!rawSpoken) {
      // 未錄到聲音
      scoreAccuracy.textContent = '0';
      scoreCorrectCount.textContent = '0';
      scoreMissedCount.textContent = '0';
      scoreExtraCount.textContent = '0';
      coachCommentText.textContent = '未偵測到清楚的語音輸入，請確認麥克風是否正常運作並大聲朗讀喔！';
      diffVisualization.innerHTML = '<span class="text-rose-500 font-sans">未錄到任何聲音，請點擊錄音按鈕再次嘗試。</span>';
      renderStars(0);
      return;
    }

    // 1. 純中文字元提取（過濾標點與空白）
    const isPunctuationOrSpace = (ch) => /[\s\p{P}\p{S}]/u.test(ch);

    // 目標文章純字元與位置映射
    const targetChars = [];
    for (let i = 0; i < rawTarget.length; i++) {
      const ch = rawTarget[i];
      if (!isPunctuationOrSpace(ch)) {
        targetChars.push({ char: ch, origIndex: i });
      }
    }

    // 使用者朗讀純字元
    const spokenChars = [];
    for (let i = 0; i < rawSpoken.length; i++) {
      const ch = rawSpoken[i];
      if (!isPunctuationOrSpace(ch)) {
        spokenChars.push(ch);
      }
    }

    const n = targetChars.length;
    const m = spokenChars.length;

    if (n === 0) {
      alert('文章中沒有可比對的中文字元！');
      return;
    }

    // 2. 動態規劃求 LCS (最長公共子序列)
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (targetChars[i - 1].char === spokenChars[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 3. 回溯尋找匹配與漏讀
    let i = n, j = m;
    const matchedTargetIndices = new Set();
    let lcsCount = dp[n][m];

    while (i > 0 && j > 0) {
      if (targetChars[i - 1].char === spokenChars[j - 1]) {
        matchedTargetIndices.add(targetChars[i - 1].origIndex);
        i--;
        j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    // 4. 計算指標
    const correctCount = lcsCount;
    const totalTarget = n;
    const missedCount = totalTarget - correctCount;
    const extraCount = Math.max(0, m - correctCount);
    const accuracy = Math.min(100, Math.round((correctCount / totalTarget) * 100));

    // 更新儀表板數據
    scoreAccuracy.textContent = accuracy;
    scoreCorrectCount.textContent = correctCount;
    scoreMissedCount.textContent = missedCount;
    scoreExtraCount.textContent = extraCount;

    // 渲染星級與評語
    renderStars(accuracy);
    renderCoachFeedback(accuracy, correctCount, missedCount, extraCount);

    // 5. 渲染視覺化逐字對照
    renderDiffHTML(rawTarget, matchedTargetIndices);

    // 高分放彩帶慶祝 🎉
    if (accuracy >= 90 && window.confetti) {
      window.confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // 6. 自動記錄本次朗讀成績 (Firebase / 學生歷程)
    let starCount = 1;
    if (accuracy >= 95) starCount = 5;
    else if (accuracy >= 85) starCount = 4;
    else if (accuracy >= 70) starCount = 3;
    else if (accuracy >= 50) starCount = 2;
    else starCount = 1;

    lastScoreResult = {
      articleTitle: getCurrentArticleTitle(),
      accuracyRate: accuracy,
      starRating: starCount,
      correctCount,
      missedCount,
      extraCount,
      totalChars: totalTarget,
      durationSeconds: recordSeconds || 0
    };

    if (typeof handleAutoRecordScore === 'function') {
      handleAutoRecordScore(lastScoreResult);
    }
  }

  function renderStars(score) {
    let starCount = 1;
    if (score >= 95) starCount = 5;
    else if (score >= 85) starCount = 4;
    else if (score >= 70) starCount = 3;
    else if (score >= 50) starCount = 2;
    else starCount = 1;

    let starHTML = '';
    for (let i = 0; i < 5; i++) {
      if (i < starCount) {
        starHTML += '<i data-lucide="star" class="w-4 h-4 fill-current"></i>';
      } else {
        starHTML += '<i data-lucide="star" class="w-4 h-4 text-indigo-300/40"></i>';
      }
    }
    scoreStars.innerHTML = starHTML;
    if (window.lucide) window.lucide.createIcons();
  }

  function renderCoachFeedback(score, correct, missed, extra) {
    let comment = '';
    if (score >= 95) {
      comment = `🌟 太出色了！字正腔圓，發音準確率高達 ${score}%！不管是語速、字音都非常精準，堪稱班上的朗讀示範標竿！`;
    } else if (score >= 85) {
      comment = `👍 朗讀得非常流暢！整體正確率 ${score}%，表現很棒。只有 ${missed} 個字詞發音稍快或跳過，稍加注意就十全十美囉！`;
    } else if (score >= 70) {
      comment = `💪 很不錯的朗讀表現！達到了 ${score}% 正確率。建議放慢朗讀速度，每個字清晰吐字，也可以再多聽幾次步驟 2 的示範朗讀喔！`;
    } else if (score >= 50) {
      comment = `🎯 有基礎的水準（${score}%）。發現有 ${missed} 個字漏唸或辨識有偏差，建議對照下方紅色標記字，單獨練習發音後重新挑戰！`;
    } else {
      comment = `💡 加油！別灰心，朗讀需要多練習。可以先播放示範朗讀跟著輕聲念一遍，調整麥克風位置後再大聲錄音一次試試看！`;
    }

    if (extra > 3) {
      comment += ` （提醒：偵測到 ${extra} 個額外贅字或雜音，朗讀時請注意周遭環境安靜喔）`;
    }

    coachCommentText.textContent = comment;
  }

  function renderDiffHTML(rawTarget, matchedTargetIndices) {
    let html = '';
    const isPunctuationOrSpace = (ch) => /[\s\p{P}\p{S}]/u.test(ch);

    for (let i = 0; i < rawTarget.length; i++) {
      const ch = rawTarget[i];
      if (ch === '\n') {
        html += '<br>';
        continue;
      }

      if (isPunctuationOrSpace(ch)) {
        html += `<span class="diff-punct">${escapeHTML(ch)}</span>`;
      } else {
        if (matchedTargetIndices.has(i)) {
          html += `<span class="diff-char diff-char-correct" title="發音正確">${escapeHTML(ch)}</span>`;
        } else {
          html += `<span class="diff-char diff-char-missed" title="漏讀或發音不準確">${escapeHTML(ch)}</span>`;
        }
      }
    }

    diffVisualization.innerHTML = html;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  btnReEval.addEventListener('click', () => {
    evaluateReading();
  });

  // ==========================================
  // --- 學生登入、成績歷史紀錄與 Firebase 整合 ---
  // ==========================================

  // 取得目前文章標題輔助
  function getCurrentArticleTitle() {
    if (currentArticleTitle) return currentArticleTitle;
    const raw = articleText.value.trim();
    if (!raw) return '未命名課文';
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const cleaned = lines[0].replace(/[\s\p{P}]/gu, '');
      return cleaned ? cleaned.slice(0, 16) : '自訂課文';
    }
    return '自訂課文';
  }

  // DOM 元素選取
  const btnStudentLogin = document.getElementById('btn-student-login');
  const studentBadgeText = document.getElementById('student-badge-text');
  const btnReadingHistory = document.getElementById('btn-reading-history');
  const btnFirebaseSettings = document.getElementById('btn-firebase-settings');

  // 步驟 4 成績記錄狀態卡片
  const scoreCloudStatus = document.getElementById('score-cloud-status');
  const scoreCloudTitle = document.getElementById('score-cloud-title');
  const scoreCloudBadge = document.getElementById('score-cloud-badge');
  const scoreCloudSubtext = document.getElementById('score-cloud-subtext');
  const scoreCloudIconBox = document.getElementById('score-cloud-icon-box');
  const btnQuickLoginStep4 = document.getElementById('btn-quick-login-step4');
  const btnViewHistoryStep4 = document.getElementById('btn-view-history-step4');

  // 學生登入 Modal
  const studentModal = document.getElementById('student-modal');
  const btnCloseStudentModal = document.getElementById('btn-close-student-modal');
  const studentLoggedInPanel = document.getElementById('student-logged-in-panel');
  const studentAvatarInitials = document.getElementById('student-avatar-initials');
  const studentLoggedClassSeat = document.getElementById('student-logged-class-seat');
  const studentLoggedName = document.getElementById('student-logged-name');
  const btnLogoutStudent = document.getElementById('btn-logout-student');
  const studentLoginForm = document.getElementById('student-login-form');
  const loginInputClass = document.getElementById('login-input-class');
  const loginInputSeat = document.getElementById('login-input-seat');
  const loginInputName = document.getElementById('login-input-name');
  const btnSubmitStudentLogin = document.getElementById('btn-submit-student-login');
  const btnGoogleLogin = document.getElementById('btn-google-login');

  // 歷程成績單 Modal
  const historyModal = document.getElementById('history-modal');
  const btnCloseHistoryModal = document.getElementById('btn-close-history-modal');
  const btnCloseHistoryModalBottom = document.getElementById('btn-close-history-modal-bottom');
  const historyModalSubtext = document.getElementById('history-modal-subtext');
  const histStatCount = document.getElementById('hist-stat-count');
  const histStatAvg = document.getElementById('hist-stat-avg');
  const histStatBest = document.getElementById('hist-stat-best');
  const histStatChars = document.getElementById('hist-stat-chars');
  const btnHistTabPersonal = document.getElementById('btn-hist-tab-personal');
  const btnHistTabClass = document.getElementById('btn-hist-tab-class');
  const btnExportHistoryCsv = document.getElementById('btn-export-history-csv');
  const historyRecordsList = document.getElementById('history-records-list');
  const historyStorageBadge = document.getElementById('history-storage-badge');

  // Firebase 設定 Modal
  const firebaseModal = document.getElementById('firebase-modal');
  const btnCloseFirebaseModal = document.getElementById('btn-close-firebase-modal');
  const firebaseStatusBanner = document.getElementById('firebase-status-banner');
  const firebaseStatusText = document.getElementById('firebase-status-text');
  const fbInputApiKey = document.getElementById('fb-input-apikey');
  const fbInputProjectId = document.getElementById('fb-input-projectid');
  const fbInputAuthDomain = document.getElementById('fb-input-authdomain');
  const fbInputBucket = document.getElementById('fb-input-bucket');
  const btnSaveFirebaseConfig = document.getElementById('btn-save-firebase-config');
  const btnResetFirebaseConfig = document.getElementById('btn-reset-firebase-config');

  let currentHistoryTab = 'personal'; // 'personal' | 'class'
  let cachedRecordsForExport = [];

  // 更新頂部與各處學生狀態顯示
  function updateStudentUI() {
    if (!window.ReadingCoachFirebase) return;
    const student = window.ReadingCoachFirebase.getCurrentStudent();

    if (student) {
      if (studentBadgeText) {
        studentBadgeText.textContent = `${student.name} (${student.classId}-${student.seatNum})`;
      }
      if (btnStudentLogin) {
        btnStudentLogin.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 transition shadow-2xs';
      }
      // 學生 Modal 已登入面板
      if (studentLoggedInPanel) {
        studentLoggedInPanel.classList.remove('hidden');
        if (studentAvatarInitials) studentAvatarInitials.textContent = student.seatNum || student.name.slice(0, 2);
        if (studentLoggedClassSeat) studentLoggedClassSeat.textContent = `${student.classId} 班 ${student.seatNum} 號`;
        if (studentLoggedName) studentLoggedName.textContent = student.name;
      }
      if (loginInputClass && !loginInputClass.value) loginInputClass.value = student.classId;
      if (loginInputSeat && !loginInputSeat.value) loginInputSeat.value = student.seatNum;
      if (loginInputName && !loginInputName.value) loginInputName.value = student.name;
    } else {
      if (studentBadgeText) studentBadgeText.textContent = '學生登入';
      if (btnStudentLogin) {
        btnStudentLogin.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition shadow-2xs';
      }
      if (studentLoggedInPanel) studentLoggedInPanel.classList.add('hidden');
    }
  }

  // 打開/關閉學生登入視窗
  function openStudentModal() {
    updateStudentUI();
    if (studentModal) studentModal.classList.remove('hidden');
  }
  function closeStudentModal() {
    if (studentModal) studentModal.classList.add('hidden');
  }

  if (btnStudentLogin) btnStudentLogin.addEventListener('click', openStudentModal);
  if (btnCloseStudentModal) btnCloseStudentModal.addEventListener('click', closeStudentModal);
  if (btnQuickLoginStep4) btnQuickLoginStep4.addEventListener('click', openStudentModal);

  // 學生表單登入
  if (btnSubmitStudentLogin) {
    btnSubmitStudentLogin.addEventListener('click', async () => {
      const classId = loginInputClass.value.trim();
      const seatNum = loginInputSeat.value.trim();
      const studentName = loginInputName.value.trim();

      if (!classId || !seatNum || !studentName) {
        alert('請確實填寫班級、座號與學生姓名！');
        return;
      }

      try {
        await window.ReadingCoachFirebase.loginStudent({ classId, seatNum, studentName });
        closeStudentModal();
        alert(`🎉 歡迎，${classId}班 ${seatNum}號 ${studentName}！\n已為您啟動個人朗讀成長檔案。`);

        // 若剛評分完畢尚未儲存，自動補存
        if (lastScoreResult) {
          handleAutoRecordScore(lastScoreResult);
        }
      } catch (err) {
        alert(err.message || '登入失敗，請檢查輸入內容！');
      }
    });
  }

  // Google 登入
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', async () => {
      try {
        await window.ReadingCoachFirebase.loginWithGoogle();
        closeStudentModal();
        alert('🎉 Google 帳號登入成功！');
        if (lastScoreResult) {
          handleAutoRecordScore(lastScoreResult);
        }
      } catch (err) {
        alert('Google 登入失敗：' + (err.message || '請確認 Firebase 已配置並啟用 Google 認證'));
      }
    });
  }

  // 學生登出
  if (btnLogoutStudent) {
    btnLogoutStudent.addEventListener('click', async () => {
      if (confirm('確定要登出當前學生嗎？')) {
        await window.ReadingCoachFirebase.logoutStudent();
        updateStudentUI();
        alert('已登出。下一位同學可重新輸入座號登入！');
      }
    });
  }

  // 核心：在步驟 4 自動記錄分數
  async function handleAutoRecordScore(scoreData) {
    if (!window.ReadingCoachFirebase) return;
    const student = window.ReadingCoachFirebase.getCurrentStudent();

    if (!scoreCloudStatus) return;

    if (!student) {
      scoreCloudStatus.className = 'mt-4 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs';
      if (scoreCloudIconBox) scoreCloudIconBox.className = 'w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0';
      if (scoreCloudTitle) scoreCloudTitle.innerHTML = '<span>本次成績尚未綁定學生檔案</span><span class="ml-2 text-2xs px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">未登入</span>';
      if (scoreCloudSubtext) scoreCloudSubtext.textContent = '請點擊右側「切換/登入學生」，登入後系統將自動將本次分數寫入您的成績單！';
      return;
    }

    try {
      const res = await window.ReadingCoachFirebase.recordReadingScore(scoreData);
      scoreCloudStatus.className = 'mt-4 p-3.5 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs';
      if (scoreCloudIconBox) scoreCloudIconBox.className = 'w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0';

      const isCloud = res.mode === 'cloud';
      const badgeText = isCloud ? '☁️ Cloud Firestore' : '💾 本機離線保存';
      const badgeClass = isCloud ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700';

      if (scoreCloudTitle) {
        scoreCloudTitle.innerHTML = `<span>本次成績已成功寫入成長檔案！</span><span class="ml-2 text-2xs px-2 py-0.5 rounded-md ${badgeClass} font-semibold">${badgeText}</span>`;
      }
      if (scoreCloudSubtext) {
        scoreCloudSubtext.textContent = `學生：${student.classId} 班 ${student.seatNum} 號 ${student.name} | 課文：《${scoreData.articleTitle}》 | 正確率：${scoreData.accuracyRate}% (${scoreData.starRating}星)`;
      }
      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error('儲存成績失敗：', e);
    }
  }

  // 監聽登入變更事件
  window.addEventListener('student-login-changed', () => {
    updateStudentUI();
  });

  // ==========================================
  // --- 朗讀歷程成績單 (History Modal) ---
  // ==========================================
  async function openHistoryModal() {
    if (!window.ReadingCoachFirebase) return;
    if (historyModal) historyModal.classList.remove('hidden');
    loadHistoryRecords(currentHistoryTab);
  }

  function closeHistoryModal() {
    if (historyModal) historyModal.classList.add('hidden');
  }

  if (btnReadingHistory) btnReadingHistory.addEventListener('click', openHistoryModal);
  if (btnViewHistoryStep4) btnViewHistoryStep4.addEventListener('click', openHistoryModal);
  if (btnCloseHistoryModal) btnCloseHistoryModal.addEventListener('click', closeHistoryModal);
  if (btnCloseHistoryModalBottom) btnCloseHistoryModalBottom.addEventListener('click', closeHistoryModal);

  // 切換個人歷程與全班成績榜
  if (btnHistTabPersonal) {
    btnHistTabPersonal.addEventListener('click', () => {
      currentHistoryTab = 'personal';
      btnHistTabPersonal.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-2xs transition';
      btnHistTabClass.className = 'px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      loadHistoryRecords('personal');
    });
  }

  if (btnHistTabClass) {
    btnHistTabClass.addEventListener('click', () => {
      currentHistoryTab = 'class';
      btnHistTabClass.className = 'px-3 py-1 text-xs font-bold rounded-lg bg-indigo-600 text-white shadow-2xs transition';
      btnHistTabPersonal.className = 'px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      loadHistoryRecords('class');
    });
  }

  // 載入並渲染歷史成績
  async function loadHistoryRecords(tab) {
    if (!historyRecordsList) return;
    historyRecordsList.innerHTML = '<div class="text-center py-10 text-xs text-slate-400"><i data-lucide="loader" class="w-5 h-5 mx-auto mb-2 animate-spin text-indigo-500"></i>載入成績歷程中...</div>';
    if (window.lucide) window.lucide.createIcons();

    const student = window.ReadingCoachFirebase.getCurrentStudent();
    let records = [];

    if (tab === 'personal') {
      if (!student) {
        historyRecordsList.innerHTML = `
          <div class="text-center py-10 text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <p>您尚未登入學生身分，暫無個人專屬成績單。</p>
            <button onclick="document.getElementById('btn-student-login').click()" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs">立即登入學生</button>
          </div>
        `;
        resetHistoryStats();
        cachedRecordsForExport = [];
        return;
      }
      if (historyModalSubtext) historyModalSubtext.textContent = `【${student.classId} 班 ${student.seatNum} 號 ${student.name}】的專屬朗讀歷程`;
      records = await window.ReadingCoachFirebase.getStudentRecords(student.uid);
    } else {
      const targetClass = student ? student.classId : (currentClassId || '301');
      if (historyModalSubtext) historyModalSubtext.textContent = `【${targetClass} 班】全班朗讀成果榜`;
      records = await window.ReadingCoachFirebase.getClassRecords(targetClass);
    }

    cachedRecordsForExport = records;
    renderHistoryStats(records);
    renderHistoryCards(records);
  }

  function resetHistoryStats() {
    if (histStatCount) histStatCount.textContent = '0';
    if (histStatAvg) histStatAvg.textContent = '--%';
    if (histStatBest) histStatBest.textContent = '--%';
    if (histStatChars) histStatChars.textContent = '0';
  }

  function renderHistoryStats(records) {
    if (!records || records.length === 0) {
      resetHistoryStats();
      return;
    }
    const count = records.length;
    const totalAccuracy = records.reduce((sum, r) => sum + (Number(r.accuracyRate) || 0), 0);
    const avgAccuracy = Math.round(totalAccuracy / count);
    const bestScore = Math.max(...records.map(r => Number(r.accuracyRate) || 0));
    const totalChars = records.reduce((sum, r) => sum + (Number(r.totalChars) || 0), 0);

    if (histStatCount) histStatCount.textContent = count;
    if (histStatAvg) histStatAvg.textContent = `${avgAccuracy}%`;
    if (histStatBest) histStatBest.textContent = `${bestScore}%`;
    if (histStatChars) histStatChars.textContent = totalChars;
  }

  function renderHistoryCards(records) {
    if (!records || records.length === 0) {
      historyRecordsList.innerHTML = `
        <div class="text-center py-10 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          目前尚未有任何朗讀紀錄，完成朗讀後將自動記錄於此！
        </div>
      `;
      return;
    }

    historyRecordsList.innerHTML = '';
    records.forEach(r => {
      const card = document.createElement('div');
      card.className = 'p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-indigo-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3';

      const dateStr = new Date(r.recordedAt || r.timestamp).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // 依正確率給予徽章色彩
      let accBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      if (r.accuracyRate < 70) accBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
      else if (r.accuracyRate < 85) accBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200';

      // 星級圖示
      let starsHTML = '';
      const starNum = Number(r.starRating) || 1;
      for (let i = 0; i < 5; i++) {
        starsHTML += i < starNum ? '★' : '☆';
      }

      card.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <span class="text-xs font-bold text-slate-900 truncate">《${escapeHTML(r.articleTitle || '未命名課文')}》</span>
            <span class="text-2xs font-bold px-2 py-0.5 rounded-full border ${accBadgeBg}">${r.accuracyRate}%</span>
            <span class="text-amber-500 text-xs font-serif tracking-tighter">${starsHTML}</span>
          </div>
          <div class="text-2xs text-slate-400 mt-1 flex items-center space-x-2 flex-wrap">
            <span>👤 ${escapeHTML(r.studentName || '')} (${escapeHTML(r.classId || '')}班 ${escapeHTML(r.seatNum || '')}號)</span>
            <span>•</span>
            <span>⏱️ 耗時 ${r.durationSeconds || 0} 秒</span>
            <span>•</span>
            <span>📅 ${dateStr}</span>
          </div>
        </div>
        <div class="flex items-center space-x-2 text-2xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
          <span class="text-emerald-700 font-semibold">對: ${r.correctCount || 0}</span>
          <span class="text-slate-300">|</span>
          <span class="text-rose-600 font-semibold">漏: ${r.missedCount || 0}</span>
          <span class="text-slate-300">|</span>
          <span class="text-amber-600 font-semibold">贅: ${r.extraCount || 0}</span>
        </div>
      `;
      historyRecordsList.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // 匯出 CSV 表格
  if (btnExportHistoryCsv) {
    btnExportHistoryCsv.addEventListener('click', () => {
      const student = window.ReadingCoachFirebase.getCurrentStudent();
      const prefix = currentHistoryTab === 'personal' && student ? `${student.classId}班_${student.name}_` : '全班_';
      const filename = `朗讀成績_${prefix}${new Date().toISOString().slice(0, 10)}.csv`;
      window.ReadingCoachFirebase.exportRecordsToCsv(cachedRecordsForExport, filename);
    });
  }

  // ==========================================
  // --- Firebase 雲端設定視窗 ---
  // ==========================================
  function openFirebaseModal() {
    if (!window.ReadingCoachFirebase) return;
    const cfg = window.ReadingCoachFirebase.getEffectiveConfig();
    const isReady = window.ReadingCoachFirebase.isFirebaseReady();

    if (fbInputApiKey) fbInputApiKey.value = cfg.apiKey || '';
    if (fbInputProjectId) fbInputProjectId.value = cfg.projectId || '';
    if (fbInputAuthDomain) fbInputAuthDomain.value = cfg.authDomain || '';
    if (fbInputBucket) fbInputBucket.value = cfg.storageBucket || '';

    if (firebaseStatusBanner && firebaseStatusText) {
      if (isReady) {
        firebaseStatusBanner.className = 'mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between';
        firebaseStatusText.innerHTML = `🟢 專案連線正常：<span class="font-mono font-bold">${cfg.projectId}</span> (Cloud Firestore)`;
      } else {
        firebaseStatusBanner.className = 'mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between';
        firebaseStatusText.textContent = '🟡 目前使用本機離線保存模式 (LocalStorage)';
      }
    }

    if (firebaseModal) firebaseModal.classList.remove('hidden');
  }

  function closeFirebaseModal() {
    if (firebaseModal) firebaseModal.classList.add('hidden');
  }

  if (btnFirebaseSettings) btnFirebaseSettings.addEventListener('click', openFirebaseModal);
  if (btnCloseFirebaseModal) btnCloseFirebaseModal.addEventListener('click', closeFirebaseModal);

  // 儲存 Firebase 設定
  if (btnSaveFirebaseConfig) {
    btnSaveFirebaseConfig.addEventListener('click', () => {
      const apiKey = fbInputApiKey.value.trim();
      const projectId = fbInputProjectId.value.trim();
      const authDomain = fbInputAuthDomain.value.trim();
      const storageBucket = fbInputBucket.value.trim();

      if (!apiKey || !projectId) {
        alert('請至少填寫 Firebase API Key 與 Project ID！');
        return;
      }

      try {
        window.ReadingCoachFirebase.saveFirebaseConfig({
          apiKey,
          projectId,
          authDomain,
          storageBucket
        });
        alert('🎉 Firebase 設定已儲存！頁面將為您重新初始化連線。');
        location.reload();
      } catch (e) {
        alert(e.message);
      }
    });
  }

  // 還原 Firebase 設定
  if (btnResetFirebaseConfig) {
    btnResetFirebaseConfig.addEventListener('click', () => {
      if (confirm('確定要清除自訂 Firebase 設定並還原為預設嗎？')) {
        window.ReadingCoachFirebase.clearFirebaseConfig();
      }
    });
  }

  // 初始化學生登入 UI
  updateStudentUI();

  // 預設填入一首優美的示範詩詞，讓初次打開的使用者有完整體驗
  articleText.value = DEFAULT_SAMPLES[0].content;
  currentArticleTitle = DEFAULT_SAMPLES[0].title;
  updateCharCount();
});
