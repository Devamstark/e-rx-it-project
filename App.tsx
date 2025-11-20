import React, { useState, useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { Login } from './components/auth/Login';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { PharmacyDashboard } from './components/pharmacy/PharmacyDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { User, UserRole, VerificationStatus, DoctorProfile, Prescription } from './types';
import { dbService } from './services/db';
import { Loader2 } from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Application State
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  // --- Initialization ---
  useEffect(() => {
      const init = async () => {
          const { users, rx } = await dbService.loadData();
          setRegisteredUsers(users);
          setPrescriptions(rx);
          setIsLoaded(true);
      };
      init();
  }, []);

  // --- Persistence Listeners ---
  // Only save when data changes AND after initial load (to prevent overwriting cloud with empty defaults)
  useEffect(() => {
      if (isLoaded) {
          dbService.saveUsers(registeredUsers);
      }
  }, [registeredUsers, isLoaded]);

  useEffect(() => {
      if (isLoaded) {
          dbService.savePrescriptions(prescriptions);
      }
  }, [prescriptions, isLoaded]);


  // Filter Verified Pharmacies for Doctor View
  const verifiedPharmacies = registeredUsers.filter(
      u => u.role === UserRole.PHARMACY && u.verificationStatus === VerificationStatus.VERIFIED
  );

  // --- Actions ---

  const handleRegister = (newUser: User) => {
    setRegisteredUsers(prev => [...prev, newUser]);
    return true;
  };

  const handleUpdateUserStatus = (userId: string, newStatus: VerificationStatus) => {
    setRegisteredUsers(prev => 
      prev.map(u => u.id === userId ? { ...u, verificationStatus: newStatus } : u)
    );
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

  const handleResetPassword = (userId: string) => {
    setRegisteredUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, forcePasswordChange: true } : u)
    );
    alert(`Temporary password sent to user ${userId}.`);
  };

  const handleCreatePrescription = (newRx: Prescription) => {
    setPrescriptions(prev => [newRx, ...prev]);
  };

  const handleDispensePrescription = (rxId: string) => {
    setPrescriptions(prev => 
        prev.map(rx => rx.id === rxId ? { ...rx, status: 'DISPENSED' } : rx)
    );
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleDoctorVerificationComplete = (profile: DoctorProfile) => {
      console.log("Verification Submitted:", profile);
      alert("Details submitted to Admin for re-verification.");
  };

  // --- Render ---

  if (!isLoaded) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                  <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4"/>
                  <p className="text-slate-500 font-medium">Connecting to DevXWorld Secure Cloud...</p>
              </div>
          </div>
      );
  }

  return (
    <Layout user={currentUser} onLogout={handleLogout}>
      {!currentUser ? (
        <Login 
          onLogin={handleLogin} 
          users={registeredUsers} 
          onRegister={handleRegister}
        />
      ) : (
        <div className="animate-in fade-in duration-500">
          {currentUser.role === UserRole.DOCTOR && (
            <DoctorDashboard 
                status={currentUser.verificationStatus} 
                onVerificationComplete={handleDoctorVerificationComplete}
                prescriptions={prescriptions}
                onCreatePrescription={handleCreatePrescription}
                currentUser={currentUser}
                verifiedPharmacies={verifiedPharmacies}
            />
          )}
          {currentUser.role === UserRole.PHARMACY && (
            <PharmacyDashboard 
                prescriptions={prescriptions}
                onDispense={handleDispensePrescription}
                currentUser={currentUser}
            />
          )}
          {currentUser.role === UserRole.ADMIN && (
            <AdminDashboard 
              users={registeredUsers}
              prescriptions={prescriptions}
              onUpdateStatus={handleUpdateUserStatus}
              onTerminateUser={handleTerminateUser}
              onResetPassword={handleResetPassword}
            />
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;