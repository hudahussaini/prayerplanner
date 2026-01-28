// Drag and Drop Functionality

let draggedElement = null;
let draggedData = null;
let dropZoneIndicator = null;

// Setup drag and drop listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
});

function setupDragAndDrop() {
    // Add event listeners to both timelines
    const optimalTimeline = document.getElementById('optimal-timeline');
    const dailyTimeline = document.getElementById('daily-timeline');

    [optimalTimeline, dailyTimeline].forEach(timeline => {
        timeline.addEventListener('dragover', handleDragOver);
        timeline.addEventListener('drop', handleDrop);
        timeline.addEventListener('dragleave', handleDragLeave);
    });

    // Create drop zone indicator
    dropZoneIndicator = document.createElement('div');
    dropZoneIndicator.className = 'drop-zone';
    dropZoneIndicator.style.display = 'none';
}

// Add drag listeners to task blocks
document.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('task-block')) {
        handleDragStart(e);
    }
});

document.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('task-block')) {
        handleDragEnd(e);
    }
});

function handleDragStart(e) {
    draggedElement = e.target;
    draggedElement.classList.add('dragging');

    // Store data about the dragged item
    draggedData = {
        id: parseInt(draggedElement.dataset.id),
        type: draggedElement.dataset.type,
        duration: parseInt(draggedElement.style.height)
    };

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedElement) return;

    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const y = e.clientY - rect.top + timeline.parentElement.scrollTop;

    // Snap to 15-minute grid
    const minutes = snapToGrid(y);
    const snappedY = minutes;

    // Show drop zone indicator
    if (!dropZoneIndicator.parentElement) {
        timeline.appendChild(dropZoneIndicator);
    }

    dropZoneIndicator.style.display = 'block';
    dropZoneIndicator.style.top = `${snappedY}px`;
    dropZoneIndicator.style.height = `${draggedData.duration}px`;
}

function handleDragLeave(e) {
    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();

    // Only hide if we're actually leaving the timeline
    if (e.clientX < rect.left || e.clientX >= rect.right ||
        e.clientY < rect.top || e.clientY >= rect.bottom) {
        if (dropZoneIndicator) {
            dropZoneIndicator.style.display = 'none';
        }
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedElement || !draggedData) return;

    const timeline = e.currentTarget;
    const rect = timeline.getBoundingClientRect();
    const y = e.clientY - rect.top + timeline.parentElement.scrollTop;

    // Snap to 15-minute grid
    const minutes = snapToGrid(y);
    const startTime = minutesFromSunsetToTime(minutes);

    // Hide drop zone indicator
    if (dropZoneIndicator) {
        dropZoneIndicator.style.display = 'none';
    }

    try {
        // Determine if we're dropping in optimal or daily timeline
        const isOptimalTimeline = timeline.id === 'optimal-timeline';
        const isDailyTimeline = timeline.id === 'daily-timeline';

        if (draggedData.type === 'task' && isOptimalTimeline) {
            // Moving task within optimal schedule
            await api.updateTask(draggedData.id, { start_time: startTime });
            await loadTasks();
            renderTasks();
        } else if (draggedData.type === 'schedule' && isDailyTimeline) {
            // Moving schedule entry within daily schedule
            await api.updateScheduleEntry(draggedData.id, { start_time: startTime });
            await loadSchedule();
            renderSchedule();
        } else if (draggedData.type === 'task' && isDailyTimeline) {
            // Moving task from optimal to daily schedule (create new entry)
            const task = tasks.find(t => t.id === draggedData.id);
            if (task) {
                await api.createScheduleEntry({
                    task_id: task.id,
                    name: task.name,
                    duration: task.duration,
                    color: task.color,
                    start_time: startTime
                });
                await loadSchedule();
                renderSchedule();
            }
        }
    } catch (error) {
        console.error('Failed to update position:', error);
        alert('Failed to move item. Please try again.');
    }
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
    }

    // Hide drop zone indicator
    if (dropZoneIndicator) {
        dropZoneIndicator.style.display = 'none';
    }

    draggedElement = null;
    draggedData = null;
}

// Helper function to calculate overlap
function checkOverlap(timeline, startMinutes, duration) {
    const blocks = timeline.querySelectorAll('.task-block');
    const endMinutes = startMinutes + duration;

    for (let block of blocks) {
        if (block === draggedElement) continue;

        const blockTop = parseInt(block.style.top);
        const blockHeight = parseInt(block.style.height);
        const blockEnd = blockTop + blockHeight;

        // Check if there's overlap
        if (!(endMinutes <= blockTop || startMinutes >= blockEnd)) {
            return true;
        }
    }

    return false;
}
