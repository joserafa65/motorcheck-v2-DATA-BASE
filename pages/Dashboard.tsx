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
  const [shareMessage, setShareMessage] = useState('Estoy usando MotorCheck para controlar mi vehículo. 🚗');

  const lastFuel = fuelLogs.length > 0 ? fuelLogs[0] : null;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const logsThisMonth = fuelLogs.filter(l => {
    const d = new Date(l.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const spendThisMonth = roundToTwo(logsThisMonth.reduce((acc, curr) => acc + curr.totalCost, 0));

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

  const getUnitLabel = () => {
    switch (vehicle.unitSystem) {
      case UnitSystem.KM_GAL: return 'km/gal';
      case UnitSystem.KM_LITER: return 'km/l';
      case UnitSystem.LITER_100KM: return 'l/100km';
      default: return '';
    }
  };

  const formatCompactCurrency = (amount: number) => {
      if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
      if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
      return `$${amount}`;
  };

  const handleSaveOdo = () => {
    const newVal = parseInt(odoInput);
    if (!isNaN(newVal)) {
        updateVehicle({ ...vehicle, currentOdometer: newVal });
        setShowOdoModal(false);
    }
  };

  // --- LÓGICA DE COMPARTIR (SUPABASE) ---
  const handleShareApp = async () => {
    try {
      await dbClient.from('share_events').insert([{}]); 
      await Share.share({
        title: 'MotorCheck',
        text: shareMessage,
        dialogTitle: 'Compartir MotorCheck',
      });
    } catch (e) {
      console.log('Error al trackear o compartir:', e);
    }
  };

  useEffect(() => {
    const fetchShareMessage = async () => {
      try {
        const { data } = await dbClient.from('app_config').select('value').eq('key', 'share_message').single();
        if (data?.value) setShareMessage(data.value);
      } catch (e) { console.log('Usando mensaje por defecto'); }
    };
    fetchShareMessage();
  }, []);
  // ---------------------------------------

  return (
    <div className="pb-24 space-y-4">
      {/* VEHICLE HEADER (FIEL AL ORIGINAL) */}
      <div className="relative w-full h-52 bg-gray-900 rounded-b-[2.5rem] shadow-2xl overflow-hidden mb-3 group animate-enter">
            {vehicle.photoUrl ? (
               <div className="w-full h-full relative overflow-hidden rounded-b-[2.5rem]">
                   <img src={vehicle.photoUrl} alt="Vehicle" className="w-full h-full object-cover transform transition-transform duration-1000 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
               </div>
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-blue-900 via-zinc-900 to-black relative">
                  <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
               </div>
            )}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
                <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <span className="text-xs font-bold text-white/90 uppercase tracking-wide">MotorCheck</span>
                </div>
                {/* BOTÓN SETTINGS ORIGINAL */}
                <button 
                  onClick={() => onNavigate('settings')}
                  className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                >
                  <Settings size={20} />
                </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-white leading-none mb-1.5 shadow-black drop-shadow-md truncate max-w-[180px]">
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

      <div className="px-4 space-y-4">
          {/* STATS CARDS */}
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
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-3 gap-2.5 animate-enter delay-300">
            <Button onClick={() => onNavigate('fuel')} className="bg-blue-600 hover:bg-blue-500 h-28 flex-col !gap-1.5 shadow-blue-900/20">
                <Fuel size={26} strokeWidth={2} />
                <span className="text-sm font-bold">Tanqueada</span>
            </Button>
            <Button onClick={() => onNavigate('services', { startInProgramMode: true })} className="h-28 flex-col !gap-1.5 !bg-orange-600 !hover:bg-orange-500 shadow-orange-900/20 !border-0 text-white">
                <Wrench size={26} strokeWidth={2} />
                <span className="text-sm font-bold">Servicio</span>
            </Button>
            <Button onClick={() => { setOdoInput(''); setShowOdoModal(true); }} className="h-28 flex-col !gap-1.5 !bg-purple-600 !hover:bg-purple-500 shadow-purple-900/20 !border-0 text-white">
                <Gauge size={26} strokeWidth={2} />
                <span className="text-sm font-bold">Odómetro</span>
            </Button>
          </div>

          {/* SERVICE STATUS CARD (CON EL RESUMEN DEL KM ORIGINAL) */}
          <div onClick={() => worstStatus && onNavigate('services', { serviceId: worstStatus.serviceId })} className={`animate-enter delay-200 relative overflow-hidden rounded-2xl p-4 shadow-xl transition-all duration-500 cursor-pointer active:scale-[0.98] ${isAllGood ? 'bg-gradient-to-br from-green-600/10 to-gray-900/5 dark:from-green-900/40 dark:to-black border border-green-500/20' : 'bg-gradient-to-br from-red-600/10 to-gray-900/5 dark:from-red-900/40 dark:to-black border border-red-500/20'}`}>
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-2xl ${isAllGood ? 'bg-green-500' : 'bg-red-600'} text-white shadow-lg`}>
                        {isAllGood ? <CheckCircle size={26} /> : <AlertTriangle size={26} />}
                    </div>
                    <div>
                        <h2 className={`text-lg font-black leading-tight ${isAllGood ? 'dark:text-white text-gray-900' : 'text-red-600'}`}>
                            {isAllGood ? 'Todo en orden' : 'Acción requerida'}
                        </h2>
                        <p className="text-xs font-bold uppercase tracking-wide opacity-60 dark:text-white/70 text-gray-500">
                            {worstStatus?.name || '---'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1 dark:text-white text-gray-900">Faltan</div>
                    <div className={`text-xl font-mono font-black leading-none ${isAllGood ? 'text-green-500' : 'text-red-600'}`}>
                        {worstStatus ? Math.max(0, worstStatus.kmLeft).toLocaleString() : '---'} <span className="text-[10px] font-sans opacity-70">km</span>
                    </div>
                </div>
            </div>
          </div>

          {/* SHARE CARD (RESTAURADA CLASE POR CLASE) */}
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

      {/* PORTALS (NO ALTERAN LA UI PRINCIPAL) */}
      {showOdoModal && createPortal(
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-5">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-white/10 relative">
                <button onClick={() => setShowOdoModal(false)} className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500">
                   <X size={18} />
                </button>
                <div className="text-center mb-6">
                    <Gauge size={28} className="mx-auto mb-4 text-blue-600" />
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Odómetro</h3>
                </div>
                <input type="number" value={odoInput} onChange={(e) => setOdoInput(e.target.value)} className="w-full bg-gray-50 dark:bg-black/40 border-2 rounded-2xl py-4 text-center text-3xl font-mono font-black text-gray-900 dark:text-white outline-none mb-6" placeholder={vehicle.currentOdometer.toString()} />
                <Button onClick={handleSaveOdo} className="text-lg font-bold">Guardar</Button>
            </div>
          </div>,
          document.body
      )}
    </div>
  );
};

export default Dashboard;