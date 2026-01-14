
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Layout } from './components/ui/Layout';
import { Login } from './components/auth/Login';
import { RxVerification } from './components/public/RxVerification';
import { LabReportUpload } from './components/public/LabReportUpload';
import { User, UserRole, VerificationStatus, DoctorProfile, Prescription, Patient, AuditLog, SalesReturn, LabReferral, Appointment, MedicalCertificate, PatientAccount } from './types';
import { dbService } from './services/db';
import { Loader2, Clock, LogOut } from 'lucide-react';
import { DocumentationViewer } from './components/ui/DocumentationViewer';

// Dynamically import dashboard components for code-splitting
const DoctorDashboard = lazy(() => import('./components/doctor/DoctorDashboard').then(module => ({ default: module.DoctorDashboard })));
const PharmacyDashboard = lazy(() => import('./components/pharmacy/PharmacyDashboard').then(module => ({ default: module.PharmacyDashboard })));
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const PatientDashboard = lazy(() => import('./components/patient/PatientDashboard').then(module => ({ default: module.PatientDashboard })));


// Session Timeout Constants
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes
const WARNING_THRESHOLD_MS = 29.5 * 60 * 1000; // 29.5 Minutes (Warning 30s before)

const LoadingFallback = () => (
    <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="ml-4 text-slate-500">Loading dashboard...</p>
    </div>
);

function App() {
    // ROUTING LOGIC
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('rx_id');
    const mode = urlParams.get('mode');
    const refId = urlParams.get('ref_id');

    // 1. Verification Route
    const isVerifyRoute = window.location.pathname === '/verify' || mode === 'verify';
    if (isVerifyRoute && verifyId) {
        return <RxVerification rxId={verifyId} />;
    }

    // 2. Lab Upload Route
    const isLabUploadRoute = mode === 'lab-upload';
    if (isLabUploadRoute && refId) {
        return <LabReportUpload refId={refId} />;
    }

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [showDocs, setShowDocs] = useState(false);

    // Application State
    const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
    const [labReferrals, setLabReferrals] = useState<LabReferral[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
    const [patientAccounts, setPatientAccounts] = useState<PatientAccount[]>([]);

    // Session Management State
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const lastActivityRef = useRef<number>(Date.now());

    // --- Session Management Logic ---
    const handleLogout = useCallback(async () => {
        // CRITICAL: LOGOUT SECURITY LOGGING
        if (currentUser) {
            await dbService.logSecurityAction(currentUser.id, 'USER_LOGOUT', 'Session terminated/Logout');
        }

        // 1. Clear Session
        setCurrentUser(null);
        localStorage.removeItem('devx_active_session_id');
        setShowSessionWarning(false);

        // 2. Clear Sensitive Memory State
        setPrescriptions([]);
        setPatients([]);
        setAuditLogs([]);
        setSalesReturns([]);
        setLabReferrals([]);
        setAppointments([]);
        setCertificates([]);
        setPatientAccounts([]);

        // NO CLOUD SIGNOUT NEEDED (Simple DB Mode)
    }, [currentUser]);

    // Idle Check Loop
    useEffect(() => {
        if (!currentUser) return;

        const resetIdleTimer = () => {
            lastActivityRef.current = Date.now();
            if (showSessionWarning) setShowSessionWarning(false);
        };

        const events = ['mousemove', 'keydown', 'scroll', 'click'];
        events.forEach(event => window.addEventListener(event, resetIdleTimer));

        const intervalId = setInterval(() => {
            const now = Date.now();
            const timeSinceLastActivity = now - lastActivityRef.current;

            if (timeSinceLastActivity >= IDLE_TIMEOUT_MS) {
                handleLogout();
                // Do not use alert(), UI feedback is sufficient or specific logout page
                // Since alert blocks thread, we avoid it for auto-logout to allow clean cleanup
            } else if (timeSinceLastActivity >= WARNING_THRESHOLD_MS) {
                setShowSessionWarning(true);
            }
        }, 5000);

        return () => {
            events.forEach(event => window.removeEventListener(event, resetIdleTimer));
            clearInterval(intervalId);
        };
    }, [currentUser, handleLogout, showSessionWarning]);


    // --- Initialization & Session Restore ---
    useEffect(() => {
        const init = async () => {
            try {
                const {
                    users, rx, patients: loadedPatients, auditLogs: loadedLogs,
                    labReferrals: loadedLabs, appointments: loadedApts,
                    certificates: loadedCerts, patientAccounts: loadedAccs,
                    salesReturns: loadedReturns
                } = await dbService.loadData();

                setRegisteredUsers(users);
                setPrescriptions(rx);
                setPatients(loadedPatients);
                setAuditLogs(loadedLogs);
                setLabReferrals(loadedLabs);
                setSalesReturns(loadedReturns);
                setAppointments(loadedApts);
                setCertificates(loadedCerts);
                setPatientAccounts(loadedAccs);

                // Restore Session
                try {
                    const storedSessionId = localStorage.getItem('devx_active_session_id');
                    if (storedSessionId) {
                        const validUser = users.find(u => u.id === storedSessionId);
                        if (validUser) {
                            if (validUser.verificationStatus === VerificationStatus.TERMINATED) {
                                localStorage.removeItem('devx_active_session_id');
                            } else {
                                setCurrentUser(validUser);
                                // Update activity ref on restore to prevent immediate timeout
                                lastActivityRef.current = Date.now();
                            }
                        } else {
                            localStorage.removeItem('devx_active_session_id');
                        }
                    }
                } catch (e) {
                    console.error("Session restore error:", e);
                }

                setIsLoaded(true);
            } catch (e) {
                console.error("Initialization Failed:", e);
                setIsLoaded(true); // Still set loaded to allow basic app function or error UI
            }
        };
        init();
    }, []);

    // --- Cloud-Only Architecture: Persistence listeners removed.
    // Actions now perform explicit cloud updates to ensure 100% cloud reliability.

    // Sync currentUser state with registeredUsers updates
    useEffect(() => {
        if (currentUser && isLoaded) {
            const freshUser = registeredUsers.find(u => u.id === currentUser.id);
            if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
                setCurrentUser(freshUser);
            }
        }
    }, [registeredUsers, currentUser, isLoaded]);


    // Filter Verified Pharmacies for Doctor View (Includes DIRECTORY listing)
    const verifiedPharmacies = registeredUsers.filter(
        u => u.role === UserRole.PHARMACY && (u.verificationStatus === VerificationStatus.VERIFIED || u.verificationStatus === VerificationStatus.DIRECTORY)
    );

    // --- Actions ---

    const handleRegister = async (newUser: User) => {
        const updated = [...registeredUsers, newUser];
        setRegisteredUsers(updated);
        await dbService.saveUsers(updated);
        return true;
    };

    // NEW: Handle adding marketing leads to directory
    const handleAddDirectoryEntry = (entry: Partial<User>) => {
        const timestamp = Date.now();
        // Generate a temporary email if not provided for key constraint
        const tempEmail = entry.email || `lead-${timestamp}@directory.temp`;

        const newLead: User = {
            id: `ph-lead-${timestamp}`,
            name: entry.name || 'Unknown Pharmacy',
            email: tempEmail,
            password: 'temp-lead-password', // Placeholder, they can't login yet
            role: UserRole.PHARMACY,
            verificationStatus: VerificationStatus.DIRECTORY,
            registrationDate: new Date().toISOString(),
            // Map marketing fields
            clinicName: entry.name,
            clinicAddress: entry.clinicAddress,
            city: entry.city,
            pincode: entry.pincode,
            phone: entry.phone,
            state: entry.state,
            licenseNumber: 'PENDING-LEAD'
        };

        setRegisteredUsers(prev => [...prev, newLead]);
        if (currentUser) {
            dbService.logSecurityAction(currentUser.id, 'DIRECTORY_LEAD_ADDED', `Added marketing lead: ${newLead.name}`);
        }
    };

    const handleUpdateUserStatus = async (userId: string, newStatus: VerificationStatus) => {
        const updated = registeredUsers.map(u => u.id === userId ? { ...u, verificationStatus: newStatus } : u);
        setRegisteredUsers(updated);
        await dbService.saveUsers(updated);
    };

    const handleUpdateUser = async (updatedUser: User) => {
        setRegisteredUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        await dbService.updateUser(updatedUser);
    };

    const handleTerminateUser = (userId: string, reason: string) => {
        setRegisteredUsers(prev =>
            prev.map(u => u.id === userId ? {
                ...u,
                verificationStatus: VerificationStatus.TERMINATED,
                terminatedAt: new Date().toISOString(),
                terminatedBy: currentUser?.id || 'SYSTEM',
                terminationReason: reason
            } : u)
        );
    };

    const handleDeleteUser = async (userId: string) => {
        setRegisteredUsers(prev => prev.filter(u => u.id !== userId));
        await dbService.deleteUser(userId);
    };

    const handleResetPassword = async (userId: string) => {
        const tempPassword = Math.random().toString(36).slice(-8);
        const updated = registeredUsers.map(u => u.id === userId ? { ...u, password: tempPassword, forcePasswordChange: true } : u);
        setRegisteredUsers(updated);
        await dbService.saveUsers(updated);
        alert(`PASSWORD RESET SUCCESSFUL\n\nUser ID: ${userId}\nTemporary Password: ${tempPassword}\n\nPlease copy and share this password securely with the user.`);
    };

    const handleCreatePrescription = async (rxData: Prescription) => {
        console.log("App: Creating Prescription...", rxData);
        const currentCount = prescriptions.length + 1;
        const sequentialId = currentCount.toString().padStart(9, '0');

        // Check if patient info is missing and try to patch it (redundancy check)
        let finalPatientName = rxData.patientName;
        if (!finalPatientName && rxData.patientId) {
            const p = patients.find(pat => pat.id === rxData.patientId);
            if (p) finalPatientName = p.fullName;
        }
        if (!finalPatientName) finalPatientName = 'Unknown Patient';

        const newRxWithId: Prescription = {
            ...rxData,
            patientName: finalPatientName,
            id: sequentialId
        };

        const updated = [newRxWithId, ...prescriptions];
        setPrescriptions(updated);
        await dbService.savePrescriptions(updated);

        // Log Security Action with Correct ID
        if (currentUser) {
            await dbService.logSecurityAction(
                currentUser.id,
                'RX_CREATED',
                `Rx #${sequentialId} SENT_TO_PHARMACY (${newRxWithId.pharmacyName}) for ${newRxWithId.patientName}`
            );
        }
    };

    const handleDispensePrescription = async (rxId: string, patientId?: string) => {
        const updated = prescriptions.map(rx => rx.id === rxId ? {
            ...rx,
            status: 'DISPENSED' as const,
            patientId: patientId || rx.patientId
        } : rx);
        setPrescriptions(updated);
        await dbService.savePrescriptions(updated);
    };

    const handleRejectPrescription = async (rxId: string, reason: string = 'REJECTED') => {
        const updated = prescriptions.map(rx => rx.id === rxId ? { ...rx, status: reason as any } : rx);
        setPrescriptions(updated);
        await dbService.savePrescriptions(updated);
    };

    const handleAddPatient = async (patient: Patient) => {
        const updated = [...patients, patient];
        setPatients(updated);
        await dbService.savePatients(updated);
    };

    const handleUpdatePatient = async (updatedPatient: Patient) => {
        const updated = patients.map(p => p.id === updatedPatient.id ? updatedPatient : p);
        setPatients(updated);
        await dbService.savePatients(updated);
    };

    const handleAddLabReferral = async (referral: LabReferral) => {
        const updated = [referral, ...labReferrals];
        setLabReferrals(updated);
        await dbService.saveLabReferrals(updated);
        if (currentUser) {
            await dbService.logSecurityAction(currentUser.id, 'LAB_REQ_INITIATED', `Referral created for ${referral.patientName} (${referral.testName})`);
        }
    };

    const handleDeleteLabReferral = (refId: string) => {
        const ref = labReferrals.find(r => r.id === refId);
        setLabReferrals(prev => prev.filter(r => r.id !== refId));
        if (currentUser && ref) {
            dbService.logSecurityAction(currentUser.id, 'LAB_REFERRAL_DELETED', `Deleted referral for ${ref.patientName} (${ref.testName})`);
        }
    };

    // Appointment Handlers with Logging
    const handleAddAppointment = async (apt: Appointment) => {
        const updated = [...appointments, apt];
        setAppointments(updated);
        await dbService.saveAppointments(updated);
        if (currentUser) {
            await dbService.logSecurityAction(currentUser.id, 'APPOINTMENT_SCHEDULED', `Patient: ${apt.patientName} on ${apt.date}`);
        }
    };

    const handleDeleteAppointment = async (aptId: string) => {
        const apt = appointments.find(a => a.id === aptId);
        const updated = appointments.filter(a => a.id !== aptId);
        setAppointments(updated);
        await dbService.saveAppointments(updated);
        if (currentUser && apt) {
            await dbService.logSecurityAction(currentUser.id, 'APPOINTMENT_DELETED', `Cancelled: ${apt.patientName} (${apt.date})`);
        }
    };

    const handleLogin = async (user: User) => {
        // 1. Authenticate Supabase client for RLS (CRITICAL - must happen before redirection)
        if (user.email && user.password) {
            await dbService.login(user.email, user.password);
        }

        // 2. Immediate UI Transition
        setCurrentUser(user);
        localStorage.setItem('devx_active_session_id', user.id);
        lastActivityRef.current = Date.now();

        // 3. Background Data Refresh
        // We catch the data in background; dashboards have their own effects but this keeps global sync
        dbService.loadData().then(({ auditLogs: freshLogs, patients: freshPatients, rx: freshRx, appointments: freshApts, patientAccounts: freshAccs }) => {
            setAuditLogs(freshLogs);
            if (freshPatients.length > 0) setPatients(freshPatients);
            if (freshRx.length > 0) setPrescriptions(freshRx);
            if (freshApts.length > 0) setAppointments(freshApts);
            if (freshAccs && freshAccs.length > 0) setPatientAccounts(freshAccs);
        }).catch(err => console.error("Background sync failed:", err));
    };

    const handleDoctorVerificationComplete = (profile: DoctorProfile) => {
        if (!currentUser) return;

        const updatedUser: User = {
            ...currentUser,
            verificationStatus: VerificationStatus.PENDING,
            licenseNumber: profile.registrationNumber,
            state: profile.state,
            qualifications: profile.qualifications,
            nmrUid: profile.nmrUid,
            specialty: profile.specialty,
            clinicName: profile.clinicName,
            clinicAddress: profile.clinicAddress,
            city: profile.city,
            pincode: profile.pincode,
            phone: profile.phone,
            fax: profile.fax,
            stateCouncil: profile.stateCouncil,
            documents: profile.documents
        };

        handleUpdateUser(updatedUser);
        alert("Details submitted to Admin for re-verification.");
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Connecting to DevXWorld Secure Cloud...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Layout user={currentUser} onLogout={handleLogout} onOpenDocs={() => setShowDocs(true)}>
                {!currentUser ? (
                    <Login
                        onLogin={handleLogin}
                        users={registeredUsers}
                        onRegister={handleRegister}
                    />
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <Suspense fallback={<LoadingFallback />}>
                            {currentUser.role === UserRole.DOCTOR && (
                                <DoctorDashboard
                                    status={currentUser.verificationStatus}
                                    onVerificationComplete={handleDoctorVerificationComplete}
                                    prescriptions={prescriptions}
                                    onCreatePrescription={handleCreatePrescription}
                                    currentUser={currentUser}
                                    verifiedPharmacies={verifiedPharmacies}
                                    patients={patients}
                                    onAddPatient={handleAddPatient}
                                    onUpdatePatient={handleUpdatePatient}
                                    labReferrals={labReferrals}
                                    onAddLabReferral={handleAddLabReferral}
                                    onDeleteLabReferral={handleDeleteLabReferral}
                                    appointments={appointments}
                                    onUpdateAppointment={(apt) => setAppointments(prev => prev.map(a => a.id === apt.id ? apt : a))}
                                    onAddAppointment={handleAddAppointment}
                                    onDeleteAppointment={handleDeleteAppointment}
                                    certificates={certificates}
                                    onAddCertificate={(cert) => setCertificates(prev => [cert, ...prev])}
                                />
                            )}
                            {currentUser.role === UserRole.PHARMACY && (
                                <PharmacyDashboard
                                    prescriptions={prescriptions}
                                    onDispense={handleDispensePrescription}
                                    onReject={handleRejectPrescription}
                                    currentUser={currentUser}
                                    onUpdateUser={handleUpdateUser}
                                    salesReturns={salesReturns}
                                    onAddSalesReturn={(ret) => setSalesReturns(prev => [ret, ...prev])}
                                />
                            )}
                            {currentUser.role === UserRole.ADMIN && (
                                <AdminDashboard
                                    users={registeredUsers}
                                    prescriptions={prescriptions}
                                    onUpdateStatus={handleUpdateUserStatus}
                                    onTerminateUser={handleTerminateUser}
                                    onDeleteUser={handleDeleteUser}
                                    onResetPassword={handleResetPassword}
                                    onEditUser={handleUpdateUser}
                                    auditLogs={auditLogs}
                                    onAddDirectoryEntry={handleAddDirectoryEntry}
                                    patientAccounts={patientAccounts}
                                />
                            )}
                            {currentUser.role === UserRole.PATIENT && (
                                <PatientDashboard
                                    currentUser={currentUser}
                                    onLogout={handleLogout}
                                />
                            )}
                        </Suspense>
                    </div>
                )}
            </Layout>

            {/* Documentation Overlay */}
            {showDocs && (
                <DocumentationViewer onClose={() => setShowDocs(false)} />
            )}

            {/* Session Warning Modal */}
            {showSessionWarning && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in zoom-in-95">
                    <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center border-2 border-amber-400">
                        <Clock className="w-12 h-12 mx-auto text-amber-500 mb-3 animate-pulse" />
                        <h3 className="text-lg font-bold text-slate-900">Session Expiring</h3>
                        <p className="text-slate-600 my-2">Your secure session will expire in less than 30 seconds due to inactivity.</p>
                        <p className="text-xs text-slate-500 mb-4">Move your mouse or click to stay logged in.</p>
                        <button
                            onClick={() => handleLogout()}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold flex items-center justify-center"
                        >
                            <LogOut className="w-4 h-4 mr-2" /> Logout Now
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;