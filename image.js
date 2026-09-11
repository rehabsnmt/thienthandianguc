// Giao diện
const isDarkMode = localStorage.getItem('pdf_theme') === 'dark';
if(isDarkMode) document.body.setAttribute('data-theme', 'dark');
document.getElementById('btnToggleTheme').addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if(isDark) document.body.removeAttribute('data-theme'); else document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('pdf_theme', isDark ? 'light' : 'dark');
});

function toggleAcc(el) {
    const item = el.parentElement;
    item.classList.toggle('active');
}

// DOM
const DOM = {
    fileInput: document.getElementById('fileInput'), dropZone: document.getElementById('dropZone'),
    uploadScreen: document.getElementById('uploadScreen'), workspaceScreen: document.getElementById('workspaceScreen'),
    previewGrid: document.getElementById('previewGrid'), fileCountText: document.getElementById('fileCountText'),
    btnReset: document.getElementById('btnReset'), btnExecute: document.getElementById('btnExecute'),
    
    // UI Settings
    resW: document.getElementById('resW'), resH: document.getElementById('resH'), fitMode: document.getElementById('fitMode'),
    flBright: document.getElementById('flBright'), flContrast: document.getElementById('flContrast'), colorDepth: document.getElementById('colorDepth'),
    bRadius: document.getElementById('borderRadius'), bWidth: document.getElementById('borderWidth'), bColor: document.getElementById('borderColor'),
    wmText: document.getElementById('wmText'), wmPos: document.getElementById('wmPos'), wmColor: document.getElementById('wmColor'),
    outFormat: document.getElementById('outFormat'), outQuality: document.getElementById('outQuality'), outDPI: document.getElementById('outDPI'), outPrefix: document.getElementById('outPrefix'),
    
    progCont: document.getElementById('progressContainer'), progFill: document.getElementById('progressFill'), progText: document.getElementById('progressText'), progPerc: document.getElementById('progressPercent'),
    prevModal: document.getElementById('previewModal'), prevImg: document.getElementById('previewImageResult'), prevInfo: document.getElementById('previewImageInfo'), closePrev: document.getElementById('closePreviewModal')
};

let selectedFiles = [];

// ==========================================
// 1. TẢI FILE 
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.style.borderColor = 'var(--accent-color)'; });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.style.borderColor = 'var(--border-color)');
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });

function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return alert("Vui lòng chọn file hình ảnh!");
    selectedFiles = [...selectedFiles, ...validFiles];
    DOM.uploadScreen.style.display = 'none'; DOM.workspaceScreen.style.display = 'flex';
    renderPreview();
}

function renderPreview() {
    DOM.previewGrid.innerHTML = '';
    DOM.fileCountText.innerText = `Đã chọn ${selectedFiles.length} ảnh`;
    selectedFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const card = document.createElement('div'); card.className = 'img-card';
        card.innerHTML = `<button class="remove-btn" onclick="removeFile(${index})">X</button>
            <img src="${url}" onload="URL.revokeObjectURL(this.src)">
            <div class="img-name" title="${file.name}">${file.name}</div>
            <button class="preview-btn" onclick="previewSingle(${index})">👁️ Xem Trực Tiếp</button>`;
        DOM.previewGrid.appendChild(card);
    });
}
window.removeFile = function(index) { selectedFiles.splice(index, 1); if(selectedFiles.length === 0) { DOM.workspaceScreen.style.display = 'none'; DOM.uploadScreen.style.display = 'block'; } else renderPreview(); }
DOM.btnReset.addEventListener('click', () => DOM.fileInput.click());

function getSettings() {
    return {
        rW: Number(DOM.resW.value), rH: Number(DOM.resH.value), fit: DOM.fitMode.value,
        fBrt: Number(DOM.flBright.value), fCtr: Number(DOM.flContrast.value), cDepth: DOM.colorDepth.value,
        brdRad: Number(DOM.bRadius.value), brdWid: Number(DOM.bWidth.value), brdCol: DOM.bColor.value,
        wmTxt: DOM.wmText.value, wmPos: DOM.wmPos.value, wmCol: DOM.wmColor.value,
        fmt: DOM.outFormat.value, qual: Number(DOM.outQuality.value) / 100, dpi: Number(DOM.outDPI.value), pfx: DOM.outPrefix.value
    };
}

// ==========================================
// THỦ THUẬT CAN THIỆP MÃ NHỊ PHÂN ĐỂ ĐỔI DPI CHO JPEG
// ==========================================
function changeDPI(blob, dpi) {
    return new Promise((resolve) => {
        if (dpi === 0 || blob.type !== 'image/jpeg') return resolve(blob); // Chỉ hỗ trợ sửa DPI trên JPG dễ nhất
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataView = new DataView(e.target.result);
            if (dataView.getUint16(0) === 0xFFD8) {
                // Thay đổi header JFIF (Density)
                let offset = 2;
                while (offset < dataView.byteLength) {
                    if (dataView.getUint16(offset) === 0xFFE0) {
                        dataView.setUint16(offset + 14, dpi, false); // XDensity
                        dataView.setUint16(offset + 16, dpi, false); // YDensity
                        dataView.setUint8(offset + 13, 1); // Đơn vị: Dots per inch
                        break;
                    }
                    offset += dataView.getUint16(offset + 2) + 2;
                }
            }
            resolve(new Blob([dataView], { type: blob.type }));
        };
        reader.readAsArrayBuffer(blob);
    });
}

// ==========================================
// 2. ĐỘNG CƠ CANVAS SIÊU CẤP
// ==========================================
function processSingleImage(file, S) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let imgW = img.width, imgH = img.height;
            let cvsW = imgW, cvsH = imgH;

            // 1. TÍNH TOÁN KÍCH THƯỚC (Auto Ratio)
            if (S.rW > 0 && S.rH > 0) { cvsW = S.rW; cvsH = S.rH; }
            else if (S.rW > 0) { cvsW = S.rW; cvsH = Math.round((S.rW / imgW) * imgH); }
            else if (S.rH > 0) { cvsH = S.rH; cvsW = Math.round((S.rH / imgH) * imgW); }

            // Bù diện tích Viền
            cvsW += S.brdWid * 2; cvsH += S.brdWid * 2;

            const cvs = document.createElement('canvas');
            cvs.width = cvsW; cvs.height = cvsH;
            const ctx = cvs.getContext('2d');

            // 2. VẼ NỀN (NẾU CÓ)
            if (S.fmt === 'jpeg' && S.fit !== 'blur') {
                ctx.fillStyle = S.brdCol; 
                ctx.fillRect(0, 0, cvsW, cvsH); 
            }

            // 3. TÍNH TOÁN FIT MODE (Cover, Contain, Blur Background)
            let drawW = cvsW - S.brdWid * 2, drawH = cvsH - S.brdWid * 2;
            let dx = S.brdWid, dy = S.brdWid;

            if (S.fit === 'blur') {
                // Vẽ ảnh phóng to và làm mờ làm nền
                ctx.filter = 'blur(20px) brightness(0.8)';
                const scaleBg = Math.max(cvsW / imgW, cvsH / imgH);
                ctx.drawImage(img, (cvsW - imgW * scaleBg) / 2, (cvsH - imgH * scaleBg) / 2, imgW * scaleBg, imgH * scaleBg);
                ctx.filter = 'none';
                
                // Tính kích thước ảnh gốc đặt đè lên (Contain)
                const scaleFg = Math.min(drawW / imgW, drawH / imgH);
                drawW = imgW * scaleFg; drawH = imgH * scaleFg;
                dx = S.brdWid + (cvsW - S.brdWid * 2 - drawW) / 2;
                dy = S.brdWid + (cvsH - S.brdWid * 2 - drawH) / 2;

            } else if (S.fit === 'contain') {
                ctx.fillStyle = S.brdCol; ctx.fillRect(0, 0, cvsW, cvsH);
                const scale = Math.min(drawW / imgW, drawH / imgH);
                drawW = imgW * scale; drawH = imgH * scale;
                dx = S.brdWid + (cvsW - S.brdWid * 2 - drawW) / 2;
                dy = S.brdWid + (cvsH - S.brdWid * 2 - drawH) / 2;

            } else if (S.fit === 'cover') {
                const scale = Math.max(drawW / imgW, drawH / imgH);
                drawW = imgW * scale; drawH = imgH * scale;
                dx = S.brdWid + (cvsW - S.brdWid * 2 - drawW) / 2;
                dy = S.brdWid + (cvsH - S.brdWid * 2 - drawH) / 2;
            }

            // 4. ÁP DỤNG BO GÓC (Clipping Path)
            if (S.brdRad > 0) {
                ctx.beginPath();
                ctx.moveTo(S.brdWid + S.brdRad, S.brdWid);
                ctx.arcTo(cvsW - S.brdWid, S.brdWid, cvsW - S.brdWid, cvsH - S.brdWid, S.brdRad);
                ctx.arcTo(cvsW - S.brdWid, cvsH - S.brdWid, S.brdWid, cvsH - S.brdWid, S.brdRad);
                ctx.arcTo(S.brdWid, cvsH - S.brdWid, S.brdWid, S.brdWid, S.brdRad);
                ctx.arcTo(S.brdWid, S.brdWid, cvsW - S.brdWid, S.brdWid, S.brdRad);
                ctx.closePath();
                ctx.clip();
            }

            // 5. BỘ LỌC (Filters & Color Depth)
            let filters = [];
            if(S.fBrt !== 100) filters.push(`brightness(${S.fBrt}%)`);
            if(S.fCtr !== 100) filters.push(`contrast(${S.fCtr}%)`);
            if(S.cDepth === 'grayscale') filters.push(`grayscale(100%)`);
            if(S.cDepth === 'sepia') filters.push(`sepia(100%)`);
            if(filters.length > 0) ctx.filter = filters.join(' ');

            // VẼ ẢNH CHÍNH
            ctx.drawImage(img, dx, dy, drawW, drawH);
            ctx.filter = 'none';

            // 6. VIỀN CHỒNG LÊN
            if (S.brdWid > 0) {
                ctx.strokeStyle = S.brdCol;
                ctx.lineWidth = S.brdWid * 2; // Viền sẽ lấn vào trong và ngoài
                ctx.strokeRect(0, 0, cvsW, cvsH);
            }

            // 7. CHỮ KÝ (Watermark)
            if (S.wmTxt) {
                ctx.fillStyle = S.wmCol;
                ctx.font = `bold ${Math.max(16, cvsW * 0.04)}px Arial`;
                ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 5;
                const txtW = ctx.measureText(S.wmTxt).width;
                const pad = cvsW * 0.03;
                let tx = 0, ty = 0;
                if (S.wmPos === 'br') { tx = cvsW - txtW - pad; ty = cvsH - pad; }
                else if (S.wmPos === 'bl') { tx = pad; ty = cvsH - pad; }
                else if (S.wmPos === 'center') { tx = (cvsW - txtW)/2; ty = cvsH/2; }
                ctx.fillText(S.wmTxt, tx, ty);
            }

            // 8. XUẤT BLOB (Format + Quality)
            let mime = file.type; 
            if (S.fmt === 'png') mime = 'image/png';
            if (S.fmt === 'webp') mime = 'image/webp';
            if (S.fmt === 'jpeg' && mime !== 'image/jpeg') mime = 'image/jpeg';

            cvs.toBlob(async (blob) => {
                // Áp dụng DPI nếu chọn 300
                const finalBlob = await changeDPI(blob, S.dpi);
                resolve({ blob: finalBlob, originalName: file.name, ext: mime.split('/')[1] });
            }, mime, S.qual);
        };
        img.src = URL.createObjectURL(file);
    });
}

// ==========================================
// 3. XEM TRƯỚC (LIVE PREVIEW)
// ==========================================
window.previewSingle = async function(index) {
    DOM.prevModal.style.display = 'flex'; DOM.prevImg.src = ''; DOM.prevInfo.innerText = 'Đang tính toán...';
    
    try {
        const result = await processSingleImage(selectedFiles[index], getSettings());
        const url = URL.createObjectURL(result.blob);
        DOM.prevImg.src = url;
        
        const temp = new Image();
        temp.onload = () => {
            DOM.prevInfo.innerHTML = `<strong style="color:var(--accent-color)">📏 Kích thước:</strong> ${temp.width}x${temp.height}px | <strong style="color:var(--accent-color)">💾 Nặng:</strong> ${(result.blob.size/1024).toFixed(1)} KB | <strong style="color:var(--accent-color)">📄 File:</strong> ${result.ext.toUpperCase()}`;
        };
        temp.src = url;
    } catch(e) { DOM.prevInfo.innerText = 'Lỗi: ' + e.message; }
}
DOM.closePrev.addEventListener('click', () => DOM.prevModal.style.display = 'none');
DOM.prevModal.addEventListener('click', e => { if (e.target === DOM.prevModal) DOM.prevModal.style.display = 'none'; });

// ==========================================
// 4. XUẤT ZIP
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    DOM.btnExecute.disabled = true; DOM.progCont.style.display = 'block';
    
    const zip = new JSZip();
    const folder = zip.folder(`Images_Batch_${Date.now()}`);
    const S = getSettings();

    for (let i = 0; i < selectedFiles.length; i++) {
        const pc = Math.round((i / selectedFiles.length) * 100);
        DOM.progFill.style.width = pc + '%'; DOM.progPerc.innerText = pc + '%'; DOM.progText.innerText = `Xử lý: ${i+1}/${selectedFiles.length}`;

        const result = await processSingleImage(selectedFiles[i], S);
        const bName = result.originalName.substring(0, result.originalName.lastIndexOf('.')) || result.originalName;
        folder.file(`${S.pfx}${bName}.${result.ext}`, result.blob);
    }

    DOM.progFill.style.width = '100%'; DOM.progPerc.innerText = '100%'; DOM.progText.innerText = "Đang nén ZIP...";
    
    zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, `HellAngel_Images_Batch.zip`);
        DOM.progCont.style.display = 'none'; DOM.btnExecute.disabled = false;
        setTimeout(() => DOM.progFill.style.width = '0%', 1000);
    });
});
