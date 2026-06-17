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

  // Вспомогательная функция загрузки фото (как в старом коде)
  const uploadPhoto = async (file) => {
    try {
      setIsUploading(true);
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
      if (!res.ok) throw new Error('Network error during upload');
      const data = await res.json();
      setIsUploading(false);
      return data.secure_url;
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
      setIsUploading(false);
      return null;
    }
  };

  const handleOpenShift = async (partnerId) => {
    if (!employee) return;
    try {
      // Ищем открытую смену (вдруг напарник только что открыл)
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

  const handleCloseShift = async (items, photoFile) => {
    if (!currentShift || currentShift.status !== 'open') return;

    if (items.cocktail1 === 0 && items.cocktail2 === 0) {
      openModal('zeroConfirm', 'Вы уверены?', 'Вы закрываете смену с 0 кальянов. Продолжить?', { items, photoFile });
      return;
    }

    await confirmCloseShift(items, photoFile);
  };

  const confirmCloseShift = async (items, photoFile) => {
    try {
      let photoUrl = 'no-photo';
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
        if (!photoUrl) {
          openModal('error', 'Ошибка фото', 'Не удалось загрузить чек. Попробуйте снова.');
          return;
        }
      } else {
        openModal('error', 'Внимание', 'Фотография чека обязательна для закрытия смены!');
        return;
      }

      // Расчет ЗП
      const baseSalary = 500;
      const hookahPercentage = 1000;
      let totalEarned = baseSalary + (items.cocktail1 * hookahPercentage) + (items.cocktail2 * hookahPercentage);
      let shiftFraction = 1;

      if (currentShift.partnerId) {
        totalEarned = totalEarned / 2;
        shiftFraction = 0.5;
      }

      await updateDoc(doc(db, 'sales', currentShift.id), {
        status: 'closed',
        items: items,
        staffHookahs: items.staffHookahs || 0,
        photoUrl: photoUrl,
        baseSalary: currentShift.partnerId ? baseSalary / 2 : baseSalary,
        hookahPercentage: currentShift.partnerId ? (items.cocktail1 * hookahPercentage + items.cocktail2 * hookahPercentage) / 2 : items.cocktail1 * hookahPercentage + items.cocktail2 * hookahPercentage,
        earned: totalEarned,
        shiftFraction: shiftFraction,
        closedAt: serverTimestamp()
      });

      // Если есть напарник, записываем и ему (как отдельный закрытый отчет)
      if (currentShift.partnerId) {
        const partnerSnap = await getDocs(query(collection(db, 'employees'), where('__name__', '==', currentShift.partnerId)));
        let partnerName = 'Напарник';
        if (!partnerSnap.empty) {
          partnerName = partnerSnap.docs[0].data().name;
        }

        await addDoc(collection(db, 'sales'), {
          dateStr: currentShift.dateStr,
          employeeId: currentShift.partnerId,
          employeeName: partnerName,
          partnerId: employee.id, // Я - напарник
          status: 'closed',
          items: items,
          staffHookahs: items.staffHookahs || 0,
          photoUrl: photoUrl, // та же фотка
          baseSalary: baseSalary / 2,
          hookahPercentage: (items.cocktail1 * hookahPercentage + items.cocktail2 * hookahPercentage) / 2,
          earned: totalEarned,
          shiftFraction: 0.5,
          closedAt: serverTimestamp()
        });
      }

      openModal('success', 'Смена закрыта', `Вы заработали: ${totalEarned} ₸`);
    } catch (err) {
      console.error('Ошибка закрытия смены:', err);
      openModal('error', 'Ошибка', 'Не удалось закрыть смену. Попробуйте еще раз.');
    }
  };

  return {
    handleOpenShift,
    handleCloseShift,
    confirmCloseShift,
    isUploading
  };
};
