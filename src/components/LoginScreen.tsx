import { useState } from 'react';

const STORAGE_KEY = 'auth_token';
const TOKEN = 'alfa_metrics_authenticated';

export function isAuthenticated(): boolean {
  return localStorage.getItem(STORAGE_KEY) === TOKEN;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === 'admin' && password === 'АльфаМетрикаТоп') {
      localStorage.setItem(STORAGE_KEY, TOKEN);
      onLogin();
    } else {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-1">Трекинг-план</h1>
        <p className="text-xs text-gray-400 mb-6">Альфа-Банк · Аналитическая разметка</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Логин</label>
            <input
              type="text"
              value={login}
              onChange={(e) => { setLogin(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}
