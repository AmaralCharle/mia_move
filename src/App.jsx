/* Original uploaded file: mia.txt — source: fileciteturn1file0 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signInAnonymously,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  query, 
  addDoc,
  getDocs,
  where,
  Timestamp,
  writeBatch,
  setLogLevel
} from 'firebase/firestore';

// Variáveis globais de ambiente (assumidas como disponíveis)
// Preferência de fontes de configuração (ordem): Vite env VITE_FIREBASE_CONFIG, global __firebase_config
const appId = typeof __app_id !== 'undefined' ? __app_id : 'mia-move-app';
let firebaseConfig = null;
try {
    // Vite injects env vars as strings via import.meta.env
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_CONFIG) {
        firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
    }
} catch (e) {
    console.warn('Falha ao parsear VITE_FIREBASE_CONFIG:', e);
}
if (!firebaseConfig) {
    firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
}

// --- Configuração e Inicialização do Firebase ---
let db;
let auth;
let app;

if (firebaseConfig) {
  setLogLevel('debug');
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// Caminho base para coleções: Privado para o usuário atual
const getUserCollectionPath = (uid, collectionName) => 
  `/artifacts/${appId}/users/${uid}/${collectionName}`;

// Cores e Estilos
const primaryColor = 'bg-pink-500 hover:bg-pink-600';
const secondaryColor = 'bg-teal-500 hover:bg-teal-600';
const dangerColor = 'bg-red-500 hover:bg-red-600';
const cardStyle = 'bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg dark:border dark:border-gray-700';
const inputStyle = 'w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 transition duration-150 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-50 dark:placeholder-gray-400';
const lowStockThreshold = 5; // Limite para alerta de estoque baixo

// --- Funções Auxiliares ---
const formatCurrency = (amount) => {
  const numberAmount = typeof amount === 'number' ? amount : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numberAmount);
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-BR').format(num);
};

// Obtém o início do dia
const getStartOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

// --- Componentes ---

const SyncModal = ({ isOpen, onClose, showToast, onSync, onUnsync, currentUid, isSynced }) => {
    const [pastedUid, setPastedUid] = useState('');

    const handleCopyToClipboard = () => {
        const tempInput = document.createElement('textarea');
        tempInput.value = currentUid;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            showToast("ID da Sessão copiado!", "success");
        } catch (err) {
            showToast("Falha ao copiar o ID.", "error");
        }
        document.body.removeChild(tempInput);
    };

    const handleSyncWithUid = () => {
        if (!pastedUid.trim()) {
            showToast("Por favor, cole um ID para sincronizar.", "error");
            return;
        }
        onSync(pastedUid.trim());
        onClose();
    };


    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title="Sincronizar Dispositivos" size="max-w-xl">
           <div className="space-y-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Use esta função para acessar os mesmos dados em diferentes aparelhos (celulares, computadores, etc.).</p>
                
                <div className="p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">1. Copie o ID do Dispositivo Principal</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">No dispositivo que já contém seus dados, clique no botão para copiar o "ID da Sessão" abaixo.</p>
                    <div className="mt-4 text-center bg-pink-100 dark:bg-pink-900/40 p-3 rounded-lg flex items-center justify-between">
                        <span className="text-sm font-mono break-all text-pink-800 dark:text-pink-200">{currentUid}</span>
                        <button onClick={handleCopyToClipboard} className="ml-4 px-3 py-2 text-sm font-semibold bg-pink-500 text-white rounded-lg hover:bg-pink-600 flex-shrink-0">Copiar</button>
                    </div>
                </div>

                <div className="p-4 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">2. Cole o ID no Novo Dispositivo</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">No seu segundo aparelho, cole o ID copiado no campo abaixo e clique em "Sincronizar".</p>
                    <div className="flex space-x-2">
                        <input 
                            type="text" 
                            value={pastedUid} 
                            onChange={(e) => setPastedUid(e.target.value)} 
                            placeholder="Cole o ID da Sessão aqui"
                            className={inputStyle}
                        />
                        <button onClick={handleSyncWithUid} className={`px-6 py-2 font-semibold text-white rounded-lg ${secondaryColor} whitespace-nowrap`}>
                            Sincronizar
                        </button>
                    </div>
                </div>
               
               {isSynced && (
                 <div className="text-center pt-4 border-t dark:border-gray-600">
                    <button onClick={onUnsync} className={`px-4 py-2 text-sm font-semibold rounded-full ${dangerColor} text-white`}>
                        Desfazer Sincronização neste Dispositivo
                    </button>
                 </div>
               )}
            </div>
        </CustomModal>
    );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
    <p className="ml-3 text-gray-600 dark:text-gray-300">Carregando...</p>
  </div>
);

const CustomModal = ({ title, children, isOpen, onClose, actions, size = 'max-w-lg' }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" onClick={onClose}>
        <div 
          className={`bg-white dark:bg-gray-800 rounded-xl w-full ${size} p-6 shadow-2xl transition duration-300 transform scale-100`} 
          onClick={e => e.stopPropagation()} 
        >
          <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-pink-600">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mb-6">
            {children}
          </div>
          {actions && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
};

const Toast = ({ message, type, onClose }) => {
    const baseStyle = "fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white font-semibold flex items-center space-x-3 transition-opacity duration-300 z-50";
    let typeStyle = '';

    switch (type) {
        case 'success':
            typeStyle = 'bg-teal-500';
            break;
        case 'error':
            typeStyle = 'bg-red-500';
            break;
        default:
            typeStyle = 'bg-gray-700';
    }

    return (
        <div className={`${baseStyle} ${typeStyle}`}>
            <span>{message}</span>
            <button onClick={onClose} className="ml-4 opacity-75 hover:opacity-100">
                &times;
            </button>
        </div>
    );
};

const WeeklySalesChart = ({ sales }) => {
    const weeklyData = useMemo(() => {
        const data = [];
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const startOfDay = getStartOfDay(date);
            data.push({
                day: days[date.getDay()],
                revenue: 0,
                date: startOfDay,
            });
        }

        sales.filter(s => s.status !== 'estornada').forEach(sale => {
            const saleDate = getStartOfDay(sale.date.toDate());
            const dayData = data.find(d => d.date.getTime() === saleDate.getTime());
            if (dayData) {
                dayData.revenue += sale.totalAmount;
            }
        });

        return data;
    }, [sales]);

    const maxRevenue = Math.max(...weeklyData.map(d => d.revenue), 0);

    return (
        <div className="flex justify-around items-end h-[200px] p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
            {weeklyData.map((d, index) => (
                <div key={index} className="flex flex-col items-center flex-shrink-0 w-12 text-center">
                    <div className="text-xs font-semibold text-pink-600 dark:text-pink-400 mb-1">{formatCurrency(d.revenue)}</div>
                    <div 
                        style={{ height: `${maxRevenue > 0 ? (d.revenue / maxRevenue) * 120 : 0}px`, minHeight: '2px' }} 
                        className="w-8 bg-pink-400 rounded-t-md transition-all duration-500 shadow-md"
                    ></div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1">{d.day}</span>
                </div>
            ))}
        </div>
    );
};

const PaymentDistributionChart = ({ sales }) => {
    const paymentCounts = useMemo(() => {
        const counts = sales.filter(s => s.status !== 'estornada').reduce((acc, sale) => { acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount; return acc; }, {});
        const total = Object.values(counts).reduce((sum, val) => sum + val, 0);
        return { data: Object.entries(counts).map(([method, amount]) => ({ method, amount, percentage: total > 0 ? (amount / total) * 100 : 0 })), total };
    }, [sales]);
    if (paymentCounts.total === 0) return <p className="text-center text-gray-500 dark:text-gray-400">Sem dados de pagamento.</p>;
    const colors = {'Cartão de Crédito':'bg-indigo-500','PIX':'bg-green-500','Dinheiro':'bg-yellow-500','Débito':'bg-pink-500','Outro':'bg-gray-400'};
    return (<div className="space-y-4">
        <div className="flex h-6 rounded-full overflow-hidden shadow-inner">{paymentCounts.data.map(i => <div key={i.method} style={{ width: `${i.percentage}%` }} className={colors[i.method] || 'bg-gray-400'} title={`${i.method}: ${i.percentage.toFixed(1)}%`}></div>)}</div>
        <ul className="grid grid-cols-2 gap-2 text-sm">{paymentCounts.data.map(i => <li key={i.method} className="flex items-center space-x-2 text-gray-700 dark:text-gray-300"><span className={`w-3 h-3 rounded-full ${colors[i.method] || 'bg-gray-400'}`}></span><span>{i.method}:</span><span className="font-semibold">{i.percentage.toFixed(1)}%</span></li>)}</ul>
    </div>);
};


const Dashboard = ({ sales, expenses, products, monthlyGoal, setActiveTab }) => {
    const today = getStartOfDay(new Date());

    const { todayRevenue, todayNetProfit } = useMemo(() => {
        const todaySales = sales.filter(s => s.date.toDate() >= today && s.status !== 'estornada');
        const todayExpenses = expenses.filter(e => e.date.toDate() >= today && e.status === 'pago');
        
        const revenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
        const grossProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
        const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;

        return { todayRevenue: revenue, todayNetProfit: netProfit };
    }, [sales, expenses, today]);
    
    const allVariants = useMemo(() => products.flatMap(p => (p.variants || []).map(v => ({ ...v, productName: p.name }))), [products]);
    const lowStockVariants = useMemo(() => allVariants.filter(v => v.quantity < lowStockThreshold), [allVariants]);
    const overdueReceivables = useMemo(() => sales.filter(s => s.paymentStatus === 'a_receber' && s.status !== 'estornada' && s.dueDate && new Date(s.dueDate.replace(/-/g, '\/')) < today), [sales, today]);
    const overdueExpenses = useMemo(() => expenses.filter(e => e.status === 'a_pagar' && e.dueDate && new Date(e.dueDate.replace(/-/g, '\/')) < today), [expenses, today]);

    
    const bestSellers = useMemo(() => {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const startOfPeriod = getStartOfDay(last7Days);

        const salesInPeriod = sales.filter(s => s.date.toDate() >= startOfPeriod && s.status !== 'estornada');
        const itemsSold = {};

        salesInPeriod.forEach(sale => {
            sale.items.forEach(item => {
                itemsSold[item.sku] = (itemsSold[item.sku] || 0) + item.quantity;
            });
        });

        const allVariantsMap = new Map(allVariants.map(v => [v.sku, v]));

        return Object.entries(itemsSold)
            .map(([sku, quantity]) => ({
                ...allVariantsMap.get(sku),
                quantitySold: quantity,
            }))
            .filter(item => item.productName)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 3);
            
    }, [sales, allVariants]);


    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Painel de Controle</h2>
                <p className="text-gray-500 dark:text-gray-400">Resumo do seu negócio hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${cardStyle} border-l-4 border-pink-500 col-span-1 md:col-span-2`}>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Visão Geral do Dia</p>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-3xl font-bold text-pink-600">{formatCurrency(todayRevenue)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Vendas Hoje</p>
                        </div>
                        <div>
                            <p className={`text-3xl font-bold ${todayNetProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(todayNetProfit)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">Lucro Líquido Hoje</p>
                        </div>
                    </div>
                </div>

                <div className={`${cardStyle} border-l-4 border-purple-500 col-span-1 md:col-span-2`}>
                   <GoalProgressBar sales={sales} expenses={expenses} monthlyGoal={monthlyGoal} showTitle={true} />
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className={cardStyle}>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">📈 Desempenho da Semana</h3>
                        <WeeklySalesChart sales={sales} />
                    </div>
                     <div className={cardStyle}>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">🔥 Produtos Quentes (Últimos 7 dias)</h3>
                         {bestSellers.length > 0 ? (
                             <ul className="space-y-3">
                                {bestSellers.map(item => (
                                    <li key={item.sku} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-l-4 border-pink-300 dark:border-pink-500">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{item.productName} ({item.size} - {item.color})</span>
                                        <span className="font-bold text-pink-600 dark:text-pink-400">{item.quantitySold} uni.</span>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                             <p className="text-gray-500 dark:text-gray-400">Nenhuma venda nos últimos 7 dias.</p>
                         )}
                    </div>
                </div>

                <div className="space-y-6">
                     <div className={cardStyle}>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">⚠️ Avisos Importantes</h3>
                        <div className="space-y-3">
                            {lowStockVariants.length > 0 && (
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/40 rounded-lg flex justify-between items-center">
                                    <p className="text-orange-700 dark:text-orange-300 text-sm">{lowStockVariants.length} variaçõe(s) com estoque baixo.</p>
                                    <button onClick={() => setActiveTab('Estoque')} className="text-sm font-semibold text-orange-800 dark:text-orange-200 hover:underline">Ver</button>
                                </div>
                            )}
                            {overdueReceivables.length > 0 && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/40 rounded-lg flex justify-between items-center">
                                    <p className="text-red-700 dark:text-red-300 text-sm">{overdueReceivables.length} conta(s) a receber vencidas.</p>
                                    <button onClick={() => setActiveTab('Relatórios')} className="text-sm font-semibold text-red-800 dark:text-red-200 hover:underline">Ver</button>
                                </div>
                            )}
                             {overdueExpenses.length > 0 && (
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 border-l-4 border-yellow-500 rounded-lg flex justify-between items-center">
                                    <p className="text-yellow-800 dark:text-yellow-300 text-sm">{overdueExpenses.length} despesa(s) vencida(s).</p>
                                    <button onClick={() => setActiveTab('Despesas')} className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 hover:underline">Ver</button>
                                </div>
                            )}
                            {lowStockVariants.length === 0 && overdueReceivables.length === 0 && overdueExpenses.length === 0 && (
                                <p className="text-gray-500 dark:text-gray-400">Tudo em ordem por aqui!</p>
                            )}
                        </div>
                    </div>
                    <div className={cardStyle}>
                        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">🚀 Acesso Rápido</h3>
                        <div className="space-y-3">
                            <button onClick={() => setActiveTab('Vendas')} className={`w-full text-center p-4 rounded-lg text-white font-bold ${primaryColor}`}>+ Nova Venda</button>
                            <button onClick={() => setActiveTab('Despesas')} className={`w-full text-center p-4 rounded-lg text-white font-bold ${secondaryColor}`}>+ Nova Despesa</button>
                            <button onClick={() => setActiveTab('Estoque')} className={`w-full text-center p-4 rounded-lg text-white font-bold bg-indigo-500 hover:bg-indigo-600`}>+ Novo Produto</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Componente: Gerenciamento de Estoque (StockManagement)
const StockManagement = ({ db, userId, products, showToast, categories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [variantToAdjust, setVariantToAdjust] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyVariant, setHistoryVariant] = useState(null);
  const [variantMovements, setVariantMovements] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const newVariantTemplate = { sku: '', size: '', color: '', quantity: '', costPrice: '', salePrice: '' };
  const [formData, setFormData] = useState({ 
    name: '', categoryId: '', variants: [newVariantTemplate]
  });
  
  // States for bulk generator
  const [bulkColors, setBulkColors] = useState('');
  const [bulkSizes, setBulkSizes] = useState('');
  const [skuPrefix, setSkuPrefix] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setFormData({
          name: editingProduct.name || '',
          categoryId: editingProduct.categoryId || '',
          variants: editingProduct.variants && editingProduct.variants.length > 0 ? editingProduct.variants : [newVariantTemplate]
      });
    } else {
      setFormData({ name: '', categoryId: '', variants: [newVariantTemplate] });
      setBulkColors('');
      setBulkSizes('');
      setSkuPrefix('');
    }
  }, [editingProduct]);

  const handleBaseChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVariantChange = (index, e) => {
    const { name, value } = e.target;
    const updatedVariants = [...formData.variants];
    updatedVariants[index] = {
        ...updatedVariants[index],
        [name]: value
    };
    setFormData(prev => ({ ...prev, variants: updatedVariants }));
  };

  const addVariant = () => {
    setFormData(prev => ({ ...prev, variants: [...prev.variants, newVariantTemplate]}));
  };
  
  const removeVariant = (index) => {
    if (formData.variants.length <= 1) return;
    const updatedVariants = formData.variants.filter((_, i) => i !== index);
    setFormData(prev => ({...prev, variants: updatedVariants }));
  };

  const handleGenerateVariants = () => {
    const colors = bulkColors.split(',').map(c => c.trim()).filter(Boolean);
    const sizes = bulkSizes.split(',').map(s => s.trim()).filter(Boolean);

    if (colors.length === 0 && sizes.length === 0) {
        return showToast("Preencha Cores e/ou Tamanhos para gerar as variações.", 'error');
    }

    const combinations = [];
    const createSkuPart = (part) => part.toUpperCase().replace(/\s+/g, '-');
    
    if (colors.length > 0 && sizes.length > 0) {
        colors.forEach(color => {
            sizes.forEach(size => combinations.push({ color, size }));
        });
    } else if (colors.length > 0) {
        colors.forEach(color => combinations.push({ color, size: '' }));
    } else { // sizes.length > 0
        sizes.forEach(size => combinations.push({ color: '', size }));
    }

    const newVariants = combinations.map(combo => {
        const prefix = skuPrefix ? `${createSkuPart(skuPrefix)}-` : '';
        const colorPart = combo.color ? `${createSkuPart(combo.color)}` : '';
        const sizePart = combo.size ? `-${createSkuPart(combo.size)}` : '';

        return {
            ...newVariantTemplate,
            sku: `${prefix}${colorPart}${sizePart}`,
            size: combo.size,
            color: combo.color,
        };
    });

    setFormData(prev => ({ ...prev, variants: newVariants }));
  };
  
  const handleApplyToAll = (field, value) => {
      setFormData(prev => ({
          ...prev,
          variants: prev.variants.map(v => ({...v, [field]: value }))
      }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!db || !userId || !formData.name.trim()) {
        return showToast("O nome do produto é obrigatório.", 'error');
    }
    if (formData.variants.some(v => !v.sku.trim() || parseFloat(v.salePrice) <= 0)) {
        return showToast("Todas as variações devem ter SKU e Preço de Venda válidos.", 'error');
    }

    const productsRef = collection(db, getUserCollectionPath(userId, 'products'));

    try {
      const dataToSave = { 
        ...formData, 
        variants: formData.variants.map(v => ({
            ...v,
            quantity: parseInt(v.quantity, 10) || 0,
            costPrice: parseFloat(v.costPrice) || 0,
            salePrice: parseFloat(v.salePrice) || 0,
        })),
        updatedAt: Timestamp.now() 
      };

      if (editingProduct) {
        await updateDoc(doc(productsRef, editingProduct.id), dataToSave);
        showToast("Produto atualizado!", 'success');
      } else {
        await addDoc(productsRef, { ...dataToSave, createdAt: Timestamp.now() });
        showToast("Novo produto adicionado!", 'success');
      }

      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Erro ao salvar o produto:", error);
      showToast("Erro ao salvar produto.", 'error');
    }
  };

  const confirmDelete = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!db || !userId || !productToDelete) return;
    try {
      await deleteDoc(doc(db, getUserCollectionPath(userId, 'products'), productToDelete.id));
      showToast(`Produto ${productToDelete.name} excluído.`, 'success');
    } catch (error) {
      showToast("Erro ao deletar produto.", 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  const openModal = (product = null) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleOpenAdjustModal = (variant) => {
    setVariantToAdjust(variant);
    setIsAdjustModalOpen(true);
  };
  
  const handleOpenHistoryModal = async (variant) => {
      setHistoryVariant(variant);
      
      const movementsRef = collection(db, getUserCollectionPath(userId, 'stockMovements'));
      const q = query(movementsRef, where("variantSku", "==", variant.sku));
      
      try {
          const querySnapshot = await getDocs(q);
          const movements = querySnapshot.docs.map(doc => doc.data());
          // Sort by date descending
          movements.sort((a, b) => b.date.seconds - a.date.seconds);
          setVariantMovements(movements);
          setIsHistoryModalOpen(true);
      } catch (error) {
          showToast("Erro ao buscar histórico.", "error");
      }
  };

  const handleAdjustStock = async (newQuantity, reason) => {
    if (!variantToAdjust || reason.trim() === '') {
        showToast("Nova quantidade e motivo são obrigatórios.", 'error');
        return;
    }
    
    const productRef = doc(db, getUserCollectionPath(userId, 'products'), variantToAdjust.productId);
    const parentProduct = products.find(p => p.id === variantToAdjust.productId);
    
    const variantIndex = parentProduct.variants.findIndex(v => v.sku === variantToAdjust.sku);
    if (variantIndex === -1) return;

    const oldQuantity = parentProduct.variants[variantIndex].quantity;
    const quantityChange = newQuantity - oldQuantity;

    const updatedVariants = [...parentProduct.variants];
    updatedVariants[variantIndex].quantity = newQuantity;

    const movementLog = {
        date: Timestamp.now(),
        productId: variantToAdjust.productId,
        productName: variantToAdjust.productName,
        variantSku: variantToAdjust.sku,
        type: quantityChange > 0 ? 'ajuste_entrada' : 'ajuste_saida',
        quantityChange: Math.abs(quantityChange),
        reason,
        oldQuantity,
        newQuantity
    };

    const batch = writeBatch(db);
    batch.update(productRef, { variants: updatedVariants });
    batch.set(doc(collection(db, getUserCollectionPath(userId, 'stockMovements'))), movementLog);
    
    try {
        await batch.commit();
        showToast("Estoque ajustado com sucesso!", "success");
        setIsAdjustModalOpen(false);
        setVariantToAdjust(null);
    } catch (error) {
        showToast("Erro ao ajustar estoque.", "error");
    }
  };
  
  const allVariants = useMemo(() => {
    return products
      .filter(p => categoryFilter === 'all' || p.categoryId === categoryFilter)
      .flatMap(p => (p.variants || []).map(v => ({
        ...v,
        productId: p.id,
        productName: p.name,
        category: categories.find(c => c.id === p.categoryId)?.name || 'Sem Categoria'
    })));
  }, [products, categories, categoryFilter]);

  const lowStockVariants = useMemo(() => allVariants.filter(v => v.quantity < lowStockThreshold), [allVariants]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Estoque Mia Move</h2>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputStyle + " max-w-xs"}>
              <option value="all">Todas as Categorias</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => setIsCategoryModalOpen(true)} className="px-4 py-3 text-pink-600 dark:text-pink-300 font-semibold bg-pink-100 dark:bg-pink-900/40 rounded-lg hover:bg-pink-200 dark:hover:bg-pink-900/60 whitespace-nowrap">Gerenciar Categorias</button>
          <button onClick={() => openModal()} className={`px-4 py-3 text-white font-semibold rounded-lg ${primaryColor} shadow-md whitespace-nowrap`}>+ Novo Produto</button>
        </div>
      </div>
      
      <StockLevelChart variants={allVariants} />
      
      {lowStockVariants.length > 0 && (
        <div className="bg-orange-100 dark:bg-orange-900/40 border-l-4 border-orange-500 p-4 rounded-xl shadow-md">
          <p className="font-bold text-orange-800 dark:text-orange-200">⚠️ {lowStockVariants.length} Variaçõe(s) com Estoque Baixo!</p>
        </div>
      )}

      <div className={`${cardStyle}`}>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Variações em Estoque ({allVariants.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Produto / Categoria</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SKU</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Variação</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qtd</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Venda</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {allVariants.map((v, index) => {
                  const parentProduct = products.find(p => p.id === v.productId);
                  return (
                  <tr key={`${v.productId}-${v.sku}-${index}`} className={v.quantity < lowStockThreshold ? 'bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                    <td className="px-3 py-4 text-sm font-medium">{v.productName} <span className="block text-xs text-gray-500 dark:text-gray-400">{v.category}</span></td>
                    <td className="px-3 py-4 text-sm">{v.sku}</td>
                    <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">{v.size} - {v.color}</td>
                    <td className="px-3 py-4 text-sm font-bold">{v.quantity}</td>
                    <td className="px-3 py-4 text-sm font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(v.salePrice)}</td>
                    <td className="px-3 py-4 text-right text-sm font-medium space-x-2">
                       <button onClick={() => handleOpenHistoryModal(v)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">Histórico</button>
                       <button onClick={() => handleOpenAdjustModal(v)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">Ajustar</button>
                      <button onClick={() => openModal(parentProduct)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>
                    </td>
                  </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      <CustomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'} size="max-w-4xl"
        actions={<>
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 dark:text-gray-200 rounded-full">Cancelar</button>
          <button onClick={handleSave} className={`px-4 py-2 text-white rounded-full ${primaryColor}`}>{editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}</button>
        </>}>
        <form className="space-y-6">
            <div className="p-4 border dark:border-gray-700 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Nome do Produto:</label>
                    <input type="text" name="name" value={formData.name} onChange={handleBaseChange} required className={inputStyle} />
                </div>
                 <div>
                    <label className="block text-sm font-medium">Categoria:</label>
                    <select name="categoryId" value={formData.categoryId} onChange={handleBaseChange} className={inputStyle}>
                        <option value="">Selecione uma categoria</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>
            
            {!editingProduct && (
                 <div className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <h4 className="font-semibold text-lg mb-3 text-gray-700 dark:text-gray-200">Gerador de Variações em Massa</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                            <label className="block text-sm font-medium">Cores (separadas por vírgula):</label>
                            <input type="text" value={bulkColors} onChange={(e) => setBulkColors(e.target.value)} placeholder="Preto, Azul, Rosa" className={inputStyle + " p-2 text-sm"} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Tamanhos (separadas por vírgula):</label>
                            <input type="text" value={bulkSizes} onChange={(e) => setBulkSizes(e.target.value)} placeholder="P, M, G" className={inputStyle + " p-2 text-sm"} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Prefixo do SKU (Opcional):</label>
                            <input type="text" value={skuPrefix} onChange={(e) => setSkuPrefix(e.target.value)} placeholder="LEG-FLARE" className={inputStyle + " p-2 text-sm"} />
                        </div>
                    </div>
                    <button type="button" onClick={handleGenerateVariants} className={`w-full text-center py-2 text-sm font-semibold text-white rounded-lg ${secondaryColor} transition`}>Gerar Variações</button>
                </div>
            )}

            <div className="space-y-4">
                <h4 className="font-semibold text-lg text-gray-700 dark:text-gray-200">Variações do Produto</h4>
                <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-2 border-t border-b py-4 dark:border-gray-700">
                    {formData.variants.map((variant, index) => (
                        <div key={index} className="p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 relative">
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
                               <div><label className="block text-xs font-medium">SKU*:</label><input type="text" name="sku" value={variant.sku} onChange={(e) => handleVariantChange(index, e)} required className={inputStyle + " p-2 text-sm"} /></div>
                               <div><label className="block text-xs font-medium">Tamanho:</label><input type="text" name="size" value={variant.size} onChange={(e) => handleVariantChange(index, e)} className={inputStyle + " p-2 text-sm"} /></div>
                               <div><label className="block text-xs font-medium">Cor:</label><input type="text" name="color" value={variant.color} onChange={(e) => handleVariantChange(index, e)} className={inputStyle + " p-2 text-sm"} /></div>
                               <div><label className="block text-xs font-medium">Qtd*:</label><input type="number" name="quantity" value={variant.quantity} onChange={(e) => handleVariantChange(index, e)} required min="0" className={inputStyle + " p-2 text-sm"} /></div>
                               
                               <div className="flex items-center">
                                    <div className="flex-grow"><label className="block text-xs font-medium">Custo (R$):</label><input type="number" name="costPrice" value={variant.costPrice} onChange={(e) => handleVariantChange(index, e)} step="0.01" min="0" className={inputStyle + " p-2 text-sm"} /></div>
                                    {index === 0 && formData.variants.length > 1 && <button type="button" onClick={() => handleApplyToAll('costPrice', variant.costPrice)} title="Aplicar a todos" className="ml-1 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></button>}
                               </div>

                               <div className="flex items-center">
                                   <div className="flex-grow"><label className="block text-xs font-medium">Venda (R$)*:</label><input type="number" name="salePrice" value={variant.salePrice} onChange={(e) => handleVariantChange(index, e)} required step="0.01" min="0.01" className={inputStyle + " p-2 text-sm"} /></div>
                                   {index === 0 && formData.variants.length > 1 && <button type="button" onClick={() => handleApplyToAll('salePrice', variant.salePrice)} title="Aplicar a todos" className="ml-1 p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg></button>}
                               </div>
                            </div>
                            {formData.variants.length > 1 && (
                                <button type="button" onClick={() => removeVariant(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold">&times;</button>
                            )}
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addVariant} className="w-full text-center py-2 text-sm font-semibold text-pink-600 dark:text-pink-400 border-2 border-dashed border-pink-300 dark:border-pink-500 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900/30 transition">+ Adicionar Variação Manualmente</button>
            </div>
        </form>
      </CustomModal>
      
      <CustomModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão" size="max-w-md"
        actions={<>
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-full">Cancelar</button>
          <button onClick={handleDelete} className={`px-4 py-2 text-white rounded-full ${dangerColor}`}>Excluir</button>
        </>}>
        <p>Você tem certeza que deseja deletar o produto **{productToDelete?.name}** e todas as suas variações?</p>
      </CustomModal>
      
      {variantToAdjust && <AdjustStockModal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} variant={variantToAdjust} onAdjust={handleAdjustStock} />}
      
      {historyVariant && <StockHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} variant={historyVariant} movements={variantMovements} />}
      
      {isCategoryModalOpen && <CategoryManagement db={db} userId={userId} showToast={showToast} categories={categories} isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />}
    </div>
  );
};

const AdjustStockModal = ({ isOpen, onClose, variant, onAdjust }) => {
    const [newQuantity, setNewQuantity] = useState(variant.quantity);
    const [reason, setReason] = useState('');
    const reasons = ["Avaria", "Perda", "Acerto de contagem", "Devolução", "Outro"];

    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            title={`Ajustar Estoque: ${variant.productName}`}
            size="max-w-md"
            actions={<>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-full">Cancelar</button>
                <button onClick={() => onAdjust(parseInt(newQuantity, 10), reason)} className={`px-4 py-2 text-white rounded-full ${primaryColor}`}>Confirmar Ajuste</button>
            </>}
        >
            <div className="space-y-4">
                <p>Variação: <strong>{variant.size} - {variant.color}</strong> (SKU: {variant.sku})</p>
                <p>Quantidade Atual: <strong>{variant.quantity}</strong></p>
                <div>
                    <label className="block text-sm font-medium">Nova Quantidade:</label>
                    <input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className={inputStyle} min="0" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Motivo do Ajuste:</label>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputStyle}>
                        <option value="">Selecione um motivo</option>
                        {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>
        </CustomModal>
    );
};

const StockLevelChart = ({ variants }) => {
    const fullStockThreshold = 10;

    const stockLevels = useMemo(() => {
        if (variants.length === 0) {
            return {
                full: { count: 0, percentage: 0 },
                medium: { count: 0, percentage: 0 },
                low: { count: 0, percentage: 0 },
                outOfStock: { count: 0, percentage: 0 },
                total: 0
            };
        }

        let full = 0;
        let medium = 0;
        let low = 0;
        let outOfStock = 0;

        variants.forEach(v => {
            if (v.quantity === 0) {
                outOfStock++;
            } else if (v.quantity < lowStockThreshold) {
                low++;
            } else if (v.quantity < fullStockThreshold) {
                medium++;
            } else {
                full++;
            }
        });

        const total = variants.length;
        return {
            full: { count: full, percentage: (full / total) * 100 },
            medium: { count: medium, percentage: (medium / total) * 100 },
            low: { count: low, percentage: (low / total) * 100 },
            outOfStock: { count: outOfStock, percentage: (outOfStock / total) * 100 },
            total
        };
    }, [variants]);

    const Ring = ({ percentage, color, radius, strokeWidth, label, count }) => {
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <div className="relative flex flex-col items-center justify-center">
                <svg className="transform -rotate-90" width={radius*2 + strokeWidth*2} height={radius*2 + strokeWidth*2}>
                    <circle
                        className="text-gray-200 dark:text-gray-700"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        r={radius}
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                    />
                    <circle
                        className={color}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="transparent"
                        r={radius}
                        cx={radius + strokeWidth}
                        cy={radius + strokeWidth}
                        style={{
                            strokeDasharray: circumference,
                            strokeDashoffset: offset,
                            transition: 'stroke-dashoffset 0.5s ease-out'
                        }}
                    />
                </svg>
                 <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-bold">{count}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
                </div>
            </div>
        );
    };

    return (
        <div className={cardStyle}>
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Visão Geral do Estoque</h3>
            {stockLevels.total === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum item em estoque para exibir.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center text-center">
                    <Ring
                        percentage={stockLevels.full.percentage}
                        color="text-green-500"
                        radius={40}
                        strokeWidth={8}
                        label="Estoque Cheio"
                        count={stockLevels.full.count}
                    />
                     <Ring
                        percentage={stockLevels.medium.percentage}
                        color="text-blue-500"
                        radius={40}
                        strokeWidth={8}
                        label="Estoque Médio"
                        count={stockLevels.medium.count}
                    />
                     <Ring
                        percentage={stockLevels.low.percentage}
                        color="text-orange-500"
                        radius={40}
                        strokeWidth={8}
                        label="Estoque Baixo"
                        count={stockLevels.low.count}
                    />
                     <Ring
                        percentage={stockLevels.outOfStock.percentage}
                        color="text-red-500"
                        radius={40}
                        strokeWidth={8}
                        label="Esgotado"
                        count={stockLevels.outOfStock.count}
                    />
                </div>
            )}
        </div>
    );
};

const StockHistoryModal = ({ isOpen, onClose, variant, movements }) => {
    
    const getTypeLabel = (type) => {
        switch(type) {
            case 'venda': return <span className="text-red-600 font-semibold">Venda</span>;
            case 'estorno': return <span className="text-blue-600 font-semibold">Estorno</span>;
            case 'ajuste_entrada': return <span className="text-green-600 font-semibold">Ajuste (Entrada)</span>;
            case 'ajuste_saida': return <span className="text-orange-600 font-semibold">Ajuste (Saída)</span>;
            case 'saida_defeito': return <span className="text-yellow-600 font-semibold">Saída (Defeito)</span>;
            default: return type;
        }
    };
    
    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title={`Histórico: ${variant.productName} (${variant.size} - ${variant.color})`} size="max-w-2xl">
            <div className="max-h-[60vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tipo</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Alteração</th>
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Saldo Final</th>
                             <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Motivo / Venda ID</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {movements.map((mov, index) => (
                            <tr key={index}>
                                <td className="px-3 py-4 text-sm">{mov.date.toDate().toLocaleString('pt-BR')}</td>
                                <td className="px-3 py-4 text-sm">{getTypeLabel(mov.type)}</td>
                                <td className={`px-3 py-4 text-sm font-bold ${mov.type === 'ajuste_entrada' || mov.type === 'estorno' ? 'text-green-600' : 'text-red-600'}`}>
                                    {mov.type === 'ajuste_entrada' || mov.type === 'estorno' ? `+${mov.quantityChange}` : `-${mov.quantityChange}`}
                                </td>
                                <td className="px-3 py-4 text-sm font-bold">{mov.newQuantity}</td>
                                <td className="px-3 py-4 text-sm">{mov.reason || mov.saleId}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CustomModal>
    );
};

// Componente: Gerenciamento de Vendas (SalesManagement)
const SalesManagement = ({ db, userId, products, sales, showToast }) => {
  const [view, setView] = useState('new');
  // States for New Sale
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cartão de Crédito');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('recebido');
  const [dueDate, setDueDate] = useState(''); 
  const [customerName, setCustomerName] = useState(''); 
  const [saleNotes, setSaleNotes] = useState('');
  
  // States for History View
  const [historySearch, setHistorySearch] = useState('');
  const [saleToReturn, setSaleToReturn] = useState(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [expandedSale, setExpandedSale] = useState(null);

  const availableVariants = useMemo(() => {
    return products.flatMap(p => (p.variants || []).map(v => ({...v, productId: p.id, productName: p.name })))
      .filter(v => v.quantity > 0 && (
          v.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          v.color.toLowerCase().includes(searchTerm.toLowerCase()) || 
          v.size.toLowerCase().includes(searchTerm.toLowerCase()) || 
          v.sku.toLowerCase().includes(searchTerm.toLowerCase())
      ))
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [products, searchTerm]);

  const { subtotal, costOfGoodsSold, totalAmount } = useMemo(() => {
    const calculatedTotals = selectedItems.reduce((acc, item) => { acc.subtotal += item.salePrice * item.quantity; acc.costOfGoodsSold += item.costPrice * item.quantity; return acc; }, { subtotal: 0, costOfGoodsSold: 0 });
    const totalAmount = calculatedTotals.subtotal * (1 - (discountPercentage / 100));
    return { ...calculatedTotals, totalAmount: Math.max(0, totalAmount) };
  }, [selectedItems, discountPercentage]);
  
  const totalDiscount = subtotal - totalAmount;

  const addItemToSale = (variant) => {
    const existingItem = selectedItems.find(item => item.sku === variant.sku);
    if (existingItem) {
      if (existingItem.quantity < variant.quantity) {
        setSelectedItems(prev => prev.map(item => item.sku === variant.sku ? { ...item, quantity: item.quantity + 1 } : item));
      } else {
        showToast("Estoque insuficiente.", 'error');
      }
    } else {
      setSelectedItems(prev => [...prev, {
          productId: variant.productId,
          productName: variant.productName,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          quantity: 1,
          salePrice: variant.salePrice,
          costPrice: variant.costPrice,
          stockQuantity: variant.quantity, 
      }]);
    }
    setSearchTerm('');
  };

  const updateItemQuantity = (sku, newQuantity) => {
    setSelectedItems(prev => prev.map(item => item.sku === sku ? { ...item, quantity: Math.min(Math.max(1, newQuantity), item.stockQuantity) } : item));
  };

  const removeItemFromSale = (sku) => {
    setSelectedItems(prev => prev.filter(item => item.sku !== sku));
  };

  const processSale = async () => {
    if (selectedItems.length === 0 || !db || !userId) return showToast("O carrinho está vazio.", 'error');
    if (paymentStatus === 'a_receber' && (!dueDate || !customerName.trim())) return showToast("Preencha o nome da cliente e a data de vencimento.", 'error');

    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const salesRef = collection(db, getUserCollectionPath(userId, 'sales'));
      const newSaleDocRef = doc(salesRef); 

      const saleData = {
        date: Timestamp.now(), status: 'concluida', subtotal, discountPercentage, totalDiscount, totalAmount, costOfGoodsSold, profit: totalAmount - costOfGoodsSold, paymentMethod, paymentStatus,
        ...(paymentStatus === 'a_receber' && { dueDate, customerName }),
        items: selectedItems.map(item => ({ productId: item.productId, sku: item.sku, name: item.productName, size: item.size, color: item.color, quantity: item.quantity, salePrice: item.salePrice })),
        userId,
        saleNotes: saleNotes.trim(),
      };
      batch.set(newSaleDocRef, saleData);
      
      const productUpdates = {};
      const movementsRef = collection(db, getUserCollectionPath(userId, 'stockMovements'));

      selectedItems.forEach(item => {
        if (!productUpdates[item.productId]) {
            const product = products.find(p => p.id === item.productId);
            productUpdates[item.productId] = { original: product, variants: [...(product.variants || [])] };
        }
        
        const variantIndex = productUpdates[item.productId].variants.findIndex(v => v.sku === item.sku);
        if (variantIndex > -1) {
            const oldQuantity = productUpdates[item.productId].variants[variantIndex].quantity;
            const newQuantity = oldQuantity - item.quantity;
            productUpdates[item.productId].variants[variantIndex].quantity = newQuantity;
            
            const movementLog = {
                date: Timestamp.now(), productId: item.productId, productName: item.productName, variantSku: item.sku, type: 'venda', quantityChange: item.quantity, reason: `Venda #${newSaleDocRef.id.substring(0, 8)}`, oldQuantity, newQuantity, saleId: newSaleDocRef.id
            };
            batch.set(doc(movementsRef), movementLog);
        }
      });
      
      for (const [productId, update] of Object.entries(productUpdates)) {
        const productRef = doc(db, getUserCollectionPath(userId, 'products'), productId);
        batch.update(productRef, { variants: update.variants });
      }

      await batch.commit();
      showToast(`Venda de ${formatCurrency(totalAmount)} registrada!`, 'success');
      setSelectedItems([]); setDiscountPercentage(0); setPaymentMethod('Cartão de Crédito'); setPaymentStatus('recebido'); setDueDate(''); setCustomerName(''); setSaleNotes('');
    } catch (error) {
      console.error("Erro ao processar a venda:", error);
      showToast("Erro ao processar a venda.", 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredHistory = useMemo(() => {
      return sales
          .filter(sale => {
              if (!historySearch) return true;
              const term = historySearch.toLowerCase();
              return sale.id.toLowerCase().includes(term) ||
                     (sale.customerName && sale.customerName.toLowerCase().includes(term)) ||
                     sale.items.some(item => item.name.toLowerCase().includes(term));
          })
          .sort((a, b) => b.date.seconds - a.date.seconds);
  }, [sales, historySearch]);

  const confirmReturnSale = (sale) => {
      setSaleToReturn(sale);
      setIsReturnModalOpen(true);
  };

  const handleReturnSale = async () => {
      if (!saleToReturn || isProcessing) return;
      setIsProcessing(true);
      try {
          const batch = writeBatch(db);
          
          const saleRef = doc(db, getUserCollectionPath(userId, 'sales'), saleToReturn.id);
          batch.update(saleRef, { status: 'estornada' });

          const productUpdates = {};
          const movementsRef = collection(db, getUserCollectionPath(userId, 'stockMovements'));

          for (const item of saleToReturn.items) {
              if (!productUpdates[item.productId]) {
                  const product = products.find(p => p.id === item.productId);
                  if (!product) continue;
                  productUpdates[item.productId] = { ...product, variants: JSON.parse(JSON.stringify(product.variants)) };
              }

              const productToUpdate = productUpdates[item.productId];
              const variantIndex = productToUpdate.variants.findIndex(v => v.sku === item.sku);

              if (variantIndex > -1) {
                  const oldQuantity = productToUpdate.variants[variantIndex].quantity;
                  const newQuantity = oldQuantity + item.quantity;
                  productToUpdate.variants[variantIndex].quantity = newQuantity;

                  const movementLog = {
                      date: Timestamp.now(), productId: item.productId, productName: item.name, variantSku: item.sku, type: 'estorno', quantityChange: item.quantity, reason: `Estorno da Venda #${saleToReturn.id.substring(0, 8)}`, oldQuantity, newQuantity, saleId: saleToReturn.id
                  };
                  batch.set(doc(movementsRef), movementLog);
              }
          }

          for (const [productId, update] of Object.entries(productUpdates)) {
              const productRef = doc(db, getUserCollectionPath(userId, 'products'), productId);
              batch.update(productRef, { variants: update.variants });
          }

          await batch.commit();
          showToast("Venda estornada com sucesso! Estoque atualizado.", 'success');
      } catch (error) {
          console.error("Erro ao estornar venda:", error);
          showToast("Erro ao estornar venda.", 'error');
      } finally {
          setIsProcessing(false);
          setIsReturnModalOpen(false);
          setSaleToReturn(null);
      }
  };

  const getStatusBadge = (status) => {
      switch (status) {
          case 'estornada': return <span className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-200 rounded-full dark:bg-gray-600 dark:text-gray-200">Estornada</span>;
          case 'concluida': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full dark:bg-green-900/50 dark:text-green-300">Concluída</span>;
          default: return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full dark:bg-yellow-900/50 dark:text-yellow-300">{status}</span>;
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between md:items-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Vendas</h2>
            <div className="flex rounded-lg shadow-sm border border-gray-300 dark:border-gray-600 mt-4 md:mt-0">
                <button onClick={() => setView('new')} className={`px-4 py-2 font-semibold rounded-l-lg transition ${view === 'new' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>Nova Venda</button>
                <button onClick={() => setView('history')} className={`px-4 py-2 font-semibold rounded-r-lg transition ${view === 'history' ? 'bg-pink-500 text-white' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>Histórico de Vendas</button>
            </div>
        </div>
      
      {view === 'new' && (
         <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">1. Adicionar Produtos</h3>
                <input type="text" placeholder="Buscar produto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={inputStyle + ' sticky top-0 z-10'}/>
                <div className={`${cardStyle} max-h-[500px] overflow-y-auto`}>
                  <div className="space-y-2">{availableVariants.map((v) => (<div key={v.sku} className="flex justify-between items-center p-3 border dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-pink-100 dark:hover:bg-pink-900/40 transition"><div><p className="font-medium text-gray-800 dark:text-gray-200">{v.productName} ({v.size} - {v.color})</p><p className="text-sm text-gray-600 dark:text-gray-400">Qtd: {v.quantity} | {formatCurrency(v.salePrice)}</p></div><button onClick={() => addItemToSale(v)} className={`p-2 text-white rounded-full ${secondaryColor} text-sm shadow-md`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg></button></div>))}</div>
                </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">2. Finalizar Venda</h3>
                <div className={`${cardStyle} border-t-4 border-pink-500 space-y-4`}>
                  <h3 className="font-semibold text-xl mb-4 text-teal-600 dark:text-teal-400">Resumo da Venda</h3>
                  {selectedItems.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-center py-8">O carrinho está vazio.</p> :
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2 mb-4 border-b pb-4 dark:border-gray-700">{selectedItems.map(item => (<div key={item.sku} className="flex items-center justify-between border-b pb-2 dark:border-gray-700"><div><p className="font-medium text-gray-800 dark:text-gray-200">{item.productName} ({item.size} - {item.color})</p><p className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.salePrice)} x {item.quantity}</p></div><div className="flex items-center space-x-2"><input type="number" min="1" max={item.stockQuantity} value={item.quantity} onChange={(e) => updateItemQuantity(item.sku, parseInt(e.target.value, 10))} className="w-16 p-1 text-center border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600"/><button onClick={() => removeItemFromSale(item.sku)} className="text-red-500 hover:text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></div></div>))}</div>
                  }
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pagamento:</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputStyle}><option>Cartão de Crédito</option><option>PIX</option><option>Dinheiro</option><option>Débito</option><option>Outro</option></select></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Desconto (%):</label><input type="number" min="0" max="100" value={discountPercentage} onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)} className={inputStyle}/></div></div>
                    <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label><div className="flex rounded-lg shadow-sm"><button type="button" onClick={() => setPaymentStatus('recebido')} className={`w-full py-2 text-sm font-semibold rounded-l-lg transition ${paymentStatus === 'recebido' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>✅ Recebido</button><button type="button" onClick={() => setPaymentStatus('a_receber')} className={`w-full py-2 text-sm font-semibold rounded-r-lg transition ${paymentStatus === 'a_receber' ? 'bg-yellow-500 text-white' : 'bg-gray-200 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>⌛ A Receber</button></div></div>
                    {paymentStatus === 'a_receber' && (<div className="grid sm:grid-cols-2 gap-4 mt-2"><div><label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Cliente:</label><input type="text" id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputStyle} placeholder="Nome de quem irá pagar"/></div><div><label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vencimento:</label><input type="date" id="dueDate" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputStyle} min={new Date().toISOString().split('T')[0]}/></div></div>)}
                    <div><label htmlFor="saleNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mt-4">Observações:</label><textarea id="saleNotes" value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} className={inputStyle} rows="2" placeholder="Detalhes da venda (ex: embrulhar para presente)..."></textarea></div>
                    <div className="space-y-2 border-t pt-4 dark:border-gray-700"><div className="flex justify-between text-base text-gray-500 dark:text-gray-400"><span>Subtotal:</span><span>{formatCurrency(subtotal)}</span></div><div className="flex justify-between text-base text-red-500 dark:text-red-400 font-medium"><span>Desconto:</span><span>- {formatCurrency(totalDiscount)}</span></div><div className="flex justify-between text-2xl font-bold text-gray-800 dark:text-gray-100 pt-2 border-t dark:border-gray-700"><span>Total:</span><span className="text-pink-600 dark:text-pink-400">{formatCurrency(totalAmount)}</span></div></div>
                    <button onClick={processSale} disabled={selectedItems.length === 0 || isProcessing || totalAmount <= 0} className={`mt-4 w-full py-3 text-white font-bold rounded-full transition ${primaryColor} disabled:opacity-50`}>{isProcessing ? 'Processando...' : 'Finalizar Venda'}</button>
                </div>
            </div>
         </div>
      )}

      {view === 'history' && (
          <div className="space-y-4">
              <input type="text" placeholder="Buscar por ID da Venda, Cliente ou Produto..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} className={inputStyle} />
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                  {filteredHistory.map(sale => (
                      <div key={sale.id} className={`${cardStyle} border-l-4 ${sale.status === 'estornada' ? 'border-gray-400' : 'border-teal-500'}`}>
                          <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">ID: {sale.id.substring(0,8)}... | Data: {sale.date.toDate().toLocaleString('pt-BR')}</p>
                              <p className="font-bold text-lg dark:text-gray-100">{sale.customerName || 'Venda Rápida'} - <span className="text-pink-600 dark:text-pink-400">{formatCurrency(sale.totalAmount)}</span></p>
                            </div>
                            <div className="flex items-center space-x-4 mt-3 sm:mt-0">
                                {getStatusBadge(sale.status)}
                                <button onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)} className="text-sm font-semibold text-gray-600 dark:text-gray-300">Detalhes</button>
                                {sale.status !== 'estornada' && <button onClick={() => confirmReturnSale(sale)} className={`px-3 py-1 text-sm text-white font-semibold rounded-full ${dangerColor}`}>Estornar</button>}
                            </div>
                          </div>
                          {expandedSale === sale.id && (
                              <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-2 text-sm">
                                  <ul className="list-disc list-inside space-y-1">
                                    {sale.items.map(item => <li key={item.sku}>{item.quantity}x {item.name} ({item.size} - {item.color}) - {formatCurrency(item.salePrice)}/unid.</li>)}
                                  </ul>
                                  <p><strong>Pagamento:</strong> {sale.paymentMethod} ({sale.paymentStatus})</p>
                                  {sale.saleNotes && <p><strong>Observações:</strong> {sale.saleNotes}</p>}
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      )}

      <CustomModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Confirmar Estorno da Venda" size="max-w-md"
        actions={<>
          <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-full">Cancelar</button>
          <button onClick={handleReturnSale} className={`px-4 py-2 text-white rounded-full ${dangerColor}`}>Confirmar Estorno</button>
        </>}>
        <p>Você tem certeza que deseja estornar a venda para <strong>{saleToReturn?.customerName || 'N/A'}</strong> no valor de <strong>{formatCurrency(saleToReturn?.totalAmount)}</strong>?</p>
        <p className="mt-2 text-sm text-yellow-600">Os itens desta venda retornarão ao estoque.</p>
      </CustomModal>
    </div>
  );
};

// --- Componente: Gerenciamento de Despesas (ExpensesManagement) ---
const ExpensesManagement = ({ db, userId, expenses, showToast, recurringExpenses, onLaunchRecurring }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  const defaultFormData = { 
    description: '', 
    amount: '', 
    category: 'Matéria Prima', 
    date: new Date().toISOString().split('T')[0],
    status: 'pago',
    dueDate: ''
  };
  const [formData, setFormData] = useState(defaultFormData);

  const expenseCategories = ['Matéria Prima', 'Marketing', 'Aluguel', 'Salários', 'Impostos', 'Outros'];

  useEffect(() => {
    if (editingExpense) {
      const expenseDate = editingExpense.date instanceof Timestamp ? editingExpense.date.toDate().toISOString().split('T')[0] : editingExpense.date;
      const expenseDueDate = editingExpense.dueDate ? (editingExpense.dueDate instanceof Timestamp ? editingExpense.dueDate.toDate().toISOString().split('T')[0] : editingExpense.dueDate) : '';
      setFormData({ ...editingExpense, date: expenseDate, dueDate: expenseDueDate });
    }
  }, [editingExpense]);

  const openNewExpenseModal = (prefillData = null) => {
    setEditingExpense(null);
    setFormData(prefillData ? { ...defaultFormData, ...prefillData } : defaultFormData);
    setIsModalOpen(true);
  };
  
  useEffect(() => {
      if (onLaunchRecurring) {
          openNewExpenseModal(onLaunchRecurring);
      }
  }, [onLaunchRecurring]);


  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!db || !userId || !formData.description || parseFloat(formData.amount) <= 0) {
      return showToast("Preencha a descrição e um valor válido.", 'error');
    }

    try {
      const dataToSave = { 
          ...formData,
          amount: parseFloat(formData.amount),
          date: Timestamp.fromDate(new Date(formData.date.replace(/-/g, '\/'))),
          dueDate: formData.status === 'a_pagar' && formData.dueDate ? Timestamp.fromDate(new Date(formData.dueDate.replace(/-/g, '\/'))) : null
      };
      
      const expensesRef = collection(db, getUserCollectionPath(userId, 'expenses'));

      if (editingExpense) {
        await updateDoc(doc(expensesRef, editingExpense.id), dataToSave);
        showToast("Despesa atualizada!", 'success');
      } else {
        await addDoc(expensesRef, dataToSave);
        showToast("Despesa adicionada!", 'success');
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error("Erro ao salvar despesa:", error);
      showToast("Erro ao salvar despesa.", 'error');
    }
  };

  const confirmDelete = (expense) => {
    setExpenseToDelete(expense);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!db || !userId || !expenseToDelete) return;
    try {
      await deleteDoc(doc(db, getUserCollectionPath(userId, 'expenses'), expenseToDelete.id));
      showToast("Despesa excluída.", 'success');
    } catch (error) {
      showToast("Erro ao excluir.", 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };
  
  const handleMarkAsPaid = async (expense) => {
      const expenseRef = doc(db, getUserCollectionPath(userId, 'expenses'), expense.id);
      try {
        await updateDoc(expenseRef, { status: 'pago' });
        showToast("Despesa marcada como paga!", "success");
      } catch (error) {
        showToast("Erro ao atualizar despesa.", "error");
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Controle de Despesas</h2>
        <div className="flex space-x-2">
            <button onClick={() => setIsRecurringModalOpen(true)} className="px-4 py-2 text-teal-600 dark:text-teal-300 font-semibold bg-teal-100 dark:bg-teal-900/40 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/60 whitespace-nowrap">Gerenciar Recorrentes</button>
            <button onClick={() => openNewExpenseModal()} className={`px-4 py-2 text-white font-semibold rounded-lg ${primaryColor} shadow-md`}>+ Nova Despesa</button>
        </div>
      </div>
       <ExpenseCategoryChart expenses={expenses} />
      <div className={cardStyle}>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Despesas Registradas ({expenses.length})</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Data</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Descrição</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Categoria</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((exp) => {
                  const isOverdue = exp.status === 'a_pagar' && exp.dueDate && exp.dueDate.toDate() < getStartOfDay(new Date());
                  return (
                    <tr key={exp.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isOverdue ? 'bg-red-50 dark:bg-red-900/30' : ''}`}>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{exp.date.toDate().toLocaleDateString('pt-BR')}</td>
                      <td className="px-3 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{exp.description}</td>
                      <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200">{exp.category}</span></td>
                      <td className="px-3 py-4 text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</td>
                      <td className="px-3 py-4 text-sm">
                        {exp.status === 'pago' ? <span className="text-green-600 dark:text-green-400 font-semibold">Pago</span> : 
                         <span className="text-yellow-600 dark:text-yellow-400 font-semibold">A Pagar {exp.dueDate ? `em ${exp.dueDate.toDate().toLocaleDateString('pt-BR')}` : ''}</span>
                        }
                      </td>
                      <td className="px-3 py-4 text-right text-sm space-x-2">
                        {exp.status === 'a_pagar' && <button onClick={() => handleMarkAsPaid(exp)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">Pagar</button>}
                        <button onClick={() => { setEditingExpense(exp); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Editar</button>
                        <button onClick={() => confirmDelete(exp)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">Deletar</button>
                      </td>
                    </tr>
                  )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <CustomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? 'Editar Despesa' : 'Adicionar Despesa'}
        actions={<><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-full">Cancelar</button><button onClick={handleSave} className={`px-4 py-2 text-white rounded-full ${primaryColor}`}>{editingExpense ? 'Salvar' : 'Adicionar'}</button></>}>
        <form className="space-y-4">
          <div><label className="block text-sm font-medium">Nome / Descrição da Despesa</label><input type="text" name="description" value={formData.description} onChange={handleChange} className={inputStyle} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium">Valor (R$)</label><input type="number" name="amount" value={formData.amount} onChange={handleChange} className={inputStyle} /></div>
            <div><label className="block text-sm font-medium">Data</label><input type="date" name="date" value={formData.date} onChange={handleChange} className={inputStyle} /></div>
          </div>
          <div><label className="block text-sm font-medium">Categoria</label><select name="category" value={formData.category} onChange={handleChange} className={inputStyle}>{expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-sm font-medium">Status:</label>
                <div className="flex rounded-lg shadow-sm mt-1"><button type="button" onClick={() => setFormData({...formData, status: 'pago'})} className={`w-full py-2 text-sm font-semibold rounded-l-lg transition ${formData.status === 'pago' ? 'bg-teal-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>✅ Pago</button><button type="button" onClick={() => setFormData({...formData, status: 'a_pagar'})} className={`w-full py-2 text-sm font-semibold rounded-r-lg transition ${formData.status === 'a_pagar' ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>⌛ A Pagar</button></div>
            </div>
             {formData.status === 'a_pagar' && (
                <div><label className="block text-sm font-medium">Vencimento:</label><input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={inputStyle} /></div>
             )}
          </div>
        </form>
      </CustomModal>
      <CustomModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão" size="max-w-md"
        actions={<><button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-full">Cancelar</button><button onClick={handleDelete} className={`px-4 py-2 text-white rounded-full ${dangerColor}`}>Excluir</button></>}>
        <p>Tem certeza que deseja excluir a despesa **{expenseToDelete?.description}**?</p>
      </CustomModal>
      {isRecurringModalOpen && <RecurringExpensesManagement isOpen={isRecurringModalOpen} onClose={() => setIsRecurringModalOpen(false)} db={db} userId={userId} showToast={showToast} recurringExpenses={recurringExpenses} onLaunch={(data) => { setIsRecurringModalOpen(false); openNewExpenseModal(data); }} expenseCategories={expenseCategories} />}
    </div>
  );
};

const ExpenseCategoryChart = ({ expenses }) => {
    const categoryData = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const expensesInMonth = expenses.filter(e => e.date.toDate() >= startOfMonth);

        const data = expensesInMonth.reduce((acc, expense) => {
            acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
            return acc;
        }, {});

        const total = Object.values(data).reduce((sum, v) => sum + v, 0);

        return Object.entries(data)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: total > 0 ? ((amount / total) * 100) : 0,
            }))
            .sort((a,b) => b.amount - a.amount);

    }, [expenses]);
    
    if (categoryData.length === 0) return null;

    const colors = ['bg-pink-500', 'bg-teal-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-indigo-500'];

    return (
         <div className={cardStyle}>
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Despesas do Mês por Categoria</h3>
            <div className="space-y-4">
                 <div className="flex h-6 rounded-full overflow-hidden shadow-inner">
                    {categoryData.map((item, index) => (
                        <div 
                            key={item.category} 
                            style={{ width: `${item.percentage}%` }}
                            className={`${colors[index % colors.length]}`}
                            title={`${item.category}: ${item.percentage.toFixed(1)}%`}
                        ></div>
                    ))}
                </div>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    {categoryData.map((item, index) => (
                        <li key={item.category} className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></span>
                            <span className="text-gray-700 dark:text-gray-300">{item.category}:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(item.amount)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const RecurringExpensesManagement = ({ isOpen, onClose, db, userId, showToast, recurringExpenses, onLaunch, expenseCategories }) => {
    
    const defaultForm = { description: '', amount: '', category: 'Matéria Prima' };
    const [formData, setFormData] = useState(defaultForm);
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAdd = async () => {
        if (!formData.description.trim() || parseFloat(formData.amount) <= 0) {
            showToast("Descrição e valor são obrigatórios", "error");
            return;
        }
        await addDoc(collection(db, getUserCollectionPath(userId, 'recurringExpenses')), {
            ...formData,
            amount: parseFloat(formData.amount)
        });
        setFormData(defaultForm);
        showToast("Despesa recorrente adicionada!", "success");
    };

    const handleDelete = async (id) => {
        await deleteDoc(doc(db, getUserCollectionPath(userId, 'recurringExpenses'), id));
        showToast("Despesa recorrente excluída", "success");
    };
    
    const handleLaunch = (recurring) => {
        onLaunch({
            description: recurring.description,
            amount: recurring.amount,
            category: recurring.category,
            status: 'a_pagar',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <CustomModal isOpen={isOpen} onClose={onClose} title="Gerenciar Despesas Recorrentes" size="max-w-2xl">
            <div className="space-y-4">
                 <div className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50 space-y-3">
                    <h4 className="font-semibold dark:text-gray-200">Adicionar Nova Despesa Recorrente</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <input type="text" name="description" placeholder="Descrição (Ex: Aluguel)" value={formData.description} onChange={handleChange} className={inputStyle + " p-2 text-sm"} />
                        <input type="number" name="amount" placeholder="Valor (R$)" value={formData.amount} onChange={handleChange} className={inputStyle + " p-2 text-sm"} />
                        <select name="category" value={formData.category} onChange={handleChange} className={inputStyle + " p-2 text-sm"}>{expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                    </div>
                    <button onClick={handleAdd} className={`w-full py-2 text-white font-semibold rounded-lg ${primaryColor}`}>Adicionar</button>
                </div>
                 <div className="max-h-64 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {recurringExpenses.map(item => (
                            <li key={item.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium dark:text-gray-200">{item.description} - {formatCurrency(item.amount)}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.category}</p>
                                </div>
                                <div className="space-x-2">
                                    <button onClick={() => handleLaunch(item)} className="px-3 py-1 text-sm text-white bg-blue-500 rounded-full hover:bg-blue-600">Lançar no Mês</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Excluir</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </CustomModal>
    );
};

// Componente: Barra de Progresso da Meta
const GoalProgressBar = ({ sales, expenses, monthlyGoal, showTitle = false }) => {
    const { currentValue, progressPercentage, goalType, goalAmount } = useMemo(() => {
        if (!monthlyGoal) return { currentValue: 0, progressPercentage: 0 };

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthSales = sales.filter(s => s.date.toDate() >= startOfMonth && s.status !== 'estornada');
        const monthExpenses = expenses.filter(e => e.date.toDate() >= startOfMonth && e.status === 'pago');

        let current = 0;
        if (monthlyGoal.type === 'revenue') {
            current = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);
        } else {
            const grossProfit = monthSales.reduce((sum, s) => sum + (s.profit || 0), 0);
            const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
            current = grossProfit - totalExpenses;
        }
        
        const percentage = monthlyGoal.amount > 0 ? (current / monthlyGoal.amount) * 100 : 0;

        return {
            currentValue: current,
            progressPercentage: Math.min(percentage, 100),
            goalType: monthlyGoal.type === 'revenue' ? 'Faturamento' : 'Lucro Líquido',
            goalAmount: monthlyGoal.amount,
        };
    }, [sales, expenses, monthlyGoal]);

    if (!monthlyGoal) {
        return (
            <div>
                 {showTitle && <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">🎯 Meta do Mês</h3>}
                 <p className="text-gray-500 dark:text-gray-400">Nenhuma meta definida para este mês. Vá para a aba 'Metas' para criar uma.</p>
            </div>
        );
    }
    
    return (
        <div>
            {showTitle && <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">🎯 Meta do Mês ({goalType})</h3>}
            <div className="flex justify-between items-end mb-1">
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(currentValue)}</span>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">de {formatCurrency(goalAmount)}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 shadow-inner">
                <div 
                    className="bg-purple-500 h-4 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }}
                ></div>
            </div>
            <p className="text-right text-sm text-gray-600 dark:text-gray-300 mt-1">{progressPercentage.toFixed(1)}% alcançado</p>
        </div>
    );
};


// Componente: Gerenciamento de Metas
const GoalsManagement = ({ db, userId, sales, expenses, allGoals, showToast }) => {
    const now = new Date();
    const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthGoal = useMemo(() => allGoals.find(g => g.id === currentMonthId), [allGoals, currentMonthId]);

    const [goalType, setGoalType] = useState('revenue');
    const [goalAmount, setGoalAmount] = useState('');

    const goalTypes = [
        { value: 'revenue', label: 'Faturamento (Receita Total)', format: formatCurrency },
        { value: 'netProfit', label: 'Lucro Líquido', format: formatCurrency },
        { value: 'salesCount', label: 'Número de Vendas', format: formatNumber },
        { value: 'itemsSold', label: 'Itens Vendidos', format: formatNumber },
        { value: 'averageTicket', label: 'Ticket Médio (R$)', format: formatCurrency }
    ];

    useEffect(() => {
        if(currentMonthGoal) {
            setGoalType(currentMonthGoal.type);
            setGoalAmount(currentMonthGoal.amount);
        } else {
            setGoalType('revenue');
            setGoalAmount('');
        }
    }, [currentMonthGoal]);

    const handleSaveGoal = async () => {
        const amount = parseFloat(goalAmount);
        if (!db || !userId || isNaN(amount) || amount <= 0) {
            showToast("Por favor, insira um valor de meta válido.", "error");
            return;
        }

        const goalRef = doc(db, getUserCollectionPath(userId, 'goals'), currentMonthId);

        try {
            await setDoc(goalRef, { type: goalType, amount });
            showToast("Meta salva com sucesso!", "success");
        } catch (error) {
            showToast("Erro ao salvar a meta.", "error");
            console.error("Erro ao salvar meta:", error);
        }
    };
    
    const calculatePerformance = (goal, allSales, allExpenses) => {
        if (!goal) return { achieved: 0, percentage: 0 };

        const [year, month] = goal.id.split('-').map(Number);
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);

        const monthSales = allSales.filter(s => {
            const saleDate = s.date.toDate();
            return saleDate >= startOfMonth && saleDate <= endOfMonth && s.status !== 'estornada';
        });
        const monthExpenses = allExpenses.filter(e => {
            const expenseDate = e.date.toDate();
            return expenseDate >= startOfMonth && expenseDate <= endOfMonth && e.status === 'pago';
        });

        let achievedValue = 0;
        const totalRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);

        switch (goal.type) {
            case 'revenue': achievedValue = totalRevenue; break;
            case 'netProfit':
                const grossProfit = monthSales.reduce((sum, s) => sum + (s.profit || 0), 0);
                const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
                achievedValue = grossProfit - totalExpenses;
                break;
            case 'salesCount': achievedValue = monthSales.length; break;
            case 'itemsSold': achievedValue = monthSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0); break;
            case 'averageTicket': achievedValue = monthSales.length > 0 ? totalRevenue / monthSales.length : 0; break;
            default: achievedValue = 0;
        }

        const percentage = goal.amount > 0 ? (achievedValue / goal.amount) * 100 : 0;
        
        return { achieved: achievedValue, percentage };
    };
    
    const historicalGoals = useMemo(() => {
        return allGoals
            .filter(g => g.id !== currentMonthId)
            .sort((a, b) => b.id.localeCompare(a.id)); // Sort by YYYY-MM descending
    }, [allGoals, currentMonthId]);


    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Metas e Objetivos</h2>
            <div className="grid lg:grid-cols-2 gap-6">
                <div className={cardStyle}>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Definir Meta para {new Date().toLocaleDateString('pt-BR', {month: 'long'})}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Meta</label>
                            <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className={inputStyle}>
                               {goalTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor da Meta</label>
                            <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} className={inputStyle} placeholder="Ex: 5000" />
                        </div>
                        <button onClick={handleSaveGoal} className={`w-full text-center p-3 rounded-full text-white font-bold ${primaryColor}`}>{currentMonthGoal ? 'Atualizar Meta' : 'Salvar Meta'}</button>
                    </div>
                </div>
                 <div className={cardStyle}>
                    <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Ritmo para Atingir a Meta</h3>
                    {currentMonthGoal ? <GoalPacingChart goal={currentMonthGoal} sales={sales} expenses={expenses} goalTypes={goalTypes} /> : <p className="text-center text-gray-500 dark:text-gray-400 py-10">Defina uma meta para ver o ritmo de progresso.</p>}
                </div>
            </div>
             <div className={cardStyle}>
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Histórico de Metas</h3>
                <div className="max-h-96 overflow-y-auto">
                     <ul className="space-y-3">
                        {historicalGoals.map(goal => {
                            const performance = calculatePerformance(goal, sales, expenses);
                            const goalConfig = goalTypes.find(gt => gt.value === goal.type) || { format: formatNumber };
                            const isAchieved = performance.percentage >= 100;
                            const [year, month] = goal.id.split('-');
                            const monthName = new Date(year, month-1, 1).toLocaleDateString('pt-BR', {month: 'long'});

                            return (
                                <li key={goal.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                                    <p className="font-bold text-gray-800 dark:text-gray-200 capitalize">{monthName} de {year}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Meta ({goalConfig.label}): {goalConfig.format(goal.amount)}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Atingido: <span className="font-semibold">{goalConfig.format(performance.achieved)}</span></p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${isAchieved ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {performance.percentage.toFixed(1)}% {isAchieved ? '✅' : '❌'}
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const GoalPacingChart = ({ goal, sales, expenses, goalTypes }) => {
    const data = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = now.getDate();

        const idealDailyValue = goal.amount / daysInMonth;
        const idealPath = Array.from({ length: daysInMonth }, (_, i) => idealDailyValue * (i + 1));
        
        const monthSales = sales.filter(s => s.date.toDate().getMonth() === month && s.date.toDate().getFullYear() === year && s.status !== 'estornada');
        const monthExpenses = expenses.filter(e => e.date.toDate().getMonth() === month && e.date.toDate().getFullYear() === year && e.status === 'pago');
        
        const dailyValues = Array(daysInMonth).fill(0);
        
        switch(goal.type) {
            case 'revenue':
            case 'averageTicket': // We calculate based on revenue, then divide
                monthSales.forEach(s => {
                    dailyValues[s.date.toDate().getDate() - 1] += s.totalAmount;
                });
                break;
            case 'netProfit':
                 monthSales.forEach(s => {
                    dailyValues[s.date.toDate().getDate() - 1] += s.profit || 0;
                });
                monthExpenses.forEach(e => {
                    dailyValues[e.date.toDate().getDate() - 1] -= e.amount;
                });
                break;
            case 'salesCount':
                 monthSales.forEach(s => {
                    dailyValues[s.date.toDate().getDate() - 1] += 1;
                });
                break;
            case 'itemsSold':
                 monthSales.forEach(s => {
                    const dayIndex = s.date.toDate().getDate() - 1;
                    dailyValues[dayIndex] += s.items.reduce((sum, i) => sum + i.quantity, 0);
                });
                break;
            default: break;
        }

        let cumulativeSalesCount = 0;
        const actualPath = dailyValues.map((sum => (value, index) => {
             sum += value;
             if (goal.type === 'averageTicket') {
                const salesUpToDay = monthSales.filter(s => s.date.toDate().getDate() <= index + 1);
                return salesUpToDay.length > 0 ? sum / salesUpToDay.length : 0;
             }
             return sum;
        })(0));

        return { idealPath, actualPath, daysInMonth, today };
    }, [goal, sales, expenses]);

    const { idealPath, actualPath, daysInMonth, today } = data;
    const maxValue = Math.max(...idealPath, ...actualPath, goal.amount);
    
    if (maxValue === 0) return <p>Sem dados para exibir.</p>;

    const width = 500;
    const height = 200;
    
    const toPathString = (pathData) => {
        return pathData.map((val, i) => `${(i / (daysInMonth - 1)) * width},${height - (val / maxValue) * height}`).join(' ');
    };

    const idealPoints = toPathString(idealPath);
    const actualPoints = toPathString(actualPath.slice(0, today));
    
    const goalConfig = goalTypes.find(gt => gt.value === goal.type);

    return (
         <div className="text-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Ideal Path */}
                <polyline
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    points={idealPoints}
                />
                {/* Actual Path */}
                <polyline
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="3"
                    points={actualPoints}
                />
            </svg>
            <div className="flex justify-center items-center space-x-4 text-sm mt-2">
                <div className="flex items-center"><span className="w-4 h-0.5 bg-pink-500 mr-2"></span> Realizado</div>
                <div className="flex items-center"><span className="w-4 h-0.5 bg-gray-300 border-t-2 border-dashed border-gray-300 mr-2"></span> Ideal</div>
            </div>
             <p className="text-sm mt-2">Valor atual: <strong className="text-pink-600 dark:text-pink-400">{goalConfig.format(actualPath[today - 1] || 0)}</strong></p>
        </div>
    );
};


// --- NOVOS COMPONENTES DE RELATÓRIO ---

const CashFlowChart = ({ sales, expenses }) => {
    const data = useMemo(() => {
        const inflow = sales.filter(s => s.paymentStatus === 'recebido' && s.status !== 'estornada').reduce((sum, s) => sum + s.totalAmount, 0);
        const outflow = expenses.filter(e => e.status === 'pago').reduce((sum, e) => sum + e.amount, 0);
        return { inflow, outflow, balance: inflow - outflow };
    }, [sales, expenses]);

    const maxValue = Math.max(data.inflow, data.outflow);

    return (
        <div className="space-y-4">
            <div className="flex justify-around items-end h-48">
                <div className="flex flex-col items-center">
                    <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(data.inflow)}</p>
                    <div className="w-16 bg-green-400 rounded-t-lg" style={{ height: `${maxValue > 0 ? (data.inflow / maxValue) * 150 : 0}px` }}></div>
                    <p className="text-sm font-medium">Entradas</p>
                </div>
                <div className="flex flex-col items-center">
                    <p className="font-bold text-red-600 dark:text-red-400">{formatCurrency(data.outflow)}</p>
                    <div className="w-16 bg-red-400 rounded-t-lg" style={{ height: `${maxValue > 0 ? (data.outflow / maxValue) * 150 : 0}px` }}></div>
                    <p className="text-sm font-medium">Saídas</p>
                </div>
            </div>
            <div className="text-center border-t dark:border-gray-700 pt-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo do Período</p>
                <p className={`text-2xl font-bold ${data.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(data.balance)}</p>
            </div>
        </div>
    );
};

const ProfitTrendChart = ({ sales, expenses, dateRange }) => {
    const trendData = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return [];

        const dailyData = new Map();
        const dayCursor = new Date(dateRange.start);
        while (dayCursor <= dateRange.end) {
            dailyData.set(dayCursor.toISOString().split('T')[0], 0);
            dayCursor.setDate(dayCursor.getDate() + 1);
        }

        sales.filter(s => s.status !== 'estornada').forEach(s => {
            const day = s.date.toDate().toISOString().split('T')[0];
            if (dailyData.has(day)) {
                dailyData.set(day, dailyData.get(day) + (s.profit || 0));
            }
        });
        expenses.forEach(e => {
            if (e.status !== 'pago') return;
            const day = e.date.toDate().toISOString().split('T')[0];
            if (dailyData.has(day)) {
                dailyData.set(day, dailyData.get(day) - e.amount);
            }
        });

        let cumulativeProfit = 0;
        return Array.from(dailyData.values()).map(dailyProfit => {
            cumulativeProfit += dailyProfit;
            return cumulativeProfit;
        });

    }, [sales, expenses, dateRange]);

    if (trendData.length === 0) return <p className="text-center text-gray-500 dark:text-gray-400">Selecione um período para ver a tendência.</p>;

    const max = Math.max(...trendData, 0);
    const min = Math.min(...trendData, 0);
    const range = max - min;
    const width = 500;
    const height = 200;

    const calculateY = (value) => {
        if (range === 0) {
            // If all values are the same (e.g., all 0), draw the line in the middle.
            return height / 2;
        }
        return height - ((value - min) / range) * height;
    };

    const toPathString = (data) => {
        if (data.length === 1) {
            const y = calculateY(data[0]);
            return `0,${y} ${width},${y}`; // Draw a horizontal line for a single point
        }
        return data.map((val, i) => `${(i / (data.length - 1)) * width},${calculateY(val)}`).join(' ');
    };
    
    const zeroLineY = calculateY(0);

    return (
        <div className="text-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                {/* Zero Line - only draw if it's within the view */}
                {(zeroLineY >= 0 && zeroLineY <= height) && (
                    <line x1="0" y1={zeroLineY} x2={width} y2={zeroLineY} stroke="#9ca3af" strokeWidth="1" strokeDasharray="4 4" />
                )}
                {/* Profit Trend Line */}
                <polyline fill="none" stroke="#10b981" strokeWidth="3" points={toPathString(trendData)} />
            </svg>
             <p className="text-sm mt-2">Lucro líquido acumulado no período.</p>
        </div>
    );
};


// --- Componente: Relatórios e Estatísticas (Reports) ---
const Reports = ({ sales, products, expenses, db, userId, showToast }) => {
  const [timeFilter, setTimeFilter] = useState('month'); 
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const { filteredSales, filteredExpenses, dateRange } = useMemo(() => {
    const now = new Date();
    let start, end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const validSales = sales.filter(s => s.status !== 'estornada');

    if (timeFilter === 'custom' && startDate && endDate) {
        start = getStartOfDay(new Date(startDate.replace(/-/g, '\/')));
        end = new Date(endDate.replace(/-/g, '\/'));
        end.setHours(23, 59, 59, 999);
    } else if (timeFilter === '30days') {
        start = new Date();
        start.setDate(now.getDate() - 30);
        start = getStartOfDay(start);
    } else if (timeFilter === 'month') {
        start = getStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (timeFilter === 'year') {
        start = getStartOfDay(new Date(now.getFullYear(), 0, 1));
    } else { // 'all'
        start = null;
    }

    const filterByDate = (items, sourceSales = false) => {
        const baseItems = sourceSales ? validSales : items;
        if (!start) return baseItems; 
        return baseItems.filter(i => {
            const itemDate = i.date.toDate();
            return itemDate >= start && itemDate <= end;
        });
    };

    return { 
        filteredSales: filterByDate(sales, true), 
        filteredExpenses: filterByDate(expenses),
        dateRange: { start, end }
    };
  }, [sales, expenses, timeFilter, startDate, endDate]);

  const getPreviousPeriod = (timeFilter, currentStart, currentEnd) => {
      const now = new Date(); let start, end;
      if (timeFilter === 'month') { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); } 
      else if (timeFilter === '30days') { start = new Date(); start.setDate(now.getDate() - 60); end = new Date(); end.setDate(now.getDate() - 30); } 
      else if (timeFilter === 'year') { start = new Date(now.getFullYear() - 1, 0, 1); end = new Date(now.getFullYear() - 1, 11, 31); } 
      else { return null; }
      return { start: getStartOfDay(start), end };
  };

  const calculateMetrics = (salesData, expensesData) => {
    const salesMetrics = salesData.reduce((acc, sale) => {
        acc.totalRevenue += sale.totalAmount;
        acc.totalSalesCount += 1;
        acc.grossProfit += sale.profit || 0;
        return acc;
    }, { totalRevenue: 0, grossProfit: 0, totalSalesCount: 0 });
    
    const paidExpensesData = expensesData.filter(e => e.status === 'pago');
    const totalExpenses = paidExpensesData.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = salesMetrics.grossProfit - totalExpenses;
    
    return { ...salesMetrics, totalExpenses, netProfit };
  };
  
  const periodComparison = useMemo(() => {
    const currentMetrics = calculateMetrics(filteredSales, filteredExpenses);
    const prevPeriodDates = getPreviousPeriod(timeFilter, dateRange.start, dateRange.end);
    if (!prevPeriodDates) return { current: currentMetrics, changes: null };

    const prevSales = sales.filter(s => s.status !== 'estornada' && s.date.toDate() >= prevPeriodDates.start && s.date.toDate() <= prevPeriodDates.end);
    const prevExpenses = expenses.filter(e => e.date.toDate() >= prevPeriodDates.start && e.date.toDate() <= prevPeriodDates.end);
    const previousMetrics = calculateMetrics(prevSales, prevExpenses);
    
    const calcChange = (c, p) => (p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / p) * 100);
    const changes = {
        revenue: calcChange(currentMetrics.totalRevenue, previousMetrics.totalRevenue),
        netProfit: calcChange(currentMetrics.netProfit, previousMetrics.netProfit),
        salesCount: calcChange(currentMetrics.totalSalesCount, previousMetrics.totalSalesCount),
    };
    return { current: currentMetrics, changes };
  }, [filteredSales, filteredExpenses, sales, expenses, timeFilter, dateRange]);

  const { totalRevenue, grossProfit, totalSalesCount, totalExpenses, netProfit } = periodComparison.current;

  const stockValueAnalysis = useMemo(() => {
    const allVariants = products.flatMap(p => p.variants || []);
    
    const totalStockCost = allVariants.reduce((sum, variant) => {
        return sum + (variant.costPrice * variant.quantity);
    }, 0);

    const totalStockValue = allVariants.reduce((sum, variant) => {
        return sum + (variant.salePrice * variant.quantity);
    }, 0);

    return { totalStockCost, totalStockValue };
  }, [products]);

  const pendingSales = useMemo(() => sales.filter(s => s.paymentStatus === 'a_receber' && s.status !== 'estornada').sort((a,b) => (a.dueDate || a.date).seconds - (b.dueDate || b.date).seconds), [sales]);
  
  const handleMarkAsPaid = async (saleId) => {
    await updateDoc(doc(db, getUserCollectionPath(userId, 'sales'), saleId), { paymentStatus: 'recebido' });
    showToast('Venda marcada como recebida!', 'success');
  };

  const detailedProductAnalysis = useMemo(() => {
    const allVariants = products.flatMap(p => (p.variants || []).map(v => ({...v, productId: p.id, productName: p.name, createdAt: p.createdAt })));
    
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const lastSaleMap = new Map(); // sku -> date
    sales.filter(s => s.status !== 'estornada').forEach(sale => sale.items.forEach(item => { 
        const d = sale.date.toDate(); 
        if (!lastSaleMap.has(item.sku) || d > lastSaleMap.get(item.sku)) lastSaleMap.set(item.sku, d);
    }));

    const slowMoving = allVariants.filter(v => (lastSaleMap.get(v.sku) || v.createdAt?.toDate()) < ninetyDaysAgo).slice(0, 5);
    const highMargin = allVariants.filter(v => v.salePrice > v.costPrice).map(v => ({ ...v, margin: v.salePrice - v.costPrice })).sort((a, b) => b.margin - a.margin).slice(0, 5);
    return { slowMoving, highMargin };
  }, [products, sales]);


  const filterOptions = [{ value: 'month', label: 'Este Mês' }, { value: '30days', label: 'Últimos 30 Dias' }, { value: 'year', label: 'Este Ano' }, { value: 'all', label: 'Todo o Período' }, { value: 'custom', label: 'Personalizado' }];
  const renderComparison = (change) => {
    if (change === null || isNaN(change)) return <span className="text-xs text-gray-400">s/ comp.</span>;
    const isPositive = change >= 0; const color = isPositive ? 'text-green-500' : 'text-red-500';
    return <span className={`text-sm font-bold ${color}`}>{isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span>;
  };
  
  const handleExportCSV = () => {
    const headers = ['Data', 'Tipo', 'Descrição', 'Valor', 'Status'];
    
    const salesRows = filteredSales.map(s => [s.date.toDate().toISOString(), 'Venda', `Venda para ${s.customerName || 'N/A'}`, s.totalAmount, s.paymentStatus]);
    const expensesRows = filteredExpenses.map(e => [e.date.toDate().toISOString(), 'Despesa', e.description, -e.amount, e.status]);

    const allRows = [...salesRows, ...expensesRows].sort((a, b) => new Date(a[0]) - new Date(b[0]));
    
    const csvContent = [
        headers.join(','),
        ...allRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'relatorio_mia_move.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exportação concluída!', 'success');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Relatórios e Análises</h2>
        <div className="flex items-center gap-2 flex-wrap">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className={inputStyle + ' w-48'}>{filterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            {timeFilter === 'custom' && (
                <>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle + ' w-40'} />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputStyle + ' w-40'} />
                </>
            )}
            <button onClick={handleExportCSV} className="px-4 py-3 text-sm font-semibold bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Exportar CSV</button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardStyle} border-l-4 border-pink-500`}><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Receita Total</p><p className="text-2xl font-bold text-pink-600 dark:text-pink-400 mt-1">{formatCurrency(totalRevenue)}</p>{periodComparison.changes && <div className="mt-1">{renderComparison(periodComparison.changes.revenue)}</div>}</div>
        <div className={`${cardStyle} border-l-4 border-teal-500`}><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro Bruto (Vendas)</p><p className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1">{formatCurrency(grossProfit)}</p></div>
        <div className={`${cardStyle} border-l-4 border-red-500`}><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Despesas (Pagas)</p><p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalExpenses)}</p></div>
        <div className={`${cardStyle} border-l-4 border-green-500 col-span-2 lg:col-span-1`}><p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro Líquido</p><p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(netProfit)}</p>{periodComparison.changes && <div className="mt-1">{renderComparison(periodComparison.changes.netProfit)}</div>}</div>
      </div>

       <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${cardStyle}`}><h3 className="text-xl font-semibold mb-4 dark:text-gray-200">📊 Fluxo de Caixa (Recebido vs. Pago)</h3><CashFlowChart sales={filteredSales} expenses={filteredExpenses} /></div>
          <div className={`${cardStyle}`}><h3 className="text-xl font-semibold mb-4 dark:text-gray-200">📈 Tendência de Lucro no Período</h3><ProfitTrendChart sales={filteredSales} expenses={filteredExpenses} dateRange={dateRange}/></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className={`${cardStyle}`}><h3 className="text-xl font-semibold mb-4 dark:text-gray-200">Desempenho por Dia da Semana</h3><WeeklySalesChart sales={filteredSales} /></div>
        <div className={`${cardStyle}`}><h3 className="text-xl font-semibold mb-4 dark:text-gray-200">Distribuição de Pagamentos</h3><PaymentDistributionChart sales={filteredSales} /></div>
      </div>
      
      <div className={cardStyle}>
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-200">🗓️ Contas a Receber (Geral) ({pendingSales.length})</h3>
        <div className="overflow-x-auto max-h-80"><table className="min-w-full divide-y dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vencimento</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Valor</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ação</th>
            </tr></thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y dark:divide-gray-700">{pendingSales.map(sale => {
                const dueDate = sale.dueDate ? new Date(sale.dueDate.replace(/-/g, '\/')) : sale.date.toDate();
                const isOverdue = dueDate < getStartOfDay(new Date());
                return (
                    <tr key={sale.id} className={isOverdue ? 'bg-red-50 dark:bg-red-900/30' : ''}>
                        <td className="px-3 py-4 text-sm dark:text-gray-300">{dueDate.toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-4 text-sm font-medium dark:text-gray-200">{sale.customerName || 'N/A'}</td>
                        <td className="px-3 py-4 text-sm font-bold text-yellow-600 dark:text-yellow-400">{formatCurrency(sale.totalAmount)}</td>
                        <td className="px-3 py-4 text-right"><button onClick={() => handleMarkAsPaid(sale.id)} className="px-3 py-1 text-xs text-white font-semibold rounded-full bg-green-500 hover:bg-green-600">Recebido</button></td>
                    </tr>
                )
            })}</tbody>
        </table></div>
      </div>
    </div>
  );
};

const CategoryManagement = ({ db, userId, showToast, categories, isOpen, onClose }) => {
    const [newCategoryName, setNewCategoryName] = useState('');

    const handleAddCategory = async () => {
        if (newCategoryName.trim() === '') return;
        const categoriesRef = collection(db, getUserCollectionPath(userId, 'categories'));
        await addDoc(categoriesRef, { name: newCategoryName.trim() });
        setNewCategoryName('');
        showToast('Categoria adicionada!', 'success');
    };
    
    const handleDeleteCategory = async (id) => {
        const productsRef = collection(db, getUserCollectionPath(userId, 'products'));
        const q = query(productsRef, where("categoryId", "==", id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            showToast('Não é possível excluir. Categoria em uso por produtos.', 'error');
            return;
        }

        const categoryRef = doc(db, getUserCollectionPath(userId, 'categories'), id);
        await deleteDoc(categoryRef);
        showToast('Categoria excluída!', 'success');
    };

    return (
         <CustomModal isOpen={isOpen} onClose={onClose} title="Gerenciar Categorias" size="max-w-md">
            <div className="space-y-4">
                <div className="flex space-x-2">
                    <input 
                        type="text" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome da nova categoria"
                        className={inputStyle}
                    />
                    <button onClick={handleAddCategory} className={`px-4 py-2 text-white font-semibold rounded-lg ${primaryColor}`}>Adicionar</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categories.map(cat => (
                            <li key={cat.id} className="py-2 flex justify-between items-center">
                                <span className="dark:text-gray-200">{cat.name}</span>
                                <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Excluir</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </CustomModal>
    );
};

// --- Componente: Gerenciamento de Defeitos (DefectsManagement) ---
const DefectsManagement = ({ db, userId, products, defectiveItems, showToast }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [defectDescription, setDefectDescription] = useState('');
    const [suggestedAction, setSuggestedAction] = useState('');
    const [itemToResolve, setItemToResolve] = useState(null);
    const [isResolving, setIsResolving] = useState(false);

    const availableVariants = useMemo(() => {
        return products.flatMap(p => 
            (p.variants || []).map(v => ({ ...v, productId: p.id, productName: p.name }))
        ).filter(v => 
            v.quantity > 0 && (
                v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                v.sku.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }, [products, searchTerm]);

    const openModal = () => {
        setIsModalOpen(true);
        setSelectedVariant(null);
        setDefectDescription('');
        setSuggestedAction('');
        setSearchTerm('');
    };

    const handleSaveDefective = async () => {
        if (!selectedVariant || !defectDescription.trim()) {
            showToast("Selecione um produto e descreva o defeito.", 'error');
            return;
        }

        const batch = writeBatch(db);
        const parentProduct = products.find(p => p.id === selectedVariant.productId);
        if (!parentProduct) {
            showToast("Produto original não encontrado.", 'error');
            return;
        }

        const productRef = doc(db, getUserCollectionPath(userId, 'products'), selectedVariant.productId);
        const variantIndex = parentProduct.variants.findIndex(v => v.sku === selectedVariant.sku);
        const oldQuantity = parentProduct.variants[variantIndex].quantity;
        const newQuantity = oldQuantity - 1;

        if (newQuantity < 0) {
            showToast("Estoque insuficiente para registrar o defeito.", 'error');
            return;
        }
        
        // 1. Update product stock
        const updatedVariants = [...parentProduct.variants];
        updatedVariants[variantIndex].quantity = newQuantity;
        batch.update(productRef, { variants: updatedVariants });

        // 2. Log stock movement
        const movementLog = {
            date: Timestamp.now(), productId: selectedVariant.productId, productName: selectedVariant.productName, variantSku: selectedVariant.sku, type: 'saida_defeito', quantityChange: 1, reason: `Defeito: ${defectDescription.substring(0, 30)}...`, oldQuantity, newQuantity
        };
        batch.set(doc(collection(db, getUserCollectionPath(userId, 'stockMovements'))), movementLog);

        // 3. Create defective item record
        const defectiveItemData = {
            ...selectedVariant,
            defectDescription,
            suggestedAction,
            registeredAt: Timestamp.now(),
            status: 'pendente'
        };
        batch.set(doc(collection(db, getUserCollectionPath(userId, 'defectiveItems'))), defectiveItemData);
        
        try {
            await batch.commit();
            showToast("Item defeituoso registrado com sucesso!", 'success');
            setIsModalOpen(false);
        } catch (error) {
            showToast("Erro ao registrar item defeituoso.", 'error');
            console.error("Error registering defective item:", error);
        }
    };
    
    const handleResolve = async () => {
        if (!itemToResolve) return;
        setIsResolving(true);
        try {
            await deleteDoc(doc(db, getUserCollectionPath(userId, 'defectiveItems'), itemToResolve.id));
            showToast("Item defeituoso resolvido e removido da lista.", "success");
        } catch (error) {
            showToast("Erro ao resolver o item.", "error");
        } finally {
            setItemToResolve(null);
            setIsResolving(false);
        }
    };

    const handleShareToWhatsApp = (item) => {
        const message = `*Relatório de Defeito - Mia Move*\n\n` +
                        `*Produto:* ${item.productName}\n` +
                        `*Variação:* ${item.size} - ${item.color}\n` +
                        `*SKU:* ${item.sku}\n\n` +
                        `*Defeito Descrito:*\n${item.defectDescription}\n\n` +
                        `*Ação Sugerida:*\n${item.suggestedAction || 'Nenhuma'}`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Controle de Defeitos</h2>
                <button onClick={openModal} className={`px-4 py-3 text-white font-semibold rounded-lg ${primaryColor} shadow-md`}>+ Registrar Defeito</button>
            </div>

            <div className={cardStyle}>
                <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Itens com Defeito ({defectiveItems.length})</h3>
                <div className="space-y-4">
                    {defectiveItems.map(item => (
                        <div key={item.id} className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                                <div>
                                    <p className="font-bold text-lg dark:text-gray-100">{item.productName} ({item.size} - {item.color})</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {item.sku} | Registrado em: {item.registeredAt.toDate().toLocaleDateString('pt-BR')}</p>
                                </div>
                                <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                                    <button onClick={() => handleShareToWhatsApp(item)} className="px-3 py-1 text-sm text-white font-semibold rounded-full bg-green-500 hover:bg-green-600 flex items-center space-x-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                        <span>WhatsApp</span>
                                    </button>
                                    <button onClick={() => setItemToResolve(item)} className={`px-3 py-1 text-sm text-white font-semibold rounded-full ${dangerColor}`}>Resolver</button>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t dark:border-gray-600 text-sm space-y-2">
                                <p><strong>Defeito:</strong> {item.defectDescription}</p>
                                <p><strong>Ação Sugerida:</strong> {item.suggestedAction || 'N/A'}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <CustomModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Item com Defeito" size="max-w-2xl"
                actions={<>
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-full">Cancelar</button>
                    <button onClick={handleSaveDefective} className={`px-4 py-2 text-white rounded-full ${primaryColor}`}>Registrar e Dar Baixa</button>
                </>}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">1. Encontre o Produto em Estoque</label>
                        <input type="text" placeholder="Buscar por nome ou SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle} />
                        <div className="max-h-40 overflow-y-auto mt-2 space-y-1 pr-2">
                            {searchTerm && availableVariants.map(v => (
                                <button key={v.sku} onClick={() => { setSelectedVariant(v); setSearchTerm(''); }} className="w-full text-left p-2 rounded-lg hover:bg-pink-100 dark:hover:bg-pink-900/40">
                                    {v.productName} ({v.size} - {v.color}) - Estoque: {v.quantity}
                                </button>
                            ))}
                        </div>
                    </div>
                    {selectedVariant && (
                        <div className="p-3 bg-teal-50 dark:bg-teal-900/40 rounded-lg">
                            <p className="font-semibold text-teal-800 dark:text-teal-200">Selecionado: {selectedVariant.productName} ({selectedVariant.size} - {selectedVariant.color})</p>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium">2. Descreva o Defeito</label>
                        <textarea value={defectDescription} onChange={e => setDefectDescription(e.target.value)} rows="3" className={inputStyle} placeholder="Ex: Costura solta na manga direita."></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">3. Ação Sugerida (Opcional)</label>
                        <input type="text" value={suggestedAction} onChange={e => setSuggestedAction(e.target.value)} className={inputStyle} placeholder="Ex: Trocar com fornecedor." />
                    </div>
                </div>
            </CustomModal>

            <CustomModal isOpen={!!itemToResolve} onClose={() => setItemToResolve(null)} title="Confirmar Resolução" size="max-w-md"
                actions={<>
                    <button onClick={() => setItemToResolve(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-full">Cancelar</button>
                    <button onClick={handleResolve} disabled={isResolving} className={`px-4 py-2 text-white rounded-full ${dangerColor} disabled:opacity-50`}>{isResolving ? "Resolvendo..." : "Confirmar e Remover"}</button>
                </>}>
                <p>Tem certeza que deseja marcar o item <strong>{itemToResolve?.productName} ({itemToResolve?.size} - {itemToResolve?.color})</strong> como resolvido?</p>
                <p className="text-sm text-gray-500 mt-2">Esta ação irá remover o item permanentemente da lista de defeitos.</p>
            </CustomModal>
        </div>
    );
};


// --- Componente: Consultor de IA (AIAdvisor) ---
const AIAdvisor = ({ sales, products, expenses, showToast }) => {
    const [isMarketingLoading, setIsMarketingLoading] = useState(false);
    const [isFinancialLoading, setIsFinancialLoading] = useState(false);
    const [marketingResponse, setMarketingResponse] = useState('');
    const [financialResponse, setFinancialResponse] = useState('');

    const callGeminiAPI = async (systemPrompt, userQuery) => {
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                 const errorBody = await response.text();
                 throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
            }
            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error("Resposta da IA está vazia ou em formato incorreto.");
            }
            return text;
        } catch (error) {
            console.error("Erro na chamada da API Gemini:", error);
            showToast("Erro ao contatar o consultor de IA.", "error");
            return null;
        }
    };

    const handleGetMarketingAdvice = async () => {
        setIsMarketingLoading(true);
        setMarketingResponse('');

        const systemPrompt = `Você é um especialista em marketing digital para pequenos negócios de moda feminina no Brasil. Sua tarefa é fornecer ideias criativas, práticas e de baixo custo. Use um tom amigável, direto e motivador. Formate sua resposta com títulos em negrito (usando asteriscos, ex: *Título*) e listas com hífens.`;

        const last30Days = new Date(); last30Days.setDate(last30Days.getDate() - 30);
        const salesInPeriod = sales.filter(s => s.date.toDate() >= last30Days && s.status !== 'estornada');
        const itemsSold = {};
        salesInPeriod.forEach(sale => sale.items.forEach(item => {
            itemsSold[item.sku] = (itemsSold[item.sku] || 0) + item.quantity;
        }));
        
        const allVariantsMap = new Map(products.flatMap(p => p.variants || []).map(v => [v.sku, { productName: p.name, ...v }]));
        const bestSellers = Object.entries(itemsSold)
            .map(([sku, quantity]) => ({ ...allVariantsMap.get(sku), quantitySold: quantity }))
            .filter(item => item.productName)
            .sort((a, b) => b.quantitySold - a.quantitySold)
            .slice(0, 3)
            .map(p => `${p.productName} (${p.size}, ${p.color})`);

        const productCategories = [...new Set(products.map(p => p.category))].filter(Boolean);

        const userQuery = `Analise os dados do meu negócio de moda feminina e me dê 3 ideias de marketing para os próximos 15 dias. Inclua sugestões de campanhas, cupons de desconto e posts para redes sociais.\n\nDados:\n- Meus produtos mais vendidos nos últimos 30 dias são: ${bestSellers.join(', ') || 'Nenhum'}.\n- Minhas categorias de produto são: ${productCategories.join(', ') || 'Nenhuma'}.\n\nSeja criativo e focado em resultados rápidos!`;

        const response = await callGeminiAPI(systemPrompt, userQuery);
        if (response) setMarketingResponse(response);
        setIsMarketingLoading(false);
    };

    const handleGetFinancialAdvice = async () => {
        setIsFinancialLoading(true);
        setFinancialResponse('');

        const systemPrompt = `Você é um consultor financeiro experiente, especializado em varejo de moda no Brasil. Sua tarefa é analisar os dados financeiros e fornecer uma avaliação sincera e construtiva sobre a saúde do negócio. Aponte 1 ponto forte, 1 ponto de atenção e 3 sugestões práticas e diretas para melhorar a lucratividade. Use uma linguagem clara e objetiva. Formate a resposta com títulos em negrito (usando asteriscos) e listas com hífens.`;
        
        const last30Days = new Date(); last30Days.setDate(last30Days.getDate() - 30);
        const salesInPeriod = sales.filter(s => s.date.toDate() >= last30Days && s.status !== 'estornada');
        const expensesInPeriod = expenses.filter(e => e.date.toDate() >= last30Days && e.status === 'pago');

        const totalRevenue = salesInPeriod.reduce((sum, s) => sum + s.totalAmount, 0);
        const grossProfit = salesInPeriod.reduce((sum, s) => sum + (s.profit || 0), 0);
        const totalExpenses = expensesInPeriod.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;
        const averageTicket = salesInPeriod.length > 0 ? totalRevenue / salesInPeriod.length : 0;
        
        const userQuery = `Analise os seguintes dados financeiros dos últimos 30 dias do meu negócio e me forneça sua consultoria. Seja direto e prático nas sugestões.\n\nDados Financeiros (Últimos 30 dias):\n- Receita Total: ${formatCurrency(totalRevenue)}\n- Lucro Bruto (apenas de vendas): ${formatCurrency(grossProfit)}\n- Total de Despesas Pagas: ${formatCurrency(totalExpenses)}\n- Lucro Líquido: ${formatCurrency(netProfit)}\n- Número de Vendas: ${salesInPeriod.length}\n- Ticket Médio por Venda: ${formatCurrency(averageTicket)}`;
        
        const response = await callGeminiAPI(systemPrompt, userQuery);
        if(response) setFinancialResponse(response);
        setIsFinancialLoading(false);
    };
    
     const renderAIResponse = (text) => {
        if (!text) return null;
        return text.split('\n').map((line, index) => {
            if (line.startsWith('*') && line.endsWith('*')) {
                return <p key={index} className="font-bold text-lg mt-4">{line.slice(1, -1)}</p>;
            }
            if (line.startsWith('- ')) {
                return <li key={index} className="ml-5 list-disc">{line.slice(2)}</li>;
            }
            return <p key={index}>{line}</p>;
        });
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Consultor - IA</h2>
                <p className="text-gray-500 dark:text-gray-400">Receba insights e sugestões personalizadas para o seu negócio.</p>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
                <div className={`${cardStyle} flex flex-col`}>
                    <h3 className="text-xl font-bold text-pink-600 dark:text-pink-400">💡 Assistente de Marketing</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 mb-4 flex-grow">Receba ideias para campanhas, cupons e estratégias para impulsionar suas vendas, com base nos seus produtos mais populares.</p>
                    <button onClick={handleGetMarketingAdvice} disabled={isMarketingLoading} className={`w-full text-center p-3 rounded-full text-white font-bold ${primaryColor} disabled:opacity-50`}>
                        {isMarketingLoading ? 'Gerando ideias...' : 'Gerar Ideias de Marketing'}
                    </button>
                    <div className="mt-6 border-t dark:border-gray-700 pt-4 min-h-[150px]">
                        {isMarketingLoading && <LoadingSpinner />}
                        {marketingResponse && <div>{renderAIResponse(marketingResponse)}</div>}
                    </div>
                </div>
                 <div className={`${cardStyle} flex flex-col`}>
                    <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">💰 Consultor Financeiro</h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 mb-4 flex-grow">Obtenha uma análise da saúde financeira do seu negócio e sugestões práticas para otimizar seus custos e aumentar os lucros.</p>
                    <button onClick={handleGetFinancialAdvice} disabled={isFinancialLoading} className={`w-full text-center p-3 rounded-full text-white font-bold ${secondaryColor} disabled:opacity-50`}>
                         {isFinancialLoading ? 'Analisando finanças...' : 'Analisar Minhas Finanças'}
                    </button>
                    <div className="mt-6 border-t dark:border-gray-700 pt-4 min-h-[150px]">
                        {isFinancialLoading && <LoadingSpinner />}
                        {financialResponse && <div>{renderAIResponse(financialResponse)}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal: App ---
const App = () => {
  const [theme, setTheme] = useState(localStorage.getItem('mia-move-theme') || 'light');
  const [activeTab, setActiveTab] = useState('Início');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [defectiveItems, setDefectiveItems] = useState([]);
  const [monthlyGoal, setMonthlyGoal] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [toast, setToast] = useState(null);
  const [launchRecurringData, setLaunchRecurringData] = useState(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('mia-move-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('mia-move-theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  useEffect(() => {
    if (!firebaseConfig) { 
        setUserId(localStorage.getItem('mia-move-fallback-uid') || crypto.randomUUID());
        setIsAuthReady(true);
        return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Usuário autenticado:", user.uid, "Anônimo:", user.isAnonymous);
            setCurrentUser(user);
            const sharedId = localStorage.getItem('mia-move-shared-uid');
            setUserId(sharedId || user.uid);
            setIsAuthReady(true);
        } else {
            console.log("Nenhum usuário. Tentando login anônimo...");
            signInAnonymously(auth).catch(error => {
                console.error("Falha no login anônimo:", error);
                showToast("Não foi possível iniciar uma sessão. Verifique sua conexão.", "error");
            });
        }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db || !userId) {
      setProducts([]); setSales([]); setExpenses([]); setCategories([]); setRecurringExpenses([]); setAllGoals([]); setDefectiveItems([]);
      return;
    };

    const createListener = (collectionName, setter) => {
      const q = query(collection(db, getUserCollectionPath(userId, collectionName)));
      return onSnapshot(q, (snapshot) => {
        setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => console.error(`Erro ao ouvir ${collectionName}:`, error));
    };

    const unsubProducts = createListener('products', setProducts);
    const unsubSales = createListener('sales', setSales);
    const unsubExpenses = createListener('expenses', setExpenses);
    const unsubCategories = createListener('categories', setCategories);
    const unsubRecurring = createListener('recurringExpenses', setRecurringExpenses);
    const unsubGoals = createListener('goals', setAllGoals);
    const unsubDefects = createListener('defectiveItems', setDefectiveItems);

    return () => { unsubProducts(); unsubSales(); unsubExpenses(); unsubCategories(); unsubRecurring(); unsubGoals(); unsubDefects(); };
  }, [db, userId]);

  useEffect(() => {
    const now = new Date();
    const monthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentGoal = allGoals.find(g => g.id === monthId);
    setMonthlyGoal(currentGoal || null);
  }, [allGoals]);
  
  const handleLaunchRecurring = (data) => {
      setLaunchRecurringData(data);
      setActiveTab('Despesas');
      setTimeout(() => setLaunchRecurringData(null), 100);
  }

  const handleSync = (newUid) => {
      localStorage.setItem('mia-move-shared-uid', newUid);
      setUserId(newUid);
      window.location.reload(); // Recarrega para garantir que todos os dados sejam atualizados
      showToast("Sincronizado! A página será recarregada.", "success");
  };

  const handleUnsync = () => {
      localStorage.removeItem('mia-move-shared-uid');
      if (currentUser) {
          setUserId(currentUser.uid);
      }
      window.location.reload();
      showToast("Sincronização removida. A página será recarregada.", "info");
  };

  const isSynced = useMemo(() => {
      if (!currentUser) return false;
      return userId !== currentUser.uid;
  }, [userId, currentUser]);

  const renderContent = () => {
    switch(activeTab) {
      case 'Início': return <Dashboard sales={sales} expenses={expenses} products={products} monthlyGoal={monthlyGoal} setActiveTab={setActiveTab} />;
      case 'Estoque': return <StockManagement db={db} userId={userId} products={products} showToast={showToast} categories={categories} />;
      case 'Vendas': return <SalesManagement db={db} userId={userId} products={products} sales={sales} showToast={showToast} />;
      case 'Despesas': return <ExpensesManagement db={db} userId={userId} expenses={expenses} showToast={showToast} recurringExpenses={recurringExpenses} onLaunchRecurring={launchRecurringData} />;
      case 'Metas': return <GoalsManagement db={db} userId={userId} sales={sales} expenses={expenses} allGoals={allGoals} showToast={showToast} />;
      case 'Relatórios': return <Reports sales={sales} products={products} expenses={expenses} db={db} userId={userId} showToast={showToast} />;
      case 'Defeitos': return <DefectsManagement db={db} userId={userId} products={products} defectiveItems={defectiveItems} showToast={showToast} />;
      case 'Consultor - IA': return <AIAdvisor sales={sales} products={products} expenses={expenses} showToast={showToast} />;
      default: return null;
    }
  };

  const tabs = ['Início', 'Estoque', 'Vendas', 'Despesas', 'Metas', 'Relatórios', 'Defeitos', 'Consultor - IA'];

  if (!isAuthReady || !userId) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
            <LoadingSpinner />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="p-4 flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-pink-600 tracking-wider">Mia Move <span className="text-teal-500 text-sm font-medium">Gestão</span></h1>
          <div className="flex items-center space-x-2 sm:space-x-4">
             {isSynced && (
                <div className="hidden sm:flex items-center p-2 bg-teal-100 dark:bg-teal-900/50 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600 dark:text-teal-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                    <span className="text-sm text-teal-800 dark:text-teal-200 ml-1 font-semibold">Sincronizado</span>
                </div>
             )}
            <button onClick={() => setIsSyncModalOpen(true)} title="Sincronizar Dispositivos" className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>
            </button>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
              {theme === 'light' ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> :
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              }
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6 sticky top-0 bg-gray-50 dark:bg-gray-900 z-20">
          <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base sm:text-lg transition ${activeTab === tab ? 'border-pink-500 text-pink-600 dark:border-pink-400 dark:text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}>
                {tab}
              </button>
            ))}
          </nav>
        </div>
        {userId && renderContent()}
      </main>
      
      {isSyncModalOpen && 
        <SyncModal 
            isOpen={isSyncModalOpen} 
            onClose={() => setIsSyncModalOpen(false)}
            showToast={showToast}
            onSync={handleSync}
            onUnsync={handleUnsync}
            currentUid={currentUser?.uid}
            isSynced={isSynced}
        />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
