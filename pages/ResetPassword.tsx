import React, { useState, useEffect } from 'react';
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
        const { data, error } = await dbClient.auth.getSession();

        if (error || !data.session) {
          setSessionError(true);
          setError('Enlace inválido o expirado. Solicita uno nuevo.');
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
        setError('Error al actualizar la contraseña.');
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2500);
      }
    } catch (err) {
      setError('Ocurrió un error.');
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

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Enlace inválido o expirado
          </h1>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Volver al inicio
          </button>
        </div>
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