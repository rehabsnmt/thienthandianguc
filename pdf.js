// ============================================================
// THIÊN THẦN ĐỊA NGỤC - PDF TOOL
// PDF.JS + PDF-LIB
//
// Cấu trúc:
// Upload
//    ↓
// Source pages
//    ↓
// Edit / reorder
//    ↓
// Result PDF
//    ↓
// Preview
//    ↓
// Export
// ============================================================


// ============================================================
// 1. CẤU HÌNH PDF.JS
// ============================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';


// ============================================================
// 2. DOM
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
        document.getElementById('closeModal'),

    btnReset:
        document.getElementById('btnReset'),

    btnSelectAll:
        document.getElementById('btnSelectAll'),

    btnRotate:
        document.getElementById('btnRotate'),

    btnExtract:
        document.getElementById('btnExtract'),

    btnDelete:
        document.getElementById('btnDelete'),

    btnPassword:
        document.getElementById('btnPassword'),

    btnMerge:
        document.getElementById('btnMerge')

};


// ============================================================
// 3. BIẾN TOÀN CỤC
// ============================================================

let uploadedFiles = [];


// ------------------------------------------------------------
// File PDF.js đã load
// ------------------------------------------------------------

let pdfDocuments = [];


// ------------------------------------------------------------
// File PDF-lib đã load
// ------------------------------------------------------------

let sourcePdfDocuments = [];


// ------------------------------------------------------------
// Chế độ hiện tại
// ------------------------------------------------------------

let currentMode = 'none';
// none
// single
// multi


// ------------------------------------------------------------
// File đơn hiện tại
// ------------------------------------------------------------

let currentSingleFile = null;


// ------------------------------------------------------------
// Model trang của file đơn
// ------------------------------------------------------------

let pagesData = [];


// ------------------------------------------------------------
// MODEL TRANG CHÍNH
//
// Đây là biến quan trọng nhất.
//
// Mỗi phần tử đại diện cho MỘT TRANG thực tế.
//
// Ví dụ:
//
// [
//   { fileIndex: 0, pageIndex: 0 },
//   { fileIndex: 1, pageIndex: 0 },
//   { fileIndex: 0, pageIndex: 1 }
// ]
//
// Nghĩa là:
//
// PDF 1 - trang 1
// PDF 2 - trang 1
// PDF 1 - trang 2
// ------------------------------------------------------------

let documentPages = [];


// ------------------------------------------------------------
// Kết quả đang preview
// ------------------------------------------------------------

let resultPdfBytes = null;

let resultPdfDocument = null;

let resultMode = null;
// single
// multi
// security


// ============================================================
// 4. PDF-LIB
// ============================================================

const {
    PDFDocument,
    degrees
} = PDFLib;


// ============================================================
// 5. KHỞI TẠO RESULT UI
//
// Nếu HTML chưa có resultSection,
// JS tự tạo.
// ============================================================

function ensureResultUI() {

    let resultSection =
        document.getElementById('resultSection');

    if (!resultSection) {

        resultSection =
            document.createElement('div');

        resultSection.id =
            'resultSection';

        resultSection.style.display =
            'none';

        resultSection.innerHTML = `

            <div
                style="
                    padding:18px 20px;
                    border-top:1px solid var(--border);
                    background:#ffffff;
                "
            >

                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:12px;
                        flex-wrap:wrap;
                    "
                >

                    <div>

                        <div
                            style="
                                font-size:15px;
                                font-weight:750;
                                color:#0f172a;
                            "
                        >
                            Xem trước kết quả
                        </div>

                        <div
                            id="resultInfo"
                            style="
                                margin-top:4px;
                                font-size:12px;
                                color:#64748b;
                            "
                        >
                            Chưa có kết quả
                        </div>

                    </div>


                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                        "
                    >

                        <button
                            class="btn"
                            id="btnBackToEdit"
                        >
                            ← Tiếp tục chỉnh sửa
                        </button>

                        <button
                            class="btn btn-primary"
                            id="btnExportResult"
                        >
                            ⬇ Xuất PDF
                        </button>

                    </div>

                </div>

            </div>


            <div
                id="resultPreviewGrid"
                style="
                    display:grid;
                    grid-template-columns:
                        repeat(
                            auto-fill,
                            minmax(155px, 1fr)
                        );
                    gap:18px;
                    padding:22px;
                    max-height:65vh;
                    overflow-y:auto;
                    background:#f1f5f9;
                "
            ></div>

        `;

        DOM.workspaceScreen.appendChild(
            resultSection
        );

    }


    return {

        section:
            resultSection,

        grid:
            document.getElementById(
                'resultPreviewGrid'
            ),

        info:
            document.getElementById(
                'resultInfo'
            ),

        back:
            document.getElementById(
                'btnBackToEdit'
            ),

        export:
            document.getElementById(
                'btnExportResult'
            )

    };

}


// ============================================================
// 6. RESULT UI EVENTS
// ============================================================

const RESULT_UI =
    ensureResultUI();


RESULT_UI.back.addEventListener(
    'click',
    () => {

        hideResultPreview();

    }
);


RESULT_UI.export.addEventListener(
    'click',
    () => {

        exportResultPDF();

    }
);


// ============================================================
// 7. UPLOAD FILE
// ============================================================

DOM.fileInput.addEventListener(
    'change',
    e => {

        handleFiles(
            e.target.files
        );

    }
);


DOM.dropZone.addEventListener(
    'dragover',
    e => {

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
    e => {

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
// 8. HANDLE FILES
// ============================================================

async function handleFiles(files) {

    if (!files || files.length === 0) {
        return;
    }


    uploadedFiles =
        Array.from(files).filter(
            file =>
                file.type === 'application/pdf' ||
                file.name
                    .toLowerCase()
                    .endsWith('.pdf')
        );


    if (uploadedFiles.length === 0) {

        alert(
            'Vui lòng chọn file PDF!'
        );

        return;
    }


    // Reset model

    pdfDocuments = [];

    sourcePdfDocuments = [];

    pagesData = [];

    documentPages = [];

    resultPdfBytes = null;

    resultPdfDocument = null;

    resultMode = null;


    currentSingleFile =
        uploadedFiles.length === 1
            ? uploadedFiles[0]
            : null;


    currentMode =
        uploadedFiles.length === 1
            ? 'single'
            : 'multi';


    DOM.uploadScreen.style.display =
        'none';

    DOM.workspaceScreen.style.display =
        'flex';


    DOM.previewGrid.innerHTML = '';

    DOM.fileList.innerHTML = '';


    hideResultPreview();


    // --------------------------------------------------------
    // SINGLE
    // --------------------------------------------------------

    if (currentMode === 'single') {

        DOM.singleTools.style.display =
            'flex';

        DOM.multiTools.style.display =
            'none';

        DOM.fileList.style.display =
            'none';

        DOM.previewGrid.style.display =
            'grid';

        await loadSinglePDF(
            currentSingleFile
        );

        return;
    }


    // --------------------------------------------------------
    // MULTI
    // --------------------------------------------------------

    DOM.singleTools.style.display =
        'none';

    DOM.multiTools.style.display =
        'flex';

    DOM.fileList.style.display =
        'none';

    DOM.previewGrid.style.display =
        'block';


    await loadMultiplePDFs();

}


// ============================================================
// 9. LOAD SINGLE PDF
// ============================================================

async function loadSinglePDF(file) {

    showLoading(
        'Đang tải bản xem trước... Vui lòng đợi.'
    );


    try {

        const buffer =
            await file.arrayBuffer();


        const pdfJsDoc =
            await pdfjsLib.getDocument({
                data:
                    new Uint8Array(buffer)
            }).promise;


        currentPdfDoc =
            pdfJsDoc;


        pdfDocuments = [
            pdfJsDoc
        ];


        pagesData = [];


        for (
            let i = 0;
            i < pdfJsDoc.numPages;
            i++
        ) {

            pagesData.push({

                sourcePage:
                    i,

                selected:
                    false,

                rotation:
                    0

            });

        }


        await renderSingleSource();


    } catch (error) {

        console.error(error);

        alert(
            'Lỗi khi đọc file PDF: ' +
            error.message
        );

    } finally {

        hideLoading();

    }

}


// ============================================================
// 10. RENDER SINGLE SOURCE
// ============================================================

async function renderSingleSource() {

    DOM.previewGrid.innerHTML = '';


    for (
        let i = 0;
        i < pagesData.length;
        i++
    ) {

        await createSinglePageCard(
            i
        );

    }

}


// ============================================================
// 11. CREATE SINGLE PAGE CARD
// ============================================================

async function createSinglePageCard(
    pageIndex
) {

    const data =
        pagesData[pageIndex];


    const page =
        await currentPdfDoc.getPage(
            pageIndex + 1
        );


    const viewport =
        page.getViewport({
            scale: 0.5
        });


    const card =
        document.createElement('div');


    card.className =
        'page-card';


    card.dataset.index =
        pageIndex;


    card.innerHTML = `

        <div class="selected-badge">
            ✓
        </div>

        <canvas></canvas>

        <div class="page-number">
            Trang ${pageIndex + 1}
        </div>

        <button
            class="zoom-btn"
            title="Phóng to"
        >
            🔍
        </button>

    `;


    const canvas =
        card.querySelector('canvas');


    const ctx =
        canvas.getContext('2d');


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


    // --------------------------------------------------------
    // Rotation
    // --------------------------------------------------------

    applyCardRotation(
        card,
        data.rotation
    );


    // --------------------------------------------------------
    // Selection
    // --------------------------------------------------------

    card.addEventListener(
        'click',
        () => {

            data.selected =
                !data.selected;

            card.classList.toggle(
                'selected',
                data.selected
            );

        }
    );


    // --------------------------------------------------------
    // Zoom
    // --------------------------------------------------------

    const zoomBtn =
        card.querySelector(
            '.zoom-btn'
        );


    zoomBtn.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            openZoomModal(
                currentPdfDoc,
                pageIndex + 1
            );

        }
    );


    DOM.previewGrid.appendChild(
        card
    );

}


// ============================================================
// 12. LOAD MULTIPLE PDFs
//
// Tất cả trang được đưa vào documentPages.
// ============================================================

async function loadMultiplePDFs() {

    showLoading(
        'Đang tải tất cả các trang PDF... Vui lòng đợi.'
    );


    try {

        documentPages = [];


        pdfDocuments = [];

        sourcePdfDocuments = [];


        // ----------------------------------------------------
        // Đọc từng file
        // ----------------------------------------------------

        for (
            let fileIndex = 0;
            fileIndex < uploadedFiles.length;
            fileIndex++
        ) {

            const file =
                uploadedFiles[fileIndex];


            const buffer =
                await file.arrayBuffer();


            // PDF.js

            const pdfJsDoc =
                await pdfjsLib.getDocument({
                    data:
                        new Uint8Array(buffer)
                }).promise;


            pdfDocuments[fileIndex] =
                pdfJsDoc;


            // PDF-lib

            const sourcePdf =
                await PDFDocument.load(
                    buffer
                );


            sourcePdfDocuments[fileIndex] =
                sourcePdf;


            // ------------------------------------------------
            // Tạo model trang
            // ------------------------------------------------

            for (
                let pageIndex = 0;
                pageIndex < pdfJsDoc.numPages;
                pageIndex++
            ) {

                documentPages.push({

                    fileIndex:
                        fileIndex,

                    pageIndex:
                        pageIndex,

                    rotation:
                        0,

                    selected:
                        false

                });

            }

        }


        await renderMultiSource();


    } catch (error) {

        console.error(error);

        alert(
            'Lỗi khi đọc các file PDF: ' +
            error.message
        );

    } finally {

        hideLoading();

    }

}


// ============================================================
// 13. RENDER MULTI SOURCE
//
// Tất cả trang nằm chung một grid.
// ============================================================

async function renderMultiSource() {

    DOM.previewGrid.innerHTML = '';


    const header =
        document.createElement('div');


    header.className =
        'multi-preview-header';


    header.innerHTML = `

        <div>

            <strong>
                Tất cả các trang
            </strong>

            <span
                id="multiPageCount"
                style="
                    margin-left:8px;
                    color:#64748b;
                    font-size:12px;
                "
            >
                ${documentPages.length} trang
            </span>

        </div>

        <div
            style="
                color:#64748b;
                font-size:12px;
            "
        >
            Kéo thả từng trang để sắp xếp
        </div>

    `;


    DOM.previewGrid.appendChild(
        header
    );


    const grid =
        document.createElement('div');


    grid.id =
        'multiPageGrid';


    grid.style.display =
        'grid';


    grid.style.gridTemplateColumns =
        'repeat(auto-fill, minmax(145px, 1fr))';


    grid.style.gap =
        '18px';


    grid.style.padding =
        '20px';


    grid.style.background =
        '#f8fafc';


    grid.style.border =
        '1px solid var(--border)';


    grid.style.borderRadius =
        '12px';


    grid.style.maxHeight =
        '65vh';


    grid.style.overflowY =
        'auto';


    DOM.previewGrid.appendChild(
        grid
    );


    for (
        let i = 0;
        i < documentPages.length;
        i++
    ) {

        await createMultiPageCard(
            i,
            grid
        );

    }

}


// ============================================================
// 14. CREATE MULTI PAGE CARD
// ============================================================

async function createMultiPageCard(
    documentIndex,
    grid
) {

    const item =
        documentPages[documentIndex];


    const pdfDoc =
        pdfDocuments[
            item.fileIndex
        ];


    const page =
        await pdfDoc.getPage(
            item.pageIndex + 1
        );


    const viewport =
        page.getViewport({
            scale: 0.5
        });


    const card =
        document.createElement('div');


    card.className =
        'page-card multi-page-card';


    card.draggable =
        true;


    card.dataset.index =
        documentIndex;


    const file =
        uploadedFiles[
            item.fileIndex
        ];


    card.innerHTML = `

        <div class="selected-badge">
            ✓
        </div>

        <canvas></canvas>

        <div class="page-number">
            Trang ${item.pageIndex + 1}
        </div>

        <div
            class="multi-page-source"
            title="${escapeHtml(file.name)}"
        >
            ${escapeHtml(file.name)}
        </div>

        <button
            class="zoom-btn"
            title="Phóng to"
        >
            🔍
        </button>

    `;


    const canvas =
        card.querySelector('canvas');


    const ctx =
        canvas.getContext('2d');


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


    applyCardRotation(
        card,
        item.rotation
    );


    // --------------------------------------------------------
    // Selection
    // --------------------------------------------------------

    card.addEventListener(
        'click',
        () => {

            item.selected =
                !item.selected;

            card.classList.toggle(
                'selected',
                item.selected
            );

        }
    );


    // --------------------------------------------------------
    // Zoom
    // --------------------------------------------------------

    const zoomBtn =
        card.querySelector(
            '.zoom-btn'
        );


    zoomBtn.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            openZoomModal(
                pdfDoc,
                item.pageIndex + 1
            );

        }
    );


    // --------------------------------------------------------
    // Drag Start
    // --------------------------------------------------------

    card.addEventListener(
        'dragstart',
        e => {

            card.classList.add(
                'dragging'
            );


            e.dataTransfer.effectAllowed =
                'move';


            e.dataTransfer.setData(
                'text/plain',
                String(documentIndex)
            );

        }
    );


    // --------------------------------------------------------
    // Drag End
    // --------------------------------------------------------

    card.addEventListener(
        'dragend',
        () => {

            card.classList.remove(
                'dragging'
            );

            document
                .querySelectorAll(
                    '.multi-page-card'
                )
                .forEach(
                    element => {

                        element.classList.remove(
                            'drag-over'
                        );

                    }
                );

        }
    );


    // --------------------------------------------------------
    // Drag Over
    // --------------------------------------------------------

    card.addEventListener(
        'dragover',
        e => {

            e.preventDefault();

            e.dataTransfer.dropEffect =
                'move';


            card.classList.add(
                'drag-over'
            );

        }
    );


    // --------------------------------------------------------
    // Drag Leave
    // --------------------------------------------------------

    card.addEventListener(
        'dragleave',
        () => {

            card.classList.remove(
                'drag-over'
            );

        }
    );


    // --------------------------------------------------------
    // DROP
    // --------------------------------------------------------

    card.addEventListener(
        'drop',
        async e => {

            e.preventDefault();

            card.classList.remove(
                'drag-over'
            );


            const fromIndex =
                parseInt(
                    e.dataTransfer.getData(
                        'text/plain'
                    )
                );


            const targetIndex =
                parseInt(
                    card.dataset.index
                );


            if (
                Number.isNaN(fromIndex) ||
                Number.isNaN(targetIndex) ||
                fromIndex === targetIndex
            ) {
                return;
            }


            moveDocumentPage(
                fromIndex,
                targetIndex
            );


            await renderMultiSource();

        }
    );


    grid.appendChild(
        card
    );

}


// ============================================================
// 15. DI CHUYỂN TRANG TRONG documentPages
// ============================================================

function moveDocumentPage(
    fromIndex,
    targetIndex
) {

    if (
        fromIndex < 0 ||
        targetIndex < 0 ||
        fromIndex >= documentPages.length ||
        targetIndex >= documentPages.length
    ) {
        return;
    }


    const movedPage =
        documentPages.splice(
            fromIndex,
            1
        )[0];


    documentPages.splice(
        targetIndex,
        0,
        movedPage
    );

}


// ============================================================
// 16. ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}


// ============================================================
// 17. ROTATION CARD
// ============================================================

function applyCardRotation(
    card,
    rotation
) {

    const canvas =
        card.querySelector(
            'canvas'
        );


    if (!canvas) {
        return;
    }


    canvas.style.transform =
        `rotate(${rotation}deg)`;

}


// ============================================================
// 18. SELECT ALL - SINGLE
// ============================================================

if (DOM.btnSelectAll) {

    DOM.btnSelectAll.addEventListener(
        'click',
        () => {

            if (
                currentMode !== 'single'
            ) {
                return;
            }


            const allSelected =
                pagesData.length > 0 &&
                pagesData.every(
                    page =>
                        page.selected
                );


            pagesData.forEach(
                (page, index) => {

                    page.selected =
                        !allSelected;


                    const card =
                        DOM.previewGrid
                            .querySelector(
                                `.page-card[data-index="${index}"]`
                            );


                    if (card) {

                        card.classList.toggle(
                            'selected',
                            page.selected
                        );

                    }

                }
            );

        }
    );

}


// ============================================================
// 19. XOAY TRANG - SINGLE
// ============================================================

if (DOM.btnRotate) {

    DOM.btnRotate.addEventListener(
        'click',
        () => {

            if (
                currentMode !== 'single'
            ) {
                return;
            }


            let count =
                0;


            pagesData.forEach(
                (page, index) => {

                    if (
                        page.selected
                    ) {

                        page.rotation =
                            (
                                page.rotation +
                                90
                            ) % 360;


                        const card =
                            DOM.previewGrid
                                .querySelector(
                                    `.page-card[data-index="${index}"]`
                                );


                        if (card) {

                            applyCardRotation(
                                card,
                                page.rotation
                            );

                        }


                        count++;

                    }

                }
            );


            if (count === 0) {

                alert(
                    'Vui lòng chọn ít nhất 1 trang để xoay.'
                );

                return;
            }


            // Không download.
            // Chỉ cập nhật model.

        }
    );

}


// ============================================================
// 20. TẠO MODEL KẾT QUẢ - SINGLE
// ============================================================

function buildSingleResultModel(
    mode
) {

    const result = [];


    for (
        let i = 0;
        i < pagesData.length;
        i++
    ) {

        const page =
            pagesData[i];


        if (
            mode === 'extract' &&
            page.selected
        ) {

            result.push({

                sourcePage:
                    i,

                rotation:
                    page.rotation

            });

        }


        if (
            mode === 'delete' &&
            !page.selected
        ) {

            result.push({

                sourcePage:
                    i,

                rotation:
                    page.rotation

            });

        }

    }


    return result;

}


// ============================================================
// 21. TẠO PDF SINGLE
// ============================================================

async function createSingleResultPDF(
    mode
) {

    if (!currentSingleFile) {

        throw new Error(
            'Chưa có file PDF.'
        );

    }


    const buffer =
        await currentSingleFile.arrayBuffer();


    const sourcePdf =
        await PDFDocument.load(
            buffer
        );


    const resultModel =
        buildSingleResultModel(
            mode
        );


    if (
        resultModel.length === 0
    ) {

        throw new Error(

            mode === 'extract'

                ? 'Vui lòng chọn ít nhất 1 trang để trích xuất!'

                : 'Bạn đã xóa hết tất cả các trang!'

        );

    }


    const newPdf =
        await PDFDocument.create();


    const indexes =
        resultModel.map(
            item =>
                item.sourcePage
        );


    const copiedPages =
        await newPdf.copyPages(
            sourcePdf,
            indexes
        );


    copiedPages.forEach(
        (page, index) => {

            const model =
                resultModel[index];


            const rotation =
                model.rotation || 0;


            if (rotation !== 0) {

                const currentAngle =
                    page.getRotation().angle;


                page.setRotation(
                    degrees(
                        currentAngle +
                        rotation
                    )
                );

            }


            newPdf.addPage(
                page
            );

        }
    );


    return await newPdf.save();

}


// ============================================================
// 22. EXTRACT
// ============================================================

if (DOM.btnExtract) {

    DOM.btnExtract.addEventListener(
        'click',
        async () => {

            if (
                currentMode !== 'single'
            ) {
                return;
            }


            await createAndPreviewSingleResult(
                'extract'
            );

        }
    );

}


// ============================================================
// 23. DELETE
// ============================================================

if (DOM.btnDelete) {

    DOM.btnDelete.addEventListener(
        'click',
        async () => {

            if (
                currentMode !== 'single'
            ) {
                return;
            }


            await createAndPreviewSingleResult(
                'delete'
            );

        }
    );

}


// ============================================================
// 24. CREATE + PREVIEW SINGLE RESULT
// ============================================================

async function createAndPreviewSingleResult(
    mode
) {

    showLoading(
        'Đang tạo bản xem trước kết quả...'
    );


    try {

        const bytes =
            await createSingleResultPDF(
                mode
            );


        resultPdfBytes =
            bytes;


        resultMode =
            mode;


        await showResultPreview(
            bytes,
            mode === 'extract'
                ? 'Trích xuất PDF'
                : 'Xóa trang PDF'
        );


    } catch (error) {

        alert(
            error.message
        );

    } finally {

        hideLoading();

    }

}


// ============================================================
// 25. TẠO PDF GỘP THEO documentPages
// ============================================================

async function createMergedPDF() {

    if (
        documentPages.length === 0
    ) {

        throw new Error(
            'Không có trang để gộp.'
        );

    }


    const mergedPdf =
        await PDFDocument.create();


    // --------------------------------------------------------
    // QUAN TRỌNG
    //
    // Không duyệt uploadedFiles.
    //
    // Duyệt documentPages.
    //
    // Vì documentPages chính là thứ tự cuối cùng.
    // --------------------------------------------------------

    for (
        const item
        of documentPages
    ) {

        const sourcePdf =
            sourcePdfDocuments[
                item.fileIndex
            ];


        const copiedPages =
            await mergedPdf.copyPages(
                sourcePdf,
                [
                    item.pageIndex
                ]
            );


        const page =
            copiedPages[0];


        const rotation =
            item.rotation || 0;


        if (
            rotation !== 0
        ) {

            const currentAngle =
                page.getRotation().angle;


            page.setRotation(
                degrees(
                    currentAngle +
                    rotation
                )
            );

        }


        mergedPdf.addPage(
            page
        );

    }


    return await mergedPdf.save();

}


// ============================================================
// 26. GỘP PDF
//
// Không download.
// Chỉ tạo preview.
// ============================================================

if (DOM.btnMerge) {

    DOM.btnMerge.addEventListener(
        'click',
        async () => {

            if (
                currentMode !== 'multi'
            ) {
                return;
            }


            showLoading(
                'Đang tạo PDF theo thứ tự trang đã sắp xếp...'
            );


            try {

                const bytes =
                    await createMergedPDF();


                resultPdfBytes =
                    bytes;


                resultMode =
                    'multi';


                await showResultPreview(
                    bytes,
                    'PDF đã gộp'
                );


            } catch (error) {

                console.error(error);

                alert(
                    'Lỗi khi gộp file: ' +
                    error.message
                );

            } finally {

                hideLoading();

            }

        }
    );

}


// ============================================================
// 27. HIỂN THỊ RESULT PREVIEW
// ============================================================

async function showResultPreview(
    bytes,
    title
) {

    RESULT_UI.section.style.display =
        'block';


    RESULT_UI.info.innerText =
        `${title} — đang tải bản xem trước...`;


    RESULT_UI.grid.innerHTML = '';


    try {

        const loadingTask =
            pdfjsLib.getDocument({
                data:
                    new Uint8Array(bytes)
            });


        resultPdfDocument =
            await loadingTask.promise;


        const totalPages =
            resultPdfDocument.numPages;


        RESULT_UI.info.innerText =
            `${title} — ${totalPages} trang`;


        for (
            let i = 1;
            i <= totalPages;
            i++
        ) {

            await renderResultPage(
                resultPdfDocument,
                i
            );

        }


        // Cuộn xuống kết quả

        RESULT_UI.section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });


    } catch (error) {

        console.error(error);

        RESULT_UI.info.innerText =
            'Không thể xem trước kết quả.';

        throw error;

    }

}


// ============================================================
// 28. RENDER RESULT PAGE
// ============================================================

async function renderResultPage(
    pdfDoc,
    pageNumber
) {

    const page =
        await pdfDoc.getPage(
            pageNumber
        );


    const viewport =
        page.getViewport({
            scale: 0.5
        });


    const card =
        document.createElement('div');


    card.className =
        'page-card';


    card.innerHTML = `

        <canvas></canvas>

        <div class="page-number">
            Trang ${pageNumber}
        </div>

        <button
            class="zoom-btn"
            title="Phóng to"
        >
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


    const zoomBtn =
        card.querySelector(
            '.zoom-btn'
        );


    zoomBtn.addEventListener(
        'click',
        e => {

            e.stopPropagation();

            openZoomModal(
                pdfDoc,
                pageNumber
            );

        }
    );


    RESULT_UI.grid.appendChild(
        card
    );

}


// ============================================================
// 29. ẨN RESULT PREVIEW
// ============================================================

function hideResultPreview() {

    RESULT_UI.section.style.display =
        'none';


    RESULT_UI.grid.innerHTML =
        '';


    RESULT_UI.info.innerText =
        'Chưa có kết quả';


    resultPdfBytes =
        null;


    resultPdfDocument =
        null;


    resultMode =
        null;

}


// ============================================================
// 30. EXPORT RESULT
// ============================================================

function exportResultPDF() {

    if (
        !resultPdfBytes ||
        resultPdfBytes.length === 0
    ) {

        alert(
            'Chưa có kết quả để xuất.'
        );

        return;
    }


    let filename =
        'ThienThanDiaNguc_Result.pdf';


    if (
        resultMode === 'extract'
    ) {

        filename =
            `ThienThanDiaNguc_Extract_${Date.now()}.pdf`;

    }


    if (
        resultMode === 'delete'
    ) {

        filename =
            `ThienThanDiaNguc_Delete_${Date.now()}.pdf`;

    }


    if (
        resultMode === 'multi'
    ) {

        filename =
            `ThienThanDiaNguc_Merged_${Date.now()}.pdf`;

    }


    downloadBlob(
        resultPdfBytes,
        filename
    );

}


// ============================================================
// 31. DOWNLOAD BLOB
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
        100
    );

}


// ============================================================
// 32. ZOOM MODAL
// ============================================================

async function openZoomModal(
    pdfDoc,
    pageNum
) {

    if (!pdfDoc) {
        return;
    }


    DOM.zoomModal.classList.add(
        'active'
    );


    DOM.zoomPageText.innerText =
        `Đang tải trang ${pageNum}...`;


    try {

        const page =
            await pdfDoc.getPage(
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

        console.error(error);

        DOM.zoomPageText.innerText =
            'Lỗi khi tải trang!';

    }

}


// ============================================================
// 33. CLOSE ZOOM
// ============================================================

if (DOM.closeModal) {

    DOM.closeModal.addEventListener(
        'click',
        () => {

            DOM.zoomModal.classList.remove(
                'active'
            );

        }
    );

}


if (DOM.zoomModal) {

    DOM.zoomModal.addEventListener(
        'click',
        e => {

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

}


// ============================================================
// 34. LOADING
// ============================================================

function showLoading(
    message
) {

    DOM.loadingMsg.innerText =
        message;


    DOM.loadingMsg.style.display =
        'block';

}


function hideLoading() {

    DOM.loadingMsg.style.display =
        'none';

}


// ============================================================
// 35. RESET
// ============================================================

if (DOM.btnReset) {

    DOM.btnReset.addEventListener(
        'click',
        () => {

            DOM.fileInput.value =
                '';


            uploadedFiles =
                [];


            pdfDocuments =
                [];


            sourcePdfDocuments =
                [];


            currentSingleFile =
                null;


            pagesData =
                [];


            documentPages =
                [];


            currentMode =
                'none';


            resultPdfBytes =
                null;


            resultPdfDocument =
                null;


            resultMode =
                null;


            DOM.previewGrid.innerHTML =
                '';


            DOM.fileList.innerHTML =
                '';


            hideResultPreview();


            DOM.workspaceScreen.style.display =
                'none';


            DOM.uploadScreen.style.display =
                'block';

        }
    );

}


// ============================================================
// 36. SECURITY MODAL
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


const savedBackendUrl =
    localStorage.getItem(
        'hellangel_backend_url'
    );


if (
    savedBackendUrl &&
    backendUrlInput
) {

    backendUrlInput.value =
        savedBackendUrl;

}


// ============================================================
// 37. OPEN SECURITY
// ============================================================

if (DOM.btnPassword) {

    DOM.btnPassword.addEventListener(
        'click',
        () => {

            if (
                !currentSingleFile
            ) {

                alert(
                    'Vui lòng mở một file PDF trước.'
                );

                return;
            }


            securityModal.style.display =
                'flex';

        }
    );

}


// ============================================================
// 38. CANCEL SECURITY
// ============================================================

const btnCancelSecurity =
    document.getElementById(
        'btnCancelSecurity'
    );


if (btnCancelSecurity) {

    btnCancelSecurity.addEventListener(
        'click',
        () => {

            securityModal.style.display =
                'none';

        }
    );

}


// ============================================================
// 39. SECURITY
//
// LƯU Ý:
// Backend vẫn được giữ nguyên.
//
// Flow:
// Security settings
//       ↓
// Backend
//       ↓
// Protected PDF
//       ↓
// Preview
//       ↓
// Export
//
// Không download ngay.
// ============================================================

const btnConfirmSecurity =
    document.getElementById(
        'btnConfirmSecurity'
    );


if (btnConfirmSecurity) {

    btnConfirmSecurity.addEventListener(
        'click',
        async () => {

            if (
                !currentSingleFile
            ) {

                alert(
                    'Chưa có file PDF.'
                );

                return;
            }


            const password =
                pdfPassword.value.trim();


            const backendUrl =
                backendUrlInput.value.trim();


            if (!password) {

                alert(
                    'Vui lòng nhập Owner Password!'
                );

                return;
            }


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


            const oldText =
                btnConfirmSecurity.innerText;


            btnConfirmSecurity.innerText =
                'Đang tạo PDF bảo mật...';


            btnConfirmSecurity.disabled =
                true;


            try {

                // ------------------------------------------------
                // Lấy PDF hiện tại
                //
                // Nếu người dùng đã tạo result trước đó,
                // ưu tiên dùng result.
                //
                // Nếu chưa có thì dùng file gốc.
                // ------------------------------------------------

                let pdfToSecure =
                    null;


                if (
                    resultPdfBytes &&
                    resultPdfBytes.length > 0 &&
                    currentMode === 'single'
                ) {

                    pdfToSecure =
                        new Blob(
                            [
                                resultPdfBytes
                            ],
                            {
                                type:
                                    'application/pdf'
                            }
                        );

                } else {

                    pdfToSecure =
                        currentSingleFile;

                }


                const formData =
                    new FormData();


                formData.append(
                    'pdfFile',
                    pdfToSecure,
                    currentSingleFile.name
                );


                formData.append(
                    'password',
                    password
                );


                // ------------------------------------------------
                // PRINT
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
                // EDIT
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
                // COPY
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
                // COMMENT
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
                // SEND BACKEND
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
                // Lấy bytes
                // ------------------------------------------------

                const securedBytes =
                    new Uint8Array(
                        await encryptedBlob.arrayBuffer()
                    );


                // ------------------------------------------------
                // Lưu kết quả
                // ------------------------------------------------

                resultPdfBytes =
                    securedBytes;


                resultMode =
                    'security';


                // ------------------------------------------------
                // Đóng modal
                // ------------------------------------------------

                securityModal.style.display =
                    'none';


                pdfPassword.value =
                    '';


                // ------------------------------------------------
                // Preview
                //
                // Nếu PDF.js không đọc được encrypted PDF,
                // sẽ báo lỗi ở đây.
                // ------------------------------------------------

                try {

                    await showResultPreview(
                        securedBytes,
                        'PDF đã bảo mật'
                    );

                } catch (previewError) {

                    console.warn(
                        'Không thể preview PDF bảo mật:',
                        previewError
                    );


                    RESULT_UI.section.style.display =
                        'block';


                    RESULT_UI.info.innerText =
                        'PDF đã được tạo. Không thể hiển thị preview trực tiếp do mã hóa PDF.';


                    RESULT_UI.grid.innerHTML = `

                        <div
                            style="
                                grid-column:1/-1;
                                padding:50px 20px;
                                text-align:center;
                                color:#64748b;
                            "
                        >

                            <div
                                style="
                                    font-size:42px;
                                    margin-bottom:12px;
                                "
                            >
                                🔒
                            </div>

                            <strong
                                style="
                                    display:block;
                                    color:#334155;
                                    margin-bottom:7px;
                                "
                            >
                                PDF đã được bảo mật
                            </strong>

                            <div
                                style="
                                    font-size:13px;
                                "
                            >
                                File đã được tạo thành công.
                                Có thể xuất PDF bằng nút
                                "Xuất PDF".
                            </div>

                        </div>

                    `;

                }


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

                btnConfirmSecurity.innerText =
                    oldText;


                btnConfirmSecurity.disabled =
                    false;

            }

        }
    );

}
