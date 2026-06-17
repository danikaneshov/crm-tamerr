import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { Loader2, Delete } from 'lucide-react';

const LoginScreen = () => {
 const { login, error: contextError } = useEmployee();
 const [pin, setPin] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState('');

 const handleKeyPress = async (key) => {
 setError('');
 if (pin.length < 4) {
 const newPin = pin + key;
 setPin(newPin);
 if (newPin.length === 4) {
 setIsLoading(true);
 const res = await login(newPin);
 if (!res.success) {
 setError(res.error);
 setPin('');
 }
 setIsLoading(false);
 }
 }
 };

 const handleDelete = () => {
 setError('');
 setPin(prev => prev.slice(0, -1));
 };

 return (
 <div className="flex flex-col h-[100dvh] bg-slate-50 p-6 relative overflow-hidden">
 {/* Decorative Blobs */}
 <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400/20 blur-3xl mix-blend-multiply"></div>
 <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-400/20 blur-3xl mix-blend-multiply"></div>

 <div className="flex-1 flex flex-col items-center justify-center relative z-10 max-w-sm mx-auto w-full">
 
 <div className="text-center mb-12 animate-in fade-in slide-in-bottom-4 duration-500">
 <span className="text-4xl font-black tracking-tighter text-slate-900 block mb-2">
 Fifty<span className="text-slate-900 ">.</span>
 </span>
 <p className="text-slate-500 font-medium">Приложение для персонала</p>
 </div>

 <div className="w-full glass rounded-[40px] p-8 pb-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
 <h2 className="text-lg font-bold text-slate-700 mb-6 uppercase tracking-widest text-center">Введите PIN</h2>
 
 <div className="flex gap-4 justify-center mb-8">
 {[...Array(4)].map((_, i) => (
 <div 
 key={i} 
 className={`w-4 h-4 rounded-full transition-all duration-300 ${
 i < pin.length 
 ? 'bg-slate-800 scale-110 shadow-[0_0_12px_rgba(37,99,235,0.5)]' 
 : 'bg-slate-200'
 }`}
 />
 ))}
 </div>

 {(error || contextError) && (
 <div className="w-full bg-red-50 text-red-500 p-3 rounded-2xl text-center text-sm font-bold mb-6 animate-in slide-in-top-2">
 {error || contextError}
 </div>
 )}

 <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
 <button
 key={num}
 disabled={isLoading}
 onClick={() => handleKeyPress(num.toString())}
 className="h-16 bg-white rounded-2xl text-2xl font-black text-slate-900 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-90 hover:-translate-y-1 transition-all flex items-center justify-center touch-manipulation"
 >
 {num}
 </button>
 ))}
 <div className="col-span-1"></div>
 <button
 disabled={isLoading}
 onClick={() => handleKeyPress('0')}
 className="h-16 bg-white rounded-2xl text-2xl font-black text-slate-900 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-90 hover:-translate-y-1 transition-all flex items-center justify-center touch-manipulation"
 >
 0
 </button>
 <button
 disabled={isLoading || pin.length === 0}
 onClick={handleDelete}
 className="h-16 bg-white rounded-2xl text-slate-500 border-none active:scale-90 transition-all flex items-center justify-center hover:bg-red-50 hover:text-red-500 touch-manipulation"
 >
 <Delete size={24} />
 </button>
 </div>

 {isLoading && (
 <div className="mt-8 flex flex-col items-center gap-2 text-slate-900 ">
 <Loader2 className="animate-spin" size={24} />
 <span className="text-xs font-bold uppercase tracking-widest">Проверка</span>
 </div>
 )}
 </div>
 </div>
 </div>
 );
};

export default LoginScreen;
