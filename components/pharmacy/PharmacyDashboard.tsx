
import React, { useState } from 'react';
import { CheckCircle, Eye, History, Package, Search, X, ClipboardList, FileText, ShoppingCart, Plus, Save, Trash2 } from 'lucide-react';
import { Prescription, User, InventoryItem } from '../../types';
import { PrescriptionModal } from '../doctor/PrescriptionModal';

interface PharmacyDashboardProps {
    prescriptions: Prescription[];
    onDispense: (id: string) => void;
    currentUser: User;
    onUpdateUser: (user: User) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ prescriptions, onDispense, currentUser, onUpdateUser }) => {
  const [view, setView] = useState<'QUEUE' | 'HISTORY' | 'INVENTORY'>('QUEUE');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Inventory State
  const [newItem, setNewItem] = useState<InventoryItem>({
      id: '', name: '', batchNumber: '', expiryDate: '', stock: 0, unitPrice: 0
  });
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);

  // Secure filtering: Only show prescriptions specifically assigned to this pharmacy's ID
  const myPrescriptions = prescriptions.filter(p => p.pharmacyId === currentUser.id);
  
  const queue = myPrescriptions.filter(p => p.status === 'ISSUED');
  
  const history = myPrescriptions.filter(p => {
      if (!searchTerm) return true;
      const lowerTerm = searchTerm.toLowerCase();
      return (
        p.id.toLowerCase().includes(lowerTerm) ||
        p.patientName.toLowerCase().includes(lowerTerm) ||
        p.doctorName.toLowerCase().includes(lowerTerm)
      );
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Inventory Handlers
  const handleAddInventory = () => {
      if(!newItem.name || !newItem.stock) return;
      
      const inventory = currentUser.inventory || [];
      const itemToAdd = { ...newItem, id: `inv-${Date.now()}` };
      
      const updatedUser = {
          ...currentUser,
          inventory: [...inventory, itemToAdd]
      };
      
      onUpdateUser(updatedUser);
      setNewItem({ id: '', name: '', batchNumber: '', expiryDate: '', stock: 0, unitPrice: 0 });
      setIsAddItemOpen(false);
  };

  const handleDeleteInventory = (itemId: string) => {
      const inventory = currentUser.inventory || [];
      const updatedUser = {
          ...currentUser,
          inventory: inventory.filter(i => i.id !== itemId)
      };
      onUpdateUser(updatedUser);
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Pharmacy Dashboard</h1>
            <p className="text-slate-500 text-sm">Logged in as: <span className="font-medium text-slate-700">{currentUser.name}</span></p>
        </div>
        <div className="flex gap-2 items-center">
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full border border-teal-200 flex items-center">
                <CheckCircle className="w-3 h-3 mr-1"/> Verified License
            </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit shadow-inner">
          <button 
            onClick={() => setView('QUEUE')}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transition-all ${
                view === 'QUEUE' 
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Package className="w-4 h-4 mr-2"/> Dispensing Queue
            {queue.length > 0 && <span className="ml-2 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{queue.length}</span>}
          </button>
          <button 
            onClick={() => setView('HISTORY')}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transition-all ${
                view === 'HISTORY' 
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4 mr-2"/> Audit History
          </button>
          <button 
            onClick={() => setView('INVENTORY')}
            className={`px-4 py-2 rounded-md text-sm font-medium flex items-center transition-all ${
                view === 'INVENTORY' 
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mr-2"/> Inventory Management
          </button>
      </div>

      {view === 'QUEUE' && (
          <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-indigo-50 flex items-center justify-between">
                <h3 className="font-bold text-indigo-900">Active Prescriptions</h3>
                <span className="text-xs text-indigo-600 font-medium">Requires Immediate Action</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Token ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Doctor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                    {queue.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 mb-3">
                                    <Package className="h-6 w-6 text-slate-400" />
                                </div>
                                <p className="text-lg font-medium text-slate-600">No Pending Prescriptions</p>
                                <p className="text-sm mt-1">Prescriptions assigned to your pharmacy will appear here.</p>
                            </td>
                        </tr>
                    ) : (
                        queue.map((rx) => (
                        <tr key={rx.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-indigo-600 font-medium cursor-pointer hover:underline" onClick={() => setSelectedRx(rx)}>
                                {rx.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{rx.doctorName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {rx.patientName}
                                <span className="block text-xs text-slate-400">{rx.patientGender}, {rx.patientAge} yrs</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                {new Date(rx.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                <button 
                                    onClick={() => setSelectedRx(rx)}
                                    className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    title="View Details"
                                >
                                    <Eye className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => onDispense(rx.id)}
                                    className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-xs font-bold shadow-sm inline-flex items-center transition-colors"
                                >
                                    <CheckCircle className="w-3 h-3 mr-1"/> Dispense
                                </button>
                            </td>
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
          </div>
      )}

      {view === 'HISTORY' && (
          <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Prescription History & Logs</h3>
                    <p className="text-xs text-slate-500">Complete audit trail of all transactions</p>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"/>
                    <input 
                        type="text" 
                        placeholder="Search Rx ID, Patient Name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-64 shadow-sm"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rx ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Doctor</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Patient</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {history.length === 0 ? (
                             <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                    No records found matching your search.
                                </td>
                            </tr>
                        ) : (
                            history.map(rx => (
                                <tr key={rx.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {new Date(rx.date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                                        {rx.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {rx.doctorName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {rx.patientName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full border ${
                                            rx.status === 'DISPENSED' 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}>
                                            {rx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => setSelectedRx(rx)}
                                            className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end ml-auto"
                                        >
                                            <Eye className="w-4 h-4 mr-1"/> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {view === 'INVENTORY' && (
          <div className="space-y-6">
              {/* Add Item Card */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Inventory Stock</h3>
                        <button 
                            onClick={() => setIsAddItemOpen(!isAddItemOpen)}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 flex items-center"
                        >
                            <Plus className="w-4 h-4 mr-2"/> Add New Item
                        </button>
                   </div>

                   {isAddItemOpen && (
                       <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-6 animate-in fade-in slide-in-from-top-2">
                           <h4 className="text-sm font-bold text-slate-700 mb-3">Add Medicine to Stock</h4>
                           <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                               <div className="col-span-2">
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Medicine Name</label>
                                   <input 
                                        type="text" 
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="e.g. Paracetamol 500mg"
                                        value={newItem.name}
                                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Batch No.</label>
                                   <input 
                                        type="text" 
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="B-123"
                                        value={newItem.batchNumber}
                                        onChange={(e) => setNewItem({...newItem, batchNumber: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Expiry Date</label>
                                   <input 
                                        type="date" 
                                        className="w-full border p-2 rounded text-sm"
                                        value={newItem.expiryDate}
                                        onChange={(e) => setNewItem({...newItem, expiryDate: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Stock Qty</label>
                                   <input 
                                        type="number" 
                                        className="w-full border p-2 rounded text-sm"
                                        value={newItem.stock}
                                        onChange={(e) => setNewItem({...newItem, stock: parseInt(e.target.value) || 0})}
                                   />
                               </div>
                           </div>
                           <div className="mt-4 flex justify-end">
                               <button 
                                onClick={handleAddInventory}
                                className="bg-green-600 text-white px-6 py-2 rounded text-sm font-bold hover:bg-green-700 flex items-center"
                               >
                                   <Save className="w-4 h-4 mr-2"/> Save to Inventory
                               </button>
                           </div>
                       </div>
                   )}

                   <div className="overflow-x-auto border border-slate-200 rounded-lg">
                       <table className="min-w-full divide-y divide-slate-200">
                           <thead className="bg-slate-50">
                               <tr>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Medicine Name</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Batch No</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expiry</th>
                                   <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stock</th>
                                   <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-slate-200">
                               {(!currentUser.inventory || currentUser.inventory.length === 0) ? (
                                   <tr>
                                       <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Inventory is empty. Add items to track stock.</td>
                                   </tr>
                               ) : (
                                   currentUser.inventory.map(item => (
                                       <tr key={item.id}>
                                           <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                                           <td className="px-6 py-4 text-sm text-slate-500">{item.batchNumber || '-'}</td>
                                           <td className="px-6 py-4 text-sm text-slate-500">{item.expiryDate || '-'}</td>
                                           <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.stock} units</td>
                                           <td className="px-6 py-4 text-right">
                                               <button 
                                                onClick={() => handleDeleteInventory(item.id)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Remove Item"
                                               >
                                                   <Trash2 className="w-4 h-4"/>
                                               </button>
                                           </td>
                                       </tr>
                                   ))
                               )}
                           </tbody>
                       </table>
                   </div>
              </div>
          </div>
      )}

      {/* Detailed Prescription Modal with Print */}
      {selectedRx && (
          <PrescriptionModal 
            prescription={selectedRx} 
            onClose={() => setSelectedRx(null)} 
            onDispense={onDispense}
            isPharmacy={true}
          />
      )}
    </div>
  );
};