// --- CẤU HÌNH PDF.JS BẮT BUỘC ---
// Thiết lập worker để pdf.js có thể vẽ ảnh trên trình duyệt
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// --- BIẾN TOÀN CỤC ---
const DOM = {
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    previewGrid: document.getElementById('previewGrid'),
    fileList: document.getElementById('fileList'),
    loadingMsg: document.getElementById('loadingMsg'),
    singleTools: document.getElementById('singleFileTools'),
    multiTools: document.getElementById('multiFileTools')
};

let uploadedFiles = [];
let singleFileBuffer = null;
let pagesData = []; // Lưu trạng thái từng trang: { selected: false, rotation: 0 }

// --- 1. XỬ LÝ UPLOAD FILE ---
DOM.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragover'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));
DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});

async function handleFiles(files) {
    if (files.length === 0) return;
    
    // Chỉ lọc lấy file PDF
    uploadedFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (uploadedFiles.length === 0) return alert("Vui lòng chọn file PDF!");

    // Chuyển UI sang Workspace
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    DOM.previewGrid.innerHTML = '';
    DOM.fileList.innerHTML = '';

    if (uploadedFiles.length === 1) {
        // Chế độ 1 File: Hiện lưới xem trước
        DOM.singleTools.style.display = 'flex';
        DOM.multiTools.style.display = 'none';
        DOM.fileList.style.display = 'none';
        DOM.previewGrid.style.display = 'grid';
        await renderPDFPreview(uploadedFiles[0]);
    } else {
        // Chế độ Nhiều File: Hiện danh sách để gộp
        DOM.singleTools.style.display = 'none';
        DOM.multiTools.style.display = 'flex';
        DOM.previewGrid.style.display = 'none';
        DOM.fileList.style.display = 'block';
        renderFileList();
    }
}

// --- 2. RENDER XEM TRƯỚC (PDF.JS) ---
async function renderPDFPreview(file) {
    DOM.loadingMsg.style.display = 'block';
    try {
        singleFileBuffer = await file.arrayBuffer();
        
        // Gọi thư viện Mozilla đọc PDF
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(singleFileBuffer));
        const pdfDoc = await loadingTask.promise;
        
        pagesData = []; // Reset dữ liệu trang

        // Lặp qua từng trang để vẽ lên Canvas
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            pagesData.push({ selected: false, rotation: 0 });

            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // Scale nhỏ để load nhanh

            // Tạo thẻ Card
            const card = document.createElement('div');
            card.className = 'page-card';
            card.dataset.index = i - 1; // Index mảng (0-based)
            card.innerHTML = `
                <div class="selected-badge">✓</div>
                <canvas></canvas>
                <div class="page-number">Trang ${i}</div>
            `;

            // Vẽ Canvas
            const canvas = card.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            // Xử lý sự kiện click chọn trang
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index);
                pagesData[idx].selected = !pagesData[idx].selected;
                card.classList.toggle('selected');
            });

            DOM.previewGrid.appendChild(card);
        }
    } catch (error) {
        alert("Lỗi khi đọc file xem trước: " + error.message);
    }
    DOM.loadingMsg.style.display = 'none';
}

function renderFileList() {
    uploadedFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `<span>${index + 1}. ${file.name}</span>`;
        DOM.fileList.appendChild(li);
    });
}

// --- 3. XỬ LÝ CÁC NÚT TRÊN THANH CÔNG CỤ (PDF-LIB) ---

const { PDFDocument, degrees } = PDFLib;

// Hàm tải file về máy
function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Nút Quay lại/Tải file khác
document.getElementById('btnReset').addEventListener('click', () => {
    DOM.fileInput.value = '';
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'block';
});

// Chức năng: Chọn tất cả trang
document.getElementById('btnSelectAll').addEventListener('click', () => {
    const cards = document.querySelectorAll('.page-card');
    const allSelected = pagesData.every(p => p.selected);
    
    pagesData.forEach((p, idx) => {
        p.selected = !allSelected; // Nếu đã chọn hết thì bỏ chọn, ngược lại chọn hết
        if (p.selected) cards[idx].classList.add('selected');
        else cards[idx].classList.remove('selected');
    });
});

// Chức năng: Xoay trang (Giao diện + Dữ liệu)
document.getElementById('btnRotate').addEventListener('click', () => {
    const cards = document.querySelectorAll('.page-card');
    pagesData.forEach((p, idx) => {
        if (p.selected) {
            p.rotation = (p.rotation + 90) % 360; // Tăng 90 độ
            const canvas = cards[idx].querySelector('canvas');
            canvas.style.transform = `rotate(${p.rotation}deg)`; // Quay bằng CSS để user thấy liền
        }
    });
});

// Lõi xử lý chung cho Trích xuất và Xóa
async function processSinglePDF(mode) {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    
    try {
        const sourcePdf = await PDFDocument.load(singleFileBuffer);
        const newPdf = await PDFDocument.create();
        
        // Trích xuất: Giữ trang Selected. Xóa: Giữ trang Unselected.
        const targetIndexes = pagesData
            .map((p, idx) => (mode === 'extract' && p.selected) || (mode === 'delete' && !p.selected) ? idx : -1)
            .filter(idx => idx !== -1);

        if (targetIndexes.length === 0) {
            throw new Error(mode === 'extract' ? "Vui lòng chọn ít nhất 1 trang để trích xuất!" : "Bạn đã xóa hết tất cả các trang!");
        }

        const copiedPages = await newPdf.copyPages(sourcePdf, targetIndexes);
        
        copiedPages.forEach((page, i) => {
            // Áp dụng góc xoay nếu user có bấm xoay
            const originalIndex = targetIndexes[i];
            const addedRotation = pagesData[originalIndex].rotation;
            if (addedRotation > 0) {
                const currentAngle = page.getRotation().angle;
                page.setRotation(degrees(currentAngle + addedRotation));
            }
            newPdf.addPage(page);
        });

        const pdfBytes = await newPdf.save();
        downloadBlob(pdfBytes, `ThienThanDiaNguc_${mode}_${Date.now()}.pdf`);
    } catch (error) {
        alert(error.message);
    }
    
    btn.innerText = oldText;
}

document.getElementById('btnExtract').addEventListener('click', () => processSinglePDF('extract'));
document.getElementById('btnDelete').addEventListener('click', () => processSinglePDF('delete'));

// Chức năng: Gộp File
document.getElementById('btnMerge').addEventListener('click', async (e) => {
    const btn = e.target;
    btn.innerText = "Đang gộp...";
    try {
        const mergedPdf = await PDFDocument.create();
        for (let file of uploadedFiles) {
            const buffer = await file.arrayBuffer();
            const pdf = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(p => mergedPdf.addPage(p));
        }
        const pdfBytes = await mergedPdf.save();
        downloadBlob(pdfBytes, `ThienThanDiaNguc_Merged_${Date.now()}.pdf`);
    } catch (error) {
        alert("Lỗi khi gộp file!");
    }
    btn.innerText = "Gộp tất cả file";
});
