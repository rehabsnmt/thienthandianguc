// ============================================================
// CẤU HÌNH PDF.JS
// ============================================================
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// ============================================================
// DOM
// ============================================================
const DOM = {
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    previewGrid: document.getElementById('previewGrid'),
    fileList: document.getElementById('fileList'),
    loadingMsg: document.getElementById('loadingMsg'),
    
    sharedTools: document.getElementById('sharedTools'),
    singleTools: document.getElementById('singleFileTools'),
    multiTools: document.getElementById('multiFileTools'),
    
    zoomModal: document.getElementById('zoomModal'),
    zoomCanvas: document.getElementById('zoomCanvas'),
    zoomPageText: document.getElementById('zoomPageText'),
    closeModal: document.getElementById('closeModal'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage'),
    
    btnReset: document.getElementById('btnReset'),
    btnSelectAll: document.getElementById('btnSelectAll'),
    btnInvertSelect: document.getElementById('btnInvertSelect'),
    btnRotate: document.getElementById('btnRotate'),
    btnExtract: document.getElementById('btnExtract'),
    btnDelete: document.getElementById('btnDelete'),
    btnPassword: document.getElementById('btnPassword'),
    btnMerge: document.getElementById('btnMerge')
};

// BIẾN TOÀN CỤC
let uploadedFiles = [];
let pdfDocuments = [];
let sourcePdfDocuments = [];
let currentMode = 'none';
let currentSingleFile = null;
let pagesData = [];
let documentPages = [];
let currentZoomIndex = -1; 

const { PDFDocument, degrees } = PDFLib;

// ============================================================
// UPLOAD FILE
// ============================================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('dragover'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('dragover'));
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    if (!files || files.length === 0) return;
    uploadedFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    if (uploadedFiles.length === 0) return alert('Vui lòng chọn file PDF!');

    pdfDocuments = [];
    sourcePdfDocuments = [];
    pagesData = [];
    documentPages = [];
    
    currentMode = uploadedFiles.length === 1 ? 'single' : 'multi';
    currentSingleFile = currentMode === 'single' ? uploadedFiles[0] : null;

    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    DOM.previewGrid.innerHTML = '';
    DOM.fileList.innerHTML = '';
    
    DOM.sharedTools.style.display = 'flex'; 

    if (currentMode === 'single') {
        DOM.singleTools.style.display = 'flex';
        DOM.multiTools.style.display = 'none';
        DOM.fileList.style.display = 'none';
        DOM.previewGrid.style.display = 'block'; // Đổi thành block để bọc Grid + Header
        await loadSinglePDF(currentSingleFile);
    } else {
        DOM.singleTools.style.display = 'none';
        DOM.multiTools.style.display = 'flex';
        DOM.fileList.style.display = 'none';
        DOM.previewGrid.style.display = 'block';
        await loadMultiplePDFs();
    }
}

// ============================================================
// LOAD SINGLE PDF
// ============================================================
async function loadSinglePDF(file) {
    showLoading('Đang tải bản xem trước... Vui lòng đợi.');
    try {
        const buffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        pdfDocuments = [pdfJsDoc];

        for (let i = 0; i < pdfJsDoc.numPages; i++) {
            // sourcePage lưu vị trí gốc của trang để phục vụ cho tính năng sắp xếp
            pagesData.push({ sourcePage: i, selected: false, rotation: 0 });
        }
        await renderSingleSource();
    } catch (error) {
        alert('Lỗi khi đọc file PDF: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function renderSingleSource() {
    DOM.previewGrid.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'multi-preview-header';
    header.innerHTML = `
        <div><strong>Tất cả các trang</strong> <span style="color:#94a3b8; font-size:14px; margin-left:10px;">${pagesData.length} trang</span></div>
        <div style="color:#94a3b8; font-size:13px;">Kéo thả để sắp xếp vị trí</div>
    `;
    DOM.previewGrid.appendChild(header);

    const grid = document.createElement('div');
    grid.id = 'singlePageGrid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 18px; padding: 10px 0;';
    DOM.previewGrid.appendChild(grid);

    for (let i = 0; i < pagesData.length; i++) await createSinglePageCard(i, grid);
}

async function createSinglePageCard(pageIndex, grid) {
    const data = pagesData[pageIndex];
    const page = await pdfDocuments[0].getPage(data.sourcePage + 1); // Render trang đúng với vị trí gốc
    const viewport = page.getViewport({ scale: 0.5 });
    
    const card = document.createElement('div');
    card.className = 'page-card';
    card.draggable = true;
    card.dataset.index = pageIndex;
    
    card.innerHTML = `
        <div class="selected-badge">✓</div>
        <canvas></canvas>
        <div class="page-number">Trang ${data.sourcePage + 1}</div>
        <button class="zoom-btn" title="Xem toàn trang">🔍</button>
    `;

    const canvas = card.querySelector('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;

    applyCardRotation(card, data.rotation);

    card.addEventListener('click', () => {
        data.selected = !data.selected;
        card.classList.toggle('selected', data.selected);
    });

    card.querySelector('.zoom-btn').addEventListener('click', e => {
        e.stopPropagation();
        openZoomModal(pageIndex); 
    });

    // Tính năng Kéo & Thả cho Single Mode
    card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', pageIndex);
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.page-card').forEach(el => el.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async e => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = parseInt(card.dataset.index);
        if (fromIndex !== targetIndex) {
            const movedPage = pagesData.splice(fromIndex, 1)[0];
            pagesData.splice(targetIndex, 0, movedPage);
            await renderSingleSource();
        }
    });

    grid.appendChild(card);
}

// ============================================================
// LOAD MULTIPLE PDFs
// ============================================================
async function loadMultiplePDFs() {
    showLoading('Đang tải tất cả các trang PDF...');
    try {
        for (let fileIndex = 0; fileIndex < uploadedFiles.length; fileIndex++) {
            const file = uploadedFiles[fileIndex];
            const buffer = await file.arrayBuffer();
            
            const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
            pdfDocuments[fileIndex] = pdfJsDoc;

            const sourcePdf = await PDFDocument.load(buffer.slice(0));
            sourcePdfDocuments[fileIndex] = sourcePdf;

            for (let pageIndex = 0; pageIndex < pdfJsDoc.numPages; pageIndex++) {
                documentPages.push({ fileIndex, pageIndex, rotation: 0, selected: false });
            }
        }
        await renderMultiSource();
    } catch (error) {
        alert('Lỗi: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function renderMultiSource() {
    DOM.previewGrid.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'multi-preview-header';
    header.innerHTML = `
        <div><strong>Tất cả các trang</strong> <span style="color:#94a3b8; font-size:14px; margin-left:10px;">${documentPages.length} trang</span></div>
        <div style="color:#94a3b8; font-size:13px;">Kéo thả để sắp xếp vị trí</div>
    `;
    DOM.previewGrid.appendChild(header);

    const grid = document.createElement('div');
    grid.id = 'multiPageGrid';
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 18px; padding: 10px 0;';
    DOM.previewGrid.appendChild(grid);

    for (let i = 0; i < documentPages.length; i++) await createMultiPageCard(i, grid);
}

async function createMultiPageCard(documentIndex, grid) {
    const item = documentPages[documentIndex];
    const pdfDoc = pdfDocuments[item.fileIndex];
    const page = await pdfDoc.getPage(item.pageIndex + 1);
    const viewport = page.getViewport({ scale: 0.5 });
    
    const card = document.createElement('div');
    card.className = 'page-card multi-page-card';
    card.draggable = true;
    card.dataset.index = documentIndex;
    
    const fileName = uploadedFiles[item.fileIndex].name;

    card.innerHTML = `
        <div class="selected-badge">✓</div>
        <canvas></canvas>
        <div class="page-number">Trang ${item.pageIndex + 1}</div>
        <div class="multi-page-source" title="${fileName}">${fileName}</div>
        <button class="zoom-btn" title="Xem toàn trang">🔍</button>
    `;

    const canvas = card.querySelector('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;

    applyCardRotation(card, item.rotation);

    card.addEventListener('click', () => {
        item.selected = !item.selected;
        card.classList.toggle('selected', item.selected);
    });

    card.querySelector('.zoom-btn').addEventListener('click', e => {
        e.stopPropagation();
        openZoomModal(documentIndex);
    });

    // Kéo Thả Multi Mode
    card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', documentIndex);
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        document.querySelectorAll('.multi-page-card').forEach(el => el.classList.remove('drag-over'));
    });
    card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async e => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const targetIndex = parseInt(card.dataset.index);
        if (fromIndex !== targetIndex) {
            const movedPage = documentPages.splice(fromIndex, 1)[0];
            documentPages.splice(targetIndex, 0, movedPage);
            await renderMultiSource();
        }
    });

    grid.appendChild(card);
}

function applyCardRotation(card, rotation) {
    const canvas = card.querySelector('canvas');
    if (canvas) canvas.style.transform = `rotate(${rotation}deg)`;
}

// ============================================================
// LOGIC CHỌN TRANG (CHUNG)
// ============================================================
function updateSelectionUI() {
    const isSingle = currentMode === 'single';
    const selector = isSingle ? '#singlePageGrid .page-card' : '#multiPageGrid .multi-page-card';
    const dataArr = isSingle ? pagesData : documentPages;
    
    document.querySelectorAll(selector).forEach((card, idx) => {
        card.classList.toggle('selected', dataArr[idx].selected);
    });
}

DOM.btnSelectAll.addEventListener('click', () => {
    const arr = currentMode === 'single' ? pagesData : documentPages;
    arr.forEach(p => p.selected = true);
    updateSelectionUI();
});

DOM.btnInvertSelect.addEventListener('click', () => {
    const arr = currentMode === 'single' ? pagesData : documentPages;
    arr.forEach(p => p.selected = !p.selected);
    updateSelectionUI();
});

DOM.btnDelete.addEventListener('click', async () => {
    if (currentMode === 'single') {
        processSinglePDF('delete');
    } else if (currentMode === 'multi') {
        const originalLength = documentPages.length;
        documentPages = documentPages.filter(p => !p.selected);
        if (documentPages.length === 0) return alert("Bạn đã xóa hết tất cả các trang!");
        if (documentPages.length !== originalLength) await renderMultiSource();
    }
});


// ============================================================
// XEM TOÀN TRANG & ĐIỀU HƯỚNG (BÀN PHÍM + CLICK)
// ============================================================
async function openZoomModal(index) {
    currentZoomIndex = index;
    DOM.zoomModal.classList.add('active');
    DOM.zoomPageText.innerText = `Đang tải...`;
    
    const isSingle = currentMode === 'single';
    const maxIndex = (isSingle ? pagesData : documentPages).length - 1;
    
    DOM.btnPrevPage.style.display = index > 0 ? 'block' : 'none';
    DOM.btnNextPage.style.display = index < maxIndex ? 'block' : 'none';

    try {
        let pdfDoc, pageNum;
        if (isSingle) {
            pdfDoc = pdfDocuments[0];
            pageNum = pagesData[index].sourcePage + 1; // Load đúng vị trí gốc
        } else {
            const item = documentPages[index];
            pdfDoc = pdfDocuments[item.fileIndex];
            pageNum = item.pageIndex + 1;
        }

        const page = await pdfDoc.getPage(pageNum);
        
        let viewport = page.getViewport({ scale: 1 });
        const screenWidth = window.innerWidth * 0.85;
        const screenHeight = window.innerHeight * 0.85;
        const scale = Math.min(screenWidth / viewport.width, screenHeight / viewport.height, 2.5); 
        
        viewport = page.getViewport({ scale: scale });
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        DOM.zoomCanvas.width = viewport.width;
        DOM.zoomCanvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        DOM.zoomPageText.innerText = isSingle ? `Trang ${pageNum}` : `Trang ${pageNum} (${uploadedFiles[documentPages[index].fileIndex].name})`;
    } catch (error) {
        DOM.zoomPageText.innerText = "Lỗi tải trang!";
    }
}

// Bấm nút Trên UI
DOM.btnPrevPage.addEventListener('click', (e) => { e.stopPropagation(); if (currentZoomIndex > 0) openZoomModal(currentZoomIndex - 1); });
DOM.btnNextPage.addEventListener('click', (e) => {
    e.stopPropagation();
    const max = (currentMode === 'single' ? pagesData : documentPages).length - 1;
    if (currentZoomIndex < max) openZoomModal(currentZoomIndex + 1);
});

// Điều hướng bằng bàn phím
document.addEventListener('keydown', (e) => {
    if (!DOM.zoomModal.classList.contains('active')) return;
    const max = (currentMode === 'single' ? pagesData : documentPages).length - 1;
    
    if (e.key === 'ArrowLeft' && currentZoomIndex > 0) {
        openZoomModal(currentZoomIndex - 1);
    } else if (e.key === 'ArrowRight' && currentZoomIndex < max) {
        openZoomModal(currentZoomIndex + 1);
    } else if (e.key === 'Escape') {
        DOM.zoomModal.classList.remove('active');
    }
});

DOM.closeModal.addEventListener('click', () => DOM.zoomModal.classList.remove('active'));
DOM.zoomModal.addEventListener('click', e => { if (e.target === DOM.zoomModal) DOM.zoomModal.classList.remove('active'); });

// ============================================================
// HỖ TRỢ XUẤT FILE & CÁC TÍNH NĂNG KHÁC
// ============================================================
function downloadBlob(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function showLoading(msg) { DOM.loadingMsg.innerText = msg; DOM.loadingMsg.style.display = 'block'; }
function hideLoading() { DOM.loadingMsg.style.display = 'none'; }

DOM.btnReset.addEventListener('click', () => {
    DOM.fileInput.value = '';
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'block';
});

if (DOM.btnRotate) {
    DOM.btnRotate.addEventListener('click', () => {
        let count = 0;
        pagesData.forEach((page, index) => {
            if (page.selected) {
                page.rotation = (page.rotation + 90) % 360;
                applyCardRotation(document.querySelector(`.page-card[data-index="${index}"]`), page.rotation);
                count++;
            }
        });
        if (count === 0) alert('Vui lòng chọn ít nhất 1 trang để xoay.');
    });
}

// Trích xuất / Xóa (Single) - Đã support đúng vị trí sắp xếp kéo thả
async function processSinglePDF(mode) {
    showLoading('Đang xử lý...');
    try {
        const buffer = await currentSingleFile.arrayBuffer();
        const sourcePdf = await PDFDocument.load(buffer);
        const newPdf = await PDFDocument.create();
        
        const indexesToCopy = [];
        const rotationsToApply = [];

        pagesData.forEach(p => {
            const keep = (mode === 'extract' && p.selected) || (mode === 'delete' && !p.selected);
            if (keep) {
                indexesToCopy.push(p.sourcePage);
                rotationsToApply.push(p.rotation);
            }
        });

        if (indexesToCopy.length === 0) throw new Error(mode === 'extract' ? 'Vui lòng chọn trang để trích xuất!' : 'Bạn đã xóa hết các trang!');

        const copiedPages = await newPdf.copyPages(sourcePdf, indexesToCopy);
        copiedPages.forEach((page, i) => {
            const rot = rotationsToApply[i];
            if (rot !== 0) page.setRotation(degrees(page.getRotation().angle + rot));
            newPdf.addPage(page);
        });

        const pdfBytes = await newPdf.save();
        downloadBlob(pdfBytes, `ThienThanDiaNguc_${mode}_${Date.now()}.pdf`);
    } catch (error) {
        alert(error.message);
    } finally {
        hideLoading();
    }
}
if (DOM.btnExtract) DOM.btnExtract.addEventListener('click', () => processSinglePDF('extract'));

// Gộp (Multi)
if (DOM.btnMerge) {
    DOM.btnMerge.addEventListener('click', async () => {
        showLoading('Đang xử lý gộp file...');
        try {
            if (documentPages.length === 0) throw new Error('Không có trang để gộp.');
            const mergedPdf = await PDFDocument.create();
            
            for (const item of documentPages) {
                const sourcePdf = sourcePdfDocuments[item.fileIndex];
                const copiedPages = await mergedPdf.copyPages(sourcePdf, [item.pageIndex]);
                mergedPdf.addPage(copiedPages[0]);
            }
            const bytes = await mergedPdf.save();
            downloadBlob(bytes, `ThienThanDiaNguc_Merged_${Date.now()}.pdf`);
        } catch (error) {
            alert(error.message);
        } finally {
            hideLoading();
        }
    });
}

// LOGIC BẢO MẬT API
const securityModal = document.getElementById('securityModal');
if (DOM.btnPassword) DOM.btnPassword.addEventListener('click', () => securityModal.style.display = 'flex');
document.getElementById('btnCancelSecurity').addEventListener('click', () => securityModal.style.display = 'none');

document.getElementById('btnConfirmSecurity').addEventListener('click', async () => {
    const password = document.getElementById('pdfPassword').value.trim();
    const backendUrl = document.getElementById('backendUrlInput').value.trim();
    if (!password) return alert("Vui lòng nhập mật khẩu!");
    
    localStorage.setItem('hellangel_backend_url', backendUrl);
    const btn = document.getElementById('btnConfirmSecurity');
    const oldText = btn.innerText;
    btn.innerText = "⏳ Đang khóa..."; btn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('pdfFile', currentSingleFile, currentSingleFile.name);
        formData.append('password', password);
        formData.append('allowPrint', document.getElementById('chkPrint').checked);
        formData.append('allowEdit', document.getElementById('chkEdit').checked);
        formData.append('allowCopy', document.getElementById('chkCopy').checked);
        formData.append('allowComment', document.getElementById('chkComment').checked);

        const response = await fetch(backendUrl, { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`Phản hồi ${response.status}`);
        
        downloadBlob(new Uint8Array(await (await response.blob()).arrayBuffer()), `ThienThanDiaNguc_Secured_${Date.now()}.pdf`);
        securityModal.style.display = 'none'; 
    } catch (error) {
        alert("Lỗi Backend: " + error.message);
    } finally {
        btn.innerText = oldText; btn.disabled = false;
    }
});
