import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthPage: React.FC = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1e293b] p-6 rounded-lg shadow-md space-y-4 w-80"
      >
        <h2 className="text-white text-lg font-semibold text-center">
          {isSignUp ? 'Crie sua conta' : 'Entrar'}
        </h2>
        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-[#0f172a] text-white focus:outline-none"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          className="w-full p-2 rounded bg-[#0f172a] text-white focus:outline-none"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          type="submit"
          className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Enviando...' : isSignUp ? 'Registrar' : 'Entrar'}
        </button>
        <p className="text-gray-400 text-sm text-center">
          {isSignUp ? 'Já tem conta?' : 'Não tem conta?'}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-indigo-400 hover:underline"
          >
            {isSignUp ? 'Faça login' : 'Crie uma conta'}
          </button>
        </p>
      </form>
    </div>
  );
};
