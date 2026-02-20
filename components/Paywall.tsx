import React, { useMemo, useState, useEffect } from 'react';
import { PurchasesOffering } from '@revenuecat/purchases-capacitor';
import { Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';

interface PaywallProps {
  offerings: PurchasesOffering[] | null;
  onPurchase: (packageToPurchase: any) => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
  allowClose?: boolean;
  onClose?: () => void;
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
  allowClose = false,
  onClose,
}) => {
  const { signOut } = useAuth();

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
            price: 34.99,
          },
        },
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
          identifier: 'monthly_mock',
          product: {
            identifier: 'monthly_mock',
            title: 'Mensual',
            description: 'Acceso completo',
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
    // No default selection
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
    'Maximiza tu rentabilidad',
    'Recordatorio de mantenimientos',
    'Backup automático en la nube',
    'Historial ilimitado',
    'Exportación de reportes PDF',
    'Estadísticas de egresos y consumos',
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

  const handleSwitchAccount = async () => {
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto px-5 pt-6 pb-28">
      <div className="max-w-sm mx-auto w-full relative min-h-full flex flex-col justify-center">

        {allowClose && (
          <button
            onClick={onClose}
            className="absolute top-8 right-0 p-2 text-gray-400 hover:text-white transition"
          >
            <X size={22} />
          </button>
        )}

        <div className="flex justify-center mb-3 mt-2">
          <img
            src="/MOTOR_CHECK_LOGO_ICON_07_ALPHA.png"
            alt="MotorCheck"
            style={{ width: '6.5rem', height: '6.5rem' }}
          />
        </div>

        <h1 className="text-center text-2xl font-semibold text-white">
          MOTORCHECK
        </h1>

        <p className="text-center text-gray-400 text-sm mt-1 mb-3">
          Cuida tu vehículo como se merece.<br />
          Empieza tu prueba de 15 días gratis.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
          <div className="space-y-1.5">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-200">
                <Check size={14} className="text-green-400 shrink-0" />
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {[
            ...displayOfferings.filter(p => p.product.title.toLowerCase().includes('vida')),
            ...displayOfferings.filter(p => p.product.title.toLowerCase().includes('anual')),
            ...displayOfferings.filter(p => p.product.title.toLowerCase().includes('mensual')),
            ...displayOfferings.filter(p =>
              !p.product.title.toLowerCase().includes('vida') &&
              !p.product.title.toLowerCase().includes('anual') &&
              !p.product.title.toLowerCase().includes('mensual')
            ),
          ].map((pkg) => {
            const isSelected = pkg.identifier === selectedId;
            const isAnnual = pkg.product.title.toLowerCase().includes('anual');
            const isLifetime = pkg.product.title.toLowerCase().includes('vida');
            const isMonthly = pkg.product.title.toLowerCase().includes('mensual');

            return (
              <div key={pkg.identifier}>
                {isLifetime && (
                  <div className="mb-1">
                    <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-md px-2 py-0.5">
                      Oferta Fundador
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedId(pkg.identifier)}
                  className={`w-full text-left rounded-xl border p-3 transition-all duration-200
                    ${isSelected
                      ? isLifetime
                        ? 'border-amber-400 bg-white/10'
                        : 'border-blue-500 bg-white/10'
                      : isLifetime
                        ? 'border-amber-400/40 bg-white/5 hover:bg-white/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0
                          ${isSelected
                            ? isLifetime ? 'border-amber-400' : 'border-blue-500'
                            : 'border-white/30'}
                        `}
                      >
                        {isSelected && (
                          <div className={`w-2 h-2 rounded-full ${isLifetime ? 'bg-amber-400' : 'bg-blue-500'}`} />
                        )}
                      </div>

                      <div>
                      <div className="text-base font-bold text-white">
  {isLifetime
    ? 'De por vida'
    : isAnnual
    ? 'Anual'
    : isMonthly
    ? 'Mensual'
    : ''}
</div>

               {isLifetime && (
  <div className="text-xs text-gray-400">
    Paga una vez. Úsalo para siempre.
  </div>
)}

{isAnnual && (
  <>
    <div className="text-xs text-green-400">
      Ahorra hasta 58% al año
    </div>
    <div className="text-xs text-gray-400">
      Menos de $0.83 al mes.
    </div>
  </>
)}

{isMonthly && (
  <div className="text-xs text-gray-400">
    Ideal si prefieres flexibilidad.
  </div>
)}
                      </div>
                    </div>

                    <div className="text-base font-bold text-white shrink-0">
                      {pkg.product.priceString}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={loadingId !== null || restoring}
          className="w-full py-3 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all"
        >
          {loadingId ? 'Procesando…' : 'Desbloquear MOTORCHECK'}
        </button>

        {error && (
          <div className="mt-2 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="mt-5 text-center">
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4 py-2 px-3"
          >
            {restoring ? 'Restaurando…' : 'Restaurar compras'}
          </button>
        </div>

        <div className="mt-2 text-[11px] text-gray-500 text-center leading-snug">
          Las suscripciones se renuevan automáticamente.
          <br />
          Puedes cancelarlas en cualquier momento desde los ajustes de tu Apple ID.
        </div>

        <div className="flex justify-center gap-6 mt-3">
          <a
            href="https://labappstudio.com/motorcheck#terminos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4 py-2 px-1"
          >
            Términos
          </a>
          <a
            href="https://labappstudio.com/motorcheck#privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-300 hover:text-white underline underline-offset-4 py-2 px-1"
          >
            Privacidad
          </a>
        </div>

        <div className="mt-1 text-center">
          <button
            onClick={handleSwitchAccount}
            className="text-sm text-gray-500 hover:text-gray-300 underline underline-offset-4 transition py-2 px-3"
          >
            Usar otra cuenta
          </button>
        </div>

      </div>
    </div>
  );
};