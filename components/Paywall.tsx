import React, { useState } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check, Sparkles } from 'lucide-react';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
}

export const Paywall: React.FC<PaywallProps> = ({ offerings, onPurchase, onRestore }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const sortedOfferings = offerings ? [...offerings].sort((a, b) => {
    const priceA = a.product.price;
    const priceB = b.product.price;
    return priceB - priceA;
  }) : [];

  const getPackageType = (pkg: any): 'lifetime' | 'annual' | 'monthly' | 'other' => {
    const identifier = pkg.identifier.toLowerCase();
    const productId = pkg.product.identifier.toLowerCase();

    if (identifier.includes('lifetime') || productId.includes('lifetime')) {
      return 'lifetime';
    }
    if (identifier.includes('annual') || productId.includes('annual') || identifier.includes('year')) {
      return 'annual';
    }
    if (identifier.includes('monthly') || productId.includes('monthly') || identifier.includes('month')) {
      return 'monthly';
    }
    return 'other';
  };

  const getBadge = (type: 'lifetime' | 'annual' | 'monthly' | 'other') => {
    if (type === 'lifetime') {
      return { text: 'Pago único', color: 'bg-purple-500' };
    }
    if (type === 'annual') {
      return { text: 'Mejor Valor', color: 'bg-green-500' };
    }
    return null;
  };

  const handlePurchase = async (pkg: any) => {
    setLoading(pkg.identifier);
    setError(null);

    const result = await onPurchase(pkg);

    if (!result.success && result.error) {
      setError(result.error);
    }

    setLoading(null);
  };

  const handleRestore = async () => {
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

if (!offerings) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="text-center text-white">
        <h1 className="text-2xl font-bold mb-4">
          Vista previa Paywall (Web)
        </h1>
        <p className="text-gray-400">
          En web no se cargan productos reales.
        </p>
      </div>
    </div>
  );
}
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-y-auto">
      <div className="min-h-full flex flex-col p-6 pb-8">
        <div className="flex-1 max-w-2xl mx-auto w-full">
          {/* Header */}
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

          {/* Benefits */}
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

          {/* Plans */}
          <div className="space-y-3 mb-6">
            {sortedOfferings.map((pkg) => {
              const packageType = getPackageType(pkg);
              const badge = getBadge(packageType);
              const isLoading = loading === pkg.identifier;
              const isAnnual = packageType === 'annual';

              return (
                <div
                  key={pkg.identifier}
                  className={`
                    relative p-5 rounded-2xl border-2 bg-white/5
                    ${isAnnual ? 'border-green-500/50 ring-2 ring-green-500/30' : 'border-white/10'}
                  `}
                >
                  {badge && (
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <span className={`${badge.color} text-white text-xs font-semibold px-3 py-1 rounded-full`}>
                        {badge.text}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-white font-semibold text-lg">
                        {pkg.product.title || pkg.product.identifier}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {pkg.product.description || 'Acceso completo a todas las funciones'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white font-bold text-2xl">
                        {pkg.product.priceString}
                      </p>
                      {packageType === 'annual' && (
                        <p className="text-green-400 text-xs mt-1">
                          Ahorra 40%
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading || loading !== null}
                    className={`
                      w-full py-3 rounded-xl font-semibold transition-all
                      ${isLoading
                        ? 'bg-blue-500 text-white'
                        : loading !== null
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-lg hover:shadow-blue-500/30'
                      }
                    `}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      'Seleccionar'
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Restore Button */}
          <button
            onClick={handleRestore}
            disabled={restoring || loading !== null}
            className="w-full mt-4 py-3 text-gray-400 hover:text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {restoring ? 'Restaurando...' : 'Restaurar compras'}
          </button>

          {/* Legal */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-500 text-xs text-center mb-3 leading-relaxed">
  Las suscripciones se renuevan automáticamente a menos que se cancelen al menos 24 horas antes del final del período actual.
  El pago se cargará a tu cuenta de Apple ID al confirmar la compra.
  Puedes gestionar o cancelar tu suscripción en Ajustes &gt; Apple ID &gt; Suscripciones.
</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <a
                href="https://labappstudio.com/motorcheck#terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white underline transition-colors"
              >
                Términos de uso
              </a>
              <span className="text-gray-600">•</span>
              <a
                href="https://labappstudio.com/motorcheck#privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white underline transition-colors"
              >
                Política de privacidad
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
