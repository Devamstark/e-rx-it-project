import React from 'react';
import {
    LayoutDashboard, Users, FileText, Settings,
    LogOut, Shield, Activity, Search
} from 'lucide-react';
import { UserRole } from '../../types';

interface SidebarProps {
    role: UserRole;
    activeTab?: string;
    onNavigate: (tab: string) => void;
    onLogout: () => void;
    isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, onNavigate, onLogout, isOpen }) => {
    const getNavItems = () => {
        switch (role) {
            case 'DOCTOR':
                return [
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'patients', label: 'My Patients', icon: Users },
                    { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
                    { id: 'labs', label: 'Lab Referrals', icon: Activity },
                    { id: 'settings', label: 'Profile & Settings', icon: Settings },
                ];
            case 'PHARMACY':
                return [
                    { id: 'dashboard', label: 'Order Dashboard', icon: LayoutDashboard },
                    { id: 'inventory', label: 'Inventory / Returns', icon: Activity },
                    { id: 'directory', label: 'Doctor Directory', icon: Search },
                    { id: 'settings', label: 'Store Settings', icon: Settings },
                ];
            case 'ADMIN':
                return [
                    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                    { id: 'users', label: 'User Management', icon: Users },
                    { id: 'approvals', label: 'Pending Approvals', icon: Shield },
                    { id: 'audit', label: 'Security Logs', icon: Shield },
                    { id: 'settings', label: 'System Settings', icon: Settings },
                ];
            case 'PATIENT':
                return [
                    { id: 'dashboard', label: 'My Health', icon: LayoutDashboard },
                    { id: 'records', label: 'Medical Records', icon: FileText },
                ];
            default: return [];
        }
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-[var(--color-surface-container)] transition-all duration-300 z-40 border-r border-slate-200
        ${isOpen ? 'w-64' : 'w-20'} pt-16 flex flex-col`}
        >
            <nav className="flex-1 px-3 py-6 space-y-2">
                {getNavItems().map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className="w-full flex items-center p-3 rounded-full hover:bg-[var(--color-primary-container)] hover:text-[var(--color-on-primary-container)] transition-colors text-slate-600 group relative"
                    >
                        <item.icon className={`w-6 h-6 flex-shrink-0 ${isOpen ? 'mr-3' : 'mx-auto'}`} />
                        <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-200
               ${isOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'}`}>
                            {item.label}
                        </span>

                        {/* Tooltip for collapsed state */}
                        {!isOpen && (
                            <div className="absolute left-16 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap shadow-lg">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 bg-[var(--color-surface-container-high)]">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center p-3 rounded-full hover:bg-red-50 text-[var(--color-error)] transition-colors group relative"
                >
                    <LogOut className={`w-6 h-6 flex-shrink-0 ${isOpen ? 'mr-3' : 'mx-auto'}`} />
                    <span className={`font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-200
               ${isOpen ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0'}`}>
                        Sign Out
                    </span>

                    {!isOpen && (
                        <div className="absolute left-16 bg-red-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-50 whitespace-nowrap">
                            Log Out
                        </div>
                    )}
                </button>
            </div>
        </aside>
    );
};
