import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FaChartLine, FaMoneyBillWave, FaClock, FaPercentage } from 'react-icons/fa';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, theme }) => (
    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} shadow-sm`}>
        <div className="flex justify-between items-start">
            <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'} mb-1`}>{title}</p>
                <h3 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{value}</h3>
                {subtext && <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-gray-400'}`}>{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-20`}>
                <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
        </div>
    </div>
);

const ReturnsDashboard = ({ stats, loading }) => {
    const { language } = useLanguage();
    const { theme } = useTheme();

    if (loading || !stats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-xl"></div>
                ))}
            </div>
        );
    }

    const { kpi, trend, causes } = stats;

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    title={language === 'ar' ? 'معدل المرتجعات' : 'Return Rate'}
                    value={`${kpi.return_rate}%`}
                    subtext={language === 'ar' ? `من ${kpi.total_orders} طلب` : `Of ${kpi.total_orders} orders`}
                    icon={FaPercentage}
                    colorClass="bg-blue-500 text-blue-500"
                    theme={theme}
                />
                <StatCard
                    title={language === 'ar' ? 'الخسارة المالية' : 'Total Loss'}
                    value={`$${kpi.total_loss.toLocaleString()}`}
                    icon={FaMoneyBillWave}
                    colorClass="bg-red-500 text-red-500"
                    theme={theme}
                />
                <StatCard
                    title={language === 'ar' ? 'متوسط سرعة المعالجة' : 'Avg Processing Time'}
                    value={`${kpi.avg_processing_hours}h`}
                    icon={FaClock}
                    colorClass="bg-yellow-500 text-yellow-500"
                    theme={theme}
                />
                <StatCard
                    title={language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}
                    value={kpi.total_returns}
                    icon={FaChartLine}
                    colorClass="bg-purple-500 text-purple-500"
                    theme={theme}
                />
            </div>

            {/* Analysis Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Trend Chart (Simplified as Bars for MVP) */}
                {/* Trend Chart */}
                <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <h4 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'ar' ? 'اتجاه المرتجعات (30 يوم)' : 'Returns Trend (30 Days)'}
                    </h4>
                    {/* Force LTR for time-series chart usually, or allow natural flow. Adding debug log. */
                        console.log("Trend Data:", trend)
                    }
                    <div className="h-48 flex items-end gap-2 overflow-x-auto pb-2 px-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent" dir="ltr">
                        {trend && trend.length > 0 ? trend.map((d, i) => {
                            const count = Number(d.count);
                            const max = Math.max(...trend.map(t => Number(t.count)), 1);
                            const h = (count / max) * 100;
                            // Ensure date string exists
                            const dateStr = d.date ? d.date.split('T')[0].slice(5) : '??';

                            return (
                                <div key={i} className="flex flex-col items-center group relative min-w-[30px]">
                                    <div className="w-full flex justify-center mb-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-500">
                                        {count}
                                    </div>
                                    <div
                                        style={{ height: `${Math.max(h, 5)}%` }}
                                        className={`w-4 rounded-t-sm transition-all ${count > 0 ? 'bg-blue-500 hover:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                                    ></div>
                                    <span className="text-[10px] text-gray-400 mt-2 whitespace-nowrap">{dateStr}</span>
                                </div>
                            )
                        }) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                {language === 'ar' ? 'لا توجد بيانات' : 'No Data Available'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Causes */}
                <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <h4 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'ar' ? 'أهم الأسباب الجذرية' : 'Top Root Causes'}
                    </h4>
                    <div className="space-y-4">
                        {causes.map((cause, idx) => (
                            <div key={idx}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{cause.reason || 'Unknown'}</span>
                                    <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>{cause.count}</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-400"
                                        style={{ width: `${(cause.count / Math.max(...causes.map(c => c.count))) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnsDashboard;
