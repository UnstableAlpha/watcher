import { api } from './api';

export const watcherService = {
    async getWatchDirectory() {
        return api.get('/api/watch-directory');
    },

    async setWatchDirectory(directory) {
        return api.post('/api/watch', { directory });
    }
}; 