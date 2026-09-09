pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

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
    
    // Zoom Modal DOMs
    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    zoomPageText: document.getElementById('zoomPageText'),
    closeModal: document.getElementById('closeModal')
};

let uploadedFiles = [];
let singleFileBuffer = null;
let pagesData = []; 
let currentPdfDoc = null; // Biến lưu trữ PDF để dùng cho tính năng Zoom

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
        DOM.singleTools.style.display = 'flex';
        DOM.multiTools.style.display = 'none';
        DOM.fileList.style.display = 'none';
        DOM.previewGrid.style.display = 'grid';
        await renderPDFPreview(uploadedFiles[0]);
    } else {
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
        singleFileBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(new Uint8Array(singleFileBuffer));
        currentPdfDoc = await loadingTask.promise; // Lưu lại để dùng khi phóng to
        
        pagesData = []; 

        for (let i = 1; i <= currentPdfDoc.numPages; i++) {
            pagesData.push({ selected: false, rotation: 0 });

            const page = await currentPdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); 

            const card = document.createElement('div');
            card.className = 'page-card';
            card.dataset.index = i - 1; 
            
            // Cấu trúc Card có thêm nút Kính lúp (Zoom)
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

            // Sự kiện chọn trang
            card.addEventListener('click', () => {
                const idx = parseInt(card.dataset.index);
                pagesData[idx].selected = !pagesData[idx].selected;
                card.classList.toggle('selected');
            });

            // Sự kiện click nút Kính lúp (Ngăn chặn sự kiện click lan ra ngoài Card)
            const zoomBtn = card.querySelector('.zoom-btn');
            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Không cho kích hoạt sự kiện chọn trang
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
        // Scale 2.0 để render ảnh chất lượng cao khi phóng to
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

// Đóng Modal khi click dấu X hoặc click ra ngoài viền
DOM.closeModal.addEventListener('click', () => DOM.zoomModal.classList.remove('active'));
DOM.zoomModal.addEventListener('click', (e) => {
    if (e.target === DOM.zoomModal) DOM.zoomModal.classList.remove('active');
});

// --- 4. CÁC TÍNH NĂNG TRÊN THANH CÔNG CỤ ---
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

// Nút Đặt mật khẩu (Báo hiệu giới hạn hệ thống)
document.getElementById('btnPassword').addEventListener('click', () => {
    alert("⚠️ LƯU Ý KỸ THUẬT:\n\nTrang web này hoạt động 100% trên trình duyệt của bạn (không gửi file lên Server để bảo mật dữ liệu tuyệt đối). \n\nTuy nhiên, công nghệ JavaScript Client-side hiện tại chưa hỗ trợ mã hóa (Encrypt) để tạo mật khẩu cho PDF.\n\nTính năng này sẽ được cập nhật trong tương lai khi công nghệ WebAssembly được tích hợp!");
});

async function processSinglePDF(mode) {
    const btn = event.target;
    const oldText = btn.innerText;
    btn.innerText = "Đang xử lý...";
    
    try {
        const sourcePdf = await PDFDocument.load(singleFileBuffer);
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
