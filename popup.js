// popup.js

// Bắt sự kiện 'DOMContentLoaded' để đảm bảo toàn bộ file HTML đã được tải xong trước khi chạy script.
document.addEventListener('DOMContentLoaded', async () => {
    
    /**
     * Hàm tiện ích để trích xuất tên miền chính từ một URL đầy đủ.
     * @param {string} url - Chuỗi URL đầu vào.
     * @returns {string|null} - Tên miền hoặc null nếu URL không hợp lệ.
     */
    function getHostname(url) {
        try {
            // Bỏ qua các trang nội bộ của Chrome và các URL không hợp lệ.
            if (!url || url.startsWith('chrome://')) return null;
            // Tạo một đối tượng URL để dễ dàng truy cập vào các thành phần của nó.
            // Sau đó, xóa 'www.' ở đầu (nếu có) để gộp chung các tên miền.
            return new URL(url).hostname.replace(/^www\./, '');
        } catch (error) {
            // Nếu URL không đúng định dạng trả về null.
            return null;
        }
    }

    /**
     * Chuyển đổi tổng số giây thành định dạng Giờ:Phút:Giây (HH:MM:SS).
     * @param {number} totalSeconds - Tổng số giây.
     * @returns {string} - Chuỗi thời gian đã định dạng.
     */
    function formatTime(totalSeconds) {
        // Nếu đầu vào không phải là số, coi như là 0 giây.
        if (isNaN(totalSeconds)) totalSeconds = 0;
        
        // Tính toán số giờ, phút, giây.
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0'); // Sửa lại để lấy giây chính xác
        
        // Trả về chuỗi đã định dạng. `padStart` đảm bảo luôn có 2 chữ số (ví dụ: 09, 05).
        return `${h}:${m}:${s}`;
    }

    // --- BẮT ĐẦU LOGIC CHÍNH ---

    // Dùng API của Chrome để lấy thông tin của tab đang hoạt động trong cửa sổ hiện tại.
    // `await` dùng để chờ cho đến khi có kết quả trả về.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Lấy tên miền từ URL của tab vừa tìm được.
    const hostname = getHostname(tab.url);

    // Lấy các phần tử HTML trên trang popup để cập nhật nội dung.
    const currentSiteElement = document.getElementById('currentSite');
    const timeSpentElement = document.getElementById('timeSpent');

    // Nếu `hostname` hợp lệ.
    if (hostname) {
        // Cập nhật tên trang web lên giao diện popup.
        currentSiteElement.textContent = hostname;
        
        // Lấy chuỗi ngày hôm nay để dùng làm key trong bộ nhớ.
        const today = new Date().toISOString().slice(0, 10);
        
        // Lấy dữ liệu đã lưu cho ngày hôm nay từ bộ nhớ của extension.
        const data = await chrome.storage.local.get(today);
        
        // Lấy ra thời gian đã dùng cho trang web này.
        // Cú pháp `?.[hostname]` và `|| 0` là để tránh lỗi nếu chưa có dữ liệu cho ngày hôm nay hoặc cho trang web này.
        const timeInSeconds = data[today]?.[hostname]?.totalTime || 0;
        
        // Cập nhật thời gian đã định dạng lên giao diện.
        timeSpentElement.textContent = formatTime(timeInSeconds);
    } else {
        // Nếu không lấy được hostname (ví dụ: đang ở trang cài đặt), hiển thị thông báo.
        currentSiteElement.textContent = 'Trang không được theo dõi';
    }

    // Gắn sự kiện 'click' cho nút "Xem Thống Kê Chi Tiết".
    document.getElementById('dashboardBtn').addEventListener('click', () => {
        // Khi nút được nhấn, dùng API của Chrome để mở trang dashboard.html trong một tab mới.
        chrome.tabs.create({ url: 'dashboard.html' });
    });
});