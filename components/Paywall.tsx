import React, { useMemo, useState, useEffect } from 'react';
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
    price?: number;
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
          identifier: 'annual_mock',
          product: {
            identifier: 'annual_mock',
            title: 'Anual',
            description: 'Acceso completo',
            priceString: '$9.99 / año',
            price: 9.99,
          },
        },
        {
          identifier: 'lifetime_mock',
          product: {
            identifier: 'lifetime_mock',
            title: 'De por vida',
            description: 'Pago único. Olvídate para siempre.',
            priceString: '$34.99',
            price: 34.99,
          },
        },
        {
          identifier: 'monthly_mock',
          product: {
            identifier: 'monthly_mock',
            title: 'Mensual',
            description: 'Ideal si prefieres flexibilidad.',
            priceString: '$1.99 / mes',
            price: 1.99,
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
        price: pkg.product?.price,
      },
    }));
  }, [isWeb, offerings]);

  useEffect(() => {
    if (!selectedId && displayOfferings.length > 0) {
      const annual = displayOfferings.find(p =>
        p.product.title.toLowerCase().includes('anual')
      );
      setSelectedId(annual?.identifier || displayOfferings[0].identifier);
    }
  }, [displayOfferings, selectedId]);

  const monthly = displayOfferings.find(p =>
    p.product.title.toLowerCase().includes('mensual')
  );
  const annual = displayOfferings.find(p =>
    p.product.title.toLowerCase().includes('anual')
  );

  const annualSavingsPercent =
    monthly?.product.price && annual?.product.price
      ? Math.round(
          (1 - annual.product.price / (monthly.product.price * 12)) * 100
        )
      : null;

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

    const realPkg: any = (offerings || []).find(
      (p: any) => p.identifier === selectedId
    );

    if (!realPkg) {
      setError('No pude encontrar el plan real.');
      return;
    }

    try {
      setLoadingId(selectedId);
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
      <div className="max-w-sm mx-auto w-full">

        {/* Logo */}
        <div className="flex justify-center mb-3 mt-2">
          <img
            src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
            alt="MotorCheck"
            className="w-20 h-20"
          />
        </div>

        <h1 className="text-center text-4xl font-semibold text-white tracking-tight">
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
          {displayOfferings.map((pkg) => {
            const isSelected = pkg.identifier === selectedId;
            const isAnnual = pkg.product.title.toLowerCase().includes('anual');

            return (
              <button
                key={pkg.identifier}
                onClick={() => setSelectedId(pkg.identifier)}
                className={`w-full text-left rounded-xl border p-4 transition-all duration-200
                  transform hover:scale-[1.01]
                  ${isSelected
                    ? 'border-blue-500 bg-white/10 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]'
                    : 'border-white/10 bg-white/5 hover:bg-white/8'}
                `}
              >
                <div className="flex items-center justify-between">

                  <div className="flex items-start gap-3">

                    {/* Radio */}
                    <div
                      className={`mt-2 w-5 h-5 rounded-full border transition-all duration-200
                        ${isSelected
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white/30'}
                      `}
                    >
                      {isSelected && (
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full m-auto mt-[5px]" />
                      )}
                    </div>

                    <div>
                      {isAnnual && (
                        <div className="text-sm text-blue-400 font-medium mb-1">
                          Mejor valor
                        </div>
                      )}

                      <div className={`text-2xl font-semibold transition-colors
                        ${isSelected ? 'text-white' : 'text-gray-200'}
                      `}>
                        {pkg.product.title}
                      </div>

                      <div className="text-sm text-gray-400">
                        {pkg.product.description}
                      </div>

                      {isAnnual && annualSavingsPercent && (
                        <div className="text-sm text-green-400 mt-1">
                          Ahorra hasta {annualSavingsPercent}% al año
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`text-2xl font-semibold transition-colors
                    ${isSelected ? 'text-white' : 'text-gray-300'}
                  `}>
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
          className="w-full py-3 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-200 text-white"
        >
          {loadingId ? 'Procesando…' : 'COMPRAR'}
        </button>

        {error && (
          <div className="mt-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4"
          >
            {restoring ? 'Restaurando…' : 'Restaurar compras'}
          </button>
        </div>

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