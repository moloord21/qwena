// إعداد PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// المتغيرات العامة
let currentPDF = null;
let totalPages = 0;
let selectedPages = new Set();
let pdfBytes = null;

// عناصر DOM
const uploadSection = document.getElementById('uploadSection');
const editorSection = document.getElementById('editorSection');
const processingSection = document.getElementById('processingSection');
const resultSection = document.getElementById('resultSection');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const pagesContainer = document.getElementById('pagesContainer');
const startPageInput = document.getElementById('startPage');
const endPageInput = document.getElementById('endPage');
const countValue = document.getElementById('countValue');
const downloadLink = document.getElementById('downloadLink');
const pageCount = document.getElementById('pageCount');

// أحداث رفع الملف
fileInput.addEventListener('change', handleFileSelect);

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        handleFile(files[0]);
    } else {
        alert('الرجاء اختيار ملف PDF صالح');
    }
});

// معالجة اختيار الملف
async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// معالجة الملف
async function handleFile(file) {
    try {
        fileName.textContent = file.name;
        
        // قراءة الملف
        const arrayBuffer = await file.arrayBuffer();
        pdfBytes = arrayBuffer;
        
        // تحميل PDF باستخدام PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        currentPDF = await loadingTask.promise;
        totalPages = currentPDF.numPages;
        
        // تحديث واجهة المستخدم
        uploadSection.style.display = 'none';
        editorSection.style.display = 'block';
        
        // تعيين قيم الصفحات
        startPageInput.value = 1;
        startPageInput.max = totalPages;
        endPageInput.value = totalPages;
        endPageInput.max = totalPages;
        
        // عرض صفحات PDF
        await displayPages();
        
    } catch (error) {
        console.error('Error loading PDF:', error);
        alert('حدث خطأ أثناء تحميل الملف. الرجاء المحاولة مرة أخرى.');
    }
}

// عرض صفحات PDF
async function displayPages() {
    pagesContainer.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const page = await currentPDF.getPage(i);
        
        // إنشاء عنصر الصفحة
        const pageItem = document.createElement('div');
        pageItem.className = 'page-item';
        pageItem.dataset.pageNumber = i;
        pageItem.onclick = () => togglePageSelection(i);
        
        // تحديد مقياس الرسم
        const scale = 0.5;
        const viewport = page.getViewport({ scale });
        
        // إنشاء canvas للعرض
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // عرض الصفحة
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // إضافة رقم الصفحة
        const pageNumber = document.createElement('div');
        pageNumber.className = 'page-number';
        pageNumber.textContent = `صفحة ${i}`;
        
        // إضافة علامة التحديد
        const checkboxOverlay = document.createElement('div');
        checkboxOverlay.className = 'checkbox-overlay';
        checkboxOverlay.innerHTML = '<i class="fas fa-check"></i>';
        
        // تجميع العناصر
        pageItem.appendChild(canvas);
        pageItem.appendChild(pageNumber);
        pageItem.appendChild(checkboxOverlay);
        pagesContainer.appendChild(pageItem);
    }
    
    updateSelectedCount();
}

// تبديل تحديد الصفحة
function togglePageSelection(pageNumber) {
    if (selectedPages.has(pageNumber)) {
        selectedPages.delete(pageNumber);
    } else {
        selectedPages.add(pageNumber);
    }
    
    updatePageUI(pageNumber);
    updateSelectedCount();
}

// تحديث واجهة الصفحة
function updatePageUI(pageNumber) {
    const pageItem = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageItem) {
        if (selectedPages.has(pageNumber)) {
            pageItem.classList.add('selected');
        } else {
            pageItem.classList.remove('selected');
        }
    }
}

// تحديث عدد الصفحات المحددة
function updateSelectedCount() {
    countValue.textContent = selectedPages.size;
}

// تحديد الكل
function selectAll() {
    for (let i = 1; i <= totalPages; i++) {
        selectedPages.add(i);
        updatePageUI(i);
    }
    updateSelectedCount();
}

// تحديد الصفحات الفردية
function selectOdd() {
    clearSelection();
    for (let i = 1; i <= totalPages; i += 2) {
        selectedPages.add(i);
        updatePageUI(i);
    }
    updateSelectedCount();
}

// تحديد الصفحات الزوجية
function selectEven() {
    clearSelection();
    for (let i = 2; i <= totalPages; i += 2) {
        selectedPages.add(i);
        updatePageUI(i);
    }
    updateSelectedCount();
}

// مسح التحديد
function clearSelection() {
    selectedPages.clear();
    for (let i = 1; i <= totalPages; i++) {
        updatePageUI(i);
    }
    updateSelectedCount();
}

// قص PDF
async function cutPDF() {
    if (selectedPages.size === 0) {
        alert('الرجاء تحديد صفحة واحدة على الأقل');
        return;
    }
    
    try {
        // إظهار قسم المعالجة
        editorSection.style.display = 'none';
        processingSection.style.display = 'block';
        
        // تحميل PDF باستخدام pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newPdf = await PDFLib.PDFDocument.create();
        
        // تحويل Set إلى Array وفرز الصفحات
        const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
        
        // نسخ الصفحات المحددة
        const copiedPages = await newPdf.copyPages(pdfDoc, sortedPages.map(p => p - 1));
        copiedPages.forEach(page => newPdf.addPage(page));
        
        // حفظ الملف الجديد
        const pdfDataUri = await newPdf.saveAsBase64({ dataUri: true });
        
        // إخفاء المعالجة وإظهار النتيجة
        processingSection.style.display = 'none';
        resultSection.style.display = 'block';
        
        // تحديث معلومات النتيجة
        pageCount.textContent = sortedPages.length;
        downloadLink.href = pdfDataUri;
        downloadLink.download = `cut_${fileName.textContent}`;
        
    } catch (error) {
        console.error('Error cutting PDF:', error);
        alert('حدث خطأ أثناء قص الملف. الرجاء المحاولة مرة أخرى.');
        resetApp();
    }
}

// إعادة تعيين التطبيق
function resetApp() {
    currentPDF = null;
    totalPages = 0;
    selectedPages.clear();
    pdfBytes = null;
    fileInput.value = '';
    
    uploadSection.style.display = 'block';
    editorSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultSection.style.display = 'none';
    pagesContainer.innerHTML = '';
}

// الاستماع لتغييرات نطاق الصفحات
startPageInput.addEventListener('change', selectRange);
endPageInput.addEventListener('change', selectRange);

// تحديد نطاق من الصفحات
function selectRange() {
    const start = parseInt(startPageInput.value) || 1;
    const end = parseInt(endPageInput.value) || totalPages;
    
    if (start >= 1 && end <= totalPages && start <= end) {
        clearSelection();
        for (let i = start; i <= end; i++) {
            selectedPages.add(i);
            updatePageUI(i);
        }
        updateSelectedCount();
    }
}
