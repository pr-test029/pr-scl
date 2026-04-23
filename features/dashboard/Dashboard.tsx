
import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../components/ui/Common';
import { useSchool } from '../../App';
import { Cycle } from '../../types';
import * as api from '../../services/firebase';

export const Dashboard: React.FC = () => {
  const { students, grades, cycles, subjects, settings, payments } = useSchool();
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'error'>('checking');

  useEffect(() => {
    const checkDb = async () => {
      try {
        await api.fetchStudents();
        setDbStatus('online');
      } catch (e) {
        setDbStatus('error');
      }
    };
    checkDb();
  }, []);

  const textPrimary = "text-[var(--primary-color)] dark:text-white dark:drop-shadow-[0_0_5px_var(--primary-color)]";

  // Financial Calculations
  const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const staffCount = settings.staff?.length || 0;

  // Data for the financial chart (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    const result = [];
    
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonth - i + 12) % 12;
      const mName = months[mIdx];
      const amount = payments
        .filter(p => new Date(p.date).getMonth() === mIdx)
        .reduce((acc, p) => acc + (p.amount || 0), 0);
      result.push({ name: mName, amount });
    }
    return result;
  }, [payments]);

  const maxAmount = Math.max(...monthlyRevenue.map(m => m.amount), 1);

  const statCards = [
    { title: 'Élèves Inscrits', value: students.length, icon: 'fa-user-graduate', color: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 dark:border dark:border-blue-400/30' },
    { title: 'Personnel Actif', value: staffCount, icon: 'fa-users', color: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 dark:border dark:border-indigo-400/30' },
    { title: 'Recettes Totales', value: `${totalRevenue.toLocaleString()} FCFA`, icon: 'fa-money-bill-wave', color: 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300 dark:border dark:border-green-400/30' },
    { title: 'Cycles Actifs', value: Object.keys(cycles).length, icon: 'fa-layer-group', color: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 dark:border dark:border-purple-400/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-black dark:text-white tracking-tight">Espace Pilotage</h1>
          <div className="flex items-center gap-2 mt-2">
            <div className="relative flex items-center justify-center">
              <span className={`w-3 h-3 rounded-full ${dbStatus === 'online' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'} animate-pulse`}></span>
            </div>
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
              {dbStatus === 'online' ? 'Système Synchronisé' : 'Mode Hors-ligne'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-white/5 p-4 rounded-3xl border dark:border-white/10 shadow-sm self-start sm:self-auto">
            <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Année Scolaire</p>
                <p className="font-bold text-sm dark:text-white">2023 - 2024</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary-color)]/10 dark:bg-[var(--primary-color)]/20 text-[var(--primary-color)] flex items-center justify-center text-lg shadow-inner">
                <i className="fas fa-calendar-check"></i>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group cursor-default overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-gray-50 dark:bg-white/2 rounded-full scale-0 group-hover:scale-100 transition-transform duration-700 opacity-50"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-[var(--primary-color)] transition-colors">{stat.title}</p>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{stat.value}</h2>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.color} shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                <i className={`fas ${stat.icon} text-2xl`}></i>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* Graphique Financier */}
        <Card className="lg:col-span-2" title={<span className={textPrimary}><i className="fas fa-chart-line mr-3"></i>Performance Financière</span>}>
          <div className="h-72 mt-8 relative flex items-end justify-between gap-1 sm:gap-4 px-2 pb-10 border-b dark:border-white/5">
            {monthlyRevenue.map((m, i) => {
              const height = (m.amount / maxAmount) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-2xl z-20 pointer-events-none whitespace-nowrap">
                        {m.amount.toLocaleString()} FCFA
                    </div>
                    {/* Bar Container */}
                    <div className="w-full max-w-[50px] relative h-full flex flex-col justify-end">
                        <div 
                            className="w-full rounded-2xl bg-gradient-to-t from-blue-600 to-blue-400 opacity-20 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(37,99,235,0)] group-hover:shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                            style={{ height: `${height}%` }}
                        ></div>
                        <div 
                            className="absolute bottom-0 w-full h-1.5 bg-blue-600 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500"
                        ></div>
                    </div>
                    {/* Label */}
                    <span className="absolute top-full mt-3 text-[10px] font-black text-gray-400 group-hover:text-blue-600 uppercase tracking-widest transition-colors">{m.name}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-gray-400 font-black uppercase tracking-widest">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-full">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span>
                <span>Recettes Mensuelles</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-history text-xs"></i>
              <span>Derniers 6 mois</span>
            </div>
          </div>
        </Card>

        {/* Répartition par Cycle */}
        <Card title={<span className={textPrimary}><i className="fas fa-chart-pie mr-3"></i>Répartition Élèves</span>}>
          <div className="space-y-8 py-4">
            {Object.values(cycles).map((cycle: Cycle) => {
              const count = students.filter(s => s.cycle === cycle.id).length;
              const percentage = students.length ? Math.round((count / students.length) * 100) : 0;
              return (
                <div key={cycle.id} className="group">
                  <div className="flex justify-between items-end text-xs mb-3">
                    <span className="font-black text-gray-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{cycle.name}</span>
                    <span className="font-black dark:text-white">{count} <span className="text-[10px] text-gray-400 font-medium ml-1">({percentage}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 border dark:border-white/5 p-0.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-400 shadow-[0_0_10px_rgba(37,99,235,0.2)] transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {Object.keys(cycles).length === 0 && (
                <div className="py-16 text-center bg-gray-50 dark:bg-white/2 rounded-[2rem] border-2 border-dashed dark:border-white/5">
                    <i className="fas fa-layer-group text-gray-200 dark:text-gray-700 text-5xl mb-4"></i>
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest">Aucun cycle configuré</p>
                </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Card title={<span className={textPrimary}><i className="fas fa-info-circle mr-2"></i>Configuration Établissement</span>}>
                <div className="space-y-4">
                    <InfoRow label="Nom" value={settings.appName} />
                    <InfoRow label="Thème Visuel" value={
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[var(--primary-color)] animate-pulse"></span>
                            <span className="capitalize">{settings.theme}</span>
                        </div>
                    } />
                    <InfoRow label="Mode" value={settings.mode === 'dark' ? 'Sombre (Starry)' : 'Clair'} />
                </div>
            </Card>

            <Card title={<span className={textPrimary}><i className="fas fa-tasks mr-2"></i>Aperçu Rapide</span>}>
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <i className="fas fa-user-graduate"></i>
                            </div>
                            <span className="font-bold text-sm">Taux de remplissage</span>
                        </div>
                        <span className="text-blue-600 font-black">78%</span>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border dark:border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                                <i className="fas fa-check-double"></i>
                            </div>
                            <span className="font-bold text-sm">Notes à jour</span>
                        </div>
                        <span className="text-green-600 font-black">92%</span>
                    </div>
                </div>
            </Card>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string, value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b dark:border-white/5 last:border-0">
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <span className="text-sm font-bold dark:text-gray-200">{value}</span>
    </div>
);
