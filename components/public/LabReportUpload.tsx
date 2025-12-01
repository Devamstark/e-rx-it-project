
import React, { useEffect, useState } from 'react';
import { LabReferral } from '../../types';
import { dbService } from '../../services/db';
import { Loader2, AlertCircle, FileText, Upload, CheckCircle2, User, Microscope, Lock, ArrowRight, ShieldCheck, Calendar, Clock } from 'lucide-react';

interface Props {
    refId: string;
}

export const LabReportUpload: React.FC<Props> = ({ refId }) => {
    const [referral, setReferral] = useState<LabReferral | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [success, setSuccess] = useState(false);
    
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        const fetchRef = async () => {
            try {
                // SANITIZATION: Clean the refId.
                const cleanRefId = refId ? refId.split(' ')[0].trim() : '';

                const data = await dbService.getPublicLabReferral(cleanRefId);
                if (data) {
                    setReferral(data);
                } else {
                    setError('Referral not found or invalid ID.');
                }
            } catch (e) {
                setError('Unable to fetch referral details. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchRef();
    }, [refId]);

    const handleUpload = async () => {
        if (!file || !referral) return;
        setUploading(true);
        try {
            const url = await dbService.uploadFile(file);
            const updatedRef: LabReferral = {
                ...referral,
                status: 'COMPLETED',
                reportUrl: url
            };
            await dbService.updateLabReferral(updatedRef);
            
            // SECURITY COMPLIANCE: Log the upload event to the central audit trail
            await dbService.logSecurityAction(
                'LAB_PORTAL_GUEST', 
                'LAB_REPORT_UPLOADED', 
                `External Upload: Report attached for Patient ${referral.patientName} (Ref: ${referral.id})`
            );

            setSuccess(true);
        } catch (err: any) {
            alert("Upload Failed: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (accessCode === '0000') {
            setIsAuthenticated(true);
            setAuthError('');
        } else {
            setAuthError('Invalid Access Code');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4"/>
                    <p className="text-slate-600 font-medium">Connecting to Secure Health Network...</p>
                </div>
            </div>
        );
    }

    if (error || !referral) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-t-4 border-red-500">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4"/>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-600 mb-4">{error}</p>
                </div>
            </div>
        );
    }

    // AUTH SCREEN - BRANDED
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
                    <div className="bg-indigo-900 p-8 text-center relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute top-0 left-0 w-full h-full opacity-10">
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white rounded-full -mr-10 -mt-10 blur-xl"></div>
                            <div className="absolute left-0 bottom-0 w-24 h-24 bg-teal-400 rounded-full -ml-10 -mb-10 blur-xl"></div>
                        </div>
                        
                        <div className="relative z-10">
                            <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                                <ShieldCheck className="w-8 h-8 text-teal-300"/>
                            </div>
                            <h1 className="text-xl font-bold text-white tracking-wide">DevXWorld e-Rx Hub</h1>
                            <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mt-1">Secure Health Network</p>
                        </div>
                    </div>
                    
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-slate-800 font-bold text-lg">Lab Portal Access</h2>
                            <p className="text-slate-500 text-sm">Authorized Personnel Only</p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-center">Enter Access PIN</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400"/>
                                    <input 
                                        type="password" 
                                        maxLength={4}
                                        className="w-full text-center text-3xl font-bold tracking-[0.5em] border-2 border-slate-200 rounded-xl p-3 focus:border-indigo-600 focus:ring-0 outline-none text-slate-800 pl-10 placeholder-slate-200"
                                        placeholder="••••"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            {authError && (
                                <div className="flex items-center justify-center text-xs text-red-600 font-bold bg-red-50 p-2 rounded">
                                    <AlertCircle className="w-4 h-4 mr-1"/> {authError}
                                </div>
                            )}
                            <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-200 transition-all active:scale-95">
                                Verify & Proceed <ArrowRight className="w-4 h-4 ml-2"/>
                            </button>
                        </form>
                        <p className="text-center text-[10px] text-slate-400 mt-6">
                            Encrypted Connection • IP Logged
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // SUCCESS STATE
    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100 animate-in fade-in zoom-in-95">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600"/>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Report Uploaded</h1>
                    <p className="text-slate-600 mb-6">The diagnostic report has been securely encrypted and attached to the patient's record.</p>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left text-sm mb-6">
                        <p><span className="text-slate-500">Ref ID:</span> <span className="font-mono font-bold">{referral.id}</span></p>
                        <p><span className="text-slate-500">Patient:</span> <span className="font-bold">{referral.patientName}</span></p>
                    </div>
                    <button onClick={() => window.close()} className="text-indigo-600 font-bold hover:underline text-sm">Close Window</button>
                </div>
            </div>
        );
    }

    // MAIN UPLOAD INTERFACE
    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4">
                
                {/* Header */}
                <div className="bg-white border-b border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 text-white p-2 rounded-lg">
                            <Microscope className="w-6 h-6"/>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Lab Report Upload</h1>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">DevXWorld Secure Health Network</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-400 font-mono">ID: {referral.id}</p>
                        <div className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded border border-green-100 mt-1">
                            <Lock className="w-3 h-3 mr-1"/> Session Secure
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Left: Details Panel */}
                    <div className="md:col-span-2 space-y-6">
                        
                        {/* Patient Card */}
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <User className="w-24 h-24 text-slate-900"/>
                            </div>
                            
                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center">
                                <User className="w-4 h-4 mr-2"/> Patient Information
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-y-4 gap-x-8 relative z-10">
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Full Name</p>
                                    <p className="text-lg font-bold text-slate-900">{referral.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Age / Gender</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {referral.patientAge ? `${referral.patientAge} Yrs` : 'N/A'} / {referral.patientGender || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold flex items-center">
                                        <Calendar className="w-3 h-3 mr-1"/> Date of Birth
                                    </p>
                                    <p className="text-sm font-medium text-slate-700">
                                        {referral.patientDob ? new Date(referral.patientDob).toLocaleDateString() : 'Not Provided'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Contact</p>
                                    <p className="text-sm font-medium text-slate-700">{referral.patientPhone || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Test Request Details */}
                        <div className="border border-indigo-100 rounded-xl p-5 bg-indigo-50/50">
                            <h3 className="text-xs font-bold text-indigo-400 uppercase mb-4 flex items-center">
                                <FileText className="w-4 h-4 mr-2"/> Requisition Details
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Requested Investigation</p>
                                    <p className="text-xl font-bold text-indigo-900">{referral.testName}</p>
                                </div>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1"/> Requested Date</p>
                                        <p className="font-bold text-slate-700">{new Date(referral.date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Referring Doctor</p>
                                        <p className="font-bold text-slate-700">Dr. {referral.doctorName}</p>
                                    </div>
                                </div>
                                {referral.notes && (
                                    <div className="pt-3 border-t border-indigo-100 mt-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Clinical Notes</p>
                                        <p className="text-sm text-slate-600 italic">{referral.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Upload Panel */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 h-full flex flex-col items-center justify-center text-center transition-colors hover:border-indigo-400 hover:bg-slate-50">
                            {referral.status === 'COMPLETED' ? (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="w-8 h-8"/>
                                    </div>
                                    <h3 className="font-bold text-slate-800">Report Uploaded</h3>
                                    <p className="text-xs text-slate-500 mt-2">A report is already attached to this record.</p>
                                </div>
                            ) : (
                                <>
                                    <input 
                                        type="file" 
                                        id="file-upload" 
                                        className="hidden" 
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => e.target.files && setFile(e.target.files[0])}
                                    />
                                    
                                    {!file ? (
                                        <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                                                <Upload className="w-8 h-8"/>
                                            </div>
                                            <span className="font-bold text-slate-700 text-lg">Upload Report</span>
                                            <span className="text-xs text-slate-400 mt-2 px-4">
                                                Click to browse PDF or Image files
                                            </span>
                                            <span className="text-[10px] text-slate-400 mt-4 uppercase font-bold bg-slate-100 px-2 py-1 rounded">Max 5MB</span>
                                        </label>
                                    ) : (
                                        <div className="w-full">
                                            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-8 h-8"/>
                                            </div>
                                            <p className="font-bold text-slate-800 truncate px-2">{file.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            
                                            <div className="mt-6 space-y-3">
                                                <button 
                                                    onClick={handleUpload}
                                                    disabled={uploading}
                                                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-md flex items-center justify-center disabled:opacity-70"
                                                >
                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                                                    Confirm Upload
                                                </button>
                                                <button 
                                                    onClick={() => setFile(null)}
                                                    className="w-full text-slate-500 text-xs font-bold hover:text-red-500"
                                                >
                                                    Change File
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                </div>
                
                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
                    <p>DevXWorld Secure Health Network • Compliance: DPDP Act 2023</p>
                    <p className="mt-2 md:mt-0 flex items-center">
                        <Lock className="w-3 h-3 mr-1"/> End-to-End Encrypted
                    </p>
                </div>
            </div>
        </div>
    );
};
