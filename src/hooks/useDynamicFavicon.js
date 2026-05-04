import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Динамически меняет favicon в зависимости от текущего роута.
 * /admin* → иконка админа
 * всё остальное → иконка клиента
 */
const useDynamicFavicon = () => {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin');
    const iconPath = isAdmin
      ? '/icons-admin/icon-192x192.png'
      : '/icons-client/icon-192x192.png';

    const link = document.getElementById('dynamic-favicon');
    if (link) {
      link.href = iconPath;
    }
  }, [location.pathname]);
};

export default useDynamicFavicon;
