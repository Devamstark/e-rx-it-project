import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import { User } from '../../types';
import { dbService } from '../../services/db';

interface AppShellProps {
    children: React.ReactNode;
    user: User | null;
    onLogout: () => void;
    // We pass the navigation handler up so the parent App can decide what to render
    // In a real router app, this wouldn't be needed, but we are keeping the logic intact.
    // For now, this is visual only until we wire it.
    currentView?: string;
    onNavigate?: (view: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, user, onLogout, onNavigate }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isCloud, setIsCloud] = useState(dbService.isCloudEnabled());

    // Responsive: Auto-close sidebar on small screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Layout for Unauthenticated Users (Login Screen)
    if (!user) {
        return (
            <div className="min-h-screen w-full bg-[#f0f2f5] flex items-center justify-center p-4">
                <div className="w-full max-w-md animate-fade-in delay-100">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-surface)] flex overflow-hidden">
            {/* 1. Sidebar */}
            <Sidebar
                role={user.role}
                activeTab="dashboard" // Default active
                onNavigate={(id) => onNavigate && onNavigate(id)}
                onLogout={onLogout}
                isOpen={isSidebarOpen}
            />

            {/* 2. Main Content Wrapper */}
            <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'} w-full`}>

                {/* 3. Top Bar */}
                <header className="h-16 bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between border-b border-slate-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-semibold text-slate-800 tracking-tight leading-none">
                                DevX<span className="text-[var(--color-primary)] font-bold">Hub</span>
                            </h1>
                            <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">E-Rx Platform</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Status Indicator */}
                        <div className={`hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full ${isCloud ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {isCloud ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isCloud ? 'Online' : 'Offline Mode'}
                        </div>

                        {/* Profile Chip */}
                        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</p>
                                <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">{user.role}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                                {user.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* 4. Page Content */}
                <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto animate-fade-in flex-grow overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
