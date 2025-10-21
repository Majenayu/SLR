<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Student Dashboard - MessMate</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .meal-card { animation: slideIn 0.3s ease-out; }
    .rating-update { animation: pulse 0.5s ease-out; }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .shimmer {
      background: linear-gradient(90deg, #1f2937 25%, #374151 50%, #1f2937 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .image-container {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .meal-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    .meal-card:hover .meal-image {
      transform: scale(1.05);
    }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 md:p-8">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex justify-between items-center mb-10">
      <div>
        <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">MessMate</h1>
        <p id="welcome" class="text-sm text-blue-300 mt-2 font-medium"></p>
      </div>
      <div class="flex items-center gap-4">
        <button id="profileBtn" class="text-2xl hover:text-blue-400 transition">👤</button>
        <button id="logout" class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105">Logout</button>
      </div>
    </div>

    <!-- Meals Section -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold mb-6 text-blue-200">Available Meals</h2>
      <div id="meals" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
    </div>

    <!-- Orders Section -->
    <div class="mt-12">
      <h2 class="text-2xl font-bold mb-6 text-blue-200">Your Orders</h2>
      <div id="orders" class="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 shadow-lg"></div>

      <!-- Today's QR Section -->
      <div id="qrSection" class="mt-6 hidden bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 text-center">
        <h3 class="text-xl font-bold mb-4 text-blue-200">Today's QR Code</h3>
        <img id="dashboardQR" class="mx-auto mb-4" alt="QR Code" style="width: 200px; height: 200px;">
        <p class="text-sm text-slate-400">Scan to confirm today's meals</p>
        <div id="qrMealsList" class="mt-4 text-left bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 hidden">
          <h4 class="font-semibold mb-2 text-green-400">Contains:</h4>
          <ul id="qrMealsItems" class="space-y-1 text-sm"></ul>
        </div>
        <button id="refreshQR" class="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-semibold transition">Refresh QR</button>
      </div>
    </div>
  </div>

  <!-- Profile Modal -->
  <div id="profileModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
    <div class="bg-slate-800 rounded-xl p-6 md:p-8 max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl w-full mx-4 md:mx-0">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-2xl font-bold text-white">Profile & Order History</h3>
        <button id="closeProfile" class="text-2xl hover:text-red-400">×</button>
      </div>
      
      <!-- Score Section -->
      <div id="scoreSection" class="bg-yellow-900/50 border border-yellow-700/50 p-4 rounded-lg mb-6">
        <p class="text-sm text-yellow-200">Unpaid Foods Today: <span id="unpaidCount">0</span> | Score: <span id="score" class="font-bold">0</span></p>
      </div>

      <!-- Spending Graph Section -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <h4 class="text-xl font-bold text-blue-200">Spending Overview</h4>
          <select id="periodSelect" class="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500">
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
        <div class="total-spent bg-slate-700/50 p-4 rounded-lg border border-slate-600 mb-4 text-center">
          <p class="text-lg font-bold text-green-400" id="totalSpent">₹0</p>
          <p class="text-sm text-slate-400">Total spent in selected period</p>
        </div>
        <canvas id="spendingChart" height="200"></canvas>
      </div>

      <!-- Food Items Graph Section -->
      <div class="mb-8">
        <h4 class="text-xl font-bold text-blue-200">Food Items Ordered</h4>
        <canvas id="foodChart" height="200"></canvas>
      </div>

      <!-- Order History -->
      <h4 class="text-xl font-bold text-blue-200 mb-4">Previous Orders</h4>
      <div id="profileOrders" class="space-y-3 max-h-96 overflow-y-auto"></div>
    </div>
  </div>

  <!-- QR Modal -->
  <div id="qrModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden">
    <div class="bg-slate-800 rounded-xl p-6 md:p-8 max-w-md w-full mx-4 border border-slate-700 shadow-2xl text-center">
      <h3 class="text-2xl font-bold text-white mb-6">Payment Successful! Scan QR for Today's Meals</h3>
      <img id="qrCanvas" class="mx-auto mb-4" alt="QR Code" style="width: 200px; height: 200px;">
      <div id="modalMealsList" class="mt-4 text-left bg-slate-700/50 p-3 rounded-lg border border-slate-600/50 hidden">
        <h4 class="font-semibold mb-2 text-green-400">Contains:</h4>
        <ul id="modalMealsItems" class="space-y-1 text-sm"></ul>
      </div>
      <button id="closeQR" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-2 rounded-lg font-semibold transition">Close</button>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    // Ensure user is logged in (localStorage)
    const userEmail = localStorage.getItem('messmate_user_email');
    const userRole = localStorage.getItem('messmate_user_role') || 'student';
    const userName = localStorage.getItem('messmate_user_name') || '';

    if (!userEmail) {
      window.location.href = '/';
    }

    document.getElementById('welcome').textContent = `Welcome, ${userName || userEmail} • ${userRole}`;

    document.getElementById('logout').addEventListener('click', () => {
      localStorage.removeItem('messmate_user_email');
      localStorage.removeItem('messmate_user_role');
      localStorage.removeItem('messmate_user_name');
      window.location.href = '/';
    });

    // Global orders data for profile
    let userOrders = [];

    // SSE connection for real-time rating updates
    let eventSource = null;

    function connectSSE() {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/sse-ratings');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const ratingContainer = document.querySelector(`[data-rating="${data.mealName}"]`);
        if (ratingContainer) {
          ratingContainer.classList.add('rating-update');
          const stars = ratingContainer.querySelectorAll('span');
          stars.forEach((star, i) => {
            if (i + 1 <= Math.round(data.avgRating)) {
              star.textContent = '★';
              star.className = 'text-xl text-yellow-400';
            } else {
              star.textContent = '★';
              star.className = 'text-xl text-gray-600';
            }
          });
          // Update total ratings count
          const mealCard = ratingContainer.closest('.meal-card');
          if (mealCard) {
            const ratingText = mealCard.querySelector('.text-xs.text-slate-400');
            if (ratingText) {
              ratingText.textContent = `${data.totalRatings} rating${data.totalRatings !== 1 ? 's' : ''}`;
            }
          }
          setTimeout(() => ratingContainer.classList.remove('rating-update'), 500);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setTimeout(connectSSE, 3000);
      };
    }

    async function loadMeals() {
      try {
        const res = await fetch('/meals');
        const meals = await res.json();
        const container = document.getElementById('meals');
        container.innerHTML = '';

        meals.forEach(m => {
          const card = document.createElement('div');
          card.className = "meal-card bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-700/50 hover:border-blue-500/50 transition duration-300 shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 flex flex-col";
          card.setAttribute('data-meal', m.name);

          const imageUrl = m.image && m.image !== 'Meal1.jpg' ? m.image : `${m.name.replace(/\s+/g, '')}.jpg`;

          card.innerHTML = `
            <div class="image-container h-48 relative">
              <img src="${imageUrl}" alt="${m.name}" class="meal-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23667eea%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%22 font-size=%2224%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EMeal Image%3C/text%3E%3C/svg%3E'"/>
              <div class="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-500 px-3 py-1 rounded-full text-xs font-bold">₹${m.price}</div>
            </div>

            <div class="flex-1 p-5 flex flex-col">
              <h3 class="text-xl font-bold mb-2 text-white">${m.name}</h3>
              <p class="text-sm text-slate-300 mb-4 flex-1">${m.description || 'Delicious meal prepared fresh daily'}</p>
              
              <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex gap-1" data-rating="${m.name}">
                    ${[1,2,3,4,5].map(i => `<span class="text-xl ${i <= Math.round(m.avgRating) ? 'text-yellow-400' : 'text-gray-600'}">★</span>`).join('')}
                  </div>
                  <span class="text-xs text-slate-400">${m.totalRatings} rating${m.totalRatings !== 1 ? 's' : ''}</span>
                </div>
                <button onclick="bookMeal('${m.name}', ${m.price})" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-4 py-2 rounded-lg font-semibold transition transform hover:scale-105">Order Now</button>
              </div>
            </div>
          `;
          container.appendChild(card);
        });
      } catch (err) {
        console.error('Error loading meals:', err);
      }
    }

    async function bookMeal(mealName, price) {
      try {
        const res = await fetch('/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealName, email: userEmail, price })
        });
        const data = await res.json();
        if (data.success) {
          alert(`✅ ${mealName} booked successfully!`);
          loadOrders();
        } else {
          alert(`❌ ${data.error || 'Booking failed'}`);
        }
      } catch (e) {
        alert('❌ Booking failed. Please try again.');
        console.error('Booking error:', e);
      }
    }

    function displayQRMeals(qrData, containerId, itemsId) {
      try {
        const meals = JSON.parse(qrData);
        const container = document.getElementById(containerId);
        const itemsList = document.getElementById(itemsId);
        if (meals.length > 0) {
          itemsList.innerHTML = meals.map(m => `<li>• ${m.name} - ₹${m.price} (${new Date(m.date).toLocaleDateString()})</li>`).join('');
          container.classList.remove('hidden');
        } else {
          container.classList.add('hidden');
        }
      } catch (e) {
        console.error('Error parsing QR data:', e);
        document.getElementById(containerId).classList.add('hidden');
      }
    }

    async function loadOrders() {
      try {
        const res = await fetch(`/user/${userEmail}`);
        const data = await res.json();
        if (data.success) {
          userOrders = data.orders || [];
          const container = document.getElementById('orders');
          const now = new Date();
          const todayStr = now.toDateString();
          const todayUnpaid = userOrders.filter(o => new Date(o.date).toDateString() === todayStr && !o.paid);

          let html = '';
          if (todayUnpaid.length > 0) {
            const totalAmount = todayUnpaid.reduce((sum, o) => sum + o.price, 0);
            html += `
              <div class="mb-6 p-4 bg-blue-900/50 rounded-lg border border-blue-700/50">
                <h4 class="text-lg font-bold mb-2">Pay for Today's Orders</h4>
                <p class="text-sm text-blue-200 mb-4">You have ${todayUnpaid.length} unpaid order${todayUnpaid.length !== 1 ? 's' : ''} today.</p>
                <button id="payAllBtn" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105">Pay ₹${totalAmount} Now</button>
              </div>
            `;
          }

          if (userOrders.length > 0) {
            html += userOrders.map(o => {
              const paidStatus = o.paid ? 'Paid ✓' : 'Unpaid';
              const statusClass = o.paid ? 'text-green-400' : 'text-red-400';
              let cancelBtn = '';
              if (!o.paid) {
                const orderDateStr = new Date(o.date).toDateString();
                if (orderDateStr === todayStr) {
                  cancelBtn = `<button class="ml-2 bg-red-500 hover:bg-red-600 px-3 py-1 rounded text-sm font-semibold transition" onclick="cancelOrder('${o._id}')">Cancel</button>`;
                }
              }
              return `
                <div class="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 mb-3 hover:border-blue-500/50 transition">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="font-semibold text-white text-lg">${o.mealName}</p>
                      <p class="text-sm text-slate-400 mt-1">${new Date(o.date).toLocaleString()} <span class="${statusClass}">${paidStatus}</span></p>
                    </div>
                    <div class="text-right">
                      <p class="text-lg font-bold text-green-400">₹${o.price}</p>
                      ${cancelBtn}
                    </div>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            html += '<div class="text-slate-400 text-center py-8">No orders found.</div>';
          }

          container.innerHTML = html;

          // Add pay button listener if exists
          const payBtn = document.getElementById('payAllBtn');
          if (payBtn) {
            payBtn.addEventListener('click', () => handlePay(userEmail));
          }

          // Handle QR display
          const savedQR = localStorage.getItem(`qr_${todayStr}_${userEmail}`);
          const savedQRData = localStorage.getItem(`qrData_${todayStr}_${userEmail}`);
          const qrSection = document.getElementById('qrSection');
          if (savedQR && savedQRData && todayUnpaid.length === 0) {
            qrSection.classList.remove('hidden');
            document.getElementById('dashboardQR').src = savedQR;
            displayQRMeals(savedQRData, 'qrMealsList', 'qrMealsItems');
            // Refresh button
            document.getElementById('refreshQR').addEventListener('click', () => {
              document.getElementById('dashboardQR').src = savedQR;
            });
          } else {
            qrSection.classList.add('hidden');
          }

          // Update profile modal if it's open
          if (!profileModal.classList.contains('hidden')) {
            updateProfileModal();
          }
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        document.getElementById('orders').innerHTML = '<div class="text-red-400 text-center py-8">Failed to load orders</div>';
      }
    }

    async function handlePay(email) {
      const btn = document.getElementById('payAllBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing...';
      }

      try {
        const res = await fetch('/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.success) {
          // Set QR image src and display meals in modal
          document.getElementById('qrCanvas').src = data.qrBase64;
          displayQRMeals(data.qrData, 'modalMealsList', 'modalMealsItems');

          // Save to localStorage for today
          const today = new Date().toDateString();
          localStorage.setItem(`qr_${today}_${email}`, data.qrBase64);
          localStorage.setItem(`qrData_${today}_${email}`, data.qrData);

          // Show modal
          document.getElementById('qrModal').classList.remove('hidden');

          // Reload orders to update UI and show QR section
          loadOrders();
        } else {
          alert(`❌ ${data.error || 'Payment failed'}`);
        }
      } catch (e) {
        alert('❌ Payment failed. Please try again.');
        console.error('Payment error:', e);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Pay Now';
        }
      }
    }

    async function cancelOrder(orderId) {
      if (!confirm('Are you sure you want to cancel this order?')) return;

      const btn = event.target;
      btn.disabled = true;
      btn.textContent = 'Cancelling...';

      try {
        const res = await fetch('/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, email: userEmail })
        });
        const data = await res.json();

        if (data.success) {
          alert('❌ Order cancelled successfully!');
          loadOrders(); // Reload to update UI and profile
        } else {
          alert(`❌ ${data.error || 'Cancel failed'}`);
        }
      } catch (e) {
        alert('❌ Cancel failed. Please try again.');
        console.error('Cancel error:', e);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Cancel';
      }
    }

    // Profile Modal Functionality
    const profileModal = document.getElementById('profileModal');
    const profileBtn = document.getElementById('profileBtn');
    const closeProfile = document.getElementById('closeProfile');
    const periodSelect = document.getElementById('periodSelect');
    const totalSpentEl = document.getElementById('totalSpent');
    const profileOrdersEl = document.getElementById('profileOrders');
    const scoreSection = document.getElementById('scoreSection');
    const unpaidCountEl = document.getElementById('unpaidCount');
    const scoreEl = document.getElementById('score');
    let spendingChart = null;
    let foodChart = null;

    profileBtn.addEventListener('click', () => {
      updateProfileModal();
      profileModal.classList.remove('hidden');
    });

    closeProfile.addEventListener('click', () => {
      profileModal.classList.add('hidden');
      if (spendingChart) {
        spendingChart.destroy();
        spendingChart = null;
      }
      if (foodChart) {
        foodChart.destroy();
        foodChart = null;
      }
    });

    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        profileModal.classList.add('hidden');
        if (spendingChart) {
          spendingChart.destroy();
          spendingChart = null;
        }
        if (foodChart) {
          foodChart.destroy();
          foodChart = null;
        }
      }
    });

    periodSelect.addEventListener('change', () => {
      updateSpendingChart();
      updateFoodChart();
    });

    function updateProfileModal() {
      // Update score section - always visible, score can be 0
      const now = new Date();
      const todayStr = now.toDateString();
      const todayUnpaid = userOrders.filter(o => new Date(o.date).toDateString() === todayStr && !o.paid);
      const unpaidCount = todayUnpaid.length;
      const score = -unpaidCount;
      scoreSection.classList.remove('hidden'); // Always show
      unpaidCountEl.textContent = unpaidCount;
      scoreEl.textContent = score;
      scoreEl.className = `font-bold ${score < 0 ? 'text-red-400' : 'text-green-400'}`;

      // Update order history in modal (full list, no cancel buttons in modal for simplicity)
      if (userOrders.length > 0) {
        const rows = userOrders.map(o => {
          const paidStatus = o.paid ? 'Paid ✓' : 'Unpaid';
          return `
            <div class="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 hover:border-blue-500/50 transition">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold text-white text-lg">${o.mealName}</p>
                  <p class="text-sm text-slate-400 mt-1">${new Date(o.date).toLocaleString()} <span class="text-${o.paid ? 'green' : 'red'}-400">${paidStatus}</span></p>
                </div>
                <p class="text-lg font-bold text-green-400">₹${o.price}</p>
              </div>
            </div>
          `;
        }).join('');
        profileOrdersEl.innerHTML = rows;
      } else {
        profileOrdersEl.innerHTML = '<div class="text-slate-400 text-center py-8">No previous orders found.</div>';
      }

      // Initialize charts for default period
      updateSpendingChart();
      updateFoodChart();
    }

    function updateSpendingChart() {
      const period = periodSelect.value;
      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const filteredOrders = userOrders.filter(o => new Date(o.date) >= startDate);
      const totalSpent = filteredOrders.reduce((sum, o) => sum + o.price, 0);
      totalSpentEl.textContent = `₹${totalSpent}`;

      // Group orders by appropriate interval for chart
      const groupedData = {};
      filteredOrders.forEach(o => {
        const date = new Date(o.date);
        let key;
        switch (period) {
          case 'day':
            key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            break;
          case 'week':
            key = `Day ${date.getDay() + 1}`;
            break;
          case 'month':
            key = date.getDate();
            break;
          case 'year':
            key = date.toLocaleString('default', { month: 'short' });
            break;
        }
        if (!groupedData[key]) groupedData[key] = 0;
        groupedData[key] += o.price;
      });

      let labels = Object.keys(groupedData);
      // Sort labels chronologically
      let sortedLabels = [...labels];
      switch (period) {
        case 'day':
          sortedLabels.sort((a, b) => new Date(`1970/01/01 ${a}`) - new Date(`1970/01/01 ${b}`));
          break;
        case 'month':
          sortedLabels.sort((a, b) => Number(a) - Number(b));
          break;
        case 'year':
          const monthOrder = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
          sortedLabels.sort((a, b) => monthOrder[a] - monthOrder[b]);
          break;
        // week already sorted by day number
        default:
          sortedLabels.sort();
      }
      const data = sortedLabels.map(l => groupedData[l]);

      const ctx = document.getElementById('spendingChart').getContext('2d');
      if (spendingChart) spendingChart.destroy();
      spendingChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedLabels,
          datasets: [{
            label: 'Amount Spent (₹)',
            data: data,
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: 'white' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            },
            x: {
              ticks: { color: 'white' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            }
          },
          plugins: {
            legend: { labels: { color: 'white' } }
          }
        }
      });
    }

    function updateFoodChart() {
      const period = periodSelect.value;
      const now = new Date();
      let startDate;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const filteredOrders = userOrders.filter(o => new Date(o.date) >= startDate);
      const foodCounts = {};
      filteredOrders.forEach(o => {
        if (!foodCounts[o.mealName]) foodCounts[o.mealName] = 0;
        foodCounts[o.mealName]++;
      });

      const labels = Object.keys(foodCounts).sort();
      const data = labels.map(label => foodCounts[label]);

      const ctx = document.getElementById('foodChart').getContext('2d');
      if (foodChart) foodChart.destroy();
      foodChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Number of Orders',
            data: data,
            borderColor: 'rgba(34, 197, 94, 1)',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            tension: 0.1,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: 'white' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            },
            x: {
              ticks: { color: 'white' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            }
          },
          plugins: {
            legend: { labels: { color: 'white' } }
          }
        }
      });
    }

    // QR Modal Functionality
    document.getElementById('closeQR').addEventListener('click', () => {
      document.getElementById('qrModal').classList.add('hidden');
    });

    document.getElementById('qrModal').addEventListener('click', (e) => {
      if (e.target.id === 'qrModal') {
        document.getElementById('qrModal').classList.add('hidden');
      }
    });

    // Initialize
    loadMeals();
    loadOrders();
    connectSSE();

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (eventSource) eventSource.close();
    });
  </script>
</body>
</html>
