import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Динамически меняет favicon, apple-touch-icon и manifest
 * в зависимости от текущего роута.
 * /admin* → иконки и манифест админа
 * всё остальное → иконки и манифест клиента
 */
const useDynamicFavicon = () => {
  const location = useLocation();

  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin');
    const iconFolder = isAdmin ? 'icons-admin' : 'icons-client';
    const manifestFile = isAdmin ? 'manifest-admin.json' : 'manifest-client.json';

    // Favicon
    const favicon = document.getElementById('dynamic-favicon');
    if (favicon) {
      favicon.href = `/${iconFolder}/icon-192x192.png`;
    }

    // Apple Touch Icon (для iPhone «Добавить на экран Домой»)
    const appleIcon = document.getElementById('dynamic-apple-icon');
    if (appleIcon) {
      appleIcon.href = `/${iconFolder}/icon-192x192.png`;
    }

    // Manifest (для PWA иконок)
    const manifest = document.getElementById('dynamic-manifest');
    if (manifest) {
      manifest.href = `/${manifestFile}`;
    }
  }, [location.pathname]);
};

export default useDynamicFavicon;
