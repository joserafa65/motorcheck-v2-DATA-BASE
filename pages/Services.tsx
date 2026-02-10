import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useVehicle } from '../contexts/VehicleContext';
import { Button, Card, Input, Select, BackButton, PhotoInput } from '../components/UI';
import { ServiceLog, ServiceDefinition } from '../types';
import { DATE_FORMATTER, CURRENCY_FORMATTER, generateId, roundToTwo } from '../constants';
import { ArrowLeft, Edit2, Trash2, CalendarClock, ClipboardCheck, AlertCircle, Gauge, Plus } from 'lucide-react';

interface ServicesProps {
  onNavigate: (view: string, params?: any) => void;
  initialServiceId?: string;
  startInProgramMode?: boolean;
  editLogId?: string;
  fromHistory?: boolean;
}

const COMMON_SERVICES = [
    'Cambio de aceite y filtro',
    'Filtro de aire',
    'Filtro de gasolina',
    'Bujías',
    'Revisión de frenos',
    'Pastillas de frenos',
    'Líquido de frenos',
    'Rotación de llantas',
    'Alineación y balanceo',
    'Revisión de batería (12V)',
    'Cambio de batería',
    'Correa de repartición',
    'Refrigerante / Anticongelante',
    'Aceite de transmisión',
    'Cambio de plumillas',
    'Suspensión / Amortiguadores',
    'Aire acondicionado',
    'Revisión Técnico Mecánica',
    'SOAT'
];

const Services: React.FC<ServicesProps> = ({ onNavigate, initialServiceId, startInProgramMode, editLogId, fromHistory }) => {
  const { 
    serviceDefinitions, 
    addServiceLog, 
    updateServiceLog, 
    deleteServiceLog, 
    addServiceDefinition, 
    updateServiceDefinition,
    deleteServiceDefinition,
    vehicle, 
    serviceStatuses, 
    serviceLogs 
  } = useVehicle();

  const [activeServiceId, setActiveServiceId] = useState<string | null>(initialServiceId || null);
  const [showForm, setShowForm] = useState(!!startInProgramMode);
  const [formMode, setFormMode] = useState<'log' | 'program'>(startInProgramMode ? 'program' : 'log'); // log = Registrar, program = Programar (Definir)
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [odometerError, setOdometerError] = useState<string>('');

  // State for Custom Service Log
  const [isCustomLogService, setIsCustomLogService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');

  // State for Service definition name selection
  const [nameSelection, setNameSelection] = useState<string>('');
  const [targetKmInput, setTargetKmInput] = useState<string>('');

  useEffect(() => {
    if (initialServiceId) setActiveServiceId(initialServiceId);
  }, [initialServiceId]);

  useEffect(() => {
      if (startInProgramMode) {
          setShowForm(true);
          setFormMode('program');
          resetDefForm();
      }
  }, [startInProgramMode]);

  // Load log for editing if passed via params
  useEffect(() => {
      if (editLogId && serviceLogs.length > 0) {
          const log = serviceLogs.find(l => l.id === editLogId);
          if (log) {
              startEditLog(log);
          }
      }
  }, [editLogId, serviceLogs]);

  // Safety Effect: If the active service disappears (was deleted), go back to list
  useEffect(() => {
    if (activeServiceId) {
        const exists = serviceDefinitions.find(s => s.id === activeServiceId);
        if (!exists) {
            setActiveServiceId(null);
        }
    }
  }, [serviceDefinitions, activeServiceId]);
  
  // State for Service Log Form
  const [logForm, setLogForm] = useState({
      serviceId: serviceDefinitions[0]?.id || '',
      date: new Date().toISOString().substring(0, 10),
      odometer: vehicle.currentOdometer,
      cost: '',
      notes: '',
      photo: ''
  });

  // State for Service Definition Form (Programar)
  const [defForm, setDefForm] = useState({
      id: '',
      name: '',
      intervalKm: '',
      intervalMonths: '',
      notes: ''
  });

  const resetLogForm = (serviceId?: string) => {
    setLogForm({
        serviceId: serviceId || serviceDefinitions[0]?.id || '',
        date: new Date().toISOString().substring(0, 10),
        odometer: vehicle.currentOdometer,
        cost: '',
        notes: '',
        photo: ''
    });
    setIsCustomLogService(false);
    setCustomServiceName('');
    setEditingLogId(null);
  };

  const resetDefForm = () => {
    setDefForm({ id: '', name: '', intervalKm: '', intervalMonths: '', notes: '' });
    setNameSelection('');
    setTargetKmInput('');
  };

  const handleLogChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      if (name === 'odometer' && !editingLogId) {
          const odometerValue = Number(value);
          if (value !== '' && odometerValue < vehicle.currentOdometer) {
              setOdometerError(`Registro histórico: Este servicio se guardará como historial y no actualizará el odómetro master (${vehicle.currentOdometer.toLocaleString()} km).`);
          } else {
              setOdometerError('');
          }
      }

      setLogForm({ ...logForm, [name]: value });
  };

  const handleDefChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDefForm({ ...defForm, [e.target.name]: e.target.value });
  };

  const handleTargetKmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setTargetKmInput(val);
      
      const target = Number(val);
      if (!isNaN(target) && target > vehicle.currentOdometer) {
          const interval = target - vehicle.currentOdometer;
          setDefForm(prev => ({ ...prev, intervalKm: interval.toString() }));
      } else {
          setDefForm(prev => ({ ...prev, intervalKm: '' }));
      }
  };

  const handleAddKm = (amount: number) => {
      let currentVal = parseInt(targetKmInput);
      if (isNaN(currentVal) || currentVal < vehicle.currentOdometer) {
          currentVal = vehicle.currentOdometer;
      }
      const newVal = currentVal + amount;
      
      setTargetKmInput(newVal.toString());
      const interval = newVal - vehicle.currentOdometer;
      setDefForm(prev => ({ ...prev, intervalKm: interval.toString() }));
  };

  const handleNameSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setNameSelection(val);
      if (val === 'other') {
          setDefForm(prev => ({ ...prev, name: '' }));
      } else {
          setDefForm(prev => ({ ...prev, name: val }));
      }
  };

  const handleSubmitLog = (e: React.FormEvent) => {
      e.preventDefault();

      let finalServiceId = logForm.serviceId;
      let finalServiceName = '';

      if (logForm.serviceId === 'other') {
          if (!customServiceName.trim()) {
              alert("Por favor ingresa el nombre del servicio.");
              return;
          }
          finalServiceId = 'custom_' + generateId();
          finalServiceName = customServiceName;
      } else {
          const def = serviceDefinitions.find(d => d.id === logForm.serviceId);
          if (def) {
              finalServiceId = def.id;
              finalServiceName = def.name;
          } else {
               // Fallback if somehow ID is invalid but not 'other'
               finalServiceId = 'unknown_' + generateId();
               finalServiceName = 'Servicio Desconocido';
          }
      }

      const newLog: ServiceLog = {
          id: editingLogId || generateId(),
          serviceId: finalServiceId,
          serviceName: finalServiceName,
          date: logForm.date,
          odometer: Number(logForm.odometer),
          cost: roundToTwo(Number(logForm.cost) || 0),
          notes: logForm.notes,
          receiptPhoto: logForm.photo || undefined
      };
      
      if (editingLogId) {
          updateServiceLog(newLog);
          if (fromHistory) {
              onNavigate('history');
              return;
          }
      } else {
          addServiceLog(newLog);
      }

      setShowForm(false);
      resetLogForm(activeServiceId || undefined);
      setOdometerError('');
  };

  const handleSubmitDef = (e: React.FormEvent) => {
      e.preventDefault();
      const newDef: ServiceDefinition = {
          id: defForm.id || generateId(),
          name: defForm.name,
          intervalKm: Number(defForm.intervalKm),
          intervalMonths: Number(defForm.intervalMonths) || 0,
          notes: defForm.notes,
          nextDueOdometer: Number(targetKmInput) // Explicitly save the target
      };

      if (defForm.id) {
          updateServiceDefinition(newDef);
      } else {
          addServiceDefinition(newDef);
      }

      setShowForm(false);
      resetDefForm();
  };

  const startEditLog = (log: ServiceLog) => {
      const defExists = serviceDefinitions.find(d => d.id === log.serviceId);
      const dateValue = log.date.length === 10 ? log.date : new Date(log.date).toISOString().substring(0, 10);

      setLogForm({
          serviceId: defExists ? log.serviceId : 'other',
          date: dateValue,
          odometer: log.odometer,
          cost: log.cost.toString(),
          notes: log.notes,
          photo: log.receiptPhoto || ''
      });

      if (!defExists) {
          setIsCustomLogService(true);
          setCustomServiceName(log.serviceName);
      } else {
          setIsCustomLogService(false);
          setCustomServiceName('');
      }

      setEditingLogId(log.id);
      setFormMode('log');
      setShowForm(true);
  };

  const startEditDef = (def: ServiceDefinition) => {
      setDefForm({
          id: def.id,
          name: def.name,
          intervalKm: def.intervalKm.toString(),
          intervalMonths: def.intervalMonths > 0 ? def.intervalMonths.toString() : '',
          notes: def.notes || ''
      });

      // Prefer explicit nextDueOdometer if available, otherwise calculate
      const target = def.nextDueOdometer 
        ? def.nextDueOdometer.toString() 
        : (vehicle.currentOdometer + def.intervalKm).toString();

      setTargetKmInput(target);

      if (COMMON_SERVICES.includes(def.name)) {
          setNameSelection(def.name);
      } else {
          setNameSelection('other');
      }

      setFormMode('program');
      setShowForm(true);
  };

  const onConfirmDeleteService = () => {
      if (!activeServiceId) return;

      // 1. Delete all history logs associated with this service to avoid orphans
      const logsToDelete = serviceLogs.filter(l => l.serviceId === activeServiceId);
      logsToDelete.forEach(l => deleteServiceLog(l.id));

      // 2. Delete the definition
      deleteServiceDefinition(activeServiceId);

      // 3. Reset state and navigate
      setShowDeleteConfirm(false);
      setActiveServiceId(null);
      onNavigate('services');
  };

  // Render Service Detail View
  if (activeServiceId) {
      const serviceDef = serviceDefinitions.find(s => s.id === activeServiceId);
      const status = serviceStatuses.find(s => s.serviceId === activeServiceId);
      const history = serviceLogs.filter(s => s.serviceId === activeServiceId).sort((a,b) => b.odometer - a.odometer);

      if (!serviceDef) return null; // Logic in useEffect will handle redirection

      return (
        <div className="p-4 pt-5">
            <div className="flex items-center justify-between mb-8 relative z-50">
                 <div className="flex items-center gap-4">
                    <button onClick={() => { setActiveServiceId(null); onNavigate('services'); }} className="p-2.5 bg-gray-200 dark:bg-white/10 rounded-full hover:bg-gray-300 dark:hover:bg-white/20">
                        <ArrowLeft size={20} className="text-gray-900 dark:text-white" />
                    </button>
                    <h1 className="text-xl font-bold leading-tight max-w-[200px] text-gray-900 dark:text-white">{serviceDef.name}</h1>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={() => startEditDef(serviceDef)} className="p-3 bg-gray-200 dark:bg-zinc-800 rounded-full hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-500 dark:text-gray-400 shadow-sm">
                         <Edit2 size={18} />
                     </button>
                     <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                        }}
                        className="p-3 bg-gray-200 dark:bg-zinc-800 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 cursor-pointer shadow-sm active:scale-90 transition-transform"
                     >
                         <Trash2 size={18} />
                     </button>
                 </div>
            </div>

            {showForm ? (
                <Card className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300 p-4">
                    <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-6">
                        <button
                            onClick={() => setFormMode('log')}
                            className={`flex-1 py-2 text-base font-bold rounded-lg flex items-center justify-center transition-all ${formMode === 'log' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Servicio Realizado
                        </button>
                        <button
                            onClick={() => setFormMode('program')}
                            className={`flex-1 py-2 text-base font-bold rounded-lg flex items-center justify-center transition-all ${formMode === 'program' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            Programar Servicio
                        </button>
                    </div>

                    {formMode === 'log' ? (
                        <form onSubmit={handleSubmitLog}>
                             <div className="grid grid-cols-2 gap-5">
                                    <Input
                                        label="Fecha"
                                        type="date"
                                        name="date"
                                        value={logForm.date}
                                        onChange={handleLogChange}
                                        required
                                    />
                                    <div>
                                        <Input
                                            label="Kilometraje"
                                            type="number"
                                            name="odometer"
                                            value={logForm.odometer}
                                            onChange={handleLogChange}
                                            required
                                            className={odometerError ? 'border-blue-500 focus:ring-blue-500' : ''}
                                        />
                                    </div>
                            </div>
                            {odometerError && (
                                <div className="flex items-center gap-2 -mt-3 mb-3 text-blue-600 dark:text-blue-400 text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-200">
                                    <AlertCircle size={16} />
                                    <span>{odometerError}</span>
                                </div>
                            )}
                            <Input
                                    label="Costo Total"
                                    type="number"
                                    step="0.01"
                                    name="cost"
                                    placeholder="0"
                                    value={logForm.cost}
                                    onChange={handleLogChange}
                            />
                            <div className="mb-5">
                                    <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Notas</label>
                                    <textarea 
                                        className="glass-input w-full rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-base"
                                        name="notes"
                                        value={logForm.notes}
                                        onChange={handleLogChange}
                                    />
                            </div>
                            
                            <PhotoInput 
                                value={logForm.photo}
                                onChange={(base64) => setLogForm(prev => ({...prev, photo: base64}))}
                                onRemove={() => setLogForm(prev => ({...prev, photo: ''}))}
                            />

                            <div className="flex gap-3">
                                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetLogForm(activeServiceId); }}>Cancelar</Button>
                                <Button type="submit">Guardar</Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitDef}>
                             <div className="bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-500/30 p-4 rounded-xl mb-5 text-sm font-medium text-purple-700 dark:text-purple-200">
                                 Estás editando la configuración de alertas para este servicio.
                             </div>
                             
                             {/* Name Selection */}
                             <div className="mb-5">
                                <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Nombre del Servicio</label>
                                <div className="relative">
                                    <select
                                        className="glass-input w-full rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all bg-transparent text-gray-900 dark:text-white text-base"
                                        value={nameSelection}
                                        onChange={handleNameSelectChange}
                                    >
                                        <option value="" disabled className="bg-white dark:bg-gray-900 text-gray-500">Selecciona un servicio...</option>
                                        {COMMON_SERVICES.map(s => (
                                            <option key={s} value={s} className="bg-white dark:bg-gray-900">{s}</option>
                                        ))}
                                        <option value="other" className="bg-white dark:bg-gray-900 font-bold">Otro (Personalizado)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                             </div>

                             {nameSelection === 'other' && (
                                <Input 
                                    label="Escribe el nombre del servicio"
                                    name="name"
                                    placeholder="Ej: Cambio Correa de Repartición"
                                    value={defForm.name}
                                    onChange={handleDefChange}
                                    required
                                    className="animate-in slide-in-from-top-2 fade-in duration-200"
                                />
                             )}

                             <div className="mb-3 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Gauge size={18} />
                                    <span className="text-sm font-medium uppercase tracking-wide">Kilometraje Actual</span>
                                </div>
                                <div className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                                    {vehicle.currentOdometer.toLocaleString()} <span className="text-sm font-sans text-gray-500">km</span>
                                </div>
                             </div>

                             <div className="flex justify-end mb-5">
                                <button 
                                    type="button"
                                    onClick={() => handleAddKm(5000)}
                                    className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 hover:bg-blue-200 dark:hover:bg-blue-500/20"
                                >
                                    <Plus size={14} />
                                    <span>5,000 km</span>
                                </button>
                             </div>

                             <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <Input 
                                        label="Realizar a los (Km)"
                                        type="number"
                                        name="targetKm"
                                        placeholder={`> ${vehicle.currentOdometer}`}
                                        value={targetKmInput}
                                        onChange={handleTargetKmChange}
                                        required
                                        className="mb-1"
                                    />
                                    {defForm.intervalKm && (
                                         <div className="text-xs text-blue-600 dark:text-blue-400 font-medium text-right -mt-4 mb-4 pr-1">
                                             Intervalo: <span className="font-bold">{Number(defForm.intervalKm).toLocaleString()} km</span>
                                         </div>
                                    )}
                                </div>
                                <Input 
                                    label="Intervalo Meses"
                                    type="number"
                                    name="intervalMonths"
                                    placeholder="Opcional"
                                    value={defForm.intervalMonths}
                                    onChange={handleDefChange}
                                />
                             </div>
                             <div className="text-xs text-gray-500 -mt-4 mb-5 italic px-1">
                                * Si ingresas ambos, se alertará lo que ocurra primero.
                             </div>
                             <div className="mb-5">
                                <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Notas del Servicio</label>
                                <textarea 
                                    className="glass-input w-full rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-base"
                                    name="notes"
                                    placeholder="Ej: Usar aceite sintético 5W-30..."
                                    value={defForm.notes}
                                    onChange={handleDefChange}
                                />
                             </div>
                             <div className="flex gap-3 mt-4">
                                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetDefForm(); }}>Cancelar</Button>
                                <Button type="submit">Actualizar</Button>
                             </div>
                        </form>
                    )}
                </Card>
            ) : (
                <>
                    {/* Stats Card */}
                    <Card className={`mb-8 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/5 dark:to-white/0 p-4 ${status?.status === 'danger' ? 'border-red-500/50 shadow-lg shadow-red-500/10' : ''}`}>
                        {status?.status === 'danger' && (
                             <div className="bg-red-500 text-white text-sm font-bold text-center py-2 -mt-5 -mx-5 mb-5 rounded-t-2xl">
                                 ¡MANTENIMIENTO VENCIDO!
                             </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Intervalo</div>
                                <div className="font-bold text-lg text-gray-900 dark:text-white">{serviceDef.intervalKm.toLocaleString()} km</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Próximo</div>
                                <div className={`font-bold text-lg ${status?.status === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                    {status?.nextDueOdometer?.toLocaleString()} km
                                </div>
                            </div>
                        </div>
                        {serviceDef.notes && (
                            <div className="mt-5 pt-5 border-t border-gray-200 dark:border-white/10 text-center">
                                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold mb-2">Notas</div>
                                <p className="text-base text-gray-600 dark:text-gray-300 italic">"{serviceDef.notes}"</p>
                            </div>
                        )}
                        <div className="mt-5 pt-5 border-t border-gray-200 dark:border-white/10 text-center">
                            <Button onClick={() => { 
                                resetLogForm(activeServiceId); 
                                setFormMode('log');
                                setShowForm(true); 
                            }}>
                                Registrar servicio realizado
                            </Button>
                        </div>
                    </Card>

                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white px-1">Historial de Servicio</h3>
                    <div className="space-y-4">
                        {history.map(log => (
                            <Card key={log.id} className="p-4 flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">{DATE_FORMATTER.format(new Date(log.date))}</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-base">{log.odometer.toLocaleString()} km</div>
                                    {log.notes && <div className="text-gray-500 dark:text-gray-500 text-sm mt-2 italic">"{log.notes}"</div>}
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-purple-600 dark:text-purple-400 font-bold text-base mb-3">{CURRENCY_FORMATTER.format(log.cost)}</div>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => startEditLog(log)} className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => { if(confirm('Borrar?')) deleteServiceLog(log.id); }} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {history.length === 0 && <div className="text-center text-gray-500 py-10">No hay registros para este servicio.</div>}
                    </div>
                </>
            )}

            {/* Custom Delete Confirmation Modal */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-white/10 relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¿Eliminar Servicio?</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                            Estás a punto de eliminar el servicio <span className="font-bold text-gray-900 dark:text-white">"{serviceDefinitions.find(s => s.id === activeServiceId)?.name}"</span> y todo su historial de mantenimiento.
                            <br/><br/>
                            <span className="text-red-500 font-bold">Esta acción no se puede deshacer.</span>
                        </p>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
                            <Button onClick={onConfirmDeleteService} className="!bg-red-600 hover:!bg-red-500 !text-white !shadow-red-900/20">Eliminar</Button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
      );
  }

  // Render List View (Main)
  return (
    <div className="p-4 pt-5 pb-20">
       <div className="flex justify-between items-center mb-6">
         <BackButton onClick={() => fromHistory ? onNavigate('history') : onNavigate('dashboard')} title={editingLogId ? "Editar Servicio" : "Servicios Programados"} />
         {!editingLogId && (
            <Button onClick={() => { 
                setShowForm(!showForm); 
                setFormMode('log'); 
                resetLogForm(); 
                resetDefForm();
            }} className="w-auto px-5 py-3 text-sm font-bold" variant={showForm ? 'secondary' : 'primary'}>
                {showForm ? 'Cancelar' : 'Nuevo'}
            </Button>
         )}
       </div>

       {!showForm && (
         <div className="-mt-10 mb-8 ml-14 relative z-0 animate-enter delay-100">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
               Da click para editar tus servicios.
            </p>
         </div>
       )}

       {showForm ? (
           <Card className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300 p-4">
               {/* Tab Switcher */}
               <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl mb-6">
                   <button
                       onClick={() => setFormMode('log')}
                       className={`flex-1 py-2 text-base font-bold rounded-lg flex items-center justify-center transition-all ${formMode === 'log' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                   >
                       Servicio Realizado
                   </button>
                   <button
                       onClick={() => setFormMode('program')}
                       className={`flex-1 py-2 text-base font-bold rounded-lg flex items-center justify-center transition-all ${formMode === 'program' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 dark:text-gray-400'}`}
                   >
                       Programar Servicio
                   </button>
               </div>

               {formMode === 'log' ? (
                   <form onSubmit={handleSubmitLog}>
                       <Select 
                            label="Servicio"
                            name="serviceId"
                            options={[
                                ...serviceDefinitions.map(s => ({ value: s.id, label: s.name })),
                                { value: 'other', label: 'Otro (Ingresar nombre...)' }
                            ]}
                            value={logForm.serviceId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLogForm(prev => ({ ...prev, serviceId: val }));
                                if (val === 'other') {
                                    setIsCustomLogService(true);
                                } else {
                                    setIsCustomLogService(false);
                                }
                            }}
                       />
                       
                       {isCustomLogService && (
                           <Input 
                                label="Nombre del Servicio Realizado"
                                name="customServiceName"
                                placeholder="Ej: Cambio de Bombillo Farola"
                                value={customServiceName}
                                onChange={(e) => setCustomServiceName(e.target.value)}
                                required
                                className="animate-in slide-in-from-top-2 fade-in duration-200"
                           />
                       )}

                       <div className="grid grid-cols-2 gap-5">
                            <Input
                                label="Fecha"
                                type="date"
                                name="date"
                                value={logForm.date}
                                onChange={handleLogChange}
                                required
                            />
                             <div>
                                <Input
                                    label="Kilometraje"
                                    type="number"
                                    name="odometer"
                                    value={logForm.odometer}
                                    onChange={handleLogChange}
                                    required
                                    className={odometerError ? 'border-blue-500 focus:ring-blue-500' : ''}
                                />
                             </div>
                       </div>
                       {odometerError && (
                           <div className="flex items-center gap-2 -mt-3 mb-3 text-blue-600 dark:text-blue-400 text-sm font-medium animate-in slide-in-from-top-2 fade-in duration-200">
                               <AlertCircle size={16} />
                               <span>{odometerError}</span>
                           </div>
                       )}
                       <Input
                            label="Costo Total"
                            type="number"
                            step="0.01"
                            name="cost"
                            placeholder="0"
                            value={logForm.cost}
                            onChange={handleLogChange}
                       />
                       <div className="mb-5">
                            <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Notas</label>
                            <textarea 
                                className="glass-input w-full rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-base"
                                name="notes"
                                value={logForm.notes}
                                onChange={handleLogChange}
                            />
                       </div>

                       <PhotoInput 
                            value={logForm.photo}
                            onChange={(base64) => setLogForm(prev => ({...prev, photo: base64}))}
                            onRemove={() => setLogForm(prev => ({...prev, photo: ''}))}
                       />

                       <div className="flex gap-3 mt-4">
                            {fromHistory && (
                                <Button type="button" variant="secondary" onClick={() => onNavigate('history')}>
                                    Cancelar
                                </Button>
                            )}
                            <Button type="submit">
                                {editingLogId ? 'Actualizar Registro' : 'Guardar Registro'}
                            </Button>
                       </div>
                   </form>
               ) : (
                   <form onSubmit={handleSubmitDef}>
                       <div className="mb-6 text-gray-600 dark:text-gray-300 text-sm leading-relaxed px-1">
                           Crea un nuevo tipo de servicio para llevar el control. Define cada cuánto tiempo o kilómetros debe realizarse.
                       </div>
                       
                       <div className="mb-5">
                            <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Nombre del Servicio</label>
                            <div className="relative">
                                <select
                                    className="glass-input w-full rounded-xl px-4 py-3.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all bg-transparent text-gray-900 dark:text-white text-base"
                                    value={nameSelection}
                                    onChange={handleNameSelectChange}
                                    required={!nameSelection}
                                    onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Por favor selecciona un servicio de la lista.')}
                                    onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                                >
                                    <option value="" disabled className="bg-white dark:bg-gray-900 text-gray-500">Selecciona un servicio...</option>
                                    {COMMON_SERVICES.map(s => (
                                        <option key={s} value={s} className="bg-white dark:bg-gray-900">{s}</option>
                                    ))}
                                    <option value="other" className="bg-white dark:bg-gray-900 font-bold">Otro (Personalizado)</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                       </div>

                       {nameSelection === 'other' && (
                           <Input 
                                label="Escribe el nombre del servicio"
                                name="name"
                                placeholder="Ej: Cambio Correa de Repartición"
                                value={defForm.name}
                                onChange={handleDefChange}
                                required
                                className="animate-in slide-in-from-top-2 fade-in duration-200"
                           />
                       )}

                       <div className="mb-3 bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-100 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Gauge size={18} />
                                <span className="text-sm font-medium uppercase tracking-wide">Kilometraje Actual</span>
                            </div>
                            <div className="font-mono text-xl font-bold text-gray-900 dark:text-white">
                                {vehicle.currentOdometer.toLocaleString()} <span className="text-sm font-sans text-gray-500">km</span>
                            </div>
                       </div>
                       
                       <div className="flex justify-end mb-5">
                            <button 
                                type="button"
                                onClick={() => handleAddKm(5000)}
                                className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 hover:bg-blue-200 dark:hover:bg-blue-500/20"
                            >
                                <Plus size={14} />
                                <span>5,000 km</span>
                            </button>
                       </div>

                       <div className="grid grid-cols-2 gap-5">
                            <div>
                                <Input 
                                    label="Realizar a los (Km)"
                                    type="number"
                                    name="targetKm"
                                    placeholder={`> ${vehicle.currentOdometer}`}
                                    value={targetKmInput}
                                    onChange={handleTargetKmChange}
                                    required
                                    className="mb-1"
                                />
                                {defForm.intervalKm && (
                                     <div className="text-xs text-blue-600 dark:text-blue-400 font-medium text-right -mt-4 mb-4 pr-1">
                                         Intervalo: <span className="font-bold">{Number(defForm.intervalKm).toLocaleString()} km</span>
                                     </div>
                                )}
                            </div>
                            <Input 
                                label="Intervalo Meses"
                                type="number"
                                name="intervalMonths"
                                placeholder="Opcional"
                                value={defForm.intervalMonths}
                                onChange={handleDefChange}
                            />
                       </div>
                       <div className="text-xs text-gray-500 -mt-4 mb-5 italic px-1">
                          * Si ingresas ambos, se alertará lo que ocurra primero.
                       </div>
                       <div className="mb-5">
                            <label className="block text-sm font-medium text-muted mb-2 tracking-wide">Notas del Servicio</label>
                            <textarea 
                                className="glass-input w-full rounded-xl px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 h-24 text-base"
                                name="notes"
                                placeholder="Ej: Usar aceite sintético 5W-30..."
                                value={defForm.notes}
                                onChange={handleDefChange}
                            />
                       </div>
                       <Button type="submit" className="bg-purple-600 hover:bg-purple-500 mt-2">
                           Crear Servicio
                       </Button>
                   </form>
               )}
           </Card>
       ) : (
           <div className="space-y-4">
               {serviceStatuses.map(status => (
                   <Card
                        key={status.serviceId}
                        className={`relative overflow-hidden group cursor-pointer transition-transform active:scale-[0.99] border-gray-200 dark:border-white/5 p-4 ${status.status === 'danger' ? 'border-red-500/50 shadow-lg shadow-red-500/10' : ''}`}
                        onClick={() => setActiveServiceId(status.serviceId)}
                   >
                       <div className="flex justify-between items-start mb-3 relative z-10">
                           <div className="flex items-center gap-3">
                               {status.status === 'danger' && <AlertCircle size={20} className="text-red-500" />}
                               <h3 className="font-bold text-base text-gray-900 dark:text-white">{status.name}</h3>
                           </div>
                           <div className={`text-xs font-bold px-2.5 py-1 rounded border tracking-wide
                               ${status.status === 'ok' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 
                                 status.status === 'warning' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20' : 
                                 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'}`}>
                               {status.status === 'ok' ? 'OK' : status.status === 'warning' ? 'ATENCIÓN' : 'VENCIDO'}
                           </div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 text-sm relative z-10">
                           <div>
                               <p className="text-gray-500 dark:text-gray-500 text-xs uppercase font-bold tracking-wider mb-0.5">Última vez</p>
                               <p className="font-medium text-gray-800 dark:text-gray-200 text-base">
                                   {status.lastPerformedOdometer ? `${status.lastPerformedOdometer.toLocaleString()} km` : '--'}
                               </p>
                               <p className="text-xs text-gray-400 mt-0.5">
                                   {status.lastPerformedDate ? DATE_FORMATTER.format(new Date(status.lastPerformedDate)) : 'Nunca'}
                               </p>
                           </div>
                           <div className="text-right">
                               <p className="text-gray-500 dark:text-gray-500 text-xs uppercase font-bold tracking-wider mb-0.5">Próximo</p>
                               <p className={`font-medium text-base ${status.status === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>
                                   {status.nextDueOdometer?.toLocaleString()} km
                               </p>
                               <p className="text-xs text-gray-400 mt-0.5">
                                   {status.kmLeft < 0 ? `VENCIDO POR: ${Math.abs(status.kmLeft)} km` : `Restan: ${status.kmLeft} km`}
                               </p>
                           </div>
                       </div>
                       
                       {/* Progress bar effect behind */}
                       <div className="absolute bottom-0 left-0 h-1.5 bg-gray-100 dark:bg-white/5 w-full">
                           <div 
                                className={`h-full ${status.status === 'ok' ? 'bg-green-500' : status.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                style={{ width: `${Math.max(0, Math.min(100, 100 - (status.kmLeft / 5000 * 100)))}%` }} 
                           />
                       </div>
                   </Card>
               ))}
           </div>
       )}
    </div>
  );
};

export default Services;