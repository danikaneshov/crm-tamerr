import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmployeeApp from './components/EmployeeApp';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute'; // Импортируем охранника
import useDynamicFavicon from './hooks/useDynamicFavicon';

function AppRoutes() {
  useDynamicFavicon(); // Динамическая смена favicon по роуту

  return (
    <Routes>
      <Route path="/" element={<EmployeeApp />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Защищаем маршрут админки */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;