// 1. DATABASE CẤU HÌNH TÍNH NĂNG
// Tự động cập nhật giao diện khi bạn thêm hoặc sửa object trong mảng này.
const featuresConfig = [
    {
        id: 'pdf-manager',
        title: 'Xử Lý PDF Trực Tuyến',
        description: 'Tách, gộp, và quản lý các tài liệu PDF trên trình duyệt không cần upload qua server.',
        url: '/pdf.html', // Đường dẫn tới trang đích
        keywords: ['pdf', 'gộp', 'tách', 'document', 'tài liệu'],
        status: 'developing' // Trạng thái: 'completed' hoặc 'developing'
    },
    {
        id: 'batch-image-crop',
        title: 'Cắt Ảnh Hàng Loạt',
        description: 'Công cụ resize, crop hình ảnh hàng loạt bằng Canvas và xuất dưới dạng file ZIP.',
        url: '/image-tools.html',
        keywords: ['ảnh', 'crop', 'image', 'batch', 'zip', 'cắt'],
        status: 'developing'
    },
    {
        id: 'web-curriculum-tracker',
        title: 'Dashboard Theo Dõi Tiến Độ',
        description: 'Giao diện web tương tác để quản lý và theo dõi các luồng chương trình, tiến độ công việc cá nhân.',
        url: '/tracker.html',
        keywords: ['track', 'tiến độ', 'quản lý', 'dashboard', 'chương trình'],
        status: 'completed'
    }
];

// 2. KHỞI TẠO CÁC BIẾN DOM
const featuresList = document.getElementById('featuresList');
const searchInput = document.getElementById('searchInput');

// 3. HÀM RENDER (VẼ GIAO DIỆN)
function renderFeatures(data) {
    // Xóa trắng danh sách cũ
    featuresList.innerHTML = '';

    // Nếu không tìm thấy kết quả
    if (data.length === 0) {
        featuresList.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #a0a0a0;">Không tìm thấy công cụ nào phù hợp với từ khóa của bạn.</p>`;
        return;
    }

    // Duyệt qua mảng dữ liệu và tạo HTML cho từng card
    data.forEach(feature => {
        const card = document.createElement('a');
        card.href = feature.url;
        card.className = 'feature-card';

        // Xác định class và text cho nhãn trạng thái
        const isCompleted = feature.status === 'completed';
        const badgeClass = isCompleted ? 'status-completed' : 'status-dev';
        const badgeText = isCompleted ? 'Sẵn sàng' : 'Đang phát triển';

        // Nhồi nội dung HTML vào card
        card.innerHTML = `
            <div class="feature-title">${feature.title}</div>
            <div class="feature-desc">${feature.description}</div>
            <span class="status-badge ${badgeClass}">${badgeText}</span>
        `;

        // Thêm card vào lưới
        featuresList.appendChild(card);
    });
}

// 4. LẮNG NGHE SỰ KIỆN TÌM KIẾM
searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase().trim();

    // Lọc mảng dựa trên tiêu đề, mô tả hoặc keywords
    const filteredFeatures = featuresConfig.filter(feature => {
        const matchTitle = feature.title.toLowerCase().includes(searchTerm);
        const matchDesc = feature.description.toLowerCase().includes(searchTerm);
        const matchKeywords = feature.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm));
        
        return matchTitle || matchDesc || matchKeywords;
    });

    // Vẽ lại danh sách đã lọc
    renderFeatures(filteredFeatures);
});

// 5. CHẠY LẦN ĐẦU KHI VỪA MỞ TRANG
renderFeatures(featuresConfig);
