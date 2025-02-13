import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import NmapMonitor from './components/NmapMonitor';
import ErrorBoundary from './components/ErrorBoundary';

function Navigation() {
    const location = useLocation();
    
    const getLinkClass = (path) => {
        const baseClass = "px-4 py-2 rounded-md transition-colors";
        const isActive = location.pathname === path;
        return `${baseClass} ${isActive 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    };

    return (
        <div className="flex space-x-4">
            <Link to="/" className={getLinkClass('/')}>Hosts</Link>
            <Link to="/ports" className={getLinkClass('/ports')}>Ports</Link>
        </div>
    );
}

function App() {
    console.log('App component starting render');
    
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gray-100">
                <nav className="bg-white shadow-lg">
                    <div className="container mx-auto px-4 py-4">
                        <div className="flex flex-col">
                            <span className="text-xl font-bold mb-3">Nmap Monitor</span>
                            <Navigation />
                        </div>
                    </div>
                </nav>

                <div className="container mx-auto px-4 py-8">
                    <ErrorBoundary>
                        <Routes>
                            <Route path="/" element={<NmapMonitor view="hosts" />} />
                            <Route path="/ports" element={<NmapMonitor view="ports" />} />
                        </Routes>
                    </ErrorBoundary>
                </div>
            </div>
        </BrowserRouter>
    );
}

export default App;
