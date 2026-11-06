/**
 * 智慧朗讀教練 - Firebase 雲端整合模組
 * 負責 Firebase 初始化、學生身分登入、Cloud Firestore 朗讀分數儲存與查詢
 */

(function () {
  // 1. Firebase 預設配置物件 (已配置專案：reading-coach-a3dfb)
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyCifbtjE42LomANuB7d0RYKjY91rhE6XPY",
    authDomain: "reading-coach-a3dfb.firebaseapp.com",
    projectId: "reading-coach-a3dfb",
    storageBucket: "reading-coach-a3dfb.firebasestorage.app",
    messagingSenderId: "990437777421",
    appId: "1:990437777421:web:c6f677e32760528a663544",
    measurementId: "G-E8T378HCFX"
  };

  const STORAGE_KEY_CONFIG = 'reading_coach_firebase_config';
  const STORAGE_KEY_STUDENT = 'reading_coach_current_student';
  const STORAGE_KEY_LOCAL_SCORES = 'reading_coach_local_records';

  let firebaseApp = null;
  let firestoreDb = null;
  let firebaseAuth = null;
  let isFirebaseReady = false;

  // 取得有效配置（優先從 localStorage，次之為程式碼預設）
  function getEffectiveConfig() {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectId && parsed.apiKey) return parsed;
      } catch (e) {}
    }
    return defaultFirebaseConfig;
  }

  // 檢查配置是否已填寫完備
  function isConfigComplete(cfg) {
    return !!(cfg && cfg.apiKey && cfg.projectId);
  }

  // 初始化 Firebase
  function initFirebase() {
    const config = getEffectiveConfig();
    if (!isConfigComplete(config)) {
      console.info('ℹ️ Firebase 尚未配置 API Key，系統將使用 LocalStorage 離線模式保存成績。');
      isFirebaseReady = false;
      return false;
    }

    try {
      if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
          firebaseApp = firebase.initializeApp(config);
        } else {
          firebaseApp = firebase.app();
        }
        firestoreDb = firebase.firestore();
        firebaseAuth = firebase.auth();
        isFirebaseReady = true;
        console.log('✅ Firebase 初始化成功，專案：', config.projectId);
        return true;
      }
    } catch (err) {
      console.warn('⚠️ Firebase 初始化失敗，將使用本機模擬模式：', err);
      isFirebaseReady = false;
      return false;
    }
    return false;
  }

  // 儲存/更新 Firebase 設定
  function saveFirebaseConfig(newConfig) {
    if (!newConfig || !newConfig.projectId) {
      throw new Error('請提供完整的 Firebase 設定 (至少包含 apiKey 與 projectId)');
    }
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    return initFirebase();
  }

  // 清除自訂 Firebase 設定 (恢復預設)
  function clearFirebaseConfig() {
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    location.reload();
  }

  // 取得目前學生資訊
  function getCurrentStudent() {
    const saved = localStorage.getItem(STORAGE_KEY_STUDENT);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // 學生以「班級、座號、姓名」登入
  async function loginStudent({ classId, seatNum, studentName }) {
    if (!classId || !seatNum || !studentName) {
      throw new Error('請填寫完整的班級、座號與學生姓名！');
    }

    const cleanClass = classId.trim();
    const cleanSeat = seatNum.toString().trim().padStart(2, '0');
    const cleanName = studentName.trim();
    const studentUid = `student_${cleanClass}_${cleanSeat}`;

    const studentProfile = {
      uid: studentUid,
      classId: cleanClass,
      seatNum: cleanSeat,
      name: cleanName,
      loginType: 'student_id',
      lastLoginAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_STUDENT, JSON.stringify(studentProfile));

    // 如果 Firebase 有連線，嘗試匿名登入確保有 Auth Context
    if (isFirebaseReady && firebaseAuth) {
      try {
        if (!firebaseAuth.currentUser) {
          await firebaseAuth.signInAnonymously();
        }
      } catch (e) {
        console.warn('Firebase 匿名認證提示 (不影響 Firestore 操作)：', e.message);
      }
    }

    // 觸發自訂事件
    window.dispatchEvent(new CustomEvent('student-login-changed', { detail: studentProfile }));
    return studentProfile;
  }

  // Google 一鍵登入
  async function loginWithGoogle() {
    if (!isFirebaseReady || !firebaseAuth) {
      throw new Error('請先在設定中配置 Firebase 專案才能使用 Google 登入！');
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebaseAuth.signInWithPopup(provider);
    const user = result.user;

    const studentProfile = {
      uid: user.uid,
      classId: 'Google帳號',
      seatNum: '--',
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL,
      loginType: 'google',
      lastLoginAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY_STUDENT, JSON.stringify(studentProfile));
    window.dispatchEvent(new CustomEvent('student-login-changed', { detail: studentProfile }));
    return studentProfile;
  }

  // 登出學生
  async function logoutStudent() {
    localStorage.removeItem(STORAGE_KEY_STUDENT);
    if (isFirebaseReady && firebaseAuth && firebaseAuth.currentUser) {
      try {
        await firebaseAuth.signOut();
      } catch (e) {}
    }
    window.dispatchEvent(new CustomEvent('student-login-changed', { detail: null }));
  }

  // 本機紀錄輔助函數
  function getLocalRecords() {
    try {
      const records = localStorage.getItem(STORAGE_KEY_LOCAL_SCORES);
      return records ? JSON.parse(records) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalRecord(record) {
    const list = getLocalRecords();
    list.unshift(record);
    // 最多保留 300 筆本機紀錄
    if (list.length > 300) list.pop();
    localStorage.setItem(STORAGE_KEY_LOCAL_SCORES, JSON.stringify(list));
    return record;
  }

  // 核心功能：記錄每次朗讀成績
  async function recordReadingScore(scoreData) {
    const student = getCurrentStudent();
    if (!student) {
      console.warn('⚠️ 尚未登入學生身分，暫不儲存歷史紀錄。');
      return { success: false, reason: 'not_logged_in' };
    }

    const record = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      studentUid: student.uid,
      classId: student.classId,
      seatNum: student.seatNum,
      studentName: student.name,
      articleTitle: scoreData.articleTitle || '未命名課文',
      accuracyRate: scoreData.accuracyRate ?? 0,
      starRating: scoreData.starRating ?? 0,
      correctCount: scoreData.correctCount ?? 0,
      missedCount: scoreData.missedCount ?? 0,
      extraCount: scoreData.extraCount ?? 0,
      totalChars: scoreData.totalChars ?? 0,
      durationSeconds: scoreData.durationSeconds ?? 0,
      recordedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    // 1. 一律同步存一份到本機快取
    saveLocalRecord(record);

    // 2. 若 Firebase 連線正常，同步寫入 Cloud Firestore
    if (isFirebaseReady && firestoreDb) {
      try {
        await firestoreDb.collection('reading_records').doc(record.id).set(record);
        console.log('☁️ 成績已成功寫入 Cloud Firestore：', record.id);
        return { success: true, mode: 'cloud', record };
      } catch (err) {
        console.error('寫入 Cloud Firestore 失敗，退回使用本機儲存：', err);
        return { success: true, mode: 'local_fallback', record, error: err.message };
      }
    }

    return { success: true, mode: 'local', record };
  }

  // 取得學生的歷史朗讀紀錄
  async function getStudentRecords(studentUid) {
    const targetUid = studentUid || (getCurrentStudent() ? getCurrentStudent().uid : null);
    if (!targetUid) return [];

    // 若 Firebase 連線正常，從 Firestore 讀取最新
    if (isFirebaseReady && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('reading_records')
          .where('studentUid', '==', targetUid)
          .orderBy('timestamp', 'desc')
          .limit(100)
          .get();

        const results = [];
        snapshot.forEach(doc => results.push(doc.data()));
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('從 Firestore 讀取紀錄失敗，改讀本機快取：', err);
      }
    }

    // 本機篩選
    const local = getLocalRecords();
    return local.filter(r => r.studentUid === targetUid);
  }

  // 取得全班的朗讀紀錄 (供老師檢視/匯出)
  async function getClassRecords(classId) {
    if (!classId) return [];

    if (isFirebaseReady && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('reading_records')
          .where('classId', '==', classId.trim())
          .orderBy('timestamp', 'desc')
          .limit(500)
          .get();

        const results = [];
        snapshot.forEach(doc => results.push(doc.data()));
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('從 Firestore 讀取全班紀錄失敗，改讀本機：', err);
      }
    }

    const local = getLocalRecords();
    return local.filter(r => r.classId === classId.trim());
  }

  // 匯出 CSV 檔案
  function exportRecordsToCsv(records, filename = '朗讀成績歷程.csv') {
    if (!records || records.length === 0) {
      alert('目前沒有任何成績紀錄可供匯出！');
      return;
    }

    const headers = ['紀錄編號', '班級', '座號', '姓名', '文章標題', '總字數', '正確率(%)', '星等', '唸對字數', '漏讀字數', '多讀字數', '耗時(秒)', '朗讀時間'];
    const rows = records.map(r => [
      `"${r.id || ''}"`,
      `"${r.classId || ''}"`,
      `"${r.seatNum || ''}"`,
      `"${r.studentName || ''}"`,
      `"${(r.articleTitle || '').replace(/"/g, '""')}"`,
      r.totalChars || 0,
      r.accuracyRate || 0,
      r.starRating || 0,
      r.correctCount || 0,
      r.missedCount || 0,
      r.extraCount || 0,
      r.durationSeconds || 0,
      `"${new Date(r.recordedAt || r.timestamp).toLocaleString('zh-TW')}"`
    ]);

    // 加入 UTF-8 BOM 避免 Excel 開啟亂碼
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 雲端教材同步：發布全班課文教材到 Firestore
  async function publishClassMaterials(classId, materials) {
    if (!classId) throw new Error('請提供班級代碼');
    const cleanClass = classId.toString().trim();
    if (isFirebaseReady && firestoreDb) {
      try {
        await firestoreDb.collection('class_materials').doc(cleanClass).set({
          classId: cleanClass,
          materials: materials || [],
          updatedAt: new Date().toISOString()
        });
        return { success: true, mode: 'cloud' };
      } catch (err) {
        console.warn('雲端儲存教材失敗：', err);
        return { success: false, mode: 'error', error: err.message };
      }
    }
    return { success: false, mode: 'offline' };
  }

  // 雲端教材同步：學生端從 Firestore 讀取班級課文教材
  async function fetchClassMaterials(classId) {
    if (!classId) return null;
    const cleanClass = classId.toString().trim();
    if (isFirebaseReady && firestoreDb) {
      try {
        const doc = await firestoreDb.collection('class_materials').doc(cleanClass).get();
        if (doc.exists) {
          return doc.data();
        }
      } catch (err) {
        console.warn('從 Firestore 載入班級教材失敗：', err);
      }
    }
    return null;
  }

  // 自動在頁面載入時嘗試初始化
  document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
  });

  // 對外曝露 API
  window.ReadingCoachFirebase = {
    initFirebase,
    isFirebaseReady: () => isFirebaseReady,
    getEffectiveConfig,
    isConfigComplete,
    saveFirebaseConfig,
    clearFirebaseConfig,
    getCurrentStudent,
    loginStudent,
    loginWithGoogle,
    logoutStudent,
    recordReadingScore,
    getStudentRecords,
    getClassRecords,
    getLocalRecords,
    exportRecordsToCsv,
    publishClassMaterials,
    fetchClassMaterials
  };
})();
