// --- CẤU HÌNH PDF.JS ---
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

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
let currentSingleFile = null;
let pagesData = [];
let currentPdfDoc = null;


// ============================================================
// 1. UPLOAD FILE
// ============================================================

DOM.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

DOM.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.add('dragover');
});

DOM.dropZone.addEventListener('dragleave', () => {
    DOM.dropZone.classList.remove('dragover');
});

DOM.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    DOM.dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
});


async function handleFiles(files) {

    if (files.length === 0) return;

    uploadedFiles = Array.from(files).filter(
        f =>
            f.type === 'application/pdf' ||
            f.name.toLowerCase().endsWith('.pdf')
    );

    if (uploadedFiles.length === 0) {
        alert('Vui lòng chọn file PDF!');
        return;
    }

    DOM.uploadScreen.style.display = 'none';
    DOM.workspaceScreen.style.display = 'flex';

    DOM.previewGrid.innerHTML = '';
    DOM.fileList.innerHTML = '';

    if (uploadedFiles.length === 1) {

        currentSingleFile = uploadedFiles[0];

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


// ============================================================
// 2. RENDER PDF PREVIEW
// ============================================================

async function renderPDFPreview(file) {

    DOM.loadingMsg.style.display = 'block';

    try {

        const tempBuffer = await file.arrayBuffer();

        const loadingTask =
            pdfjsLib.getDocument(
                new Uint8Array(tempBuffer)
            );

        currentPdfDoc =
            await loadingTask.promise;

        pagesData = [];

        for (
            let i = 1;
            i <= currentPdfDoc.numPages;
            i++
        ) {

            pagesData.push({
                selected: false,
                rotation: 0
            });

            const page =
                await currentPdfDoc.getPage(i);

            const viewport =
                page.getViewport({
                    scale: 0.5
                });

            const card =
                document.createElement('div');

            card.className = 'page-card';
            card.dataset.index = i - 1;

            card.innerHTML = `
                <div class="selected-badge">✓</div>
                <canvas></canvas>
                <div class="page-number">
                    Trang ${i}
                </div>
                <button
                    class="zoom-btn"
                    title="Phóng to">
                    🔍
                </button>
            `;

            const canvas =
                card.querySelector('canvas');

            const ctx =
                canvas.getContext('2d');

            canvas.height =
                viewport.height;

            canvas.width =
                viewport.width;

            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            card.addEventListener('click', () => {

                const idx =
                    parseInt(
                        card.dataset.index
                    );

                pagesData[idx].selected =
                    !pagesData[idx].selected;

                card.classList.toggle(
                    'selected',
                    pagesData[idx].selected
                );
            });

            const zoomBtn =
                card.querySelector('.zoom-btn');

            zoomBtn.addEventListener(
                'click',
                (e) => {

                    e.stopPropagation();

                    openZoomModal(i);
                }
            );

            DOM.previewGrid.appendChild(card);
        }

    } catch (error) {

        alert(
            'Lỗi khi đọc file xem trước: ' +
            error.message
        );

    } finally {

        DOM.loadingMsg.style.display = 'none';
    }
}


// ============================================================
// 3. DANH SÁCH NHIỀU FILE
// ============================================================

function renderFileList() {

    uploadedFiles.forEach(
        (file, index) => {

            const li =
                document.createElement('li');

            li.className =
                'file-item';

            li.innerHTML =
                `<span>${index + 1}. ${file.name}</span>`;

            DOM.fileList.appendChild(li);
        }
    );
}


// ============================================================
// 4. MODAL PHÓNG TO
// ============================================================

async function openZoomModal(pageNum) {

    if (!currentPdfDoc) return;

    DOM.zoomModal.classList.add('active');

    DOM.zoomPageText.innerText =
        `Đang tải trang ${pageNum}...`;

    try {

        const page =
            await currentPdfDoc.getPage(pageNum);

        const viewport =
            page.getViewport({
                scale: 2.0
            });

        const ctx =
            DOM.zoomCanvas.getContext('2d');

        DOM.zoomCanvas.height =
            viewport.height;

        DOM.zoomCanvas.width =
            viewport.width;

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        DOM.zoomPageText.innerText =
            `Trang ${pageNum}`;

    } catch (error) {

        DOM.zoomPageText.innerText =
            'Lỗi khi tải trang!';
    }
}


DOM.closeModal.addEventListener(
    'click',
    () => {
        DOM.zoomModal.classList.remove('active');
    }
);


DOM.zoomModal.addEventListener(
    'click',
    (e) => {

        if (e.target === DOM.zoomModal) {
            DOM.zoomModal.classList.remove('active');
        }
    }
);


// ============================================================
// 5. PDF-LIB
// ============================================================

const {
    PDFDocument,
    degrees
} = PDFLib;


function downloadBlob(bytes, filename) {

    const blob =
        new Blob(
            [bytes],
            {
                type: 'application/pdf'
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement('a');

    a.href = url;
    a.download = filename;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}


// ============================================================
// 6. RESET
// ============================================================

document
    .getElementById('btnReset')
    .addEventListener(
        'click',
        () => {

            DOM.fileInput.value = '';

            uploadedFiles = [];
            currentSingleFile = null;
            pagesData = [];
            currentPdfDoc = null;

            DOM.previewGrid.innerHTML = '';
            DOM.fileList.innerHTML = '';

            DOM.workspaceScreen.style.display =
                'none';

            DOM.uploadScreen.style.display =
                'block';
        }
    );


// ============================================================
// 7. CHỌN TẤT CẢ
// ============================================================

document
    .getElementById('btnSelectAll')
    .addEventListener(
        'click',
        () => {

            const cards =
                document.querySelectorAll(
                    '.page-card'
                );

            const allSelected =
                pagesData.length > 0 &&
                pagesData.every(
                    p => p.selected
                );

            pagesData.forEach(
                (p, idx) => {

                    p.selected =
                        !allSelected;

                    cards[idx].classList.toggle(
                        'selected',
                        p.selected
                    );
                }
            );
        }
    );


// ============================================================
// 8. XOAY TRANG
// ============================================================

document
    .getElementById('btnRotate')
    .addEventListener(
        'click',
        () => {

            const cards =
                document.querySelectorAll(
                    '.page-card'
                );

            pagesData.forEach(
                (p, idx) => {

                    if (p.selected) {

                        p.rotation =
                            (p.rotation + 90) % 360;

                        const canvas =
                            cards[idx]
                                .querySelector('canvas');

                        canvas.style.transform =
                            `rotate(${p.rotation}deg)`;
                    }
                }
            );
        }
    );


// ============================================================
// 9. TÁCH / XÓA TRANG
// ============================================================

async function processSinglePDF(mode, button) {

    if (!currentSingleFile) {
        alert('Chưa có file PDF.');
        return;
    }

    const oldText =
        button.innerText;

    button.innerText =
        'Đang xử lý...';

    button.disabled = true;

    try {

        const freshBuffer =
            await currentSingleFile.arrayBuffer();

        const sourcePdf =
            await PDFDocument.load(
                freshBuffer
            );

        const newPdf =
            await PDFDocument.create();

        const targetIndexes =
            pagesData
                .map(
                    (p, idx) =>
                        (
                            mode === 'extract' &&
                            p.selected
                        ) ||
                        (
                            mode === 'delete' &&
                            !p.selected
                        )
                            ? idx
                            : -1
                )
                .filter(
                    idx => idx !== -1
                );

        if (targetIndexes.length === 0) {

            throw new Error(
                mode === 'extract'
                    ? 'Vui lòng chọn ít nhất 1 trang để trích xuất!'
                    : 'Bạn đã xóa hết tất cả các trang!'
            );
        }

        const copiedPages =
            await newPdf.copyPages(
                sourcePdf,
                targetIndexes
            );

        copiedPages.forEach(
            (page, i) => {

                const originalIndex =
                    targetIndexes[i];

                const addedRotation =
                    pagesData[
                        originalIndex
                    ].rotation;

                if (addedRotation > 0) {

                    const currentAngle =
                        page.getRotation().angle;

                    page.setRotation(
                        degrees(
                            currentAngle +
                            addedRotation
                        )
                    );
                }

                newPdf.addPage(page);
            }
        );

        const pdfBytes =
            await newPdf.save();

        downloadBlob(
            pdfBytes,
            `ThienThanDiaNguc_${mode}_${Date.now()}.pdf`
        );

    } catch (error) {

        alert(error.message);

    } finally {

        button.innerText =
            oldText;

        button.disabled = false;
    }
}


document
    .getElementById('btnExtract')
    .addEventListener(
        'click',
        (e) => {
            processSinglePDF(
                'extract',
                e.currentTarget
            );
        }
    );


document
    .getElementById('btnDelete')
    .addEventListener(
        'click',
        (e) => {
            processSinglePDF(
                'delete',
                e.currentTarget
            );
        }
    );


// ============================================================
// 10. BẢO MẬT PDF
// ============================================================

const securityModal =
    document.getElementById(
        'securityModal'
    );

const pdfPassword =
    document.getElementById(
        'pdfPassword'
    );

const backendUrlInput =
    document.getElementById(
        'backendUrlInput'
    );


// ------------------------------------------------------------
// Backend URL
// ------------------------------------------------------------

const savedBackendUrl =
    localStorage.getItem(
        'hellangel_backend_url'
    );

if (savedBackendUrl) {

    backendUrlInput.value =
        savedBackendUrl;
}


// ------------------------------------------------------------
// Mở modal
// ------------------------------------------------------------

document
    .getElementById('btnPassword')
    .addEventListener(
        'click',
        () => {

            if (!currentSingleFile) {

                alert(
                    'Vui lòng mở một file PDF trước.'
                );

                return;
            }

            securityModal.style.display =
                'flex';
        }
    );


// ------------------------------------------------------------
// Hủy
// ------------------------------------------------------------

document
    .getElementById('btnCancelSecurity')
    .addEventListener(
        'click',
        () => {

            securityModal.style.display =
                'none';
        }
    );


// ============================================================
// 11. GỬI PDF TỚI BACKEND
// ============================================================

document
    .getElementById('btnConfirmSecurity')
    .addEventListener(
        'click',
        async () => {

            if (!currentSingleFile) {

                alert(
                    'Chưa có file PDF.'
                );

                return;
            }

            const password =
                pdfPassword.value.trim();

            const backendUrl =
                backendUrlInput.value.trim();


            // ------------------------------------------------
            // Kiểm tra password
            // ------------------------------------------------

            if (!password) {

                alert(
                    'Vui lòng nhập Owner Password!'
                );

                return;
            }


            // ------------------------------------------------
            // Kiểm tra Backend URL
            // ------------------------------------------------

            if (!backendUrl) {

                alert(
                    'Vui lòng nhập Backend URL!'
                );

                return;
            }


            // ------------------------------------------------
            // Lưu Backend URL
            // ------------------------------------------------

            localStorage.setItem(
                'hellangel_backend_url',
                backendUrl
            );


            const btn =
                document.getElementById(
                    'btnConfirmSecurity'
                );

            const oldText =
                btn.innerText;

            btn.innerText =
                'Đang khóa...';

            btn.disabled = true;


            try {

                const formData =
                    new FormData();


                // ------------------------------------------------
                // File PDF
                // ------------------------------------------------

                formData.append(
                    'pdfFile',
                    currentSingleFile,
                    currentSingleFile.name
                );


                // ------------------------------------------------
                // Owner Password
                // ------------------------------------------------

                formData.append(
                    'password',
                    password
                );


                // ------------------------------------------------
                // QUYỀN IN
                // ------------------------------------------------

                formData.append(
                    'allowPrint',
                    String(
                        document.getElementById(
                            'chkPrint'
                        ).checked
                    )
                );


                // ------------------------------------------------
                // QUYỀN CHỈNH SỬA
                // ------------------------------------------------

                formData.append(
                    'allowEdit',
                    String(
                        document.getElementById(
                            'chkEdit'
                        ).checked
                    )
                );


                // ------------------------------------------------
                // QUYỀN COPY
                // ------------------------------------------------

                formData.append(
                    'allowCopy',
                    String(
                        document.getElementById(
                            'chkCopy'
                        ).checked
                    )
                );


                // ------------------------------------------------
                // QUYỀN NHẬN XÉT
                // ------------------------------------------------

                formData.append(
                    'allowComment',
                    String(
                        document.getElementById(
                            'chkComment'
                        ).checked
                    )
                );


                // ------------------------------------------------
                // Gửi Backend
                // ------------------------------------------------

                const response =
                    await fetch(
                        backendUrl,
                        {
                            method: 'POST',
                            body: formData
                        }
                    );


                // ------------------------------------------------
                // Kiểm tra response
                // ------------------------------------------------

                if (!response.ok) {

                    const errorText =
                        await response.text();

                    throw new Error(
                        errorText ||
                        `Phản hồi HTTP ${response.status}`
                    );
                }


                // ------------------------------------------------
                // Nhận PDF
                // ------------------------------------------------

                const encryptedBlob =
                    await response.blob();


                if (
                    encryptedBlob.size === 0
                ) {

                    throw new Error(
                        'Backend trả về file rỗng.'
                    );
                }


                // ------------------------------------------------
                // Download
                // ------------------------------------------------

                const url =
                    URL.createObjectURL(
                        encryptedBlob
                    );

                const a =
                    document.createElement(
                        'a'
                    );

                a.href = url;

                a.download =
                    `ThienThanDiaNguc_Secured_${Date.now()}.pdf`;

                document.body.appendChild(a);

                a.click();

                document.body.removeChild(a);

                URL.revokeObjectURL(url);


                // ------------------------------------------------
                // Đóng modal
                // ------------------------------------------------

                securityModal.style.display =
                    'none';


                // ------------------------------------------------
                // Xóa password khỏi ô nhập
                // ------------------------------------------------

                pdfPassword.value = '';


                alert(
                    'Đã bảo vệ PDF thành công!'
                );

            } catch (error) {

                console.error(
                    'Security Error:',
                    error
                );

                alert(
                    'Kết nối tới Backend thất bại!\n\n' +
                    error.message
                );

            } finally {

                btn.innerText =
                    oldText;

                btn.disabled = false;
            }
        }
    );


// ============================================================
// 12. GỘP NHIỀU FILE
// ============================================================

document
    .getElementById('btnMerge')
    .addEventListener(
        'click',
        async (e) => {

            const btn =
                e.currentTarget;

            const oldText =
                btn.innerText;

            btn.innerText =
                'Đang gộp...';

            btn.disabled = true;

            try {

                const mergedPdf =
                    await PDFDocument.create();

                for (
                    const file
                    of uploadedFiles
                ) {

                    const buffer =
                        await file.arrayBuffer();

                    const pdf =
                        await PDFDocument.load(
                            buffer
                        );

                    const copiedPages =
                        await mergedPdf.copyPages(
                            pdf,
                            pdf.getPageIndices()
                        );

                    copiedPages.forEach(
                        page => {
                            mergedPdf.addPage(page);
                        }
                    );
                }

                const pdfBytes =
                    await mergedPdf.save();

                downloadBlob(
                    pdfBytes,
                    `ThienThanDiaNguc_Merged_${Date.now()}.pdf`
                );

            } catch (error) {

                console.error(error);

                alert(
                    'Lỗi khi gộp file: ' +
                    error.message
                );

            } finally {

                btn.innerText =
                    oldText;

                btn.disabled = false;
            }
        }
    );
