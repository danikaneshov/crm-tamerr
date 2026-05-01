import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Импортируем функции Firebase
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Путь к нашему конфигу

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // Стейт для вывода ошибок
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Магия Firebase: пытаемся войти
      await signInWithEmailAndPassword(auth, email, password);
      // Если ошибок нет, нас пустит сюда, и мы перекинем пользователя в дашборд
      navigate('/admin');
    } catch (err) {
      console.error(err);
      // Обрабатываем частые ошибки
      if (err.code === 'auth/invalid-credential') {
        setError('Неверный email или пароль');
      } else {
        setError('Произошла ошибка при входе');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-50 px-4 py-2 rounded-lg mb-4 border border-blue-100">
            <span className="font-bold text-xl tracking-wide text-blue-600">CRM Admin</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">Вход в панель</h2>
        </div>

        {/* Блок вывода ошибки */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="admin@crm.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-sm transition-colors mt-4 disabled:bg-blue-300"
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

      </div>
    </div>
  );
};

export default AdminLogin;