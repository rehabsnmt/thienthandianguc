// Giao diện
const isDarkMode = localStorage.getItem('pdf_theme') === 'dark';
if(isDarkMode) document.body.setAttribute('data-theme', 'dark');

document.getElementById('btnToggleTheme').addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if(isDark) document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('pdf_theme', isDark ? 'light' : 'dark');
});

// DOM
const DOM = {
    fileInput: document.getElementById('fileInput'),
    dropZone: document.getElementById('dropZone'),
    uploadScreen: document.getElementById('uploadScreen'),
    workspaceScreen: document.getElementById('workspaceScreen'),
    previewGrid: document.getElementById('previewGrid'),
    fileCountText: document.getElementById('fileCountText'),
    btnReset: document.getElementById('btnReset'),
    btnExecute: document.getElementById('btnExecute'),
    
    // Setting DOMs
    resW: document.getElementById('resW'),
    resH: document.getElementById('resH'),
    cropUnit: document.getElementById('cropUnit'),
    crTop: document.getElementById('crTop'),
    crBottom: document.getElementById('crBottom'),
    crLeft: document.getElementById('crLeft'),
    crRight: document.getElementById('crRight'),
    
    flBright: document.getElementById('flBright'),
    flContrast: document.getElementById('flContrast'),
    flGrayscale: document.getElementById('flGrayscale'),
    flipH: document.getElementById('flipH'),
    flipV: document.getElementById('flipV'),
    
    wmText: document.getElementById('wmText'),
    wmPos: document.getElementById('wmPos'),
    
    outFormat: document.getElementById('outFormat'),
    outPrefix: document.getElementById('outPrefix'),
    
    // Progress
    progCont: document.getElementById('progressContainer'),
    progFill: document.getElementById('progressFill'),
    progText: document.getElementById('progressText'),
    progPerc: document.getElementById('progressPercent')
};

let selectedFiles = [];

// ==========================================
// 1. TẢI FILE LÊN (Đọc Image)
// ==========================================
DOM.fileInput.addEventListener('change', e => handleFiles(e.target.files));
DOM.dropZone.addEventListener('dragover', e => { e.preventDefault(); DOM.dropZone.style.borderColor = 'var(--accent-color)'; });
DOM.dropZone.addEventListener('dragleave', () => DOM.dropZone.style.borderColor = 'var(--border-color)');
DOM.dropZone.addEventListener('drop', e => { e.preventDefault(); handleFiles(e.dataTransfer.files); });

function handleFiles(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return alert("Vui lòng chọn file hình ảnh hợp lệ!");
    
    selectedFiles = [...selectedFiles, ...validFiles];
    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';
    renderPreview();
}

function renderPreview() {
    DOM.previewGrid.innerHTML = '';
    DOM.fileCountText.innerText = `Đã chọn ${selectedFiles.length} ảnh`;
    
    selectedFiles.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const card = document.createElement('div');
        card.className = 'img-card';
        card.innerHTML = `
            <button class="remove-btn" onclick="removeFile(${index})">X</button>
            <img src="${url}" onload="URL.revokeObjectURL(this.src)">
            <div class="img-name" title="${file.name}">${file.name}</div>
        `;
        DOM.previewGrid.appendChild(card);
    });
}

window.removeFile = function(index) {
    selectedFiles.splice(index, 1);
    if(selectedFiles.length === 0) {
        DOM.workspaceScreen.style.display = 'none';
        DOM.uploadScreen.style.display = 'block';
    } else {
        renderPreview();
    }
}

DOM.btnReset.addEventListener('click', () => { DOM.fileInput.click(); });

// ==========================================
// 2. ĐỘNG CƠ CANVAS (Core Engine)
// ==========================================
function processSingleImage(file, settings) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // 1. TÍNH TOÁN CẮT (CROP MARGINS)
            let cw = img.width, ch = img.height;
            let cx = 0, cy = 0;
            
            let t = Number(settings.cTop) || 0;
            let b = Number(settings.cBottom) || 0;
            let l = Number(settings.cLeft) || 0;
            let r = Number(settings.cRight) || 0;

            if (settings.cUnit === 'percent') {
                t = (t / 100) * ch; b = (b / 100) * ch;
                l = (l / 100) * cw; r = (r / 100) * cw;
            }

            cx = l; cy = t;
            cw = cw - l - r;
            ch = ch - t - b;
            
            // Chống cắt quá tay gây âm kích thước
            if (cw <= 0) cw = 1; 
            if (ch <= 0) ch = 1;

            // 2. TÍNH TOÁN RESIZE (Giữ nguyên tỷ lệ nếu chỉ điền 1 chiều)
            let finalW = cw, finalH = ch;
            const targetW = Number(settings.rW);
            const targetH = Number(settings.rH);

            if (targetW > 0 && targetH > 0) {
                finalW = targetW; finalH = targetH;
            } else if (targetW > 0) {
                finalW = targetW; finalH = Math.round((targetW / cw) * ch);
            } else if (targetH > 0) {
                finalH = targetH; finalW = Math.round((targetH / ch) * cw);
            }

            // 3. KHỞI TẠO CANVAS
            const canvas = document.createElement('canvas');
            canvas.width = finalW;
            canvas.height = finalH;
            const ctx = canvas.getContext('2d');

            // 4. ÁP DỤNG BỘ LỌC (Filters)
            let filters = [];
            if(settings.fBright !== 100) filters.push(`brightness(${settings.fBright}%)`);
            if(settings.fContrast !== 100) filters.push(`contrast(${settings.fContrast}%)`);
            if(settings.fGray) filters.push(`grayscale(100%)`);
            if(filters.length > 0) ctx.filter = filters.join(' ');

            // 5. ÁP DỤNG LẬT ẢNH (Flip Matrix)
            ctx.save();
            let scaleX = settings.flipH ? -1 : 1;
            let scaleY = settings.flipV ? -1 : 1;
            let transX = settings.flipH ? finalW : 0;
            let transY = settings.flipV ? finalH : 0;
            
            ctx.translate(transX, transY);
            ctx.scale(scaleX, scaleY);

            // VẼ ẢNH LÊN CANVAS
            ctx.drawImage(img, cx, cy, cw, ch, 0, 0, finalW, finalH);
            ctx.restore(); // Khôi phục matrix để vẽ chữ không bị ngược

            // 6. ĐÓNG DẤU (Watermark)
            if (settings.wmText) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.font = `bold ${Math.max(16, finalW * 0.05)}px Arial`;
                ctx.shadowColor = "rgba(0,0,0,0.8)";
                ctx.shadowBlur = 5;
                
                const textWidth = ctx.measureText(settings.wmText).width;
                let tx = 0, ty = 0;
                const margin = finalW * 0.03;

                if (settings.wmPos === 'br') { tx = finalW - textWidth - margin; ty = finalH - margin; }
                else if (settings.wmPos === 'bl') { tx = margin; ty = finalH - margin; }
                else if (settings.wmPos === 'center') { tx = (finalW - textWidth) / 2; ty = finalH / 2; }
                
                ctx.fillText(settings.wmText, tx, ty);
            }

            // 7. XUẤT RA DỮ LIỆU (BLOB)
            let mimeType = file.type; // Mặc định giữ nguyên định dạng cũ
            if (settings.format === 'png') mimeType = 'image/png';
            if (settings.format === 'webp') mimeType = 'image/webp';
            if (settings.format === 'jpeg' && mimeType !== 'image/jpeg') mimeType = 'image/jpeg';

            canvas.toBlob((blob) => {
                resolve({ blob: blob, originalName: file.name, ext: mimeType.split('/')[1] });
            }, mimeType, 0.9); // Chất lượng 90%
        };
        img.src = URL.createObjectURL(file);
    });
}

// ==========================================
// 3. THỰC THI (ZIP)
// ==========================================
DOM.btnExecute.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // Khóa giao diện
    DOM.btnExecute.disabled = true;
    DOM.progCont.style.display = 'block';
    
    const zip = new JSZip();
    const folder = zip.folder(`HellAngel_Images_${Date.now()}`);

    // Thu thập cấu hình
    const settings = {
        rW: DOM.resW.value, rH: DOM.resH.value,
        cUnit: DOM.cropUnit.value, cTop: DOM.crTop.value, cBottom: DOM.crBottom.value, cLeft: DOM.crLeft.value, cRight: DOM.crRight.value,
        fBright: DOM.flBright.value, fContrast: DOM.flContrast.value, fGray: DOM.flGrayscale.checked,
        flipH: DOM.flipH.checked, flipV: DOM.flipV.checked,
        wmText: DOM.wmText.value, wmPos: DOM.wmPos.value,
        format: DOM.outFormat.value, prefix: DOM.outPrefix.value
    };

    // Xử lý từng ảnh (Cuốn chiếu để không văng RAM)
    for (let i = 0; i < selectedFiles.length; i++) {
        // Cập nhật thanh tiến trình
        const percent = Math.round((i / selectedFiles.length) * 100);
        DOM.progFill.style.width = percent + '%';
        DOM.progText.innerText = `Đang xử lý: ${i + 1}/${selectedFiles.length}`;
        DOM.progPerc.innerText = percent + '%';

        // Gọi động cơ xử lý
        const result = await processSingleImage(selectedFiles[i], settings);
        
        // Đặt lại tên file
        const baseName = result.originalName.substring(0, result.originalName.lastIndexOf('.')) || result.originalName;
        const newFileName = `${settings.prefix}${baseName}.${result.ext}`;
        
        // Thêm vào file nén
        folder.file(newFileName, result.blob);
    }

    // Hoàn tất tiến trình, sinh file ZIP
    DOM.progText.innerText = "Đang nén file ZIP...";
    DOM.progFill.style.width = '100%';
    DOM.progPerc.innerText = '100%';

    zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, `ThienThanDiaNguc_Batch_Images.zip`);
        
        // Khôi phục giao diện
        DOM.progCont.style.display = 'none';
        DOM.btnExecute.disabled = false;
        alert("🎉 Đã xử lý và tải xuống thành công!");
    });
});
