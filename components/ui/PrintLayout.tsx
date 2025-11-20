
import React from 'react';
import { Prescription } from '../../types';

interface PrintLayoutProps {
  rx: Prescription;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ rx }) => {
  return (
    <div className="p-8 bg-white text-black font-sans max-w-3xl mx-auto" style={{ minHeight: '297mm', width: '210mm' }}>
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold uppercase text-blue-900">{rx.doctorName}</h1>
            <p className="text-sm font-semibold">Registered Medical Practitioner (RMP)</p>
            <p className="text-sm">DevXWorld Telemedicine Network</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-bold text-gray-600">e-PRESCRIPTION</h2>
            <p className="text-sm font-mono text-gray-500">ID: {rx.id}</p>
            <p className="text-sm text-gray-500">{new Date(rx.date).toLocaleString()}</p>
        </div>
      </div>

      {/* Patient Details */}
      <div className="flex justify-between mb-8 bg-gray-50 p-4 rounded border border-gray-200">
        <div>
            <span className="text-xs font-bold text-gray-500 uppercase block">Patient Name</span>
            <span className="text-lg font-medium">{rx.patientName}</span>
        </div>
        <div>
            <span className="text-xs font-bold text-gray-500 uppercase block">Age / Gender</span>
            <span className="text-lg font-medium">{rx.patientAge} Y / {rx.patientGender}</span>
        </div>
        <div>
             <span className="text-xs font-bold text-gray-500 uppercase block">Diagnosis</span>
             <span className="text-lg font-medium">{rx.diagnosis}</span>
        </div>
      </div>

      {/* Rx Symbol */}
      <div className="mb-4">
        <span className="text-4xl font-serif italic font-bold text-gray-800">Rx</span>
      </div>

      {/* Medicines */}
      <div className="mb-8">
        <table className="w-full text-sm text-left">
            <thead className="border-b border-gray-300">
                <tr>
                    <th className="py-2 font-bold text-gray-600">Medicine</th>
                    <th className="py-2 font-bold text-gray-600">Dosage</th>
                    <th className="py-2 font-bold text-gray-600">Frequency</th>
                    <th className="py-2 font-bold text-gray-600">Duration</th>
                    <th className="py-2 font-bold text-gray-600">Instructions</th>
                </tr>
            </thead>
            <tbody>
                {rx.medicines.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100">
                        <td className="py-3 font-bold text-gray-800">{m.name}</td>
                        <td className="py-3">{m.dosage}</td>
                        <td className="py-3">{m.frequency}</td>
                        <td className="py-3">{m.duration}</td>
                        <td className="py-3 italic text-gray-500">{m.instructions}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Advice */}
      {rx.advice && (
          <div className="mb-8">
              <h4 className="font-bold text-gray-700 mb-1">Advice / Instructions:</h4>
              <p className="text-gray-800">{rx.advice}</p>
          </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-8 border-t-2 border-gray-200 flex justify-between items-end">
        <div className="text-xs text-gray-500 max-w-xs">
            <p>Digitally Generated via DevXWorld e-Rx Hub.</p>
            <p>Valid in all pharmacies across India under IT Act 2000.</p>
        </div>
        <div className="text-center">
             {/* Placeholder for Signature */}
             <div className="h-12 flex items-center justify-center text-blue-900 font-script text-xl mb-1">
                 Digitally Signed
             </div>
             <p className="text-xs font-bold uppercase">{rx.doctorName}</p>
             <p className="text-[10px] text-gray-400 font-mono">{rx.digitalSignatureToken}</p>
        </div>
      </div>
    </div>
  );
};
