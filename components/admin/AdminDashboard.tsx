
import React, { useState, useMemo, useEffect } from 'react';
import { ShieldAlert, Plus, CheckCircle2, AlertTriangle, Trash2, FileText, Activity, RefreshCw, Ban, File, X, Stethoscope, Building2, Eye, Mail, Phone as PhoneIcon, MapPin, Calendar, Edit2, Save as SaveIcon, Lock, Search, Database, ChevronLeft, ChevronRight, Store, Users } from 'lucide-react';
import { AdminRole, AdminPermission, AdminUser, User, UserRole, VerificationStatus, Prescription, UserDocument, AuditLog, PatientAccount } from '../../types';
import { dbService } from '../../services/db';
import { INDIAN_STATES, PINCODE_REGEX, PHONE_REGEX } from '../../constants';

interface AdminDashboardProps {
    users: User[];
    prescriptions: Prescription[];
    onUpdateStatus: (userId: string, status: VerificationStatus) => void;
    onTerminateUser: (userId: string, reason: string) => void;
    onDeleteUser: (userId: string) => void;
    onResetPassword: (userId: string) => void;
    onEditUser: (user: User) => void;
    auditLogs?: AuditLog[];
    onAddDirectoryEntry?: (entry: Partial<User>) => void;
    patientAccounts?: PatientAccount[];
}

// --- Mock Data for Internal Admin Management ---
const INITIAL_ADMIN_USERS: AdminUser[] = [
    {
        id: 'adm-root',
        name: 'DevX Super Admin',
        email: 'admin',
        role: AdminRole.SUPER_ADMIN,
        permissions: Object.values(AdminPermission) as AdminPermission[],
        status: 'ACTIVE'
    }
];

const getPermissionsForRole = (role: AdminRole): AdminPermission[] => {
    switch (role) {
        case AdminRole.SUPER_ADMIN:
            return Object.values(AdminPermission) as AdminPermission[];
        case AdminRole.COMPLIANCE_ADMIN:
            return [
                AdminPermission.VIEW_DOCTOR_LIST,
                AdminPermission.VIEW_PHARMACY_LIST,
                AdminPermission.APPROVE_REJECT_DOCTOR,
                AdminPermission.APPROVE_REJECT_PHARMACY,
                AdminPermission.ACCESS_LOGS_AUDITS
            ];
        case AdminRole.REVIEWER:
            return [
                AdminPermission.VIEW_DOCTOR_LIST,
                AdminPermission.VIEW_PHARMACY_LIST,
                AdminPermission.ACCESS_LOGS_AUDITS
            ];
        default:
            return [];
    }
};

const UserProfileModal = ({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (u: User) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<User>(user);

    const handleChange = (key: keyof User, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        onSave(formData);
        setIsEditing(false);
    };

    const EditInput = ({ label, valueKey, placeholder }: { label: string, valueKey: keyof User, placeholder?: string }) => (
        <div className="mb-3">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
            <input
                className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData[valueKey] as string || ''}
                onChange={e => handleChange(valueKey, e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${user.role === 'DOCTOR' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                            {user.role === 'DOCTOR' ? <Stethoscope className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>
                        <div>
                            {isEditing ? (
                                <input
                                    className="text-xl font-bold text-slate-900 bg-transparent border-b border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                                    value={formData.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                />
                            ) : (
                                <h3 className="text-xl font-bold text-slate-900 leading-none">{user.name}</h3>
                            )}
                            <span className="text-xs text-slate-500 font-mono">ID: {user.id}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ml-2 ${user.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                            user.verificationStatus === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                user.verificationStatus === 'DIRECTORY' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                            }`}>
                            {user.verificationStatus}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 transition-colors text-sm font-medium"
                            >
                                <Edit2 className="w-4 h-4" /> Edit
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                            >
                                <SaveIcon className="w-4 h-4" /> Save
                            </button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div>
                            <div className="flex items-center text-xs font-bold text-slate-500 uppercase mb-1">
                                <Mail className="w-3 h-3 mr-1" /> Email
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                    value={formData.email}
                                    onChange={e => handleChange('email', e.target.value)}
                                />
                            ) : (
                                <p className="text-sm font-medium text-slate-900 truncate" title={user.email}>{user.email}</p>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center text-xs font-bold text-slate-500 uppercase mb-1">
                                <PhoneIcon className="w-3 h-3 mr-1" /> Phone
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                    value={formData.phone || ''}
                                    onChange={e => handleChange('phone', e.target.value)}
                                />
                            ) : (
                                <p className="text-sm font-medium text-slate-900">{user.phone || 'N/A'}</p>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center text-xs font-bold text-slate-500 uppercase mb-1">
                                <Calendar className="w-3 h-3 mr-1" /> Registered On
                            </div>
                            <p className="text-sm font-medium text-slate-900">{new Date(user.registrationDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* DOCTOR SPECIFIC DETAILS */}
                    {user.role === 'DOCTOR' && (
                        <>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                                    <Stethoscope className="w-4 h-4 mr-2 text-indigo-600" /> Professional Credentials
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {isEditing ? (
                                        <>
                                            <EditInput label="Qualifications" valueKey="qualifications" />
                                            <EditInput label="Specialty" valueKey="specialty" />
                                            <EditInput label="State Medical Council" valueKey="stateCouncil" />
                                            <EditInput label="State Reg. Number" valueKey="licenseNumber" />
                                            <EditInput label="NMC UID" valueKey="nmrUid" />
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">Qualifications</label>
                                                <p className="text-sm font-medium text-slate-900">{user.qualifications || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">Specialty</label>
                                                <p className="text-sm font-medium text-slate-900">{user.specialty || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">State Medical Council</label>
                                                <p className="text-sm font-medium text-slate-900">{user.stateCouncil || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">State Reg. Number</label>
                                                <p className="text-sm font-medium text-slate-900 font-mono bg-slate-100 inline-block px-1 rounded">{user.licenseNumber || user['registrationNumber'] || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">NMC UID</label>
                                                <p className="text-sm font-medium text-slate-900 font-mono bg-slate-100 inline-block px-1 rounded">{user.nmrUid || '-'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* PHARMACY SPECIFIC DETAILS */}
                    {user.role === 'PHARMACY' && (
                        <>
                            <div>
                                <h4 className="font-bold text-slate-800 mb-3 flex items-center border-b border-slate-100 pb-2">
                                    <Building2 className="w-4 h-4 mr-2 text-purple-600" /> Establishment Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {isEditing ? (
                                        <>
                                            <EditInput label="License Number (Form 20/21)" valueKey="licenseNumber" />
                                            <EditInput label="GSTIN" valueKey="gstin" />
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">License Number (Form 20/21)</label>
                                                <p className="text-sm font-medium text-slate-900 font-mono bg-slate-100 inline-block px-1 rounded">{user.licenseNumber || '-'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase block">GSTIN</label>
                                                <p className="text-sm font-medium text-slate-900 font-mono">{user.gstin || 'N/A'}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* COMMON LOCATION & CONTACT (For both) */}
                    <div>
                        <h4 className="font-bold text-slate-800 mt-6 mb-3 flex items-center border-b border-slate-100 pb-2">
                            <MapPin className="w-4 h-4 mr-2 text-slate-600" /> Location & Contact
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {isEditing ? (
                                <>
                                    <div className="col-span-2">
                                        <EditInput label={user.role === 'DOCTOR' ? "Clinic / Hospital Name" : "Pharmacy / Shop Name"} valueKey="clinicName" />
                                    </div>
                                    <div className="col-span-2">
                                        <EditInput label="Address Line" valueKey="clinicAddress" />
                                    </div>
                                    <EditInput label="City" valueKey="city" />
                                    <EditInput label="State" valueKey="state" />
                                    <EditInput label="Pincode" valueKey="pincode" />
                                    {user.role === 'DOCTOR' && <EditInput label="Fax" valueKey="fax" />}
                                </>
                            ) : (
                                <>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">{user.role === 'DOCTOR' ? "Clinic Name" : "Pharmacy Name"}</label>
                                        <p className="text-sm font-medium text-slate-900">{user.clinicName || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Address</label>
                                        <p className="text-sm font-medium text-slate-900">{user.clinicAddress || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block">City</label>
                                        <p className="text-sm font-medium text-slate-900">{user.city || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block">State</label>
                                        <p className="text-sm font-medium text-slate-900">{user.state || '-'}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Pincode</label>
                                        <p className="text-sm font-medium text-slate-900">{user.pincode || '-'}</p>
                                    </div>
                                    {user.fax && (
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase block">Fax</label>
                                            <p className="text-sm font-medium text-slate-900">{user.fax}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* DOCUMENTS SECTION */}
                    <div>
                        <h4 className="font-bold text-slate-800 mt-6 mb-3 flex items-center border-b border-slate-100 pb-2">
                            <FileText className="w-4 h-4 mr-2 text-slate-600" /> Submitted Documents
                        </h4>
                        {user.documents && user.documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {user.documents.map((doc, i) => (
                                    <div key={i} className="flex items-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group">
                                        <div className="h-10 w-10 rounded bg-red-50 flex items-center justify-center mr-3 group-hover:bg-red-100 transition-colors">
                                            <FileText className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div className="overflow-hidden flex-1">
                                            <p className="text-sm font-medium text-slate-700 truncate" title={doc.name}>{doc.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{doc.type.replace('_', ' ')}</p>
                                        </div>
                                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-xs bg-white border border-slate-300 text-slate-600 px-2 py-1 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                                            View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-100 rounded p-4 text-center">
                                <p className="text-sm text-slate-500 italic">No documents uploaded.</p>
                            </div>
                        )}
                    </div>

                </div>
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-right rounded-b-xl">
                    <button onClick={onClose} className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-md shadow-sm hover:bg-slate-50 text-sm font-medium transition-colors">
                        Close Profile
                    </button>
                </div>
            </div>
        </div>
    );
}

const SecurityLogView = ({ logs, users }: { logs: AuditLog[], users: User[] }) => {
    const [activeTab, setActiveTab] = useState<'ALL' | 'DOCTOR' | 'PHARMACY' | 'ADMIN' | 'LAB'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Create a robust user map to look up names/roles from actorId
    const userMap = useMemo(() => {
        const map = new Map<string, { name: string, role: string }>();
        // Add all registered users
        users.forEach(u => {
            map.set(u.id, { name: u.name, role: u.role });
        });
        // Add known system/admin accounts
        map.set('adm-root', { name: 'System Admin', role: 'SUPER_ADMIN' });

        // Add External Actors
        map.set('LAB_PORTAL_GUEST', { name: 'External Lab Portal', role: 'PUBLIC_LAB' });

        return map;
    }, [users]);

    const getUserInfo = (actorId: string) => {
        return userMap.get(actorId) || { name: actorId, role: 'UNKNOWN' };
    };

    // Filter logs based on active tab and search term
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const info = getUserInfo(log.actorId);

            // 1. Tab Filter
            let tabMatch = false;
            if (activeTab === 'ALL') tabMatch = true;
            else if (activeTab === 'DOCTOR') tabMatch = info.role === 'DOCTOR';
            else if (activeTab === 'PHARMACY') tabMatch = info.role === 'PHARMACY';
            else if (activeTab === 'ADMIN') tabMatch = info.role?.includes('ADMIN');
            else if (activeTab === 'LAB') tabMatch = info.role === 'PUBLIC_LAB' || log.action.includes('LAB');

            if (!tabMatch) return false;

            // 2. Search Filter
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            return (
                info.name.toLowerCase().includes(searchLower) ||
                log.action.toLowerCase().includes(searchLower) ||
                log.details.toLowerCase().includes(searchLower) ||
                info.role.toLowerCase().includes(searchLower)
            );
        });
    }, [logs, activeTab, searchTerm, userMap]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
    const displayedLogs = filteredLogs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);

    const getPaginationGroup = () => {
        const start = Math.floor((currentPage - 1) / 5) * 5;
        return new Array(Math.min(5, totalPages - start)).fill(0).map((_, idx) => start + idx + 1);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-indigo-600" /> Security Log
                        </h3>
                        <span className="text-xs text-slate-500">Forensic Audit Trail • {filteredLogs.length} Events</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search User, Action..."
                                className="pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md w-full sm:w-48 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Role-Based Filters */}
                        <div className="flex bg-white rounded-md border border-slate-200 p-1">
                            {[
                                { id: 'ALL', label: 'All' },
                                { id: 'DOCTOR', label: 'Dr' },
                                { id: 'PHARMACY', label: 'Pharma' },
                                { id: 'ADMIN', label: 'Admin' },
                                { id: 'LAB', label: 'Lab' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${activeTab === tab.id
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Timestamp (IST)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {displayedLogs.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">No matching security logs found.</td>
                            </tr>
                        ) : (
                            displayedLogs.map((log) => {
                                const info = getUserInfo(log.actorId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {/* FORCE IST (Indian Standard Time) for Audit Accuracy */}
                                            {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">
                                            {info.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                            {info.role}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-[10px] leading-5 font-bold rounded-full uppercase 
                                                ${log.action.includes('LOGIN') ? 'bg-green-100 text-green-800' :
                                                    log.action.includes('LOGOUT') ? 'bg-amber-100 text-amber-800' :
                                                        log.action.includes('LAB') ? 'bg-teal-100 text-teal-800' :
                                                            'bg-slate-100 text-slate-800'}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 break-words max-w-xs">
                                            {log.details}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} entries
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>

                        {getPaginationGroup().map((item) => (
                            <button
                                key={item}
                                onClick={() => setCurrentPage(item)}
                                className={`px-3 py-1 text-xs font-bold rounded border ${currentPage === item ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {item}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalyticsView = ({ users, prescriptions }: { users: User[], prescriptions: Prescription[] }) => {
    const doctors = users.filter(u => u.role === UserRole.DOCTOR);
    const pharmacies = users.filter(u => u.role === UserRole.PHARMACY);
    const dispensedRx = prescriptions.filter(p => p.status === 'DISPENSED');

    // Calculate top doctors
    const doctorRxCount: Record<string, number> = {};
    prescriptions.forEach(p => { doctorRxCount[p.doctorName] = (doctorRxCount[p.doctorName] || 0) + 1; });
    const topDoctors = Object.entries(doctorRxCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Calculate top pharmacies
    const pharmacyRxCount: Record<string, number> = {};
    prescriptions.forEach(p => {
        if (p.pharmacyName) pharmacyRxCount[p.pharmacyName] = (pharmacyRxCount[p.pharmacyName] || 0) + 1;
    });
    const topPharmacies = Object.entries(pharmacyRxCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Prescriptions</p>
                            <p className="text-3xl font-bold text-slate-900">{prescriptions.length}</p>
                        </div>
                        <FileText className="w-8 h-8 text-indigo-200" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Successfully Dispensed</p>
                            <p className="text-3xl font-bold text-green-600">{dispensedRx.length}</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-200" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Doctors</p>
                            <p className="text-3xl font-bold text-slate-900">{doctors.filter(d => d.verificationStatus === 'VERIFIED').length}</p>
                        </div>
                        <Activity className="w-8 h-8 text-blue-200" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active Pharmacies</p>
                            <p className="text-3xl font-bold text-slate-900">{pharmacies.filter(p => p.verificationStatus === 'VERIFIED').length}</p>
                        </div>
                        <Activity className="w-8 h-8 text-purple-200" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Top Prescribing Doctors</h3>
                    {topDoctors.length > 0 ? (
                        <ul className="space-y-3">
                            {topDoctors.map(([name, count], idx) => (
                                <li key={name} className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">{idx + 1}. {name}</span>
                                    <span className="text-sm font-bold text-indigo-600">{count} Rx</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-400">No data yet.</p>}
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4">Top Dispensing Pharmacies</h3>
                    {topPharmacies.length > 0 ? (
                        <ul className="space-y-3">
                            {topPharmacies.map(([name, count], idx) => (
                                <li key={name} className="flex justify-between items-center">
                                    <span className="text-sm text-slate-600">{idx + 1}. {name}</span>
                                    <span className="text-sm font-bold text-green-600">{count} Rx</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-slate-400">No data yet.</p>}
                </div>
            </div>
        </div>
    );
};

const PrescriptionLog = ({ prescriptions }: { prescriptions: Prescription[] }) => {
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'DOCTOR' | 'PHARMACY' | 'PATIENT'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Filter Logic
    const filteredRx = useMemo(() => {
        let list = prescriptions;
        const lowerTerm = searchTerm.toLowerCase();

        // If no search term, return all (activeFilter only scopes the search)
        if (!lowerTerm) return list;

        return list.filter(rx => {
            // Field checks based on active filter scope
            let match = false;

            if (activeFilter === 'ALL') {
                // ALL: Check everything
                const basicMatch =
                    rx.id.toLowerCase().includes(lowerTerm) ||
                    rx.doctorName.toLowerCase().includes(lowerTerm) ||
                    rx.patientName.toLowerCase().includes(lowerTerm) ||
                    (rx.pharmacyName || '').toLowerCase().includes(lowerTerm);

                const doctorMatch = rx.doctorDetails ? (
                    (rx.doctorDetails.phone || '').includes(lowerTerm) ||
                    (rx.doctorDetails.email || '').toLowerCase().includes(lowerTerm) ||
                    (rx.doctorDetails.pincode || '').includes(lowerTerm) ||
                    (rx.doctorDetails.clinicAddress || '').toLowerCase().includes(lowerTerm)
                ) : false;

                const patientMatch = (rx.patientPhone || '').includes(lowerTerm);
                match = basicMatch || doctorMatch || patientMatch;

            } else if (activeFilter === 'DOCTOR') {
                // DOCTOR: Only check doctor related fields
                match = rx.doctorName.toLowerCase().includes(lowerTerm);
                if (rx.doctorDetails) {
                    match = match ||
                        (rx.doctorDetails.phone || '').includes(lowerTerm) ||
                        (rx.doctorDetails.email || '').toLowerCase().includes(lowerTerm) ||
                        (rx.doctorDetails.pincode || '').includes(lowerTerm) ||
                        (rx.doctorDetails.clinicAddress || '').toLowerCase().includes(lowerTerm);
                }

            } else if (activeFilter === 'PHARMACY') {
                // PHARMACY: Only check pharmacy name (ID usually not searched by users here)
                match = (rx.pharmacyName || '').toLowerCase().includes(lowerTerm);

            } else if (activeFilter === 'PATIENT') {
                // PATIENT: Check Name and Phone
                match = rx.patientName.toLowerCase().includes(lowerTerm) || (rx.patientPhone || '').includes(lowerTerm);
            }

            return match;
        });
    }, [prescriptions, searchTerm, activeFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRx.length / ITEMS_PER_PAGE);
    const displayedRx = filteredRx.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page on search/filter change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, activeFilter]);

    const getPaginationGroup = () => {
        const start = Math.floor((currentPage - 1) / 5) * 5;
        return new Array(Math.min(5, totalPages - start)).fill(0).map((_, idx) => start + idx + 1);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Central Prescription Log</h3>
                    <span className="text-xs text-slate-500">Audit Trail • {filteredRx.length} Records</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-auto">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={
                                activeFilter === 'DOCTOR' ? "Search Doctor Name, Phone, Reg..." :
                                    activeFilter === 'PHARMACY' ? "Search Pharmacy Name..." :
                                        activeFilter === 'PATIENT' ? "Search Patient Name, Phone..." :
                                            "Search All Fields..."
                            }
                            className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-md w-full md:w-72 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-white rounded-md border border-slate-200 p-1">
                        {[
                            { id: 'ALL', label: 'All' },
                            { id: 'DOCTOR', label: 'Doctor' },
                            { id: 'PHARMACY', label: 'Pharmacy' },
                            { id: 'PATIENT', label: 'Patient' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveFilter(tab.id as any)}
                                className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${activeFilter === tab.id
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rx ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pharmacy</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {displayedRx.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">No prescriptions matching search criteria.</td>
                            </tr>
                        ) : (
                            displayedRx.map((rx) => (
                                <tr key={rx.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(rx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-400">
                                        {rx.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {rx.doctorName}
                                        {rx.doctorDetails?.pincode && <div className="text-[10px] text-slate-400 font-normal">{rx.doctorDetails.city}, {rx.doctorDetails.pincode}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {rx.patientName}
                                        {rx.patientPhone && <div className="text-[10px] text-slate-400">{rx.patientPhone}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {rx.pharmacyName || 'Unassigned'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${rx.status === 'DISPENSED' ? 'bg-green-100 text-green-800' :
                                                rx.status === 'ISSUED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'}`}>
                                            {rx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredRx.length)} of {filteredRx.length} entries
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>

                        {getPaginationGroup().map((item) => (
                            <button
                                key={item}
                                onClick={() => setCurrentPage(item)}
                                className={`px-3 py-1 text-xs font-bold rounded border ${currentPage === item ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                            >
                                {item}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="p-1 rounded border border-slate-300 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserRegistry = ({
    users,
    onAction,
    onTerminate,
    onDelete,
    onReset,
    onViewDocs,
    onViewProfile,
    onAdd // Optional prop for adding directory leads
}: {
    users: User[],
    onAction: (id: string, status: VerificationStatus) => void,
    onTerminate: (id: string, reason: string) => void,
    onDelete: (id: string) => void,
    onReset: (id: string) => void,
    onViewDocs: (docs: UserDocument[]) => void,
    onViewProfile: (user: User) => void,
    onAdd?: (entry: Partial<User>) => void
}) => {
    const [terminateModalUser, setTerminateModalUser] = useState<string | null>(null);
    const [terminationReason, setTerminationReason] = useState("");

    // Add Directory Lead State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newLead, setNewLead] = useState<Partial<User>>({ state: '' });

    const confirmTermination = () => {
        if (terminateModalUser && terminationReason) {
            onTerminate(terminateModalUser, terminationReason);
            setTerminateModalUser(null);
            setTerminationReason("");
        }
    };

    const handleDeleteClick = (userId: string) => {
        if (window.confirm("Are you sure you want to PERMANENTLY DELETE this user? This action cannot be undone.")) {
            onDelete(userId);
        }
    };

    const handleSaveLead = () => {
        if (onAdd && newLead.name && newLead.phone && newLead.pincode) {
            onAdd(newLead);
            setShowAddModal(false);
            setNewLead({ state: '' });
        } else {
            alert("Name, Phone, and Pincode are required.");
        }
    };

    const filtered = users.filter(u => u.role !== UserRole.ADMIN);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800">
                        {onAdd ? "Unverified Pharmacy Directory" : "Master User Registry"}
                    </h3>
                    <span className="text-xs text-slate-500">
                        {onAdd ? "Marketing leads & pending listings" : "All verified & registered entities"}
                    </span>
                </div>
                {onAdd && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center shadow-sm"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add New Lead
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User / Establishment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Docs</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filtered.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div
                                        onClick={() => onViewProfile(u)}
                                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        {u.name}
                                    </div>
                                    <div className="text-xs text-slate-500">ID: {u.id}</div>
                                    {u.phone && <div className="text-xs text-slate-400 mt-0.5 flex items-center"><PhoneIcon className="w-3 h-3 mr-1" /> {u.phone}</div>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-slate-700">{u.role}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${u.verificationStatus === VerificationStatus.VERIFIED ? 'bg-green-100 text-green-800' :
                                            u.verificationStatus === VerificationStatus.PENDING ? 'bg-blue-100 text-blue-800' :
                                                u.verificationStatus === VerificationStatus.DIRECTORY ? 'bg-amber-100 text-amber-700' :
                                                    u.verificationStatus === VerificationStatus.TERMINATED ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                                        {u.verificationStatus}
                                    </span>
                                    {u.verificationStatus === VerificationStatus.TERMINATED && (
                                        <div className="text-[10px] text-red-500 mt-1 max-w-[150px] truncate" title={u.terminationReason || ''}>
                                            Reason: {u.terminationReason}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {u.documents && u.documents.length > 0 ? (
                                        <button onClick={() => onViewDocs(u.documents!)} className="text-indigo-600 hover:underline flex items-center text-xs">
                                            <FileText className="w-4 h-4 mr-1" /> {u.documents.length} Files
                                        </button>
                                    ) : (
                                        <span className="text-xs text-slate-400">None</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {(u.verificationStatus === VerificationStatus.VERIFIED || u.verificationStatus === VerificationStatus.DIRECTORY) && (
                                        <>
                                            <button
                                                onClick={() => onReset(u.id)}
                                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                                                title="Reset Password"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setTerminateModalUser(u.id)}
                                                className="text-amber-600 hover:text-amber-900 inline-flex items-center"
                                                title="Terminate Account (Block)"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleDeleteClick(u.id)}
                                        className="text-red-600 hover:text-red-900 inline-flex items-center ml-2"
                                        title="Permanently Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Lead Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in zoom-in-95">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                <Store className="w-5 h-5 mr-2 text-indigo-600" /> Add Pharmacy Lead
                            </h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pharmacy Name *</label>
                                <input className="w-full border p-2 rounded text-sm" value={newLead.name || ''} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="e.g. City Meds" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number *</label>
                                <input className="w-full border p-2 rounded text-sm" value={newLead.phone || ''} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} placeholder="10-digit Mobile" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City</label>
                                    <input className="w-full border p-2 rounded text-sm" value={newLead.city || ''} onChange={e => setNewLead({ ...newLead, city: e.target.value })} placeholder="City" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pincode *</label>
                                    <input className="w-full border p-2 rounded text-sm" value={newLead.pincode || ''} onChange={e => setNewLead({ ...newLead, pincode: e.target.value })} placeholder="6-digits" maxLength={6} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Address</label>
                                <textarea className="w-full border p-2 rounded text-sm" rows={2} value={newLead.clinicAddress || ''} onChange={e => setNewLead({ ...newLead, clinicAddress: e.target.value })} placeholder="Shop No, Street, Landmark..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State</label>
                                <select className="w-full border p-2 rounded text-sm bg-white" value={newLead.state || ''} onChange={e => setNewLead({ ...newLead, state: e.target.value })}>
                                    <option value="">Select State</option>
                                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <button
                                onClick={handleSaveLead}
                                className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 shadow-sm mt-2"
                            >
                                Save Lead to Directory
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Termination Modal */}
            {terminateModalUser && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center text-red-600 mb-4">
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold">Confirm Termination</h3>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            This action will strictly block access for the user. This cannot be easily undone without DB admin intervention.
                        </p>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Termination (Required)</label>
                        <textarea
                            className="w-full border border-slate-300 rounded p-2 text-sm mb-4"
                            rows={3}
                            placeholder="e.g. Violation of Telemedicine Act 2020 section 4..."
                            value={terminationReason}
                            onChange={(e) => setTerminationReason(e.target.value)}
                        ></textarea>
                        <div className="flex justify-end space-x-2">
                            <button
                                onClick={() => { setTerminateModalUser(null); setTerminationReason(""); }}
                                className="px-4 py-2 text-sm text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmTermination}
                                disabled={!terminationReason.trim()}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                Confirm Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RoleManagement = () => {
    const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAdmin, setNewAdmin] = useState<Partial<AdminUser>>({
        role: AdminRole.REVIEWER,
        permissions: getPermissionsForRole(AdminRole.REVIEWER)
    });

    const handleRoleChange = (role: AdminRole) => {
        setNewAdmin(prev => ({
            ...prev,
            role,
            permissions: getPermissionsForRole(role)
        }));
    };

    const handleSave = () => {
        if (!newAdmin.name || !newAdmin.email) return;
        const admin: AdminUser = {
            id: `adm-${Date.now()}`,
            name: newAdmin.name,
            email: newAdmin.email,
            role: newAdmin.role as AdminRole,
            permissions: newAdmin.permissions || [],
            status: 'ACTIVE'
        };
        setAdmins([...admins, admin]);
        setIsModalOpen(false);
        setNewAdmin({ role: AdminRole.REVIEWER, permissions: getPermissionsForRole(AdminRole.REVIEWER) });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Internal Admin Team</h2>
                    <p className="text-slate-500 text-sm">Manage staff access and RBAC policies.</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Create Admin Account
                </button>
            </div>

            <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Admin User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Effective Permissions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {admins.map(u => (
                            <tr key={u.id}>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                        ${u.role === AdminRole.SUPER_ADMIN ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {u.permissions.map(p => (
                                            <span key={p} className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                                                {p.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Add New Admin User</h3>
                        <div className="space-y-4">
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Full Name"
                                onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Email"
                                onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })}
                            />
                            <div>
                                <label className="block text-sm font-medium mb-2">Assign Role (Auto-sets Permissions)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[AdminRole.SUPER_ADMIN, AdminRole.COMPLIANCE_ADMIN, AdminRole.REVIEWER].map(role => (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleChange(role)}
                                            className={`text-xs p-2 border rounded ${newAdmin.role === role ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-slate-50'}`}
                                        >
                                            {role.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 h-32 overflow-y-auto">
                                <p className="text-xs font-bold text-slate-500 mb-2">Permissions granted by this role:</p>
                                <ul className="text-xs text-slate-600 space-y-1">
                                    {newAdmin.permissions?.map(p => <li key={p} className="flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> {p}</li>)}
                                </ul>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">Create Account</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PatientAccountsView = ({ accounts }: { accounts: PatientAccount[] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Filter accounts based on search term (name or ID)
    const filtered = accounts.filter(acc =>
        acc.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (acc as any).full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="font-bold text-indigo-900 flex items-center">
                        <Users className="w-5 h-5 mr-2" /> Patient Portal Accounts
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Secure mapping of Supabase Auth users to medical records</p>
                </div>
                <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="Search Patient Name or ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient Profile</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supabase User UID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Issued By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filtered.map(acc => (
                            <tr key={acc.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-slate-900 leading-tight">{(acc as any).full_name || 'Patient'}</div>
                                    <div className="text-xs text-indigo-600 font-mono mt-0.5">Ref: {acc.patientId}</div>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-slate-400">
                                    {acc.authUserId}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs font-bold text-slate-600">{acc.enabledByPharmacyId}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${acc.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {acc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500">
                                    {new Date(acc.createdAt).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No matching patient accounts found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminStats = ({ users, onFilter }: { users: User[], onFilter: (status: VerificationStatus | 'ALL') => void }) => {
    const pending = users.filter(u => u.verificationStatus === VerificationStatus.PENDING).length;
    const verified = users.filter(u => u.verificationStatus === VerificationStatus.VERIFIED).length;
    const terminated = users.filter(u => u.verificationStatus === VerificationStatus.TERMINATED).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <button onClick={() => onFilter('ALL')} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 text-left hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="text-slate-500 text-xs font-bold uppercase">Total Users</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
            </button>
            <button onClick={() => onFilter(VerificationStatus.PENDING)} className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 text-left hover:border-blue-400 hover:shadow-md transition-all relative overflow-hidden">
                <div className="text-blue-700 text-xs font-bold uppercase relative z-10">Pending Review</div>
                <div className="text-2xl font-bold text-blue-900 mt-1 relative z-10">{pending}</div>
                <Activity className="absolute right-2 bottom-2 w-12 h-12 text-blue-100 -z-0" />
            </button>
            <button onClick={() => onFilter(VerificationStatus.VERIFIED)} className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 text-left hover:border-green-400 hover:shadow-md transition-all">
                <div className="text-green-700 text-xs font-bold uppercase">Verified Active</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{verified}</div>
            </button>
            <button onClick={() => onFilter(VerificationStatus.TERMINATED)} className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-200 text-left hover:border-red-400 hover:shadow-md transition-all">
                <div className="text-red-700 text-xs font-bold uppercase">Terminated</div>
                <div className="text-2xl font-bold text-red-900 mt-1">{terminated}</div>
            </button>
        </div>
    );
};

const ApprovalQueue = ({
    users,
    onAction,
    onViewDocs
}: {
    users: User[],
    onAction: (id: string, status: VerificationStatus) => void,
    onViewDocs: (docs: UserDocument[]) => void
}) => {
    const pendingUsers = users.filter(u => u.verificationStatus === VerificationStatus.PENDING);

    if (pendingUsers.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-dashed border-slate-300 p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-100 mx-auto mb-3" />
                <h3 className="text-slate-900 font-medium">All caught up!</h3>
                <p className="text-slate-500 text-sm">No pending verifications in the queue.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-900 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2" /> Verification Queue
                </h3>
                <span className="bg-indigo-200 text-indigo-800 text-xs font-bold px-2 py-1 rounded-full">{pendingUsers.length} Pending</span>
            </div>
            <div className="divide-y divide-slate-100">
                {pendingUsers.map(user => (
                    <div key={user.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${user.role === 'DOCTOR' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                    {user.role}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">ID: {user.id}</span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900">{user.name}</h4>

                            {/* Expanded Verification Details */}
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 bg-slate-50/50 p-3 rounded border border-slate-100">
                                <p className="flex items-center"><span className="font-bold w-20 text-slate-500">License:</span> <span className="font-mono bg-white px-1 border border-slate-200 rounded">{user.licenseNumber || 'N/A'}</span></p>
                                <p className="flex items-center"><span className="font-bold w-20 text-slate-500">Phone:</span> {user.phone}</p>
                                <p className="flex items-center sm:col-span-2"><span className="font-bold w-20 text-slate-500">Address:</span> {user.clinicAddress}, {user.city}</p>

                                {user.role === 'DOCTOR' && (
                                    <>
                                        <p className="flex items-center sm:col-span-2"><span className="font-bold w-20 text-slate-500">Quals:</span> {user.qualifications}</p>
                                        <p className="flex items-center"><span className="font-bold w-20 text-slate-500">Specialty:</span> {user.specialty || '-'}</p>
                                        <p className="flex items-center"><span className="font-bold w-20 text-slate-500">NMC UID:</span> {user.nmrUid}</p>
                                    </>
                                )}
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                                {user.documents && user.documents.length > 0 ? (
                                    <button
                                        onClick={() => onViewDocs(user.documents!)}
                                        className="text-xs flex items-center text-indigo-600 font-medium hover:underline bg-indigo-50 px-2 py-1 rounded border border-indigo-100"
                                    >
                                        <FileText className="w-3 h-3 mr-1" /> Review {user.documents.length} Documents
                                    </button>
                                ) : (
                                    <span className="text-xs text-red-500 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> No Docs Uploaded</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onAction(user.id, VerificationStatus.REJECTED)}
                                className="px-4 py-2 border border-red-200 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => onAction(user.id, VerificationStatus.VERIFIED)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-sm transition-colors flex items-center"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    users,
    prescriptions,
    onUpdateStatus,
    onTerminateUser,
    onDeleteUser,
    onResetPassword,
    onEditUser,
    auditLogs = [],
    onAddDirectoryEntry,
    patientAccounts = []
}) => {
    const [activeView, setActiveView] = useState<'OVERVIEW' | 'REGISTRY' | 'DIRECTORY' | 'PATIENT_ACCOUNTS' | 'ROLES' | 'ANALYTICS' | 'RX_LOGS' | 'SECURITY_LOG'>('OVERVIEW');
    const [filterStatus, setFilterStatus] = useState<VerificationStatus | 'ALL'>('ALL');
    const [viewDocs, setViewDocs] = useState<UserDocument[] | null>(null);
    const [profileUser, setProfileUser] = useState<User | null>(null);

    const displayedUsers = filterStatus === 'ALL'
        ? users.filter(u => u.role !== UserRole.PATIENT && u.role !== UserRole.ADMIN)
        : users.filter(u => u.verificationStatus === filterStatus && u.role !== UserRole.PATIENT && u.role !== UserRole.ADMIN);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Sidebar */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden sticky top-24">
                    <div className="p-4 bg-indigo-900 text-white">
                        <span className="font-bold tracking-wide block">Admin Panel</span>
                        <span className="text-xs text-indigo-300">DevXWorld Secure</span>
                    </div>
                    <nav className="p-2 space-y-1">
                        <button onClick={() => setActiveView('OVERVIEW')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'OVERVIEW' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Dashboard & Queue
                        </button>
                        <button onClick={() => setActiveView('ANALYTICS')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'ANALYTICS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Analytics
                        </button>
                        <button onClick={() => setActiveView('RX_LOGS')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'RX_LOGS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Prescription Logs
                        </button>
                        <button onClick={() => setActiveView('SECURITY_LOG')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'SECURITY_LOG' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Security Logs
                        </button>
                        <button onClick={() => setActiveView('REGISTRY')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'REGISTRY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Master Registry
                        </button>
                        <button onClick={() => setActiveView('PATIENT_ACCOUNTS')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'PATIENT_ACCOUNTS' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Patient Accounts
                        </button>
                        <button onClick={() => setActiveView('DIRECTORY')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'DIRECTORY' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Directory (Unverified)
                        </button>
                        <button onClick={() => setActiveView('ROLES')} className={`w-full text-left px-3 py-2 rounded text-sm font-medium ${activeView === 'ROLES' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                            Access Control (RBAC)
                        </button>
                    </nav>
                </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-10 min-h-[600px]">
                {activeView === 'OVERVIEW' && (
                    <div className="animate-in fade-in duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">System Overview</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded shadow-sm hover:bg-indigo-100 text-xs font-bold uppercase tracking-wider border border-indigo-200"
                                >
                                    <RefreshCw className="w-4 h-4" /> Refresh Data
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            await dbService.syncRegistry();
                                            window.location.reload();
                                        } catch (e) {
                                            alert("Sync failed. Did you run the SUPABASE_SYNC_FUNCTION.sql script?");
                                        }
                                    }}
                                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded shadow hover:bg-slate-700 text-xs font-bold uppercase tracking-wider"
                                >
                                    <Database className="w-4 h-4" /> Sync Registry
                                </button>
                            </div>
                        </div>
                        <AdminStats users={users} onFilter={(s) => { setFilterStatus(s); setActiveView('REGISTRY'); }} />
                        <ApprovalQueue users={users} onAction={onUpdateStatus} onViewDocs={setViewDocs} />
                    </div>
                )}

                {activeView === 'ANALYTICS' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Analytics Dashboard</h2>
                        <AnalyticsView users={users} prescriptions={prescriptions} />
                    </div>
                )}

                {activeView === 'RX_LOGS' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">E-Prescription Logs</h2>
                        <PrescriptionLog prescriptions={prescriptions} />
                    </div>
                )}

                {activeView === 'SECURITY_LOG' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Security Audit Logs</h2>
                        <SecurityLogView logs={auditLogs} users={users} />
                    </div>
                )}

                {activeView === 'REGISTRY' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">User Registry & Compliance</h2>
                        <UserRegistry
                            users={displayedUsers.filter(u => u.verificationStatus !== VerificationStatus.DIRECTORY)}
                            onAction={onUpdateStatus}
                            onTerminate={onTerminateUser}
                            onDelete={onDeleteUser}
                            onReset={onResetPassword}
                            onViewDocs={setViewDocs}
                            onViewProfile={setProfileUser}
                        />
                    </div>
                )}

                {activeView === 'DIRECTORY' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Unverified Pharmacy Directory</h2>
                        <UserRegistry
                            users={users.filter(u => u.verificationStatus === VerificationStatus.DIRECTORY)}
                            onAction={onUpdateStatus}
                            onTerminate={onTerminateUser}
                            onDelete={onDeleteUser}
                            onReset={onResetPassword}
                            onViewDocs={setViewDocs}
                            onViewProfile={setProfileUser}
                            onAdd={onAddDirectoryEntry} // Pass handler for adding leads
                        />
                    </div>
                )}

                {activeView === 'PATIENT_ACCOUNTS' && (
                    <div className="animate-in fade-in duration-300">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Patient Portal Accounts</h2>
                        <PatientAccountsView accounts={patientAccounts || []} />
                    </div>
                )}

                {activeView === 'ROLES' && (
                    <RoleManagement />
                )}
            </div>

            {/* Document Viewer Modal */}
            {viewDocs && (
                <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-indigo-600" /> Verified Documents</h3>
                            <button onClick={() => setViewDocs(null)} className="text-slate-500 hover:text-slate-700 font-bold text-xl">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {viewDocs.map((doc, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded shadow border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{doc.type.replace('_', ' ')}</span>
                                            <span className="text-xs text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="aspect-[4/3] bg-slate-100 rounded overflow-hidden border border-slate-200 flex items-center justify-center group relative">
                                            {doc.name.toLowerCase().endsWith('.pdf') ? (
                                                <div className="text-center p-4">
                                                    <FileText className="w-16 h-16 text-red-500 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{doc.name}</p>
                                                    <a href={doc.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-indigo-600 hover:underline">Download / View PDF</a>
                                                </div>
                                            ) : (
                                                <a href={doc.url} target="_blank" rel="noreferrer">
                                                    <img src={doc.url} alt={doc.type} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 bg-white text-right">
                            <button onClick={() => setViewDocs(null)} className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 text-sm font-medium">Close Viewer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile Modal */}
            {profileUser && (
                <UserProfileModal
                    user={profileUser}
                    onClose={() => setProfileUser(null)}
                    onSave={(updatedUser) => {
                        onEditUser(updatedUser);
                        setProfileUser(updatedUser); // Update the view immediately
                    }}
                />
            )}
        </div>
    );
};
