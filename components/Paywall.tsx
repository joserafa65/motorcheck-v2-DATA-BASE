import React, { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  offerings: any[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
}

export const Paywall: React.FC<PaywallProps> = ({ offerings, onPurchase, onRestore }) => {

  // 🔥 CAMBIA ESTO A FALSE CUANDO APPLE APRUEBE
  const FORCE_PREVIEW = true;

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const isWeb = Capacitor.getPlatform() === 'web';

  const previewOfferings = [
    {
      identifier: 'preview_yearly',
      product: {
        identifier: 'preview_yearly',
        title: 'Plan Anual',
        description: 'Acceso completo a todas las funciones',
        priceString: '$9.99 / año',
      }
    },
    {
      identifier: 'preview_monthly',
      product: {
        identifier: 'preview_monthly',
        title: 'Plan Mensual',
        description: 'Acceso completo a todas las funciones',
        priceString: '$1.99 / mes',
      }
    },
    {
      identifier: 'preview_lifetime',
      product: {
        identifier: 'preview_lifetime',
        title: 'De por vida',
        description: 'Acceso completo para siempre',
        priceString: '$34.99 / por siempre',
      }
    }
  ];

  const displayOfferings = FORCE_PREVIEW
    ? previewOfferings
    : offerings || [];

  const handlePurchase = async (pkg: any) => {

    if (FORCE_PREVIEW || isWeb) {
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

    if (FORCE_PREVIEW || isWeb) {
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-y-auto">
      <div className="min-h-full flex flex-col p-6 pb-8">
        <div className="flex-1 max-w-2xl mx-auto w-full">

          {/* HEADER */}
          <div className="text-center mb-8 mt-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Desbloquea MotorCheck Premium
            </h1>
            <p className="text-gray-400 text-lg">
              Todo lo que necesitas para mantener tus vehículos en perfecto estado
            </p>
          </div>

          {/* BENEFICIOS */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-white text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PLANES */}
          <div className="space-y-4 mb-6">
            {displayOfferings.map((pkg: any) => {

              const isAnnual = pkg.identifier === 'preview_yearly';
              const isLoading = loading === pkg.identifier;

              return (
                <div
                  key={pkg.identifier}
                  className={`relative p-5 rounded-2xl border-2 transition-all ${
                    isAnnual
                      ? 'bg-white/10 border-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                >

                  {isAnnual && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                      Mejor Valor
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {pkg.product.title}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {pkg.product.description}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white font-bold text-2xl">
                        {pkg.product.priceString}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition"
                  >
                    {isWeb || FORCE_PREVIEW ? 'Disponible en la app móvil' : 'Seleccionar'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* RESTORE */}
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="w-full mt-4 py-3 text-gray-400 hover:text-white text-sm transition-colors"
          >
            {restoring ? 'Restaurando...' : 'Restaurar compras'}
          </button>

        </div>
      </div>
    </div>
  );
};