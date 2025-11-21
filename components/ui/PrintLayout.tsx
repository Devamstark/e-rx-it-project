
import React from 'react';
import { Prescription } from '../../types';

interface PrintLayoutProps {
  rx: Prescription;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ rx }) => {
  const doc = rx.doctorDetails || {
      name: rx.doctorName,
      qualifications: 'RMP',
      registrationNumber: 'N/A',
      clinicName: 'DevXWorld Network',
      clinicAddress: '',
      phone: '',
      city: '',
      state: '',
      pincode: '',
      nmrUid: '',
      stateCouncil: ''
  };

  return (
    <div className="p-8 bg-white text-black font-sans mx-auto print:p-0" style={{ width: '210mm', minHeight: '297mm' }}>
      {/* Letterhead Header */}
      <div className="border-b-4 border-indigo-900 pb-4 mb-6 flex justify-between items-start">
        <div className="w-1/2">
            <h1 className="text-3xl font-bold uppercase text-indigo-900 tracking-tight leading-none mb-1">{doc.clinicName}</h1>
            <div className="text-sm text-slate-700 space-y-0.5">
                <p className="font-medium">{doc.clinicAddress}</p>
                <p>{doc.city}, {doc.state} - {doc.pincode}</p>
                <p className="font-bold mt-1">Phone: {doc.phone}</p>
            </div>
        </div>
        <div className="w-1/2 text-right">
            <h2 className="text-xl font-bold text-slate-800">Dr. {doc.name}</h2>
            <p className="text-sm font-bold text-indigo-700 uppercase">{doc.qualifications}</p>
            <p className="text-xs text-slate-600 mt-1">Reg No: <span className="font-semibold">{doc.registrationNumber}</span></p>
            <p className="text-xs text-slate-600">NMR UID: <span className="font-semibold">{doc.nmrUid || 'N/A'}</span></p>
            <p className="text-xs text-slate-500">{doc.stateCouncil}</p>
        </div>
      </div>

      {/* Meta Data */}
      <div className="flex justify-between items-end mb-6 border-b border-slate-300 pb-2">
         <div className="flex-1">
             <div className="flex space-x-6 text-sm">
                 <div>
                     <span className="text-xs text-slate-500 block uppercase">Patient Name</span>
                     <span className="font-bold text-slate-900">{rx.patientName}</span>
                 </div>
                 <div>
                     <span className="text-xs text-slate-500 block uppercase">Age / Sex</span>
                     <span className="font-bold text-slate-900">{rx.patientAge}Y / {rx.patientGender}</span>
                 </div>
             </div>
         </div>
         <div className="text-right">
             <span className="text-xs text-slate-500 block uppercase">Date & Time</span>
             <span className="font-bold text-slate-900">{new Date(rx.date).toLocaleString()}</span>
             <p className="text-[10px] font-mono text-slate-400 mt-1">Rx ID: {rx.id}</p>
         </div>
      </div>

      {/* Diagnosis */}
      <div className="mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Diagnosis</p>
          <p className="font-medium text-slate-900">{rx.diagnosis}</p>
      </div>

      {/* Rx Symbol */}
      <div className="mb-2 text-indigo-900">
        <span className="text-4xl font-serif italic font-bold">Rx</span>
      </div>

      {/* Medicines */}
      <div className="mb-8">
        <table className="w-full text-sm text-left border-collapse">
            <thead className="border-b-2 border-slate-200">
                <tr>
                    <th className="py-2 font-bold text-slate-600 w-5/12">Medicine</th>
                    <th className="py-2 font-bold text-slate-600 w-2/12">Dosage</th>
                    <th className="py-2 font-bold text-slate-600 w-3/12">Frequency</th>
                    <th className="py-2 font-bold text-slate-600 w-2/12">Duration</th>
                </tr>
            </thead>
            <tbody>
                {rx.medicines.map((m, i) => (
                    <React.Fragment key={i}>
                        <tr className="border-b border-slate-100">
                            <td className="py-3 font-bold text-slate-900 align-top">{m.name}</td>
                            <td className="py-3 align-top">{m.dosage}</td>
                            <td className="py-3 align-top">{m.frequency}</td>
                            <td className="py-3 align-top">{m.duration}</td>
                        </tr>
                        {m.instructions && (
                            <tr>
                                <td colSpan={4} className="pb-3 pt-0 text-xs italic text-slate-500 pl-2">
                                    Note: {m.instructions}
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                ))}
            </tbody>
        </table>
      </div>

      {/* Advice */}
      {rx.advice && (
          <div className="mb-12 p-4 bg-slate-50 rounded border border-slate-100">
              <h4 className="font-bold text-slate-700 mb-1 text-sm uppercase">Advice / Instructions:</h4>
              <p className="text-slate-800 whitespace-pre-wrap">{rx.advice}</p>
          </div>
      )}

      {/* Footer & Signature */}
      <div className="mt-auto pt-8 border-t-2 border-slate-200 flex justify-between items-end">
        <div className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
            <p>Generated securely via DevXWorld e-Rx Hub.</p>
            <p>This is a digitally signed electronic prescription valid under the IT Act 2000 and Pharmacy Act 1948.</p>
            <p>Dispense only against valid ID proof.</p>
        </div>
        <div className="text-center min-w-[150px]">
             {/* Placeholder for Signature */}
             <div className="h-16 flex items-end justify-center pb-2">
                <div className="font-script text-xl text-indigo-800 transform -rotate-6">
                    Signed by Dr. {doc.name.split(' ')[0]}
                </div>
             </div>
             <div className="border-t border-slate-400 pt-1">
                 <p className="text-sm font-bold uppercase text-slate-800">Dr. {doc.name}</p>
                 <p className="text-[10px] text-slate-500">Reg No: {doc.registrationNumber}</p>
             </div>
        </div>
      </div>
    </div>
  );
};
