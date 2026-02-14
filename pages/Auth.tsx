import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, X, CheckCircle } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

const Auth: React.FC = () => {
  const { signUpEmail, signInEmail, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Por favor ingresa un email válido');
      return;
    }

    if (!validatePassword(password)) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const result = mode === 'signup'
        ? await signUpEmail(email, password)
        : await signInEmail(email, password);

      if (result.error) {
        if (result.error.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else if (result.error.message.includes('User already registered')) {
          setError('Este email ya está registrado');
        } else {
          setError(result.error.message);
        }
      }
    } catch (err) {
      setError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!validateEmail(resetEmail)) {
      setResetError('Por favor ingresa un email válido');
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        setResetError('Error al enviar el enlace. Verifica tu email.');
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setResetError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleOpenResetModal = () => {
    setShowResetModal(true);
    setResetEmail(email);
    setResetError(null);
    setResetSuccess(false);
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false);
    setResetEmail('');
    setResetError(null);
    setResetSuccess(false);
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 dark:bg-green-900/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img
                src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
                alt="MotorCheck"
                className="w-24 h-24"
              />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              {mode === 'signup' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {mode === 'signup'
                ? 'Registra tus datos para comenzar'
                : 'Inicia sesión para continuar'}
            </p>
          </div>

          <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Registrarse
            </button>
            <button
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Iniciar sesión
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                  disabled={loading}
                  required
                />
              </div>
              {mode === 'signin' && (
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="text-red-500" size={18} />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === 'signup' ? <UserPlus size={20} /> : <LogIn size={20} />}
                  {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={handleCloseResetModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Recuperar contraseña
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {resetSuccess ? (
              <div className="flex flex-col items-center py-6">
                <div className="bg-green-500/10 rounded-full p-4 mb-4">
                  <CheckCircle className="text-green-500" size={48} />
                </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
  ¡Enlace enviado!
</h3>

<p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
  Te enviamos un enlace para restablecer tu contraseña.  
  El enlace es válido por 60 minutos.  
  Si no lo ves, revisa tu carpeta de spam.
</p>
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                  Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
                </p>
                <button
                  onClick={handleCloseResetModal}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                      disabled={resetLoading}
                      required
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="text-red-500" size={18} />
                    <p className="text-sm text-red-500">{resetError}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="flex-1 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Enviar enlace'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
