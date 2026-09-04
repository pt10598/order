const carrierPattern = /\/[0-9A-Z.+-]{7}/;

function loadBarcodeLibrary() {
  if (window.JsBarcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jsbarcode]');
    if (existing) {
      existing.addEventListener('load', resolve, {once: true});
      existing.addEventListener('error', reject, {once: true});
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    script.dataset.jsbarcode = 'true';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function createBarcodeDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'barcode-dialog';
  dialog.innerHTML = '<div class="barcode-dialog-head"><h2>手機載具條碼</h2><button type="button" aria-label="關閉">×</button></div><div class="barcode-dialog-body"><svg aria-label="手機載具條碼"></svg><div class="barcode-text"></div><p class="barcode-help">請將條碼對準發票設備掃描</p></div>';
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  document.body.appendChild(dialog);
  return dialog;
}

const barcodeDialog = createBarcodeDialog();

async function showCarrierBarcode(value) {
  barcodeDialog.querySelector('.barcode-text').textContent = value;
  barcodeDialog.querySelector('.barcode-help').textContent = '請將條碼對準發票設備掃描';
  barcodeDialog.showModal();
  const svg = barcodeDialog.querySelector('svg');
  svg.replaceChildren();
  try {
    await loadBarcodeLibrary();
    window.JsBarcode(svg, value, {format: 'CODE39', width: 3, height: 120, margin: 20, displayValue: false});
  } catch (error) {
    barcodeDialog.querySelector('.barcode-help').textContent = '條碼載入失敗，請確認網路後重新開啟。';
  }
}

document.querySelectorAll('.order-table td, .order-card p').forEach(element => {
  const match = element.textContent.match(carrierPattern);
  if (!match || !element.textContent.includes('手機載具')) return;
  const value = match[0];
  const prefix = element.matches('.order-card p') ? '發票：' : '';
  element.replaceChildren(document.createTextNode(prefix));
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'barcode-button';
  button.textContent = `📱 ${value}（顯示條碼）`;
  button.addEventListener('click', () => showCarrierBarcode(value));
  element.appendChild(button);
});
