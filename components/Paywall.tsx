import React, { useMemo, useState } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
  onClose?: () => void;
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
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(''); // se setea al cargar displayOfferings
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWeb = Capacitor.getPlatform() === 'web';

  // Mock para web mientras Apple/RC no entregan offerings reales en web
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

  // Inicializa selección cuando llegan paquetes
  React.useEffect(() => {
    if (!selectedId && displayOfferings.length > 0) {
      setSelectedId(displayOfferings[0].identifier); // por defecto: “mejor valor” arriba
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

    // En mobile necesitamos el paquete real de RevenueCat, no el display map.
    // Buscamos el objeto original por identifier.
    const realPkg: any = (offerings || []).find((p: any) => p.identifier === selectedPkg.identifier);

    if (!realPkg) {
      setError('No pude encontrar el plan real. Intenta de nuevo.');
      return;
    }

    try {
      setLoadingId(selectedPkg.identifier);
      const result = await onPurchase(realPkg);
      if (!result.success) setError(result.error || 'No se pudo completar la compra.');
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
      if (!result.success) setError(result.error || 'No se pudo restaurar.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center px-5">
      <div className="max-w-sm mx-auto w-full relative">

        {/* Close */}
        <button
          onClick={() => onClose?.()}
          className="absolute -top-1 right-0 p-2 text-gray-400 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

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

        {/* Plans (radio style) */}
        <div className="space-y-3 mb-4">
          {displayOfferings.map((pkg, index) => {
            const isSelected = pkg.identifier === selectedId;
            const isBest = index === 0; // lifetime primero en mock; si no, igual sirve para destacar “top”

            return (
              <button
                key={pkg.identifier}
                onClick={() => setSelectedId(pkg.identifier)}
                className={`w-full text-left rounded-xl border p-4 transition
                  ${isSelected ? 'border-blue-500 bg-white/7' : 'border-white/10 bg-white/5 hover:bg-white/7'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* radio */}
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center
                        ${isSelected ? 'border-blue-500' : 'border-white/20'}
                      `}
                    >
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    </div>

                    <div>
                      {isBest && (
                        <div className="text-sm text-blue-400 font-medium -mb-0.5">
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
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-semibold text-white">
                      {pkg.product.priceString}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleContinue}
          disabled={loadingId !== null || restoring}
          className={`w-full py-3 rounded-xl text-base font-semibold transition
            ${loadingId
              ? 'bg-blue-600 text-white opacity-90'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          `}
        >
          {loadingId ? 'Procesando…' : isWeb ? 'Disponible en app móvil' : 'Continuar'}
        </button>

        {/* Error */}
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
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4 disabled:opacity-50"
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