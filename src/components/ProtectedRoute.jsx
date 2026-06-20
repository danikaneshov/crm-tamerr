import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const MIN_LOADING_MS = 500; // Уменьшенное время показа оверлея

// Общий оверлей — прозрачный блюр + кружочек загрузки
const LoadingOverlay = ({ fading }) => (
  <>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(255, 255, 255, 0.5)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: fading ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(59, 130, 246, 0.2)',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </>
);

const ProtectedRoute = ({ children }) => {
 const [user, setUser] = useState(null);
 const [authResolved, setAuthResolved] = useState(false);
 const [overlayVisible, setOverlayVisible] = useState(true);
 const [overlayFading, setOverlayFading] = useState(false);
 const loadStartRef = useRef(null);

 useEffect(() => {
 if (!loadStartRef.current) loadStartRef.current = Date.now();
 // onAuthStateChanged слушает изменения статуса авторизации в Firebase
 const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
 setUser(currentUser);
 setAuthResolved(true);
 });

 // Отписываемся от слушателя, когда компонент удаляется
 return () => unsubscribe();
 }, []);

 useEffect(() => {
 if (!authResolved) return;

 // Выдерживаем минимальное время показа, чтобы данные в фоне загрузились
 const elapsed = Date.now() - loadStartRef.current;
 const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

 const timer = setTimeout(() => {
 // Сначала запускаем fade-out анимацию
 setOverlayFading(true);
 // Потом полностью убираем оверлей из DOM
 setTimeout(() => setOverlayVisible(false), 500);
 }, remaining);

 return () => clearTimeout(timer);
 }, [authResolved]);

 // Пока auth не проверен — показываем только оверлей (без контента под ним)
 if (!authResolved) {
 return <LoadingOverlay fading={false} />;
 }

 // Если пользователя нет, жестко перенаправляем на страницу входа
 if (!user) {
 return <Navigate to="/admin/login" replace />;
 }

 // Рендерим контент + прозрачный блюр-оверлей поверх, пока данные подгружаются
 return (
 <>
 {children}
 {overlayVisible && <LoadingOverlay fading={overlayFading} />}
 </>
 );
};

export default ProtectedRoute;