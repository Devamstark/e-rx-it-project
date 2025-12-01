import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Prescription, Patient, User, DoctorDetailsSnapshot } from '../../types';
import { Printer, QrCode, ShieldCheck, FileText, Download, ArrowLeft } from 'lucide-react';

interface Props {
  prescription: Prescription;
  doctor: User | DoctorDetailsSnapshot | any; // Accommodate User or DoctorDetailsSnapshot
  patient: Patient;
  pharmacy?: User;
  onPrint?: () => void;
  onGenerateQR?: () => void;
}

const getFrequencyDescription = (freq: string): string => {
    if (!freq) return '';
    const clean = freq.trim().toUpperCase();
    if (clean === '1-0-0' || clean === '1' || clean === 'OD') return 'Once a day (Morning)';
    if (clean === '0-0-1' || clean === 'HS') return 'Once a day (Night)';
    if (clean === '1-0-1' || clean === 'BD' || clean === 'BID') return 'Twice a day';
    if (clean === '1-1-1' || clean === 'TDS' || clean === 'TID') return 'Thrice a day';
    if (clean === '1-1-1-1' || clean === 'QID') return 'Four times a day';
    if (clean === 'SOS') return 'As needed';
    if (clean === 'STAT') return 'Immediately';
    if (clean === '0-1-0') return 'Once a day (Afternoon)';
    // Handle patterns like 1-1-1
    if (/^\d+(-\d+)+$/.test(clean)) {
       const sum = clean.split('-').reduce((a,b) => a + (parseInt(b)||0), 0);
       return `${sum} times a day`;
    }
    return '';
};

const parseDuration = (duration: string) => {
    if (!duration) return { display: '', days: 0 };
    const clean = duration.trim();
    // If just a number, assume days
    if (/^\d+$/.test(clean)) {
        return { display: `${clean} Days`, days: parseInt(clean, 10) };
    }
    // Try to extract number if string like "5 days"
    const match = clean.match(/^(\d+)/);
    const days = match ? parseInt(match[1], 10) : 0;
    
    // Adjust logic if unit is weeks or months (simple approximation)
    if (clean.toLowerCase().includes('week')) return { display: clean, days: days * 7 };
    if (clean.toLowerCase().includes('month')) return { display: clean, days: days * 30 };
    
    return { display: clean, days: days };
};

const calculateTotalQty = (freq: string, durationDays: number) => {
    if (!freq || !durationDays) return '-';
    const clean = freq.trim().toUpperCase();
    let daily = 0;
    
    // Check pattern X-X-X
    if (/^\d+(-\d+)+$/.test(clean)) {
        daily = clean.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
    } else {
        if (['OD','1','HS','0-0-1','1-0-0','0-1-0'].includes(clean)) daily = 1;
        else if (['BD','BID','1-0-1'].includes(clean)) daily = 2;
        else if (['TDS','TID','1-1-1'].includes(clean)) daily = 3;
        else if (['QID','1-1-1-1'].includes(clean)) daily = 4;
        else if (clean === 'STAT') daily = 1; // 1 dose
    }
    
    if (daily === 0) return '-';
    return daily * durationDays;
};

export const InsuranceReadyRxPrintLayout: React.FC<Props> = ({
  prescription,
  doctor,
  patient,
  pharmacy,
  onPrint,
  onGenerateQR
}) => {
  const [showQR, setShowQR] = useState(true);
  const [policyNo, setPolicyNo] = useState('');
  const [claimId, setClaimId] = useState('');
  const [dispenseAsWritten, setDispenseAsWritten] = useState(false);

  // Generate verification URL dynamically based on current origin, defaulting to production
  const origin = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://erxdevx.vercel.app';
  const verificationUrl = `${origin}/?mode=verify&rx_id=${prescription.id}`;

  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  const handleDownload = () => {
      // Temporarily change title to ensure "Save as PDF" uses a good filename
      const originalTitle = document.title;
      const safeName = patient.fullName.replace(/[^a-z0-9]/gi, '_');
      document.title = `Rx_${safeName}_${prescription.id}`;
      
      window.print();
      
      // Revert title after print dialog closes (approximate timing)
      setTimeout(() => {
          document.title = originalTitle;
      }, 500);
  };

  const handleGenerateQR = () => {
      setShowQR(!showQR);
      if (onGenerateQR) onGenerateQR();
  };

  // Determine patient age string safely
  const patientAgeStr = patient.dateOfBirth 
    ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs`
    : (prescription.patientAge ? `${prescription.patientAge} Yrs` : 'N/A');

  // Use snapshot data from Prescription if available, otherwise fallback to patient prop
  const displayAddress = prescription.patientAddress || patient.address || 'N/A';
  const displayPhone = prescription.patientPhone || patient.phone || 'N/A';
  const displayDOB = prescription.patientDOB || patient.dateOfBirth;

  // Safely handle doctor object structure which might vary between User and Snapshot
  const docName = doctor.name || doctor.doctorName;
  const docQual = doctor.qualifications || 'MBBS';
  const docReg = doctor.licenseNumber || doctor.registrationNumber || doctor.reg_no || 'Pending';
  const docAddress = doctor.clinicAddress || doctor.address || '';
  const docCity = doctor.city || '';
  const docPhone = doctor.phone || '';

  return (
    <div className="bg-gray-100 p-4 sm:p-8 min-h-screen flex flex-col items-center">
        {/* Print Styles Injection */}
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                @page { margin: 5mm; size: auto; }
                html, body { height: 100%; margin: 0 !important; padding: 0 !important; }
                body * { visibility: hidden; }
                #insurance-rx-print-container, #insurance-rx-print-container * { visibility: visible; }
                #insurance-rx-print-container { 
                    visibility: visible !important;
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    min-height: 100%;
                    margin: 0; 
                    padding: 0;
                    background: white;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                }
                .no-print { display: none !important; }
                input[type="text"] { border: none; padding: 0; }
            }
        `}} />

        {/* Toolbar - Hidden on Print */}
        <div className="w-full max-w-4xl mb-6 flex flex-col sm:flex-row justify-between items-center no-print gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600"/> Official Print Mode
            </h2>
            <div className="flex flex-wrap gap-2">
                <button 
                    onClick={handleGenerateQR}
                    className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-medium hover:bg-slate-50 text-slate-700 transition-colors"
                >
                    <QrCode className="w-4 h-4 mr-2"/> {showQR ? 'Hide QR' : 'Show QR'}
                </button>
                <button 
                    onClick={handleDownload}
                    className="flex items-center px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-md text-sm font-bold hover:bg-indigo-50 shadow-sm transition-colors"
                >
                    <Download className="w-4 h-4 mr-2"/> Download PDF
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Printer className="w-4 h-4 mr-2"/> Print
                </button>
            </div>
        </div>

        {/* Paper Container - Responsive Width for Screen, Full Width for Print */}
        <div 
            id="insurance-rx-print-container"
            className="bg-white w-full max-w-[210mm] min-h-[297mm] p-8 shadow-2xl relative text-slate-900 box-border mx-auto flex flex-col"
        >
            {/* Header: Clinic & Doctor Info */}
            <header className="border-b-2 border-slate-800 pb-2 mb-2 flex justify-between items-start shrink-0">
                <div className="w-7/12 pr-4">
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 leading-tight mb-1 font-serif">
                        {doctor.clinicName || 'Clinic Name'}
                    </h1>
                    <div className="text-[10px] text-slate-600 leading-relaxed font-sans space-y-0.5">
                        <p>{docAddress}</p>
                        <p>{docCity} {doctor.state ? `, ${doctor.state}` : ''} {doctor.pincode ? '- ' + doctor.pincode : ''}</p>
                        <p className="font-bold flex gap-4">
                            <span>Phone: {docPhone}</span>
                            {doctor.email && <span>Email: {doctor.email}</span>}
                        </p>
                    </div>
                </div>
                <div className="w-5/12 text-right font-sans pl-4 border-l border-slate-200">
                    <h2 className="text-base font-bold text-slate-800">Dr. {docName}</h2>
                    <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">{docQual}</p>
                    <p className="text-[10px] font-medium text-indigo-700 mb-1">{doctor.specialty || 'General Physician'}</p>
                    
                    <div className="text-[9px] space-y-0.5 text-slate-600">
                        <p><span className="font-bold">Reg No:</span> {docReg}</p>
                        <p><span className="font-bold">NMC UID:</span> {doctor.nmrUid || 'N/A'}</p>
                        <p>{doctor.stateCouncil || 'Medical Council'}</p>
                    </div>
                </div>
            </header>

            {/* Insurance & Patient Grid */}
            <section className="mb-2 rounded border border-slate-300 overflow-hidden font-sans shrink-0">
                <div className="bg-slate-100 px-3 py-1 border-b border-slate-300 flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase text-slate-500">Patient Details</span>
                    <span className="text-[9px] font-bold uppercase text-slate-500">Rx ID: <span className="text-slate-900 font-mono text-xs">{prescription.id}</span></span>
                </div>
                <div className="p-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                    <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Patient Name</span>
                        <span className="font-bold text-sm text-slate-900">{patient.fullName}</span>
                    </div>
                    <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Age / Gender / DOB</span>
                        <span className="font-medium text-slate-900">
                            {patientAgeStr} / {patient.gender} 
                            {displayDOB && <span className="text-slate-500 font-normal ml-1">({new Date(displayDOB).toLocaleDateString()})</span>}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Contact</span>
                        <span className="block truncate text-slate-700">{displayAddress}</span>
                        <span className="block text-[9px] text-slate-500">Ph: {displayPhone}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <span className="block text-[8px] uppercase font-bold text-slate-400">ABHA ID</span>
                            <span className="font-mono font-bold text-indigo-700">{patient.abhaNumber || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="block text-[8px] uppercase font-bold text-slate-400">Date</span>
                            <span className="font-bold text-slate-900">{new Date(prescription.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Clinical Notes */}
            <div className="mb-2 px-1 shrink-0">
                <p className="font-serif font-bold text-sm text-slate-900 mb-1">Diagnosis: {prescription.diagnosis}</p>
                {prescription.vitals && Object.values(prescription.vitals).some(Boolean) && (
                    <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-600 border-t border-b border-slate-100 py-1">
                        {prescription.vitals.bp && <span><b className="text-slate-400">BP:</b> {prescription.vitals.bp}</span>}
                        {prescription.vitals.weight && <span><b className="text-slate-400">Wt:</b> {prescription.vitals.weight}kg</span>}
                        {prescription.vitals.temp && <span><b className="text-slate-400">Temp:</b> {prescription.vitals.temp}</span>}
                        {prescription.vitals.spo2 && <span><b className="text-slate-400">SpO2:</b> {prescription.vitals.spo2}%</span>}
                        {prescription.vitals.pulse && <span><b className="text-slate-400">HR:</b> {prescription.vitals.pulse}</span>}
                    </div>
                )}
            </div>

            {/* Medicine Table */}
            <div className="mb-4 flex-1">
                <div className="flex items-center mb-1">
                    <span className="text-2xl font-serif font-black italic mr-2 text-slate-900">Rx</span>
                </div>
                <table className="w-full text-xs border-collapse font-sans">
                    <thead>
                        <tr className="border-b-2 border-slate-800 text-[9px] uppercase text-left tracking-wider text-slate-500">
                            <th className="py-1 w-5/12">Medicine</th>
                            <th className="py-1 w-2/12">Dosage</th>
                            <th className="py-1 w-2/12">Frequency</th>
                            <th className="py-1 w-2/12">Duration</th>
                            <th className="py-1 w-1/12 text-center">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-800">
                        {prescription.medicines.map((med, idx) => {
                            const freqDesc = getFrequencyDescription(med.frequency);
                            const parsedDuration = parseDuration(med.duration);
                            const totalQty = calculateTotalQty(med.frequency, parsedDuration.days);
                            const fullDirection = `Direction: Take ${med.dosage || '1 dose'}, ${freqDesc || med.frequency} for ${parsedDuration.display}${med.instructions ? '. ' + med.instructions : '.'}`;
                            
                            return (
                                <React.Fragment key={idx}>
                                    <tr className="border-b border-slate-100 align-top">
                                        <td className="pt-2 pb-0.5 pr-2">
                                            <span className="font-bold block text-sm">{med.name}</span>
                                        </td>
                                        <td className="pt-2 pb-0.5 font-medium">{med.dosage}</td>
                                        <td className="pt-2 pb-0.5 font-medium font-mono">{med.frequency}</td>
                                        <td className="pt-2 pb-0.5 font-medium">{parsedDuration.display}</td>
                                        <td className="pt-2 pb-0.5 font-bold text-center">{totalQty}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={5} className="pb-2 text-[10px] italic text-slate-600 pl-2 pt-0">
                                            {fullDirection}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Advice & Verification */}
            <div className="grid grid-cols-2 gap-4 mb-2 font-sans shrink-0 border-t border-slate-200 pt-2">
                {/* Left: Advice */}
                <div>
                    <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">Advice / Remarks</h4>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed text-slate-800 min-h-[30px]">
                        {prescription.advice || 'Follow medication schedule strictly.'}
                    </p>
                    <div className="mt-2 flex gap-4 text-[10px]">
                        <span><b className="text-slate-500">Refills:</b> {prescription.refills || 0}</span>
                        <span><b className="text-slate-500">Follow-up:</b> {prescription.followUpDate ? new Date(prescription.followUpDate).toLocaleDateString() : 'PRN'}</span>
                    </div>
                </div>

                {/* Right: Signature */}
                <div className="flex flex-col justify-end text-right relative">
                    <div className="h-10 flex items-end justify-end mb-1 relative">
                        <div className="absolute right-0 bottom-2 opacity-10 print:opacity-20 pointer-events-none">
                            <ShieldCheck className="w-12 h-12 text-indigo-900" />
                        </div>
                        <span className="font-serif italic text-lg text-indigo-900 pr-2 z-10">Dr. {docName.split(' ').pop()}</span>
                    </div>
                    <div className="border-t border-slate-900 w-32 ml-auto"></div>
                    <p className="text-[9px] font-bold uppercase mt-0.5">Authorized Signatory</p>
                    <p className="text-[7px] font-mono text-slate-400 mt-0.5">DS: {prescription.digitalSignatureToken || 'TOKEN_PENDING'}</p>
                </div>
            </div>

            {/* Footer with QR */}
            <footer className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
                <div className="text-[8px] text-slate-500 font-sans max-w-md leading-tight">
                    <p className="font-bold text-slate-700 mb-0.5">Generated via DevXWorld e-Rx Hub • Compliant with Pharmacy Act 1948, IT Act 2000 & DPDP Act 2023</p>
                    <p>This is a computer-generated e-prescription digitally signed by a Registered Medical Practitioner (RMP). Physical signature is not required as per IT Act 2000.</p>
                </div>
                {showQR && (
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Scan to Verify</p>
                            <p className="text-[7px] text-slate-400">Secure Cloud Record</p>
                        </div>
                        <QRCodeCanvas value={verificationUrl} size={48} />
                    </div>
                )}
            </footer>
        </div>
    </div>
  );
};