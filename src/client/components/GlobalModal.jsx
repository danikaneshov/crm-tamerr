import React from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { useEmployeeData } from '../hooks/useEmployeeData';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';

const GlobalModal = () => {
 const { modal, closeModal } = useEmployee();
 const { confirmCloseShift } = useEmployeeData();

 if (!modal.isOpen) return null;

 const handleConfirmZero = () => {
 confirmCloseShift(modal.data.items, modal.data.photoUrl);
 closeModal();
 };

 return (
 <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
 <div className="bg-white backdrop-blur-xl w-full max-w-sm rounded-[40px] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
 
 {modal.type === 'success' && (
 <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
 <CheckCircle2 size={40} />
 </div>
 )}
 
 {modal.type === 'error' && (
 <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
 <AlertCircle size={40} />
 </div>
 )}

 {modal.type === 'zeroConfirm' && (
 <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
 <HelpCircle size={40} />
 </div>
 )}

 <h2 className="text-2xl font-black text-slate-900 mb-2">{modal.title}</h2>
 <p className="text-slate-500 mb-8">{modal.message}</p>

 {modal.type === 'zeroConfirm' ? (
 <div className="flex gap-4">
 <button 
 onClick={closeModal}
 className="flex-1 p-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-all"
 >
 Отмена
 </button>
 <button 
 onClick={handleConfirmZero}
 className="flex-1 p-4 bg-orange-500 text-slate-700 rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-orange-500/30"
 >
 Продолжить
 </button>
 </div>
 ) : (
 <button 
 onClick={closeModal}
 className="w-full p-4 bg-slate-800 hover:bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-lg shadow-blue-600/30"
 >
 Понятно
 </button>
 )}
 </div>
 </div>
 );
};

export default GlobalModal;
