// --- CẤU HÌNH PDF.JS ---
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
    multiTools: document.getElementById('multiFileTools'),
    
    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    zoomPageText: document.getElementById('zoomPageText'),
    closeModal: document.getElementById('closeModal')
};

let uploadedFiles = [];
let currentSingleFile = null; // FIX: Lưu File Object thay vì ArrayBuffer để tránh bị detached
let pagesData = []; 
let currentPdfDoc = null; 

// --- 1. XỬ LÝ UPLOAD FILE ---
DOM.fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); DOM.dropZone.classList.add('dragover'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));
DOM.dropZone.addEventListener('drop', (e) => { e.preventDefault(); DOM.dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    if (files.length === 0) return;
    uploadedFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (uploadedFiles.length === 0) return alert("Vui lòng chọn file PDF!");

    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    DOM.previewGrid.innerHTML = '';
    DOM.fileList.innerHTML = '';

    if (uploadedFiles.length === 1) {
        currentSingleFile = uploadedFiles[0]; // Lưu lại File gốc
        DOM.singleTools.style.display = 'flex';
        DOM.multiTools.style.display = 'none';
        DOM.fileList.style.display = 'none';
        DOM.previewGrid.style.display = 'grid';
        await renderPDFPreview(currentSingleFile);
    } else {
        currentSingleFile = null;
        DOM.singleTools.style.display = 'none';
        DOM.multiTools.style.display = 'flex';
        DOM.previewGrid.style.display = 'none';
        DOM.fileList.style.display = 'block';
        renderFileList();
    }
}

// --- 2. RENDER XEM TRƯỚC VÀ PHÓNG TO ---
async function renderPDFPreview(file) {
    DOM.loadingMsg.style.display = 'block';
    try {
        // Tạo một buffer tạm thời chỉ để render xem trước
        const tempBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(tempBuffer));
        currentPdfDoc = await loadingTask.promise; 
        
        pagesData = []; 

        for (let i = 1; i <= currentPdfDoc.numPages; i++) {
            pagesData.push({ selected: false, rotation: 0 });

            const page = await currentPdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); 

            const card = document.createElement('div');
            card.className = 'page-card';
            card.dataset.index = i - 1; 
            
            card.innerHTML = `
                <div class="selected-badge">✓</div>
                <canvas></canvas>
                <div class="page-number">Trang ${i}</div>
                <button class="zoom-btn" title="Phóng to">🔍</button>
            `;

            const canvas = card.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: ctx, viewport: viewport }).promise;

            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index);
                pagesData[idx].selected = !pagesData[idx].selected;
                card.classList.toggle('selected');
            });

            const zoomBtn = card.querySelector('.zoom-btn');
            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                openZoomModal(i);
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

// --- 3. LOGIC MODAL PHÓNG TO ---
async function openZoomModal(pageNum) {
    if (!currentPdfDoc) return;
    
    DOM.zoomModal.classList.add('active');
    DOM.zoomPageText.innerText = `Đang tải trang ${pageNum}...`;

    try {
        const page = await currentPdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); 
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        DOM.zoomCanvas.height = viewport.height;
        DOM.zoomCanvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        DOM.zoomPageText.innerText = `Trang ${pageNum}`;
    } catch (error) {
        DOM.zoomPageText.innerText = "Lỗi khi tải trang!";
    }
}

DOM.closeModal.addEventListener('click', () => DOM.zoomModal.classList.remove('active'));
DOM.zoomModal.addEventListener('click', (e) => {
    if (e.target === DOM.zoomModal) DOM.zoomModal.classList.remove('active');
});

// --- 4. CÁC TÍNH NĂNG TRÊN THANH CÔNG CỤ (PDF-LIB & BACKEND) ---
const { PDFDocument, degrees } = PDFLib;

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

document.getElementById('btnReset').addEventListener('click', () => {
    DOM.fileInput.value = '';
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'block';
});

document.getElementById('btnSelectAll').addEventListener('click', () => {
    const cards = document.querySelectorAll('.page-card');
    const allSelected = pagesData.every(p => p.selected);
    
    pagesData.forEach((p, idx) => {
        p.selected = !allSelected; 
        if (p.selected) cards[idx].classList.add('selected');
        else cards[idx].classList.remove('selected');
    });
});

document.getElementById('btnRotate').addEventListener('click', () => {
    const cards = document.querySelectorAll('.page-card');
    pagesData.forEach((p, idx) => {
        if (p.selected) {
            p.rotation = (p.rotation + 90) % 360; 
            const canvas = cards[idx].querySelector('canvas');
            canvas.style.transform = `rotate(${p.rotation}deg)`; 
        }
    });
});

// Lõi xử lý Tách & Xóa (FIX DETACHED ARRAY BUFFER)
async function processSinglePDF(mode) {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    
    try {
        // FIX: Trích xuất một ArrayBuffer hoàn toàn mới từ File gốc
        const freshBuffer = await currentSingleFile.arrayBuffer();
        const sourcePdf = await PDFDocument.load(freshBuffer);
        const newPdf = await PDFDocument.create();
        
        const targetIndexes = pagesData
            .map((p, idx) => (mode === 'extract' && p.selected) || (mode === 'delete' && !p.selected) ? idx : -1)
            .filter(idx => idx !== -1);

        if (targetIndexes.length === 0) {
            throw new Error(mode === 'extract' ? "Vui lòng chọn ít nhất 1 trang để trích xuất!" : "Bạn đã xóa hết tất cả các trang!");
        }

        const copiedPages = await newPdf.copyPages(sourcePdf, targetIndexes);
        
        copiedPages.forEach((page, i) => {
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

// --- LOGIC GIAO DIỆN BẢO MẬT ---
const securityModal = document.getElementById('securityModal');
const pdfPassword = document.getElementById('pdfPassword');
const backendUrlInput = document.getElementById('backendUrlInput');

// Phục hồi link Backend cũ từ bộ nhớ trình duyệt (nếu có)
const savedBackendUrl = localStorage.getItem('hellangel_backend_url');
if (savedBackendUrl) backendUrlInput.value = savedBackendUrl;

// Nút mở bảng bảo mật
document.getElementById('btnPassword').addEventListener('click', () => {
    securityModal.style.display = 'flex';
});

// Nút hủy
document.getElementById('btnCancelSecurity').addEventListener('click', () => {
    securityModal.style.display = 'none';
});

// Nút Xác nhận Khóa (Gửi API)
document.getElementById('btnConfirmSecurity').addEventListener('click', async () => {
    const password = pdfPassword.value.trim();
    const backendUrl = backendUrlInput.value.trim();

    if (!password) return alert("Vui lòng nhập mật khẩu!");
    
    // Lưu link Backend lại để lần sau không cần gõ
    localStorage.setItem('hellangel_backend_url', backendUrl);

    const btn = document.getElementById('btnConfirmSecurity');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Đang khóa...";
    btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('pdfFile', currentSingleFile, currentSingleFile.name);
        formData.append('password', password);
        
        // Thu thập các tick chọn quyền
        formData.append('allowPrint', document.getElementById('chkPrint').checked);
        formData.append('allowEdit', document.getElementById('chkEdit').checked);
        formData.append('allowCopy', document.getElementById('chkCopy').checked);
        formData.append('allowComment', document.getElementById('chkComment').checked);

        const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error(`Phản hồi ${response.status}`);

        const encryptedBlob = await response.blob();
        const url = URL.createObjectURL(encryptedBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `ThienThanDiaNguc_Secured_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        securityModal.style.display = 'none'; // Thành công thì ẩn bảng

    } catch (error) {
        console.error(error);
        alert("Kết nối tới Backend thất bại! Hãy kiểm tra lại đường link Backend.\nLỗi: " + error.message);
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
});

// Gộp nhiều file
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
