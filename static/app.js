const cart = new Map();
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.meal-card');
const storePicker = document.querySelector('#storePicker');
const cartBar = document.querySelector('#cartBar');
const cartDialog = document.querySelector('#cartDialog');
let activeCategory = '全部';
let activeStore = '全部';

function clampQty(value) {
  const parsed = Number.parseInt(value, 10);
  return Math.max(1, Math.min(Number.isFinite(parsed) ? parsed : 1, 99));
}

document.querySelectorAll('.meal-add-qty').forEach(select => {
  const stepper = document.createElement('div');
  stepper.className = 'quantity-stepper';
  stepper.innerHTML = '<button type="button" class="qty-minus" aria-label="減少數量">−</button><input class="meal-add-qty" type="number" value="1" min="1" max="99" inputmode="numeric" aria-label="輸入加入數量"><button type="button" class="qty-plus" aria-label="增加數量">＋</button>';
  select.replaceWith(stepper);
});

function applyFilters() {
  let visible = 0;
  cards.forEach(card => {
    const categoryOk = activeCategory === '全部' || card.dataset.category === activeCategory;
    const storeOk = activeStore === '全部' || card.dataset.storeId === activeStore;
    const scheduleStoreOk = availableStoreIds().includes(card.dataset.storeId);
    card.hidden = !(categoryOk && storeOk && scheduleStoreOk);
    if (!card.hidden) visible++;
  });
  document.querySelector('#emptyState').hidden = visible !== 0;
}

filters.forEach(button => button.addEventListener('click', () => {
  filters.forEach(item => item.classList.remove('active'));
  button.classList.add('active');
  activeCategory = button.dataset.filter;
  applyFilters();
}));
const pickupDates = window.ORDER_PICKUP_DATES || [];
const locations = window.ORDER_LOCATIONS || [];
const stores = window.ORDER_STORES || [];
const dateSelect = document.querySelector('#dateSelect');
const timeSelect = document.querySelector('#timeSelect');
const locationSelect = document.querySelector('#locationSelect');

function selectedDateConfig() {
  return pickupDates.find(item => item.date === dateSelect.value);
}

function selectedLocation() {
  return locations.find(item => item.id === locationSelect.value);
}

function selectedSlotKey() {
  return `${dateSelect.value}|${timeSelect.value}`;
}

function updateAvailability() {
  const location = selectedLocation();
  document.querySelector('#pickupTime').textContent = location ? `取餐：${dateSelect.value}・${timeSelect.value}・${location.name}` : '這個時段目前沒有可選地點';
  const slotSelect = document.querySelector('#pickupTimeSelect');
  slotSelect.replaceChildren(...(timeSelect.value ? [new Option(timeSelect.value, timeSelect.value)] : []));
  updateStores();
  removeUnavailableCartItems();
  applyFilters();
}

function availableStoreIds() {
  if (!selectedLocation()) return [];
  return stores.filter(store => store.active !== false && (!store.locations_configured || (store.location_ids || []).includes(locationSelect.value))).map(store => store.id);
}

function updateStores() {
  const previous = activeStore;
  const allowed = new Set(availableStoreIds());
  const available = stores.filter(store => store.active !== false && allowed.has(store.id));
  if (previous !== '全部' && !available.some(store => store.id === previous)) activeStore = '全部';
  const choices = [{id: '全部', name: '全部店家', logo_url: '/static/store-placeholder.svg'}, ...available];
  storePicker.replaceChildren(...choices.map(store => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `store-choice${store.id === activeStore ? ' active' : ''}`;
    button.dataset.storeId = store.id;
    const logo = document.createElement('img');
    logo.src = store.logo_url || '/static/store-placeholder.svg';
    logo.alt = '';
    logo.addEventListener('error', () => { logo.src = '/static/store-placeholder.svg'; }, {once: true});
    const name = document.createElement('strong');
    name.textContent = store.name;
    button.append(logo, name);
    button.addEventListener('click', () => {
      activeStore = store.id;
      storePicker.querySelectorAll('.store-choice').forEach(choice => choice.classList.toggle('active', choice.dataset.storeId === activeStore));
      applyFilters();
    });
    return button;
  }));
}

document.querySelectorAll('[data-meal-view]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-meal-view]').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#mealGrid').classList.toggle('list-view', button.dataset.mealView === 'list');
}));

function updateLocations() {
  const previous = locationSelect.value;
  const key = selectedSlotKey();
  const available = locations.filter(item => item.active !== false && (!item.availability_configured || (item.slot_keys || []).includes(key)));
  locationSelect.replaceChildren(...available.map(item => new Option(item.name, item.id)));
  if (available.some(item => item.id === previous)) locationSelect.value = previous;
  updateAvailability();
}

function updateTimes() {
  const previous = timeSelect.value;
  const slots = selectedDateConfig()?.pickup_slots || [];
  timeSelect.replaceChildren(...slots.map(slot => new Option(slot, slot)));
  if (slots.includes(previous)) timeSelect.value = previous;
  updateLocations();
}

dateSelect.addEventListener('change', updateTimes);
timeSelect.addEventListener('change', updateLocations);
locationSelect.addEventListener('change', updateAvailability);
updateTimes();

document.querySelectorAll('.date').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.date').forEach(item => item.classList.remove('active'));
  button.classList.add('active');
}));

document.querySelectorAll('.favorite').forEach(button => button.addEventListener('click', () => {
  button.classList.toggle('on');
  button.textContent = button.classList.contains('on') ? '♥' : '♡';
}));

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1500);
}

function updateCart() {
  const items = [...cart.values()];
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.querySelector('#cartCount').textContent = count;
  document.querySelector('#cartTotal').textContent = `NT$ ${total}`;
  document.querySelector('#dialogTotal').textContent = `NT$ ${total}`;
  cartBar.hidden = count === 0;
  document.querySelector('#cartItems').innerHTML = [...cart.entries()].map(([key, item]) =>
    `<div class="cart-line"><div class="cart-line-main"><strong>${item.name}${item.optionName ? `（${item.optionName}）` : ''}</strong><div class="cart-actions"><div class="quantity-stepper"><button type="button" class="qty-minus" data-cart-key="${encodeURIComponent(key)}" aria-label="減少數量">−</button><input class="cart-qty" data-cart-key="${encodeURIComponent(key)}" type="number" value="${item.qty}" min="1" max="99" inputmode="numeric" aria-label="輸入數量"><button type="button" class="qty-plus" data-cart-key="${encodeURIComponent(key)}" aria-label="增加數量">＋</button></div><button type="button" class="cart-remove" data-cart-key="${encodeURIComponent(key)}">刪除</button></div></div><strong>NT$ ${item.price * item.qty}</strong></div>`
  ).join('');
}

function setCartQty(key, quantity) {
  const item = cart.get(key);
  if (!item) return;
  item.qty = clampQty(quantity);
  cart.set(key, item);
  updateCart();
}

document.querySelector('#cartItems').addEventListener('change', event => {
  const input = event.target.closest('.cart-qty');
  if (input) setCartQty(decodeURIComponent(input.dataset.cartKey), input.value);
});

document.addEventListener('click', event => {
  const button = event.target.closest('.qty-minus, .qty-plus');
  if (!button) return;
  const stepper = button.closest('.quantity-stepper');
  const input = stepper?.querySelector('input');
  if (!input) return;
  const next = clampQty(Number(input.value) + (button.classList.contains('qty-plus') ? 1 : -1));
  if (button.dataset.cartKey) setCartQty(decodeURIComponent(button.dataset.cartKey), next);
  else input.value = next;
});

document.querySelector('#cartItems').addEventListener('click', event => {
  const button = event.target.closest('.cart-remove');
  if (!button) return;
  cart.delete(decodeURIComponent(button.dataset.cartKey));
  updateCart();
  showToast('已從購物車刪除餐點');
});

function removeUnavailableCartItems() {
  if (!locationSelect?.value) return;
  let removedCount = 0;
  cart.forEach((item, key) => {
    const storeAllowed = availableStoreIds().includes(item.storeId);
    if (!storeAllowed) {
      cart.delete(key);
      removedCount += item.qty;
    }
  });
  if (removedCount) {
    updateCart();
    showToast(`切換地點，已移除 ${removedCount} 份未供應餐點`);
  }
}

document.querySelectorAll('.meal-option').forEach(select => {
  select.addEventListener('change', () => {
    const option = select.selectedOptions[0];
    select.closest('.meal-card').querySelector('.meal-price').textContent = `NT$ ${option.dataset.price}`;
  });
});

document.querySelectorAll('.add-button').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.meal-card');
  const option = card.querySelector('.meal-option')?.selectedOptions[0];
  const optionName = option?.value || '';
  const key = `${button.dataset.id}::${optionName}`;
  const current = cart.get(key) || {mealId: button.dataset.id, name: button.dataset.name, optionName, price: Number(option?.dataset.price || button.dataset.price), qty: 0, storeId: card.dataset.storeId, locations: card.dataset.locations ? card.dataset.locations.split(',') : [], locationsConfigured: card.dataset.locationsConfigured === 'true'};
  const addQty = clampQty(card.querySelector('.meal-add-qty')?.value || 1);
  if (current.qty >= 99) {
    showToast('每個餐點最多99份');
    return;
  }
  const actualAdded = Math.min(addQty, 99 - current.qty);
  current.qty += actualAdded;
  cart.set(key, current);
  updateCart();
  showToast(actualAdded < addQty ? `已加入${actualAdded}份，累計上限99份` : `已加入 ${current.name} × ${actualAdded}`);
}));

document.querySelector('#checkoutButton').addEventListener('click', () => {
  if (!dateSelect.value || !timeSelect.value || !locationSelect.value || !selectedLocation()) {
    showToast('請先選擇可下單的日期、時間與地點');
    return;
  }
  document.querySelector('#itemsJson').value = JSON.stringify([...cart.values()].map(item => ({id: item.mealId, option_name: item.optionName, qty: item.qty})));
  document.querySelector('#orderLocation').value = locationSelect.value;
  document.querySelector('#orderDate').value = dateSelect.value;
  document.querySelector('#orderDateDisplay').value = dateSelect.value;
  document.querySelector('#orderLocationDisplay').value = selectedLocation().name;
  cartDialog.showModal();
});
document.querySelector('#closeDialog').addEventListener('click', () => cartDialog.close());

const invoiceType = document.querySelector('#invoiceType');
const mobileBarcodeField = document.querySelector('#mobileBarcodeField');
const mobileBarcode = document.querySelector('#mobileBarcode');
const mobileBarcodeSuffix = document.querySelector('#mobileBarcodeSuffix');
const businessOption = new Option('開立統編發票／收據', 'business');
invoiceType.add(businessOption);
const taxIdField = document.createElement('label');
taxIdField.id = 'taxIdField';
taxIdField.hidden = true;
taxIdField.innerHTML = '統一編號<input name="tax_id" id="taxId" inputmode="numeric" maxlength="8" pattern="[0-9]{8}" placeholder="請輸入8位數統編"><small>請輸入8位數字</small>';
mobileBarcodeField.before(taxIdField);
const taxId = document.querySelector('#taxId');
function updateInvoiceFields() {
  const useMobile = invoiceType.value === 'mobile';
  const useBusiness = invoiceType.value === 'business';
  mobileBarcodeField.hidden = !useMobile;
  taxIdField.hidden = !useBusiness;
  mobileBarcodeSuffix.required = useMobile;
  taxId.required = useBusiness;
  mobileBarcodeSuffix.pattern = useMobile ? '[0-9A-Z.+-]{7}' : '';
  if (!useMobile) {
    mobileBarcodeSuffix.value = '';
    mobileBarcode.value = '';
  }
  if (!useBusiness) taxId.value = '';
}
invoiceType.addEventListener('change', updateInvoiceFields);
taxId.addEventListener('input', () => {
  taxId.value = taxId.value.replace(/\D/g, '').slice(0, 8);
});
mobileBarcodeSuffix.addEventListener('input', () => {
  const suffix = mobileBarcodeSuffix.value.toUpperCase().replace(/[^0-9A-Z.+-]/g, '').slice(0, 7);
  mobileBarcodeSuffix.value = suffix;
  mobileBarcode.value = suffix ? `/${suffix}` : '';
});
updateInvoiceFields();

const paymentMethod = document.querySelector('#paymentMethod');
const linePayLogo = document.querySelector('#linePayLogo');
function updatePaymentLogo() {
  linePayLogo.hidden = paymentMethod.value !== 'line_pay';
  paymentMethod.closest('.payment-select-wrap').classList.toggle('line-pay-selected', paymentMethod.value === 'line_pay');
}
paymentMethod.addEventListener('change', updatePaymentLogo);
updatePaymentLogo();

document.querySelector('#orderForm').addEventListener('submit', (event) => {
  const location = selectedLocation();
  const pickupTime = document.querySelector('#pickupTimeSelect').value;
  const total = document.querySelector('#dialogTotal').textContent;
  const confirmed = window.confirm(
    `請再次確認訂單資料：\n\n取餐日期：${dateSelect.value}\n取餐地點：${location?.name || ''}\n取餐時間：${pickupTime}\n付款：${document.querySelector('#paymentMethod').selectedOptions[0].textContent}\n發票：${invoiceType.value === 'mobile' ? `手機載具 ${mobileBarcode.value}` : invoiceType.value === 'business' ? `統編發票／收據 ${taxId.value}` : '實體發票'}\n訂單金額：${total}\n\n確認送出訂單嗎？`
  );
  if (!confirmed) {
    event.preventDefault();
    return;
  }
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = document.querySelector('#paymentMethod').value === 'line_pay' ? '前往 LINE Pay…' : '訂單送出中…';
});
