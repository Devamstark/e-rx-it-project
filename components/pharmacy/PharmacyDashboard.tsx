
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle, Package, Search, Users, ShoppingCart, Plus, Save, Trash2, Stethoscope, BarChart3, ScanBarcode, X, Activity, Calculator, FileText, Phone, MapPin, Edit2, AlertOctagon, Receipt, Truck, BookOpen, BrainCircuit, CreditCard, Filter, Building2, Printer, RotateCcw, AlertTriangle, UserPlus, UserCheck, ArrowRight, User, Wallet, ArrowLeft, Keyboard, PauseCircle, PlayCircle, AlertCircle, Tag, RefreshCw, Calendar, Clock, ChevronRight, Shield, Key } from 'lucide-react';
import { Prescription, User as UserType, InventoryItem, DoctorDirectoryEntry, Patient, Supplier, Customer, Sale, SaleItem, GRN, Expense, SalesReturn, Medicine, PatientAccount, UserRole, VerificationStatus } from '../../types';
import { PrescriptionModal } from '../doctor/PrescriptionModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { dbService } from '../../services/db';
import { getPharmacyAIInsights } from '../../services/geminiService';
import { VirtualNumpad } from '../ui/VirtualNumpad';

interface PharmacyDashboardProps {
    prescriptions: Prescription[];
    onDispense: (id: string, patientId?: string) => void;
    onReject: (id: string, reason?: string) => void;
    currentUser: UserType;
    onUpdateUser: (user: UserType) => void;
    salesReturns?: SalesReturn[];
    onAddSalesReturn?: (ret: SalesReturn) => void;
}

const PrintableReceipt = ({ sale, user }: { sale: Sale, user: UserType }) => (
    <div id="pos-receipt" className="hidden print:block bg-white text-black font-sans text-xs w-full">
        <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
                body * { visibility: hidden; height: 0; overflow: hidden; }
                #pos-receipt, #pos-receipt * { visibility: visible; height: auto; overflow: visible; }
                #pos-receipt { 
                    position: fixed; 
                    left: 0; 
                    top: 0; 
                    width: 80mm; /* Standard Thermal Width */
                    margin: 0 auto; 
                    padding: 4mm;
                    background: white; 
                }
                @page { size: 80mm auto; margin: 0; }
            }
        `}} />

        <div className="text-center border-b-2 border-black pb-2 mb-2">
            <h2 className="font-bold text-lg uppercase leading-tight">{user.clinicName || 'Pharmacy Store'}</h2>
            <p className="text-[10px] leading-tight mt-1">{user.clinicAddress}</p>
            <p className="text-[10px] leading-tight">{user.city}, {user.state} {user.pincode}</p>
            <p className="text-[10px] font-bold mt-1">Ph: {user.phone}</p>
            <div className="flex justify-center gap-2 mt-1 text-[10px]">
                {user.gstin && <span>GST: {user.gstin}</span>}
                {user.licenseNumber && <span>DL: {user.licenseNumber}</span>}
            </div>
        </div>

        <div className="flex justify-between text-[10px] mb-1">
            <span>Inv: <b>{sale.invoiceNumber}</b></span>
            <span>{new Date(sale.date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-2 border-b border-black pb-2">
            <span>To: {sale.customerName || 'Walk-in'}</span>
            <span>{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <table className="w-full text-[10px] mb-2 border-collapse">
            <thead>
                <tr className="border-b border-black border-dashed">
                    <th className="text-left py-1 w-5/12">Item</th>
                    <th className="text-center py-1 w-2/12">Batch</th>
                    <th className="text-center py-1 w-1/12">Qty</th>
                    <th className="text-right py-1 w-2/12">Rate</th>
                    <th className="text-right py-1 w-2/12">Amt</th>
                </tr>
            </thead>
            <tbody>
                {sale.items.map((item, i) => (
                    <tr key={i} className="align-top">
                        <td className="py-1 pr-1 break-words">
                            <span className="font-bold">{item.name}</span>
                        </td>
                        <td className="py-1 text-center">{item.batchNumber}</td>
                        <td className="py-1 text-center">{item.quantity}</td>
                        <td className="py-1 text-right">{item.mrp}</td>
                        <td className="py-1 text-right">{item.total.toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>

        <div className="border-t border-black border-dashed pt-2 text-[10px] space-y-1">
            <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{sale.subTotal.toFixed(2)}</span>
            </div>
            {sale.discountAmount > 0 && (
                <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{sale.discountAmount.toFixed(2)}</span>
                </div>
            )}
            <div className="flex justify-between text-slate-600">
                <span>GST (Inc.):</span>
                <span>{sale.gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-2">
                <span>TOTAL:</span>
                <span>₹{sale.roundedTotal}</span>
            </div>
            {sale.amountPaid !== undefined && (
                <>
                    <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-slate-300">
                        <span>Paid:</span>
                        <span>₹{sale.amountPaid}</span>
                    </div>
                    {sale.balanceDue && sale.balanceDue > 0 ? (
                        <div className="flex justify-between font-bold">
                            <span>Balance Due:</span>
                            <span>₹{sale.balanceDue}</span>
                        </div>
                    ) : (
                        <div className="flex justify-between">
                            <span>Change:</span>
                            <span>₹{((sale.amountPaid || 0) - sale.roundedTotal > 0 ? (sale.amountPaid || 0) - sale.roundedTotal : 0).toFixed(2)}</span>
                        </div>
                    )}
                </>
            )}
            <div className="flex justify-between mt-1 text-[10px] italic">
                <span>Payment Mode:</span>
                <span className="font-bold">{sale.paymentMode}</span>
            </div>
        </div>

        <div className="text-center mt-6 text-[9px] border-t border-black pt-2">
            <p>Terms: Goods once sold will not be taken back.</p>
            <p>Subject to local jurisdiction.</p>
            <p className="font-bold mt-2 text-[10px]">*** THANK YOU ***</p>
            <p className="mt-1 text-slate-400">Gen by DevXWorld e-Rx Hub</p>
        </div>
    </div>
);

const PrintableAccessSheet = ({ data, patientName }: { data: any, patientName: string }) => (
    <div id="access-sheet" className="hidden print:block bg-white text-black font-sans p-8 w-full border-2 border-slate-200 rounded-xl">
        <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
                body * { visibility: hidden; }
                #access-sheet, #access-sheet * { visibility: visible; }
                #access-sheet { position: absolute; left: 0; top: 0; width: 100%; height: auto; padding: 20px; }
            }
        `}} />
        <div className="text-center border-b-2 pb-6 mb-8">
            <h1 className="text-3xl font-bold text-indigo-900 mb-2">Patient Portal Access</h1>
            <p className="text-slate-500">Secure Healthcare Ecosystem - e-Rx Hub</p>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 tracking-wider">Patient Details</h3>
                <div className="space-y-3">
                    <p className="text-xl font-bold">{patientName}</p>
                    <p className="text-slate-600">Patient ID: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{data.patientId}</span></p>
                </div>

                <h3 className="text-sm font-bold text-slate-400 uppercase mt-10 mb-4 tracking-wider">Login Credentials</h3>
                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div>
                        <p className="text-xs font-bold text-slate-500">EMAIL ADDRESS</p>
                        <p className="text-lg font-bold text-indigo-700">{data.email}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-500">TEMPORARY PASSWORD</p>
                        <p className="text-lg font-bold text-indigo-700 font-mono tracking-widest">{data.password}</p>
                    </div>
                    <p className="text-[10px] text-red-500 font-bold mt-4 uppercase">*** Please change your password after logging in for the first time ***</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center border-l border-slate-200 pl-12">
                <h3 className="text-sm font-bold text-slate-400 uppercase mb-6 tracking-wider">Scan to Login</h3>
                <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm mb-6">
                    <QRCodeSVG value={window.location.origin} size={180} />
                </div>
                <p className="text-xs text-center text-slate-500 max-w-[200px]">Scan this QR code with your phone camera to open the portal</p>
            </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mb-10">
            <h4 className="font-bold text-indigo-900 mb-2 flex items-center">
                <Shield className="w-4 h-4 mr-2" /> Security Guidelines
            </h4>
            <ul className="text-xs text-indigo-700 space-y-2 list-disc pl-4">
                <li>Never share your credentials with anyone.</li>
                <li>Verify your Doctor and Pharmacy roles before sharing medical data.</li>
                <li>Logout immediately if using a public computer.</li>
            </ul>
        </div>

        <div className="text-center text-[10px] text-slate-400 border-t pt-6">
            <p>Access enabled by: <b>{data.pharmacyName}</b> on {new Date().toLocaleString()}</p>
            <p className="mt-1">Generated by DevXWorld e-Rx Hub Security Engine</p>
        </div>
    </div>
);

const MedicineLabel = ({ data, pharmacyName }: { data: { patient: string, drug: string, dose: string, freq: string, instr: string }, pharmacyName: string }) => (
    <div id="med-label" className="hidden print:block bg-white text-black font-sans border-2 border-black p-2 w-[70mm] h-[40mm] overflow-hidden">
        <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
                #med-label { visibility: visible; position: fixed; top: 0; left: 0; }
                @page { size: 70mm 40mm; margin: 0; }
            }
        `}} />
        <div className="text-center font-bold border-b border-black pb-1 mb-1 text-[10px] uppercase">{pharmacyName}</div>
        <div className="text-[10px] mb-1"><b>Patient:</b> {data.patient}</div>
        <div className="font-bold text-sm mb-1 truncate">{data.drug}</div>
        <div className="flex justify-between text-[10px] font-bold mb-1">
            <span>{data.dose}</span>
            <span>{data.freq}</span>
        </div>
        <div className="text-[9px] italic border-t border-black pt-1 leading-tight">{data.instr || 'As directed by physician.'}</div>
        <div className="text-[8px] text-right mt-1">Keep away from children.</div>
    </div>
);

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({
    prescriptions,
    onDispense,
    onReject,
    currentUser,
    onUpdateUser,
    salesReturns = [],
    onAddSalesReturn
}) => {
    const [view, setView] = useState<'DASHBOARD' | 'ERX' | 'POS' | 'INVENTORY' | 'LEDGER' | 'REPORTS' | 'AI' | 'PATIENTS'>('DASHBOARD');
    const [erxTab, setErxTab] = useState<'QUEUE' | 'HISTORY'>('QUEUE');
    const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

    // Rx Processing State
    const [processingRx, setProcessingRx] = useState<Prescription | null>(null);
    const [matchMode, setMatchMode] = useState<'SEARCH' | 'CREATE'>('SEARCH');
    const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
    const [newCustomerForm, setNewCustomerForm] = useState<Partial<Customer>>({});

    // ERP State
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [localReturns, setLocalReturns] = useState<SalesReturn[]>(salesReturns);
    const [expenses, setExpenses] = useState<Expense[]>([]);

    // NEW: Customer Management State
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '', email: '' });
    const [patientSearch, setPatientSearch] = useState('');
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [patientAccount, setPatientAccount] = useState<any | null>(null);
    const [accessModal, setAccessModal] = useState<{ email: string, password: '', patientId: string, patientName: string } | null>(null);
    const [grantingStatus, setGrantingStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [printedAccess, setPrintedAccess] = useState<any | null>(null);

    useEffect(() => {
        // Load data on mount
        const load = async () => {
            const inv = await dbService.getInventory(currentUser.id);
            setInventory(inv);
            setSuppliers(dbService.getSuppliers().filter(s => s.pharmacyId === currentUser.id));
            setCustomers(dbService.getCustomers().filter(c => c.pharmacyId === currentUser.id));
            setSales(dbService.getSales().filter(s => s.pharmacyId === currentUser.id));
            setLocalReturns(dbService.getSalesReturns().filter(r => r.pharmacyId === currentUser.id));
            setExpenses(dbService.getExpenses().filter(e => e.pharmacyId === currentUser.id));
        };
        load();
    }, [currentUser.id]);

    useEffect(() => {
        if (viewingCustomer) {
            dbService.getPatientAccount(viewingCustomer.id).then(setPatientAccount);
        } else {
            setPatientAccount(null);
        }
    }, [viewingCustomer]);

    useEffect(() => { if (suppliers.length) dbService.saveSuppliers(suppliers); }, [suppliers]);
    useEffect(() => { if (customers.length) dbService.saveCustomers(customers); }, [customers]);
    useEffect(() => { if (sales.length) dbService.saveSales(sales); }, [sales]);
    useEffect(() => { if (localReturns.length) dbService.saveSalesReturns(localReturns); }, [localReturns]);
    useEffect(() => { if (expenses.length) dbService.saveExpenses(expenses); }, [expenses]);
    // NOTE: Inventory is saved individually on transaction to prevent race conditions

    const myPrescriptions = prescriptions.filter(p => p.pharmacyId === currentUser.id);
    const queue = myPrescriptions.filter(p => p.status === 'SENT_TO_PHARMACY');
    const history = myPrescriptions.filter(p => p.status === 'DISPENSED' || p.status === 'REJECTED' || p.status === 'REJECTED_STOCK');

    const lowStockItems = inventory.filter(i => i.stock <= i.minStockLevel);
    const expiredItems = inventory.filter(i => i.expiryDate && new Date(i.expiryDate) < new Date());

    const totalSales = sales.reduce((acc, s) => acc + s.roundedTotal, 0);
    const totalReturns = localReturns.reduce((acc, r) => acc + r.refundAmount, 0);
    const netSales = totalSales - totalReturns;

    const totalInventoryValue = inventory.reduce((acc, i) => acc + (i.purchasePrice * i.stock), 0);

    // [New Customer Creation]
    const confirmNewCustomer = () => {
        if (!newCustomerForm.name || !newCustomerForm.phone) {
            alert("Name and Phone are required"); return;
        }

        const newId = (processingRx && processingRx.patientId) ? processingRx.patientId : `CUST-${Date.now()}`;

        const newC: Customer = {
            id: newId,
            pharmacyId: currentUser.id,
            name: newCustomerForm.name,
            phone: newCustomerForm.phone,
            address: newCustomerForm.address || '',
            email: newCustomerForm.email || '',
            balance: 0
        };
        setCustomers(prev => [...prev, newC]);
        setLinkedCustomer(newC);
        setMatchMode('SEARCH');
    };

    const handleSaveCustomer = () => {
        if (!newCustomerData.name || !newCustomerData.phone) {
            alert("Name and Phone are required.");
            return;
        }
        const customer: Customer = {
            id: `CUST-${Date.now()}`,
            pharmacyId: currentUser.id,
            name: newCustomerData.name,
            phone: newCustomerData.phone,
            address: newCustomerData.address || '',
            email: newCustomerData.email || '',
            balance: 0
        };
        setCustomers([...customers, customer]);
        setIsAddingCustomer(false);
        setNewCustomerData({ name: '', phone: '', address: '', email: '' });
    };

    const handleStartProcessing = (rx: Prescription) => {
        setProcessingRx(rx);
        setMatchMode('SEARCH');
        const match = customers.find(c => c.id === rx.patientId || c.phone === rx.patientPhone || c.name.toLowerCase() === rx.patientName.toLowerCase());
        if (match) setLinkedCustomer(match);
        else setLinkedCustomer(null);

        setNewCustomerForm({
            name: rx.patientName,
            phone: rx.patientPhone || '',
            address: rx.patientAddress || ''
        });
    };

    const finalizeRx = (status: 'DISPENSED' | 'REJECTED' | 'REJECTED_STOCK') => {
        if (!processingRx) return;
        if (status === 'DISPENSED') {
            if (!linkedCustomer && !confirm("No customer profile linked. Continue anonymously?")) return;
            onDispense(processingRx.id, linkedCustomer?.id);
        } else {
            onReject(processingRx.id, status);
        }
        setProcessingRx(null);
    };

    const [printLabelData, setPrintLabelData] = useState<{ patient: string, drug: string, dose: string, freq: string, instr: string } | null>(null);
    const handlePrintLabel = (med: Medicine) => {
        if (!processingRx) return;
        setPrintLabelData({
            patient: processingRx.patientName,
            drug: med.name,
            dose: med.dosage,
            freq: med.frequency,
            instr: med.instructions || ''
        });
        setTimeout(() => window.print(), 100);
    };

    // POS STATE
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [posSearch, setPosSearch] = useState('');
    const [selectedPosCustomer, setSelectedPosCustomer] = useState<Customer | null>(null);
    const [paymentMode, setPaymentMode] = useState<Sale['paymentMode']>('CASH');
    const [showReceipt, setShowReceipt] = useState<Sale | null>(null);
    const [amountPaidInput, setAmountPaidInput] = useState<string>('0');
    const [showQuickAdd, setShowQuickAdd] = useState(false);
    const [quickAddItem, setQuickAddItem] = useState<Partial<InventoryItem>>({});
    const [numpadModal, setNumpadModal] = useState<{ targetField: keyof InventoryItem, value: string, onConfirm: (val: string) => void } | null>(null);
    const [heldBills, setHeldBills] = useState<{ id: string, customerName: string, items: SaleItem[], date: string }[]>([]);
    const [showHeldBills, setShowHeldBills] = useState(false);

    const cartTotal = useMemo(() => Math.round(cart.reduce((a, b) => a + (b.mrp * b.quantity), 0)), [cart]);

    useEffect(() => {
        if (paymentMode !== 'CREDIT') {
            setAmountPaidInput(cartTotal.toString());
        }
    }, [cartTotal, paymentMode]);

    const addToCart = (item: InventoryItem) => {
        if (item.stock <= 0) { alert("Out of Stock"); return; }
        const existing = cart.find(c => c.inventoryId === item.id);
        if (existing) {
            if (existing.quantity >= item.stock) { alert("Max stock reached"); return; }
            setCart(cart.map(c => c.inventoryId === item.id ? { ...c, quantity: c.quantity + 1, total: (c.quantity + 1) * c.mrp } : c));
        } else {
            setCart([...cart, {
                inventoryId: item.id,
                name: item.name,
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate,
                quantity: 1,
                mrp: item.mrp,
                costPrice: item.purchasePrice,
                gstPercentage: item.gstPercentage || 0,
                discount: 0,
                total: item.mrp
            }]);
        }
    };

    const handleHoldBill = () => {
        if (cart.length === 0) return;
        const bill = { id: `HOLD-${Date.now()}`, customerName: selectedPosCustomer?.name || 'Walk-in', items: cart, date: new Date().toISOString() };
        setHeldBills([...heldBills, bill]);
        setCart([]); setSelectedPosCustomer(null); setPosSearch(''); alert("Bill Placed on Hold");
    };

    const handleRecallBill = (billId: string) => {
        const bill = heldBills.find(b => b.id === billId);
        if (bill) { setCart(bill.items); setHeldBills(heldBills.filter(b => b.id !== billId)); setShowHeldBills(false); }
    };

    const handlePosCheckout = async () => {
        if (cart.length === 0) return;

        const subTotal = cart.reduce((acc, i) => acc + (i.mrp * i.quantity), 0);
        const discount = 0;
        const gstAmount = cart.reduce((acc, i) => acc + ((i.mrp * i.quantity) * (i.gstPercentage / 100)), 0);
        const roundedTotal = Math.round(subTotal);
        const amountPaidNum = parseFloat(amountPaidInput) || 0;
        const amountPaid = amountPaidNum < 0 ? 0 : amountPaidNum;

        if (amountPaid < roundedTotal) { alert("Credit Balance Detected: Select a registered Patient."); return; }

        const newSale: Sale = {
            id: `INV-${Date.now()}`,
            pharmacyId: currentUser.id,
            invoiceNumber: `INV-${new Date().getFullYear()}-${sales.length + 1001}`,
            date: new Date().toISOString(),
            customerId: selectedPosCustomer?.id,
            customerName: selectedPosCustomer?.name || 'Walk-in Patient',
            items: [...cart],
            subTotal,
            gstAmount,
            discountAmount: discount,
            roundedTotal,
            amountPaid: amountPaid,
            balanceDue: 0,
            paymentMode: paymentMode,
        };

        // Update Inventory state and DB
        const updatedInventory = inventory.map(invItem => {
            const cartItem = cart.find(c => c.inventoryId === invItem.id);
            if (cartItem) {
                const newItem = { ...invItem, stock: invItem.stock - cartItem.quantity };
                dbService.saveInventoryItem(newItem); // Async save
                return newItem;
            }
            return invItem;
        });
        setInventory(updatedInventory); // Local update for UI speed

        setSales([newSale, ...sales]);
        setCart([]); setSelectedPosCustomer(null); setPosSearch(''); setShowReceipt(newSale);
    };

    const openQuickAdd = () => { setQuickAddItem({ name: posSearch || '', gstPercentage: 0, purchasePrice: 0 }); setShowQuickAdd(true); };

    const handleQuickAddSubmit = async () => {
        if (!quickAddItem.name || !quickAddItem.batchNumber || !quickAddItem.mrp || !quickAddItem.stock) { alert("Fill required fields"); return; }
        const purchasePrice = quickAddItem.purchasePrice || (quickAddItem.mrp * 0.7);
        const newItem: InventoryItem = {
            id: `item-${Date.now()}`,
            pharmacyId: currentUser.id, // Explicit pharmacy link
            name: quickAddItem.name,
            genericName: quickAddItem.genericName,
            manufacturer: quickAddItem.manufacturer || 'QuickAdd',
            batchNumber: quickAddItem.batchNumber,
            barcode: quickAddItem.barcode,
            expiryDate: quickAddItem.expiryDate || '',
            stock: Number(quickAddItem.stock),
            minStockLevel: 5,
            purchasePrice: Number(purchasePrice),
            mrp: Number(quickAddItem.mrp),
            isNarcotic: false,
            gstPercentage: Number(quickAddItem.gstPercentage || 0),
            hsnCode: ''
        } as InventoryItem;

        await dbService.saveInventoryItem(newItem);
        setInventory([newItem, ...inventory]);
        setShowQuickAdd(false); setQuickAddItem({}); setPosSearch(newItem.name);
    };

    const [returnSaleId, setReturnSaleId] = useState('');
    const [returnItems, setReturnItems] = useState<{ item: SaleItem, returnQty: number }[]>([]);

    const initiateReturn = (sale: Sale) => { setReturnSaleId(sale.id); setReturnItems(sale.items.map(i => ({ item: i, returnQty: 0 }))); };

    const processReturn = async (originalSale: Sale) => {
        const itemsToReturn = returnItems.filter(r => r.returnQty > 0);
        if (itemsToReturn.length === 0) return;
        const refundAmount = itemsToReturn.reduce((acc, r) => acc + (r.returnQty * r.item.mrp), 0);

        const newReturn: SalesReturn = {
            id: `RET-${Date.now()}`,
            pharmacyId: currentUser.id,
            originalInvoiceId: originalSale.id,
            invoiceNumber: originalSale.invoiceNumber,
            date: new Date().toISOString(),
            customerName: originalSale.customerName || 'Walk-in Patient',
            items: itemsToReturn.map(r => ({ ...r.item, quantity: r.returnQty, total: r.returnQty * r.item.mrp })),
            refundAmount: refundAmount,
            reason: 'Patient Return'
        };

        const updatedInventory = inventory.map(invItem => {
            const retItem = itemsToReturn.find(r => r.item.inventoryId === invItem.id);
            if (retItem) {
                const newItem = { ...invItem, stock: invItem.stock + retItem.returnQty };
                dbService.saveInventoryItem(newItem);
                return newItem;
            }
            return invItem;
        });
        setInventory(updatedInventory);

        if (originalSale.customerId) {
            setCustomers(prev => prev.map(c => c.id === originalSale.customerId ? { ...c, balance: c.balance - refundAmount } : c));
            await dbService.logSecurityAction(currentUser.id, 'LEDGER_CREDIT', `Return Processed: Credited ₹${refundAmount}`);
        }

        setLocalReturns([newReturn, ...localReturns]);
        if (onAddSalesReturn) onAddSalesReturn(newReturn);
        setReturnSaleId(''); setReturnItems([]); alert(`Return Processed. Refund: ₹${refundAmount}`);
    };

    const [transactionModal, setTransactionModal] = useState<{ type: 'SUPPLIER' | 'CUSTOMER', id: string, name: string, currentBalance: number, amount: string, mode: 'PAYMENT_RECEIVED' | 'ADD_CHARGE' | 'PAYMENT_MADE' } | null>(null);

    const handleTransactionSubmit = async () => {
        if (!transactionModal) return;
        const amount = parseFloat(transactionModal.amount);
        if (isNaN(amount) || amount <= 0) { alert("Invalid amount"); return; }

        let balanceChange = 0; let logAction = ''; let logDetail = '';

        if (transactionModal.type === 'SUPPLIER') {
            if (transactionModal.mode === 'PAYMENT_MADE') {
                balanceChange = -amount; logAction = 'SUPPLIER_PAYMENT'; logDetail = `Paid ₹${amount} to ${transactionModal.name}`;
            } else {
                balanceChange = amount; logAction = 'SUPPLIER_CREDIT'; logDetail = `Added ₹${amount} credit from ${transactionModal.name}`;
            }
            setSuppliers(prev => prev.map(s => s.id === transactionModal.id ? { ...s, balance: s.balance + balanceChange } : s));
        } else {
            // Customer Logic
            if (transactionModal.mode === 'PAYMENT_RECEIVED') {
                balanceChange = -amount; logAction = 'CUSTOMER_PAYMENT'; logDetail = `Received ₹${amount} from ${transactionModal.name}`;
            } else {
                balanceChange = amount; logAction = 'CUSTOMER_DEBIT'; logDetail = `Debited ₹${amount} to ${transactionModal.name}`;
            }
            setCustomers(prev => prev.map(c => c.id === transactionModal.id ? { ...c, balance: c.balance + balanceChange } : c));
        }

        await dbService.logSecurityAction(currentUser.id, logAction, logDetail);
        setTransactionModal(null);
    };

    const handleWriteOff = async (item: InventoryItem, qty: number, reason: string) => {
        if (qty > item.stock) return;
        const lossAmount = qty * item.purchasePrice;
        const newItem = { ...item, stock: item.stock - qty };
        await dbService.saveInventoryItem(newItem);
        setInventory(inventory.map(i => i.id === item.id ? newItem : i));

        const expense: Expense = {
            id: `EXP-${Date.now()}`,
            pharmacyId: currentUser.id,
            date: new Date().toISOString(),
            category: 'Write Off',
            description: `Stock Write-off: ${item.name} (${qty}) - ${reason}`,
            amount: lossAmount,
        };
        setExpenses([...expenses, expense]);
        alert("Stock written off.");
    };

    const [aiInsights, setAiInsights] = useState<{ reorderSuggestions: any[], pricingTips: any[], anomalies: any[] } | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const fetchInsights = async () => { setLoadingAi(true); const insights = await getPharmacyAIInsights(inventory, sales); setAiInsights(insights); setLoadingAi(false); };

    // Helper to get detailed history for a customer
    const getCustomerDetailsFromRx = (customer: Customer) => {
        const relatedRx = myPrescriptions.filter(rx =>
            rx.patientId === customer.id ||
            rx.patientPhone === customer.phone ||
            (rx.patientName?.toLowerCase() === customer.name.toLowerCase())
        );
        // Sort by date desc
        relatedRx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latest = relatedRx[0];

        return {
            age: latest?.patientAge,
            gender: latest?.patientGender,
            history: relatedRx
        };
    };

    const getCustomerSales = (customer: Customer) => {
        return sales.filter(s => s.customerId === customer.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500 min-h-screen pb-20">
            {/* Top Header & Nav */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
                <div><h1 className="text-2xl font-bold text-slate-900 flex items-center"><Building2 className="mr-2 text-indigo-600" /> {currentUser.clinicName || 'Pharmacy ERP'}</h1><p className="text-slate-500 text-xs font-medium">License: {currentUser.licenseNumber}</p></div>
                <div className="flex space-x-2"><span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold flex items-center"><Activity className="w-3 h-3 mr-1" /> Online</span><span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-bold">{new Date().toDateString()}</span></div>
            </div>

            <div className="flex overflow-x-auto gap-2 mb-6 pb-2 w-full whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                {[{ id: 'DASHBOARD', label: 'Overview', icon: Activity }, { id: 'ERX', label: 'e-Prescriptions', icon: FileText }, { id: 'PATIENTS', label: 'Patients', icon: Users }, { id: 'POS', label: 'Billing / POS', icon: Calculator }, { id: 'INVENTORY', label: 'Stock & GRN', icon: Package }, { id: 'LEDGER', label: 'Ledger', icon: BookOpen }, { id: 'REPORTS', label: 'Reports', icon: BarChart3 }, { id: 'AI', label: 'AI Assistant', icon: BrainCircuit }].map(tab => (
                    <button key={tab.id} onClick={() => { setView(tab.id as any); setViewingCustomer(null); }} className={`px-5 py-3 rounded-xl text-sm font-bold flex items-center whitespace-nowrap transition-all border shrink-0 ${view === tab.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}><tab.icon className="w-4 h-4 mr-2" /> {tab.label}</button>
                ))}
            </div>

            {/* DASHBOARD VIEW */}
            {view === 'DASHBOARD' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div><p className="text-xs font-bold text-slate-500 uppercase">Net Sales</p><h3 className="text-2xl font-bold text-green-600">₹{netSales}</h3></div><div className="p-3 rounded-full bg-slate-50"><Receipt className="w-6 h-6 text-green-600" /></div></div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div><p className="text-xs font-bold text-slate-500 uppercase">Pending Rx</p><h3 className="text-2xl font-bold text-blue-600">{queue.length}</h3><p className="text-[10px] text-slate-400 mt-1">In Queue</p></div><div className="p-3 rounded-full bg-slate-50"><FileText className="w-6 h-6 text-blue-600" /></div></div>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all"><div><p className="text-xs font-bold text-slate-500 uppercase">Low Stock Items</p><h3 className="text-2xl font-bold text-red-600">{lowStockItems.length}</h3><p className="text-[10px] text-slate-400 mt-1">Reorder Needed</p></div><div className="p-3 rounded-full bg-slate-50"><AlertOctagon className="w-6 h-6 text-red-600" /></div></div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4">Stock Value Distribution</h3>
                            <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: 'Healthy Stock', value: totalInventoryValue - (lowStockItems.length * 100) }, { name: 'Expired/Dead', value: expiredItems.reduce((a, i) => a + (i.purchasePrice * i.stock), 0) }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex justify-between">Recent Invoices <button onClick={() => setView('REPORTS')} className="text-xs text-indigo-600 hover:underline">View All</button></h3>
                            <div className="overflow-y-auto max-h-64 space-y-3">
                                {sales.slice(0, 5).map(sale => (<div key={sale.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg"><div><p className="font-bold text-sm text-slate-800">{sale.invoiceNumber}</p><p className="text-xs text-slate-500">{sale.customerName} • {new Date(sale.date).toLocaleDateString()}</p></div><div className="text-right"><span className="font-bold text-green-700 block">₹{sale.roundedTotal}</span>{sale.balanceDue && sale.balanceDue > 0 ? (<span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">Due: ₹{sale.balanceDue}</span>) : null}</div></div>))}
                                {sales.length === 0 && <p className="text-slate-400 text-sm text-center py-4">No sales recorded yet.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* REPORTS VIEW */}
            {view === 'REPORTS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-slate-900">₹{totalSales.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Profit (Est)</p>
                            <h3 className="text-2xl font-bold text-green-600">
                                ₹{sales.reduce((acc, sale) => acc + sale.items.reduce((iAcc, item) => iAcc + ((item.mrp - item.costPrice) * item.quantity), 0), 0).toFixed(2)}
                            </h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase">Total Invoices</p>
                            <h3 className="text-2xl font-bold text-blue-600">{sales.length}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs font-bold text-slate-500 uppercase">Inventory Value</p>
                            <h3 className="text-2xl font-bold text-purple-600">₹{totalInventoryValue.toFixed(2)}</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Sales Trend Chart */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Sales Trend</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={
                                        Object.entries(sales.reduce((acc: any, sale) => {
                                            const date = new Date(sale.date).toLocaleDateString();
                                            acc[date] = (acc[date] || 0) + sale.roundedTotal;
                                            return acc;
                                        }, {})).map(([name, value]) => ({ name, value }))
                                    }>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Payment Mode Distribution */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Payment Modes</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(sales.reduce((acc: any, sale) => {
                                                acc[sale.paymentMode] = (acc[sale.paymentMode] || 0) + 1;
                                                return acc;
                                            }, {})).map(([name, value]) => ({ name, value }))}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {['#0088FE', '#00C49F', '#FFBB28', '#FF8042'].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Top Selling Items Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Top Selling Products</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-slate-500 uppercase text-xs border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3">Product Name</th>
                                        <th className="px-6 py-3 text-right">Qty Sold</th>
                                        <th className="px-6 py-3 text-right">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(sales.flatMap(s => s.items).reduce((acc: any, item) => {
                                        if (!acc[item.name]) acc[item.name] = { qty: 0, rev: 0 };
                                        acc[item.name].qty += item.quantity;
                                        acc[item.name].rev += item.total;
                                        return acc;
                                    }, {}))
                                        .sort((a: any, b: any) => b[1].rev - a[1].rev)
                                        .slice(0, 10)
                                        .map(([name, data]: any) => (
                                            <tr key={name} className="hover:bg-slate-50">
                                                <td className="px-6 py-3 font-medium text-slate-900">{name}</td>
                                                <td className="px-6 py-3 text-right">{data.qty}</td>
                                                <td className="px-6 py-3 text-right font-bold text-green-600">₹{data.rev.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    {sales.length === 0 && (
                                        <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No sales data available.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* PATIENTS VIEW (UPDATED) */}
            {view === 'PATIENTS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {!viewingCustomer ? (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Search Patients by Name or Phone..."
                                        value={patientSearch}
                                        onChange={e => setPatientSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setIsAddingCustomer(true)}
                                    className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm hover:bg-teal-700 w-full sm:w-auto justify-center"
                                >
                                    <UserPlus className="w-4 h-4 mr-2" /> Add Patient
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {customers.filter(c => c.name.toLowerCase().includes(patientSearch.toLowerCase()) || c.phone.includes(patientSearch)).map(customer => {
                                    const rxCount = myPrescriptions.filter(rx => rx.patientName?.toLowerCase() === customer.name.toLowerCase() || rx.patientPhone === customer.phone).length;
                                    return (
                                        <div
                                            key={customer.id}
                                            onClick={() => setViewingCustomer(customer)}
                                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group relative cursor-pointer"
                                        >
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <ChevronRight className="w-5 h-5 text-indigo-400" />
                                            </div>

                                            <div className="flex items-start mb-3">
                                                <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg mr-3 border border-indigo-100">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-lg">{customer.name}</h3>
                                                    <p className="text-xs text-slate-500 flex items-center mt-1">
                                                        <Phone className="w-3 h-3 mr-1" /> {customer.phone}
                                                    </p>
                                                </div>
                                            </div>

                                            {customer.address && (
                                                <div className="text-xs text-slate-500 mb-3 flex items-start pl-1">
                                                    <MapPin className="w-3 h-3 mr-1 mt-0.5 shrink-0" /> {customer.address}
                                                </div>
                                            )}

                                            <div className="border-t border-slate-100 pt-3 mt-2 grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Visits</p>
                                                    <p className="font-medium text-slate-700">
                                                        {sales.filter(s => s.customerId === customer.id).length + rxCount}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Credit Due</p>
                                                    <p className={`font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        ₹{customer.balance.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTransactionModal({
                                                            type: 'CUSTOMER',
                                                            id: customer.id,
                                                            name: customer.name,
                                                            currentBalance: customer.balance,
                                                            amount: '',
                                                            mode: 'PAYMENT_RECEIVED'
                                                        });
                                                    }}
                                                    className="w-full bg-slate-50 text-slate-600 py-2 rounded text-xs font-bold border border-slate-200 hover:bg-slate-100 flex items-center justify-center"
                                                >
                                                    Settle Due
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {customers.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No patients recorded yet.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        // DETAILED CUSTOMER VIEW
                        <div className="animate-in fade-in slide-in-from-right duration-300">
                            <button
                                onClick={() => setViewingCustomer(null)}
                                className="flex items-center text-slate-500 hover:text-indigo-600 mb-4 font-medium text-sm transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Patient List
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Profile Sidebar */}
                                <div className="md:col-span-1 space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-24 bg-indigo-50 z-0"></div>
                                        <div className="relative z-10">
                                            <div className="w-24 h-24 rounded-full bg-indigo-600 text-white text-3xl font-bold flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-md">
                                                {viewingCustomer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <h2 className="text-xl font-bold text-slate-900">{viewingCustomer.name}</h2>
                                            <p className="text-slate-500 text-sm mt-1">{viewingCustomer.phone}</p>

                                            {/* Derived Details from Rx History */}
                                            {(() => {
                                                const { age, gender } = getCustomerDetailsFromRx(viewingCustomer);
                                                if (age || gender) {
                                                    return (
                                                        <div className="mt-2 text-xs font-medium text-indigo-600 bg-indigo-50 py-1 px-3 rounded-full inline-block">
                                                            {gender} • {age} Years
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-left">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                                                    <p className="text-xs text-slate-700 font-medium">{viewingCustomer.address || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Email</p>
                                                    <p className="text-xs text-slate-700 font-medium truncate">{viewingCustomer.email || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Access Section */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-slate-500 uppercase">App Access</h3>
                                            {patientAccount ? (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Enabled</span>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold">Inactive</span>
                                            )}
                                        </div>

                                        {patientAccount ? (
                                            <div className="space-y-3">
                                                <button
                                                    disabled
                                                    className="w-full bg-slate-100 text-slate-400 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center cursor-not-allowed border border-slate-200"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-2" /> App Access Enabled
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const pAccount = {
                                                            email: patientAccount.email || viewingCustomer.email || '',
                                                            password: '••••••••',
                                                            patientId: viewingCustomer.id,
                                                            pharmacyName: currentUser.clinicName || 'The Pharmacy'
                                                        };
                                                        setPrintedAccess(pAccount);
                                                        setTimeout(() => window.print(), 200);
                                                    }}
                                                    className="w-full bg-white text-indigo-600 border border-indigo-200 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center"
                                                >
                                                    <Printer className="w-3 h-3 mr-2" /> Print Access Recovery Sheet
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setAccessModal({
                                                    email: viewingCustomer.email || '',
                                                    password: '',
                                                    patientId: viewingCustomer.id,
                                                    patientName: viewingCustomer.name
                                                })}
                                                className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm flex items-center justify-center group transition-all"
                                            >
                                                <Shield className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Enable App Access
                                            </button>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-4 text-center">Patients can view their prescriptions and receipts via the portal</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Financial Status</h3>
                                        <div className="flex justify-between items-end mb-4">
                                            <span className="text-slate-600 text-sm">Outstanding Due</span>
                                            <span className={`text-2xl font-bold ${viewingCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                ₹{viewingCustomer.balance.toFixed(2)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setTransactionModal({
                                                type: 'CUSTOMER',
                                                id: viewingCustomer.id,
                                                name: viewingCustomer.name,
                                                currentBalance: viewingCustomer.balance,
                                                amount: '',
                                                mode: 'PAYMENT_RECEIVED'
                                            })}
                                            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"
                                        >
                                            Update Ledger
                                        </button>
                                    </div>
                                </div>

                                {/* History Tabs */}
                                <div className="md:col-span-2 space-y-6">
                                    {/* Prescriptions */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-indigo-600" /> Prescription History
                                            </h3>
                                            <span className="text-xs font-medium text-slate-500">
                                                {getCustomerDetailsFromRx(viewingCustomer).history.length} Records
                                            </span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2">Date</th>
                                                        <th className="px-4 py-2">Doctor</th>
                                                        <th className="px-4 py-2">Diagnosis</th>
                                                        <th className="px-4 py-2 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {getCustomerDetailsFromRx(viewingCustomer).history.length === 0 ? (
                                                        <tr><td colSpan={4} className="p-6 text-center text-slate-400 italic">No prescriptions found for this patient.</td></tr>
                                                    ) : (
                                                        getCustomerDetailsFromRx(viewingCustomer).history.map(rx => (
                                                            <tr key={rx.id} className="hover:bg-indigo-50/50">
                                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                                    {new Date(rx.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                                    Dr. {rx.doctorName}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 text-xs">
                                                                    {rx.diagnosis}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => setSelectedRx(rx)}
                                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50"
                                                                    >
                                                                        View Rx
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Sales / Invoices */}
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-800 flex items-center">
                                                <Receipt className="w-4 h-4 mr-2 text-green-600" /> Billing History
                                            </h3>
                                            <span className="text-xs font-medium text-slate-500">
                                                {getCustomerSales(viewingCustomer).length} Invoices
                                            </span>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2">Date</th>
                                                        <th className="px-4 py-2">Invoice #</th>
                                                        <th className="px-4 py-2 text-center">Items</th>
                                                        <th className="px-4 py-2 text-right">Amount</th>
                                                        <th className="px-4 py-2 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {getCustomerSales(viewingCustomer).length === 0 ? (
                                                        <tr><td colSpan={5} className="p-6 text-center text-slate-400 italic">No purchase history available.</td></tr>
                                                    ) : (
                                                        getCustomerSales(viewingCustomer).map(sale => (
                                                            <tr key={sale.id} className="hover:bg-green-50/30">
                                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                                    {new Date(sale.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                                                                    {sale.invoiceNumber}
                                                                </td>
                                                                <td className="px-4 py-3 text-center text-slate-700">
                                                                    {sale.items.length}
                                                                </td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                                    ₹{sale.roundedTotal}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <button
                                                                        onClick={() => setShowReceipt(sale)}
                                                                        className="text-xs text-green-600 hover:text-green-800 font-bold border border-green-200 px-2 py-1 rounded hover:bg-green-50"
                                                                    >
                                                                        Receipt
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
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* E-PRESCRIPTIONS VIEW (Restored) */}
            {view === 'ERX' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-200px)] animate-in fade-in">
                    <div className="col-span-1 lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px] lg:h-full">
                        <div className="p-4 border-b border-slate-200 flex space-x-2 bg-slate-50">
                            <button onClick={() => setErxTab('QUEUE')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${erxTab === 'QUEUE' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>Queue ({queue.length})</button>
                            <button onClick={() => setErxTab('HISTORY')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${erxTab === 'HISTORY' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>History</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {(erxTab === 'QUEUE' ? queue : history).map(rx => (
                                <div key={rx.id} onClick={() => { if (erxTab === 'QUEUE') handleStartProcessing(rx); else setSelectedRx(rx); }} className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${rx.status === 'SENT_TO_PHARMACY' ? 'bg-white border-slate-200 hover:border-indigo-300' : 'bg-slate-50 border-slate-200 opacity-75 hover:opacity-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-slate-800">{rx.patientName}</h4>
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">{rx.id}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">Dr. {rx.doctorName}</p>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">{new Date(rx.date).toLocaleDateString()}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${rx.status === 'SENT_TO_PHARMACY' ? 'bg-blue-100 text-blue-700' : rx.status === 'DISPENSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{rx.status === 'SENT_TO_PHARMACY' ? 'NEW' : rx.status}</span>
                                    </div>
                                </div>
                            ))}
                            {(erxTab === 'QUEUE' ? queue : history).length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No prescriptions found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-span-1 lg:col-span-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center h-[500px] lg:h-full">
                        <div className="text-center text-slate-400">
                            <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-bold">Select a Prescription</p>
                            <p className="text-sm">Choose from the queue to process or history to view.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* POS VIEW */}
            {view === 'POS' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[calc(100vh-200px)] animate-in fade-in pb-20 lg:pb-0">
                    <div className="col-span-1 lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-[60vh] sm:h-[500px] lg:h-full">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <div className="relative flex-1 w-full"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm" placeholder="Search Product, Generic or Barcode..." value={posSearch} onChange={e => setPosSearch(e.target.value)} autoFocus /></div>
                            <div className="flex gap-2"><button onClick={openQuickAdd} className="w-full sm:w-auto bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-teal-700 flex items-center justify-center whitespace-nowrap"><Plus className="w-4 h-4 mr-1" /> Quick Add</button><button onClick={() => setShowHeldBills(true)} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-200 flex items-center border border-orange-200 relative"><PauseCircle className="w-4 h-4 mr-1" /> Recall {heldBills.length > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{heldBills.length}</span>}</button></div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10"><tr><th className="px-4 py-3">Item Name</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Expiry</th><th className="px-4 py-3 text-right">Stock</th><th className="px-4 py-3 text-right">MRP</th><th className="px-4 py-3 text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{inventory.filter(i => { const s = posSearch.toLowerCase(); return (i.name.toLowerCase().includes(s) || (i.genericName || '').toLowerCase().includes(s) || (i.barcode || '').includes(s)) && i.stock > 0; }).map(item => (<tr key={item.id} className="hover:bg-indigo-50 transition-colors"><td className="px-4 py-3"><div className="font-medium text-slate-900">{item.name}</div>{item.genericName && <div className="text-xs text-slate-500 italic">{item.genericName}</div>}</td><td className="px-4 py-3 font-mono text-slate-600 text-xs">{item.batchNumber}</td><td className={`px-4 py-3 text-xs font-bold ${item.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-red-600' : 'text-green-600'}`}>{item.expiryDate || 'N/A'}</td><td className="px-4 py-3 text-right">{item.stock}</td><td className="px-4 py-3 text-right">₹{item.mrp}</td><td className="px-4 py-3 text-center"><button onClick={() => addToCart(item)} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-indigo-700">Add +</button></td></tr>))}</tbody></table></div>
                        </div>
                    </div>
                    <div className="col-span-1 lg:col-span-4 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-auto lg:h-full min-h-[500px]">
                        <div className="p-4 bg-indigo-900 text-white rounded-t-xl flex justify-between items-center shrink-0"><h3 className="font-bold flex items-center"><ShoppingCart className="mr-2 w-5 h-5" /> Current Bill</h3><span className="bg-indigo-700 px-2 py-1 rounded text-xs">{cart.length} Items</span></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">{cart.map((item, idx) => (<div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-100"><div className="overflow-hidden"><p className="font-bold text-sm text-slate-800 truncate">{item.name}</p><p className="text-xs text-slate-500">{item.quantity} x ₹{item.mrp}</p></div><div className="flex items-center gap-3 shrink-0"><span className="font-bold text-slate-900">₹{item.quantity * item.mrp}</span><button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div></div>))}{cart.length === 0 && <div className="text-center text-slate-400 py-10">Cart is Empty</div>}</div>
                        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                            <div className="mb-2"><select className={`w-full border rounded p-2 text-sm ${((cartTotal - (parseFloat(amountPaidInput) || 0)) > 0 && !selectedPosCustomer) ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-300'}`} onChange={(e) => { const cust = customers.find(c => c.id === e.target.value); setSelectedPosCustomer(cust || null); }} value={selectedPosCustomer?.id || ''}><option value="">Walk-in Patient</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name} (Due: {c.balance})</option>)}</select></div>
                            <div className="flex justify-between text-xl font-bold text-indigo-700 mb-2"><span>Total</span><span>₹{cartTotal}</span></div>
                            <div className="mb-3"><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment Method</label><div className="grid grid-cols-4 gap-2">{['CASH', 'UPI', 'CARD'].map(mode => (<button key={mode} onClick={() => { setPaymentMode(mode as any); if (mode === 'CREDIT') { setAmountPaidInput('0'); } else if (parseFloat(amountPaidInput) === 0 || parseFloat(amountPaidInput) === cartTotal) { setAmountPaidInput(cartTotal.toString()); } }} className={`py-2 px-1 text-xs font-bold rounded-md border transition-all ${paymentMode === mode ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>{mode}</button>))}</div></div>
                            <div className="mb-2"><label className="text-xs font-bold text-slate-600 uppercase mb-1 block">Amount Received</label><div className="flex"><input type="number" className="w-full border-2 border-slate-300 rounded p-2 text-right text-slate-900 focus:border-indigo-600 outline-none" value={amountPaidInput} onChange={(e) => setAmountPaidInput(e.target.value)} onFocus={(e) => e.target.select()} /></div></div>
                            <VirtualNumpad className="mb-3" compact={true} onInput={(k) => { if (k === '.' && amountPaidInput.includes('.')) return; setAmountPaidInput(prev => (prev === '0' && k !== '.') ? k : prev + k); }} onDelete={() => setAmountPaidInput(prev => prev.length > 1 ? prev.slice(0, -1) : '0')} />
                            <div className="flex justify-between text-sm font-medium mb-3"><span className={`${(cartTotal - (parseFloat(amountPaidInput) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>{(cartTotal - (parseFloat(amountPaidInput) || 0)) > 0 ? 'Balance Due:' : 'Change:'}</span><span className={`font-bold ${(cartTotal - (parseFloat(amountPaidInput) || 0)) > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(cartTotal - (parseFloat(amountPaidInput) || 0)).toFixed(2)}</span></div>
                            <div className="grid grid-cols-2 gap-2"><button onClick={handleHoldBill} className="bg-amber-100 text-amber-700 py-3 rounded-lg font-bold hover:bg-amber-200 border border-amber-200 flex justify-center items-center"><PauseCircle className="w-5 h-5 mr-1" /> Hold</button><button onClick={handlePosCheckout} disabled={cart.length === 0} className="bg-green-600 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-green-700 disabled:opacity-50 flex justify-center items-center"><Receipt className="w-5 h-5 mr-1" /> Checkout</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* LEDGER VIEW */}
            {view === 'LEDGER' && (
                <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 flex items-center"><Truck className="mr-2 w-5 h-5" /> Supplier Ledger</h3>
                            <button className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded font-bold" onClick={() => {
                                const name = prompt("Supplier Name:");
                                if (name) setSuppliers([...suppliers, { id: `sup-${Date.now()}`, pharmacyId: currentUser.id, name, contact: '', balance: 0 }]);
                            }}>+ Add</button>
                        </div>
                        <div className="space-y-3">
                            {suppliers.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-100">
                                    <div><p className="font-bold text-sm">{s.name}</p><p className="text-xs text-slate-500">{s.contact || 'No Contact'}</p></div>
                                    <div className="text-right flex items-center gap-3"><div><p className="text-xs text-slate-400 font-bold uppercase">Payable</p><p className={`font-bold ${s.balance < 0 ? 'text-green-600' : 'text-red-600'}`}>₹{Math.abs(s.balance)}</p></div><button onClick={() => setTransactionModal({ type: 'SUPPLIER', id: s.id, name: s.name, currentBalance: s.balance, amount: '', mode: 'PAYMENT_MADE' })} className="p-1 hover:bg-slate-200 rounded text-xs border bg-white flex items-center"><Wallet className="w-3 h-3 mr-1" /> Manage</button></div>
                                </div>
                            ))}
                            {suppliers.length === 0 && <p className="text-center text-slate-400 text-sm">No Suppliers</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* INVENTORY VIEW */}
            {view === 'INVENTORY' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center"><Package className="mr-2 w-5 h-5" /> Current Stock</h3>
                        <button onClick={openQuickAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Item Name</th>
                                    <th className="px-4 py-3">Batch</th>
                                    <th className="px-4 py-3">Expiry</th>
                                    <th className="px-4 py-3 text-right">Stock</th>
                                    <th className="px-4 py-3 text-right">MRP</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium">{item.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{item.batchNumber}</td>
                                        <td className={`px-4 py-3 ${item.expiryDate && new Date(item.expiryDate) < new Date() ? 'text-red-600 font-bold' : ''}`}>{item.expiryDate || 'N/A'}</td>
                                        <td className="px-4 py-3 text-right font-bold">{item.stock}</td>
                                        <td className="px-4 py-3 text-right">₹{item.mrp}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    const qty = prompt(`Write off quantity for ${item.name}?`);
                                                    if (qty) handleWriteOff(item, parseInt(qty), 'Damaged/Expired');
                                                }}
                                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                                            >
                                                Write Off
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {inventory.length === 0 && <p className="text-center text-slate-400 py-8">Inventory empty. Add products to get started.</p>}
                    </div>
                </div>
            )}

            {/* AI VIEW */}
            {view === 'AI' && (
                <div className="animate-in fade-in">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-xl shadow-lg mb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center"><BrainCircuit className="w-8 h-8 mr-3" /> Pharmacy AI Assistant</h2>
                                <p className="text-indigo-100 mt-1">Smart insights on inventory, pricing, and sales trends.</p>
                            </div>
                            <button
                                onClick={fetchInsights}
                                disabled={loadingAi}
                                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-bold shadow hover:bg-indigo-50 disabled:opacity-70 flex items-center"
                            >
                                {loadingAi ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <PlayCircle className="w-5 h-5 mr-2" />}
                                Analyze Data
                            </button>
                        </div>
                    </div>

                    {aiInsights && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-amber-500" /> Reorder Suggestions</h3>
                                <ul className="space-y-3">
                                    {aiInsights.reorderSuggestions.map((s, i) => (
                                        <li key={i} className="text-sm bg-amber-50 p-3 rounded border border-amber-100">
                                            <p className="font-bold text-amber-800">{s.itemName}</p>
                                            <p className="text-amber-700 text-xs">{s.reason}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Tag className="w-5 h-5 mr-2 text-green-500" /> Pricing Strategies</h3>
                                <ul className="space-y-3">
                                    {aiInsights.pricingTips.map((s, i) => (
                                        <li key={i} className="text-sm bg-green-50 p-3 rounded border border-green-100">
                                            <p className="font-bold text-green-800">{s.itemName}</p>
                                            <p className="text-green-700 text-xs">{s.tip}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center"><AlertCircle className="w-5 h-5 mr-2 text-red-500" /> Anomalies Detected</h3>
                                {aiInsights.anomalies.length > 0 ? (
                                    <ul className="space-y-2">
                                        {aiInsights.anomalies.map((a, i) => <li key={i} className="text-sm text-red-600">• {a}</li>)}
                                    </ul>
                                ) : <p className="text-sm text-slate-400 italic">No major anomalies found.</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showQuickAdd && (
                <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
                    {/* ... Same Quick Add Modal content ... */}
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-4 bg-teal-600 text-white flex justify-between items-center rounded-t-xl sticky top-0 z-10"><h3 className="font-bold flex items-center"><Plus className="w-5 h-5 mr-2" /> Quick Add Product</h3><button onClick={() => setShowQuickAdd(false)} className="hover:text-teal-200"><X className="w-6 h-6" /></button></div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name *</label><input className="w-full border p-2 rounded" autoFocus value={quickAddItem.name || ''} onChange={e => setQuickAddItem({ ...quickAddItem, name: e.target.value })} /></div>
                            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Generic Name</label><input className="w-full border p-2 rounded" value={quickAddItem.genericName || ''} onChange={e => setQuickAddItem({ ...quickAddItem, genericName: e.target.value })} /></div>
                            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Barcode (Optional)</label><div className="flex"><input className="w-full border p-2 rounded-l" value={quickAddItem.barcode || ''} onChange={e => setQuickAddItem({ ...quickAddItem, barcode: e.target.value })} /><button className="bg-slate-100 border border-l-0 rounded-r px-3 text-slate-500"><ScanBarcode className="w-4 h-4" /></button></div></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch Number *</label><input className="w-full border p-2 rounded" value={quickAddItem.batchNumber || ''} onChange={e => setQuickAddItem({ ...quickAddItem, batchNumber: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label><input type="date" className="w-full border p-2 rounded" value={quickAddItem.expiryDate || ''} onChange={e => setQuickAddItem({ ...quickAddItem, expiryDate: e.target.value })} /></div>
                            <div className="relative"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity *</label><div className="flex"><input type="number" className="w-full border p-2 rounded-l" value={quickAddItem.stock || ''} onChange={e => setQuickAddItem({ ...quickAddItem, stock: parseInt(e.target.value) })} /><button onClick={() => setNumpadModal({ targetField: 'stock', value: '', onConfirm: (val) => setQuickAddItem(prev => ({ ...prev, stock: parseInt(val) })) })} className="bg-slate-100 border border-l-0 rounded-r px-3 text-slate-600 hover:bg-slate-200"><Keyboard className="w-4 h-4" /></button></div></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">GST %</label><select className="w-full border p-2 rounded" value={quickAddItem.gstPercentage || 0} onChange={e => setQuickAddItem({ ...quickAddItem, gstPercentage: parseFloat(e.target.value) })}><option value="0">0% (Nil)</option><option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option></select></div>
                            <div className="relative"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sale Price (MRP) *</label><div className="flex"><input type="number" className="w-full border p-2 rounded-l font-bold" value={quickAddItem.mrp || ''} onChange={e => setQuickAddItem({ ...quickAddItem, mrp: parseFloat(e.target.value) })} /><button onClick={() => setNumpadModal({ targetField: 'mrp', value: '', onConfirm: (val) => setQuickAddItem(prev => ({ ...prev, mrp: parseFloat(val) })) })} className="bg-slate-100 border border-l-0 rounded-r px-3 text-slate-600 hover:bg-slate-200"><Keyboard className="w-4 h-4" /></button></div></div>
                            <div className="relative"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase Price (PTR)</label><div className="flex"><input type="number" className="w-full border p-2 rounded-l" placeholder="Auto-est if empty" value={quickAddItem.purchasePrice || ''} onChange={e => setQuickAddItem({ ...quickAddItem, purchasePrice: parseFloat(e.target.value) })} /><button onClick={() => setNumpadModal({ targetField: 'purchasePrice', value: '', onConfirm: (val) => setQuickAddItem(prev => ({ ...prev, purchasePrice: parseFloat(val) })) })} className="bg-slate-100 border border-l-0 rounded-r px-3 text-slate-600 hover:bg-slate-200"><Keyboard className="w-4 h-4" /></button></div><p className="text-[10px] text-slate-400 mt-1">Leave blank to estimate (MRP * 0.7)</p></div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0"><button onClick={() => setShowQuickAdd(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cancel</button><button onClick={handleQuickAddSubmit} className="px-6 py-2 bg-teal-600 text-white rounded font-bold hover:bg-teal-700 shadow-sm">Save & Add to Inventory</button></div>
                    </div>
                </div>
            )}

            {showReceipt && <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden"><div className="bg-green-600 p-4 text-center text-white"><CheckCircle className="w-12 h-12 mx-auto mb-2" /><h3 className="text-lg font-bold">Payment Successful</h3><p className="text-sm">Invoice #{showReceipt.invoiceNumber}</p></div><div className="p-6 text-center space-y-4"><p className="text-sm text-slate-600">Bill Total: <span className="font-bold text-slate-900 text-lg">₹{showReceipt.roundedTotal}</span></p>{showReceipt.amountPaid !== undefined && (<div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-2 rounded"><div>Paid: <span className="font-bold">₹{showReceipt.amountPaid}</span></div><div>Due: <span className="font-bold text-red-600">₹{showReceipt.balanceDue || 0}</span></div></div>)}<PrintableReceipt sale={showReceipt} user={currentUser} /><div className="flex gap-3 justify-center"><button onClick={() => window.print()} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700"><Printer className="w-4 h-4 mr-2" /> Print Receipt / Save PDF</button><button onClick={() => setShowReceipt(null)} className="flex items-center border border-slate-300 text-slate-700 px-4 py-2 rounded font-bold hover:bg-slate-50">Close</button></div></div></div></div>}

            {processingRx && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="bg-indigo-900 px-6 py-4 flex justify-between items-center shrink-0"><div><h3 className="text-white font-bold text-lg flex items-center"><FileText className="w-5 h-5 mr-2" /> Processing Prescription</h3><p className="text-indigo-300 text-xs font-mono">{processingRx.id}</p></div><button onClick={() => setProcessingRx(null)} className="text-white/70 hover:text-white"><X className="w-6 h-6" /></button></div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200"><h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Doctor Details</h4><p className="font-bold text-slate-900">Dr. {processingRx.doctorName}</p><p className="text-xs text-slate-500">{processingRx.doctorDetails?.clinicName}</p><h4 className="text-xs font-bold text-slate-500 uppercase mt-4 mb-2">Incoming Patient Info</h4><div className="bg-slate-50 p-2 rounded border border-slate-100 text-sm"><p><span className="font-bold">Name:</span> {processingRx.patientName}</p><p><span className="font-bold">Age/Sex:</span> {processingRx.patientAge} / {processingRx.patientGender}</p><p className="text-xs text-red-500 mt-1"><span className="font-bold">Rx Diagnosis:</span> {processingRx.diagnosis}</p></div></div>
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200"><h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Prescribed Medicines</h4><div className="space-y-2">{processingRx.medicines.map((m, i) => (<div key={i} className="flex justify-between items-center p-2 bg-indigo-50/50 rounded border border-indigo-100"><div><p className="font-bold text-sm text-indigo-900">{m.name}</p><p className="text-xs text-slate-500">{m.dosage} • {m.frequency} • {m.duration}</p></div><div className="flex items-center gap-2">{inventory.find(inv => inv.name.toLowerCase() === m.name.toLowerCase() && inv.stock > 0) ? (<span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold border border-green-200">In Stock</span>) : (<span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold border border-red-200">Check Stock</span>)}<button onClick={() => handlePrintLabel(m)} className="p-1 hover:bg-white rounded text-indigo-600" title="Print Label"><Tag className="w-4 h-4" /></button></div></div>))}</div></div>
                            </div>
                            <div className="space-y-4 flex flex-col">
                                <div className={`bg-white p-5 rounded-lg border-2 ${linkedCustomer ? 'border-green-500' : 'border-indigo-200'} shadow-sm transition-colors`}><div className="flex justify-between items-center mb-4"><h4 className="font-bold text-slate-800 flex items-center">{linkedCustomer ? <UserCheck className="w-5 h-5 mr-2 text-green-600" /> : <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />}{linkedCustomer ? 'Patient Linked' : 'Link Patient Profile'}</h4>{linkedCustomer && (<button onClick={() => { setLinkedCustomer(null); setMatchMode('SEARCH'); }} className="text-xs text-red-500 hover:underline">Change</button>)}</div>{linkedCustomer ? (<div className="bg-green-50 p-3 rounded border border-green-100"><p className="font-bold text-green-900">{linkedCustomer.name}</p><p className="text-xs text-green-700">{linkedCustomer.phone} • {linkedCustomer.id}</p></div>) : (<>{matchMode === 'SEARCH' ? (<div className="space-y-3"><p className="text-xs text-slate-500">Search existing DB or create new profile from Rx data.</p><div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded border border-slate-100 mb-2">{customers.filter(c => c.name.toLowerCase().includes(processingRx.patientName.toLowerCase())).map(c => (<button key={c.id} onClick={() => setLinkedCustomer(c)} className="w-full text-left text-xs p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 flex justify-between"><span className="font-bold">{c.name}</span><span>{c.phone}</span></button>))}{customers.filter(c => c.name.toLowerCase().includes(processingRx.patientName.toLowerCase())).length === 0 && (<p className="text-xs text-slate-400 text-center py-2">No direct name matches found.</p>)}</div><button onClick={() => setMatchMode('CREATE')} className="w-full bg-indigo-100 text-indigo-700 py-2 rounded font-bold text-xs hover:bg-indigo-200">Create New Profile (Auto-fill)</button></div>) : (<div className="space-y-2 animate-in fade-in"><input className="w-full border p-2 rounded text-sm" placeholder="Full Name" value={newCustomerForm.name} onChange={e => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} /><input className="w-full border p-2 rounded text-sm" placeholder="Phone" value={newCustomerForm.phone} onChange={e => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} /><div className="flex gap-2"><button onClick={() => setMatchMode('SEARCH')} className="flex-1 bg-slate-100 text-slate-600 py-1.5 rounded text-xs font-bold">Back</button><button onClick={confirmNewCustomer} className="flex-1 bg-teal-600 text-white py-1.5 rounded text-xs font-bold hover:bg-teal-700">Save & Link</button></div></div>)}</>)}</div>
                                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm mt-auto"><h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Final Action</h4><div className="grid grid-cols-1 gap-3"><button onClick={() => finalizeRx('DISPENSED')} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold shadow hover:bg-green-700 flex items-center justify-center disabled:opacity-50"><CheckCircle className="w-5 h-5 mr-2" /> Approve & Dispense</button><div className="grid grid-cols-2 gap-3"><button onClick={() => finalizeRx('REJECTED_STOCK')} className="bg-orange-100 text-orange-800 py-2 rounded font-bold text-xs hover:bg-orange-200 border border-orange-200">Mark Out of Stock</button><button onClick={() => finalizeRx('REJECTED')} className="bg-red-100 text-red-800 py-2 rounded font-bold text-xs hover:bg-red-200 border border-red-200">Reject Rx</button></div></div><p className="text-[10px] text-slate-400 text-center mt-3">Status update will be sent to Dr. {processingRx.doctorName} immediately.</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {printLabelData && <MedicineLabel data={printLabelData} pharmacyName={currentUser.clinicName || 'Pharmacy'} />}

            {selectedRx && (
                <PrescriptionModal
                    prescription={selectedRx}
                    onClose={() => setSelectedRx(null)}
                    onDispense={(id) => onDispense(id)}
                    isPharmacy={true}
                />
            )}

            {/* Add Patient Modal */}
            {isAddingCustomer && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                <UserPlus className="w-5 h-5 mr-2 text-teal-600" /> Add Patient
                            </h3>
                            <button onClick={() => setIsAddingCustomer(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Patient Name"
                                    value={newCustomerData.name}
                                    onChange={e => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number *</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Mobile Number"
                                    value={newCustomerData.phone}
                                    onChange={e => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email (Optional)</label>
                                <input
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Email Address"
                                    value={newCustomerData.email}
                                    onChange={e => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address (Optional)</label>
                                <textarea
                                    className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                    placeholder="Street Address"
                                    rows={2}
                                    value={newCustomerData.address}
                                    onChange={e => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                                />
                            </div>
                            <button
                                onClick={handleSaveCustomer}
                                className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 shadow-sm mt-2"
                            >
                                Save Patient Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Modal for Customers & Suppliers */}
            {transactionModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[160] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-4 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-bold">Update Ledger</h3>
                            <button onClick={() => setTransactionModal(null)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-slate-500 mb-1">{transactionModal.type === 'SUPPLIER' ? 'Supplier' : 'Customer'}</p>
                            <h2 className="text-xl font-bold text-slate-800 mb-4">{transactionModal.name}</h2>

                            <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-500 uppercase">Current Balance</span>
                                <span className={`font-bold ${transactionModal.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {transactionModal.currentBalance > 0 ? `Due: ₹${transactionModal.currentBalance}` : `Credit: ₹${Math.abs(transactionModal.currentBalance)}`}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Action</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setTransactionModal({ ...transactionModal, mode: transactionModal.type === 'SUPPLIER' ? 'PAYMENT_MADE' : 'PAYMENT_RECEIVED' })}
                                            className={`py-2 text-xs font-bold rounded border ${transactionModal.mode === 'PAYMENT_MADE' || transactionModal.mode === 'PAYMENT_RECEIVED' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-slate-600'}`}
                                        >
                                            {transactionModal.type === 'SUPPLIER' ? 'Payment Made' : 'Payment Received'}
                                        </button>
                                        <button
                                            onClick={() => setTransactionModal({ ...transactionModal, mode: transactionModal.type === 'SUPPLIER' ? 'ADD_CHARGE' : 'ADD_CHARGE' })} // Map customer debit logic if needed
                                            className={`py-2 text-xs font-bold rounded border ${transactionModal.mode === 'ADD_CHARGE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-slate-600'}`}
                                        >
                                            {transactionModal.type === 'SUPPLIER' ? 'Add Credit' : 'Debit Account'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                                    <input
                                        type="number"
                                        className="w-full border-2 border-slate-300 rounded p-2 text-lg font-bold text-slate-900 focus:border-indigo-600 outline-none"
                                        placeholder="0.00"
                                        value={transactionModal.amount}
                                        onChange={e => setTransactionModal({ ...transactionModal, amount: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <button
                                    onClick={handleTransactionSubmit}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                                >
                                    Confirm Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enable App Access Modal */}
            {accessModal && (
                <div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 bg-indigo-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center">
                                <Shield className="w-5 h-5 mr-3 text-indigo-300" /> Enable Patient Access
                            </h3>
                            <button onClick={() => { setAccessModal(null); setGrantingStatus('IDLE'); }}><X className="w-6 h-6 hover:text-red-400 transition-colors" /></button>
                        </div>

                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                                    <Key className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h4 className="font-bold text-lg text-slate-900">Patient Credentials</h4>
                                <p className="text-slate-500 text-sm">Create a login account for {accessModal.patientName}</p>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Login Email</label>
                                    <div className="relative">
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                            placeholder="patient@example.com"
                                            value={accessModal.email}
                                            onChange={e => setAccessModal({ ...accessModal, email: e.target.value })}
                                        />
                                        <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Temporary Password</label>
                                    <div className="relative">
                                        <input
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono font-bold"
                                            placeholder="Enter strong password"
                                            type="text"
                                            value={accessModal.password}
                                            onChange={e => setAccessModal({ ...accessModal, password: e.target.value as any })}
                                        />
                                        <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">Recommended: 8+ chars with numbers</p>
                                </div>

                                {grantingStatus === 'ERROR' && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center text-xs text-red-600">
                                        <AlertCircle className="w-4 h-4 mr-2" /> Could not enable access. Check email or connection.
                                    </div>
                                )}

                                <button
                                    onClick={async () => {
                                        if (!accessModal.email || !accessModal.password) {
                                            alert("Email and Password are required."); return;
                                        }
                                        setGrantingStatus('LOADING');
                                        try {
                                            await dbService.grantPatientAccess(
                                                accessModal.patientId,
                                                accessModal.patientName,
                                                accessModal.email,
                                                accessModal.password,
                                                currentUser.id
                                            );
                                            setGrantingStatus('SUCCESS');

                                            const pData = {
                                                email: accessModal.email,
                                                password: accessModal.password,
                                                patientId: accessModal.patientId,
                                                pharmacyName: currentUser.clinicName || 'The Pharmacy'
                                            };
                                            setPrintedAccess(pData);

                                            // Sync local state
                                            const updated = await dbService.getPatientAccount(accessModal.patientId);
                                            setPatientAccount(updated);

                                            // Log Action
                                            dbService.logSecurityAction(currentUser.id, 'PATIENT_ACCESS_GRANTED', `Enabled portal access for patient: ${accessModal.patientName} (${accessModal.patientId})`);

                                            setTimeout(() => {
                                                window.print();
                                                setAccessModal(null);
                                                setGrantingStatus('IDLE');
                                            }, 500);
                                        } catch (e: any) {
                                            console.error(e);
                                            setGrantingStatus('ERROR');
                                            dbService.logSecurityAction(currentUser.id, 'PATIENT_ACCESS_GRANT_FAILED', `Error: ${e.message || 'Unknown'} for Patient ID: ${accessModal.patientId}`);
                                        }
                                    }}
                                    disabled={grantingStatus === 'LOADING'}
                                    className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 flex justify-center items-center"
                                >
                                    {grantingStatus === 'LOADING' ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                                    Confirm & Create Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {printedAccess && (
                <PrintableAccessSheet data={printedAccess} patientName={viewingCustomer?.name || 'Authorized Patient'} />
            )}
        </div>
    );
};
