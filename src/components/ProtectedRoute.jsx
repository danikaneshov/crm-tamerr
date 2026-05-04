import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const MIN_LOADING_MS = 2200; // Минимальное время показа оверлея, чтобы данные БД успели подтянуться

// Общий оверлей — прозрачный блюр + синяя полоска загрузки сверху
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
      }}
    />
    {/* Синяя полоса загрузки сверху */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 10000,
        overflow: 'hidden',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      <div
        style={{
          height: '100%',
          width: '40%',
          background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
          borderRadius: '2px',
          animation: 'loadingBar 1.4s ease-in-out infinite',
        }}
      />
    </div>
    <style>{`
      @keyframes loadingBar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }
    `}</style>
  </>
);

const ProtectedRoute = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayFading, setOverlayFading] = useState(false);
  const loadStartRef = useRef(Date.now());

  useEffect(() => {
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