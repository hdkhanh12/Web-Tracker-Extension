// details.js

// Bắt sự kiện 'DOMContentLoaded' để đảm bảo toàn bộ file HTML đã được tải xong trước khi chạy script.
document.addEventListener('DOMContentLoaded', async () => {

    // --- LẤY CÁC PHẦN TỬ HTML CẦN THIẾT --- //
    // Lấy phần tử H1 để hiển thị tiêu đề trang.
    const siteTitle = document.getElementById('siteTitle');
    // Lấy thẻ <canvas> và "context" 2D của nó để Chart.js có thể vẽ biểu đồ lên.
    const hourlyChartCanvas = document.getElementById('hourlyChart').getContext('2d');
    // Biến để lưu trữ đối tượng biểu đồ, giúp chúng ta có thể xóa biểu đồ cũ trước khi vẽ mới.
    let hourlyChartInstance = null;

    // --- LẤY TÊN MIỀN TỪ URL --- //
    // URLSearchParams là một công cụ giúp đọc các tham số trên URL của trang.
    const urlParams = new URLSearchParams(window.location.search);
    const hostname = urlParams.get('site'); // Lấy giá trị của tham số 'site'.

    // Nếu không có tham số 'site' trên URL, hiển thị thông báo lỗi và dừng thực thi.
    if (!hostname) {
        siteTitle.textContent = "Không tìm thấy trang web";
        return;
    }

    // Cập nhật tiêu đề của trang với tên miền đã lấy được.
    siteTitle.textContent = `Phân tích sử dụng cho ${hostname}`;

    // --- LOGIC LẤY DỮ LIỆU VÀ VẼ BIỂU ĐỒ 7 NGÀY --- //
    
    // Khởi tạo các mảng để lưu trữ nhãn (trục X) và dữ liệu (trục Y) cho biểu đồ.
    const labels = [];
    const data = [];

    // Vòng lặp for để lấy dữ liệu cho 7 ngày gần nhất, bắt đầu từ 6 ngày trước đến hôm nay.
    for (let i = 6; i >= 0; i--) {
        const date = new Date(); // Lấy ngày giờ hiện tại.
        date.setDate(date.getDate() - i); // Trừ đi 'i' ngày để lùi về quá khứ.

        // Chuyển đổi ngày thành chuỗi 'YYYY-MM-DD' để khớp với key đã lưu trong storage.
        const dateString = date.toISOString().slice(0, 10);
        // Lấy tên của thứ trong tuần theo tiếng Việt (ví dụ: 'T2', 'T3').
        const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'short' });

        // Thêm tên thứ vào mảng nhãn.
        labels.push(dayOfWeek);

        // Lấy dữ liệu đã lưu cho ngày tương ứng.
        const result = await chrome.storage.local.get(dateString);
        // Lấy ra thời gian sử dụng cho trang web cụ thể này trong ngày đó.
        // Cú pháp `?.[hostname]` và `|| 0` là để tránh lỗi và trả về 0 nếu không có dữ liệu.
        const timeForSite = result[dateString]?.[hostname]?.totalTime || 0;
        
        // Thêm dữ liệu thời gian (đã đổi sang phút) vào mảng dữ liệu.
        data.push(timeForSite / 60);
    }

    // Nếu đã có một biểu đồ cũ, xóa đi để tránh vẽ chồng chéo.
    if (hourlyChartInstance) {
        hourlyChartInstance.destroy();
    }

    // --- TẠO BIỂU ĐỒ MỚI BẰNG CHART.JS --- //
    // Tạo một đối tượng biểu đồ mới.
    hourlyChartInstance = new Chart(hourlyChartCanvas, {
        type: 'line', // Loại biểu đồ là biểu đồ đường.
        data: {
            labels: labels, // Dữ liệu cho trục X (các thứ trong tuần).
            datasets: [{
                label: 'Thời gian sử dụng (phút)', // Chú thích cho bộ dữ liệu.
                data: data, // Dữ liệu cho trục Y (thời gian sử dụng).
                fill: true, // Tô màu khu vực dưới đường kẻ.
                borderColor: '#1a73e8', // Màu của đường kẻ.
                backgroundColor: 'rgba(26, 115, 232, 0.1)', // Màu nền dưới đường kẻ.
                tension: 0.1 // Làm cho đường kẻ hơi cong và mượt hơn.
            }]
        },
        options: {
            responsive: true, // Biểu đồ sẽ tự điều chỉnh kích thước theo container.
            maintainAspectRatio: false, // Cho phép biểu đồ co giãn tự do, không cần giữ tỷ lệ gốc.
            scales: {
                y: { // Cấu hình cho trục Y (trục tung).
                    beginAtZero: true, // Bắt đầu từ 0.
                    ticks: {
                        // Tùy chỉnh cách hiển thị các nhãn trên trục Y.
                        callback: function(value) {
                            return value + ' phút'; // Thêm chữ ' phút' vào sau mỗi giá trị.
                        }
                    }
                }
            }
        }
    });
});