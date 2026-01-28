// Main Schedule App Logic

let tasks = [];
let scheduleEntries = [];

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    try {
        // Initialize location and sunset time first
        await initializeLocation();

        // Load tasks and schedule
        await Promise.all([
            loadTasks(),
            loadSchedule()
        ]);

        // Render timelines
        renderTimeline('optimal-timeline');
        renderTimeline('daily-timeline');

        // Render tasks and schedule entries
        renderTasks();
        renderSchedule();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Failed to load data. Please refresh the page.');
    }
}

async function loadTasks() {
    tasks = await api.getTasks();
}

async function loadSchedule() {
    scheduleEntries = await api.getSchedule();
}

function setupEventListeners() {
    // Add task button
    document.getElementById('add-task-btn').addEventListener('click', () => {
        document.getElementById('add-task-form').style.display = 'block';
        document.getElementById('task-name').focus();
    });

    // Save task button
    document.getElementById('save-task-btn').addEventListener('click', handleSaveTask);

    // Cancel task button
    document.getElementById('cancel-task-btn').addEventListener('click', () => {
        document.getElementById('add-task-form').style.display = 'none';
        clearTaskForm();
    });

    // Sync button
    document.getElementById('sync-btn').addEventListener('click', handleSyncSchedule);

    // Enter key to save task
    document.getElementById('task-duration').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSaveTask();
    });
}

async function handleSaveTask() {
    const name = document.getElementById('task-name').value.trim();
    const duration = parseInt(document.getElementById('task-duration').value);

    if (!name || !duration) {
        alert('Please enter both name and duration');
        return;
    }

    if (duration < 15) {
        alert('Duration must be at least 15 minutes');
        return;
    }

    try {
        const newTask = await api.createTask({ name, duration });
        tasks.push(newTask);
        renderTasks();

        document.getElementById('add-task-form').style.display = 'none';
        clearTaskForm();
    } catch (error) {
        console.error('Failed to create task:', error);
        alert('Failed to create task. Please try again.');
    }
}

function clearTaskForm() {
    document.getElementById('task-name').value = '';
    document.getElementById('task-duration').value = '';
}

async function handleSyncSchedule() {
    if (!confirm('This will replace your current schedule. Continue?')) {
        return;
    }

    try {
        scheduleEntries = await api.syncSchedule();
        renderSchedule();
        alert('Schedule synced successfully!');
    } catch (error) {
        console.error('Failed to sync schedule:', error);
        alert('Failed to sync schedule. Please try again.');
    }
}

function renderTimeline(timelineId) {
    const timeline = document.getElementById(timelineId);
    timeline.innerHTML = '';

    // Create hour markers for 24 hours starting from sunset
    for (let offsetHour = 0; offsetHour < 24; offsetHour++) {
        const marker = document.createElement('div');
        marker.className = 'hour-marker';
        marker.style.top = `${offsetHour * 60}px`;
        marker.dataset.offsetHour = offsetHour;

        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = getHourLabel(offsetHour);

        marker.appendChild(label);
        timeline.appendChild(marker);
    }

    // Add prayer time markers
    const prayerTimes = [
        { name: 'Sunrise', time: sunriseTime, emoji: '🌅', class: 'sunrise-marker' },
        { name: 'Dhuhr', time: dhuhrTime, emoji: '☀️', class: 'dhuhr-marker' },
        { name: 'Asr', time: asrTime, emoji: '🌤️', class: 'asr-marker' },
        { name: 'Isha', time: ishaTime, emoji: '🌙', class: 'isha-marker' }
    ];

    prayerTimes.forEach(prayer => {
        const position = timeToMinutesFromSunset(prayer.time);
        const marker = document.createElement('div');
        marker.className = `prayer-marker ${prayer.class}`;
        marker.style.top = `${position}px`;
        marker.innerHTML = `
            <div class="prayer-line"></div>
            <div class="prayer-label">${prayer.emoji} ${prayer.name} ${prayer.time}</div>
        `;
        timeline.appendChild(marker);
    });
}

function renderTasks() {
    const timeline = document.getElementById('optimal-timeline');

    // Remove existing task blocks
    const existingBlocks = timeline.querySelectorAll('.task-block');
    existingBlocks.forEach(block => block.remove());

    // Render each task
    tasks.forEach(task => {
        const block = createTaskBlock(task, 'task');
        timeline.appendChild(block);
    });
}

function renderSchedule() {
    const timeline = document.getElementById('daily-timeline');

    // Remove existing schedule blocks
    const existingBlocks = timeline.querySelectorAll('.task-block');
    existingBlocks.forEach(block => block.remove());

    // Render each schedule entry
    scheduleEntries.forEach(entry => {
        const block = createTaskBlock(entry, 'schedule');
        timeline.appendChild(block);
    });
}

function createTaskBlock(item, type) {
    const block = document.createElement('div');
    block.className = 'task-block';
    block.style.backgroundColor = item.color;
    block.style.height = `${item.duration}px`; // 1 minute = 1 pixel
    block.draggable = true;
    block.dataset.id = item.id;
    block.dataset.type = type;

    // Calculate position based on sunset time
    if (item.start_time) {
        const minutesFromSunset = timeToMinutesFromSunset(item.start_time);
        block.style.top = `${minutesFromSunset}px`;
    } else {
        // If no start time, position at top (sunset time)
        block.style.top = '0px';
    }

    // Create content
    const nameDiv = document.createElement('div');
    nameDiv.className = 'task-name';
    nameDiv.textContent = item.name;

    const timeDiv = document.createElement('div');
    timeDiv.className = 'task-time';
    timeDiv.textContent = `${item.duration} min`;
    if (item.start_time) {
        timeDiv.textContent += ` • ${item.start_time}`;
    }

    // Create action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        handleDeleteItem(item.id, type);
    };

    actionsDiv.appendChild(deleteBtn);

    block.appendChild(nameDiv);
    block.appendChild(timeDiv);
    block.appendChild(actionsDiv);

    return block;
}

async function handleDeleteItem(id, type) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        if (type === 'task') {
            await api.deleteTask(id);
            tasks = tasks.filter(t => t.id !== id);
            renderTasks();
        } else {
            await api.deleteScheduleEntry(id);
            scheduleEntries = scheduleEntries.filter(e => e.id !== id);
            renderSchedule();
        }
    } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item. Please try again.');
    }
}

function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function snapToGrid(minutes, gridSize = 15) {
    return Math.round(minutes / gridSize) * gridSize;
}
