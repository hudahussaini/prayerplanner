// Main Schedule App Logic

let tasks = [];
let scheduleEntries = [];

// Color palette for tasks (matching backend)
const COLOR_PALETTE = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#74B9FF', '#A29BFE', '#FD79A8',
    '#FDCB6E', '#6C5CE7', '#00B894'
];

// Special free time color - doesn't count towards duration tracking
const FREE_TIME_COLOR = '#2C3E50';

let selectedColor = COLOR_PALETTE[1]; // Default to teal

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
    // Initialize color palette
    initializeColorPalette();

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

    // Color input change
    document.getElementById('task-color').addEventListener('input', (e) => {
        selectedColor = e.target.value;
        // Deselect all palette options
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    });
}

function initializeColorPalette() {
    const paletteContainer = document.getElementById('color-palette');
    const colorInput = document.getElementById('task-color');

    // Add regular colors
    COLOR_PALETTE.forEach((color, index) => {
        const option = document.createElement('div');
        option.className = 'color-option';
        option.style.backgroundColor = color;
        if (index === 1) {
            option.classList.add('selected'); // Select default color
        }

        option.addEventListener('click', () => {
            selectedColor = color;
            colorInput.value = color;

            // Update selected state
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
        });

        paletteContainer.appendChild(option);
    });

    // Add free time color with special styling
    const freeTimeOption = document.createElement('div');
    freeTimeOption.className = 'color-option free-time-option';
    freeTimeOption.style.backgroundColor = FREE_TIME_COLOR;
    freeTimeOption.title = 'Free Time (flexible duration)';

    const freeLabel = document.createElement('span');
    freeLabel.className = 'free-time-label';
    freeLabel.textContent = 'Free';
    freeTimeOption.appendChild(freeLabel);

    freeTimeOption.addEventListener('click', () => {
        selectedColor = FREE_TIME_COLOR;
        colorInput.value = FREE_TIME_COLOR;

        // Update selected state
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        freeTimeOption.classList.add('selected');
    });

    paletteContainer.appendChild(freeTimeOption);
}

async function handleSaveTask() {
    const name = document.getElementById('task-name').value.trim();
    const duration = parseInt(document.getElementById('task-duration').value);

    if (!name || !duration) {
        alert('Please enter both name and duration');
        return;
    }

    if (duration < 10) {
        alert('Duration must be at least 10 minutes');
        return;
    }

    try {
        const newTask = await api.createTask({ name, duration, color: selectedColor });
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

    // Reset color to default
    selectedColor = COLOR_PALETTE[1];
    document.getElementById('task-color').value = selectedColor;

    // Update selected state in palette
    document.querySelectorAll('.color-option').forEach((opt, index) => {
        if (index === 1) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
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
        const blocks = createTaskBlock(task, 'task');
        blocks.forEach(block => timeline.appendChild(block));
    });
}

function renderSchedule() {
    const timeline = document.getElementById('daily-timeline');

    // Remove existing schedule blocks
    const existingBlocks = timeline.querySelectorAll('.task-block');
    existingBlocks.forEach(block => block.remove());

    // Render each schedule entry
    scheduleEntries.forEach(entry => {
        const blocks = createTaskBlock(entry, 'schedule');
        blocks.forEach(block => timeline.appendChild(block));
    });
}

function createTaskBlock(item, type) {
    const blocks = [];
    const maxMinutes = 1440; // 24 hours in minutes

    // Calculate position based on sunset time
    let startMinutes;
    if (item.start_time) {
        startMinutes = timeToMinutesFromSunset(item.start_time);
    } else {
        startMinutes = 0; // Start at sunset
    }

    const endMinutes = startMinutes + item.duration;

    // Check if task wraps around (extends beyond 24 hours)
    if (endMinutes > maxMinutes) {
        // Create first block (from start to end of day)
        const firstBlockDuration = maxMinutes - startMinutes;
        const firstBlock = createSingleBlock(item, type, startMinutes, firstBlockDuration, false);
        blocks.push(firstBlock);

        // Create second block (from start of day to end of task)
        const secondBlockDuration = endMinutes - maxMinutes;
        const secondBlock = createSingleBlock(item, type, 0, secondBlockDuration, true);
        blocks.push(secondBlock);
    } else {
        // Normal case - no wrapping
        const block = createSingleBlock(item, type, startMinutes, item.duration, false);
        blocks.push(block);
    }

    return blocks;
}

function createSingleBlock(item, type, topPosition, height, isWrapped) {
    const block = document.createElement('div');
    block.className = 'task-block';
    if (isWrapped) {
        block.classList.add('wrapped-task');
    }
    // Add completed class if it's a schedule entry and completed
    if (type === 'schedule' && item.completed) {
        block.classList.add('completed');
    }
    // Add small class for blocks under 60px
    if (height < 60) {
        block.classList.add('task-small');
    }
    block.style.backgroundColor = item.color;
    block.style.height = `${height}px`;
    block.style.top = `${topPosition}px`;
    block.draggable = true;
    block.dataset.id = item.id;
    block.dataset.type = type;
    block.dataset.fullDuration = item.duration; // Store original duration for drag/drop

    // Add checkbox for schedule entries (only on non-wrapped blocks)
    if (type === 'schedule' && !isWrapped) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = item.completed || false;
        checkbox.onclick = (e) => {
            e.stopPropagation();
            handleToggleComplete(item.id, !item.completed);
        };
        block.appendChild(checkbox);
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
    if (isWrapped) {
        timeDiv.textContent += ' (continued)';
    }

    // Add tracking info for optimal tasks (not on wrapped blocks)
    if (type === 'task' && !isWrapped) {
        const tracking = calculateColorTracking(item.color, item.duration);

        // Create tracking container
        const trackingContainer = document.createElement('div');
        trackingContainer.className = 'task-tracking';

        if (tracking.isFreeTime) {
            // Special display for free time
            trackingContainer.classList.add('free-time-tracking');
            const freeLabel = document.createElement('span');
            freeLabel.className = 'free-time-badge';
            freeLabel.textContent = '⚡ Flexible';
            freeLabel.title = 'Free time - duration is flexible';
            trackingContainer.appendChild(freeLabel);
        } else {
            // Regular tracking display
            // Add status indicator dot
            const statusDot = document.createElement('span');
            statusDot.className = `status-dot ${tracking.status}`;
            statusDot.title = tracking.statusText;
            trackingContainer.appendChild(statusDot);

            // Add tracking info text
            const trackingInfo = document.createElement('div');
            trackingInfo.className = 'tracking-info';

            // Use compact format for small blocks
            if (height < 60) {
                trackingInfo.innerHTML = `
                    <div class="tracking-row">
                        <span class="tracking-value">S:${tracking.scheduled}</span>
                    </div>
                    <div class="tracking-row">
                        <span class="tracking-value">C:${tracking.completed}</span>
                    </div>
                `;
            } else {
                trackingInfo.innerHTML = `
                    <div class="tracking-row">
                        <span class="tracking-label">Scheduled:</span>
                        <span class="tracking-value">${tracking.scheduled}m</span>
                    </div>
                    <div class="tracking-row">
                        <span class="tracking-label">Completed:</span>
                        <span class="tracking-value">${tracking.completed}m</span>
                    </div>
                `;
            }
            trackingContainer.appendChild(trackingInfo);

            // Add progress bar (only for larger blocks)
            if (height >= 60) {
                const progressBar = document.createElement('div');
                progressBar.className = 'task-progress-container';
                const progressFill = document.createElement('div');
                progressFill.className = 'task-progress-fill';
                progressFill.style.width = `${tracking.completionPercent}%`;
                progressBar.appendChild(progressFill);
                trackingContainer.appendChild(progressBar);
            }
        }

        block.appendChild(trackingContainer);
    }

    // Create action buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    // Color picker button (not shown on wrapped continuation blocks)
    if (!isWrapped) {
        const colorBtn = document.createElement('button');
        colorBtn.className = 'action-btn color-btn';
        colorBtn.innerHTML = '🎨';
        colorBtn.title = 'Change color';
        colorBtn.onclick = (e) => {
            e.stopPropagation();
            showColorPicker(item, type, block);
        };
        actionsDiv.appendChild(colorBtn);
    }

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

function showColorPicker(item, type, blockElement) {
    // Remove any existing color picker
    const existingPicker = document.querySelector('.color-picker-popup');
    if (existingPicker) {
        existingPicker.remove();
    }

    // Create color picker popup
    const picker = document.createElement('div');
    picker.className = 'color-picker-popup';

    const title = document.createElement('div');
    title.className = 'color-picker-title';
    title.textContent = 'Choose a color';

    const colorsGrid = document.createElement('div');
    colorsGrid.className = 'color-picker-grid';

    // Add regular colors
    COLOR_PALETTE.forEach(color => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-picker-option';
        colorOption.style.backgroundColor = color;
        if (color === item.color) {
            colorOption.classList.add('selected');
        }

        colorOption.onclick = async () => {
            try {
                if (type === 'task') {
                    await api.updateTask(item.id, { color: color });
                    await loadTasks();
                    renderTasks();
                } else {
                    await api.updateScheduleEntry(item.id, { color: color });
                    await loadSchedule();
                    renderSchedule();
                }
                picker.remove();
            } catch (error) {
                console.error('Failed to update color:', error);
                alert('Failed to update color. Please try again.');
            }
        };

        colorsGrid.appendChild(colorOption);
    });

    // Add free time option
    const freeTimeOption = document.createElement('div');
    freeTimeOption.className = 'color-picker-option';
    freeTimeOption.style.backgroundColor = FREE_TIME_COLOR;
    freeTimeOption.style.border = '2px solid #555';
    freeTimeOption.innerHTML = '<span style="color: white; font-size: 8px; font-weight: 700;">FREE</span>';
    if (FREE_TIME_COLOR === item.color) {
        freeTimeOption.classList.add('selected');
    }

    freeTimeOption.onclick = async () => {
        try {
            if (type === 'task') {
                await api.updateTask(item.id, { color: FREE_TIME_COLOR });
                await loadTasks();
                renderTasks();
            } else {
                await api.updateScheduleEntry(item.id, { color: FREE_TIME_COLOR });
                await loadSchedule();
                renderSchedule();
            }
            picker.remove();
        } catch (error) {
            console.error('Failed to update color:', error);
            alert('Failed to update color. Please try again.');
        }
    };

    colorsGrid.appendChild(freeTimeOption);

    const customInput = document.createElement('input');
    customInput.type = 'color';
    customInput.className = 'color-picker-custom';
    customInput.value = item.color;
    customInput.onchange = async (e) => {
        try {
            if (type === 'task') {
                await api.updateTask(item.id, { color: e.target.value });
                await loadTasks();
                renderTasks();
            } else {
                await api.updateScheduleEntry(item.id, { color: e.target.value });
                await loadSchedule();
                renderSchedule();
            }
            picker.remove();
        } catch (error) {
            console.error('Failed to update color:', error);
            alert('Failed to update color. Please try again.');
        }
    };

    picker.appendChild(title);
    picker.appendChild(colorsGrid);
    picker.appendChild(customInput);

    // Position the picker near the block
    const rect = blockElement.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = `${rect.top}px`;
    picker.style.left = `${rect.right + 10}px`;

    document.body.appendChild(picker);

    // Close picker when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closePickerHandler(e) {
            if (!picker.contains(e.target) && !blockElement.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', closePickerHandler);
            }
        });
    }, 10);
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
            // Update optimal tasks to reflect new completion status
            renderTasks();
        }
    } catch (error) {
        console.error('Failed to delete item:', error);
        alert('Failed to delete item. Please try again.');
    }
}

async function handleToggleComplete(entryId, completed) {
    try {
        await api.updateScheduleEntry(entryId, { completed: completed });
        await loadSchedule();
        renderSchedule();
        // Update optimal tasks to reflect new completion status
        renderTasks();
    } catch (error) {
        console.error('Failed to toggle completion:', error);
        alert('Failed to update completion status. Please try again.');
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

function snapToGrid(minutes, gridSize = 5) {
    return Math.round(minutes / gridSize) * gridSize;
}

// Calculate tracking info for a color
function calculateColorTracking(color, optimalDuration) {
    // Free time is flexible - no tracking needed
    if (color === FREE_TIME_COLOR) {
        return {
            scheduled: 0,
            completed: 0,
            status: 'free',
            statusText: 'Flexible',
            completionPercent: 0,
            isFreeTime: true
        };
    }

    // Sum all scheduled durations for this color in today's schedule
    const scheduled = scheduleEntries
        .filter(entry => entry.color === color)
        .reduce((sum, entry) => sum + entry.duration, 0);

    // Sum all completed durations for this color
    const completed = scheduleEntries
        .filter(entry => entry.color === color && entry.completed)
        .reduce((sum, entry) => sum + entry.duration, 0);

    // Calculate status based on scheduled vs optimal (within 15 min tolerance)
    const diff = Math.abs(scheduled - optimalDuration);
    let status, statusText;

    if (scheduled === 0) {
        status = 'red';
        statusText = 'Not scheduled';
    } else if (diff <= 15) {
        status = 'green';
        statusText = 'On track';
    } else if (diff <= 30) {
        status = 'yellow';
        statusText = `Off by ${diff} min`;
    } else {
        status = 'red';
        statusText = `Off by ${diff} min`;
    }

    // Calculate completion percentage based on scheduled amount
    const completionPercent = scheduled > 0 ? Math.min(100, (completed / scheduled) * 100) : 0;

    return {
        scheduled,
        completed,
        status,
        statusText,
        completionPercent: Math.round(completionPercent),
        isFreeTime: false
    };
}
