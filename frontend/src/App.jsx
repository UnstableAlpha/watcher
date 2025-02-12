import React from 'react';
import NmapMonitor from './components/NmapMonitor';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    console.log('App component starting render');
    
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">
                    Nmap Monitor Dashboard
                </h1>
                <NmapMonitor />
            </div>
        </div>
    );
}

export default App;
