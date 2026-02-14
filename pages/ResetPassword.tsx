import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { dbClient } from '../services/database';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    const handleRecovery = async () => {
      try {
        const hash = window.location.hash;

        if (!hash) {
          setError('Modo: sin token');
          setInitLoading(false);
          return;
        }

        const hashParams = new URLSearchParams(hash.replace('#', ''));

        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (!access_token || !refresh_token) {
          setError('Token incompleto');
          setInitLoading(false);
          return;
        }

        const { error } = await dbClient.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          setError('Error estableciendo sesión');
        }

      } catch (err) {
        setError('Error procesando enlace');
      } finally {
        setInitLoading(false);
      }
    };

    handleRecovery();
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
        setError('Enlace inválido o expirado.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2500);
      }
    } catch (err) {
      setError('Ocurrió un error actualizando la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p>Validando enlace...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            ¡Contraseña actualizada!
          </h1>
          <p>Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6 border rounded-xl shadow">
        <h1 className="text-3xl font-bold mb-4 text-center">
          Nueva contraseña
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full p-3 border rounded-lg"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-3"
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmar contraseña"
              className="w-full p-3 border rounded-lg"
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;