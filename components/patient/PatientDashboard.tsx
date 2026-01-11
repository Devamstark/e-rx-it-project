import React, { useState, useEffect } from 'react';
import {
    FileText, Activity, Calendar, Shield, CreditCard, Clock, LogOut,
    User, CheckCircle, Download, ExternalLink, Menu, X, Bell,
    MapPin, Phone, Mail, Award, ClipboardList
} from 'lucide-react';
import { Prescription, User as UserType, Patient, MedicalCertificate, LabReferral } from '../../types';
import { dbService } from '../../services/db';
import { PrescriptionModal } from '../doctor/PrescriptionModal';

interface PatientDashboardProps {
    currentUser: UserType;
    onLogout: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ currentUser, onLogout }) => {
    const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
    const [labReferrals, setLabReferrals] = useState<LabReferral[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PRESCRIPTIONS' | 'RECORDS'>('OVERVIEW');

    useEffect(() => {
        const loadPatientData = async () => {
            try {
                const { patients, rx, certificates: certs, labReferrals: labs } = await dbService.loadData();

                // Since RLS filters the data, we just take what we got
                if (patients.length > 0) setPatientProfile(patients[0]);
                setPrescriptions(rx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                setCertificates(certs);
                setLabReferrals(labs);
            } catch (error) {
                console.error("Error loading patient data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadPatientData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const sections = [
        { id: 'OVERVIEW', label: 'Health Overview', icon: Activity },
        { id: 'PRESCRIPTIONS', label: 'My Prescriptions', icon: FileText },
        { id: 'RECORDS', label: 'Medical Records', icon: ClipboardList }
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-900 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -m-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -m-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                            <User className="h-12 w-12 text-white" />
                        </div>
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-extrabold text-white tracking-tight">
                                Welcome, {patientProfile?.fullName || currentUser.name}
                            </h1>
                            <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-4">
                                <span className="flex items-center text-indigo-100 text-sm font-medium">
                                    <Shield className="h-4 w-4 mr-1.5 text-indigo-300" /> Patient ID: {patientProfile?.id}
                                </span>
                                <span className="flex items-center text-indigo-100 text-sm font-medium">
                                    <CheckCircle className="h-4 w-4 mr-1.5 text-green-400" /> Account Verified
                                </span>
                                {patientProfile?.bloodGroup && (
                                    <span className="flex items-center text-indigo-100 text-sm font-medium">
                                        <Award className="h-4 w-4 mr-1.5 text-red-400" /> {patientProfile.bloodGroup}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl font-bold transition-all flex items-center shadow-lg group"
                    >
                        <LogOut className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Sign Out
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <div className="lg:col-span-3 space-y-3">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveTab(section.id as any)}
                            className={`w-full flex items-center px-6 py-4 rounded-2xl text-sm font-bold transition-all border ${activeTab === section.id
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100 -translate-y-1'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-indigo-300'
                                }`}
                        >
                            <section.icon className={`h-5 w-5 mr-3 ${activeTab === section.id ? 'text-white' : 'text-indigo-600'}`} />
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Dynamic Content Area */}
                <div className="lg:col-span-9">
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Personal Profile</h3>
                                    <div className="space-y-5">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mr-4 shrink-0">
                                                <Calendar className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Date of Birth</p>
                                                <p className="font-semibold text-slate-800">{patientProfile?.dateOfBirth}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mr-4 shrink-0">
                                                <Phone className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Phone Number</p>
                                                <p className="font-semibold text-slate-800">{patientProfile?.phone}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center mr-4 shrink-0">
                                                <MapPin className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 font-bold uppercase">Primary Address</p>
                                                <p className="font-semibold text-slate-800">{patientProfile?.address}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Recent Health Status</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center mr-3 shadow-sm">
                                                    <Activity className="h-5 w-5 text-indigo-600" />
                                                </div>
                                                <span className="font-bold text-indigo-900 text-sm">Last Prescription</span>
                                            </div>
                                            <span className="text-xs font-bold text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm">
                                                {prescriptions.length > 0 ? new Date(prescriptions[0].date).toLocaleDateString() : 'None'}
                                            </span>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center mr-3 shadow-sm">
                                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                                </div>
                                                <span className="font-bold text-green-900 text-sm">Verified Profile</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-green-600 uppercase">Active</span>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-4 tracking-widest">Chronic Conditions</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {patientProfile?.chronicConditions?.length ? (
                                                patientProfile.chronicConditions.map((c, i) => (
                                                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{c}</span>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No conditions reported</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <h3 className="font-bold text-slate-800">Latest Prescriptions</h3>
                                    <button onClick={() => setActiveTab('PRESCRIPTIONS')} className="text-xs font-bold text-indigo-600 hover:underline">View All</button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {prescriptions.slice(0, 3).map((rx) => (
                                        <div key={rx.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors group">
                                            <div>
                                                <p className="font-bold text-slate-900">Dr. {rx.doctorName}</p>
                                                <p className="text-xs text-slate-400 flex items-center mt-1">
                                                    <Calendar className="h-3 w-3 mr-1" /> {new Date(rx.date).toLocaleDateString()} • {rx.diagnosis}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setSelectedRx(rx)}
                                                className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <ExternalLink className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {prescriptions.length === 0 && (
                                        <div className="p-10 text-center text-slate-400 italic">No prescriptions found.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'PRESCRIPTIONS' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">All Prescriptions</h3>
                                    <span className="text-xs font-bold text-slate-500">{prescriptions.length} Records</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {prescriptions.map((rx) => (
                                        <div key={rx.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-indigo-50/20 transition-colors">
                                            <div className="flex gap-4 items-center">
                                                <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 leading-tight">Dr. {rx.doctorName}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{rx.diagnosis}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-bold">{new Date(rx.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex w-full sm:w-auto gap-2">
                                                <button
                                                    onClick={() => setSelectedRx(rx)}
                                                    className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center"
                                                >
                                                    <ExternalLink size={16} className="mr-2" /> View Details
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {prescriptions.length === 0 && (
                                        <div className="p-12 text-center">
                                            <FileText className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                                            <p className="text-slate-500 font-medium">No medical prescriptions found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'RECORDS' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            {/* Lab Referrals */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Lab Referrals</h3>
                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{labReferrals.length}</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {labReferrals.map(lab => (
                                        <div key={lab.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-bold text-slate-900">{lab.testName}</p>
                                                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">{new Date(lab.date || Date.now()).toLocaleDateString()}</p>
                                                </div>
                                                <div className="p-2 bg-white rounded-xl text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Download size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {labReferrals.length === 0 && <p className="col-span-full py-6 text-center text-slate-400 italic">No lab referrals on record.</p>}
                                </div>
                            </div>

                            {/* Certificates */}
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Medical Certificates</h3>
                                    <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{certificates.length}</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {certificates.map(cert => (
                                        <div key={cert.id} className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100 hover:border-teal-300 transition-all">
                                            <p className="font-bold text-slate-900">{cert.type}</p>
                                            <p className="text-xs text-slate-500 mt-1">Status: <span className="text-teal-600 font-bold uppercase">{cert.status}</span></p>
                                            <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <span>Issued: {new Date(cert.issueDate).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {certificates.length === 0 && <p className="col-span-full py-6 text-center text-slate-400 italic">No medical certificates found.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedRx && (
                <PrescriptionModal
                    prescription={selectedRx}
                    onClose={() => setSelectedRx(null)}
                    isPharmacy={false}
                />
            )}

            {/* Footer Branding */}
            <div className="mt-20 py-10 border-t border-slate-100 text-center">
                <div className="flex justify-center items-center gap-3 mb-4">
                    <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <p className="font-extrabold text-slate-800 text-lg tracking-tight">e-Rx Hub <span className="text-indigo-600">Secure Portal</span></p>
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed uppercase tracking-widest font-bold">
                    End-to-End Encrypted Healthcare Ecosystem • Powered by DevXWorld
                </p>
            </div>
        </div>
    );
};
