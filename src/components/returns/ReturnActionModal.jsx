import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FaRecycle, FaBoxOpen, FaHandHoldingHeart, FaTimesCircle, FaTruck } from 'react-icons/fa';

const ACTION_TYPES = [
    { id: 'RESTOCK', label_en: 'Restock', label_ar: 'إعادة للمخزون', icon: FaBoxOpen, color: 'blue' },
    { id: 'DONATE', label_en: 'Donate', label_ar: 'تبرع', icon: FaHandHoldingHeart, color: 'purple' },
    { id: 'RECYCLE', label_en: 'Recycle', label_ar: 'إعادة تدوير', icon: FaRecycle, color: 'green' },
    { id: 'RETURN_TO_SUPPLIER', label_en: 'Return to Supplier', label_ar: 'إرجاع للمورد', icon: FaTruck, color: 'orange' },
    { id: 'DISPOSE', label_en: 'Dispose', label_ar: 'إتلاف', icon: FaTimesCircle, color: 'red' },
];

const ReturnActionModal = ({ isOpen, onClose, onItemProcessed, item }) => {
    const { language } = useLanguage();
    const { theme } = useTheme();
    const [selectedAction, setSelectedAction] = useState(null);
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    if (!isOpen || !item) return null;

    const handleSubmit = async () => {
        if (!selectedAction) return;
        setProcessing(true);
        try {
            await onItemProcessed(item.id, selectedAction, notes);
            onClose();
            setSelectedAction(null);
            setNotes('');
        } catch (error) {
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100000] overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

                {/* Modal */}
                <div className={`relative w-full max-w-lg rounded-xl shadow-2xl p-6 transform transition-all animate-scale-in ${theme === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                    <h3 className={`text-xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {language === 'ar' ? 'قرر مصير المنتج' : 'Decide Item Outcome'}
                    </h3>

                    <p className={`mb-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {language === 'ar'
                            ? `المنتج: ${item.product_name || 'غير معروف'} (${item.quantity} وحدة)`
                            : `Item: ${item.product_name || 'Unknown'} (${item.quantity} units)`}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {ACTION_TYPES.map((type) => {
                            const Icon = type.icon;
                            const isSelected = selectedAction === type.id;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setSelectedAction(type.id)}
                                    className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all
                                        ${isSelected
                                            ? `border-${type.color}-500 bg-${type.color}-50 dark:bg-${type.color}-900/20`
                                            : `border-transparent bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700`
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 text-${type.color}-500`} />
                                    <span className={`font-semibold ${isSelected ? `text-${type.color}-700 dark:text-${type.color}-300` : (theme === 'dark' ? 'text-gray-300' : 'text-gray-700')}`}>
                                        {language === 'ar' ? type.label_ar : type.label_en}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <textarea
                        className={`w-full p-3 rounded-lg border mb-6 focus:ring-2 focus:ring-blue-500 outline-none
                            ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                        rows="3"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    ></textarea>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 transition-colors"
                        >
                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            disabled={!selectedAction || processing}
                            onClick={handleSubmit}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-all transform active:scale-95
                                ${!selectedAction ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30'}`}
                        >
                            {processing
                                ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                                : (language === 'ar' ? 'تأكيد القرار' : 'Confirm Decision')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnActionModal;
