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

document.querySelector('#locationSelect').addEventListener('change', event => {
  const option = event.target.selectedOptions[0];
  document.querySelector('#pickupTime').textContent = `今日取餐 ${option.dataset.time}`;
});

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

document.querySelector('#checkoutButton').addEventListener('click', () => cartDialog.showModal());
document.querySelector('#closeDialog').addEventListener('click', () => cartDialog.close());
document.querySelector('#demoCheckout').addEventListener('click', () => {
  cartDialog.close();
  showToast('目前為版型預覽，尚未送出訂單');
});
