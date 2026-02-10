import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVehicle } from '../contexts/VehicleContext';
import { Card, BackButton, Button } from '../components/UI';
import { CURRENCY_FORMATTER, DATE_FORMATTER } from '../constants';
import { FuelLog, ServiceLog } from '../types';
import { Filter, Droplet, Wrench, X, Check, Image as ImageIcon, Edit2 } from 'lucide-react';

interface HistoryProps {
  onNavigate: (view: string, params?: any) => void;
}

type HistoryItem = 
  | (FuelLog & { type: 'fuel' }) 
  | (ServiceLog & { type: 'service' });

interface FilterState {
  showFuel: boolean;
  showService: boolean;
  fuelTypes: string[];
  serviceIds: string[];
}

const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const { fuelLogs, serviceLogs, serviceDefinitions, deleteServiceLog, deleteFuelLog } = useVehicle();
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    showFuel: true,
    showService: true,
    fuelTypes: [],
    serviceIds: []
  });

  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  // Calculate available options dynamically
  const availableFuelTypes = useMemo(() => {
    const types = new Set<string>();
    types.add('Premium');
    types.add('Regular');
    types.add('Diesel');
    fuelLogs.forEach(l => {
      if(l.fuelType) types.add(l.fuelType);
    });
    return Array.from(types).sort();
  }, [fuelLogs]);

  const combinedHistory: HistoryItem[] = useMemo(() => {
    const f: HistoryItem[] = fuelLogs.map(l => ({ ...l, type: 'fuel' }));
    const s: HistoryItem[] = serviceLogs.map(l => ({ ...l, type: 'service' }));
    return [...f, ...s].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fuelLogs, serviceLogs]);

  const filteredHistory = useMemo(() => {
    return combinedHistory.filter(item => {
      if (item.type === 'fuel' && !filters.showFuel) return false;
      if (item.type === 'service' && !filters.showService) return false;

      if (item.type === 'fuel') {
        if (filters.fuelTypes.length > 0) {
          const fType = item.fuelType || 'Regular'; 
          if (!filters.fuelTypes.includes(fType) && !filters.fuelTypes.some(t => fType.includes(t))) return false;
        }
      }

      if (item.type === 'service') {
        if (filters.serviceIds.length > 0) {
          if (!filters.serviceIds.includes(item.serviceId)) return false;
        }
      }
      return true;
    });
  }, [combinedHistory, filters]);

  const handleDelete = (e: React.MouseEvent, item: HistoryItem) => {
      e.stopPropagation();
      if(!confirm("¿Estás seguro de eliminar este registro?")) return;
      if (item.type === 'fuel') deleteFuelLog(item.id);
      else deleteServiceLog(item.id);
  };

  const handleEdit = (item: HistoryItem) => {
      if (item.type === 'fuel') {
          onNavigate('fuel', { editLogId: item.id, fromHistory: true });
      } else {
          onNavigate('services', { editLogId: item.id, fromHistory: true });
      }
  };

  const toggleFuelType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      fuelTypes: prev.fuelTypes.includes(type) 
        ? prev.fuelTypes.filter(t => t !== type)
        : [...prev.fuelTypes, type]
    }));
  };

  const toggleServiceId = (id: string) => {
    setFilters(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) 
        ? prev.serviceIds.filter(s => s !== id)
        : [...prev.serviceIds, id]
    }));
  };

  const activeFilterCount = 
    (!filters.showFuel ? 1 : 0) + 
    (!filters.showService ? 1 : 0) + 
    filters.fuelTypes.length + 
    filters.serviceIds.length;

  return (
    <div className="p-4 pt-5 relative min-h-screen">
      <div className="flex items-center justify-between mb-6 animate-enter">
          <BackButton onClick={() => onNavigate('dashboard')} title="Historial" />
          <button 
            onClick={() => setIsFilterOpen(true)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-bold text-sm active:scale-95 ${activeFilterCount > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white'}`}
          >
              <Filter size={20} />
              <span>Filtros</span>
              {activeFilterCount > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-md text-xs">{activeFilterCount}</span>
              )}
          </button>
      </div>

      {/* Photo Viewer Modal */}
      {viewPhoto && createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setViewPhoto(null)}>
              <div className="relative max-w-full max-h-full animate-enter">
                  <img src={viewPhoto} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" alt="Receipt" />
                  <button onClick={() => setViewPhoto(null)} className="absolute -top-12 right-0 text-white p-2">
                      <X size={32} />
                  </button>
              </div>
          </div>,
          document.body
      )}

      {/* Filter Modal Overlay */}
      {isFilterOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filtros</h2>
              <button onClick={() => setIsFilterOpen(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-300 active:scale-90 transition-transform">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Categories */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Categorías</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, showFuel: !prev.showFuel }))}
                    className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 ${filters.showFuel ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}
                  >
                    {filters.showFuel && <Check size={18} />}
                    <Droplet size={20} />
                    <span className="font-bold text-base">Combustible</span>
                  </button>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, showService: !prev.showService }))}
                    className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all active:scale-95 ${filters.showService ? 'border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'border-gray-200 dark:border-white/10 text-gray-400'}`}
                  >
                    {filters.showService && <Check size={18} />}
                    <Wrench size={20} />
                    <span className="font-bold text-base">Servicios</span>
                  </button>
                </div>
              </div>

              {/* Fuel Types */}
              {filters.showFuel && (
                <div className="animate-enter">
                   <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tipos de Combustible</h3>
                   <div className="flex flex-wrap gap-2.5">
                      {availableFuelTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => toggleFuelType(type)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 ${filters.fuelTypes.includes(type) ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                        >
                          {type}
                        </button>
                      ))}
                      {availableFuelTypes.length === 0 && <span className="text-sm text-gray-400">No hay registros aún.</span>}
                   </div>
                </div>
              )}

              {/* Service Types */}
              {filters.showService && (
                <div className="animate-enter">
                   <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Tipos de Servicio</h3>
                   <div className="flex flex-wrap gap-2.5">
                      {serviceDefinitions.map(def => (
                        <button
                          key={def.id}
                          onClick={() => toggleServiceId(def.id)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all active:scale-95 ${filters.serviceIds.includes(def.id) ? 'bg-purple-600 text-white border-purple-600' : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                        >
                          {def.name}
                        </button>
                      ))}
                   </div>
                </div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 pb-4">
               <Button 
                variant="secondary" 
                onClick={() => setFilters({ showFuel: true, showService: true, fuelTypes: [], serviceIds: [] })}
               >
                 Restablecer
               </Button>
               <Button onClick={() => setIsFilterOpen(false)}>
                 Ver Resultados ({filteredHistory.length})
               </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Results List */}
      <div className="relative border-l-2 border-gray-200 dark:border-white/10 ml-4 space-y-6 pb-20">
          {filteredHistory.map((item, idx) => (
              <div 
                key={item.id} 
                className="ml-6 relative animate-enter" 
                style={{ animationDelay: `${Math.min(idx * 50, 500)}ms` }}
              >
                  {/* Timeline Dot */}
                  <div className={`absolute -left-[32px] top-5 w-4 h-4 rounded-full border-2 border-white dark:border-black shadow-sm z-10 ${item.type === 'fuel' ? 'bg-blue-500' : 'bg-purple-500'}`} />

                  <Card
                      className="p-4 active:scale-[0.98] transition-all cursor-pointer hover:bg-white/40 dark:hover:bg-white/5"
                      onClick={() => handleEdit(item)}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">
                                  {DATE_FORMATTER.format(new Date(item.date))}
                              </div>
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                                  {item.type === 'fuel' ? 'Tanqueada' : item.serviceName}
                              </h3>
                          </div>
                          <div className="text-right">
                               <div className="font-mono text-gray-600 dark:text-gray-300 text-sm font-medium">{item.odometer.toLocaleString()} km</div>
                          </div>
                      </div>

                      <div className="flex justify-between items-end mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                              {item.type === 'fuel' ? (
                                  <span className="font-medium">{item.volume} gl <span className="text-gray-300 mx-1">•</span> {item.fuelType}</span>
                              ) : (
                                  <span className="italic line-clamp-1">{item.notes || 'Sin notas'}</span>
                              )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                              <div className={`font-bold font-mono text-lg ${item.type === 'fuel' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                                  {item.type === 'fuel' ? CURRENCY_FORMATTER.format(item.totalCost) : (item.cost > 0 ? CURRENCY_FORMATTER.format(item.cost) : '---')}
                              </div>
                              <div className="flex gap-2">
                                  <button className="text-xs font-bold text-blue-500 hover:text-blue-400 uppercase transition-colors px-1 flex items-center gap-1">
                                      <Edit2 size={12} /> Editar
                                  </button>
                                  {item.receiptPhoto && (
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); setViewPhoto(item.receiptPhoto || null); }} 
                                          className="text-xs font-bold bg-gray-100 dark:bg-white/10 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-white/20 transition-colors flex items-center gap-1.5 text-gray-600 dark:text-gray-300 z-10"
                                      >
                                          <ImageIcon size={14} /> Foto
                                      </button>
                                  )}
                                  <button onClick={(e) => handleDelete(e, item)} className="text-xs font-bold text-red-500/60 hover:text-red-500 uppercase transition-colors px-1 z-10">Eliminar</button>
                              </div>
                          </div>
                      </div>
                  </Card>
              </div>
          ))}
          {filteredHistory.length === 0 && (
              <div className="ml-6 py-10 text-center animate-enter">
                <div className="text-gray-400 dark:text-gray-600 mb-2">
                    <Filter size={48} className="mx-auto opacity-20" />
                </div>
                <p className="text-gray-500 italic text-sm">No hay registros que coincidan con los filtros seleccionados.</p>
                <button onClick={() => setIsFilterOpen(true)} className="text-blue-500 text-sm mt-2 font-bold hover:underline">Modificar filtros</button>
              </div>
          )}
      </div>
    </div>
  );
};

export default History;