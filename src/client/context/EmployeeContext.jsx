/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const EmployeeContext = createContext();

export const useEmployee = () => useContext(EmployeeContext);

export const EmployeeProvider = ({ children }) => {
 const [employee, setEmployee] = useState(() => {
 const saved = localStorage.getItem('currentEmployee');
 return saved ? JSON.parse(saved) : null;
 });
 
 const [employeesList, setEmployeesList] = useState([]);
 const [myShifts, setMyShifts] = useState([]);
 const [currentShift, setCurrentShift] = useState(undefined); // undefined = loading, null = no shift
 
 const [isSyncing, setIsSyncing] = useState(true);
 const [error, setError] = useState('');
 
 // Custom modal state
 const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', data: null });
 const openModal = (type, title, message, data = null) => setModal({ isOpen: true, type, title, message, data });
 const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

 // Load all employees for partner selection
 useEffect(() => {
 const unsub = onSnapshot(collection(db, 'employees'), (snap) => {
 setEmployeesList(snap.docs.map(d => ({ id: d.id, name: d.data().name, isArchived: d.data().isArchived || false })));
 }, err => console.error('Employees listener error:', err));
 return () => unsub();
 }, []);

 // Sync shifts logic
 useEffect(() => {
 if (!employee) {
 setCurrentShift(null);
 setMyShifts([]);
 setIsSyncing(false);
 return;
 }

 setIsSyncing(true);
 setError('');
 let dbReady = false;
 
 // Safety timeout in case Firestore hangs
 const safetyTimer = setTimeout(() => {
 if (!dbReady) {
 setIsSyncing(false);
 setError('Не удалось подключиться к БД. Проверьте интернет.');
 }
 }, 10000);

 const d = new Date();
 if (d.getHours() < 6) d.setDate(d.getDate() - 1); // Shifts before 6 AM belong to previous day
 const todayStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

 // Listen to today's shift
 const unsubToday = onSnapshot(query(collection(db, 'sales'), where('dateStr', '==', todayStr)), (snap) => {
 const todayShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 const closedShifts = todayShifts.filter(s => s.status === 'closed');
 const closedByEmployee = new Set(closedShifts.map(s => s.employeeId));
 
 const activeOpenShifts = todayShifts.filter(s => s.status === 'open' && !closedByEmployee.has(s.employeeId));
 const openShift = activeOpenShifts[0];

 if (openShift) {
 if (openShift.employeeId === employee.id) {
 setCurrentShift(openShift);
 } else {
 setCurrentShift({ status: 'locked', employeeName: openShift.employeeName }); // Someone else opened
 }
 } else if (closedShifts.length > 0) {
 const myClosed = closedShifts.find(s => s.employeeId === employee.id);
 if (myClosed) {
 setCurrentShift(myClosed);
 } else {
 setCurrentShift({ status: 'locked_closed' }); // Shift is closed, not by me
 }
 } else {
 setCurrentShift(null);
 }

 dbReady = true;
 clearTimeout(safetyTimer);
 setIsSyncing(false);
 }, (err) => {
 console.error(err);
 setIsSyncing(false);
 setError('Ошибка подключения к БД.');
 });

 // Listen to all historical shifts for this employee
 const unsubMyShifts = onSnapshot(query(collection(db, 'sales'), where('employeeId', '==', employee.id)), (snap) => {
 setMyShifts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
 });

 return () => { clearTimeout(safetyTimer); unsubToday(); unsubMyShifts(); };
 }, [employee]);

 const login = async (pin) => {
 if (pin.length !== 4) return { success: false, error: 'Пин-код должен состоять из 4 цифр' };
 try {
 const snap = await getDocs(query(collection(db, 'employees'), where('pin', '==', pin)));
 if (snap.empty) return { success: false, error: 'Неверный PIN' };
 
 const empData = { id: snap.docs[0].id, ...snap.docs[0].data() };
 if (empData.isArchived) return { success: false, error: 'Сотрудник архивирован' };
 
 localStorage.setItem('currentEmployee', JSON.stringify(empData));
 setEmployee(empData);
 return { success: true };
 } catch (e) {
 console.error(e);
 return { success: false, error: 'Ошибка сети' };
 }
 };

 const logout = () => {
 localStorage.removeItem('currentEmployee');
 setEmployee(null);
 };

 return (
 <EmployeeContext.Provider value={{
 employee, employeesList, myShifts, currentShift, isSyncing, error,
 login, logout,
 modal, openModal, closeModal
 }}>
 {children}
 </EmployeeContext.Provider>
 );
};
