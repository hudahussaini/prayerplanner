// API Client for Schedule App

// Automatically detect the API base URL based on environment
const API_BASE = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : '/api';

const api = {
    // Task endpoints
    async getTasks() {
        const response = await fetch(`${API_BASE}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        return response.json();
    },

    async createTask(taskData) {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Failed to create task');
        return response.json();
    },

    async updateTask(taskId, taskData) {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Failed to update task');
        return response.json();
    },

    async deleteTask(taskId) {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete task');
        return response.json();
    },

    // Schedule endpoints
    async getSchedule() {
        const response = await fetch(`${API_BASE}/schedule`);
        if (!response.ok) throw new Error('Failed to fetch schedule');
        return response.json();
    },

    async createScheduleEntry(entryData) {
        const response = await fetch(`${API_BASE}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
        });
        if (!response.ok) throw new Error('Failed to create schedule entry');
        return response.json();
    },

    async updateScheduleEntry(entryId, entryData) {
        const response = await fetch(`${API_BASE}/schedule/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entryData)
        });
        if (!response.ok) throw new Error('Failed to update schedule entry');
        return response.json();
    },

    async deleteScheduleEntry(entryId) {
        const response = await fetch(`${API_BASE}/schedule/${entryId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete schedule entry');
        return response.json();
    },

    async syncSchedule() {
        const response = await fetch(`${API_BASE}/schedule/sync`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to sync schedule');
        return response.json();
    }
};
