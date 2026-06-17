import React, { useState } from 'react';
import { EmployeeProvider, useEmployee } from './context/EmployeeContext';
import ClientLayout from './layout/ClientLayout';
import LoginScreen from './tabs/LoginScreen';
import ShiftTab from './tabs/ShiftTab';
import StatsTab from './tabs/StatsTab';
import GlobalModal from './components/GlobalModal';

const AppContent = () => {
 const { employee } = useEmployee();
 const [activeTab, setActiveTab] = useState('shift'); // 'shift' or 'stats'

 if (!employee) {
 return <LoginScreen />;
 }

 return (
 <ClientLayout activeTab={activeTab} setActiveTab={setActiveTab}>
 {activeTab === 'shift' && <ShiftTab />}
 {activeTab === 'stats' && <StatsTab />}
 <GlobalModal />
 </ClientLayout>
 );
};

const EmployeeAppNew = () => {
 return (
 <EmployeeProvider>
 <AppContent />
 </EmployeeProvider>
 );
};

export default EmployeeAppNew;
