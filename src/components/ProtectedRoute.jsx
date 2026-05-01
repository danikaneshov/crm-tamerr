import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged слушает изменения статуса авторизации в Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false); // Как только Firebase ответил, убираем загрузку
    });

    // Отписываемся от слушателя, когда компонент удаляется
    return () => unsubscribe();
  }, []);

  // Пока Firebase проверяет статус, показываем простой лоадер
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 font-medium">Проверка доступа...</div>
      </div>
    );
  }

  // Если пользователя нет, жестко перенаправляем на страницу входа
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Если всё ок, рендерим то, что внутри (наш Дашборд)
  return children;
};

export default ProtectedRoute;