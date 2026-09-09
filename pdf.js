// ============================================================
// PDF.JS - CÔNG CỤ PDF
// Kiến trúc:
// Thao tác → Tạo PDF tạm → Preview kết quả → Xuất PDF
// ============================================================


// ============================================================
// CẤU HÌNH PDF.JS
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';


// ============================================================
// BIẾN TOÀN CỤC
// ============================================================

const DOM = {

    uploadScreen:
        document.getElementById('uploadScreen'),

    workspaceScreen:
        document.getElementById('workspaceScreen'),

    fileInput:
        document.getElementById('fileInput'),

    dropZone:
        document.getElementById('dropZone'),

    previewGrid:
        document.getElementById('previewGrid'),

    fileList:
        document.getElementById('fileList'),

    loadingMsg:
        document.getElementById('loadingMsg'),

    singleTools:
        document.getElementById('singleFileTools'),

    multiTools:
        document.getElementById('multiFileTools'),

    zoomModal:
        document.getElementById('zoomModal'),

    zoomCanvas:
        document.getElementById('zoomCanvas'),

    zoomPageText:
        document.getElementById('zoomPageText'),

    closeModal:
        document.getElementById('closeModal')
};


let uploadedFiles = [];

let currentSingleFile = null;

let pagesData = [];

let currentPdfDoc = null;


// ============================================================
// DỮ LIỆU CHO GỘP PDF
// ============================================================

// Ví dụ:
//
// [
//     { fileIndex: 0, pageIndex: 0 },
//     { fileIndex: 1, pageIndex: 2 },
//     { fileIndex: 0, pageIndex: 1 }
// ]

let mergePages = [];


// ============================================================
// PDF KẾT QUẢ TẠM
// ============================================================

// Lưu PDF đang được preview.
// Chỉ khi người dùng bấm "Xuất PDF" mới download.

let resultPdfBytes = null;

let resultPdfFilename = null;

let isResultPreview = false;


// ============================================================
// 1. UPLOAD FILE
// ============================================================

DOM.fileInput.addEventListener(
    'change',
    (e) => {

        handleFiles(e.target.files);

    }
);


DOM.dropZone.addEventListener(
    'dragover',
    (e) => {

        e.preventDefault();

        DOM.dropZone.classList.add(
            'dragover'
        );

    }
);


DOM.dropZone.addEventListener(
    'dragleave',
    () => {

        DOM.dropZone.classList.remove(
            'dragover'
        );

    }
);


DOM.dropZone.addEventListener(
    'drop',
    (e) => {

        e.preventDefault();

        DOM.dropZone.classList.remove(
            'dragover'
        );

        handleFiles(
            e.dataTransfer.files
        );

    }
);


// ============================================================
// HANDLE FILES
// ============================================================

async function handleFiles(files) {

    if (!files || files.length === 0) {
        return;
    }


    uploadedFiles =
        Array.from(files).filter(
            f =>
                f.type === 'application/pdf' ||
                f.name
                    .toLowerCase()
                    .endsWith('.pdf')
        );


    if (uploadedFiles.length === 0) {

        alert(
            'Vui lòng chọn file PDF!'
        );

        return;
    }


    // Reset trạng thái kết quả

    resultPdfBytes = null;

    resultPdfFilename = null;

    isResultPreview = false;

    mergePages = [];


    DOM.uploadScreen.style.display =
        'none';

    DOM.workspaceScreen.style.display =
        'flex';

    DOM.previewGrid.innerHTML = '';

    DOM.fileList.innerHTML = '';


    // ========================================================
    // MỘT FILE
    // ========================================================

    if (uploadedFiles.length === 1) {

        currentSingleFile =
            uploadedFiles[0];

        DOM.singleTools.style.display =
            'flex';

        DOM.multiTools.style.display =
            'none';

        DOM.fileList.style.display =
            'none';

        DOM.previewGrid.style.display =
            'grid';

        await renderPDFPreview(
            currentSingleFile
        );

        return;
    }


    // ========================================================
    // NHIỀU FILE
    // ========================================================

    currentSingleFile = null;

    currentPdfDoc = null;

    pagesData = [];

    DOM.singleTools.style.display =
        'none';

    DOM.multiTools.style.display =
        'flex';

    DOM.fileList.style.display =
        'none';

    DOM.previewGrid.style.display =
        'block';


    await initializeMergePages();

    await renderMultiplePDFPreview();
}


// ============================================================
// 2. KHỞI TẠO DANH SÁCH TRANG GỘP
// ============================================================

async function initializeMergePages() {

    mergePages = [];


    for (
        let fileIndex = 0;
        fileIndex < uploadedFiles.length;
        fileIndex++
    ) {

        const file =
            uploadedFiles[fileIndex];


        try {

            const buffer =
                await file.arrayBuffer();


            const pdf =
                await pdfjsLib.getDocument({
                    data: new Uint8Array(buffer)
                }).promise;


            for (
                let pageIndex = 0;
                pageIndex < pdf.numPages;
                pageIndex++
            ) {

                mergePages.push({

                    fileIndex:
                        fileIndex,

                    pageIndex:
                        pageIndex

                });

            }

        } catch (error) {

            console.error(
                `Không thể đọc ${file.name}:`,
                error
            );

        }
    }
}


// ============================================================
// 3. PREVIEW PDF MỘT FILE
// ============================================================

async function renderPDFPreview(file) {

    DOM.loadingMsg.style.display =
        'block';


    try {

        const tempBuffer =
            await file.arrayBuffer();


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

                selected:
                    false,

                rotation:
                    0

            });


            const page =
                await currentPdfDoc.getPage(i);


            const viewport =
                page.getViewport({
                    scale: 0.5
                });


            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'page-card';


            card.dataset.index =
                i - 1;


            card.innerHTML = `

                <div class="selected-badge">
                    ✓
                </div>

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
                card.querySelector(
                    'canvas'
                );


            const ctx =
                canvas.getContext(
                    '2d'
                );


            canvas.height =
                viewport.height;

            canvas.width =
                viewport.width;


            await page.render({

                canvasContext:
                    ctx,

                viewport:
                    viewport

            }).promise;


            // Click chọn trang

            card.addEventListener(
                'click',
                () => {

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

                }
            );


            // Zoom

            const zoomBtn =
                card.querySelector(
                    '.zoom-btn'
                );


            zoomBtn.addEventListener(
                'click',
                (e) => {

                    e.stopPropagation();

                    openZoomModal(i);

                }
            );


            DOM.previewGrid.appendChild(
                card
            );
        }

    } catch (error) {

        alert(
            'Lỗi khi đọc file xem trước: ' +
            error.message
        );

    } finally {

        DOM.loadingMsg.style.display =
            'none';
    }
}


// ============================================================
// 4. PREVIEW NHIỀU FILE
// ============================================================

async function renderMultiplePDFPreview() {

    DOM.loadingMsg.style.display =
        'block';


    try {

        DOM.previewGrid.innerHTML = '';


        const pdfDocuments = [];


        // Đọc tất cả PDF

        for (
            const file
            of uploadedFiles
        ) {

            const buffer =
                await file.arrayBuffer();


            const pdf =
                await pdfjsLib.getDocument({

                    data:
                        new Uint8Array(buffer)

                }).promise;


            pdfDocuments.push(pdf);
        }


        const container =
            document.createElement(
                'div'
            );


        container.className =
            'multi-preview-container';


        // Render theo mergePages

        for (
            let orderIndex = 0;
            orderIndex < mergePages.length;
            orderIndex++
        ) {

            const item =
                mergePages[orderIndex];


            const file =
                uploadedFiles[
                    item.fileIndex
                ];


            const pdf =
                pdfDocuments[
                    item.fileIndex
                ];


            const pageNumber =
                item.pageIndex + 1;


            const page =
                await pdf.getPage(
                    pageNumber
                );


            const viewport =
                page.getViewport({
                    scale: 0.45
                });


            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'multi-page-card';


            card.draggable =
                true;


            card.dataset.fileIndex =
                item.fileIndex;


            card.dataset.pageIndex =
                item.pageIndex;


            card.dataset.orderIndex =
                orderIndex;


            card.innerHTML = `

                <div class="multi-page-header">

                    <span class="multi-page-order">
                        ${orderIndex + 1}
                    </span>

                    <span
                        class="multi-page-file"
                        title="${escapeHTML(file.name)}">

                        ${escapeHTML(file.name)}

                    </span>

                </div>


                <canvas></canvas>


                <div class="multi-page-footer">

                    <span>
                        Trang ${pageNumber}
                    </span>

                    <span class="drag-hint">
                        ↕ Kéo để sắp xếp
                    </span>

                </div>

            `;


            const canvas =
                card.querySelector(
                    'canvas'
                );


            const ctx =
                canvas.getContext(
                    '2d'
                );


            canvas.width =
                viewport.width;

            canvas.height =
                viewport.height;


            await page.render({

                canvasContext:
                    ctx,

                viewport:
                    viewport

            }).promise;


            container.appendChild(
                card
            );
        }


        DOM.previewGrid.appendChild(
            container
        );


        enablePageDragDrop();


    } catch (error) {

        console.error(error);

        alert(
            'Lỗi khi tạo xem trước nhiều file: ' +
            error.message
        );

    } finally {

        DOM.loadingMsg.style.display =
            'none';
    }
}


// ============================================================
// 5. KÉO THẢ TRANG
// ============================================================

function enablePageDragDrop() {

    const container =
        document.querySelector(
            '.multi-preview-container'
        );


    if (!container) {
        return;
    }


    let draggedCard = null;


    const cards =
        container.querySelectorAll(
            '.multi-page-card'
        );


    cards.forEach(
        card => {


            // ------------------------------------------------
            // START DRAG
            // ------------------------------------------------

            card.addEventListener(
                'dragstart',
                (e) => {

                    draggedCard =
                        card;


                    card.classList.add(
                        'dragging'
                    );


                    e.dataTransfer.effectAllowed =
                        'move';


                    e.dataTransfer.setData(
                        'text/plain',
                        'move'
                    );

                }
            );


            // ------------------------------------------------
            // DRAG END
            // ------------------------------------------------

            card.addEventListener(
                'dragend',
                () => {

                    if (draggedCard) {

                        draggedCard.classList.remove(
                            'dragging'
                        );

                    }


                    draggedCard =
                        null;


                    updateMergePageOrder();

                }
            );


            // ------------------------------------------------
            // DRAG OVER
            // ------------------------------------------------

            card.addEventListener(
                'dragover',
                (e) => {

                    e.preventDefault();


                    if (
                        !draggedCard ||
                        draggedCard === card
                    ) {
                        return;
                    }


                    const rect =
                        card.getBoundingClientRect();


                    const middle =
                        rect.top +
                        rect.height / 2;


                    if (
                        e.clientY <
                        middle
                    ) {

                        container.insertBefore(
                            draggedCard,
                            card
                        );

                    } else {

                        container.insertBefore(
                            draggedCard,
                            card.nextSibling
                        );

                    }

                }
            );

        }
    );
}


// ============================================================
// 6. CẬP NHẬT THỨ TỰ TRANG
// ============================================================

function updateMergePageOrder() {

    const cards =
        document.querySelectorAll(
            '.multi-page-card'
        );


    const newOrder = [];


    cards.forEach(
        (card, index) => {

            const fileIndex =
                parseInt(
                    card.dataset.fileIndex
                );


            const pageIndex =
                parseInt(
                    card.dataset.pageIndex
                );


            newOrder.push({

                fileIndex:
                    fileIndex,

                pageIndex:
                    pageIndex

            });


            card.dataset.orderIndex =
                index;


            const order =
                card.querySelector(
                    '.multi-page-order'
                );


            if (order) {

                order.innerText =
                    index + 1;

            }

        }
    );


    mergePages =
        newOrder;


    console.log(
        'Thứ tự trang:',
        mergePages
    );
}


// ============================================================
// 7. ESCAPE HTML
// ============================================================

function escapeHTML(text) {

    const div =
        document.createElement(
            'div'
        );


    div.textContent =
        text;


    return div.innerHTML;
}


// ============================================================
// 8. MODAL PHÓNG TO
// ============================================================

async function openZoomModal(pageNum) {

    if (!currentPdfDoc) {
        return;
    }


    DOM.zoomModal.classList.add(
        'active'
    );


    DOM.zoomPageText.innerText =
        `Đang tải trang ${pageNum}...`;


    try {

        const page =
            await currentPdfDoc.getPage(
                pageNum
            );


        const viewport =
            page.getViewport({
                scale: 2.0
            });


        const ctx =
            DOM.zoomCanvas.getContext(
                '2d'
            );


        DOM.zoomCanvas.height =
            viewport.height;

        DOM.zoomCanvas.width =
            viewport.width;


        await page.render({

            canvasContext:
                ctx,

            viewport:
                viewport

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

        DOM.zoomModal.classList.remove(
            'active'
        );

    }
);


DOM.zoomModal.addEventListener(
    'click',
    (e) => {

        if (
            e.target ===
            DOM.zoomModal
        ) {

            DOM.zoomModal.classList.remove(
                'active'
            );

        }

    }
);


// ============================================================
// 9. PDF-LIB
// ============================================================

const {
    PDFDocument,
    degrees
} = PDFLib;


// ============================================================
// 10. DOWNLOAD
// ============================================================

function downloadBlob(
    bytes,
    filename
) {

    const blob =
        new Blob(
            [bytes],
            {
                type:
                    'application/pdf'
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const a =
        document.createElement(
            'a'
        );


    a.href =
        url;


    a.download =
        filename;


    document.body.appendChild(
        a
    );


    a.click();


    document.body.removeChild(
        a
    );


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );

        },
        1000
    );
}


// ============================================================
// 11. PREVIEW KẾT QUẢ
// ============================================================

async function previewResultPDF(
    bytes,
    filename
) {

    resultPdfBytes =
        bytes;

    resultPdfFilename =
        filename;

    isResultPreview =
        true;


    DOM.loadingMsg.style.display =
        'block';


    try {

        const pdf =
            await pdfjsLib.getDocument({

                data:
                    new Uint8Array(bytes)

            }).promise;


        currentPdfDoc =
            pdf;


        DOM.previewGrid.innerHTML =
            '';


        DOM.previewGrid.style.display =
            'grid';


        // ----------------------------------------------------
        // THANH ĐIỀU KHIỂN KẾT QUẢ
        // ----------------------------------------------------

        const resultBar =
            document.createElement(
                'div'
            );


        resultBar.className =
            'result-preview-bar';


        resultBar.innerHTML = `

            <div class="result-preview-info">

                <strong>
                    Xem trước kết quả
                </strong>

                <span>
                    ${pdf.numPages} trang
                </span>

            </div>


            <div class="result-preview-actions">

                <button
                    type="button"
                    class="result-back-btn"
                    id="btnBackToEdit">

                    ← Chỉnh sửa tiếp

                </button>


                <button
                    type="button"
                    class="result-export-btn"
                    id="btnExportResult">

                    ✓ Xuất PDF

                </button>

            </div>

        `;


        DOM.previewGrid.appendChild(
            resultBar
        );


        // ----------------------------------------------------
        // CONTAINER PREVIEW
        // ----------------------------------------------------

        const previewContainer =
            document.createElement(
                'div'
            );


        previewContainer.className =
            'result-preview-container';


        DOM.previewGrid.appendChild(
            previewContainer
        );


        // ----------------------------------------------------
        // RENDER TỪNG TRANG
        // ----------------------------------------------------

        for (
            let i = 1;
            i <= pdf.numPages;
            i++
        ) {

            const page =
                await pdf.getPage(i);


            const viewport =
                page.getViewport({
                    scale: 0.5
                });


            const card =
                document.createElement(
                    'div'
                );


            card.className =
                'result-page-card';


            card.innerHTML = `

                <canvas></canvas>

                <div class="result-page-number">
                    Trang ${i}
                </div>

                <button
                    type="button"
                    class="result-zoom-btn"
                    title="Phóng to">

                    🔍

                </button>

            `;


            const canvas =
                card.querySelector(
                    'canvas'
                );


            const ctx =
                canvas.getContext(
                    '2d'
                );


            canvas.width =
                viewport.width;

            canvas.height =
                viewport.height;


            await page.render({

                canvasContext:
                    ctx,

                viewport:
                    viewport

            }).promise;


            // Zoom kết quả

            card
                .querySelector(
                    '.result-zoom-btn'
                )
                .addEventListener(
                    'click',
                    (e) => {

                        e.stopPropagation();

                        openResultZoom(
                            i
                        );

                    }
                );


            previewContainer.appendChild(
                card
            );
        }


        // ----------------------------------------------------
        // NÚT CHỈNH SỬA TIẾP
        // ----------------------------------------------------

        document
            .getElementById(
                'btnBackToEdit'
            )
            .addEventListener(
                'click',
                () => {

                    restoreOriginalPreview();

                }
            );


        // ----------------------------------------------------
        // NÚT XUẤT PDF
        // ----------------------------------------------------

        document
            .getElementById(
                'btnExportResult'
            )
            .addEventListener(
                'click',
                () => {

                    if (
                        !resultPdfBytes
                    ) {
                        return;
                    }


                    downloadBlob(
                        resultPdfBytes,
                        resultPdfFilename
                    );

                }
            );


    } catch (error) {

        console.error(error);

        alert(
            'Không thể xem trước PDF kết quả: ' +
            error.message
        );

    } finally {

        DOM.loadingMsg.style.display =
            'none';
    }
}


// ============================================================
// 12. ZOOM PDF KẾT QUẢ
// ============================================================

async function openResultZoom(
    pageNum
) {

    if (!currentPdfDoc) {
        return;
    }


    DOM.zoomModal.classList.add(
        'active'
    );


    DOM.zoomPageText.innerText =
        `Đang tải trang ${pageNum}...`;


    try {

        const page =
            await currentPdfDoc.getPage(
                pageNum
            );


        const viewport =
            page.getViewport({
                scale: 2
            });


        const ctx =
            DOM.zoomCanvas.getContext(
                '2d'
            );


        DOM.zoomCanvas.width =
            viewport.width;


        DOM.zoomCanvas.height =
            viewport.height;


        await page.render({

            canvasContext:
                ctx,

            viewport:
                viewport

        }).promise;


        DOM.zoomPageText.innerText =
            `Trang ${pageNum}`;


    } catch (error) {

        DOM.zoomPageText.innerText =
            'Lỗi khi tải trang!';

    }
}


// ============================================================
// 13. QUAY LẠI CHỈNH SỬA
// ============================================================

async function restoreOriginalPreview() {

    resultPdfBytes =
        null;

    resultPdfFilename =
        null;

    isResultPreview =
        false;


    DOM.previewGrid.innerHTML =
        '';


    if (
        uploadedFiles.length === 1 &&
        currentSingleFile
    ) {

        DOM.singleTools.style.display =
            'flex';

        DOM.multiTools.style.display =
            'none';

        DOM.previewGrid.style.display =
            'grid';

        await renderPDFPreview(
            currentSingleFile
        );

        return;
    }


    if (
        uploadedFiles.length > 1
    ) {

        DOM.singleTools.style.display =
            'none';

        DOM.multiTools.style.display =
            'flex';

        DOM.previewGrid.style.display =
            'block';

        await renderMultiplePDFPreview();

    }
}


// ============================================================
// 14. RESET
// ============================================================

document
    .getElementById('btnReset')
    .addEventListener(
        'click',
        () => {

            DOM.fileInput.value =
                '';


            uploadedFiles =
                [];

            currentSingleFile =
                null;

            pagesData =
                [];

            currentPdfDoc =
                null;

            mergePages =
                [];

            resultPdfBytes =
                null;

            resultPdfFilename =
                null;

            isResultPreview =
                false;


            DOM.previewGrid.innerHTML =
                '';

            DOM.fileList.innerHTML =
                '';


            DOM.workspaceScreen.style.display =
                'none';


            DOM.uploadScreen.style.display =
                'block';

        }
    );


// ============================================================
// 15. CHỌN TẤT CẢ
// ============================================================

document
    .getElementById('btnSelectAll')
    .addEventListener(
        'click',
        () => {

            if (
                isResultPreview
            ) {
                return;
            }


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


                    if (cards[idx]) {

                        cards[idx].classList.toggle(
                            'selected',
                            p.selected
                        );

                    }

                }
            );

        }
    );


// ============================================================
// 16. XOAY TRANG
// ============================================================

document
    .getElementById('btnRotate')
    .addEventListener(
        'click',
        () => {

            if (
                isResultPreview
            ) {
                return;
            }


            const cards =
                document.querySelectorAll(
                    '.page-card'
                );


            pagesData.forEach(
                (p, idx) => {

                    if (
                        p.selected &&
                        cards[idx]
                    ) {

                        p.rotation =
                            (
                                p.rotation +
                                90
                            ) % 360;


                        const canvas =
                            cards[idx]
                                .querySelector(
                                    'canvas'
                                );


                        canvas.style.transform =
                            `rotate(${p.rotation}deg)`;

                    }

                }
            );

        }
    );


// ============================================================
// 17. TÁCH / XÓA TRANG
// ============================================================

async function processSinglePDF(
    mode,
    button
) {

    if (!currentSingleFile) {

        alert(
            'Chưa có file PDF.'
        );

        return;
    }


    const oldText =
        button.innerText;


    button.innerText =
        'Đang tạo bản xem trước...';


    button.disabled =
        true;


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
                    idx =>
                        idx !== -1
                );


        if (
            targetIndexes.length === 0
        ) {

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


                if (
                    addedRotation > 0
                ) {

                    const currentAngle =
                        page
                            .getRotation()
                            .angle;


                    page.setRotation(
                        degrees(
                            currentAngle +
                            addedRotation
                        )
                    );

                }


                newPdf.addPage(
                    page
                );

            }
        );


        const pdfBytes =
            await newPdf.save();


        const filename =
            `ThienThanDiaNguc_${mode}_${Date.now()}.pdf`;


        // ====================================================
        // KHÔNG DOWNLOAD NGAY
        // CHỈ PREVIEW
        // ====================================================

        await previewResultPDF(
            pdfBytes,
            filename
        );


    } catch (error) {

        alert(
            error.message
        );

    } finally {

        button.innerText =
            oldText;

        button.disabled =
            false;

    }
}


// ============================================================
// NÚT TÁCH
// ============================================================

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


// ============================================================
// NÚT XÓA
// ============================================================

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
// 18. BẢO MẬT PDF
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


// ============================================================
// BACKEND URL
// ============================================================

const savedBackendUrl =
    localStorage.getItem(
        'hellangel_backend_url'
    );


if (savedBackendUrl) {

    backendUrlInput.value =
        savedBackendUrl;

}


// ============================================================
// MỞ MODAL
// ============================================================

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


// ============================================================
// HỦY
// ============================================================

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
// 19. GỬI PDF TỚI BACKEND
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
            // Password
            // ------------------------------------------------

            if (!password) {

                alert(
                    'Vui lòng nhập Owner Password!'
                );

                return;
            }


            // ------------------------------------------------
            // Backend
            // ------------------------------------------------

            if (!backendUrl) {

                alert(
                    'Vui lòng nhập Backend URL!'
                );

                return;
            }


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
                'Đang tạo bản xem trước...';


            btn.disabled =
                true;


            try {

                const formData =
                    new FormData();


                formData.append(
                    'pdfFile',
                    currentSingleFile,
                    currentSingleFile.name
                );


                formData.append(
                    'password',
                    password
                );


                formData.append(
                    'allowPrint',
                    String(
                        document
                            .getElementById(
                                'chkPrint'
                            )
                            .checked
                    )
                );


                formData.append(
                    'allowEdit',
                    String(
                        document
                            .getElementById(
                                'chkEdit'
                            )
                            .checked
                    )
                );


                formData.append(
                    'allowCopy',
                    String(
                        document
                            .getElementById(
                                'chkCopy'
                            )
                            .checked
                    )
                );


                formData.append(
                    'allowComment',
                    String(
                        document
                            .getElementById(
                                'chkComment'
                            )
                            .checked
                    )
                );


                // ------------------------------------------------
                // GỬI BACKEND
                // ------------------------------------------------

                const response =
                    await fetch(
                        backendUrl,
                        {
                            method:
                                'POST',

                            body:
                                formData
                        }
                    );


                if (!response.ok) {

                    const errorText =
                        await response.text();


                    throw new Error(
                        errorText ||
                        `Phản hồi HTTP ${response.status}`
                    );

                }


                // ------------------------------------------------
                // NHẬN PDF ĐÃ BẢO MẬT
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


                const encryptedBytes =
                    await encryptedBlob.arrayBuffer();


                // ------------------------------------------------
                // PREVIEW
                // ------------------------------------------------

                const filename =
                    `ThienThanDiaNguc_Secured_${Date.now()}.pdf`;


                securityModal.style.display =
                    'none';


                pdfPassword.value =
                    '';


                await previewResultPDF(
                    encryptedBytes,
                    filename
                );


            } catch (error) {

                console.error(
                    'Security Error:',
                    error
                );


                alert(
                    'Không thể tạo bản xem trước PDF bảo mật!\n\n' +
                    error.message
                );


            } finally {

                btn.innerText =
                    oldText;

                btn.disabled =
                    false;

            }

        }
    );


// ============================================================
// 20. GỘP NHIỀU FILE
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
                'Đang tạo bản xem trước...';


            btn.disabled =
                true;


            try {

                if (
                    uploadedFiles.length < 2
                ) {

                    throw new Error(
                        'Cần chọn ít nhất 2 file PDF để gộp.'
                    );

                }


                // ------------------------------------------------
                // Cập nhật thứ tự hiện tại
                // ------------------------------------------------

                updateMergePageOrder();


                if (
                    mergePages.length === 0
                ) {

                    throw new Error(
                        'Không có trang PDF để gộp.'
                    );

                }


                const mergedPdf =
                    await PDFDocument.create();


                // ------------------------------------------------
                // Load từng PDF
                // ------------------------------------------------

                const sourcePdfs =
                    [];


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


                    sourcePdfs.push(
                        pdf
                    );

                }


                // ------------------------------------------------
                // GỘP THEO THỨ TỰ TRANG
                // ------------------------------------------------

                for (
                    const item
                    of mergePages
                ) {

                    const sourcePdf =
                        sourcePdfs[
                            item.fileIndex
                        ];


                    const copiedPages =
                        await mergedPdf.copyPages(
                            sourcePdf,
                            [
                                item.pageIndex
                            ]
                        );


                    mergedPdf.addPage(
                        copiedPages[0]
                    );

                }


                // ------------------------------------------------
                // SAVE
                // ------------------------------------------------

                const pdfBytes =
                    await mergedPdf.save();


                const filename =
                    `ThienThanDiaNguc_Merged_${Date.now()}.pdf`;


                // ------------------------------------------------
                // PREVIEW - KHÔNG DOWNLOAD
                // ------------------------------------------------

                await previewResultPDF(
                    pdfBytes,
                    filename
                );


            } catch (error) {

                console.error(
                    error
                );


                alert(
                    'Lỗi khi gộp file: ' +
                    error.message
                );


            } finally {

                btn.innerText =
                    oldText;

                btn.disabled =
                    false;

            }

        }
    );
