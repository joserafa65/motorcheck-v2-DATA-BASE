import React, { useState } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({
  offerings,
  onPurchase,
  onRestore,
  onClose
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isWeb = Capacitor.getPlatform() === 'web';

  const displayOfferings =
    isWeb && (!offerings || offerings.length === 0)
      ? [
          {
            identifier: 'lifetime_mock',
            product: {
              identifier: 'lifetime_mock',
              title: 'De por vida',
              description: 'Acceso completo para siempre',
              priceString: '$34.99',
            },
          },
          {
            identifier: 'annual_mock',
            product: {
              identifier: 'annual_mock',
              title: 'Anual',
              description: 'Acceso completo',
              priceString: '$9.99 / año',
            },
          },
          {
            identifier: 'monthly_mock',
            product: {
              identifier: 'monthly_mock',
              title: 'Mensual',
              description: 'Acceso completo',
              priceString: '$1.99 / mes',
            },
          },
        ]
      : offerings || [];

  const handlePurchase = async (pkg: any) => {
    if (isWeb) {
      setError('Disponible solo en la app móvil.');
      return;
    }

    setLoading(pkg.identifier);
    setError(null);

    const result = await onPurchase(pkg);

    if (!result.success && result.error) {
      setError(result.error);
    }

    setLoading(null);
  };

  const handleRestore = async () => {
    if (isWeb) {
      setError('Disponible solo en la app móvil.');
      return;
    }

    setRestoring(true);
    setError(null);

    const result = await onRestore();

    if (!result.success && result.error) {
      setError(result.error);
    }

    setRestoring(false);
  };

  const benefits = [
    'Recordatorio de mantenimientos',
    'Backup automático en la nube',
    'Historial ilimitado',
    'Estadísticas de consumo',
    'Exportación de reportes PDF',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center px-5">
      <div className="max-w-sm mx-auto w-full relative">

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-0 right-0 text-gray-400 hover:text-white"
          >
            <X size={22} />
          </button>
        )}

        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img
            src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
            alt="MotorCheck"
            className="w-14 h-14"
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-xl font-semibold text-white">
          MOTORCHECK Premium
        </h1>

        <p className="text-center text-gray-400 text-xs mt-1 mb-4">
          Menos fallas. Más productividad. Más ingresos.
        </p>

        {/* Benefits */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4">
          <div className="space-y-1.5">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-200">
                <Check size={14} className="text-green-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-2 mb-4">
          {displayOfferings.map((pkg: any, index) => {
            const isLoading = loading === pkg.identifier;
            const isLifetime = index === 0;

            return (
              <div
                key={pkg.identifier}
                className={`p-3 rounded-lg border ${
                  isLifetime
                    ? 'border-blue-500 bg-white/5'
                    : 'border-white/10 bg-white/3'
                }`}
              >
                {isLifetime && (
                  <div className="text-xs text-blue-400 font-medium mb-1">
                    Mejor valor
                  </div>
                )}

                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-white font-medium">
                    {pkg.product.title}
                  </div>
                  <div className="text-sm text-white font-semibold">
                    {pkg.product.priceString}
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={isLoading}
                  className="w-full py-2 rounded-md text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
                >
                  {isWeb ? 'Disponible en app móvil' : 'Continuar'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Restore */}
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="w-full text-xs text-gray-400 hover:text-white"
        >
          {restoring ? 'Restaurando...' : 'Restaurar compras'}
        </button>

        {/* Legal */}
        <div className="mt-3 text-[10px] text-gray-500 text-center leading-snug">
          Suscripciones con renovación automática.
          Cancela en Ajustes &gt; Apple ID &gt; Suscripciones.
        </div>

        <div className="flex justify-center gap-3 text-[10px] mt-1">
          <a
            href="https://labappstudio.com/motorcheck#terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-gray-400 hover:text-white"
          >
            Términos
          </a>
          <a
            href="https://labappstudio.com/motorcheck#privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-gray-400 hover:text-white"
          >
            Privacidad
          </a>
        </div>

      </div>
    </div>
  );
};