import { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEmployee } from '../context/EmployeeContext';
import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dl5vgfkvr/image/upload';
const UPLOAD_PRESET = 'ml_default';

export const useEmployeeData = () => {
 const { employee, currentShift, openModal } = useEmployee();
 const [isUploading, setIsUploading] = useState(false);

 const uploadPhoto = async (file) => {
 try {
 let processedFile = file;

 if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
 const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
 processedFile = new File([convertedBlob], file.name.replace(/\.heic|\.heif/i, '.jpg'), { type: 'image/jpeg' });
 }

 const compressedFile = await imageCompression(processedFile, {
 maxSizeMB: 1,
 maxWidthOrHeight: 1920,
 useWebWorker: true
 });

 const formData = new FormData();
 formData.append('file', compressedFile);
 formData.append('upload_preset', UPLOAD_PRESET);

 const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
 if (!res.ok) {
 const errData = await res.json();
 throw new Error(errData?.error?.message || 'Network error during upload');
 }
 const data = await res.json();
 return data.secure_url;
 } catch (err) {
 console.error('Ошибка загрузки фото:', err);
 throw new Error('Не удалось загрузить фото. Проверьте формат и размер.');
 }
 };

 const handleOpenShift = async (partnerId) => {
 if (!employee) return;
 try {
 const d = new Date();
 if (d.getHours() < 6) d.setDate(d.getDate() - 1);
 const todayStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
 
 const snap = await getDocs(query(collection(db, 'sales'), where('dateStr', '==', todayStr), where('status', '==', 'open'), limit(1)));
 if (!snap.empty) {
 openModal('error', 'Ошибка', 'Смена уже открыта другим сотрудником.');
 return;
 }

 const shiftData = {
 dateStr: todayStr,
 employeeId: employee.id,
 employeeName: employee.name,
 partnerId: partnerId || '',
 status: 'open',
 items: { cocktail1: 0, cocktail2: 0 },
 staffHookahs: 0,
 earned: 0,
 createdAt: serverTimestamp()
 };
 await addDoc(collection(db, 'sales'), shiftData);
 } catch (err) {
 console.error('Ошибка открытия смены:', err);
 openModal('error', 'Ошибка', 'Не удалось открыть смену. Проверьте интернет.');
 }
 };

 const handleAddPartnerMidShift = async (partnerId) => {
 if (!currentShift || !partnerId) return;
 try {
 await updateDoc(doc(db, 'sales', currentShift.id), {
 partnerId: partnerId
 });
 openModal('success', 'Готово', 'Напарник успешно добавлен к текущей смене');
 } catch (err) {
 console.error('Ошибка добавления напарника:', err);
 openModal('error', 'Ошибка', 'Не удалось добавить напарника');
 }
 };

 const handleCloseShift = async (staffHookahs, photoFile) => {
 if (!currentShift || currentShift.status !== 'open') return;

 if (!photoFile) {
 openModal('error', 'Внимание', 'Фотография чека обязательна для закрытия смены!');
 return;
 }

 setIsUploading(true);
 let photoUrl = 'no-photo';
 
 try {
 // 1. Загружаем фото на Cloudinary
 photoUrl = await uploadPhoto(photoFile);
 if (!photoUrl) throw new Error("Не удалось получить ссылку на фото");

 // 2. Отправляем ИИ на анализ
 const aiRes = await fetch('/api/analyze', {
 method: 'POST', 
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ imageUrl: photoUrl }),
 });
 
 if (!aiRes.ok) {
 const errorText = await aiRes.text();
 throw new Error(`Сервер ИИ недоступен: ${errorText}`);
 }
 
 const aiData = await aiRes.json();
 
 if (aiData.cocktail1 === undefined && aiData.cocktail2 === undefined) {
 throw new Error('ИИ не смог распознать кальяны на фото чека. Сделайте фото четче.');
 }

 const c1 = Number(aiData.cocktail1) || 0;
 const c2 = Number(aiData.cocktail2) || 0;

 // 3. Если нули - требуем подтверждение
 if (c1 === 0 && c2 === 0) {
 openModal('zeroConfirm', 'ИИ не нашёл кальянов', 'Система распознала 0 кальянов и 0 замен на чеке. Если кальянов не было — продолжите. Иначе перефоткайте чек.', { 
 items: { cocktail1: 0, cocktail2: 0, staffHookahs }, 
 photoUrl 
 });
 setIsUploading(false);
 return;
 }

 // 4. Если всё найдено - закрываем
 await finalizeCloseShift(c1, c2, staffHookahs, photoUrl);

 } catch (err) {
 console.error("Ошибка закрытия смены:", err);
 openModal('error', 'Возникла проблема', err.message);
 setIsUploading(false);
 }
 };

 // Вызывается из GlobalModal при подтверждении нулевой смены
 const confirmCloseShift = async (items, photoUrl) => {
 setIsUploading(true);
 try {
 await finalizeCloseShift(items.cocktail1, items.cocktail2, items.staffHookahs, photoUrl);
 } catch (err) {
 console.error(err);
 openModal('error', 'Ошибка', 'Не удалось закрыть нулевую смену.');
 } finally {
 setIsUploading(false);
 }
 };

  const finalizeCloseShift = async (c1, c2, staffHookahs, photoUrl) => {
    let creatorBase = Number(employee.baseSalary) || 3000;
    let creatorPercentage = Number(employee.hookahPercentage) || Number(employee.bonus1) || 1500;

    const totalHookahs = Number(c1) + Number(c2);
    let creatorShare = totalHookahs;
    let partnerShare = 0;

    let partnerBase = 0;
    let partnerPercentage = 0;
    let partnerName = 'Напарник';
    let partnerEarned = 0;

    if (currentShift.partnerId) {
      creatorShare = Math.ceil(totalHookahs / 2);
      partnerShare = Math.floor(totalHookahs / 2);

      const partnerSnap = await getDocs(query(collection(db, 'employees'), where('__name__', '==', currentShift.partnerId)));
      if (!partnerSnap.empty) {
        const partnerData = partnerSnap.docs[0].data();
        partnerName = partnerData.name || 'Напарник';
        partnerBase = Number(partnerData.baseSalary) || 3000;
        partnerPercentage = Number(partnerData.hookahPercentage) || Number(partnerData.bonus1) || 1500;
        
        if (!partnerData.strictSalary) {
          partnerBase = partnerBase / 2;
        }
      } else {
        partnerBase = 1500; 
        partnerPercentage = 1500;
      }
      partnerEarned = partnerBase + (partnerShare * partnerPercentage);
    }

    const creatorEarned = creatorBase + (creatorShare * creatorPercentage);
    const itemsData = { cocktail1: c1, cocktail2: c2 };

    await updateDoc(doc(db, 'sales', currentShift.id), {
      status: 'closed',
      items: itemsData,
      staffHookahs: staffHookahs || 0,
      photoUrl: photoUrl,
      baseSalary: creatorBase,
      hookahPercentage: creatorShare * creatorPercentage,
      earned: creatorEarned,
      shiftFraction: currentShift.partnerId ? 0.5 : 1,
      closedAt: serverTimestamp()
    });

    if (currentShift.partnerId) {
      await addDoc(collection(db, 'sales'), {
        dateStr: currentShift.dateStr,
        employeeId: currentShift.partnerId,
        employeeName: partnerName,
        partnerId: employee.id,
        status: 'closed',
        items: itemsData,
        staffHookahs: staffHookahs || 0,
        photoUrl: photoUrl,
        baseSalary: partnerBase,
        hookahPercentage: partnerShare * partnerPercentage,
        earned: partnerEarned,
        shiftFraction: 0.5,
        closedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    }

    openModal('success', 'Смена закрыта!', `Распознано: ${c1} кальянов, ${c2} замен. Ваш заработок: ${creatorEarned} ₸`);
    setIsUploading(false);
  };

 return {
 handleOpenShift,
 handleCloseShift,
 confirmCloseShift,
 handleAddPartnerMidShift,
 isUploading
 };
};
