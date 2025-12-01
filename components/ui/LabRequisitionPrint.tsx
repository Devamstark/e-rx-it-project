import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { LabReferral } from '../../types';
import { Printer, X, Microscope, Download, Mail, MapPin, Phone } from 'lucide-react';

interface Props {
    referral: LabReferral;
    onClose: () => void;
}

export const LabRequisitionPrint: React.FC<Props> = ({ referral, onClose }) => {
    const origin = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
        ? window.location.origin 
        : 'https://erxdevx.vercel.app';
        
    const uploadLink = `${origin}/?mode=lab-upload&ref_id=${referral.id}`;

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        const originalTitle = document.title;
        document.title = `Lab_Requisition_${referral.patientName.replace(/\s/g, '_')}`;
        window.print();
        setTimeout(() => { document.title = originalTitle; }, 500);
    };

    const getAge = () => {
        if (referral.patientAge) return referral.patientAge;
        if (referral.patientDob) {
            const age = new Date().getFullYear() - new Date(referral.patientDob).getFullYear();
            return isNaN(age) ? 'N/A' : age;
        }
        return 'N/A';
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex justify-center backdrop-blur-sm">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 0; size: auto; }
                    html, body { height: auto; width: 100%; margin: 0 !important; padding: 0 !important; background: white; }
                    body * { visibility: hidden; }
                    #lab-requisition-print, #lab-requisition-print * { visibility: visible; }
                    #lab-requisition-print { 
                        visibility: visible !important;
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        min-height: 100%;
                        padding: 10mm !important;
                        background: white; 
                        z-index: 9999;
                        display: flex;
                        flex-direction: column;
                    }
                    .no-print { display: none !important; }
                    ::-webkit-scrollbar { display: none; }
                }
            `}} />

            <div className="w-full max-w-[210mm] flex flex-col h-full bg-white shadow-2xl relative">
                {/* Print Toolbar */}
                <div className="p-4 bg-slate-800 text-white flex justify-between items-center no-print shrink-0 shadow-md z-10">
                    <h3 className="font-bold flex items-center"><Microscope className="w-5 h-5 mr-2"/> Lab Requisition</h3>
                    <div className="flex gap-2">
                        <button onClick={handleDownload} className="bg-white border border-slate-200 text-slate-800 px-3 py-2 rounded font-bold hover:bg-slate-100 flex items-center text-sm">
                            <Download className="w-4 h-4 mr-2"/> PDF
                        </button>
                        <button onClick={handlePrint} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 flex items-center text-sm">
                            <Printer className="w-4 h-4 mr-2"/> Print
                        </button>
                        <button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 flex items-center text-sm">
                            <X className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 sm:p-8 flex justify-center">
                    
                    {/* A4 Paper */}
                    <div id="lab-requisition-print" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] flex flex-col text-slate-900 font-sans shadow-lg relative">
                        
                        {/* Header */}
                        <div className="border-b-2 border-slate-900 pb-2 mb-3 flex justify-between items-start shrink-0">
                            <div className="w-2/3">
                                <h1 className="text-lg font-black uppercase text-slate-900 mb-1 tracking-tight">Diagnostic Request</h1>
                                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-1">DevXWorld Health Network</p>
                                
                                <div className="text-[9px] text-slate-600 space-y-0.5">
                                    <p className="font-bold text-sm text-slate-800 uppercase">Dr. {referral.doctorName}</p>
                                    <p className="flex items-center"><MapPin className="w-3 h-3 mr-1 inline"/> Clinic Address: Digital Clinic, DevXWorld Network</p>
                                    <p className="flex items-center"><Phone className="w-3 h-3 mr-1 inline"/> +91 98765 43210</p>
                                </div>
                            </div>
                            <div className="text-right w-1/3">
                                <div className="bg-slate-100 border border-slate-200 p-1 rounded text-center mb-1">
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Referral ID</p>
                                    <p className="text-[10px] font-mono font-bold">{referral.id}</p>
                                </div>
                                <p className="text-[9px] text-slate-500 font-bold">Date: {new Date(referral.date).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Patient Grid (Compact) */}
                        <div className="mb-3 border border-slate-300 rounded overflow-hidden shrink-0">
                            <div className="bg-slate-100 px-3 py-1 border-b border-slate-300">
                                <h3 className="text-[9px] font-bold uppercase text-slate-600 tracking-wider">Patient Information</h3>
                            </div>
                            <div className="p-2 grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
                                <div>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Patient Name</span>
                                    <span className="text-sm font-bold text-slate-900 block">{referral.patientName}</span>
                                </div>
                                <div>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Age / Gender</span>
                                    <span className="font-medium text-slate-900 block">
                                        {getAge()} Yrs / {referral.patientGender || 'N/A'}
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Contact</span>
                                    <span className="font-medium text-slate-900 block">{referral.patientPhone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Test Details */}
                        <div className="mb-4 flex-grow">
                            <h3 className="text-[10px] font-bold uppercase text-slate-900 mb-1 border-b border-slate-900 pb-0.5 inline-block">Investigation(s) Required</h3>
                            <div className="bg-slate-50 p-3 shadow-sm border border-slate-200 rounded">
                                <p className="text-base font-bold text-slate-900 mb-2">{referral.testName}</p>
                                {referral.notes && (
                                    <div className="mt-2 pt-2 border-t border-dashed border-slate-300">
                                        <span className="text-[9px] font-bold text-slate-500 uppercase block mb-0.5">Clinical Notes:</span>
                                        <p className="text-[10px] text-slate-800 italic">{referral.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto shrink-0">
                            <div className="flex justify-between items-end border-t-2 border-slate-800 pt-2">
                                <div className="w-2/3 pr-4">
                                    <h4 className="font-bold text-slate-800 uppercase mb-1 text-[9px]">Instructions</h4>
                                    <ul className="list-disc list-inside text-[8px] text-slate-600 space-y-0.5 mb-2 leading-tight">
                                        <li>Verify patient identity.</li>
                                        <li>Standard NABL protocols apply.</li>
                                        <li><strong>Upload Reports:</strong> Scan QR or visit link.</li>
                                    </ul>
                                    <p className="text-[8px] font-mono text-indigo-700 bg-slate-50 p-1 rounded border border-slate-200 inline-block">{uploadLink}</p>
                                </div>
                                
                                <div className="w-1/3 flex flex-col items-end">
                                    <QRCodeCanvas value={uploadLink} size={48} />
                                    <p className="text-[7px] font-bold uppercase mt-1 text-slate-500">Scan to Upload</p>
                                    <div className="mt-3 text-right">
                                        <p className="text-[8px] font-bold uppercase text-slate-900">Authorized Signatory</p>
                                        <p className="text-[8px] italic text-slate-600">Dr. {referral.doctorName.split(' ').pop()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-center text-[7px] text-slate-400 border-t border-slate-100 pt-1">
                                Generated by DevXWorld e-Rx Hub • Digital Health Record System
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};