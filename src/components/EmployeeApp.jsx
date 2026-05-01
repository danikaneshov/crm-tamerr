import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { LogOut, Camera, Loader2, CheckCircle2, UserPlus, PlayCircle, AlertCircle, XCircle } from 'lucide-react';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dl5vgfkvr/image/upload';
const UPLOAD_PRESET = 'ml_default';

const EmployeeApp = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employee, setEmployee] = useState(null);
  
  const [employeesList, setEmployeesList] = useState([]);
  const [partnerId, setPartnerId] = useState('');
  
  const [currentShift, setCurrentShift] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Стейт для кастомных модальных окон
  // type: 'success', 'error', 'zeroConfirm'
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', data: null });

  useEffect(() => {
    const savedEmployee = localStorage.getItem('currentEmployee');
    if (savedEmployee) setEmployee(JSON.parse(savedEmployee));

    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployeesList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsubEmp();
  }, []);

  useEffect(() => {
    if (!employee) return;
    const q = query(collection(db, 'sales'), where('employeeId', '==', employee.id));
    const unsubSales = onSnapshot(q, (snap) => {
      const myShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const openShift = myShifts.find(s => s.status === 'open');
      if (openShift) {
        setCurrentShift(openShift);
      } else {
        const todayStr = new Date().toLocaleDateString('ru-RU');
        const closedToday = myShifts.find(s => s.status === 'closed' && s.dateStr === todayStr);
        setCurrentShift(closedToday || null);
      }
    });
    return () => unsubSales();
  }, [employee]);

  const handleLogin = async () => {
    if (pin.length !== 4) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'employees'), where('pin', '==', pin));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const empData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setEmployee(empData);
        localStorage.setItem('currentEmployee', JSON.stringify(empData));
      } else { setError('Неверный PIN'); }
    } catch (err) { setError('Ошибка БД'); } finally { setIsLoading(false); setPin(''); }
  };

  const handleOpenShift = async () => {
    setIsLoading(true);
    try {
      const todayStr = new Date().toLocaleDateString('ru-RU');
      await addDoc(collection(db, 'sales'), {
        employeeId: employee.id, employeeName: employee.name,
        dateStr: todayStr, startTime: serverTimestamp(), status: 'open'
      });
    } catch (error) { 
      setModal({ isOpen: true, type: 'error', title: 'Ошибка', message: 'Не удалось открыть смену' }); 
    } finally { setIsLoading(false); }
  };

  const closeShiftInDb = async (c1, c2, imageUrl) => {
    let myEarned = 0;
    let myTotalItems = 0;
    const myBase = employee.name === 'Tamerlan' ? 1500 : 3000;

    if (partnerId) {
      const partner = employeesList.find(emp => emp.id === partnerId);
      myTotalItems = (c1 + c2) / 2;
      myEarned = myBase + (c1 / 2 * 1500) + (c2 / 2 * 1500);
      
      await addDoc(collection(db, 'sales'), {
        employeeId: partner.id, employeeName: partner.name,
        dateStr: currentShift.dateStr,
        endTime: serverTimestamp(), photoUrl: imageUrl,
        items: { cocktail1: c1 / 2, cocktail2: c2 / 2 },
        totalItems: myTotalItems, earned: 1500 + (c1 / 2 * 1500) + (c2 / 2 * 1500),
        status: 'closed'
      });
    } else {
      myTotalItems = c1 + c2;
      myEarned = myBase + (c1 * 1500) + (c2 * 1500);
    }

    await updateDoc(doc(db, 'sales', currentShift.id), {
      status: 'closed', endTime: serverTimestamp(), photoUrl: imageUrl,
      items: { cocktail1: partnerId ? c1 / 2 : c1, cocktail2: partnerId ? c2 / 2 : c2 },
      totalItems: myTotalItems, earned: myEarned
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentShift) return;

    setIsUploading(true);
    let uploadedImageUrl = 'no-photo';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const cloudRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error('Не удалось загрузить фото чека');
      uploadedImageUrl = cloudData.secure_url;

      const aiRes = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadedImageUrl }),
      });
      
      if (!aiRes.ok) throw new Error('Сервер ИИ временно недоступен');
      const aiData = await aiRes.json();
      
      if (aiData.cocktail1 === undefined && aiData.cocktail2 === undefined) {
         throw new Error('ИИ не нашел кальяны на фото.');
      }

      await closeShiftInDb(Number(aiData.cocktail1) || 0, Number(aiData.cocktail2) || 0, uploadedImageUrl);
      setModal({ isOpen: true, type: 'success', title: 'Успех!', message: 'Смена закрыта. Отчет отправлен.' });
      
    } catch (error) { 
      // Вместо браузерного Alert открываем нашу кастомную модалку
      setModal({ 
        isOpen: true, 
        type: 'zeroConfirm', 
        title: 'Возникла проблема', 
        message: error.message,
        data: { imageUrl: uploadedImageUrl } // передаем ссылку на фото для нулевой смены
      });
    } finally { 
      setIsUploading(false); 
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleZeroShiftConfirm = async () => {
    setIsUploading(true);
    setModal({ isOpen: false, type: '', title: '', message: '', data: null }); // закрываем модалку
    try {
      await closeShiftInDb(0, 0, modal.data.imageUrl);
      setModal({ isOpen: true, type: 'success', title: 'Успех!', message: 'Нулевая смена закрыта.' });
    } catch (err) {
      setModal({ isOpen: true, type: 'error', title: 'Ошибка', message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white shadow-sm border border-gray-100 rounded-2xl px-6 py-4 mb-8"><span className="font-bold text-2xl text-blue-600">CRM</span></div>
        <div className="flex gap-4 mb-8">{[...Array(4)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${i < pin.length ? 'bg-blue-600' : 'bg-gray-200'}`} />)}</div>
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => {if(pin.length<4) setPin(pin+n)}} className="h-16 bg-white text-xl rounded-xl shadow-sm border active:bg-slate-50">{n}</button>)}
          <button onClick={() => setPin(pin.slice(0,-1))} className="h-16 bg-white text-gray-400 rounded-xl border active:bg-slate-50">DEL</button>
          <button onClick={() => {if(pin.length<4) setPin(pin+'0')}} className="h-16 bg-white text-xl rounded-xl border active:bg-slate-50">0</button>
          <button onClick={handleLogin} disabled={pin.length !== 4 || isLoading} className="h-16 bg-blue-600 text-white rounded-xl font-bold disabled:bg-gray-300">ВХОД</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      
      {/* МОДАЛЬНЫЕ ОКНА */}
      {modal.isOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            
            {modal.type === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{modal.title}</h3>
                <p className="text-slate-500 mb-6">{modal.message}</p>
                <button onClick={() => setModal({ isOpen: false })} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold active:scale-95 transition-transform">Понятно</button>
              </div>
            )}

            {modal.type === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><XCircle size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{modal.title}</h3>
                <p className="text-slate-500 mb-6">{modal.message}</p>
                <button onClick={() => setModal({ isOpen: false })} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold active:scale-95 transition-transform">Закрыть</button>
              </div>
            )}

            {modal.type === 'zeroConfirm' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{modal.title}</h3>
                <p className="text-slate-500 mb-6 text-sm">{modal.message}</p>
                <div className="space-y-3">
                  <button onClick={() => setModal({ isOpen: false })} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold active:scale-95 transition-transform">
                    Перефоткать чек
                  </button>
                  <button onClick={handleZeroShiftConfirm} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold active:scale-95 transition-transform">
                    Закрыть как НУЛЕВУЮ смену
                  </button>
                  <p className="text-[10px] text-slate-400 px-4">*Нулевая смена = 0 кальянов. Начислится только базовая ставка.</p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* ШАПКА */}
      <div className="bg-white p-6 border-b flex justify-between items-center z-10 relative">
        <div><p className="text-xs text-gray-400 uppercase font-bold">Сотрудник</p><h1 className="text-xl font-bold text-gray-800">{employee.name}</h1></div>
        <button onClick={() => {setEmployee(null); localStorage.clear();}} className="p-2 text-gray-300 hover:text-red-500"><LogOut/></button>
      </div>

      <div className="flex-1 p-6 flex flex-col relative">
        
        {/* СОСТОЯНИЕ 1: СМЕНА НЕ ОТКРЫТА */}
        {!currentShift && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 text-center w-full">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><PlayCircle size={40} /></div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">Новая смена</h2>
              <p className="text-gray-400 mb-8 text-sm">Нажмите кнопку ниже, чтобы начать рабочий день. Дата зафиксируется автоматически.</p>
              <button onClick={handleOpenShift} disabled={isLoading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                {isLoading ? 'Открытие...' : 'ОТКРЫТЬ СМЕНУ'}
              </button>
            </div>
          </div>
        )}

        {/* СОСТОЯНИЕ 2: СМЕНА ОТКРЫТА */}
        {currentShift?.status === 'open' && (
          <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">Смена идет</span>
                <span className="font-mono text-blue-100">{currentShift.dateStr}</span>
              </div>
              <h2 className="text-xl font-medium opacity-90">Ждем закрытия и отчет</h2>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-3 ml-1">С кем работал?</label>
              <div className="relative">
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="w-full bg-slate-50 border border-transparent p-4 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 font-bold">
                  <option value="">Один (Вся ЗП моя)</option>
                  {employeesList.filter(e => e.id !== employee.id).map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><UserPlus size={20}/></div>
              </div>
            </div>

            <div className="mt-auto">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current.click()} disabled={isUploading} className="w-full py-5 rounded-3xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 bg-gray-900 text-white active:scale-95 disabled:bg-gray-400">
                {isUploading ? <><Loader2 className="animate-spin"/> Считаем ИИ...</> : <><Camera/> ЗАКРЫТЬ СМЕНУ И ОТПРАВИТЬ ЧЕК</>}
              </button>
            </div>
          </div>
        )}

        {/* СОСТОЯНИЕ 3: СМЕНА ЗАКРЫТА */}
        {currentShift?.status === 'closed' && (
          <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 text-center w-full relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} /></div>
              <h2 className="text-2xl font-black text-gray-800 mb-1">Смена закрыта</h2>
              <p className="text-gray-400 mb-8 font-mono text-sm">{currentShift.dateStr}</p>
              
              <div className="bg-slate-50 rounded-2xl p-4 text-left">
                <p className="text-xs text-gray-400 uppercase font-bold mb-1">Начислено</p>
                <p className="text-3xl font-black text-slate-800 mb-4">{currentShift.earned} ₸</p>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-sm text-gray-500 font-medium">Кальянов учтено: <span className="font-bold text-gray-800">{currentShift.totalItems} шт</span></p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EmployeeApp;