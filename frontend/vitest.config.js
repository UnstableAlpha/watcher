import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.js'],
        globals: true,
        coverage: {
            reporter: ['text', 'json', 'html'],
        },
        include: ['src/**/*.{test,spec}.{js,jsx}'],
        transformMode: {
            web: [/\.[jt]sx$/],
        },
    },
}); 