document.addEventListener('DOMContentLoaded', () => {
    let habits = [];
    
    // 1. Load and Migrate Data
    try {
        const stored = localStorage.getItem('habits');
        if (stored) {
            habits = JSON.parse(stored);
            
            // Migrate older array-based history to the new Date-based dictionary system
            habits.forEach(habit => {
                if (Array.isArray(habit.history)) {
                    habit.history = {}; // Clear old format
                }
            });
        }
    } catch (e) {
        console.error("Failed to parse habits", e);
        habits = [];
    }

    const habitInput = document.getElementById('habitName');
    const addHabitBtn = document.getElementById('addHabitBtn');
    const habitsList = document.getElementById('habitsList');

    if (!habitInput || !addHabitBtn || !habitsList) return;

    // --- Helper Functions ---
    
    function saveHabits() {
        localStorage.setItem('habits', JSON.stringify(habits));
    }

    // Returns YYYY-MM-DD for local timezone
    function getLocalDateString(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // --- Core Features ---

    function addHabit() {
        const name = habitInput.value.trim();
        if (name === '') {
            alert("Please enter a habit name.");
            return;
        }

        // Prevent Duplicate Habits
        const exists = habits.some(h => h.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            alert("This habit already exists!");
            return;
        }

        const newHabit = {
            id: Date.now().toString(),
            name: name,
            history: {} // Yearly Tracking format: { 'YYYY-MM-DD': 'Done' | 'Missed' }
        };
        habits.push(newHabit);
        saveHabits();
        habitInput.value = '';
        renderHabits();
    }

    function deleteHabit(id) {
        if (confirm("Are you sure you want to delete this habit?")) {
            habits = habits.filter(h => h.id !== id);
            saveHabits();
            renderHabits();
        }
    }

    function editHabit(id) {
        const habit = habits.find(h => h.id === id);
        if (!habit) return;

        const newName = prompt("Edit Habit Name:", habit.name);
        if (newName && newName.trim() !== '') {
            const trimmedName = newName.trim();
            
            // Prevent duplicate renames
            const exists = habits.some(h => h.id !== id && h.name.toLowerCase() === trimmedName.toLowerCase());
            if (exists) {
                alert("Another habit with this name already exists!");
                return;
            }
            
            habit.name = trimmedName;
            saveHabits();
            renderHabits();
        }
    }

    function markDay(habitId, status) {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            const dateInput = document.getElementById(`date-${habitId}`);
            let targetDate = getLocalDateString(new Date());
            
            if (dateInput && dateInput.value) {
                targetDate = dateInput.value;
            }
            
            habit.history[targetDate] = status;
            saveHabits();
            renderHabits();
        }
    }

    function toggleDay(habitId, dateStr) {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return;
        
        const currentStatus = habit.history[dateStr];
        if (currentStatus === 'Done') {
            habit.history[dateStr] = 'Missed';
        } else if (currentStatus === 'Missed') {
            delete habit.history[dateStr]; // Reset to None
        } else {
            habit.history[dateStr] = 'Done';
        }
        saveHabits();
        renderHabits();
    }

    // --- Stats & Heatmap Calculation ---

    function calculateStats(history) {
        let totalDone = 0;
        let missedCount = 0;
        let streak = 0;
        
        for (let date in history) {
            if (history[date] === 'Done') totalDone++;
            if (history[date] === 'Missed') missedCount++;
        }

        const today = new Date();
        // Calculate streak starting from today going backwards
        for (let i = 0; i < 365; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dStr = getLocalDateString(d);
            
            if (history[dStr] === 'Done') {
                streak++;
            } else if (history[dStr] === 'Missed') {
                break;
            } else if (!history[dStr]) {
                // If there's no data for today, the streak hasn't technically broken yet
                if (i === 0) continue;
                break;
            }
        }
        
        return { streak, totalDone, missedCount };
    }

    function generateHeatmap(history, habitId) {
        let html = '<div class="heatmap-grid">';
        const today = new Date();
        
        // 365 boxes representing the past year (from 364 days ago up to today)
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = getLocalDateString(d);
            const status = history[dateStr];
            
            let colorClass = 'heat-none';
            let tooltip = `${dateStr}: No data (Click to toggle)`;
            
            if (status === 'Done') {
                colorClass = 'heat-done';
                tooltip = `${dateStr}: Done (Click to toggle)`;
            } else if (status === 'Missed') {
                colorClass = 'heat-missed';
                tooltip = `${dateStr}: Missed (Click to toggle)`;
            }
            
            html += `<div class="heat-box ${colorClass}" title="${tooltip}" onclick="window.toggleDay('${habitId}', '${dateStr}')"></div>`;
        }
        
        html += '</div>';
        return html;
    }

    // --- UI Rendering ---

    function renderHabits() {
        habitsList.innerHTML = '';
        
        habits.forEach(habit => {
            const stats = calculateStats(habit.history);
            const today = new Date();
            
            // Extract last 7 days history for the basic row view
            const last7Days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const dStr = getLocalDateString(d);
                last7Days.push(habit.history[dStr] || 'None');
            }

            const habitCard = document.createElement('div');
            habitCard.className = 'habit-card';
            
            habitCard.innerHTML = `
                <div class="habit-header">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-actions-top">
                        <button class="btn-icon" onclick="window.editHabit('${habit.id}')" title="Edit Name">✏️</button>
                        <button class="btn-icon btn-delete-icon" onclick="window.deleteHabit('${habit.id}')" title="Delete Habit">🗑️</button>
                    </div>
                </div>
                
                <div class="habit-mark-section">
                    <input type="date" id="date-${habit.id}" value="${getLocalDateString(today)}" max="${getLocalDateString(today)}" class="date-picker" title="Select Date to Mark">
                    <div class="habit-actions">
                        <button class="btn-done" onclick="window.markDay('${habit.id}', 'Done')">Mark Done</button>
                        <button class="btn-missed" onclick="window.markDay('${habit.id}', 'Missed')">Mark Missed</button>
                    </div>
                </div>
                
                <div class="habit-stats">
                    <div class="stat-item">
                        <div class="stat-value">${stats.streak}</div>
                        <div class="stat-label">Streak</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalDone}</div>
                        <div class="stat-label">Done</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.missedCount}</div>
                        <div class="stat-label">Missed</div>
                    </div>
                </div>
                
                <div class="habit-history">
                    <div class="history-label">Last 7 Days:</div>
                    <div class="history-days">
                        ${last7Days.map(status => {
                            let dotClass = 'day-none';
                            let icon = '-';
                            if(status === 'Done') { dotClass = 'day-done'; icon = '✓'; }
                            if(status === 'Missed') { dotClass = 'day-missed'; icon = '✗'; }
                            return `<div class="day-dot ${dotClass}">${icon}</div>`;
                        }).join('')}
                    </div>
                </div>

                <div class="heatmap-container">
                    <div class="history-label">Yearly Contributions (365 days):</div>
                    ${generateHeatmap(habit.history, habit.id)}
                </div>
            `;
            
            habitsList.appendChild(habitCard);
        });
    }

    // --- Event Listeners ---

    addHabitBtn.addEventListener('click', addHabit);
    
    habitInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            addHabit();
        }
    });

    // Make functions globally available for inline onclick handlers
    window.markDay = markDay;
    window.toggleDay = toggleDay;
    window.deleteHabit = deleteHabit;
    window.editHabit = editHabit;
    
    // Initial Render
    renderHabits();
});
