// Invoice Excel Upload Modal
let invoiceCurrentPage = 0;
window.openUploadExcelModal = function() {
    const modal = document.getElementById('uploadExcelModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};
window.closeUploadExcelModal = function() {
    const modal = document.getElementById('uploadExcelModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const input = document.getElementById('excelFileInput');
    if (input) input.value = '';
};
function setupExcelUploadModal() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('excelFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    if (!dropZone || !fileInput || !uploadBtn) {
        setTimeout(setupExcelUploadModal, 100);
        return;
    }
    const btnUploadExcel = document.getElementById('btnUploadExcel');
    const btnCancel = document.getElementById('btnCancel');
    const btnClose = document.getElementById('modal-close-btn');
    const backdrop = document.getElementById('modal-backdrop');
    if (btnUploadExcel) btnUploadExcel.addEventListener('click', window.openUploadExcelModal);
    if (btnCancel) btnCancel.addEventListener('click', window.closeUploadExcelModal);
    if (btnClose) btnClose.addEventListener('click', window.closeUploadExcelModal);
    if (backdrop) backdrop.addEventListener('click', window.closeUploadExcelModal);
    if (uploadBtn) uploadBtn.addEventListener('click', window.uploadExcelFile);
}
window.handleExcelFileSelected = function(file) {
    const fileInfo = document.getElementById('fileInfo');
    if (!fileInfo) return;
    fileInfo.classList.remove('hidden');
};
window.uploadExcelFile = async function() {
    alert('Upload function called');
};
document.addEventListener('DOMContentLoaded', setupExcelUploadModal);
