// CÁC BIẾN DOM
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const fileListUI = document.getElementById('fileList');
const actionBtn = document.getElementById('actionBtn');
const tabs = document.querySelectorAll('.tab');
const uploadText = document.getElementById('uploadText');
const optionsPanel = document.getElementById('optionsPanel');
const pageInputGroup = document.getElementById('pageInputGroup');
const rotateInputGroup = document.getElementById('rotateInputGroup');
const pageRangeInput = document.getElementById('pageRange');
const pageHelpText = document.getElementById('pageHelpText');

let selectedFiles = [];
let currentMode = 'merge'; // Mặc định là gộp file

// --- XỬ LÝ CHUYỂN ĐỔI TAB (CHẾ ĐỘ) ---
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Cập nhật UI active
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentMode = tab.getAttribute('data-mode');

        // Reset dữ liệu khi đổi chế độ
        selectedFiles = [];
        renderFileList();
        
        // Điều chỉnh giao diện theo chế độ
        if (currentMode === 'merge') {
            fileInput.multiple = true;
            uploadText.innerText = 'Chọn nhiều file PDF để gộp';
            optionsPanel.classList.remove('active');
            actionBtn.innerText = 'Gộp PDF & Tải về';
        } else {
            fileInput.multiple = false; // Tách, Xóa, Xoay chỉ làm trên 1 file
            uploadText.innerText = 'Chọn 1 file PDF để xử lý';
            optionsPanel.classList.add('active');
            
            if (currentMode === 'rotate') {
                pageInputGroup.style.display = 'none';
                rotateInputGroup.style.display = 'block';
                actionBtn.innerText = 'Xoay PDF & Tải về';
            } else {
                pageInputGroup.style.display = 'block';
                rotateInputGroup.style.display = 'none';
                actionBtn.innerText = currentMode === 'extract' ? 'Trích xuất & Tải về' : 'Xóa trang & Tải về';
                pageHelpText.innerText = currentMode === 'extract' ? 'Các trang này sẽ được tạo thành file mới.' : 'Các trang này sẽ bị xóa khỏi file gốc.';
            }
        }
    });
});

// --- XỬ LÝ CHỌN FILE ---
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

dropZone.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    dropZone.classList.add('dragover'); 
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover'); 
}); // ĐÃ SỬA LỖI CÚ PHÁP Ở ĐÂY

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
    if (currentMode !== 'merge' && files.length > 0) {
        selectedFiles = [files[0]]; // Nếu không phải merge, chỉ lấy file đầu tiên
    } else {
        for (let file of files) {
            if (file.type === 'application/pdf') selectedFiles.push(file);
        }
    }
    fileInput.value = ''; 
    renderFileList();
}

function renderFileList() {
    fileListUI.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <span>${index + 1}. ${file.name}</span>
            <button class="remove-btn" onclick="removeFile(${index})">×</button>
        `;
        fileListUI.appendChild(li);
    });

    // Điều kiện bật nút: Merge cần >= 2 file, các chức năng khác cần 1 file
    actionBtn.disabled = currentMode === 'merge' ? selectedFiles.length < 2 : selectedFiles.length !== 1;
}

window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    renderFileList();
}

// --- HÀM HỖ TRỢ: PHÂN TÍCH CHUỖI SỐ TRANG ---
function parsePageNumbers(inputStr, totalPages) {
    let pages = new Set();
    let parts = inputStr.split(',');
    
    for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
            let [start, end] = part.split('-').map(Number);
            if (start > 0 && end <= totalPages && start <= end) {
                for (let i = start; i <= end; i++) pages.add(i - 1); 
            }
        } else {
            let num = Number(part);
            if (num > 0 && num <= totalPages) pages.add(num - 1);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

// --- XỬ LÝ LÕI PDF ---
actionBtn.addEventListener('click', async () => {
    try {
        actionBtn.disabled = true;
        const originalText = actionBtn.innerText;
        actionBtn.innerText = 'Đang xử lý...';

        const { PDFDocument, degrees } = PDFLib;
        let finalPdfBytes;
        let outputName = `ThienThanDiaNguc_${currentMode}_${new Date().getTime()}.pdf`;

        // CHẾ ĐỘ 1: GỘP FILE (MERGE)
        if (currentMode === 'merge') {
            const mergedPdf = await PDFDocument.create();
            for (let file of selectedFiles) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
            finalPdfBytes = await mergedPdf.save();
        } 
        // CÁC CHẾ ĐỘ FILE ĐƠN
        else {
            const arrayBuffer = await selectedFiles[0].arrayBuffer();
            const sourcePdf = await PDFDocument.load(arrayBuffer);
            const totalPages = sourcePdf.getPageCount();

            // CHẾ ĐỘ 2: TRÍCH XUẤT (EXTRACT)
            if (currentMode === 'extract') {
                const targetPages = parsePageNumbers(pageRangeInput.value, totalPages);
                if (targetPages.length === 0) throw new Error("Số trang không hợp lệ!");
                
                const newPdf = await PDFDocument.create();
                const copiedPages = await newPdf.copyPages(sourcePdf, targetPages);
                copiedPages.forEach(page => newPdf.addPage(page));
                finalPdfBytes = await newPdf.save();
            }
            
            // CHẾ ĐỘ 3: XÓA TRANG (DELETE)
            else if (currentMode === 'delete') {
                const targetPages = parsePageNumbers(pageRangeInput.value, totalPages);
                if (targetPages.length === 0) throw new Error("Số trang không hợp lệ!");
                
                targetPages.sort((a, b) => b - a).forEach(pageIndex => {
                    sourcePdf.removePage(pageIndex);
                });
                finalPdfBytes = await sourcePdf.save();
            }
            
            // CHẾ ĐỘ 4: XOAY TRANG (ROTATE)
            else if (currentMode === 'rotate') {
                const angle = parseInt(document.getElementById('rotateDegree').value);
                const pages = sourcePdf.getPages();
                pages.forEach(page => {
                    const currentRotation = page.getRotation().angle;
                    page.setRotation(degrees(currentRotation + angle));
                });
                finalPdfBytes = await sourcePdf.save();
            }
        }

        // TẢI FILE XUỐNG
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        actionBtn.innerText = originalText;
        actionBtn.disabled = false;

    } catch (error) {
        console.error("Lỗi:", error);
        alert(error.message || "Có lỗi xảy ra khi xử lý file. Vui lòng kiểm tra lại cấu hình (ví dụ: số trang).");
        actionBtn.innerText = 'Thử lại';
        actionBtn.disabled = false;
    }
});
