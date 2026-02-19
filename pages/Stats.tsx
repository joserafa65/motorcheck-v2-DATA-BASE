import React, { useMemo, useState } from 'react';
import { useVehicle } from '../contexts/VehicleContext';
import { Card, BackButton } from '../components/UI';
import { CURRENCY_FORMATTER, roundToTwo } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import { UnitSystem } from '../types';
import { Droplet, Wrench, DollarSign, MapPin } from 'lucide-react';

interface StatsProps {
  onNavigate: (view: string) => void;
}

type TimeRange = '7d' | 'month' | 'year' | 'custom';

const Stats: React.FC<StatsProps> = ({ onNavigate }) => {
  const { fuelLogs, serviceLogs, vehicle } = useVehicle();
  const [range, setRange] = useState<TimeRange>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // 1. DATA FOR CHARTS (DYNAMIC BASED ON FILTER)
  const allLogsForCharts = useMemo(() => {
    const combined = [
        ...fuelLogs.map(l => ({ date: new Date(l.date), odometer: l.odometer, type: 'fuel', cost: l.totalCost })),
        ...serviceLogs.map(l => ({ date: new Date(l.date), odometer: l.odometer, type: 'service', cost: l.cost }))
    ];
    return combined.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [fuelLogs, serviceLogs]);

  const statsData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    let periods: Date[] = [];
    let formatKey: (d: Date) => string;
    let formatName: (d: Date) => string;

    if (range === '7d') {
        // Last 7 days
        for(let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            periods.push(d);
        }
        cutoff.setDate(now.getDate() - 7);
        cutoff.setHours(0, 0, 0, 0);
        formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        formatName = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
    } else if (range === 'month') {
        // Days of current month
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        for(let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            periods.push(new Date(d));
        }
        cutoff.setDate(1);
        cutoff.setHours(0, 0, 0, 0);
        formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        formatName = (d: Date) => d.getDate().toString();
    } else if (range === 'year') {
        // Months from January to December of current year
        const currentYear = now.getFullYear();
        for(let month = 0; month <= 11; month++) {
            const d = new Date(currentYear, month, 1);
            d.setHours(0, 0, 0, 0);
            periods.push(d);
        }
        cutoff.setFullYear(currentYear, 0, 1);
        cutoff.setHours(0, 0, 0, 0);
        formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
        formatName = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
    } else if (range === 'custom') {
        // Custom date range
        if (customStartDate && customEndDate) {
            const startD = new Date(customStartDate);
            const endD = new Date(customEndDate);
            startD.setHours(0, 0, 0, 0);
            endD.setHours(0, 0, 0, 0);

            const daysDiff = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 31) {
                // Show days
                for(let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                    periods.push(new Date(d));
                }
                cutoff.setTime(startD.getTime());
                formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                formatName = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
            } else {
                // Show months
                for(let d = new Date(startD.getFullYear(), startD.getMonth(), 1); d <= endD; d.setMonth(d.getMonth() + 1)) {
                    periods.push(new Date(d));
                }
                cutoff.setTime(startD.getTime());
                formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
                formatName = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase();
            }
        } else {
            // No dates selected, default to current month
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            for(let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                periods.push(new Date(d));
            }
            cutoff.setDate(1);
            cutoff.setHours(0, 0, 0, 0);
            formatKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            formatName = (d: Date) => d.getDate().toString();
        }
    }

    const data = periods.map(p => ({
        name: formatName(p),
        key: formatKey(p),
        fuel: 0,
        service: 0,
        distance: 0,
        fullDate: p
    }));

    const dataMap: Record<string, typeof data[0]> = {};
    data.forEach(d => dataMap[d.key] = d);

    const filteredLogs = allLogsForCharts.filter(log => log.date >= cutoff);

    for (let i = 0; i < filteredLogs.length; i++) {
        const log = filteredLogs[i];
        const logKey = formatKey(log.date);

        if (dataMap[logKey]) {
            if (log.type === 'fuel') dataMap[logKey].fuel += log.cost;
            else dataMap[logKey].service += log.cost;
        }

        if (i > 0) {
            const dist = log.odometer - filteredLogs[i-1].odometer;
            if (dist > 0 && dataMap[logKey]) {
                dataMap[logKey].distance += dist;
            }
        }
    }

    return data;
  }, [allLogsForCharts, range, customStartDate, customEndDate]);

  // 2. DATA FOR DYNAMIC STATS (BASED ON FILTER)
  const filteredData = useMemo(() => {
      const now = new Date();
      const cutoff = new Date();
      let endDate: Date | null = null;

      if (range === '7d') {
          cutoff.setDate(now.getDate() - 7);
          cutoff.setHours(0,0,0,0);
      } else if (range === 'month') {
          cutoff.setDate(1);
          cutoff.setHours(0,0,0,0);
      } else if (range === 'year') {
          cutoff.setFullYear(now.getFullYear(), 0, 1);
          cutoff.setHours(0,0,0,0);
      } else if (range === 'custom') {
          if (customStartDate && customEndDate) {
              cutoff.setTime(new Date(customStartDate).getTime());
              cutoff.setHours(0,0,0,0);
              endDate = new Date(customEndDate);
              endDate.setHours(23,59,59,999);
          } else {
              cutoff.setDate(1);
              cutoff.setHours(0,0,0,0);
          }
      }

      let fLogs = fuelLogs.filter(l => {
          const logDate = new Date(l.date);
          return logDate >= cutoff && (!endDate || logDate <= endDate);
      });
      let sLogs = serviceLogs.filter(l => {
          const logDate = new Date(l.date);
          return logDate >= cutoff && (!endDate || logDate <= endDate);
      });

      return { fLogs, sLogs };
  }, [fuelLogs, serviceLogs, range, customStartDate, customEndDate]);

  const metrics = useMemo(() => {
      const { fLogs, sLogs } = filteredData;

      // Basic Counts
      const fuelVisits = fLogs.length;
      const serviceVisits = sLogs.length;
      const totalVolume = roundToTwo(fLogs.reduce((acc, l) => acc + l.volume, 0));
      const totalFuelCost = roundToTwo(fLogs.reduce((acc, l) => acc + l.totalCost, 0));
      const totalServiceCost = roundToTwo(sLogs.reduce((acc, l) => acc + l.cost, 0));

      const avgCostPerRefuel = fuelVisits > 0 ? roundToTwo(totalFuelCost / fuelVisits) : 0;
      const avgCostPerService = serviceVisits > 0 ? roundToTwo(totalServiceCost / serviceVisits) : 0;

      // Distance in Range
      // Calculate delta based on min/max odometer in the filtered set
      // This is an approximation. Ideally we need the log immediately before the cutoff to get the exact start.
      // For simplicity and consistency with the "filtered" view:
      const allOdoms = [...fLogs.map(l => l.odometer), ...sLogs.map(l => l.odometer)].sort((a,b) => a - b);
      const distance = allOdoms.length > 1 ? allOdoms[allOdoms.length - 1] - allOdoms[0] : 0;

      // Efficiency in Range
      // Using simple Total Distance / Total Volume for the period
      let eff = 0;
      if (vehicle.unitSystem === UnitSystem.LITER_100KM) {
          eff = distance > 0 ? roundToTwo((totalVolume / distance) * 100) : 0;
      } else {
          eff = totalVolume > 0 ? roundToTwo(distance / totalVolume) : 0;
      }

      return {
          fuelVisits,
          serviceVisits,
          totalVolume,
          avgCostPerRefuel,
          avgCostPerService,
          distance,
          eff
      };
  }, [filteredData, vehicle.unitSystem]);

  // Helpers
  const getUnitLabel = () => {
    switch (vehicle.unitSystem) {
      case UnitSystem.KM_GAL: return 'km/gal';
      case UnitSystem.KM_LITER: return 'km/l';
      case UnitSystem.LITER_100KM: return 'l/100km';
      default: return '';
    }
  };

  const getVolUnit = () => vehicle.unitSystem === UnitSystem.KM_GAL ? 'Gal' : 'L';

  const getRangeLabel = () => {
    switch (range) {
      case '7d': return 'Últimos 7 Días';
      case 'month': return 'Este Mes';
      case 'year': return 'Este Año';
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          const end = new Date(customEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          return `${start} - ${end}`;
        }
        return 'Personalizado';
      default: return '';
    }
  };

  return (
    <div className="p-4 pt-5 pb-20">
      <div className="flex flex-col gap-3 mb-5">
        <BackButton onClick={() => onNavigate('dashboard')} title="Estadísticas" />

        {/* Filter Buttons */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-200 dark:bg-white/10 rounded-xl animate-enter delay-100">
            <button
                onClick={() => setRange('7d')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${range === '7d' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
                ESTA SEMANA
            </button>
            <button
                onClick={() => setRange('month')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${range === 'month' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
                ESTE MES
            </button>
            <button
                onClick={() => setRange('year')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${range === 'year' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
                ESTE AÑO
            </button>
            <button
                onClick={() => setRange('custom')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${range === 'custom' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400'}`}
            >
                POR FECHAS
            </button>
        </div>

        {/* Custom Date Range Inputs */}
        {range === 'custom' && (
          <Card className="p-4 animate-enter">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Fecha Final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* All KPI Cards (Dynamic based on filter) - Vertical Layout */}
      <div className="space-y-3 mb-6 animate-enter delay-200">
        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                  <Droplet size={22} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Consumo Prom.</div>
                  <div className="text-gray-500 text-xs font-medium truncate">{getUnitLabel()}</div>
                </div>
              </div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-none shrink-0 text-right">{metrics.eff.toFixed(1)}</div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                  <MapPin size={22} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Distancia</div>
                  <div className="text-gray-500 text-xs font-medium truncate">km recorridos</div>
                </div>
              </div>
              <div className="text-xl font-bold text-emerald-500 dark:text-emerald-400 leading-none shrink-0 text-right">{metrics.distance.toLocaleString()}</div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                  <Droplet size={22} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Visitas Gasolinera</div>
                  <div className="text-gray-500 text-xs font-medium truncate">total de recargas</div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white leading-none shrink-0 text-right">{metrics.fuelVisits}</div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                  <Wrench size={22} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Visitas Mecánica</div>
                  <div className="text-gray-500 text-xs font-medium truncate">servicios realizados</div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white leading-none shrink-0 text-right">{metrics.serviceVisits}</div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 shrink-0">
                  <Droplet size={22} className="text-emerald-500 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">{getVolUnit()} Consumidos</div>
                  <div className="text-gray-500 text-xs font-medium truncate">volumen total</div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white leading-none shrink-0 text-right">{metrics.totalVolume.toFixed(1)}</div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-yellow-500/10 shrink-0">
                  <DollarSign size={22} className="text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Costo / Tanqueada</div>
                  <div className="text-gray-500 text-xs font-medium truncate">promedio por recarga</div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white leading-none shrink-0 text-right tracking-tight">
                {CURRENCY_FORMATTER.format(metrics.avgCostPerRefuel)}
              </div>
            </div>
        </Card>

        <Card className="py-4 px-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-blue-500/10 shrink-0">
                  <Wrench size={22} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <div className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-wider truncate">Costo en Servicios</div>
                  <div className="text-gray-500 text-xs font-medium truncate">promedio por servicio</div>
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white leading-none shrink-0 text-right tracking-tight">
                {CURRENCY_FORMATTER.format(metrics.avgCostPerService)}
              </div>
            </div>
        </Card>
      </div>

      {/* Dynamic Charts */}
      <Card className="mb-6 p-4 animate-enter delay-300">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Gastos ({getRangeLabel()})</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData} margin={{top: 5, right: 0, left: -10, bottom: 0}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis tick={{fill: '#6b7280', fontSize: 11, fontWeight: 500}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{fill: 'rgba(128,128,128,0.1)'}}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '12px', color: 'var(--text-color)', fontSize: '14px', fontWeight: 600 }}
                        formatter={(value: number) => CURRENCY_FORMATTER.format(value)}
                    />
                    <Bar dataKey="fuel" name="Gasolina" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="service" name="Servicio" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Gasolina</span>
              </div>
              <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Servicio</span>
              </div>
          </div>
      </Card>

      <Card className="p-4 mb-6 animate-enter delay-500">
          <h3 className="font-bold mb-6 text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Recorrido ({getRangeLabel()})</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData} margin={{top: 5, right: 0, left: -10, bottom: 0}}>
                    <defs>
                        <linearGradient id="colorDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis tick={{fill: '#6b7280', fontSize: 11, fontWeight: 500}} axisLine={false} tickLine={false} />
                    <Tooltip 
                        cursor={{stroke: 'rgba(128,128,128,0.1)'}}
                        contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '12px', color: 'var(--text-color)', fontSize: '14px', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="distance" name="Distancia" stroke="#10b981" fillOpacity={1} fill="url(#colorDist)" strokeWidth={2.5} />
                </AreaChart>
            </ResponsiveContainer>
          </div>
      </Card>

    </div>
  );
};

export default Stats;