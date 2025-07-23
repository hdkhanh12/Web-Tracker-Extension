// transitions.js
document.addEventListener('DOMContentLoaded', () => {
  // Bắt sự kiện click trên tất cả các link nội bộ
  document.body.addEventListener('click', (event) => {
    // Tìm phần tử `a` gần nhất là cha của mục tiêu click
    const link = event.target.closest('a');
    
    // Chỉ xử lý các link nội bộ của extension
    if (link && (link.href.includes('dashboard.html') || link.href.includes('details.html'))) {
      event.preventDefault(); // Ngăn chặn việc chuyển trang ngay lập tức
      const newUrl = link.href;

      // Thêm class để thực hiện hiệu ứng fade-out
      document.body.classList.add('body-fade-out');

      // Đợi hiệu ứng kết thúc rồi mới chuyển trang
      setTimeout(() => {
        window.location.href = newUrl;
      }, 300); // Thời gian phải khớp với thời gian transition/animation trong CSS
    }
  });
});