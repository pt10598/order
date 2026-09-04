const cart = new Map();
const filters = document.querySelectorAll('.filter');
const cards = document.querySelectorAll('.meal-card');
const storeSelect = document.querySelector('#storeSelect');
const cartBar = document.querySelector('#cartBar');
const cartDialog = document.querySelector('#cartDialog');
let activeCategory = '全部';

function applyFilters() {
  let visible = 0;
  cards.forEach(card => {
    const categoryOk = activeCategory === '全部' || card.dataset.category === activeCategory;
    const storeOk = storeSelect.value === '全部' || card.dataset.storeId === storeSelect.value;
    const scheduleStoreOk = availableStoreIds().includes(card.dataset.storeId);
    const configured = card.dataset.locationsConfigured === 'true';
    const locations = card.dataset.locations ? card.dataset.locations.split(',') : [];
    const locationOk = !configured || locations.includes(locationSelect.value);
    card.hidden = !(categoryOk && storeOk && scheduleStoreOk && locationOk);
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
storeSelect.addEventListener('change', applyFilters);

const schedules = window.ORDER_SCHEDULES || [];
const stores = window.ORDER_STORES || [];
const dateSelect = document.querySelector('#dateSelect');
const locationSelect = document.querySelector('#locationSelect');

function selectedSchedule() {
  return schedules.find(item => item.date === dateSelect.value && item.location_id === locationSelect.value);
}

function updatePickupSlots() {
  const schedule = selectedSchedule();
  const slots = schedule?.pickup_slots || [];
  document.querySelector('#pickupTime').textContent = slots.length ? `可選時間 ${slots.join('、')}` : '目前沒有可選時段';
  const slotSelect = document.querySelector('#pickupTimeSelect');
  slotSelect.replaceChildren(...slots.map(slot => new Option(slot, slot)));
  updateStores();
  removeUnavailableCartItems();
  applyFilters();
}

function availableStoreIds() {
  const schedule = selectedSchedule();
  if (!schedule) return [];
  return schedule.stores_configured ? (schedule.store_ids || []) : stores.filter(store => store.active !== false).map(store => store.id);
}

function updateStores() {
  const previous = storeSelect.value;
  const allowed = new Set(availableStoreIds());
  const available = stores.filter(store => store.active !== false && allowed.has(store.id));
  storeSelect.replaceChildren(new Option('全部店家', '全部'), ...available.map(store => new Option(store.name, store.id)));
  if ([...storeSelect.options].some(option => option.value === previous)) storeSelect.value = previous;
}

function updateLocations() {
  const available = schedules.filter(item => item.date === dateSelect.value && item.active !== false);
  locationSelect.replaceChildren(...available.map(item => new Option(item.location_name, item.location_id)));
  updatePickupSlots();
}

dateSelect.addEventListener('change', updateLocations);
locationSelect.addEventListener('change', updatePickupSlots);
updateLocations();

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
  document.querySelector('#cartItems').innerHTML = items.map(item =>
    `<div class="cart-line"><div><strong>${item.name}${item.optionName ? `（${item.optionName}）` : ''}</strong><br><span>數量 ${item.qty}</span></div><strong>NT$ ${item.price * item.qty}</strong></div>`
  ).join('');
}

function removeUnavailableCartItems() {
  if (!locationSelect?.value) return;
  let removed = false;
  cart.forEach((item, key) => {
    const storeAllowed = availableStoreIds().includes(item.storeId);
    if ((item.locationsConfigured && !item.locations.includes(locationSelect.value)) || !storeAllowed) {
      cart.delete(key);
      removed = true;
    }
  });
  if (removed) {
    updateCart();
    showToast('已移除此地點未供應的餐點');
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
  current.qty++;
  cart.set(key, current);
  updateCart();
  showToast(`已加入 ${current.name}`);
}));

document.querySelector('#checkoutButton').addEventListener('click', () => {
  if (!dateSelect.value || !locationSelect.value || !selectedSchedule()) {
    showToast('目前沒有可下單的日期與地點');
    return;
  }
  document.querySelector('#itemsJson').value = JSON.stringify([...cart.values()].map(item => ({id: item.mealId, option_name: item.optionName, qty: item.qty})));
  document.querySelector('#orderLocation').value = locationSelect.value;
  document.querySelector('#orderDate').value = dateSelect.value;
  document.querySelector('#orderDateDisplay').value = dateSelect.value;
  document.querySelector('#orderLocationDisplay').value = selectedSchedule().location_name;
  cartDialog.showModal();
});
document.querySelector('#closeDialog').addEventListener('click', () => cartDialog.close());

const invoiceType = document.querySelector('#invoiceType');
const mobileBarcodeField = document.querySelector('#mobileBarcodeField');
const mobileBarcode = document.querySelector('#mobileBarcode');
const mobileBarcodeSuffix = document.querySelector('#mobileBarcodeSuffix');
function updateInvoiceFields() {
  const useMobile = invoiceType.value === 'mobile';
  mobileBarcodeField.hidden = !useMobile;
  mobileBarcodeSuffix.required = useMobile;
  mobileBarcodeSuffix.pattern = useMobile ? '[0-9A-Z.+-]{7}' : '';
  if (!useMobile) {
    mobileBarcodeSuffix.value = '';
    mobileBarcode.value = '';
  }
}
invoiceType.addEventListener('change', updateInvoiceFields);
mobileBarcodeSuffix.addEventListener('input', () => {
  const suffix = mobileBarcodeSuffix.value.toUpperCase().replace(/[^0-9A-Z.+-]/g, '').slice(0, 7);
  mobileBarcodeSuffix.value = suffix;
  mobileBarcode.value = suffix ? `/${suffix}` : '';
});
updateInvoiceFields();

document.querySelector('#orderForm').addEventListener('submit', (event) => {
  const schedule = selectedSchedule();
  const pickupTime = document.querySelector('#pickupTimeSelect').value;
  const total = document.querySelector('#dialogTotal').textContent;
  const confirmed = window.confirm(
    `請再次確認訂單資料：\n\n取餐日期：${dateSelect.value}\n取餐地點：${schedule?.location_name || ''}\n取餐時間：${pickupTime}\n發票：${invoiceType.value === 'mobile' ? `手機載具 ${mobileBarcode.value}` : '實體發票'}\n訂單金額：${total}\n\n確認送出訂單嗎？`
  );
  if (!confirmed) {
    event.preventDefault();
    return;
  }
  const submitButton = event.currentTarget.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = '訂單送出中…';
});
