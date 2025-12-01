import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Prescription, Patient, User, DoctorDetailsSnapshot } from '../../types';
import { Printer, QrCode, ShieldCheck, FileText, Download, ArrowLeft } from 'lucide-react';

interface Props {
  prescription: Prescription;
  doctor: User | DoctorDetailsSnapshot | any; 
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
    if (/^\d+(-\d+)+$/.test(clean)) {
       const sum = clean.split('-').reduce((a,b) => a + (parseInt(b)||0), 0);
       return `${sum} times a day`;
    }
    return freq; 
};

const parseDuration = (duration: string) => {
    if (!duration) return { display: '', days: 0 };
    const clean = duration.trim();
    if (/^\d+$/.test(clean)) {
        return { display: `${clean} Days`, days: parseInt(clean, 10) };
    }
    const match = clean.match(/^(\d+)/);
    const days = match ? parseInt(match[1], 10) : 0;
    
    if (clean.toLowerCase().includes('week')) return { display: clean, days: days * 7 };
    if (clean.toLowerCase().includes('month')) return { display: clean, days: days * 30 };
    
    return { display: clean, days: days };
};

const calculateTotalQty = (freq: string, durationDays: number) => {
    if (!freq || !durationDays) return '-';
    const clean = freq.trim().toUpperCase();
    let daily = 0;
    
    if (/^\d+(-\d+)+$/.test(clean)) {
        daily = clean.split('-').reduce((a, b) => a + (parseInt(b) || 0), 0);
    } else {
        if (['OD','1','HS','0-0-1','1-0-0','0-1-0'].includes(clean)) daily = 1;
        else if (['BD','BID','1-0-1'].includes(clean)) daily = 2;
        else if (['TDS','TID','1-1-1'].includes(clean)) daily = 3;
        else if (['QID','1-1-1-1'].includes(clean)) daily = 4;
        else if (clean === 'STAT') daily = 1;
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

  const origin = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://erxdevx.vercel.app';
  const verificationUrl = `${origin}/?mode=verify&rx_id=${prescription.id}`;

  const handlePrint = () => {
    if (onPrint) onPrint();
    window.print();
  };

  const handleDownload = () => {
      const originalTitle = document.title;
      const safeName = patient.fullName.replace(/[^a-z0-9]/gi, '_');
      document.title = `Rx_${safeName}_${prescription.id}`;
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 500);
  };

  const handleGenerateQR = () => {
      setShowQR(!showQR);
      if (onGenerateQR) onGenerateQR();
  };

  const patientAgeStr = patient.dateOfBirth 
    ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} Yrs`
    : (prescription.patientAge ? `${prescription.patientAge} Yrs` : 'N/A');

  const displayAddress = prescription.patientAddress || patient.address || 'N/A';
  const displayPhone = prescription.patientPhone || patient.phone || 'N/A';
  
  const docName = doctor.name || doctor.doctorName;
  const docQual = doctor.qualifications || 'MBBS';
  const docReg = doctor.licenseNumber || doctor.registrationNumber || doctor.reg_no || 'Pending';
  const docAddress = doctor.clinicAddress || doctor.address || '';
  const docCity = doctor.city || '';
  const docPhone = doctor.phone || '';

  return (
    <div className="bg-gray-100 p-4 sm:p-8 min-h-screen flex flex-col items-center">
        <style dangerouslySetInnerHTML={{__html: `
            @media print {
                @page { margin: 0; size: auto; }
                html, body { height: auto; width: 100%; margin: 0 !important; padding: 0 !important; background: white; }
                body * { visibility: hidden; }
                #insurance-rx-print-container, #insurance-rx-print-container * { visibility: visible; }
                #insurance-rx-print-container { 
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
            }
        `}} />

        {/* Toolbar */}
        <div className="w-full max-w-4xl mb-6 flex flex-col sm:flex-row justify-between items-center no-print gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-600"/> Official Print Mode
            </h2>
            <div className="flex flex-wrap gap-2">
                <button onClick={handleGenerateQR} className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-md text-xs font-medium hover:bg-slate-50 text-slate-700 transition-colors">
                    <QrCode className="w-4 h-4 mr-2"/> {showQR ? 'Hide QR' : 'Show QR'}
                </button>
                <button onClick={handleDownload} className="flex items-center px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-md text-sm font-bold hover:bg-indigo-50 shadow-sm transition-colors">
                    <Download className="w-4 h-4 mr-2"/> PDF
                </button>
                <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors">
                    <Printer className="w-4 h-4 mr-2"/> Print
                </button>
            </div>
        </div>

        {/* A4 PAPER CONTAINER - Fluid for Print */}
        <div id="insurance-rx-print-container" className="bg-white w-full max-w-[210mm] min-h-[297mm] p-[10mm] shadow-2xl relative text-slate-900 box-border mx-auto flex flex-col font-sans">
            
            {/* 1. COMPACT HEADER */}
            <header className="border-b-2 border-slate-800 pb-2 mb-3 flex justify-between items-start shrink-0">
                <div className="w-1/2 pr-2">
                    <h1 className="text-lg font-black uppercase text-slate-900 leading-tight mb-1 font-serif">
                        {doctor.clinicName || 'Clinic Name'}
                    </h1>
                    <div className="text-[10px] text-slate-600 leading-tight space-y-0.5">
                        <p>{docAddress}, {docCity}</p>
                        {doctor.state && <p>{doctor.state} {doctor.pincode}</p>}
                        <p className="font-bold pt-1">
                            {docPhone && <span>Ph: {docPhone}</span>}
                        </p>
                    </div>
                </div>
                <div className="w-1/2 text-right pl-2">
                    <h2 className="text-base font-bold text-slate-900">Dr. {docName}</h2>
                    <p className="text-[10px] font-bold text-slate-600 uppercase">{docQual}</p>
                    <p className="text-[10px] font-medium text-indigo-700">{doctor.specialty}</p>
                    <div className="text-[9px] text-slate-500 mt-1">
                        <p><span className="font-bold">Reg:</span> {docReg}</p>
                        <p><span className="font-bold">NMC UID:</span> {doctor.nmrUid || 'N/A'}</p>
                    </div>
                </div>
            </header>

            {/* 2. COMPACT PATIENT BAR */}
            <section className="mb-3 shrink-0">
                <div className="border border-slate-300 rounded overflow-hidden flex text-[10px]">
                    <div className="flex-1 p-2 border-r border-slate-300">
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Patient</span>
                        <span className="font-bold text-sm text-slate-900 truncate block">{patient.fullName}</span>
                        <span className="text-slate-600">{patientAgeStr} / {patient.gender}</span>
                    </div>
                    <div className="flex-1 p-2 border-r border-slate-300">
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Contact & Address</span>
                        <span className="block truncate">{displayPhone}</span>
                        <span className="block truncate text-slate-500">{displayAddress}</span>
                    </div>
                    <div className="w-24 p-2 text-right bg-slate-50">
                        <span className="block text-[8px] uppercase font-bold text-slate-400">Rx ID</span>
                        <span className="font-mono font-bold text-xs">{prescription.id}</span>
                        <span className="block text-[9px] mt-1">{new Date(prescription.date).toLocaleDateString()}</span>
                    </div>
                </div>
            </section>

            {/* 3. DIAGNOSIS LINE */}
            <div className="mb-2 shrink-0 px-1">
                <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase w-20">Diagnosis:</span>
                    <span className="text-sm font-medium text-slate-900">{prescription.diagnosis}</span>
                </div>
                {/* Vitals Compact Line */}
                {prescription.vitals && Object.values(prescription.vitals).some(Boolean) && (
                    <div className="flex gap-4 text-[9px] font-mono text-slate-600 mt-1">
                        {prescription.vitals.bp && <span>BP:{prescription.vitals.bp}</span>}
                        {prescription.vitals.weight && <span>Wt:{prescription.vitals.weight}</span>}
                        {prescription.vitals.temp && <span>T:{prescription.vitals.temp}</span>}
                        {prescription.vitals.spo2 && <span>SpO2:{prescription.vitals.spo2}%</span>}
                        {prescription.vitals.pulse && <span>PR:{prescription.vitals.pulse}</span>}
                    </div>
                )}
            </div>

            {/* 4. MEDICINES TABLE (Compact) */}
            <div className="mb-4 flex-1">
                <div className="flex items-center mb-1">
                    <span className="text-xl font-serif font-black italic mr-2 text-slate-900">Rx</span>
                </div>
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800 text-[9px] uppercase text-left tracking-wider text-slate-500">
                            <th className="py-1 pl-1 w-5/12">Medicine & Strength</th>
                            <th className="py-1 w-2/12">Dosage</th>
                            <th className="py-1 w-2/12">Frequency</th>
                            <th className="py-1 w-2/12">Duration</th>
                            <th className="py-1 w-1/12 text-center">Qty.</th>
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
                                        <td className="py-1 pl-1 pr-2">
                                            <span className="font-bold text-sm block">{med.name}</span>
                                        </td>
                                        <td className="py-1 font-medium">{med.dosage}</td>
                                        <td className="py-1 font-medium font-mono">{med.frequency}</td>
                                        <td className="py-1 font-medium">{parsedDuration.display}</td>
                                        <td className="py-1 font-bold text-center">{totalQty}</td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td colSpan={5} className="py-0.5 pl-1 text-[9px] italic text-slate-600">
                                            {fullDirection}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* 5. FOOTER SECTION (Absolute Bottom) */}
            <div className="mt-auto shrink-0">
                <div className="grid grid-cols-2 gap-4 mb-2 pt-2 border-t border-slate-300">
                    <div className="text-[10px] space-y-1">
                        <p><span className="font-bold text-slate-500 uppercase">Advice:</span> {prescription.advice || 'N/A'}</p>
                        <p><span className="font-bold text-slate-500 uppercase">Follow-up:</span> {prescription.followUpDate ? new Date(prescription.followUpDate).toLocaleDateString() : 'As needed'}</p>
                    </div>
                    <div className="text-right">
                        <div className="h-8 relative mb-1">
                             <div className="absolute right-0 bottom-0 opacity-10">
                                 <ShieldCheck className="w-10 h-10 text-indigo-900"/>
                             </div>
                             <span className="font-serif italic text-base text-indigo-900 relative z-10 mr-2">Dr. {docName.split(' ').pop()}</span>
                        </div>
                        <p className="text-[8px] font-bold uppercase border-t border-slate-800 inline-block pt-0.5">Authorized Signatory</p>
                        <p className="text-[7px] font-mono text-slate-400 mt-0.5">DS: {prescription.digitalSignatureToken || 'PENDING'}</p>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-1 flex justify-between items-end">
                    <div className="text-[7px] text-slate-400 w-3/4 leading-tight">
                        <p className="font-bold text-slate-600">Generated via DevXWorld e-Rx Hub • Compliant with Pharmacy Act 1948, IT Act 2000 & DPDP Act 2023</p>
                        <p>This is a computer-generated e-prescription digitally signed by a Registered Medical Practitioner (RMP). Physical signature is not required as per IT Act 2000.</p>
                    </div>
                    {showQR && (
                        <div className="flex items-center gap-1">
                            <div className="text-right">
                                <p className="text-[6px] font-bold text-slate-500 uppercase">Scan to Verify</p>
                                <p className="text-[6px] text-slate-400">Secure Cloud Record</p>
                            </div>
                            <QRCodeCanvas value={verificationUrl} size={32} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};