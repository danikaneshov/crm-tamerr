import { useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

export const useInventoryData = () => {
 const { allShifts, invStandards, invMovements, invTemplates } = useAdmin();

 const [operationType, setOperationType] = useState('in');
 const [invCart, setInvCart] = useState([]);
 const [invForm, setInvForm] = useState({ type: 'in', item: 'coal', amount: '', cost: '', note: '', templateId: '' });
 const [isSavingInv, setIsSavingInv] = useState(false);

 // Склад считается кумулятивно за ВСЁ время
 const allClosedShifts = useMemo(() => allShifts.filter(s => s.status === 'closed'), [allShifts]);
 const totalBowls = useMemo(() => allClosedShifts.reduce((a, s) => a + (s.items?.cocktail1 || 0) + (s.items?.cocktail2 || 0) + (s.staffHookahs || 0), 0), [allClosedShifts]);
 
 const autoCoalUsed = totalBowls * (invStandards.coalPerBowl || 0);
 const autoTobaccoUsed = totalBowls * (invStandards.tobaccoPerBowl || 0);
 const autoMouthpieceUsed = totalBowls * (invStandards.mouthpiecePerBowl || 0);

 const coalIn = useMemo(() => invMovements.filter(m => m.item === 'coal' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);
 const tobaccoIn = useMemo(() => invMovements.filter(m => m.item === 'tobacco' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);
 const mouthpieceIn = useMemo(() => invMovements.filter(m => m.item === 'mouthpiece' && m.type === 'in').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);

 const coalWriteoff = useMemo(() => invMovements.filter(m => m.item === 'coal' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);
 const tobaccoWriteoff = useMemo(() => invMovements.filter(m => m.item === 'tobacco' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);
 const mouthpieceWriteoff = useMemo(() => invMovements.filter(m => m.item === 'mouthpiece' && m.type === 'writeoff').reduce((a, m) => a + (m.amount || 0), 0), [invMovements]);

 const coalStock = coalIn - autoCoalUsed - coalWriteoff;
 const tobaccoStock = tobaccoIn - autoTobaccoUsed - tobaccoWriteoff;
 const mouthpieceStock = mouthpieceIn - autoMouthpieceUsed - mouthpieceWriteoff;

 const handleInvSubmit = async (e) => {
 e.preventDefault();
 if (!invForm.amount || Number(invForm.amount) <= 0) return alert('Укажите количество');
 setIsSavingInv(true);
 try {
 const now = new Date();
 await addDoc(collection(db, 'inventory_movements'), {
 type: invForm.type, item: invForm.item,
 amount: Number(invForm.amount), 
 cost: invForm.type === 'in' ? Number(invForm.cost || 0) : 0,
 note: invForm.note || '',
 dateStr: `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`,
 createdAt: serverTimestamp()
 });
 setInvForm({ type: 'in', item: 'coal', amount: '', cost: '', note: '', templateId: '' });
 } catch (err) { alert('Ошибка: ' + err.message); }
 finally { setIsSavingInv(false); }
 };

 const addToCart = (template) => {
 setInvCart(prev => {
 const existing = prev.find(x => x.templateId === template.id);
 if (existing) {
 return prev.map(x => x.templateId === template.id ? { ...x, quantity: x.quantity + 1 } : x);
 }
 return [...prev, {
 id: Date.now() + Math.random(),
 templateId: template.id,
 name: template.name,
 item: template.item,
 amountPerUnit: Number(template.amount),
 pricePerUnit: Number(template.price || 0),
 quantity: 1
 }];
 });
 };

 const removeFromCart = (id) => setInvCart(prev => prev.filter(x => x.id !== id));
 const updateCartItem = (id, field, value) => {
 setInvCart(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
 };

 const handleCartSubmit = async () => {
 if (invCart.length === 0) return;
 setIsSavingInv(true);
 try {
 const now = new Date();
 const dateStr = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
 await Promise.all(invCart.map(item =>
 addDoc(collection(db, 'inventory_movements'), {
 type: 'in',
 item: item.item,
 amount: item.amountPerUnit * item.quantity,
 cost: item.pricePerUnit * item.quantity,
 templateName: item.name,
 note: '',
 dateStr,
 createdAt: serverTimestamp()
 })
 ));
 setInvCart([]);
 alert('Приход сохранён!');
 } catch (err) { alert('Ошибка: ' + err.message); }
 finally { setIsSavingInv(false); }
 };

 return {
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
 };
};
