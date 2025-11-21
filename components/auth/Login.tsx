
import React, { useState } from 'react';
import { UserRole, User, VerificationStatus, DocumentType, UserDocument } from '../../types';
import { Shield, ArrowRight, Loader2, AlertCircle, CheckCircle2, Building2, Stethoscope, CheckSquare, Upload } from 'lucide-react';
import { dbService } from '../../services/db';

interface LoginProps {
  onLogin: (user: User) => void;
  users: User[];
  onRegister: (user: User) => boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, users, onRegister }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.DOCTOR);
  const [step, setStep] = useState<'CREDENTIALS' | 'OTP'>('CREDENTIALS');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // Registration additional fields
  const [regName, setRegName] = useState('');
  const [regLicense, setRegLicense] = useState('');
  const [regState, setRegState] = useState('');
  const [agreeConsent, setAgreeConsent] = useState(false);
  
  // File Upload State for Pharmacy
  const [uploadedDoc, setUploadedDoc] = useState<UserDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setOtp('');
    setRegName('');
    setRegLicense('');
    setRegState('');
    setAgreeConsent(false);
    setUploadedDoc(null);
    setError('');
    setStatusMessage('');
    setStep('CREDENTIALS');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsUploading(true);
          try {
              const url = await dbService.uploadFile(file);
              const doc: UserDocument = {
                  id: `doc-${Date.now()}`,
                  type: DocumentType.PHARMACY_LICENSE,
                  name: file.name,
                  url: url,
                  uploadedAt: new Date().toISOString()
              };
              setUploadedDoc(doc);
              setError("");
          } catch (err: any) {
              setError(err.message || "File upload failed");
          } finally {
              setIsUploading(false);
          }
      }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!agreeConsent) {
        setError("You must consent to data processing under DPDP Act 2023.");
        setLoading(false);
        return;
    }

    // Check if user exists
    if (users.some(u => u.email === email)) {
        setError("User with this email/username already exists.");
        setLoading(false);
        return;
    }

    // Pharmacy Document Check
    if (selectedRole === UserRole.PHARMACY && !uploadedDoc) {
        setError("Please upload your Pharmacy License (Form 20/21) for verification.");
        setLoading(false);
        return;
    }

    const documents = uploadedDoc ? [uploadedDoc] : [];

    const newUser: User = {
        id: `${selectedRole === UserRole.DOCTOR ? 'DOC' : 'PH'}-${Date.now()}`,
        name: regName,
        email: email,
        password: password,
        role: selectedRole,
        verificationStatus: VerificationStatus.PENDING,
        registrationDate: new Date().toISOString(),
        licenseNumber: regLicense,
        state: regState,
        documents: documents
    };

    setTimeout(() => {
        onRegister(newUser);
        setLoading(false);
        setMode('LOGIN');
        setStatusMessage("Registration Successful! Your account is pending Admin Approval.");
        resetForm();
    }, 1000);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatusMessage('');

    // Authenticate
    const user = users.find(u => u.email === email && u.password === password && u.role === selectedRole);

    if (user) {
        // Check Status
        if (user.verificationStatus === VerificationStatus.PENDING) {
            setLoading(false);
            setStatusMessage("Your account is currently Under Review by DevXWorld Admins. Please check back later.");
            return;
        }
        if (user.verificationStatus === VerificationStatus.REJECTED) {
            setLoading(false);
            setError("Your application was Rejected. Access Denied.");
            return;
        }
        if (user.verificationStatus === VerificationStatus.TERMINATED) {
            setLoading(false);
            setError("Your account has been Terminated due to compliance violations.");
            return;
        }

        // Proceed to OTP
        setTimeout(() => {
          setLoading(false);
          setStep('OTP');
        }, 800);
    } else {
        setLoading(false);
        setError("Invalid Credentials or Role selection.");
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Special OTP logic for Admin
    if (selectedRole === UserRole.ADMIN) {
        if (otp !== '000000') {
            setLoading(false);
            setError("Invalid OTP for Admin Access.");
            return;
        }
    }

    // For prototype, accept any 6 digits for others, but enforce check
    if (otp.length !== 6) {
        setLoading(false);
        setError("OTP must be 6 digits.");
        return;
    }

    const user = users.find(u => u.email === email);
    
    setTimeout(() => {
      setLoading(false);
      if (user) onLogin(user);
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200 relative">
       
      <div className="bg-indigo-50 p-6 border-b border-indigo-100">
        <h2 className="text-2xl font-bold text-indigo-900 text-center">DevXWorld Secure Portal</h2>
        <p className="text-center text-indigo-600 text-sm mt-1">
            {mode === 'LOGIN' ? 'Secure Login & Verification' : 'New Member Registration'}
        </p>
      </div>

      {/* Mode Toggle */}
      {selectedRole !== UserRole.ADMIN && (
        <div className="flex text-sm border-b border-slate-200">
            <button 
                onClick={() => { setMode('LOGIN'); resetForm(); }}
                className={`flex-1 py-3 text-center font-medium ${mode === 'LOGIN' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-500 bg-slate-50'}`}
            >
                Existing User Login
            </button>
            <button 
                onClick={() => { setMode('REGISTER'); resetForm(); }}
                className={`flex-1 py-3 text-center font-medium ${mode === 'REGISTER' ? 'text-indigo-600 bg-white border-b-2 border-indigo-600' : 'text-slate-500 bg-slate-50'}`}
            >
                New Registration
            </button>
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex border-b border-slate-200 mt-0">
        {[UserRole.DOCTOR, UserRole.PHARMACY, UserRole.ADMIN].map((role) => (
          <button
            key={role}
            onClick={() => { 
                // Admin cannot register via UI
                if (mode === 'REGISTER' && role === UserRole.ADMIN) {
                    alert("Admin accounts can only be created by Super Admins.");
                    return;
                }
                setSelectedRole(role); 
                resetForm();
            }}
            className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${
              selectedRole === role 
                ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' 
                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
            }`}
          >
            {role === UserRole.DOCTOR && <span className="flex items-center justify-center"><Stethoscope className="w-3 h-3 mr-1"/> DOCTOR</span>}
            {role === UserRole.PHARMACY && <span className="flex items-center justify-center"><Building2 className="w-3 h-3 mr-1"/> PHARMACY</span>}
            {role === UserRole.ADMIN && <span className="flex items-center justify-center"><Shield className="w-3 h-3 mr-1"/> ADMIN</span>}
          </button>
        ))}
      </div>

      <div className="p-8">
        {statusMessage && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded flex items-start border border-blue-200">
                <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
                {statusMessage}
            </div>
        )}
        
        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded flex items-start border border-red-200">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
            </div>
        )}

        {mode === 'LOGIN' ? (
            step === 'CREDENTIALS' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username / Email</label>
                <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder={selectedRole === UserRole.ADMIN ? 'admin' : 'email@example.com'}
                />
                </div>

                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                />
                </div>

                <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-70"
                >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : (
                    <>Proceed Securely <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
                </button>
            </form>
            ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="text-center mb-4">
                <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-2" />
                <h3 className="text-lg font-medium text-slate-900">2FA Verification</h3>
                <p className="text-sm text-slate-500">
                    {selectedRole === UserRole.ADMIN 
                        ? "Enter secure Admin OTP (000000)" 
                        : "Enter OTP sent to your registered mobile"}
                </p>
                </div>

                <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full text-center tracking-[0.5em] text-2xl font-bold py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••"
                />

                <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-70"
                >
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify & Login'}
                </button>
                <button type="button" onClick={() => setStep('CREDENTIALS')} className="w-full text-xs text-indigo-600 mt-2 hover:underline">Back</button>
            </form>
            )
        ) : (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Full Name / Establishment Name</label>
                    <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm"
                        placeholder={selectedRole === UserRole.DOCTOR ? "Dr. First Last" : "Apollo Pharmacy"}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">
                        {selectedRole === UserRole.DOCTOR ? 'Medical Registration No.' : 'Pharmacy License (Form 20/21/20B/21B)'}
                    </label>
                    <input
                        type="text"
                        required
                        value={regLicense}
                        onChange={(e) => setRegLicense(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm"
                        placeholder={selectedRole === UserRole.PHARMACY ? "e.g. DL-20B-12345" : ""}
                    />
                </div>
                
                {/* Pharmacy Document Upload */}
                {selectedRole === UserRole.PHARMACY && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Upload License Document</label>
                        <div className="flex items-center space-x-2">
                            <label className={`cursor-pointer flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                                {uploadedDoc ? 'Change File' : 'Choose File'}
                                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
                            </label>
                            {uploadedDoc && (
                                <span className="text-xs text-green-600 flex items-center">
                                    <CheckCircle2 className="w-3 h-3 mr-1"/> Uploaded
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Form 20/21 (Max 5MB, PDF/JPG)</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700">State</label>
                    <input
                        type="text"
                        required
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Create Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 rounded-md sm:text-sm"
                    />
                </div>

                {/* DPDP Act Consent */}
                <div className="flex items-start pt-2">
                    <div className="flex items-center h-5">
                        <input
                            id="consent"
                            type="checkbox"
                            checked={agreeConsent}
                            onChange={(e) => setAgreeConsent(e.target.checked)}
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                    </div>
                    <div className="ml-2 text-xs">
                        <label htmlFor="consent" className="font-medium text-slate-700">DPDP Act 2023 Consent</label>
                        <p className="text-slate-500">I explicitly consent to the collection and processing of my personal/professional data for the purpose of e-Prescription services as per the Digital Personal Data Protection Act, 2023.</p>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || (selectedRole === UserRole.PHARMACY && !uploadedDoc)}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Submit Application'}
                </button>
                <p className="text-xs text-slate-500 text-center mt-2">Your account will require Admin approval before login.</p>
            </form>
        )}
      </div>
      <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 text-center">
        Compliance: DPDP Act 2023 & Telemedicine Guidelines 2020.
      </div>
    </div>
  );
};
