// Authentication
let isLogin = true;

function toggleAuth() {
    isLogin = !isLogin;
    document.getElementById('authTitle').textContent = isLogin ? 'Login' : 'Register';
    document.querySelector('.auth-toggle').textContent = isLogin ? "Don't have an account? Register" : 'Already have an account? Login';
}

function handleAuth() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (isLogin) {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[username] && users[username].password === password) {
            localStorage.setItem('currentUser', username);
            showHomePage();
            startAlarmCheck();
        } else {
            alert('Invalid credentials');
        }
    } else {
        const users = JSON.parse(localStorage.getItem('users')) || {};
        if (users[username]) {
            alert('Username already exists');
        } else {
            users[username] = { password };
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', username);
            showHomePage();
            startAlarmCheck();
        }
    }
}

function showHomePage() {
    const username = localStorage.getItem('currentUser');
    if (username) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('homeContainer').style.display = 'block';
        document.getElementById('welcomeMessage').textContent = `Welcome, ${username}`;
        loadProfilePhoto();
        loadTheme();
    }
}

// Theme Handling
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    document.getElementById('themeToggle').innerHTML = `<i class="fas fa-${newTheme === 'light' ? 'moon' : 'sun'}"></i>`;
}

function loadTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').innerHTML = `<i class="fas fa-${theme === 'light' ? 'moon' : 'sun'}"></i>`;
}

// Profile Photo
function uploadProfilePhoto() {
    const file = document.getElementById('profilePhotoInput').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            localStorage.setItem('profilePhoto', e.target.result);
            document.getElementById('profilePhoto').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function loadProfilePhoto() {
    const photo = localStorage.getItem('profilePhoto');
    if (photo) {
        document.getElementById('profilePhoto').src = photo;
    }
}

function removeProfilePhoto() {
    localStorage.removeItem('profilePhoto');
    document.getElementById('profilePhoto').src = 'https://via.placeholder.com/40';
}

function logout() {
    localStorage.removeItem('currentUser');
    document.getElementById('homeContainer').style.display = 'none';
    document.getElementById('authContainer').style.display = 'flex';
}

// Alarm Handling
function startAlarmCheck() {
    setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const today = now.toISOString().split('T')[0];

        const alarms = JSON.parse(localStorage.getItem('alarms')) || [];
        const updatedAlarms = alarms.filter(alarm => {
            if (alarm.time === currentTime && (alarm.recurring || alarm.date === today)) {
                triggerAlarm(alarm.type === 'general' ? 'General Alarm' : 'Medicine Alarm');
                return alarm.recurring; // Keep recurring alarms
            }
            return true; // Keep non-triggered alarms
        });
        localStorage.setItem('alarms', JSON.stringify(updatedAlarms));
    }, 60000); // Check every minute
}

function triggerAlarm(type) {
    if (Notification.permission === 'granted') {
        new Notification(type, {
            body: `${type} triggered at ${new Date().toLocaleTimeString()}`,
            icon: 'https://via.placeholder.com/40'
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(type, {
                    body: `${type} triggered at ${new Date().toLocaleTimeString()}`,
                    icon: 'https://via.placeholder.com/40'
                });
            } else {
                playAlarmSound();
                alert(`${type} triggered!`);
            }
        });
    } else {
        playAlarmSound();
        alert(`${type} triggered!`);
    }
}

function playAlarmSound() {
    const audio = document.getElementById('alarmSound');
    audio.play().catch(() => console.log('Audio playback failed'));
}

// Modal Handling
let bpChart, sleepChart, stopwatchTimer, runningTimer;
let stopwatchSeconds = 0, runningSeconds = 0, steps = 0;

function openModal(type) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modal.style.display = 'flex';
    modalBody.innerHTML = '';

    switch (type) {
        case 'bp':
            modalTitle.textContent = 'Blood Pressure';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('bp-current')">Current</button>
                    <button class="tab" onclick="showTab('bp-history')">History</button>
                </div>
                <div id="bp-current">
                    <div class="reading-display">Latest: <span id="bpReading">--/-- mmHg</span></div>
                    <input type="number" id="systolic" placeholder="Systolic (mmHg)">
                    <input type="number" id="diastolic" placeholder="Diastolic (mmHg)">
                    <button onclick="addBPData()">Add Reading</button>
                    <button onclick="simulateBP()">Simulate Reading</button>
                    <canvas id="bpChart"></canvas>
                </div>
                <div id="bp-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Systolic</th><th>Diastolic</th></tr></thead>
                        <tbody id="bpHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateBPReading();
            renderBPChart();
            showTab('bp-current');
            renderHistoryTable('bpData', 'bpHistoryTable', data => `${data.systolic}/${data.diastolic} mmHg`);
            break;
        case 'heart':
            modalTitle.textContent = 'Heart Rate';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('heart-current')">Current</button>
                    <button class="tab" onclick="showTab('heart-history')">History</button>
                </div>
                <div id="heart-current">
                    <div class="reading-display">Latest: <span id="heartReading">-- bpm</span></div>
                    <input type="number" id="heartRate" placeholder="Heart Rate (bpm)">
                    <button onclick="addData('heartRate', 'heartReading', 'bpm')">Add Reading</button>
                    <button onclick="simulateHeartRate()">Simulate Reading</button>
                </div>
                <div id="heart-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Heart Rate</th></tr></thead>
                        <tbody id="heartHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateReading('heartRate', 'heartReading', 'bpm');
            showTab('heart-current');
            renderHistoryTable('heartRateData', 'heartHistoryTable', data => `${data.value} bpm`);
            break;
        case 'calories':
            modalTitle.textContent = 'Calories Burnt';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('calories-current')">Current</button>
                    <button class="tab" onclick="showTab('calories-history')">History</button>
                </div>
                <div id="calories-current">
                    <div class="reading-display">Today: <span id="caloriesReading">-- kcal</span></div>
                    <input type="number" id="calories" placeholder="Calories Burnt (kcal)">
                    <button onclick="addCalories()">Add Reading</button>
                    <button onclick="simulateCalories()">Simulate Reading</button>
                </div>
                <div id="calories-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Calories</th></tr></thead>
                        <tbody id="caloriesHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateCaloriesReading();
            showTab('calories-current');
            renderHistoryTable('caloriesData', 'caloriesHistoryTable', data => `${data.total} kcal`);
            break;
        case 'steps':
            modalTitle.textContent = 'Step Counter';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('steps-current')">Current</button>
                    <button class="tab" onclick="showTab('steps-history')">History</button>
                </div>
                <div id="steps-current">
                    <div class="reading-display">Steps: <span id="stepCount">${steps}</span></div>
                    <input type="number" id="manualSteps" placeholder="Add Manual Steps">
                    <button onclick="addManualSteps()">Add Steps</button>
                    <button onclick="simulateSteps()">Simulate Steps</button>
                </div>
                <div id="steps-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Steps</th></tr></thead>
                        <tbody id="stepsHistoryTable"></tbody>
                    </table>
                </div>
            `;
            startStepCounter();
            showTab('steps-current');
            renderHistoryTable('stepsData', 'stepsHistoryTable', data => `${data.total}`);
            break;
        case 'hydration':
            modalTitle.textContent = 'Hydration';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('hydration-current')">Current</button>
                    <button class="tab" onclick="showTab('hydration-history')">History</button>
                </div>
                <div id="hydration-current">
                    <div class="reading-display">Today: <span id="hydrationReading">-- ml</span></div>
                    <input type="number" id="hydration" placeholder="Water Intake (ml)">
                    <button onclick="addHydration()">Add Reading</button>
                    <button onclick="simulateHydration()">Simulate Glass of Water</button>
                </div>
                <div id="hydration-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Hydration</th></tr></thead>
                        <tbody id="hydrationHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateHydrationReading();
            showTab('hydration-current');
            renderHistoryTable('hydrationData', 'hydrationHistoryTable', data => `${data.total} ml`);
            break;
        case 'sleep':
            modalTitle.textContent = 'Sleep Cycle';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('sleep-current')">Current</button>
                    <button class="tab" onclick="showTab('sleep-history')">History</button>
                </div>
                <div id="sleep-current">
                    <div class="reading-display">Last Night: <span id="sleepReading">-- hrs</span></div>
                    <input type="number" id="sleepHours" placeholder="Sleep Hours">
                    <button onclick="addSleepData()">Add Reading</button>
                    <button onclick="simulateSleep()">Simulate Reading</button>
                    <canvas id="sleepChart"></canvas>
                </div>
                <div id="sleep-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Sleep Hours</th></tr></thead>
                        <tbody id="sleepHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateSleepReading();
            renderSleepChart();
            showTab('sleep-current');
            renderHistoryTable('sleepData', 'sleepHistoryTable', data => `${data.hours} hrs`);
            break;
        case 'alarm':
            modalTitle.textContent = 'Alarm';
            modalBody.innerHTML = `
                <input type="time" id="alarmTime">
                <label><input type="checkbox" id="alarmRecurring"> Recurring Daily</label>
                <button onclick="setAlarm('general')">Set Alarm</button>
                <div class="reading-display">Active Alarms:</div>
                <table class="history-table">
                    <thead><tr><th>Time</th><th>Recurring</th><th>Action</th></tr></thead>
                    <tbody id="alarmList"></tbody>
                </table>
            `;
            renderAlarmList();
            break;
        case 'running':
            modalTitle.textContent = 'Running Timer';
            modalBody.innerHTML = `
                <div class="reading-display">Time: <span id="runningTime">00:00:00</span></div>
                <button onclick="startRunningTimer()">Start</button>
                <button onclick="stopRunningTimer()">Stop</button>
            `;
            break;
        case 'distance':
            modalTitle.textContent = 'Distance Calculator';
            modalBody.innerHTML = `
                <div>
                    <button class="tab active" onclick="showTab('distance-current')">Current</button>
                    <button class="tab" onclick="showTab('distance-history')">History</button>
                </div>
                <div id="distance-current">
                    <div class="reading-display">Distance: <span id="distanceReading">-- km</span></div>
                    <input type="number" id="distance" placeholder="Distance (km)">
                    <button onclick="addDistance()">Add Reading</button>
                    <button onclick="simulateDistance()">Simulate Reading</button>
                </div>
                <div id="distance-history" style="display: none;">
                    <table class="history-table">
                        <thead><tr><th>Date</th><th>Distance</th></tr></thead>
                        <tbody id="distanceHistoryTable"></tbody>
                    </table>
                </div>
            `;
            updateDistanceReading();
            showTab('distance-current');
            renderHistoryTable('distanceData', 'distanceHistoryTable', data => `${data.total} km`);
            break;
        case 'stopwatch':
            modalTitle.textContent = 'Stopwatch';
            modalBody.innerHTML = `
                <div class="reading-display">Time: <span id="stopwatchTime">00:00:00</span></div>
                <button onclick="startStopwatch()">Start</button>
                <button onclick="pauseStopwatch()">Pause</button>
                <button onclick="resetStopwatch()">Reset</button>
            `;
            break;
        case 'medicine':
            modalTitle.textContent = 'Medicine Alarm';
            modalBody.innerHTML = `
                <input type="time" id="medicineTime">
                <label><input type="checkbox" id="medicineRecurring"> Recurring Daily</label>
                <button onclick="setAlarm('medicine')">Set Alarm</button>
                <div class="reading-display">Active Alarms:</div>
                <table class="history-table">
                    <thead><tr><th>Time</th><th>Recurring</th><th>Action</th></tr></thead>
                    <tbody id="medicineList"></tbody>
                </table>
            `;
            renderAlarmList();
            break;
        case 'today':
            modalTitle.textContent = "Today's Activity";
            modalBody.innerHTML = `
                <div class="activity-summary" id="todaySummary"></div>
            `;
            displayTodaySummary();
            break;
        case 'goals':
            modalTitle.textContent = 'Set Daily Goals';
            modalBody.innerHTML = `
                <input type="number" id="stepsGoal" placeholder="Steps Goal (e.g., 10000)">
                <input type="number" id="hydrationGoal" placeholder="Hydration Goal (ml, e.g., 2000)">
                <input type="number" id="caloriesGoal" placeholder="Calories Goal (kcal, e.g., 500)">
                <input type="number" id="sleepGoal" placeholder="Sleep Goal (hrs, e.g., 8)">
                <button onclick="saveGoals()">Save Goals</button>
            `;
            loadGoals();
            break;
        case 'settings':
            modalTitle.textContent = 'Settings';
            modalBody.innerHTML = `
                <input type="file" id="profilePhotoInput" accept="image/*" onchange="uploadProfilePhoto()">
                <button onclick="removeProfilePhoto()">Remove Profile Photo</button>
                <button onclick="logout()">Logout</button>
            `;
            break;
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll(`#${tabId.replace('-current', '-history')}, #${tabId.replace('-history', '-current')}`).forEach(div => div.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    document.querySelector(`button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
    if (bpChart) bpChart.destroy();
    if (sleepChart) sleepChart.destroy();
    stopRunningTimer();
    pauseStopwatch();
}

// Goals Handling
function saveGoals() {
    const stepsGoal = document.getElementById('stepsGoal').value;
    const hydrationGoal = document.getElementById('hydrationGoal').value;
    const caloriesGoal = document.getElementById('caloriesGoal').value;
    const sleepGoal = document.getElementById('sleepGoal').value;

    const goals = {
        steps: stepsGoal ? parseInt(stepsGoal) : 0,
        hydration: hydrationGoal ? parseInt(hydrationGoal) : 0,
        calories: caloriesGoal ? parseInt(caloriesGoal) : 0,
        sleep: sleepGoal ? parseFloat(sleepGoal) : 0,
        date: new Date().toISOString().split('T')[0]
    };
    localStorage.setItem('goals', JSON.stringify(goals));
    alert('Goals saved!');
}

function loadGoals() {
    const goals = JSON.parse(localStorage.getItem('goals')) || {};
    document.getElementById('stepsGoal').value = goals.steps || '';
    document.getElementById('hydrationGoal').value = goals.hydration || '';
    document.getElementById('caloriesGoal').value = goals.calories || '';
    document.getElementById('sleepGoal').value = goals.sleep || '';
}

// Today's Activity Summary
function displayTodaySummary() {
    const today = new Date().toISOString().split('T')[0];
    const summary = document.getElementById('todaySummary');
    
    const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
    const heartRateData = JSON.parse(localStorage.getItem('heartRateData')) || [];
    const caloriesData = JSON.parse(localStorage.getItem('caloriesData')) || { total: 0, date: today };
    const stepsData = JSON.parse(localStorage.getItem('stepsData')) || { total: 0, date: today };
    const hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || { total: 0, date: today };
    const sleepData = JSON.parse(localStorage.getItem('sleepData')) || [];
    const distanceData = JSON.parse(localStorage.getItem('distanceData')) || { total: 0, date: today };
    const goals = JSON.parse(localStorage.getItem('goals')) || {};

    const todayBP = bpData.filter(data => data.date === today);
    const latestBP = todayBP.length > 0 ? `${todayBP[todayBP.length - 1].systolic}/${todayBP[todayBP.length - 1].diastolic} mmHg` : '--/-- mmHg';
    const todayHeartRate = heartRateData.filter(data => data.date === today);
    const latestHeartRate = todayHeartRate.length > 0 ? `${todayHeartRate[todayHeartRate.length - 1].value} bpm` : '-- bpm';
    const todaySleep = sleepData.filter(data => data.date === today);
    const latestSleep = todaySleep.length > 0 ? `${todaySleep[todaySleep.length - 1].hours} hrs` : '-- hrs';
    const alarms = JSON.parse(localStorage.getItem('alarms')) || [];
    const alarmTime = alarms.filter(a => a.type === 'general').map(a => a.time).join(', ') || '--';
    const medicineTime = alarms.filter(a => a.type === 'medicine').map(a => a.time).join(', ') || '--';

    const stepsProgress = goals.steps && stepsData.total ? Math.min((stepsData.total / goals.steps) * 100, 100) : 0;
    const hydrationProgress = goals.hydration && hydrationData.total ? Math.min((hydrationData.total / goals.hydration) * 100, 100) : 0;
    const caloriesProgress = goals.calories && caloriesData.total ? Math.min((caloriesData.total / goals.calories) * 100, 100) : 0;
    const sleepProgress = goals.sleep && todaySleep.length > 0 ? Math.min((todaySleep[todaySleep.length - 1].hours / goals.sleep) * 100, 100) : 0;

    summary.innerHTML = `
        <p><i class="fas fa-heartbeat"></i> Blood Pressure: ${latestBP}</p>
        <p><i class="fas fa-heart"></i> Heart Rate: ${latestHeartRate}</p>
        <p><i class="fas fa-fire"></i> Calories Burnt: ${caloriesData.date === today ? caloriesData.total : '--'} kcal
            ${goals.calories ? `<div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${caloriesProgress}%"></div></div></div>` : ''}</p>
        <p><i class="fas fa-shoe-prints"></i> Steps: ${stepsData.date === today ? stepsData.total : '--'}
            ${goals.steps ? `<div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${stepsProgress}%"></div></div></div>` : ''}</p>
        <p><i class="fas fa-tint"></i> Hydration: ${hydrationData.date === today ? hydrationData.total : '--'} ml
            ${goals.hydration ? `<div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${hydrationProgress}%"></div></div></div>` : ''}</p>
        <p><i class="fas fa-bed"></i> Sleep: ${latestSleep}
            ${goals.sleep ? `<div class="progress-container"><div class="progress-bar"><div class="progress-fill" style="width: ${sleepProgress}%"></div></div></div>` : ''}</p>
        <p><i class="fas fa-route"></i> Distance: ${distanceData.date === today ? distanceData.total : '--'} km</p>
        <p><i class="fas fa-bell"></i> Alarm: ${alarmTime}</p>
        <p><i class="fas fa-prescription-bottle"></i> Medicine Alarm: ${medicineTime}</p>
    `;
}

// Blood Pressure Graph
function renderBPChart() {
    const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
    const labels = bpData.map((_, i) => `Reading ${i + 1}`);
    const systolicData = bpData.map(d => d.systolic);
    const diastolicData = bpData.map(d => d.diastolic);

    const ctx = document.getElementById('bpChart').getContext('2d');
    bpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Systolic',
                    data: systolicData,
                    borderColor: systolicData.map(v => v > 140 ? '#f44336' : '#4caf50'),
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Diastolic',
                    data: diastolicData,
                    borderColor: diastolicData.map(v => v > 90 ? '#f44336' : '#4caf50'),
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, suggestedMax: 200 }
            },
            plugins: {
                legend: { display: true }
            }
        }
    });
}

function addBPData() {
    const systolic = document.getElementById('systolic').value;
    const diastolic = document.getElementById('diastolic').value;
    if (systolic && diastolic) {
        const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
        bpData.push({ 
            systolic: parseInt(systolic), 
            diastolic: parseInt(diastolic),
            date: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem('bpData', JSON.stringify(bpData));
        if (bpChart) bpChart.destroy();
        renderBPChart();
        updateBPReading();
        renderHistoryTable('bpData', 'bpHistoryTable', data => `${data.systolic}/${data.diastolic} mmHg`);
    }
}

function simulateBP() {
    const systolic = Math.floor(Math.random() * (160 - 100) + 100);
    const diastolic = Math.floor(Math.random() * (100 - 60) + 60);
    const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
    bpData.push({ 
        systolic, 
        diastolic,
        date: new Date().toISOString().split('T')[0]
    });
    localStorage.setItem('bpData', JSON.stringify(bpData));
    if (bpChart) bpChart.destroy();
    renderBPChart();
    updateBPReading();
    renderHistoryTable('bpData', 'bpHistoryTable', data => `${data.systolic}/${data.diastolic} mmHg`);
}

function updateBPReading() {
    const bpData = JSON.parse(localStorage.getItem('bpData')) || [];
    const latest = bpData[bpData.length - 1];
    document.getElementById('bpReading').textContent = latest ? `${latest.systolic}/${latest.diastolic} mmHg` : '--/-- mmHg';
}

// Sleep Graph
function renderSleepChart() {
    const sleepData = JSON.parse(localStorage.getItem('sleepData')) || [];
    const labels = sleepData.map(data => data.date);
    const hoursData = sleepData.map(data => data.hours);

    const ctx = document.getElementById('sleepChart').getContext('2d');
    sleepChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Sleep Hours',
                    data: hoursData,
                    borderColor: hoursData.map(v => v < 6 ? '#f44336' : '#4caf50'),
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, suggestedMax: 12 }
            },
            plugins: {
                legend: { display: true }
            }
        }
    });
}

function addSleepData() {
    const hours = document.getElementById('sleepHours').value;
    if (hours) {
        const sleepData = JSON.parse(localStorage.getItem('sleepData')) || [];
        sleepData.push({ 
            hours: parseFloat(hours),
            date: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem('sleepData', JSON.stringify(sleepData));
        if (sleepChart) sleepChart.destroy();
        renderSleepChart();
        updateSleepReading();
        renderHistoryTable('sleepData', 'sleepHistoryTable', data => `${data.hours} hrs`);
    }
}

function simulateSleep() {
    const hours = (Math.random() * (10 - 4) + 4).toFixed(1);
    const sleepData = JSON.parse(localStorage.getItem('sleepData')) || [];
    sleepData.push({ 
        hours: parseFloat(hours),
        date: new Date().toISOString().split('T')[0]
    });
    localStorage.setItem('sleepData', JSON.stringify(sleepData));
    if (sleepChart) sleepChart.destroy();
    renderSleepChart();
    updateSleepReading();
    renderHistoryTable('sleepData', 'sleepHistoryTable', data => `${data.hours} hrs`);
}

function updateSleepReading() {
    const sleepData = JSON.parse(localStorage.getItem('sleepData')) || [];
    const latest = sleepData[sleepData.length - 1];
    document.getElementById('sleepReading').textContent = latest ? `${latest.hours} hrs` : '-- hrs';
}

// Hydration Handling
function addHydration() {
    const value = parseInt(document.getElementById('hydration').value);
    if (value) {
        const today = new Date().toISOString().split('T')[0];
        let hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || { total: 0, date: today };
        
        if (hydrationData.date !== today) {
            hydrationData = { total: 0, date: today };
        }
        
        hydrationData.total += value;
        localStorage.setItem('hydrationData', JSON.stringify(hydrationData));
        localStorage.setItem('hydrationTotal', hydrationData.total);
        localStorage.setItem('hydrationDate', today);
        updateHydrationReading();
        renderHistoryTable('hydrationData', 'hydrationHistoryTable', data => `${data.total} ml`);
    }
}

function simulateHydration() {
    const value = Math.floor(Math.random() * (500 - 200) + 200);
    const today = new Date().toISOString().split('T')[0];
    let hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || { total: 0, date: today };
    
    if (hydrationData.date !== today) {
        hydrationData = { total: 0, date: today };
    }
    
    hydrationData.total += value;
    localStorage.setItem('hydrationData', JSON.stringify(hydrationData));
    localStorage.setItem('hydrationTotal', hydrationData.total);
    localStorage.setItem('hydrationDate', today);
    updateHydrationReading();
    renderHistoryTable('hydrationData', 'hydrationHistoryTable', data => `${data.total} ml`);
}

function updateHydrationReading() {
    const today = new Date().toISOString().split('T')[0];
    const hydrationData = JSON.parse(localStorage.getItem('hydrationData')) || { total: 0, date: today };
    if (hydrationData.date === today) {
        document.getElementById('hydrationReading').textContent = `${hydrationData.total} ml`;
    } else {
        document.getElementById('hydrationReading').textContent = '-- ml';
    }
}

// Calories Handling
function addCalories() {
    const value = parseInt(document.getElementById('calories').value);
    if (value) {
        const today = new Date().toISOString().split('T')[0];
        let caloriesData = JSON.parse(localStorage.getItem('caloriesData')) || { total: 0, date: today };
        
        if (caloriesData.date !== today) {
            caloriesData = { total: 0, date: today };
        }
        
        caloriesData.total += value;
        localStorage.setItem('caloriesData', JSON.stringify(caloriesData));
        updateCaloriesReading();
        renderHistoryTable('caloriesData', 'caloriesHistoryTable', data => `${data.total} kcal`);
    }
}

function simulateCalories() {
    const stepsData = JSON.parse(localStorage.getItem('stepsData')) || { total: 0 };
    const value = Math.floor(stepsData.total * 0.05); // 0.05 kcal per step
    const today = new Date().toISOString().split('T')[0];
    let caloriesData = JSON.parse(localStorage.getItem('caloriesData')) || { total: 0, date: today };
    
    if (caloriesData.date !== today) {
        caloriesData = { total: 0, date: today };
    }
    
    caloriesData.total += value;
    localStorage.setItem('caloriesData', JSON.stringify(caloriesData));
    updateCaloriesReading();
    renderHistoryTable('caloriesData', 'caloriesHistoryTable', data => `${data.total} kcal`);
}

function updateCaloriesReading() {
    const today = new Date().toISOString().split('T')[0];
    const caloriesData = JSON.parse(localStorage.getItem('caloriesData')) || { total: 0, date: today };
    if (caloriesData.date === today) {
        document.getElementById('caloriesReading').textContent = `${caloriesData.total} kcal`;
    } else {
        document.getElementById('caloriesReading').textContent = '-- kcal';
    }
}

// Steps Handling
function startStepCounter() {
    const today = new Date().toISOString().split('T')[0];
    let stepsData = JSON.parse(localStorage.getItem('stepsData')) || { total: 0, date: today };
    
    if (stepsData.date !== today) {
        stepsData = { total: 0, date: today };
        localStorage.setItem('stepsData', JSON.stringify(stepsData));
    }
    
    steps = stepsData.total;
    document.getElementById('stepCount').textContent = steps;
    if (window.DeviceMotionEvent) {
        window.addEventListener('devicemotion', function(event) {
            if (Math.abs(event.acceleration.x) > 1 || Math.abs(event.acceleration.y) > 1 || Math.abs(event.acceleration.z) > 1) {
                steps++;
                stepsData.total = steps;
                localStorage.setItem('stepsData', JSON.stringify(stepsData));
                document.getElementById('stepCount').textContent = steps;
                simulateCalories(); // Update calories based on steps
            }
        });
    } else {
        console.log('Device motion not supported');
    }
}

function addManualSteps() {
    const manualSteps = parseInt(document.getElementById('manualSteps').value);
    if (manualSteps) {
        const today = new Date().toISOString().split('T')[0];
        let stepsData = JSON.parse(localStorage.getItem('stepsData')) || { total: 0, date: today };
        
        if (stepsData.date !== today) {
            stepsData = { total: 0, date: today };
        }
        
        stepsData.total += manualSteps;
        steps = stepsData.total;
        localStorage.setItem('stepsData', JSON.stringify(stepsData));
        document.getElementById('stepCount').textContent = steps;
        simulateCalories(); // Update calories based on steps
        renderHistoryTable('stepsData', 'stepsHistoryTable', data => `${data.total}`);
    }
}

function simulateSteps() {
    const value = Math.floor(Math.random() * (500 - 100) + 100); // Simulate 100-500 steps
    const today = new Date().toISOString().split('T')[0];
    let stepsData = JSON.parse(localStorage.getItem('stepsData')) || { total: 0, date: today };
    
    if (stepsData.date !== today) {
        stepsData = { total: 0, date: today };
    }
    
    stepsData.total += value;
    steps = stepsData.total;
    localStorage.setItem('stepsData', JSON.stringify(stepsData));
    document.getElementById('stepCount').textContent = steps;
    simulateCalories(); // Update calories based on steps
    renderHistoryTable('stepsData', 'stepsHistoryTable', data => `${data.total}`);
}

// Distance Handling
function addDistance() {
    const value = parseFloat(document.getElementById('distance').value);
    if (value) {
        const today = new Date().toISOString().split('T')[0];
        let distanceData = JSON.parse(localStorage.getItem('distanceData')) || { total: 0, date: today };
        
        if (distanceData.date !== today) {
            distanceData = { total: 0, date: today };
        }
        
        distanceData.total += value;
        localStorage.setItem('distanceData', JSON.stringify(distanceData));
        updateDistanceReading();
        renderHistoryTable('distanceData', 'distanceHistoryTable', data => `${data.total} km`);
    }
}

function simulateDistance() {
    const runningSeconds = parseInt(localStorage.getItem('runningSeconds')) || 0;
    const value = ((runningSeconds / 3600) * 5).toFixed(2); // 5 km/h
    const today = new Date().toISOString().split('T')[0];
    let distanceData = JSON.parse(localStorage.getItem('distanceData')) || { total: 0, date: today };
    
    if (distanceData.date !== today) {
        distanceData = { total: 0, date: today };
    }
    
    distanceData.total = parseFloat(distanceData.total) + parseFloat(value);
    localStorage.setItem('distanceData', JSON.stringify(distanceData));
    updateDistanceReading();
    renderHistoryTable('distanceData', 'distanceHistoryTable', data => `${data.total} km`);
}

function updateDistanceReading() {
    const today = new Date().toISOString().split('T')[0];
    const distanceData = JSON.parse(localStorage.getItem('distanceData')) || { total: 0, date: today };
    if (distanceData.date === today) {
        document.getElementById('distanceReading').textContent = `${distanceData.total} km`;
    } else {
        document.getElementById('distanceReading').textContent = '-- km';
    }
}

// Heart Rate Handling
function addData(key, elementId, unit) {
    const value = document.getElementById(key).value;
    if (value) {
        const dataKey = `${key}Data`;
        const data = JSON.parse(localStorage.getItem(dataKey)) || [];
        data.push({
            value: parseFloat(value),
            date: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem(dataKey, JSON.stringify(data));
        document.getElementById(elementId).textContent = `${value} ${unit}`;
        renderHistoryTable(dataKey, `${key}HistoryTable`, data => `${data.value} ${unit}`);
    }
}

function simulateHeartRate() {
    const value = Math.floor(Math.random() * (100 - 60) + 60);
    const heartRateData = JSON.parse(localStorage.getItem('heartRateData')) || [];
    heartRateData.push({
        value,
        date: new Date().toISOString().split('T')[0]
    });
    localStorage.setItem('heartRateData', JSON.stringify(heartRateData));
    updateReading('heartRateData', 'heartReading', 'bpm');
    renderHistoryTable('heartRateData', 'heartHistoryTable', data => `${data.value} bpm`);
}

function updateReading(key, elementId, unit) {
    const data = JSON.parse(localStorage.getItem(key)) || [];
    const latest = data[data.length - 1];
    document.getElementById(elementId).textContent = latest ? `${latest.value} ${unit}` : `-- ${unit}`;
}

// History Table
function renderHistoryTable(key, tableId, format) {
    const data = JSON.parse(localStorage.getItem(key)) || (key.includes('Data') ? [] : { total: 0 });
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    const groupedData = {};
    data.forEach(item => {
        const date = item.date || item.date;
        if (!groupedData[date]) groupedData[date] = [];
        groupedData[date].push(item);
    });

    Object.keys(groupedData).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const items = groupedData[date];
        const value = key.includes('Data') && !key.includes('bpData') && !key.includes('sleepData') ? items[items.length - 1].total || items[items.length - 1].value : format(items[items.length - 1]);
        const row = document.createElement('tr');
        row.innerHTML = `<td>${date}</td><td>${value}</td>`;
        tbody.appendChild(row);
    });
}

// Alarm Management
function setAlarm(type) {
    const time = document.getElementById(type === 'general' ? 'alarmTime' : 'medicineTime').value;
    const recurring = document.getElementById(type === 'general' ? 'alarmRecurring' : 'medicineRecurring').checked;
    if (time) {
        const alarms = JSON.parse(localStorage.getItem('alarms')) || [];
        alarms.push({
            time,
            date: new Date().toISOString().split('T')[0],
            recurring,
            type
        });
        localStorage.setItem('alarms', JSON.stringify(alarms));
        alert(`${type === 'general' ? 'Alarm' : 'Medicine Alarm'} set for ${time}${recurring ? ' (recurring daily)' : ''}`);
        renderAlarmList();
    }
}

function deleteAlarm(index) {
    const alarms = JSON.parse(localStorage.getItem('alarms')) || [];
    alarms.splice(index, 1);
    localStorage.setItem('alarms', JSON.stringify(alarms));
    renderAlarmList();
}

function renderAlarmList() {
    const alarms = JSON.parse(localStorage.getItem('alarms')) || [];
    const alarmList = document.getElementById('alarmList');
    const medicineList = document.getElementById('medicineList');
    
    if (alarmList) {
        alarmList.innerHTML = '';
        alarms.filter(a => a.type === 'general').forEach((alarm, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${alarm.time}</td>
                <td>${alarm.recurring ? 'Yes' : 'No'}</td>
                <td><button onclick="deleteAlarm(${index})">Delete</button></td>
            `;
            alarmList.appendChild(row);
        });
    }
    
    if (medicineList) {
        medicineList.innerHTML = '';
        alarms.filter(a => a.type === 'medicine').forEach((alarm, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${alarm.time}</td>
                <td>${alarm.recurring ? 'Yes' : 'No'}</td>
                <td><button onclick="deleteAlarm(${index})">Delete</button></td>
            `;
            medicineList.appendChild(row);
        });
    }
}

// Running Timer
function startRunningTimer() {
    runningTimer = setInterval(() => {
        runningSeconds++;
        localStorage.setItem('runningSeconds', runningSeconds);
        document.getElementById('runningTime').textContent = formatTime(runningSeconds);
        simulateDistance(); // Update distance based on running time
    }, 1000);
}

function stopRunningTimer() {
    clearInterval(runningTimer);
}

// Stopwatch
function startStopwatch() {
    stopwatchTimer = setInterval(() => {
        stopwatchSeconds++;
        document.getElementById('stopwatchTime').textContent = formatTime(stopwatchSeconds);
    }, 1000);
}

function pauseStopwatch() {
    clearInterval(stopwatchTimer);
}

function resetStopwatch() {
    clearInterval(stopwatchTimer);
    stopwatchSeconds = 0;
    document.getElementById('stopwatchTime').textContent = '00:00:00';
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Initialize
showHomePage();
startAlarmCheck();
