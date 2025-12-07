const api = '';
let state = {
    token: localStorage.getItem('token'),
    user: null, // { username, role }
    orders: [],
    items: [],
    stats: { active_orders: 0, total_stock: 0 },
    isRegistering: false
};

// --- Auth ---
async function login() {
    const u = document.getElementById('u').value;
    const p = document.getElementById('p').value;
    const endpoint = state.isRegistering ? '/register' : '/login';

    try {
        const res = await fetch(`${api}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify({ username: u, password: p }),
            headers: { 'Content-Type': 'application/json' }
        });

        if (state.isRegistering) {
            if (res.status === 201 || res.ok) {
                notify('Registration successful! Please login.', 'success');
                toggleAuth(); // Switch back to login
            } else {
                const data = await res.json();
                notify(data.detail || 'Registration failed', 'error');
            }
            return;
        }

        const data = await res.json();
        if (res.ok) {
            state.token = data.access_token;
            localStorage.setItem('token', state.token);
            await loadUser();
            initApp();
            notify('Welcome back!', 'success');
        } else {
            notify(data.detail || 'Login failed', 'error');
        }
    } catch (e) { notify(`Connection error: ${e.message}`, 'error'); console.error(e); }
}

function toggleAuth() {
    state.isRegistering = !state.isRegistering;
    document.getElementById('auth-title').textContent = state.isRegistering ? 'Register' : 'Login';
    document.getElementById('btn-auth-action').textContent = state.isRegistering ? 'Register' : 'Login';
    document.getElementById('auth-msg').textContent = state.isRegistering ? 'Already have an account?' : 'New here?';
    document.getElementById('btn-auth-toggle').textContent = state.isRegistering ? 'Login' : 'Register';
}

async function loadUser() {
    const res = await fetch(`${api}/verify`, { headers: { 'Authorization': `Bearer ${state.token}` } });
    if (!res.ok) { logout(); return; }
    const data = await res.json();
    state.user = { username: data.username, role: data.role || 'user' };
    document.getElementById('display-username').textContent = state.user.username;
    if (state.user.role === 'admin') {
        document.getElementById('nav-admin').classList.remove('hidden');
    }
}

function logout() {
    state.token = null;
    localStorage.removeItem('token');

    // Reset Views
    document.getElementById('app-view').classList.add('hidden');
    const authView = document.getElementById('auth-view');
    authView.classList.remove('hidden');
    authView.style.display = 'flex'; // Ensure it's visible and flex layout matches CSS

    // Clear Data
    state.orders = [];
    state.items = [];
    document.getElementById('orders-list').innerHTML = '';

    notify('Logged out', 'success');
}

// --- Data ---
async function fetchData() {
    if (!state.token) return;
    const headers = { 'Authorization': `Bearer ${state.token}` };

    // Fetch Items
    try {
        const iRes = await fetch(`${api}/items`);
        if (iRes.ok) state.items = await iRes.json();
    } catch (e) { }

    // Fetch Orders
    try {
        const oRes = await fetch(`${api}/orders`, { headers });
        if (oRes.ok) state.orders = await oRes.json();
    } catch (e) { }

    updateStats();
}

function updateStats() {
    state.stats.total_stock = state.items.reduce((acc, i) => acc + i.quantity, 0);
    state.stats.active_orders = state.orders.length;

    document.getElementById('stat-orders').textContent = state.stats.active_orders;
    document.getElementById('stat-stock').textContent = state.stats.total_stock;
}

// --- UI ---
function initApp() {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('auth-view').style.display = 'none'; // Force hide
    document.getElementById('app-view').classList.remove('hidden');
    fetchData().then(() => {
        renderWarehouse();
        renderOrders();
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));
    document.getElementById(`btn-${tabId}`).classList.add('active');

    if (tabId === 'warehouse') renderWarehouse();
    if (tabId === 'orders') renderOrders();
}

function renderWarehouse() {
    const tbody = document.querySelector('#warehouse-table tbody');
    tbody.innerHTML = state.items.map(i => `
        <tr>
            <td>#${i.id}</td>
            <td><strong>${i.item_name}</strong></td>
            <td>${i.quantity}</td>
            <td>
                <button style="padding:4px 8px; font-size: 0.8rem;" onclick="addToOrderCalc('${i.item_name}')">+</button>
                <button style="padding:4px 8px; font-size: 0.8rem; background:rgba(255,118,117,0.8); margin-left:5px;" onclick="deleteItem(${i.id})">Del</button>
            </td>
        </tr>
    `).join('');

    const select = document.getElementById('order-item-select');
    select.innerHTML = state.items.map(i => `<option value="${i.item_name}">${i.item_name} (${i.quantity} avl)</option>`).join('');
}

// ...
function renderOrders() {
    const container = document.getElementById('orders-list');
    if (state.orders.length === 0) {
        container.innerHTML = '<p class="text-center">No orders found.</p>';
        return;
    }

    container.innerHTML = state.orders.map(o => `
        <div class="card" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h3>Order #${o.id}</h3>
                <p>Status: <span style="color:var(--primary); font-weight:bold;">${o.status || 'Pending'}</span></p>
                <div style="margin-top:5px; font-weight:600; font-size:0.95rem; color:var(--text); display:inline-block; padding:2px 8px; background:rgba(255,255,255,0.1); border-radius:15px;">Track: ${o.tracking_number || 'N/A'}</div>
                <small style="display:block; margin-top:5px; opacity:0.7;">${new Date(o.created_at || Date.now()).toLocaleDateString()}</small>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="trackOrder('${o.tracking_number}')">Track</button>
                <button onclick="cancelOrder(${o.id})" style="background:rgba(255,118,117,0.8);">Cancel</button>
            </div>
        </div>
    `).join('');
}

// --- Actions ---
let currentOrderItems = {};

function addToOrderCalc(name) {
    switchTab('orders');
    const sel = document.getElementById('order-item-select');
    sel.value = name;
}

function addDraftItem() {
    const name = document.getElementById('order-item-select').value;
    const qty = parseInt(document.getElementById('order-item-qty').value);

    if (!name || qty <= 0) return;

    currentOrderItems[name] = (currentOrderItems[name] || 0) + qty;
    renderDraft();
}

function removeDraftItem(name) {
    delete currentOrderItems[name];
    renderDraft();
}

function clearDraft() {
    currentOrderItems = {};
    renderDraft();
}

function renderDraft() {
    const div = document.getElementById('draft-items');
    if (Object.keys(currentOrderItems).length === 0) {
        div.innerHTML = '<small style="opacity:0.6;">No items selected</small>';
        return;
    }
    div.innerHTML = Object.entries(currentOrderItems).map(([k, v]) =>
        `<span style="background:rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; margin-right: 4px; display:inline-flex; align-items:center; gap:5px;">
            ${k}: ${v} 
            <button onclick="removeDraftItem('${k}')" style="background:none; border:none; color:white; cursor:pointer; font-weight:bold;">&times;</button>
        </span>`
    ).join('');
}

async function submitOrder() {
    if (Object.keys(currentOrderItems).length === 0) {
        notify('Add items first', 'error');
        return;
    }

    try {
        const res = await fetch(`${api}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.token}`
            },
            body: JSON.stringify({ user_id: 1, items: currentOrderItems })
        });
        if (res.ok) {
            const data = await res.json();
            notify(`Order placed! Track #: ${data.tracking_number}`, 'success');
            currentOrderItems = {};
            renderDraft();
            fetchData();
        } else {
            notify('Failed to place order', 'error');
        }
    } catch (e) { notify('Error sending order', 'error'); }
}

async function trackOrder(tn) {
    if (!tn || tn === 'null') {
        notify('No tracking number available', 'error');
        return;
    }
    switchTab('tracking');
    document.getElementById('track-input').value = tn;
    doTrack();
}

async function doTrack() {
    const tn = document.getElementById('track-input').value;
    if (!tn) return;

    // Call orders service tracking endpoint
    const res = await fetch(`${api}/orders/track/${tn}`);
    const el = document.getElementById('tracking-result');

    if (res.ok) {
        const data = await res.json();
        // Render simple status for now, as we moved logic to orders-service
        el.innerHTML = `
            <div class="card" style="border-left: 4px solid var(--primary);">
                <h3>Order Found</h3>
                <p><strong>Tracking #:</strong> ${data.tracking_number}</p>
                <p><strong>Status:</strong> ${data.status.toUpperCase()}</p>
                <p><strong>Created:</strong> ${new Date(data.created_at).toLocaleString()}</p>
                <div style="margin-top:1rem;">
                    <strong>Items:</strong>
                    <div style="background:rgba(0,0,0,0.1); padding:5px 10px; border-radius:5px;">
                        ${Object.keys(data.items).map(k => `<div>${k}</div>`).join('')}
                    </div>
                </div>
                <div style="margin-top:1rem;">
                    <strong>Amounts:</strong>
                    <div style="background:rgba(0,0,0,0.1); padding:5px 10px; border-radius:5px;">
                        ${Object.values(data.items).map(v => `<div>${v}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        el.innerHTML = '<p class="text-center" style="color:salmon;">Tracking number not found.</p>';
    }
}

// --- Creation (Admin) ---
async function createItem() {
    const name = document.getElementById('new-item-name').value;
    const qty = parseInt(document.getElementById('new-item-qty').value);

    const res = await fetch(`${api}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: name, quantity: qty })
    });

    if (res.ok) {
        notify('Item added to warehouse', 'success');
        await fetchData(); // Wait for data
        renderWarehouse(); // Explicitly render
    } else {
        notify('Failed to add item', 'error');
    }
}

async function cancelOrder(id) {
    if (!confirm(`Are you sure you want to cancel Order #${id}?`)) return;

    try {
        const res = await fetch(`${api}/orders/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${state.token}` }
        });

        if (res.ok || res.status === 204) {
            notify(`Order #${id} cancelled`, 'success');
            await fetchData();
        } else {
            notify('Failed to cancel order', 'error');
        }
    } catch (e) { notify('Error cancelling order', 'error'); }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const res = await fetch(`${api}/items/${id}`, {
            method: 'DELETE'
        });
        if (res.ok || res.status === 204) {
            notify('Item deleted', 'success');
            await fetchData();
            renderWarehouse();
        } else {
            notify('Failed to delete item', 'error');
        }
    } catch (e) { notify('Error deleting item', 'error'); }
}

function notify(msg, type) {
    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// Init
if (state.token) {
    // Attempt auto-login
    loadUser();
    initApp();
} else {
    document.getElementById('auth-view').classList.remove('hidden');
}
