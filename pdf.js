pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
const { PDFDocument, degrees } = PDFLib;

// ==========================================
// HỆ THỐNG ĐA NGÔN NGỮ & GIAO DIỆN
// ==========================================
const dict = {
    vi: {
        lang_btn: "🇻🇳 VI",
        home_title: "Bạn muốn làm gì?",
        home_sub: "Vui lòng chọn một tính năng để bắt đầu",
        mode_merge: "Gộp PDF", desc_merge: "Nối nhiều file thành một",
        mode_extract: "Tách PDF", desc_extract: "Trích xuất các trang đã chọn",
        mode_delete: "Xóa Trang", desc_delete: "Loại bỏ các trang thừa",
        mode_rotate: "Xoay PDF", desc_rotate: "Sửa lỗi trang bị ngược",
        btn_back: "Quay lại",
        btn_select_all: "Chọn tất cả",
        btn_invert: "Đảo chọn",
        btn_rotate_selected: "Xoay 90°",
        btn_cancel: "Hủy",
        msg_processing: "Đang xử lý...",
        msg_loading: "Đang tải bản xem trước...",
        up_title_multi: "Kéo thả nhiều file PDF vào đây",
        up_sub_multi: "Kéo thả để đổi vị trí các trang",
        up_title_single: "Kéo thả 1 file PDF vào đây",
        up_sub_rotate: "Để xoay các trang bị ngược",
        up_sub_select: "Để chọn các trang cần xử lý",
        exec_merge: "Xuất File Đã Gộp",
        exec_extract: "Trích Xuất File",
        exec_delete: "Xóa & Xuất File",
        exec_rotate: "Xuất File Đã Xoay",
        alert_no_file: "Vui lòng chọn file PDF!",
        alert_merge_count: "Vui lòng chọn từ 2 file trở lên để Gộp!",
        alert_no_page: "Không có trang nào để xuất! Vui lòng kiểm tra lại thao tác.",
        page_text: "Trang"
    },
    en: {
        lang_btn: "🇺🇸 EN",
        home_title: "What do you want to do?",
        home_sub: "Please select a feature to start",
        mode_merge: "Merge PDF", desc_merge: "Combine multiple files into one",
        mode_extract: "Extract PDF", desc_extract: "Extract selected pages",
        mode_delete: "Delete Pages", desc_delete: "Remove unwanted pages",
        mode_rotate: "Rotate PDF", desc_rotate: "Fix upside-down pages",
        btn_back: "Back",
        btn_select_all: "Select All",
        btn_invert: "Invert Selection",
        btn_rotate_selected: "Rotate 90°",
        btn_cancel: "Cancel",
        msg_processing: "Processing...",
        msg_loading: "Loading preview...",
        up_title_multi: "Drag & drop multiple PDFs here",
        up_sub_multi: "Drag & drop to reorder pages",
        up_title_single: "Drag & drop 1 PDF file here",
        up_sub_rotate: "To rotate upside-down pages",
        up_sub_select: "To select pages for processing",
        exec_merge: "Export Merged File",
        exec_extract: "Extract Selected File",
        exec_delete: "Delete & Export File",
        exec_rotate: "Export Rotated File",
        alert_no_file: "Please select a PDF file!",
        alert_merge_count: "Please select 2 or more files to Merge!",
        alert_no_page: "No pages selected to export! Please check your selection.",
        page_text: "Page"
    }
};

let currentLang = localStorage.getItem('pdf_lang') || 'vi';
let isDarkMode = localStorage.getItem('pdf_theme') === 'dark';

const DOM_I18N = {
    btnToggleLang: document.getElementById('btnToggleLang'),
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    uploadTitle: document.getElementById('uploadTitle'),
    uploadSub: document.getElementById('uploadSub'),
    executeText: document.getElementById('executeText'),
    zoomPageText: document.getElementById('zoomPageText')
};

function applyTheme() {
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        DOM_I18N.btnToggleTheme.innerText = '🌞';
    } else {
        document.body.removeAttribute('data-theme');
        DOM_I18N.btnToggleTheme.innerText = '🌙';
    }
    localStorage.setItem('pdf_theme', isDarkMode ? 'dark' : 'light');
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang][key]) el.innerText = dict[currentLang][key];
    });
    DOM_I18N.btnToggleLang.innerText = dict[currentLang].lang_btn;
    localStorage.setItem('pdf_lang', currentLang);
    
    // Update dynamic texts if workspace is active
    if (currentMode) setupWorkspaceUI(); 
}

DOM_I18N.btnToggleTheme.addEventListener('click', () => { isDarkMode = !isDarkMode; applyTheme(); });
DOM_I18N.btnToggleLang.addEventListener('click', () => { currentLang = currentLang === 'vi' ? 'en' : 'vi'; applyLanguage(); });

// Khởi tạo giao diện ban đầu
applyTheme();
applyLanguage();

// ==========================================
// LÕI PDF LOGIC
// ==========================================
const DOM = {
    homeScreen: document.getElementById('homeScreen'),
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
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
    closeModal: document.getElementById('closeModal'),
    btnPrevPage: document.getElementById('btnPrevPage'),
    btnNextPage: document.getElementById('btnNextPage')
};

let currentMode = ''; 
let uploadedFiles = [];
let pdfDocuments = [];
let sourcePdfDocuments = [];
let pagesData = []; 
let currentZoomIndex = -1;

// 1. CHỌN TÍNH NĂNG
document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        DOM.homeScreen.style.display = 'none';
        DOM.uploadScreen.style.display = 'block';
        setupWorkspaceUI(); // Setup text for upload screen
    });
});

function setupWorkspaceUI() {
    if (!currentMode) return;
    const isMerge = currentMode === 'merge';
    DOM.fileInput.multiple = isMerge;
    DOM_I18N.uploadTitle.innerText = dict[currentLang][isMerge ? 'up_title_multi' : 'up_title_single'];
    DOM_I18N.uploadSub.innerText = dict[currentLang][isMerge ? 'up_sub_multi' : (currentMode === 'rotate' ? 'up_sub_rotate' : 'up_sub_select')];

    const isSelectionMode = ['extract', 'delete', 'rotate'].includes(currentMode);
    DOM.btnSelectAll.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnInvert.style.display = isSelectionMode ? 'block' : 'none';
    DOM.btnActionRotate.style.display = currentMode === 'rotate' ? 'block' : 'none';

    DOM_I18N.executeText.innerText = dict[currentLang][`exec_${currentMode}`];
}

DOM.btnBackHome.addEventListener('click', resetToHome);
DOM.btnCancel.addEventListener('click', resetToHome);

function resetToHome() {
    DOM.workspaceScreen.style.display = 'none';
    DOM.uploadScreen.style.display = 'none';
    DOM.homeScreen.style.display = 'block';
    DOM.fileInput.value = '';
    currentMode = '';
    uploadedFiles = []; pdfDocuments = []; sourcePdfDocuments = []; pagesData = [];
}

// 2. UPLOAD & PHÂN TÍCH
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.classList.add('drag-over'); });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.classList.remove('drag-over'));
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); DOM.dropZone.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); });

async function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    if (validFiles.length === 0) return alert(dict[currentLang].alert_no_file);
    if (currentMode === 'merge' && validFiles.length < 2) return alert(dict[currentLang].alert_merge_count);

    uploadedFiles = currentMode === 'merge' ? validFiles : [validFiles[0]];
    
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    
    DOM.loadingMsg.innerHTML = `⚡ ${dict[currentLang].msg_loading}`;
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
        alert("Error: " + error.message);
        resetToHome();
    }
    DOM.loadingMsg.style.display = 'none';
}

// 3. RENDER GRID
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
        
        const titleText = currentMode === 'merge' ? uploadedFiles[item.fileIdx].name : `${dict[currentLang].page_text} ${item.pageIdx + 1}`;

        card.innerHTML = `
            <div class="selected-badge">✓</div>
            <canvas></canvas>
            <div class="page-number" style="font-size:0.75rem; color:var(--text-muted); margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titleText}</div>
            <button class="zoom-btn" title="Zoom">🔍</button>
        `;
        
        const canvas = card.querySelector('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        applyCardRotation(card, item.rotation);

        if (currentMode !== 'merge') {
            card.addEventListener('click', () => {
                item.selected = !item.selected;
                card.classList.toggle('selected', item.selected);
            });
        }

        card.querySelector('.zoom-btn').addEventListener('click', e => { e.stopPropagation(); openZoomModal(i); });

        // Kéo thả
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

DOM.btnSelectAll.addEventListener('click', () => { pagesData.forEach(p => p.selected = true); renderGrid(); });
DOM.btnInvert.addEventListener('click', () => { pagesData.forEach(p => p.selected = !p.selected); renderGrid(); });
DOM.btnActionRotate.addEventListener('click', () => {
    pagesData.forEach(p => { if (p.selected) p.rotation = (p.rotation + 90) % 360; });
    renderGrid();
});

// 4. THỰC THI (XUẤT)
DOM.btnExecute.addEventListener('click', async () => {
    DOM.loadingMsg.innerHTML = `⚡ ${dict[currentLang].msg_processing}`;
    DOM.loadingMsg.style.display = 'block';
    
    try {
        const newPdf = await PDFDocument.create();
        let pagesToKeep = [];
        
        if (currentMode === 'merge' || currentMode === 'rotate') pagesToKeep = pagesData; 
        else if (currentMode === 'extract') pagesToKeep = pagesData.filter(p => p.selected);
        else if (currentMode === 'delete') pagesToKeep = pagesData.filter(p => !p.selected);

        if (pagesToKeep.length === 0) throw new Error(dict[currentLang].alert_no_page);

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
        a.href = url; a.download = `PDF_Tools_${currentMode}_${Date.now()}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        
    } catch (error) { alert(error.message); }
    DOM.loadingMsg.style.display = 'none';
});

// 5. ZOOM
async function openZoomModal(index) {
    currentZoomIndex = index;
    DOM.zoomModal.classList.add('active');
    DOM_I18N.zoomPageText.innerText = `...`;
    
    DOM.btnPrevPage.style.display = index > 0 ? 'block' : 'none';
    DOM.btnNextPage.style.display = index < pagesData.length - 1 ? 'block' : 'none';

    try {
        const item = pagesData[index];
        const page = await pdfDocuments[item.fileIdx].getPage(item.pageIdx + 1);
        
        let viewport = page.getViewport({ scale: 1 });
        const scale = Math.min((window.innerWidth * 0.85) / viewport.width, (window.innerHeight * 0.85) / viewport.height, 2.5); 
        viewport = page.getViewport({ scale: scale });
        
        const ctx = DOM.zoomCanvas.getContext('2d');
        DOM.zoomCanvas.width = viewport.width; DOM.zoomCanvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        
        DOM_I18N.zoomPageText.innerText = currentMode === 'merge' ? `${uploadedFiles[item.fileIdx].name} (${dict[currentLang].page_text} ${item.pageIdx + 1})` : `${dict[currentLang].page_text} ${item.pageIdx + 1}`;
    } catch (error) {
        DOM_I18N.zoomPageText.innerText = "Error!";
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
