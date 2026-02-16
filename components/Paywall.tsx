import React, { useState } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
}

export const Paywall: React.FC<PaywallProps> = ({ offerings, onPurchase, onRestore }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isWeb = Capacitor.getPlatform() === 'web';

  // Mock visual para web
  const displayOfferings = isWeb && (!offerings || offerings.length === 0)
    ? [
        {
          identifier: 'annual_mock',
          product: {
            identifier: 'annual_mock',
            title: 'Plan Anual',
            description: 'Acceso completo a todas las funciones',
            priceString: '$9.99 / año',
          }
        },
        {
          identifier: 'monthly_mock',
          product: {
            identifier: 'monthly_mock',
            title: 'Plan Mensual',
            description: 'Acceso completo a todas las funciones',
            priceString: '$1.99 / mes',
          }
        },
        {
          identifier: 'lifetime_mock',
          product: {
            identifier: 'lifetime_mock',
            title: 'De por vida',
            description: 'Acceso completo para siempre',
            priceString: '$34.99 / por siempre',
          }
        }
      ]
    : offerings || [];

  const handlePurchase = async (pkg: any) => {
    if (isWeb) {
      setError('Las compras solo están disponibles en la app móvil.');
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
      setError('La restauración solo está disponible en la app móvil.');
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
    'Backup automático en la nube',
    'Historial ilimitado de servicios',
    'Estadísticas detalladas de consumo',
    'Sincronización entre dispositivos',
    'Recordatorios de mantenimiento',
    'Exportación de reportes PDF',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="min-h-full flex flex-col px-5 pt-10 pb-8">
        <div className="max-w-md mx-auto w-full">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-xl mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white">
              Desbloquea MotorCheck Premium
            </h1>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Todo lo que necesitas para mantener tus vehículos en perfecto estado.
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/10">
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-gray-200 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div className="space-y-3 mb-6">
            {displayOfferings.map((pkg: any) => {
              const isLoading = loading === pkg.identifier;
              const isAnnual = pkg.product.title.toLowerCase().includes('anual');

              return (
                <div
                  key={pkg.identifier}
                  className={`
                    p-4 rounded-xl border
                    ${isAnnual ? 'border-blue-500 bg-white/5' : 'border-white/10 bg-white/3'}
                  `}
                >
                  {isAnnual && (
                    <div className="mb-2 text-xs text-blue-400 font-medium">
                      Mejor valor
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-medium">
                        {pkg.product.title}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {pkg.product.description}
                      </p>
                    </div>
                    <p className="text-white font-semibold text-lg">
                      {pkg.product.priceString}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading || loading !== null}
                    className="w-full py-2.5 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 transition-colors text-white"
                  >
                    {isWeb ? 'Disponible en la app móvil' : 'Continuar'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs text-center">{error}</p>
            </div>
          )}

          {/* Restore */}
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full text-gray-400 hover:text-white text-xs transition-colors"
          >
            {restoring ? 'Restaurando...' : 'Restaurar compras'}
          </button>

          {/* Legal */}
          <div className="mt-6 text-center text-xs text-gray-500 leading-relaxed">
            Las suscripciones se renuevan automáticamente a menos que se cancelen al menos 24 horas antes del final del período actual.
            El pago se cargará a tu cuenta de Apple ID al confirmar la compra.
            Puedes gestionar o cancelar tu suscripción en Ajustes &gt; Apple ID &gt; Suscripciones.
          </div>

          <div className="mt-3 flex justify-center gap-4 text-xs">
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
    </div>
  );
};