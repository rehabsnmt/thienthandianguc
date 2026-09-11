pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const { PDFDocument, degrees } = PDFLib;

// DOM Elements
const DOM = {
    homeScreen: document.getElementById('homeScreen'),
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    uploadTitle: document.getElementById('uploadTitle'),
    uploadSub: document.getElementById('uploadSub'),
    
    previewGrid: document.getElementById('previewGrid'),
    loadingMsg: document.getElementById('loadingMsg'),
    
    btnBackHome: document.getElementById('btnBackHome'),
    btnCancel: document.getElementById('btnCancel'),
    btnExecute: document.getElementById('btnExecute'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnInvert: document.getElementById('btnInvert'),
    btnActionRotate: document.getElementById('btnActionRotate'),

    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    zoomPageText: document.getElementById('zoomPageText'),
    closeModal: document.getElementById('closeModal'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage')
};

// State Variables
let currentMode = ''; // merge, extract, delete, rotate
let uploadedFiles = [];
let pdfDocuments = [];
let sourcePdfDocuments = [];
let pagesData = []; // Model lưu trữ chung cho cả 1 file và nhiều file
let currentZoomIndex = -1;

// ==========================================
// BƯỚC 1: CHỌN TÍNH NĂNG
// ==========================================
document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        DOM.homeScreen.style.display = 'none';
        DOM.uploadScreen.style.display = 'block';

        if (currentMode === 'merge') {
            DOM.fileInput.multiple = true;
            DOM.uploadTitle.innerText = 'Kéo thả nhiều file PDF vào đây';
            DOM.uploadSub.innerText = 'Sau đó bạn có thể kéo thả để đổi vị trí các trang';
        } else {
            DOM.fileInput.multiple = false;
            DOM.uploadTitle.innerText = 'Kéo thả 1 file PDF vào đây';
            DOM.uploadSub.innerText = currentMode === 'rotate' ? 'Để xoay các trang bị ngược' : 'Để chọn các trang cần xử lý';
        }
    });
});

DOM.btnBackHome.addEventListener('click', resetToHome);
DOM.btnCancel.addEventListener('click', resetToHome);

function resetToHome() {
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'none';
    DOM.homeScreen.style.display = 'block';
    DOM.fileInput.value = '';
    uploadedFiles = []; pdfDocuments = []; sourcePdfDocuments = []; pagesData = [];
}

// ==========================================
// BƯỚC 2: UPLOAD & PHÂN TÍCH FILE
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert("Vui lòng chọn file PDF!");
    if (currentMode === 'merge' && validFiles.length < 2) return alert("Vui lòng chọn từ 2 file trở lên để Gộp!");

    uploadedFiles = currentMode === 'merge' ? validFiles : [validFiles[0]];
    
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    setupWorkspaceUI();
    
    DOM.loadingMsg.style.display = 'block';
    
    try {
        for (let fileIdx = 0; fileIdx < uploadedFiles.length; fileIdx++) {
            const buffer = await uploadedFiles[fileIdx].arrayBuffer();
            
            sourcePdfDocuments[fileIdx] = await PDFDocument.load(buffer.slice(0));
            const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
            pdfDocuments[fileIdx] = pdfJsDoc;

            for (let pageIdx = 0; pageIdx < pdfJsDoc.numPages; pageIdx++) {
                pagesData.push({ fileIdx, pageIdx, selected: false, rotation: 0 });
            }
        }
        await renderGrid();
    } catch (error) {
        alert("Lỗi tải file: " + error.message);
        resetToHome();
    }
    DOM.loadingMsg.style.display = 'none';
}

function setupWorkspaceUI() {
    // Ẩn hiện các nút công cụ tùy theo Mode
    const isSelectionMode = ['extract', 'delete', 'rotate'].includes(currentMode);
    DOM.btnSelectAll.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnInvert.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnActionRotate.style.display = currentMode === 'rotate' ? 'block' : 'none';

    // Đổi tên nút Thực Thi
    const executeTitles = {
        'merge': '⬇ Xuất File Đã Gộp',
        'extract': '⬇ Trích Xuất File',
        'delete': '⬇ Xóa & Xuất File',
        'rotate': '⬇ Xuất File Đã Xoay'
    };
    DOM.btnExecute.innerText = executeTitles[currentMode];
}

// ==========================================
// BƯỚC 3: RENDER GIAO DIỆN XEM TRƯỚC VÀ KÉO THẢ
// ==========================================
async function renderGrid() {
    DOM.previewGrid.innerHTML = '';
    
    for (let i = 0; i < pagesData.length; i++) {
        const item = pagesData[i];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        const viewport = page.getViewport({ scale: 0.4 });
        
        const card = document.createElement('div');
        card.className = 'page-card';
        card.draggable = true;
        card.dataset.index = i;
        if(item.selected) card.classList.add('selected');
        
        const titleText = currentMode === 'merge' ? uploadedFiles[item.fileIdx].name : `Trang ${item.pageIdx + 1}`;

        card.innerHTML = `
            <div class="selected-badge">✓</div>
            <canvas></canvas>
            <div class="page-number" style="font-size:0.75rem; color:#64748b; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titleText}</div>
            <button class="zoom-btn" title="Xem toàn trang">🔍</button>
        `;
        
        const canvas = card.querySelector('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        applyCardRotation(card, item.rotation);

        // Click chọn trang
        if (currentMode !== 'merge') {
            card.addEventListener('click', () => {
                item.selected = !item.selected;
                card.classList.toggle('selected', item.selected);
            });
        }

        // Click Phóng to
        card.querySelector('.zoom-btn').addEventListener('click', e => {
            e.stopPropagation(); openZoomModal(i);
        });

        // Kéo thả sắp xếp
        card.addEventListener('dragstart', e => { card.classList.add('dragging'); e.dataTransfer.setData('text/plain', i); });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
        card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
        card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
        card.addEventListener('drop', async e => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = parseInt(card.dataset.index);
            if (fromIdx !== toIdx) {
                const movedPage = pagesData.splice(fromIdx, 1)[0];
                pagesData.splice(toIdx, 0, movedPage);
                await renderGrid(); 
            }
        });

        DOM.previewGrid.appendChild(card);
    }
}

function applyCardRotation(card, rotation) {
    const canvas = card.querySelector('canvas');
    if (canvas) canvas.style.transform = `rotate(${rotation}deg)`;
}

// Các nút phụ trợ
DOM.btnSelectAll.addEventListener('click', () => { pagesData.forEach(p => p.selected = true); renderGrid(); });
DOM.btnInvert.addEventListener('click', () => { pagesData.forEach(p => p.selected = !p.selected); renderGrid(); });
DOM.btnActionRotate.addEventListener('click', () => {
    pagesData.forEach(p => { if (p.selected) p.rotation = (p.rotation + 90) % 360; });
    renderGrid();
});

// ==========================================
// BƯỚC 4: THỰC THI (XUẤT PDF)
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    DOM.loadingMsg.innerText = "Đang xử lý...";
    DOM.loadingMsg.style.display = 'block';
    
    try {
        const newPdf = await PDFDocument.create();
        
        // Lọc ra các trang cần giữ lại dựa theo Mode
        let pagesToKeep = [];
        if (currentMode === 'merge' || currentMode === 'rotate') {
            pagesToKeep = pagesData; // Giữ hết
        } else if (currentMode === 'extract') {
            pagesToKeep = pagesData.filter(p => p.selected);
        } else if (currentMode === 'delete') {
            pagesToKeep = pagesData.filter(p => !p.selected);
        }

        if (pagesToKeep.length === 0) throw new Error("Không có trang nào để xuất! Vui lòng kiểm tra lại thao tác.");

        for (const item of pagesToKeep) {
            const sourcePdf = sourcePdfDocuments[item.fileIdx];
            const copiedPages = await newPdf.copyPages(sourcePdf, [item.pageIdx]);
            const page = copiedPages[0];
            
            if (item.rotation !== 0) page.setRotation(degrees(page.getRotation().angle + item.rotation));
            newPdf.addPage(page);
        }
        
        const bytes = await newPdf.save();
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url; a.download = `ThienThanDiaNguc_${currentMode}_${Date.now()}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
    } catch (error) {
        alert(error.message);
    }
    DOM.loadingMsg.style.display = 'none';
});

// ==========================================
// MODAL ZOOM & ĐIỀU HƯỚNG
// ==========================================
async function openZoomModal(index) {
    currentZoomIndex = index;
    DOM.zoomModal.classList.add('active');
    DOM.zoomPageText.innerText = `Đang tải...`;
    
    DOM.btnPrevPage.style.display = index > 0 ? 'block' : 'none';
    DOM.btnNextPage.style.display = index < pagesData.length - 1 ? 'block' : 'none';

    try {
        const item = pagesData[index];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        
        let viewport = page.getViewport({ scale: 1 });
        const scale = Math.min((window.innerWidth * 0.85) / viewport.width, (window.innerHeight * 0.85) / viewport.height, 2.5); 
        viewport = page.getViewport({ scale: scale });
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        DOM.zoomCanvas.width = viewport.width;
        DOM.zoomCanvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        DOM.zoomPageText.innerText = currentMode === 'merge' ? `${uploadedFiles[item.fileIdx].name} (Trang ${item.pageIdx + 1})` : `Trang ${item.pageIdx + 1}`;
    } catch (error) {
        DOM.zoomPageText.innerText = "Lỗi tải trang!";
    }
}

DOM.btnPrevPage.addEventListener('click', (e) => { e.stopPropagation(); if (currentZoomIndex > 0) openZoomModal(currentZoomIndex - 1); });
DOM.btnNextPage.addEventListener('click', (e) => { e.stopPropagation(); if (currentZoomIndex < pagesData.length - 1) openZoomModal(currentZoomIndex + 1); });

document.addEventListener('keydown', (e) => {
    if (!DOM.zoomModal.classList.contains('active')) return;
    if (e.key === 'ArrowLeft' && currentZoomIndex > 0) openZoomModal(currentZoomIndex - 1);
    else if (e.key === 'ArrowRight' && currentZoomIndex < pagesData.length - 1) openZoomModal(currentZoomIndex + 1);
    else if (e.key === 'Escape') DOM.zoomModal.classList.remove('active');
});

DOM.closeModal.addEventListener('click', () => DOM.zoomModal.classList.remove('active'));
DOM.zoomModal.addEventListener('click', e => { if (e.target === DOM.zoomModal) DOM.zoomModal.classList.remove('active'); });
