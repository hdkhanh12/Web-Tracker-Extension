// background.js

// -- BIẾN LƯU TRỮ TRẠNG THÁI -- //
let activeTabId = null;
let activeTabHostname = null;
let startTime = null;

// -- CÁC HÀM TIỆN ÍCH -- //

/**
 * Lấy ra tên miền (hostname) từ một chuỗi URL.
 * @param {string} url - Chuỗi URL đầu vào.
 * @returns {string|null} - Tên miền hoặc null nếu không hợp lệ.
 */
function getHostname(url) {
  try {
    // Các URL đặc biệt của Chrome không cần theo dõi
    if (url && (url.startsWith('chrome://') || url.startsWith('about:'))) {
      return null;
    }
    const urlObject = new URL(url);
    // Xóa 'www.' nếu có để gộp chung (ví dụ: www.google.com và google.com là một)
    return urlObject.hostname.replace(/^www\./, '');
  } catch (error) {
    // Bỏ qua nếu URL không hợp lệ
    return null;
  }
}

/**
 * Lấy chuỗi ngày tháng hiện tại theo định dạng YYYY-MM-DD.
 * @returns {string} - Chuỗi ngày tháng.
 */
function getCurrentDateString() {
  const today = new Date();
  // Lấy ra năm, tháng, ngày và đảm bảo tháng/ngày có 2 chữ số (01, 02, ...)
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Hàm cốt lõi: Tính toán thời gian đã qua và cập nhật vào storage.
 * @param {string} hostname - Tên miền cần cập nhật.
 */
async function updateTotalTime(hostname) {
  if (!hostname || !startTime) {
    return; // Không làm gì nếu không có hostname hoặc thời gian bắt đầu
  }

  const timeElapsed = Math.round((Date.now() - startTime) / 1000); // Tính bằng giây

  if (timeElapsed <= 0) {
    return; // Không lưu nếu thời gian quá ngắn
  }

  // Lấy dữ liệu từ storage
  const today = getCurrentDateString();
  const data = await chrome.storage.local.get(today);
  
  const dayData = data[today] || {};
  const siteData = dayData[hostname] || { totalTime: 0, visitCount: 0 };

  siteData.totalTime += timeElapsed;
  dayData[hostname] = siteData;

  // Lưu lại dữ liệu đã cập nhật
  await chrome.storage.local.set({ [today]: dayData });
  console.log(`Đã lưu ${timeElapsed} giây cho ${hostname}`);

  // Reset startTime
  startTime = null;
}

/**
 * Bắt đầu theo dõi một tab mới.
 * @param {string} hostname - Tên miền của tab mới.
 * @param {number} tabId - ID của tab.
 */
async function startTracking(hostname, tabId) {
  // Trước khi bắt đầu theo dõi tab mới, lưu lại thời gian của tab cũ
  await updateTotalTime(activeTabHostname);

  activeTabId = tabId;
  activeTabHostname = hostname;
  startTime = Date.now(); // Ghi lại thời gian bắt đầu
}

/**
 * Tăng số lần truy cập (visitCount) cho một trang web.
 * @param {string} hostname - Tên miền cần tăng visitCount.
 */
async function updateVisitCount(hostname) {
    if (!hostname) return;

    const today = getCurrentDateString();
    const data = await chrome.storage.local.get(today);

    const dayData = data[today] || {};
    const siteData = dayData[hostname] || { totalTime: 0, visitCount: 0 };

    siteData.visitCount += 1;
    dayData[hostname] = siteData;

    await chrome.storage.local.set({ [today]: dayData });
    console.log(`Visit count cho ${hostname} là ${siteData.visitCount}`);
}

// -- CÁC BỘ LẮNG NGHE SỰ KIỆN -- //

// Sự kiện khi người dùng chuyển tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  const newHostname = getHostname(tab.url);

  if (newHostname) {
    // Nếu chuyển sang một trang web khác thì mới tính là một lượt truy cập mới
    if (newHostname !== activeTabHostname) {
        await updateVisitCount(newHostname);
    }
    await startTracking(newHostname, activeInfo.tabId);
  } else {
    // Nếu chuyển sang tab đặc biệt (vd: New Tab), thì lưu thời gian của tab cũ lại
    await updateTotalTime(activeTabHostname);
    activeTabHostname = null; // Dừng theo dõi
  }
});

// Sự kiện khi URL của một tab thay đổi (tải lại, chuyển trang)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Chỉ xử lý khi tab đã tải xong và nó là tab đang được kích hoạt
  if (tabId === activeTabId && changeInfo.status === 'complete') {
    const newHostname = getHostname(tab.url);
    if (newHostname) {
        // Nếu tên miền thay đổi, tính là một lượt truy cập mới
        if (newHostname !== activeTabHostname) {
            await updateVisitCount(newHostname);
            await startTracking(newHostname, tabId);
        }
    } else {
        await updateTotalTime(activeTabHostname);
        activeTabHostname = null;
    }
  }
});

// Sự kiện khi người dùng chuyển khỏi cửa sổ Chrome
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Người dùng đã chuyển sang ứng dụng khác, dừng đếm giờ
    await updateTotalTime(activeTabHostname);
    activeTabHostname = null; // Dừng theo dõi tạm thời
  } else {
    // Người dùng quay lại Chrome, kích hoạt lại việc đếm giờ
    const [tab] = await chrome.tabs.query({ active: true, windowId: windowId });
    if (tab) {
        const hostname = getHostname(tab.url);
        if (hostname) {
            await startTracking(hostname, tab.id);
        }
    }
  }
});


// Sự kiện khi người dùng không hoạt động
chrome.idle.setDetectionInterval(60); 
chrome.idle.onStateChanged.addListener(async (newState) => {
  if (newState === 'active') {
    // Logic khi người dùng hoạt động trở lại không thay đổi
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        const hostname = getHostname(tab.url);
        if (hostname) {
            await startTracking(hostname, tab.id);
        }
    }
  } else { // 'idle' hoặc 'locked'
    
    // Trước khi dừng đếm giờ, kiểm tra xem tab có đang phát âm thanh không
    if (activeTabId) {
        try {
            const tab = await chrome.tabs.get(activeTabId);
            // Nếu tab tồn tại và đang phát âm thanh thì không dừng bộ đếm
            if (tab && tab.audible) {
                return; // Thoát khỏi hàm
            }
        } catch (error) {
            console.error(`Không thể lấy thông tin tab ${activeTabId}:`, error);
        }
    }
  
    // Nếu tab không phát âm thanh, dừng đếm giờ như bình thường
    await updateTotalTime(activeTabHostname);
    activeTabHostname = null; // Dừng theo dõi
  }
});

// Khởi tạo khi extension được cài đặt
chrome.runtime.onInstalled.addListener(() => {
    console.log('Web Time Tracker đã được cài đặt.');
});