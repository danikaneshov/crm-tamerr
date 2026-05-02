import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { LogOut, Camera, Loader2, CheckCircle2, UserPlus, PlayCircle, AlertCircle, XCircle, Clock, Banknote, CalendarDays } from 'lucide-react';
import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dl5vgfkvr/image/upload';
const UPLOAD_PRESET = 'ml_default';

const EmployeeApp = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employee, setEmployee] = useState(() => {
    const savedEmployee = localStorage.getItem('currentEmployee');
    return savedEmployee ? JSON.parse(savedEmployee) : null;
  });
  
  const [employeesList, setEmployeesList] = useState([]);
  const [partnerId, setPartnerId] = useState('');
  
  const [currentShift, setCurrentShift] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('shift'); // 'shift', 'stats'
  const [myShifts, setMyShifts] = useState([]);

  // Стейт для кастомных модальных окон
  // type: 'success', 'error', 'zeroConfirm'
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', data: null });

  useEffect(() => {
    const unsubEmp = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployeesList(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });
    return () => unsubEmp();
  }, []);

  useEffect(() => {
    if (!employee) return;
    
    const d = new Date();
    if (d.getHours() < 6) d.setDate(d.getDate() - 1);
    const todayStr = d.toLocaleDateString('ru-RU');

    const q = query(collection(db, 'sales'), where('dateStr', '==', todayStr));
    const unsubSales = onSnapshot(q, (snap) => {
      const todayShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const openShift = todayShifts.find(s => s.status === 'open');
      const closedShifts = todayShifts.filter(s => s.status === 'closed');

      if (openShift) {
        if (openShift.employeeId === employee.id) {
          setCurrentShift(openShift);
        } else {
          setCurrentShift({ status: 'locked', employeeName: openShift.employeeName });
        }
      } else if (closedShifts.length > 0) {
        const myClosed = closedShifts.find(s => s.employeeId === employee.id);
        if (myClosed) {
          setCurrentShift(myClosed);
        } else {
          setCurrentShift({ status: 'locked_closed' });
        }
      } else {
        setCurrentShift(null);
      }
    });

    const unsubMyShifts = onSnapshot(query(collection(db, 'sales'), where('employeeId', '==', employee.id)), (snap) => {
      setMyShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubSales(); unsubMyShifts(); };
  }, [employee]);

  const availableMonths = (() => {
    const months = new Set();
    myShifts.forEach(s => {
      if (s.dateStr) months.add(s.dateStr.split('.').slice(1).join('.'));
    });
    const now = new Date();
    const curMonth = `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    months.add(curMonth);
    return Array.from(months).sort((a, b) => {
      const [m1, y1] = a.split('.');
      const [m2, y2] = b.split('.');
      if (y1 !== y2) return y2 - y1;
      return m2 - m1;
    });
  })();

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || (() => {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
  })());

  const myStats = (() => {
    let empShifts = myShifts;
    if (selectedMonth && selectedMonth !== 'all') {
      empShifts = empShifts.filter(s => s.dateStr && s.dateStr.endsWith(`.${selectedMonth}`));
    }
    const closedShifts = empShifts.filter(s => s.status === 'closed');
    const hookahs = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail1 || 0), 0);
    const replacements = closedShifts.reduce((sum, s) => sum + (s.items?.cocktail2 || 0), 0);
    const totalEarned = closedShifts.reduce((sum, s) => sum + (s.earned || 0), 0);
    const baseSalaryTotal = closedShifts.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
    const hookahPercentageTotal = closedShifts.reduce((sum, s) => sum + (s.hookahPercentage || 0), 0);
    const shiftsCount = closedShifts.reduce((sum, s) => sum + (s.shiftFraction || 1), 0);
    
    const sortedClosedShifts = closedShifts.sort((a, b) => {
      const parseDate = (dStr) => {
         if (!dStr) return 0;
         const [d, m, y] = dStr.split('.');
         return new Date(y, m - 1, d).getTime();
      };
      return parseDate(b.dateStr) - parseDate(a.dateStr);
    });
    
    return { hookahs, replacements, totalEarned, baseSalaryTotal, hookahPercentageTotal, shiftsCount, closedShifts: sortedClosedShifts };
  })();

  const handleLogin = async () => {
    if (pin.length !== 4) return;
    setIsLoading(true);
    setError(''); // Очищаем старую ошибку перед новой попыткой
    try {
      const q = query(collection(db, 'employees'), where('pin', '==', pin));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const empData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setEmployee(empData);
        localStorage.setItem('currentEmployee', JSON.stringify(empData));
        setPin(''); // Очищаем пин после успешного входа
      } else { 
        setError('Неверный PIN'); 
        setPin(''); // Сбрасываем пин при неверном вводе
      }
    } catch { 
      setError('Ошибка БД'); 
      setPin('');
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const handleOpenShift = async () => {
    setIsLoading(true);
    try {
      const d = new Date();
      if (d.getHours() < 6) d.setDate(d.getDate() - 1);
      const todayStr = d.toLocaleDateString('ru-RU');
      
      await addDoc(collection(db, 'sales'), {
        employeeId: employee.id, employeeName: employee.name,
        dateStr: todayStr, startTime: serverTimestamp(), status: 'open'
      });
    } catch { 
      setModal({ isOpen: true, type: 'error', title: 'Ошибка', message: 'Не удалось открыть смену' }); 
    } finally { setIsLoading(false); }
  };

  const closeShiftInDb = async (c1, c2, imageUrl) => {
    let myEarned;
    let myTotalItems;
    const myBase = employee.name.trim().toLowerCase() === 'tamerlan' ? 1500 : 3000;

    let ownerC1 = c1, ownerC2 = c2;
    let partnerC1, partnerC2;

    if (partnerId) {
      const partner = employeesList.find(emp => emp.id === partnerId);
      
      // Рассчитываем так, чтобы общее количество позиций делилось поровну,
      // а если нечетно — владельцу (кто открыл) досталась 1 лишняя позиция.
      const targetOwnerTotal = Math.ceil((c1 + c2) / 2);
      ownerC1 = Math.ceil(c1 / 2); // Владелец всегда получает приоритет по кальянам
      ownerC2 = targetOwnerTotal - ownerC1; // Остаток добираем заменами
      
      partnerC1 = c1 - ownerC1;
      partnerC2 = c2 - ownerC2;

      myTotalItems = ownerC1 + ownerC2;
      myEarned = myBase + (ownerC1 * 1500) + (ownerC2 * 1500);
      
      const partnerTotalItems = partnerC1 + partnerC2;
      
      await addDoc(collection(db, 'sales'), {
        employeeId: partner.id, employeeName: partner.name,
        dateStr: currentShift.dateStr,
        endTime: serverTimestamp(), photoUrl: imageUrl,
        items: { cocktail1: partnerC1, cocktail2: partnerC2 },
        totalItems: partnerTotalItems, earned: 1500 + (partnerC1 * 1500) + (partnerC2 * 1500),
        baseSalary: 1500, hookahPercentage: (partnerC1 * 1500) + (partnerC2 * 1500),
        shiftFraction: 0.5,
        status: 'closed'
      });
    } else {
      myTotalItems = c1 + c2;
      myEarned = myBase + (c1 * 1500) + (c2 * 1500);
    }

    await updateDoc(doc(db, 'sales', currentShift.id), {
      status: 'closed', endTime: serverTimestamp(), photoUrl: imageUrl,
      items: { cocktail1: ownerC1, cocktail2: ownerC2 },
      totalItems: myTotalItems, earned: myEarned,
      baseSalary: myBase, hookahPercentage: (ownerC1 * 1500) + (ownerC2 * 1500),
      shiftFraction: 1
    });
  };

  const handleFileUpload = async (e) => {
    let file = e.target.files[0];
    if (!file || !currentShift) return;

    setIsUploading(true);
    let uploadedImageUrl = 'no-photo';
    
    try {
      // 1. Конвертация HEIC в JPG (если iOS не сделал это сам)
      if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
        try {
          let convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg' });
          if (Array.isArray(convertedBlob)) {
            convertedBlob = convertedBlob[0];
          }
          file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
        } catch (heicError) {
          console.error("Ошибка heic2any:", heicError);
          throw new Error('Ваш телефон передал фото в формате HEIC, и его не удалось переконвертировать. Пожалуйста, сделайте СКРИНШОТ этого фото в галерее и загрузите скриншот.', { cause: heicError });
        }
      }

      // 2. Сжатие изображения для ускорения загрузки и избежания лимитов
      try {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg'
        };
        const compressedFile = await imageCompression(file, options);
        file = compressedFile;
      } catch (compressError) {
        console.error("Ошибка сжатия:", compressError);
        // Если сжатие не удалось, продолжаем с оригинальным (уже jpg) файлом
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        console.error("ОШИБКА CLOUDINARY:", cloudData);
        if (cloudData?.error?.message?.includes('ERR_LIBHEIF')) {
          throw new Error('Cloudinary не поддерживает этот HEIC формат. Пожалуйста, сделайте скриншот чека и загрузите его.');
        }
        throw new Error(`Ошибка Cloudinary: ${cloudData?.error?.message || JSON.stringify(cloudData)}`);
      }
      uploadedImageUrl = cloudData.secure_url;

      const aiRes = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadedImageUrl }),
      });
      
      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        console.error("ОШИБКА AI СЕРВЕРА:", errorText);
        throw new Error(`Сервер временно недоступен: ${errorText}`);
      }
      const aiData = await aiRes.json();
      
      if (aiData.cocktail1 === undefined && aiData.cocktail2 === undefined) {
         throw new Error('Не смог найти кальны на фото');
      }

      await closeShiftInDb(Number(aiData.cocktail1) || 0, Number(aiData.cocktail2) || 0, uploadedImageUrl);
      setModal({ isOpen: true, type: 'success', title: 'Успех!', message: 'Смена закрыта. Отчет отправлен.' });
      
    } catch (error) { 
      console.error("ГЛОБАЛЬНАЯ ОШИБКА ЗАГРУЗКИ ФОТО:", error);
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
        {error && <div className="mb-4 text-red-500 font-bold animate-in fade-in zoom-in">{error}</div>}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => <button key={n} onClick={() => {if(pin.length<4) {setPin(pin+n); setError('');}}} className="h-16 bg-white text-xl rounded-xl shadow-sm border active:bg-slate-50">{n}</button>)}
          <div className="h-16"></div>
          <button onClick={() => {if(pin.length<4) {setPin(pin+'0'); setError('');}}} className="h-16 bg-white text-xl rounded-xl border active:bg-slate-50">0</button>
          <button onClick={() => {setPin(pin.slice(0,-1)); setError('');}} className="h-16 bg-white text-gray-400 rounded-xl border active:bg-slate-50">DEL</button>
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

      <div className="flex-1 p-6 flex flex-col relative overflow-auto">
        
        {activeTab === 'shift' && (
          <div className="flex-1 flex flex-col w-full h-full animate-in fade-in duration-300">
            {/* СОСТОЯНИЕ: СМЕНА ЗАНЯТА ИЛИ УЖЕ ЗАКРЫТА ДРУГИМ */}
            {(currentShift?.status === 'locked' || currentShift?.status === 'locked_closed') && (
              <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 text-center w-full">
                  <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={40} /></div>
                  <h2 className="text-2xl font-black text-gray-800 mb-2">
                    {currentShift.status === 'locked' ? 'Смена уже идет' : 'Смена закрыта'}
                  </h2>
                  <p className="text-gray-500 mb-4 font-medium text-sm">
                    {currentShift.status === 'locked' 
                      ? `Сегодня смену открыл мастер: ${currentShift.employeeName}.` 
                      : 'Сегодня смена уже была закрыта. Больше смен открыть нельзя.'}
                  </p>
                </div>
              </div>
            )}

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

                <div className="mt-auto pb-4">
                  <input type="file" accept="image/jpeg, image/jpg, image/png, image/heic, image/heif" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current.click()} disabled={isUploading} className="w-full py-5 rounded-3xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 bg-gray-900 text-white active:scale-95 disabled:bg-gray-400">
                    {isUploading ? <><Loader2 className="animate-spin"/> Считаем...</> : <><Camera/> ЗАКРЫТЬ СМЕНУ И ОТПРАВИТЬ ЧЕК</>}
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
                    {(currentShift.baseSalary !== undefined) && (
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-500 font-medium">Оклад: <strong className="text-gray-800">{currentShift.baseSalary} ₸</strong></span>
                        <span className="text-gray-500 font-medium">% с кальянов: <strong className="text-gray-800">{currentShift.hookahPercentage} ₸</strong></span>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm text-gray-500 font-medium">Позиций учтено: <span className="font-bold text-gray-800">{currentShift.totalItems} шт</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ВКЛАДКА: МОЯ ЗП */}
        {activeTab === 'stats' && (
          <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 pb-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-800">Моя ЗП</h2>
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200">
                <CalendarDays className="text-gray-400 ml-3" size={18}/>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="py-2 pr-4 bg-transparent font-bold text-gray-700 focus:outline-none cursor-pointer">
                  <option value="all">Все время</option>
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden flex flex-col h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-600 font-black text-2xl shadow-inner">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{employee.name}</h3>
                  <p className="text-sm text-slate-400 font-medium">{myStats.shiftsCount} смен отработано</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 rounded-2xl mb-6 flex-1 flex flex-col justify-center border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Заработано</p>
                <h4 className="text-4xl font-black text-blue-600">{myStats.totalEarned} ₸</h4>
                <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 text-sm">
                  <span className="text-slate-500 font-medium">Оклад: <strong className="text-slate-800">{myStats.baseSalaryTotal} ₸</strong></span>
                  <span className="text-slate-500 font-medium">% с кальянов: <strong className="text-slate-800">{myStats.hookahPercentageTotal} ₸</strong></span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Кальянов</p>
                  <p className="font-black text-slate-800 text-xl">{myStats.hookahs}</p>
                </div>
                <div className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                  <p className="text-xs text-slate-400 uppercase font-bold mb-1">Замен</p>
                  <p className="font-black text-slate-800 text-xl">{myStats.replacements}</p>
                </div>
              </div>

              {/* ИСТОРИЯ СМЕН */}
              {myStats.closedShifts.length > 0 && (
                <div className="mt-8 mb-4">
                  <h3 className="text-lg font-black text-slate-800 mb-4">История смен</h3>
                  <div className="space-y-3">
                    {myStats.closedShifts.map(shift => (
                      <div key={shift.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-800">{shift.dateStr}</p>
                          <p className="text-xs text-slate-400 font-medium">{shift.shiftFraction === 1 ? 'Полная смена' : 'Напарник (0.5)'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-blue-600">{shift.earned} ₸</p>
                          <p className="text-xs text-slate-400">{shift.totalItems} поз.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ПАНЕЛЬ НАВИГАЦИИ (НИЖНЯЯ) */}
      <div className="bg-white border-t border-gray-100 flex z-10 relative mt-auto pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setActiveTab('shift')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${activeTab === 'shift' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Clock size={24}/>
          Смена
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-4 flex flex-col items-center gap-1 font-bold text-xs transition-colors ${activeTab === 'stats' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <Banknote size={24}/>
          Моя ЗП
        </button>
      </div>
    </div>
  );
};

export default EmployeeApp;