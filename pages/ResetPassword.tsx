import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { dbClient } from '../services/database';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken) {
          setSessionError(true);
          setError('No se encontró un token válido. Por favor, solicita un nuevo enlace de recuperación.');
          setInitLoading(false);
          return;
        }

        const { error } = await dbClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          setSessionError(true);
          setError('El enlace ha expirado o no es válido. Por favor, solicita un nuevo enlace de recuperación.');
        }
      } catch (err) {
        setSessionError(true);
        setError('Ocurrió un error al validar el enlace.');
      } finally {
        setInitLoading(false);
      }
    };

    initSession();
  }, []);

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePassword(newPassword)) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error } = await dbClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError('Error al actualizar la contraseña. Intenta nuevamente.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2500);
      }
    } catch (err) {
      setError('Ocurrió un error. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 dark:bg-green-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 dark:bg-green-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
                alt="MotorCheck"
                className="w-24 h-24"
              />
            </div>

            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8">
              <div className="bg-red-500/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="text-red-500" size={32} />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Enlace inválido
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error}
              </p>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
        <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/20 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 dark:bg-green-900/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
          <div className="w-full max-w-md text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
                alt="MotorCheck"
                className="w-24 h-24"
              />
            </div>

            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8">
              <div className="bg-green-500/10 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="text-green-500" size={32} />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                ¡Contraseña actualizada!
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Tu contraseña se ha actualizado correctamente.
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-500">
                Redirigiendo al inicio de sesión...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              Nueva contraseña
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ingresa tu nueva contraseña para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
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
                  <Lock size={20} />
                  Actualizar contraseña
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="w-full py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
            >
              Volver al inicio
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
