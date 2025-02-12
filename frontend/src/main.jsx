import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Immediately executing function to handle initialization
(function initializeApp() {
    try {
        // Log that we're starting
        console.log('Application initialization starting');

        // Check if we can find our root element
        const rootElement = document.getElementById('root');
        if (!rootElement) {
            throw new Error('Could not find root element in DOM');
        }

        // Try to create our React root
        const root = ReactDOM.createRoot(rootElement);
        
        // Log successful root creation
        console.log('React root created successfully');

        // Render our application
        root.render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );

        // Log successful render
        console.log('Initial render completed');
    } catch (error) {
        // If anything goes wrong, log it prominently
        console.error('Failed to initialize application:', error);
        
        // Also display the error visibly on the page
        const rootElement = document.getElementById('root');
        if (rootElement) {
            rootElement.innerHTML = `
                <div style="padding: 20px; margin: 20px; background-color: #fee; border: 1px solid #f88; border-radius: 4px;">
                    <h2 style="color: #c00; margin: 0 0 10px;">Application Failed to Initialize</h2>
                    <pre style="margin: 0; white-space: pre-wrap;">${error.message}</pre>
                </div>
            `;
        }
    }
})();
