// dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    // --- LẤY CÁC PHẦN TỬ DOM --- //
    const statsBody = document.getElementById('statsBody');
    const totalTimeDisplay = document.getElementById('totalTime');
    const summaryTitle = document.getElementById('summaryTitle');
    const noDataMessage = document.getElementById('noDataMessage');
    const tableView = document.getElementById('tableView');
    const chartView = document.getElementById('chartView');
    const todayBtn = document.getElementById('todayBtn');
    const weekBtn = document.getElementById('weekBtn');
    const tableViewBtn = document.getElementById('tableViewBtn');
    const chartViewBtn = document.getElementById('chartViewBtn');
    const chartCanvas = document.getElementById('timeChart').getContext('2d');
    let timeChartInstance = null;

    // --- QUẢN LÝ TRẠNG THÁI --- //
    let currentState = {
        timeFrame: 'today', // 'today' hoặc 'week'
        viewMode: 'table'   // 'table' hoặc 'chart'
    };

    // --- CÁC HÀM TIỆN ÍCH --- //
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) seconds = 0;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 3600 % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // --- CÁC HÀM RENDER --- //
    function renderTable(data) {
        statsBody.innerHTML = '';
        let grandTotalTime = 0;
        const sortedData = Object.entries(data).sort(([, a], [, b]) => b.totalTime - a.totalTime);

        if (sortedData.length === 0) {
            noDataMessage.classList.remove('hidden');
        } else {
            noDataMessage.classList.add('hidden');
        }

        sortedData.forEach(([hostname, siteData]) => {
            grandTotalTime += siteData.totalTime;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="site-cell">
                    <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" alt="Logo ${hostname}">
                    <a href="details.html?site=${hostname}">${hostname}</a>
                </td>
                <td>${formatTime(siteData.totalTime)}</td>
                <td>${siteData.visitCount}</td>
            `;
            statsBody.appendChild(row);
        });
        totalTimeDisplay.textContent = formatTime(grandTotalTime);
    }

    /**
     * Hàm chính để vẽ biểu đồ
     * @param {Object} chartConfig - Cấu hình cho Chart.js (type, data, options)
     */
    function renderChart(chartConfig) {
        if (timeChartInstance) {
            timeChartInstance.destroy(); // Xóa biểu đồ cũ
        }
        
        // Kiểm tra xem có dữ liệu không
        const hasData = chartConfig.data.datasets.some(dataset => dataset.data.some(value => value > 0));

        if (!hasData) {
            noDataMessage.classList.remove('hidden');
        } else {
            noDataMessage.classList.add('hidden');
        }

        timeChartInstance = new Chart(chartCanvas, chartConfig);
    }

    // --- HÀM CẬP NHẬT GIAO DIỆN CHÍNH --- //
    async function updateView() {
        // Cập nhật giao diện các nút
        todayBtn.classList.toggle('active', currentState.timeFrame === 'today');
        weekBtn.classList.toggle('active', currentState.timeFrame === 'week');
        tableViewBtn.classList.toggle('active', currentState.viewMode === 'table');
        chartViewBtn.classList.toggle('active', currentState.viewMode === 'chart');

        if (currentState.viewMode === 'table') {
            tableView.classList.replace('is-hidden', 'is-visible');
            chartView.classList.replace('is-visible', 'is-hidden');
        } else {
            chartView.classList.replace('is-hidden', 'is-visible');
            tableView.classList.replace('is-visible', 'is-hidden');
    }

        summaryTitle.textContent = `Tổng Thời Gian ${currentState.timeFrame === 'today' ? 'Hôm Nay' : 'Tuần Này'}`;
        // Tự động thêm/xóa class 'is-pie-chart' dựa trên trạng thái
        chartView.classList.toggle('is-pie-chart', currentState.timeFrame === 'today');
        
        if (currentState.viewMode === 'table') {
            // Lấy dữ liệu cho bảng
            let tableData = {};
            if (currentState.timeFrame === 'today') {
                const todayStr = new Date().toISOString().slice(0, 10);
                const result = await chrome.storage.local.get(todayStr);
                tableData = result[todayStr] || {};
            } else { // 'week'
                 // Logic lấy dữ liệu tuần cho bảng...
                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateString = date.toISOString().slice(0, 10);
                    const result = await chrome.storage.local.get(dateString);
                    if (result[dateString]) {
                        for (const hostname in result[dateString]) {
                            if (!tableData[hostname]) tableData[hostname] = { totalTime: 0, visitCount: 0 };
                            tableData[hostname].totalTime += result[dateString][hostname].totalTime;
                            tableData[hostname].visitCount += result[dateString][hostname].visitCount;
                        }
                    }
                }
            }
            renderTable(tableData);
        } else { // 'chart'
            // Xử lý dữ liệu và vẽ biểu đồ
            if (currentState.timeFrame === 'today') {
                // Biểu đồ tròn cho hôm nay
                const todayStr = new Date().toISOString().slice(0, 10);
                const result = await chrome.storage.local.get(todayStr);
                const todayData = result[todayStr] || {};
                const sortedData = Object.entries(todayData).sort(([, a], [, b]) => b.totalTime - a.totalTime).slice(0, 7); // Lấy 7 trang top
                
                renderChart({
                    type: 'pie',
                    data: {
                        labels: sortedData.map(item => item[0]),
                        datasets: [{
                            label: 'Thời gian sử dụng (giây)',
                            data: sortedData.map(item => item[1].totalTime),
                            backgroundColor: ['#4285F4', '#DB4437', '#F4B400', '#0F9D58', '#AB47BC', '#00ACC1', '#FF7043']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
                });
            } else { // 'week'
                // Biểu đồ cột cho tuần
                const weekLabels = [];
                const weekDataset = [];
                let totalWeekTime = 0;
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateString = date.toISOString().slice(0, 10);
                    const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'short' });
                    
                    weekLabels.push(dayOfWeek);
                    
                    const result = await chrome.storage.local.get(dateString);
                    let dailyTotal = 0;
                    if (result[dateString]) {
                        dailyTotal = Object.values(result[dateString]).reduce((sum, site) => sum + site.totalTime, 0);
                    }
                    weekDataset.push(dailyTotal);
                    totalWeekTime += dailyTotal;
                }
                
                totalTimeDisplay.textContent = formatTime(totalWeekTime); // Cập nhật tổng thời gian tuần

                renderChart({
                    type: 'bar',
                    data: {
                        labels: weekLabels,
                        datasets: [{
                            label: 'Tổng thời gian sử dụng (giây)',
                            data: weekDataset,
                            backgroundColor: '#4285F4'
                        }]
                    },
                    options: { scales: { y: { beginAtZero: true } }, responsive: true, maintainAspectRatio: true }
                });
            }
        }
    }

    // --- GẮN SỰ KIỆN --- //
    todayBtn.addEventListener('click', () => { currentState.timeFrame = 'today'; updateView(); });
    weekBtn.addEventListener('click', () => { currentState.timeFrame = 'week'; updateView(); });
    tableViewBtn.addEventListener('click', () => { currentState.viewMode = 'table'; updateView(); });
    chartViewBtn.addEventListener('click', () => { currentState.viewMode = 'chart'; updateView(); });

    // --- KHỞI TẠO --- //
    updateView();
});