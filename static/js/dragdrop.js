// Drag and Drop Functionality

let draggedElement = null;
let draggedData = null;
let dropZoneIndicator = null;
let autoScrollInterval = null;

// Setup drag and drop listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDrop();
});

function setupDragAndDrop() {
    // Add event listeners to both timelines
    const optimalTimeline = document.getElementById('optimal-timeline');
    const dailyTimeline = document.getElementById('daily-timeline');

    [optimalTimeline, dailyTimeline].forEach(timeline => {
        timeline.addEventListener('dragenter', handleDragEnter);
        timeline.addEventListener('dragover', handleDragOver);
        timeline.addEventListener('drop', handleDrop);
        timeline.addEventListener('dragleave', handleDragLeave);
    });

    // Create drop zone indicator
    dropZoneIndicator = document.createElement('div');
    dropZoneIndicator.className = 'drop-zone';
    dropZoneIndicator.style.display = 'none';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (!draggedElement) return;

    const timeline = e.currentTarget;

    // Ensure drop zone is in the correct timeline
    if (!dropZoneIndicator.parentElement || dropZoneIndicator.parentElement !== timeline) {
        if (dropZoneIndicator.parentElement) {
            dropZoneIndicator.remove();
        }
        timeline.appendChild(dropZoneIndicator);
    }
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
    // Use fullDuration from dataset (for wrapped tasks) or fall back to height
    const duration = draggedElement.dataset.fullDuration
        ? parseInt(draggedElement.dataset.fullDuration)
        : parseInt(draggedElement.style.height);

    draggedData = {
        id: parseInt(draggedElement.dataset.id),
        type: draggedElement.dataset.type,
        duration: duration
    };

    // If this is a wrapped task, add dragging class to sibling blocks too
    const timeline = draggedElement.closest('.timeline');
    if (timeline) {
        const siblingBlocks = timeline.querySelectorAll(
            `.task-block[data-id="${draggedData.id}"][data-type="${draggedData.type}"]`
        );
        siblingBlocks.forEach(block => block.classList.add('dragging'));
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedElement.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!draggedElement) return;

    const timeline = e.currentTarget;
    const container = timeline.parentElement;
    const rect = timeline.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Calculate position relative to timeline, accounting for scroll
    const y = e.clientY - containerRect.top + container.scrollTop;

    // Auto-scroll when near edges
    const scrollZone = 50; // pixels from edge to trigger scroll
    const scrollSpeed = 10;

    clearInterval(autoScrollInterval);

    if (e.clientY < containerRect.top + scrollZone && container.scrollTop > 0) {
        // Scroll up
        autoScrollInterval = setInterval(() => {
            container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);
        }, 20);
    } else if (e.clientY > containerRect.bottom - scrollZone &&
               container.scrollTop < container.scrollHeight - container.clientHeight) {
        // Scroll down
        autoScrollInterval = setInterval(() => {
            const maxScroll = container.scrollHeight - container.clientHeight;
            container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollSpeed);
        }, 20);
    }

    // Snap to 5-minute grid
    const minutes = snapToGrid(y);
    const snappedY = minutes;

    // Show drop zone indicator
    if (!dropZoneIndicator.parentElement || dropZoneIndicator.parentElement !== timeline) {
        if (dropZoneIndicator.parentElement) {
            dropZoneIndicator.remove();
        }
        timeline.appendChild(dropZoneIndicator);
    }

    dropZoneIndicator.style.display = 'block';
    dropZoneIndicator.style.top = `${snappedY}px`;
    dropZoneIndicator.style.height = `${draggedData.duration}px`;
}

function handleDragLeave(e) {
    // Only hide if we're leaving the timeline container (not just entering a child element)
    const timeline = e.currentTarget;
    const relatedTarget = e.relatedTarget;

    // Check if we're moving to a child element of the timeline
    if (relatedTarget && timeline.contains(relatedTarget)) {
        return; // Don't hide, we're still inside
    }

    // Stop auto-scrolling
    clearInterval(autoScrollInterval);

    // Hide the drop zone when truly leaving the timeline
    if (dropZoneIndicator && dropZoneIndicator.parentElement === timeline) {
        dropZoneIndicator.style.display = 'none';
    }
}

async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedElement || !draggedData) return;

    // Stop auto-scrolling
    clearInterval(autoScrollInterval);

    const timeline = e.currentTarget;
    const container = timeline.parentElement;
    const containerRect = container.getBoundingClientRect();

    // Calculate position relative to timeline, accounting for scroll
    const y = e.clientY - containerRect.top + container.scrollTop;

    // Snap to 5-minute grid
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

        // If this is a wrapped task, remove dragging class from sibling blocks too
        if (draggedData) {
            const timeline = draggedElement.closest('.timeline');
            if (timeline) {
                const siblingBlocks = timeline.querySelectorAll(
                    `.task-block[data-id="${draggedData.id}"][data-type="${draggedData.type}"]`
                );
                siblingBlocks.forEach(block => block.classList.remove('dragging'));
            }
        }
    }

    // Stop auto-scrolling
    clearInterval(autoScrollInterval);

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
