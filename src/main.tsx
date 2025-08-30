import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AuthPage } from './components/AuthPage';
import TagListPage from './components/TagListPage';
import SettingsPage from './components/SettingsPage';
import { useAuth } from './hooks/useAuth';
import { InstancesProvider } from './hooks/useInstances';
import './index.css';

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">
        Carregando...
      </div>
    );
  }

  return session ? (
    <InstancesProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/labels" element={<TagListPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </BrowserRouter>
    </InstancesProvider>
  ) : (
    <AuthPage />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
