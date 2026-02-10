import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVehicle } from '../contexts/VehicleContext';
import { Button, Card, Input, Select, BackButton, PhotoInput } from '../components/UI';
import { CURRENCY_FORMATTER, generateId, DATE_FORMATTER, roundToTwo } from '../constants';
import { FuelLog } from '../types';
import { Trash2, Trophy, AlertTriangle, Gauge } from 'lucide-react';

interface FuelProps {
  onNavigate: (view: string, params?: any) => void;
  initialTab?: 'log' | 'history';
  editLogId?: string;
  fromHistory?: boolean;
}

interface FeedbackData {
  type: 'success' | 'warning';
  distance: number;
  percent: number;
}

const Fuel: React.FC<FuelProps> = ({ onNavigate, initialTab = 'log', editLogId, fromHistory }) => {
  const { addFuelLog, updateFuelLog, vehicle, fuelLogs, deleteFuelLog } = useVehicle();
  const [activeTab, setActiveTab] = useState<'log' | 'history'>(initialTab);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Feedback Modal State
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [odometerError, setOdometerError] = useState<string>('');

  useEffect(() => {
    if (initialTab) {
        setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 16),
    odometer: vehicle.currentOdometer,
    volume: '',
    price: '',
    total: '',
    type: 'Regular',
    photo: ''
  });

  const handleEdit = (log: FuelLog) => {
      const dateValue = log.date.includes('T') ? log.date.substring(0, 16) : new Date(log.date).toISOString().substring(0, 16);
      setFormData({
          date: dateValue,
          odometer: log.odometer,
          volume: log.volume.toString(),
          price: log.pricePerUnit.toString(),
          total: log.totalCost.toString(),
          type: log.fuelType || 'Regular',
          photo: log.receiptPhoto || ''
      });
      setEditingId(log.id);
      setActiveTab('log');
  };

  useEffect(() => {
    if (editLogId && fuelLogs.length > 0) {
        const log = fuelLogs.find(l => l.id === editLogId);
        if (log) {
            handleEdit(log);
        }
    }
  }, [editLogId, fuelLogs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'odometer' && !editingId) {
        const odometerValue = Number(value);
        if (value !== '' && odometerValue < vehicle.currentOdometer) {
            setOdometerError(`Registro histórico: Esta tanqueada se guardará como historial y no actualizará el odómetro master (${vehicle.currentOdometer.toLocaleString()} km).`);
        } else {
            setOdometerError('');
        }
    }

    setFormData(prev => {
        const newData = { ...prev, [name]: value };
        if (['date', 'type', 'odometer', 'photo'].includes(name)) return newData;
        if (value === '') return newData;

        const val = parseFloat(value);
        if (isNaN(val)) return newData;

        const prevVol = parseFloat(prev.volume);
        const prevPrice = parseFloat(prev.price);
        const prevTotal = parseFloat(prev.total);

        if (name === 'volume') {
             if ((isNaN(prevPrice) || prevPrice === 0) && (!isNaN(prevTotal) && prevTotal > 0)) {
                 const p = prevTotal / val;
                 newData.price = roundToTwo(p).toString();
             }
             else if (!isNaN(prevPrice) && prevPrice > 0) {
                 newData.total = roundToTwo(val * prevPrice).toString();
             }
        }
        else if (name === 'price') {
             if (!isNaN(prevVol) && prevVol > 0) {
                 newData.total = roundToTwo(val * prevVol).toString();
             }
             else if (!isNaN(prevTotal) && prevTotal > 0) {
                 newData.volume = roundToTwo(prevTotal / val).toString();
             }
        }
        else if (name === 'total') {
             if (!isNaN(prevVol) && prevVol > 0) {
                 const p = val / prevVol;
                 newData.price = roundToTwo(p).toString();
             }
             else if (!isNaN(prevPrice) && prevPrice > 0) {
                 newData.volume = roundToTwo(val / prevPrice).toString();
             }
        }

        return newData;
    });
  };

  const calculateFeedback = (currentOdo: number, currentVol: number) => {
      if (fuelLogs.length === 0) return null;
      
      const lastLog = fuelLogs[0];
      const distance = currentOdo - lastLog.odometer;
      
      if (distance <= 0 || currentVol <= 0) return null;

      const currentRatio = distance / currentVol;
      const sortedLogs = [...fuelLogs].sort((a,b) => a.odometer - b.odometer);
      
      let totalHistDist = 0;
      
      if (sortedLogs.length > 1) {
          totalHistDist = sortedLogs[sortedLogs.length - 1].odometer - sortedLogs[0].odometer;
          const prevTotalVol = sortedLogs.slice(1).reduce((acc, l) => acc + l.volume, 0);
          
          if (totalHistDist > 0 && prevTotalVol > 0) {
              const avgRatio = totalHistDist / prevTotalVol;
              const diff = currentRatio - avgRatio;
              const percentChange = (diff / avgRatio) * 100;

              return {
                  type: percentChange >= 0 ? 'success' : 'warning',
                  distance: distance,
                  percent: Math.abs(percentChange)
              } as FeedbackData;
          }
      }
      return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentOdo = Number(formData.odometer);
    const currentVol = Number(formData.volume);

    let feedback = null;
    if (!editingId && fuelLogs.length > 0) {
        feedback = calculateFeedback(currentOdo, currentVol);
    }

    const logData: FuelLog = {
        id: editingId || generateId(),
        date: formData.date,
        odometer: currentOdo,
        volume: roundToTwo(currentVol),
        pricePerUnit: roundToTwo(Number(formData.price)),
        totalCost: roundToTwo(Number(formData.total)),
        fuelType: formData.type,
        isFullTank: true,
        receiptPhoto: formData.photo || undefined
    };

    if (editingId) {
        updateFuelLog(logData);
        setEditingId(null);
        setOdometerError('');
        if (fromHistory) {
            onNavigate('history');
        } else {
            setActiveTab('history');
            setFormData({
                date: new Date().toISOString().substring(0, 16),
                odometer: vehicle.currentOdometer,
                volume: '',
                price: '',
                total: '',
                type: 'Regular',
                photo: ''
             });
        }
    } else {
        addFuelLog(logData);
        setOdometerError('');
        if (feedback) {
            setFeedbackData(feedback);
            setShowFeedback(true);
        } else {
            finishSubmission();
        }
    }
  };

  const finishSubmission = () => {
        setFormData(prev => ({
            ...prev,
            odometer: Number(prev.odometer) + 300, 
            volume: '',
            price: prev.price, 
            total: '',
            photo: ''
        }));
        if (!fromHistory) setActiveTab('history');
        else onNavigate('history');
  };

  const handleCloseFeedback = () => {
      setShowFeedback(false);
      finishSubmission();
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      if (fromHistory) {
          onNavigate('history');
      } else {
          setFormData({
            date: new Date().toISOString().substring(0, 16),
            odometer: vehicle.currentOdometer,
            volume: '',
            price: '',
            total: '',
            type: 'Regular',
            photo: ''
          });
      }
  };

  const getVolumeUnit = () => {
      return vehicle.unitSystem === 'km/gal' ? 'Gal' : 'L';
  };

  return (
    <div className="p-4 pt-5 pb-20">
      <BackButton onClick={() => fromHistory ? onNavigate('history') : onNavigate('dashboard')} title={editingId ? "Editar Tanqueada" : "Nueva Tanqueada"} />
      
      {/* Feedback Modal */}
      {showFeedback && feedbackData && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-90 slide-in-from-bottom-8 duration-500 border border-white/10 text-center overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${feedbackData.type === 'success' ? 'from-green-400 via-green-500 to-green-400' : 'from-orange-400 via-red-500 to-orange-400'}`} />
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-xl animate-in zoom-in-0 spin-in-180 duration-700 delay-150 fill-mode-both ${feedbackData.type === 'success' ? 'bg-gradient-to-br from-green-400 to-green-500 shadow-green-500/40' : 'bg-gradient-to-br from-orange-400 to-red-500 shadow-red-500/40'}`}>
                    {feedbackData.type === 'success' ? <Trophy size={40} className="text-white drop-shadow-md" /> : <AlertTriangle size={40} className="text-white drop-shadow-md" />}
                </div>
                <h2 className="text-2xl font-black mb-3 text-gray-900 dark:text-white animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300 fill-mode-both">
                    {feedbackData.type === 'success' ? '¡Felicidades!' : 'Atención'}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-base animate-in slide-in-from-bottom-4 fade-in duration-700 delay-500 fill-mode-both">
                    {feedbackData.type === 'success' ? (
                        <>
                            En los últimos <span className="font-bold text-gray-900 dark:text-white">{feedbackData.distance.toLocaleString()} km</span> recorridos has mejorado tu consumo de gasolina en un <span className="font-bold text-green-600 dark:text-green-400">{feedbackData.percent.toFixed(1)}%</span>.
                        </>
                    ) : (
                        <>
                            Este periodo has consumido más gasolina de lo normal. Procura mejorar tu conducción en tu siguiente tanqueada.
                        </>
                    )}
                </p>
                <div className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-700 fill-mode-both">
                    <Button
                        onClick={handleCloseFeedback}
                        className={`w-full text-base h-11 border-0 ${feedbackData.type === 'success' ? '!bg-green-500 hover:!bg-green-400 !text-white !shadow-green-500/30' : '!bg-red-500 hover:!bg-red-400 !text-white !shadow-red-500/30'}`}
                    >
                        Entendido
                    </Button>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* Tabs - Only show if not editing from history */}
      {!fromHistory && (
        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-5">
            <button
                onClick={() => { setActiveTab('history'); handleCancelEdit(); }}
                className={`flex-1 py-2 text-base font-bold rounded-lg transition-all ${activeTab === 'history' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'}`}
            >
                Recientes
            </button>
            <button
                onClick={() => { setActiveTab('log'); handleCancelEdit(); }}
                className={`flex-1 py-2 text-base font-bold rounded-lg transition-all ${activeTab === 'log' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
            >
                {editingId ? 'Editando' : 'Registrar'}
            </button>
        </div>
      )}

      {activeTab === 'log' ? (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
            {editingId && (
                <div className="bg-blue-500/10 text-blue-600 dark:text-blue-300 text-sm p-3 rounded-lg text-center border border-blue-500/20 mb-4">
                    Estás editando un registro existente
                </div>
            )}
            <Input
                label="Fecha y Hora"
                type="datetime-local"
                name="date"
                required
                value={formData.date}
                onChange={handleInputChange}
            />

            <div className="mb-3 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Gauge size={18} />
                    <span className="text-sm font-medium uppercase tracking-wide">Kilometraje Actual</span>
                </div>
                <div className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                    {vehicle.currentOdometer.toLocaleString()} <span className="text-sm font-sans text-gray-500">km</span>
                </div>
            </div>

            <div className="mb-5">
                <Input
                    label="Odómetro Nuevo (km)"
                    type="number"
                    name="odometer"
                    required
                    value={formData.odometer}
                    onChange={handleInputChange}
                    className={odometerError ? 'border-blue-500 focus:ring-blue-500' : ''}
                />
                {odometerError && (
                    <div className="flex items-center gap-2 mt-2 text-blue-600 dark:text-blue-400 text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-200">
                        <AlertTriangle size={16} />
                        <span>{odometerError}</span>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label={`Cantidad (${getVolumeUnit()})`}
                    type="number"
                    step="0.001"
                    name="volume"
                    required
                    value={formData.volume}
                    onChange={handleInputChange}
                />
                <Input
                    label="Precio Unidad"
                    type="number"
                    step="0.01"
                    name="price"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                />
            </div>
            <Input
                label="Total Pagado"
                type="number"
                step="0.01"
                name="total"
                required
                value={formData.total}
                onChange={handleInputChange}
            />
            <Select 
                label="Tipo de Combustible"
                name="type"
                options={[
                    { value: 'Premium', label: 'Premium / Súper' },
                    { value: 'Regular', label: 'Regular / Extra' },
                    { value: 'Diesel', label: 'Diesel' },
                ]}
                value={formData.type}
                onChange={handleInputChange}
            />
            
            <PhotoInput 
                value={formData.photo}
                onChange={(base64) => setFormData(prev => ({...prev, photo: base64}))}
                onRemove={() => setFormData(prev => ({...prev, photo: ''}))}
            />

            <div className="flex gap-3 mt-6">
                {editingId && (
                    <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                        Cancelar
                    </Button>
                )}
                <Button type="submit">
                    {editingId ? 'Actualizar Registro' : 'Guardar Tanqueada'}
                </Button>
            </div>
        </form>
      ) : (
        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
            {fuelLogs.slice(0, 5).map((log, index) => { // Limit to 5 recent if using this view
                const prevLog = fuelLogs[index + 1];
                const distance = prevLog ? log.odometer - prevLog.odometer : 0;
                
                return (
                    <Card
                        key={log.id}
                        className="flex flex-col p-4 mb-3 active:scale-[0.98] transition-transform cursor-pointer hover:bg-white/5 border border-gray-100 dark:border-white/5"
                        onClick={() => handleEdit(log)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            {/* Volume and Fuel Type */}
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">{log.volume}</span>
                                    <span className="text-sm font-bold text-gray-500">{getVolumeUnit()}</span>
                                </div>
                                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 rounded inline-block mt-2">
                                    {log.fuelType}
                                </div>
                            </div>

                            {/* Distance Traveled */}
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                                    <span className="text-xl font-bold">+{distance > 0 ? distance.toLocaleString() : 0}</span>
                                    <span className="text-xs font-bold uppercase">km</span>
                                </div>
                                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mt-1">Recorrido</div>
                            </div>
                        </div>

                        <div className="flex justify-between items-end border-t border-gray-100 dark:border-white/5 pt-3">
                            {/* Price Per Unit */}
                            <div>
                                 <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Precio / {getVolumeUnit()}</div>
                                 <div className="font-mono text-base font-bold text-gray-700 dark:text-gray-300">
                                    {CURRENCY_FORMATTER.format(log.pricePerUnit)}
                                 </div>
                            </div>

                            {/* Total Cost and Actions */}
                            <div className="text-right flex items-center gap-3">
                                <div>
                                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Total</div>
                                    <div className="font-mono text-base font-bold text-gray-900 dark:text-white">
                                        {CURRENCY_FORMATTER.format(log.totalCost)}
                                    </div>
                                </div>
                                <div className="pl-3 border-l border-gray-200 dark:border-white/10 ml-2 flex items-center">
                                     <button
                                        onClick={(e) => { e.stopPropagation(); if(confirm('¿Eliminar registro?')) deleteFuelLog(log.id); }}
                                        className="p-2 bg-red-50 dark:bg-red-900/10 text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-400 text-right font-medium">
                           {DATE_FORMATTER.format(new Date(log.date))}
                        </div>
                    </Card>
                );
            })}
            {fuelLogs.length === 0 && (
                <div className="text-center py-10 opacity-50">
                    <Gauge className="mx-auto mb-2" size={48} strokeWidth={1} />
                    <p className="text-base text-gray-500">No hay registros de combustible aún.</p>
                </div>
            )}
            
            {!fromHistory && fuelLogs.length > 0 && (
                <div className="text-center pt-4">
                    <Button variant="secondary" onClick={() => onNavigate('history')} className="text-xs py-2">
                        Ver Historial Completo
                    </Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Fuel;