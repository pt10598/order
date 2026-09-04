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
    const storeOk = storeSelect.value === '全部' || card.dataset.store === storeSelect.value;
    card.hidden = !(categoryOk && storeOk);
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
    `<div class="cart-line"><div><strong>${item.name}</strong><br><span>數量 ${item.qty}</span></div><strong>NT$ ${item.price * item.qty}</strong></div>`
  ).join('');
}

document.querySelectorAll('.add-button').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.id;
  const current = cart.get(id) || {name: button.dataset.name, price: Number(button.dataset.price), qty: 0};
  current.qty++;
  cart.set(id, current);
  updateCart();
  showToast(`已加入 ${current.name}`);
}));

document.querySelector('#checkoutButton').addEventListener('click', () => {
  if (!dateSelect.value || !locationSelect.value || !selectedSchedule()) {
    showToast('目前沒有可下單的日期與地點');
    return;
  }
  document.querySelector('#itemsJson').value = JSON.stringify([...cart.entries()].map(([id, item]) => ({id, qty: item.qty})));
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
