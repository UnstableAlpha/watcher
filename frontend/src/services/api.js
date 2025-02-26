// Base API configuration and utilities
const API_BASE = '';  // Empty for same-origin requests

export class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = 'APIError';
    }
}

async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        throw new APIError(data.error || 'API Error', response.status, data);
    }
    return data;
}

export const api = {
    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`);
        return handleResponse(response);
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    }
}; 