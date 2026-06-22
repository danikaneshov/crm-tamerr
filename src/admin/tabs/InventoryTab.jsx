import React from 'react';
import { ShoppingCart, Plus, Edit3, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { formatMoney } from '../utils/format';
import { useAdmin } from '../context/AdminContext';
import { useInventoryData } from '../hooks/useInventoryData';
import OperationsPanel from './OperationsPanel';
import RevisionPanel from './RevisionPanel';

const InventoryTab = () => {
 const { subTab, setSubTab } = useAdmin();
 const {
 invStandards, invMovements, invTemplates,
 operationType, setOperationType,
 invCart, setInvCart,
 invForm, setInvForm,
 isSavingInv,
 totalBowls,
 coalIn, tobaccoIn, mouthpieceIn,
 coalWriteoff, tobaccoWriteoff, mouthpieceWriteoff,
 autoCoalUsed, autoTobaccoUsed, autoMouthpieceUsed,
 coalStock, tobaccoStock, mouthpieceStock,
 handleInvSubmit, addToCart, removeFromCart, updateCartItem, handleCartSubmit
 } = useInventoryData();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 bg-slate-200/60 p-1.5 rounded-[20px] w-full max-w-full overflow-x-auto scrollbar-hide">
        <button onClick={(e) => { setSubTab('stock'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'stock' || !subTab ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'}`}>Остатки</button>
        <button onClick={(e) => { setSubTab('operations'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'operations' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'}`}>Операции (Приход / Списание)</button>
        <button onClick={(e) => { setSubTab('revision'); e.target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }} className={`px-5 py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${subTab === 'revision' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'}`}>Ревизия</button>
      </div>

 {(subTab === 'stock' || !subTab) && (
 <div className="space-y-6">
 <h1 className="text-2xl font-bold text-slate-900 ">Текущие остатки</h1>
 <Card variant="gradient" className="p-6 relative overflow-hidden">
 <div className="relative z-10">
 <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-80 text-blue-100">Хватит примерно на</p>
 <h3 className="text-3xl font-black text-slate-700">≈ {Math.max(0, Math.floor(Math.min(coalStock / invStandards.coalPerBowl, tobaccoStock / (invStandards.tobaccoPerBowl || 1))))} чаш</h3>
 <p className="text-xs opacity-70 mt-1 text-slate-700">По стандарту: {invStandards.coalPerBowl} углей + {invStandards.tobaccoPerBowl}г табака на чашу</p>
 </div>
 <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent"></div>
 </Card>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <Card variant="elevated" className="p-8 card-hover-effect">
 <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center text-slate-700 text-xl shadow-inner shadow-white/20"></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Уголь</p><h3 className="text-3xl font-black text-slate-900 ">{formatMoney(Math.round(coalStock))} шт</h3></div></div>
 <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
 <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(coalIn)}</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш):</span><strong className="text-red-500">-{formatMoney(autoCoalUsed)}</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(coalWriteoff)}</strong></div>
 </div>
 <div className="mt-3 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-center"><span className="text-slate-900 font-black text-sm">≈ {Math.max(0, Math.floor(coalStock / invStandards.coalPerBowl))} чаш</span></div>
 </Card>

 <Card variant="elevated" className="p-8 card-hover-effect">
 <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-slate-700 text-xl shadow-inner shadow-white/20"></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Табак</p><h3 className="text-3xl font-black text-slate-900 ">{formatMoney(Math.round(tobaccoStock))} г</h3></div></div>
 <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
 <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(tobaccoIn)} г</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш):</span><strong className="text-red-500">-{formatMoney(autoTobaccoUsed)} г</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(tobaccoWriteoff)} г</strong></div>
 </div>
 <div className="mt-3 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-center"><span className="text-slate-900 font-black text-sm">≈ {Math.max(0, Math.floor(tobaccoStock / (invStandards.tobaccoPerBowl || 1)))} чаш</span></div>
 </Card>

 <Card variant="elevated" className="p-8 card-hover-effect">
 <div className="flex items-center gap-4 mb-4"><div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-slate-700 text-xl shadow-inner shadow-white/20"></div><div><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Мундштуки</p><h3 className="text-3xl font-black text-slate-900 ">{formatMoney(Math.round(mouthpieceStock))} шт</h3></div></div>
 <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-sm border border-slate-100">
 <div className="flex justify-between"><span className="text-slate-500">Приход (всего):</span><strong className="text-green-600">+{formatMoney(mouthpieceIn)}</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Расход (авто, {totalBowls} чаш):</span><strong className="text-red-500">-{formatMoney(autoMouthpieceUsed)}</strong></div>
 <div className="flex justify-between"><span className="text-slate-500">Списано вручную:</span><strong className="text-orange-500">-{formatMoney(mouthpieceWriteoff)}</strong></div>
 </div>
 <div className="mt-3 px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-center"><span className="text-slate-900 font-black text-sm">≈ {Math.max(0, Math.floor(mouthpieceStock / (invStandards.mouthpiecePerBowl || 1)))} чаш</span></div>
 </Card>
 </div>
 </div>
 )}

 {subTab === 'operations' && <OperationsPanel />}
 {subTab === 'revision' && <RevisionPanel />}
 </div>
 );
};

export default InventoryTab;
