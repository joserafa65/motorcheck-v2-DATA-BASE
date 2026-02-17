import React, { useMemo, useState } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
}

type DisplayPackage = {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
  };
};

export const Paywall: React.FC<PaywallProps> = ({
  offerings,
  onPurchase,
  onRestore,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWeb = Capacitor.getPlatform() === 'web';

  const displayOfferings: DisplayPackage[] = useMemo(() => {
    if (isWeb && (!offerings || offerings.length === 0)) {
      return [
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
      ];
    }

    return (offerings || []).map((pkg: any) => ({
      identifier: pkg.identifier,
      product: {
        identifier: pkg.product?.identifier,
        title: pkg.product?.title || pkg.product?.identifier,
        description: pkg.product?.description || 'Acceso completo',
        priceString: pkg.product?.priceString || '',
      },
    }));
  }, [isWeb, offerings]);

  React.useEffect(() => {
    if (!selectedId && displayOfferings.length > 0) {
      setSelectedId(displayOfferings[0].identifier);
    }
  }, [displayOfferings, selectedId]);

  const selectedPkg = useMemo(
    () => displayOfferings.find((p) => p.identifier === selectedId) || null,
    [displayOfferings, selectedId]
  );

  const benefits = [
    'Recordatorio de mantenimientos',
    'Backup automático en la nube',
    'Historial ilimitado',
    'Estadísticas de consumo',
    'Exportación de reportes PDF',
  ];

  const handleContinue = async () => {
    setError(null);

    if (isWeb) {
      setError('Disponible solo en la app móvil.');
      return;
    }

    if (!selectedPkg) {
      setError('Selecciona un plan para continuar.');
      return;
    }

    const realPkg: any = (offerings || []).find(
      (p: any) => p.identifier === selectedPkg.identifier
    );

    if (!realPkg) {
      setError('No pude encontrar el plan real.');
      return;
    }

    try {
      setLoadingId(selectedPkg.identifier);
      const result = await onPurchase(realPkg);
      if (!result.success) {
        setError(result.error || 'No se pudo completar la compra.');
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleRestore = async () => {
    setError(null);

    if (isWeb) {
      setError('Disponible solo en la app móvil.');
      return;
    }

    try {
      setRestoring(true);
      const result = await onRestore();
      if (!result.success) {
        setError(result.error || 'No se pudo restaurar.');
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center px-5">
      <div className="max-w-sm mx-auto w-full">

        {/* Logo */}
        <div className="flex justify-center mb-3 mt-2">
          <img
            src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
            alt="MotorCheck"
            className="w-16 h-16"
          />
        </div>

        {/* Title */}
        <h1 className="text-center text-3xl font-semibold text-white tracking-tight">
          MOTORCHECK Premium
        </h1>
        <p className="text-center text-gray-400 text-sm mt-2 mb-4">
          Menos fallas. Más productividad. Más ingresos.
        </p>

        {/* Benefits */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <div className="space-y-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-base text-gray-200">
                <Check size={16} className="text-green-400" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-3 mb-4">
          {displayOfferings.map((pkg, index) => {
            const isSelected = pkg.identifier === selectedId;
            const isBest = index === 0;

            return (
              <button
                key={pkg.identifier}
                onClick={() => setSelectedId(pkg.identifier)}
                className={`w-full text-left rounded-xl border p-4 transition
                  ${isSelected
                    ? 'border-blue-500 bg-white/7'
                    : 'border-white/10 bg-white/5 hover:bg-white/7'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <div>
                    {isBest && (
                      <div className="text-sm text-blue-400 font-medium">
                        Mejor valor
                      </div>
                    )}
                    <div className="text-xl font-semibold text-white">
                      {pkg.product.title}
                    </div>
                    <div className="text-sm text-gray-400">
                      {pkg.product.description}
                    </div>
                  </div>
                  <div className="text-xl font-semibold text-white">
                    {pkg.product.priceString}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={loadingId !== null || restoring}
          className="w-full py-3 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition"
        >
          {loadingId ? 'Procesando…' : isWeb ? 'Disponible en app móvil' : 'Comprar'}
        </button>

        {error && (
          <div className="mt-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Restore */}
        <div className="mt-4 text-center">
          <button
            onClick={handleRestore}
            disabled={restoring || loadingId !== null}
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4"
          >
            {restoring ? 'Restaurando…' : 'Restaurar compras'}
          </button>
        </div>

        {/* Legal */}
        <div className="mt-4 text-[11px] text-gray-500 text-center leading-snug">
          Las suscripciones se renuevan automáticamente.
          <br />
          Puedes cancelarlas en cualquier momento desde los ajustes de tu Apple ID.
        </div>

        <div className="flex justify-center gap-4 text-sm mt-2">
          <a
            href="https://labappstudio.com/motorcheck#terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white underline underline-offset-4"
          >
            Términos
          </a>
          <a
            href="https://labappstudio.com/motorcheck#privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white underline underline-offset-4"
          >
            Privacidad
          </a>
        </div>
      </div>
    </div>
  );
};