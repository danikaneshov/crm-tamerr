import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { doc, setDoc, deleteDoc, addDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export const useSettingsData = () => {
  const { 
    invStandards, invTemplates, ownerProfits, 
    setInvStandards, setOwnerProfits 
  } = useAdmin();

  const [newTemplate, setNewTemplate] = useState({ name: '', item: 'tobacco', amount: '', price: '' });
  const [isSavingInv, setIsSavingInv] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.amount) return alert('Заполните название и количество');
    setIsSavingInv(true);
    try {
      await addDoc(collection(db, 'inventory_templates'), {
        name: newTemplate.name,
        item: newTemplate.item,
        amount: Number(newTemplate.amount),
        price: Number(newTemplate.price || 0)
      });
      setNewTemplate({ name: '', item: 'tobacco', amount: '', price: '' });
    } catch (err) { alert('Ошибка: ' + err.message); }
    finally { setIsSavingInv(false); }
  };

  const handleSaveStandards = async () => {
    setIsSavingInv(true);
    try {
      await setDoc(doc(db, 'settings', 'inventory_standards'), invStandards);
      alert('Стандарты успешно сохранены!');
    } catch (err) { alert('Ошибка: ' + err.message); }
    finally { setIsSavingInv(false); }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'profits'), ownerProfits);
      alert('Настройки прибыли успешно сохранены!');
    } catch (err) { alert('Ошибка сохранения: ' + err.message); }
    finally { setIsSavingSettings(false); }
  };

  const handleDropSales = async () => {
    if (window.confirm('Удалить ВСЕ смены?')) {
      const c = window.prompt('Введите DELETE:');
      if (c === 'DELETE') {
        try {
          const s = await getDocs(collection(db, 'sales'));
          await Promise.all(s.docs.map(d => deleteDoc(doc(db, 'sales', d.id))));
          alert('Очищено.');
        } catch (err) { alert('Ошибка: ' + err.message); }
      }
    }
  };

  return {
    invStandards, setInvStandards,
    invTemplates,
    ownerProfits, setOwnerProfits,
    newTemplate, setNewTemplate,
    isSavingInv, isSavingSettings,
    handleTemplateSubmit, handleSaveStandards, handleSaveSettings, handleDropSales,
    deleteDoc, doc, db
  };
};
