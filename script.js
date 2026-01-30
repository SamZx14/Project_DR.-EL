// Global state
let entries = [];
let currentLocation = { latitude: null, longitude: null };
let currentWeather = { description: 'Unknown', temperature: '--' };
let deleteEntryId = null;
let calendarCurrentDate = new Date();
let calendarMode = 'frequency'; // 'frequency' or 'severity'

// OpenWeatherMap API Configuration
// IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual API key from https://openweathermap.org/api
const WEATHER_API_KEY = 'YOUR_API_KEY_HERE';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// Chart instances
let foodChart = null;
let timeChart = null;
let seasonChart = null;
let weeklyChart = null;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

// Initialize application
function initApp() {
    loadTheme();
    loadEntries();
    updateAutoFields();
    getCurrentLocation();
    updateEntryCount();
    
    // Update time every second
    setInterval(updateDateTime, 1000);
}

// Load theme from memory
function loadTheme() {
    const savedTheme = getStoredTheme();
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-btn').querySelector('.theme-icon').textContent = '☀️';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.getElementById('theme-btn').querySelector('.theme-icon').textContent = '🌙';
    }
}

// Get stored theme from memory
function getStoredTheme() {
    return window.appTheme || 'light';
}

// Store theme in memory
function setStoredTheme(theme) {
    window.appTheme = theme;
}

// Toggle theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    setStoredTheme(newTheme);
    
    const themeIcon = document.getElementById('theme-btn').querySelector('.theme-icon');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    
    // Update charts if they exist
    if (document.getElementById('heatmaps-section').classList.contains('active')) {
        generateHeatmaps();
    }
    if (document.getElementById('analysis-section').classList.contains('active')) {
        generateWeeklyTrend();
    }
}

// Load entries from memory
function loadEntries() {
    entries = window.allergyEntries || [];
}

// Save entries to memory
function saveEntriesToStorage() {
    window.allergyEntries = entries;
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].substring(0, 5);
    
    document.getElementById('auto-date').textContent = date;
    document.getElementById('auto-time').textContent = time;
}

// Update auto fields
function updateAutoFields() {
    updateDateTime();
    updateSeason();
}

// Update season display
function updateSeason() {
    const month = new Date().getMonth() + 1;
    let season = '';
    
    if (month === 12 || month === 1 || month === 2) season = 'Winter';
    else if (month >= 3 && month <= 5) season = 'Spring';
    else if (month >= 6 && month <= 8) season = 'Summer';
    else season = 'Fall';
    
    document.getElementById('auto-season').textContent = season;
}

// Get current location
function getCurrentLocation() {
    if (!navigator.geolocation) {
        document.getElementById('auto-location').textContent = 'Geolocation not supported';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        position => {
            currentLocation.latitude = position.coords.latitude.toFixed(4);
            currentLocation.longitude = position.coords.longitude.toFixed(4);
            document.getElementById('auto-location').textContent = 
                `${currentLocation.latitude}, ${currentLocation.longitude}`;
            fetchWeather(currentLocation.latitude, currentLocation.longitude);
        },
        error => {
            let errorMessage = 'Unable to get location';
            if (error.code === 1) errorMessage = 'Location permission denied';
            document.getElementById('auto-location').textContent = errorMessage;
        }
    );
}

// Fetch weather data
function fetchWeather(lat, lon) {
    if (WEATHER_API_KEY === 'YOUR_API_KEY_HERE') {
        document.getElementById('auto-weather').textContent = 'API key required';
        document.getElementById('auto-temperature').textContent = 'N/A';
        return;
    }
    
    const url = `${WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('Weather fetch failed');
            return response.json();
        })
        .then(data => {
            currentWeather.description = data.weather[0].description;
            currentWeather.temperature = Math.round(data.main.temp);
            document.getElementById('auto-weather').textContent = 
                currentWeather.description.charAt(0).toUpperCase() + currentWeather.description.slice(1);
            document.getElementById('auto-temperature').textContent = `${currentWeather.temperature}°C`;
        })
        .catch(error => {
            document.getElementById('auto-weather').textContent = 'Weather unavailable';
            document.getElementById('auto-temperature').textContent = 'N/A';
        });
}

// Update severity display
function updateSeverityDisplay(value) {
    document.getElementById('severity-value').textContent = value;
}

// Save new entry
function saveEntry(event) {
    event.preventDefault();
    
    const food = document.getElementById('food').value.trim();
    const symptoms = document.getElementById('symptoms').value.trim();
    const severity = parseInt(document.getElementById('severity').value);
    const notes = document.getElementById('notes').value.trim();
    const date = document.getElementById('auto-date').textContent;
    const time = document.getElementById('auto-time').textContent;
    const season = document.getElementById('auto-season').textContent;
    
    // Validate inputs
    if (food.length < 2) {
        showError('Food name must be at least 2 characters');
        return;
    }
    
    if (symptoms.length < 3) {
        showError('Symptoms must be at least 3 characters');
        return;
    }
    
    // Create entry object
    const entry = {
        id: Date.now().toString(),
        food,
        symptoms,
        severity,
        notes,
        date,
        time,
        latitude: currentLocation.latitude || 'Unknown',
        longitude: currentLocation.longitude || 'Unknown',
        weather: currentWeather.description || 'Unknown',
        temperature: currentWeather.temperature || 0,
        season
    };
    
    // Add to entries array
    entries.push(entry);
    saveEntriesToStorage();
    
    // Reset form and show success
    document.getElementById('entry-form').reset();
    document.getElementById('severity-value').textContent = '3';
    showSuccess();
    updateEntryCount();
}

// Show success message
function showSuccess() {
    const successMsg = document.getElementById('success-message');
    const errorMsg = document.getElementById('error-message');
    
    errorMsg.classList.add('hidden');
    successMsg.classList.remove('hidden');
    
    setTimeout(() => {
        successMsg.classList.add('hidden');
    }, 3000);
}

// Show error message
function showError(message) {
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');
    
    successMsg.classList.add('hidden');
    errorMsg.textContent = '❌ ' + message;
    errorMsg.classList.remove('hidden');
    
    setTimeout(() => {
        errorMsg.classList.add('hidden');
    }, 3000);
}

// Update entry count
function updateEntryCount() {
    document.getElementById('total-entries').textContent = entries.length;
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');
    document.getElementById(`nav-${sectionName}`).classList.add('active');
    
    // Generate content based on section
    if (sectionName === 'heatmaps') {
        generateHeatmaps();
    } else if (sectionName === 'analysis') {
        generateTopTriggers();
        generateWeeklyTrend();
        displayAllEntries();
    } else if (sectionName === 'about') {
        // About section is static content, no dynamic generation needed
    }
}

// Generate all heatmaps
function generateHeatmaps() {
    generateCalendarHeatmap();
    generateFoodHeatmap();
    generateTimeHeatmap();
    generateLocationHeatmap();
    generateSeasonHeatmap();
}

// Generate food heatmap
function generateFoodHeatmap() {
    const ctx = document.getElementById('food-chart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (foodChart) foodChart.destroy();
    
    if (entries.length === 0) {
        return;
    }
    
    // Count occurrences of each food
    const foodCounts = {};
    entries.forEach(entry => {
        const food = entry.food;
        foodCounts[food] = (foodCounts[food] || 0) + 1;
    });
    
    // Sort by count
    const sortedFoods = Object.entries(foodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sortedFoods.map(item => item[0]);
    const data = sortedFoods.map(item => item[1]);
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#134252';
    const gridColor = isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
    
    foodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Reactions',
                data: data,
                backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'],
                borderColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

// Generate time heatmap
function generateTimeHeatmap() {
    const ctx = document.getElementById('time-chart');
    if (!ctx) return;
    
    if (timeChart) timeChart.destroy();
    
    if (entries.length === 0) {
        return;
    }
    
    // Categorize by time of day
    const timeCounts = {
        'Morning (6AM-12PM)': 0,
        'Afternoon (12PM-6PM)': 0,
        'Evening (6PM-12AM)': 0,
        'Night (12AM-6AM)': 0
    };
    
    entries.forEach(entry => {
        const hour = parseInt(entry.time.split(':')[0]);
        if (hour >= 6 && hour < 12) timeCounts['Morning (6AM-12PM)']++;
        else if (hour >= 12 && hour < 18) timeCounts['Afternoon (12PM-6PM)']++;
        else if (hour >= 18 && hour < 24) timeCounts['Evening (6PM-12AM)']++;
        else timeCounts['Night (12AM-6AM)']++;
    });
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#134252';
    const gridColor = isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
    
    timeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(timeCounts),
            datasets: [{
                label: 'Reactions by Time',
                data: Object.values(timeCounts),
                backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C', '#5D878F'],
                borderColor: ['#FFC185', '#1FB8CD', '#B4413C', '#5D878F'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

// Generate location heatmap
function generateLocationHeatmap() {
    const container = document.getElementById('location-heatmap');
    if (!container) return;
    
    if (entries.length === 0) {
        container.innerHTML = '<p class="no-data">No location data available</p>';
        return;
    }
    
    // Count reactions by location
    const locationCounts = {};
    entries.forEach(entry => {
        const loc = `${entry.latitude}, ${entry.longitude}`;
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    
    // Sort and get top 5
    const topLocations = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    let html = '';
    topLocations.forEach(([location, count]) => {
        html += `
            <div class="location-item">
                <span class="location-name">📍 ${location}</span>
                <span class="location-count">${count} reactions</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Generate season heatmap
function generateSeasonHeatmap() {
    const ctx = document.getElementById('season-chart');
    if (!ctx) return;
    
    if (seasonChart) seasonChart.destroy();
    
    if (entries.length === 0) {
        return;
    }
    
    // Count by season
    const seasonCounts = {
        'Winter': 0,
        'Spring': 0,
        'Summer': 0,
        'Fall': 0
    };
    
    entries.forEach(entry => {
        if (seasonCounts.hasOwnProperty(entry.season)) {
            seasonCounts[entry.season]++;
        }
    });
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#134252';
    const gridColor = isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
    
    seasonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(seasonCounts),
            datasets: [{
                label: 'Reactions by Season',
                data: Object.values(seasonCounts),
                backgroundColor: ['#5D878F', '#50C878', '#FFC107', '#D2BA4C'],
                borderColor: ['#5D878F', '#50C878', '#FFC107', '#D2BA4C'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

// Generate top triggers table
function generateTopTriggers() {
    const tbody = document.getElementById('triggers-tbody');
    if (!tbody) return;
    
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No data available</td></tr>';
        return;
    }
    
    // Calculate trigger statistics
    const triggers = {};
    entries.forEach(entry => {
        if (!triggers[entry.food]) {
            triggers[entry.food] = {
                count: 0,
                totalSeverity: 0,
                lastDate: entry.date
            };
        }
        triggers[entry.food].count++;
        triggers[entry.food].totalSeverity += entry.severity;
        if (entry.date > triggers[entry.food].lastDate) {
            triggers[entry.food].lastDate = entry.date;
        }
    });
    
    // Sort by count, then severity
    const sortedTriggers = Object.entries(triggers)
        .map(([food, data]) => ({
            food,
            count: data.count,
            avgSeverity: (data.totalSeverity / data.count).toFixed(1),
            lastDate: data.lastDate
        }))
        .sort((a, b) => b.count - a.count || b.avgSeverity - a.avgSeverity);
    
    let html = '';
    sortedTriggers.forEach(trigger => {
        html += `
            <tr>
                <td><strong>${trigger.food}</strong></td>
                <td>${trigger.count}</td>
                <td>${trigger.avgSeverity}</td>
                <td>${trigger.lastDate}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Generate weekly trend chart
function generateWeeklyTrend() {
    const ctx = document.getElementById('weekly-chart');
    if (!ctx) return;
    
    if (weeklyChart) weeklyChart.destroy();
    
    if (entries.length === 0) {
        return;
    }
    
    // Group by week
    const weeks = {};
    const now = new Date();
    
    entries.forEach(entry => {
        const entryDate = new Date(entry.date);
        const weeksDiff = Math.floor((now - entryDate) / (7 * 24 * 60 * 60 * 1000));
        const weekLabel = weeksDiff === 0 ? 'This Week' : `${weeksDiff} week${weeksDiff > 1 ? 's' : ''} ago`;
        
        if (!weeks[weekLabel]) {
            weeks[weekLabel] = {
                totalSeverity: 0,
                count: 0,
                weekNumber: weeksDiff
            };
        }
        weeks[weekLabel].totalSeverity += entry.severity;
        weeks[weekLabel].count++;
    });
    
    // Calculate averages and sort by week number
    const weekData = Object.entries(weeks)
        .map(([label, data]) => ({
            label,
            avgSeverity: (data.totalSeverity / data.count).toFixed(2),
            weekNumber: data.weekNumber
        }))
        .sort((a, b) => b.weekNumber - a.weekNumber)
        .slice(0, 8)
        .reverse();
    
    // Determine trend
    if (weekData.length >= 2) {
        const firstWeek = parseFloat(weekData[0].avgSeverity);
        const lastWeek = parseFloat(weekData[weekData.length - 1].avgSeverity);
        const diff = lastWeek - firstWeek;
        
        const trendIndicator = document.getElementById('trend-indicator');
        if (Math.abs(diff) < 0.5) {
            trendIndicator.textContent = '➡️ Trend: Stable (no significant change)';
            trendIndicator.className = 'trend-indicator trend-stable';
        } else if (diff < 0) {
            trendIndicator.textContent = '📉 Trend: Improving (severity decreasing)';
            trendIndicator.className = 'trend-indicator trend-improving';
        } else {
            trendIndicator.textContent = '📈 Trend: Worsening (severity increasing)';
            trendIndicator.className = 'trend-indicator trend-worsening';
        }
    }
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f5f5f5' : '#134252';
    const gridColor = isDark ? 'rgba(119, 124, 124, 0.3)' : 'rgba(94, 82, 64, 0.2)';
    
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weekData.map(w => w.label),
            datasets: [{
                label: 'Average Severity',
                data: weekData.map(w => w.avgSeverity),
                borderColor: '#1FB8CD',
                backgroundColor: 'rgba(31, 184, 205, 0.1)',
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: '#1FB8CD'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        stepSize: 1,
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}

// Display all entries in table
function displayAllEntries() {
    const tbody = document.getElementById('entries-tbody');
    if (!tbody) return;
    
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No entries yet</td></tr>';
        return;
    }
    
    // Sort by date (newest first)
    const sortedEntries = [...entries].sort((a, b) => {
        return new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time);
    });
    
    let html = '';
    sortedEntries.forEach(entry => {
        html += `
            <tr>
                <td>${entry.date}</td>
                <td>${entry.time}</td>
                <td><strong>${entry.food}</strong></td>
                <td>${entry.symptoms}</td>
                <td><span class="severity-badge severity-${entry.severity}">${entry.severity}</span></td>
                <td>${entry.weather}, ${entry.temperature}°C</td>
                <td>${entry.notes || '-'}</td>
                <td>
                    <button class="btn btn--secondary btn--small" onclick="openDeleteModal('${entry.id}')">
                        🗑️ Delete
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Open delete confirmation modal
function openDeleteModal(entryId) {
    deleteEntryId = entryId;
    document.getElementById('delete-modal').classList.remove('hidden');
}

// Close delete modal
function closeDeleteModal() {
    deleteEntryId = null;
    document.getElementById('delete-modal').classList.add('hidden');
}

// Confirm and delete entry
function confirmDelete() {
    if (!deleteEntryId) return;
    
    entries = entries.filter(entry => entry.id !== deleteEntryId);
    saveEntriesToStorage();
    
    // Refresh displays
    displayAllEntries();
    generateTopTriggers();
    generateWeeklyTrend();
    updateEntryCount();
    
    closeDeleteModal();
}

// Calendar Heatmap Functions
function generateCalendarHeatmap() {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();
    
    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendar-month-year').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Adjust for Monday start (0 = Monday, 6 = Sunday)
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Get today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    // Generate calendar grid
    const calendarGrid = document.getElementById('calendar-grid');
    let html = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < adjustedStartDay; i++) {
        html += '<div class="calendar-cell empty"></div>';
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = getReactionCountByDate(dateStr);
        const avgSeverity = getAverageSeverityByDate(dateStr);
        
        let intensity = 0;
        if (calendarMode === 'frequency') {
            if (count === 0) intensity = 0;
            else if (count === 1) intensity = 1;
            else if (count <= 3) intensity = 2;
            else if (count <= 5) intensity = 3;
            else intensity = 4;
        } else {
            // Severity mode
            if (count === 0) intensity = 0;
            else if (avgSeverity < 2) intensity = 1;
            else if (avgSeverity < 3) intensity = 2;
            else if (avgSeverity < 4) intensity = 3;
            else intensity = 4;
        }
        
        const isToday = isCurrentMonth && day === today.getDate();
        const todayClass = isToday ? 'today' : '';
        const hasDataClass = count > 0 ? 'has-data' : '';
        
        html += `<div class="calendar-cell intensity-${intensity} ${todayClass} ${hasDataClass}" 
                     data-date="${dateStr}" 
                     data-count="${count}" 
                     data-severity="${avgSeverity.toFixed(1)}"
                     onmouseenter="showCalendarTooltip(event, '${dateStr}', ${count}, ${avgSeverity.toFixed(1)})"
                     onmouseleave="hideCalendarTooltip()"
                     onclick="filterByDate('${dateStr}', ${count})">
                    ${day}
                </div>`;
    }
    
    calendarGrid.innerHTML = html;
}

function getReactionCountByDate(dateStr) {
    return entries.filter(entry => entry.date === dateStr).length;
}

function getAverageSeverityByDate(dateStr) {
    const dateEntries = entries.filter(entry => entry.date === dateStr);
    if (dateEntries.length === 0) return 0;
    const totalSeverity = dateEntries.reduce((sum, entry) => sum + entry.severity, 0);
    return totalSeverity / dateEntries.length;
}

function changeMonth(direction) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
    generateCalendarHeatmap();
}

function toggleCalendarMode() {
    calendarMode = calendarMode === 'frequency' ? 'severity' : 'frequency';
    document.getElementById('calendar-mode-text').textContent = 
        calendarMode === 'frequency' ? 'Frequency' : 'Severity';
    generateCalendarHeatmap();
}

function showCalendarTooltip(event, dateStr, count, avgSeverity) {
    const tooltip = document.getElementById('calendar-tooltip');
    
    let text = '';
    if (count === 0) {
        text = `${dateStr}: No reactions`;
    } else {
        if (calendarMode === 'frequency') {
            text = `${dateStr}: ${count} reaction${count > 1 ? 's' : ''}`;
        } else {
            text = `${dateStr}: ${count} reaction${count > 1 ? 's' : ''}, Avg Severity: ${avgSeverity}`;
        }
    }
    
    tooltip.textContent = text;
    tooltip.classList.remove('hidden');
    
    // Position tooltip near cursor
    const x = event.clientX;
    const y = event.clientY;
    tooltip.style.left = (x + 10) + 'px';
    tooltip.style.top = (y + 10) + 'px';
}

function hideCalendarTooltip() {
    const tooltip = document.getElementById('calendar-tooltip');
    tooltip.classList.add('hidden');
}

function filterByDate(dateStr, count) {
    if (count === 0) {
        alert(`No entries found for ${dateStr}`);
        return;
    }
    
    // Switch to analysis page and filter entries
    showSection('analysis');
    
    // Scroll to entries table
    setTimeout(() => {
        const entriesTable = document.querySelector('#entries-table');
        if (entriesTable) {
            entriesTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Highlight matching rows
        const tbody = document.getElementById('entries-tbody');
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const dateCell = row.querySelector('td:first-child');
            if (dateCell && dateCell.textContent === dateStr) {
                row.style.backgroundColor = 'var(--color-bg-3)';
                row.style.border = '2px solid var(--color-primary)';
            } else {
                row.style.backgroundColor = '';
                row.style.border = '';
            }
        });
    }, 300);
}

// Initialize sample data for demonstration (optional)
function loadSampleData() {
    if (entries.length === 0) {
        entries = [
            {
                id: '1700000000000',
                food: 'Peanuts',
                symptoms: 'Itching, swelling',
                severity: 4,
                notes: 'Ate at restaurant',
                date: '2024-11-15',
                time: '14:30',
                latitude: '23.8103',
                longitude: '90.4125',
                weather: 'Clear',
                temperature: 28,
                season: 'Fall'
            },
            {
                id: '1700086400000',
                food: 'Shellfish',
                symptoms: 'Hives, difficulty breathing',
                severity: 5,
                notes: 'Emergency situation',
                date: '2024-11-16',
                time: '19:45',
                latitude: '23.8103',
                longitude: '90.4125',
                weather: 'Rainy',
                temperature: 24,
                season: 'Fall'
            }
        ];
        saveEntriesToStorage();
        updateEntryCount();
    }
}