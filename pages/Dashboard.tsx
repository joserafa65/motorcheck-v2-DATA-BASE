import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVehicle } from '../contexts/VehicleContext';
import { Card, Button } from '../components/UI';
import { 
  AlertTriangle, CheckCircle, TrendingUp, ChevronRight, Calendar, 
  Gauge, CreditCard, History, Fuel, Wrench, X, Flag, Clock, 
  AlertOctagon, Settings, Share2 
} from 'lucide-react';
import { CURRENCY_FORMATTER, DATE_FORMATTER, roundToTwo } from '../constants';
import { ServiceStatus, UnitSystem } from '../types';
import { Share } from '@capacitor/share';
import { dbClient } from '../services/database';

const Dashboard: React.FC<{ onNavigate: (view: string, params?: any) => void }> = ({ onNavigate }) => {
  const { vehicle, serviceStatuses, fuelLogs, urgentCount, upcomingCount, updateVehicle } = useVehicle();

  const [showOdoModal, setShowOdoModal] = useState(false);
  const [odoInput, setOdoInput] = useState('');
  const [alertService, setAlertService] = useState<ServiceStatus | null>(null);
  
  // State para el mensaje de compartir
  const [shareMessage, setShareMessage] = useState('Estoy usando MotorCheck para controlar mi vehículo. 🚗');

  // Lógica de cálculos (Combustible, Eficiencia, etc.)
  const lastFuel = fuelLogs.length > 0 ? fuelLogs[0] : null;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const logsThisMonth = fuelLogs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const spendThisMonth = roundToTwo(logsThisMonth.reduce((acc, curr) => acc + curr.totalCost, 0));

  const lastDistance = useMemo(() => {
    if (fuelLogs.length < 2) return null;
    const current = fuelLogs[0];
    const previous = fuelLogs[1];
    return current.odometer - previous.odometer;
  }, [fuelLogs]);

  const worstStatus = serviceStatuses.length > 0 ? serviceStatuses[0] : null; 
  const isAllGood = !worstStatus || worstStatus.status === 'ok';
  
  const efficiency = useMemo(() => {
      if(fuelLogs.length < 2) return null;
      const sorted = [...fuelLogs].sort((a,b) => a.odometer - b.odometer);
      let totalDist = 0;
      let totalVol = 0;
      for(let i=1; i<sorted.length; i++) {
          if (sorted[i].isFullTank && sorted[i-1].isFullTank) {
              totalDist += sorted[i].odometer - sorted[i-1].odometer;
              totalVol += sorted[i].volume;
          }
      }
      if (vehicle.unitSystem === UnitSystem.LITER_100KM) {
         return totalDist > 0 ? ((totalVol / totalDist) * 100).toFixed(1) : null;
      }
      return totalVol > 0 ? (totalDist / totalVol).toFixed(1) : null;
  }, [fuelLogs, vehicle.unitSystem]);

  // Handlers y Funciones
  const getUnitLabel = () => {
    switch (vehicle.unitSystem) {
      case UnitSystem.KM_GAL: return 'km/gal';
      case UnitSystem.KM_LITER: return 'km/l';
      case UnitSystem.LITER_100KM: return 'l/100km';
      default: return '';
    }
  };

  const getVolumeLabel = () => vehicle.unitSystem === UnitSystem.KM_GAL ? 'gal' : 'L';

  const formatCompactCurrency = (amount: number) => {
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
      return `$${amount}`;
  };

  const handleSaveOdo = () => {
    const newVal = parseInt(odoInput);
    if (!isNaN(newVal)) {
        if (newVal < vehicle.currentOdometer) {
            if(!confirm("El nuevo kilometraje es MENOR al actual. ¿Estás seguro de corregirlo?")) return;
        }
        updateVehicle({ ...vehicle, currentOdometer: newVal });
        setShowOdoModal(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'MotorCheck',
        text: shareMessage,
        dialogTitle: 'Compartir MotorCheck',
      });
    } catch (e) {
      console.log('Error al compartir', e);
    }
  };

  const dismissAlert = (redirect: boolean) => {
    if (!alertService) return;
    const key = `motorcheck_alert_shown_${alertService.serviceId}_${alertService.status}`;
    sessionStorage.setItem(key, vehicle.currentOdometer.toString());
    setAlertService(null);
    if (redirect) onNavigate('services', { serviceId: alertService.serviceId });
  };

  // EFECTOS (Separados para evitar errores)
  
  // 1. Efecto para cargar mensaje de compartir desde Supabase
  useEffect(() => {
    const fetchShareMessage = async () => {
      try {
        const { data } = await dbClient
          .from('app_config')
          .select('value')
          .eq('key', 'share_message')
          .single();

        if (data?.value) setShareMessage(data.value);
      } catch (e) {
        console.log('No se pudo cargar share_message de Supabase, usando default.');
      }
    };
    fetchShareMessage();
  }, []);

  // 2. Efecto para manejar alertas de servicios
  useEffect(() => {
    if (serviceStatuses.length === 0) return;
    const critical = serviceStatuses
      .filter(s => s.status !== 'ok')
      .sort((a, b) => {
          if (a.status === 'danger' && b.status !== 'danger') return -1;
          if (b.status === 'danger' && a.status !== 'danger') return 1;
          return a.kmLeft - b.kmLeft; 
      })
      .find(s => {
          const key = `motorcheck_alert_shown_${s.serviceId}_${s.status}`;
          const lastShownOdo = sessionStorage.getItem(key);
          if (!lastShownOdo) return true;
          if (s.status === 'danger') {
              const lastOdoVal = parseInt(lastShownOdo);
              if (!isNaN(lastOdoVal) && lastOdoVal !== vehicle.currentOdometer) return true;
          }
          return false;
      });

    if (critical) {
        const timer = setTimeout(() => setAlertService(critical), 800);
        return () => clearTimeout(timer);
    }
  }, [serviceStatuses, vehicle.currentOdometer]);


  return (
    <div className="pb-24 space-y-4">
      {/* HEADER / PORTADA */}
      <div className="relative w-full h-52 bg-gray-900 rounded-b-[2.5rem] shadow-2xl overflow-hidden mb-3 group animate-enter">
            {vehicle.photoUrl ? (
               <div className="w-full h-full relative overflow-hidden rounded-b-[2.5rem]">
                   <img src={vehicle.photoUrl} alt="Vehicle Cover" className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
               </div>
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-blue-900 via-zinc-900 to-black relative">
                  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
               </div>
            )}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
                <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wide">MotorCheck</span>
                </div>
                {!vehicle.photoUrl && (
                    <Settings
                        size={65}
                        className="opacity-30 hover:opacity-100 transition-opacity cursor-pointer text-white drop-shadow-lg"
                        onClick={() => onNavigate('settings')}
                    />
                )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-white leading-none mb-1.5 shadow-black drop-shadow-md tracking-tight truncate max-w-[180px]">
                            {vehicle.brand || 'Tu'} {vehicle.model || 'Vehículo'}
                        </h1>
                        <div className="text-white/80 font-medium text-xs flex items-center gap-2">
                            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-xs font-bold">{vehicle.year || '----'}</span>
                            <span className="opacity-50">|</span>
                            <span className="uppercase tracking-wide text-xs font-bold">{vehicle.plate || '--- ---'}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-white/60 uppercase tracking-wide mb-0.5 font-bold">Kilometraje</div>
                        <div className="text-2xl font-mono text-blue-400 font-bold drop-shadow-md leading-none">
                            {vehicle.currentOdometer.toLocaleString()} <span className="text-xs text-white/50 font-sans">km</span>
                        </div>
                    </div>
                </div>
            </div>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="px-4 space-y-4">
          <div className="animate-enter delay-100 flex flex-col space-y-2">
                  <Card className="py-2.5 px-4 bg-white/60 dark:bg-zinc-900/50 flex flex-row items-center justify-between border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                             <TrendingUp size={16} />
                          </div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Eficiencia</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900 dark:text-white leading-none inline-block mr-1">
                            {efficiency ? efficiency : '--'}
                        </div>
                        <div className="text-xs text-gray-500 inline-block font-medium">{getUnitLabel()}</div>
                      </div>
                  </Card>
                  <Card className="py-2.5 px-4 bg-white/60 dark:bg-zinc-900/50 flex flex-row items-center justify-between border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                             <CreditCard size={16} />
                          </div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gasolina x mes</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900 dark:text-white leading-none inline-block mr-1">
                            {spendThisMonth > 0 ? formatCompactCurrency(spendThisMonth) : '$0'}
                        </div>
                        <div className="text-xs text-gray-500 inline-block font-medium">{logsThisMonth.length} recargas</div>
                      </div>
                  </Card>
                  <Card className="py-2.5 px-4 bg-white/60 dark:bg-zinc-900/50 flex flex-row items-center justify-between border-gray-200 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                             <History size={16} />
                          </div>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Última Tanqueada</span>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold text-gray-900 dark:text-white leading-none inline-block mr-1">
                             {lastFuel ? `${lastFuel.volume}` : '--'} <span className="text-xs font-normal text-gray-500">{getVolumeLabel()}</span>
                        </div>
                        <div className="text-xs text-gray-500 inline-block font-medium ml-1">
                            {lastDistance ? `+${lastDistance}km` : (lastFuel ? DATE_FORMATTER.format(new Date(lastFuel.date)) : 'N/A')}
                        </div>
                      </div>
                  </Card>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="grid grid-cols-3 gap-2.5 animate-enter delay-300">
            <Button onClick={() => onNavigate('fuel')} className="bg-blue-600 hover:bg-blue-500 h-28 flex-col !gap-1.5 px-2 shadow-blue-900/20">
                <Fuel size={26} strokeWidth={2} className="mb-0.5 relative z-10" />
                <span className="text-[10px] font-medium opacity-90 uppercase tracking-tight leading-tight relative z-10">Ingresa una</span>
                <span className="text-sm font-bold leading-none relative z-10">Tanqueada</span>
            </Button>
            <Button onClick={() => onNavigate('services', { startInProgramMode: true })} className="h-28 flex-col !gap-1.5 px-2 !bg-orange-600 !hover:bg-orange-500 shadow-orange-900/20 !border-0 text-white">
                <Wrench size={26} strokeWidth={2} className="mb-0.5 relative z-10" />
                <span className="text-[10px] font-medium opacity-90 uppercase tracking-tight leading-tight relative z-10">Programa un</span>
                <span className="text-sm font-bold leading-none relative z-10">Servicio</span>
            </Button>
            <Button onClick={() => { setOdoInput(''); setShowOdoModal(true); }} className="h-28 flex-col !gap-1.5 px-2 !bg-purple-600 !hover:bg-purple-500 shadow-purple-900/20 !border-0 text-white">
                <Gauge size={26} strokeWidth={2} className="mb-0.5 relative z-10" />
                <span className="text-[10px] font-medium opacity-90 uppercase tracking-tight leading-tight relative z-10">Actualiza tu</span>
                <span className="text-sm font-bold leading-none relative z-10">Odómetro</span>
            </Button>
          </div>

          {/* ESTADO DE SERVICIOS */}
          <div onClick={() => worstStatus && onNavigate('services', { serviceId: worstStatus.serviceId })} className={`animate-enter delay-200 relative overflow-hidden rounded-2xl p-4 shadow-xl transition-all duration-500 cursor-pointer active:scale-[0.98] ${isAllGood ? 'bg-gradient-to-br from-green-600/10 to-gray-900/5 dark:from-green-900/40 dark:to-black border border-green-500/20' : 'bg-gradient-to-br from-red-600/10 to-gray-900/5 dark:from-red-900/40 dark:to-black border border-red-500/20'}`}>
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-20 dark:opacity-40 ${isAllGood ? 'bg-green-500' : 'bg-red-600'}`}></div>
            <div className="relative z-10">
                <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2.5 rounded-2xl ${isAllGood ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-red-600 text-white shadow-red-500/20 animate-bounce-slow'} shadow-lg`}>
                        {isAllGood ? <CheckCircle size={26} strokeWidth={2.5} /> : <AlertTriangle size={26} strokeWidth={2.5} />}
                    </div>
                    <div>
                        <h2 className={`text-lg font-black leading-tight mb-1 ${!isAllGood && worstStatus?.status === 'danger' ? 'text-red-600 dark:text-red-500' : 'dark:text-white text-gray-900'}`}>
                            {isAllGood ? 'Todo en orden' : (worstStatus?.status === 'danger' ? 'URGENTE SERVICIO VENCIDO' : 'Atención requerida')}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-bold uppercase tracking-wide">
                            {isAllGood ? (worstStatus ? `Próximo: ${worstStatus.name}` : 'Sin servicios') : `${worstStatus?.name}`}
                        </p>
                    </div>
                </div>

                {worstStatus && (
                    <div className="bg-white/50 dark:bg-black/20 rounded-2xl p-3.5 backdrop-blur-md border border-white/20 dark:border-white/5 space-y-3">
                        <div className="flex justify-between items-center pb-2.5 border-b border-gray-200 dark:border-white/10">
                            <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wide ${worstStatus.kmLeft < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500'}`}>
                                <Gauge size={13} strokeWidth={2.5} />
                                <span>{worstStatus.kmLeft < 0 ? 'VENCIDO POR' : 'Vence en'}</span>
                            </div>
                            <div className={`text-xl font-mono font-black ${worstStatus.kmLeft < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                {Math.abs(worstStatus.kmLeft).toLocaleString()} <span className="text-xs font-sans font-bold text-gray-500 uppercase">km</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pb-2.5 border-b border-gray-200 dark:border-white/10">
                            <div className="flex items-center gap-1.5 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                                <Flag size={13} strokeWidth={2.5} />
                                <span>Al cumplir</span>
                            </div>
                            <div className="text-lg font-mono font-black text-gray-700 dark:text-gray-300">
                                {worstStatus.nextDueOdometer?.toLocaleString()} <span className="text-xs font-sans font-bold text-gray-500">km</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center">
                            <div className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wide ${worstStatus.daysLeft < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500'}`}>
                                <Calendar size={13} strokeWidth={2.5} />
                                <span>{worstStatus.daysLeft < 0 ? 'Vencido hace' : 'Tiempo'}</span>
                            </div>
                            <div className={`text-xl font-mono font-black ${worstStatus.daysLeft < 0 ? 'text-red-600 dark:text-red-500' : (worstStatus.daysLeft === 99999 ? 'text-gray-400' : 'text-gray-900 dark:text-white')}`}>
                                {worstStatus.daysLeft === 99999 ? 'N/A' : `${Math.abs(worstStatus.daysLeft).toLocaleString()} días`}
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* NUEVO BOTÓN PARA RECOMENDAR / COMPARTIR */}
          <div className="animate-enter delay-400">
            <Card className="py-3 px-4 bg-white/60 dark:bg-zinc-900/50 flex items-center justify-between border-gray-200 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                  <Share2 size={16} />
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Recomendar MotorCheck
                </span>
              </div>

              <button
                onClick={handleShareApp}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:opacity-80 transition px-2 py-1"
              >
                Compartir
              </button>
            </Card>
          </div>
      </div>

      {/* MODALES (USANDO PORTALES) */}

      {alertService && createPortal(
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-500">
              <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-white/10 text-center overflow-hidden">
                   <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${alertService.status === 'danger' ? 'from-red-500 via-red-600 to-red-500' : 'from-yellow-400 via-yellow-500 to-yellow-400'}`} />
                   <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-xl ${alertService.status === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                       {alertService.status === 'danger' ? <AlertOctagon size={44} strokeWidth={2.5} /> : <Clock size={44} strokeWidth={2.5} />}
                   </div>
                   <h2 className="text-2xl font-black mb-2 text-gray-900 dark:text-white leading-tight">
                       {alertService.status === 'danger' ? '¡SERVICIO VENCIDO!' : 'Servicio Próximo'}
                   </h2>
                   <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400 mb-6">{alertService.name}</h3>
                   <div className={`mb-8 p-5 rounded-2xl border-2 ${alertService.status === 'danger' ? 'bg-red-500/5 border-red-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                       <div className="text-xs uppercase tracking-wide font-black opacity-60 mb-2">
                           {alertService.kmLeft < 0 ? 'VENCIDO POR' : 'Vence en'}
                       </div>
                       <div className={`text-3xl font-mono font-black ${alertService.status === 'danger' ? 'text-red-600 dark:text-red-500' : 'text-yellow-600 dark:text-yellow-500'}`}>
                           {Math.abs(alertService.kmLeft).toLocaleString()} <span className="text-sm font-sans font-black text-gray-400">km</span>
                       </div>
                   </div>
                   <div className="space-y-3">
                       <Button onClick={() => dismissAlert(true)} className={`text-lg font-bold ${alertService.status === 'danger' ? '!bg-red-600 hover:!bg-red-500' : '!bg-yellow-500 hover:!bg-yellow-400 !text-black'}`}>
                           Gestionar Servicio
                       </Button>
                       <button onClick={() => dismissAlert(false)} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-white transition-colors py-2 uppercase tracking-wide">
                          Recordar más tarde
                       </button>
                   </div>
              </div>
          </div>,
          document.body
      )}

      {showOdoModal && createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-white/10 relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setShowOdoModal(false)} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 transition-colors">
                   <X size={18} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 shadow-inner">
                        <Gauge size={28} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Odómetro</h3>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">Kilometraje actual</p>
                </div>
                <div className="relative mb-6">
                    <input type="number" inputMode="numeric" value={odoInput} onChange={(e) => setOdoInput(e.target.value)} className="w-full bg-gray-50 dark:bg-black/40 border-2 border-gray-200 dark:border-white/10 focus:border-blue-500 rounded-2xl py-4 px-4 text-center text-3xl font-mono font-black text-gray-900 dark:text-white outline-none transition-colors" placeholder={vehicle.currentOdometer.toString()} autoFocus />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base text-gray-400 font-black">km</span>
                </div>
                <Button onClick={handleSaveOdo} className="text-lg font-bold shadow-blue-900/30">Guardar</Button>
            </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default Dashboard;