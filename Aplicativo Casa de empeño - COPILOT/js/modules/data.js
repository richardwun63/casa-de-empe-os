// js/modules/data.js
import { formatDate, formatCurrency } from './utils.js';

console.log('Modulo data.js cargado.');

export const HOY_SIMULADO = '2025-04-27';

// Objeto para almacenar los datos filtrados actualmente (se actualiza desde el dashboard)
let currentFilters = {
    branch: null,
    analyst: null,
    serviceType: null, // 'Préstamo', 'Empeño', null para ambos
    dateRange: { start: null, end: null } // { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
};

let filteredDataCache = { services: null, expenses: null, clients: null, moneyTransfers: null };

export function setDashboardFilters(newFilters) {
    console.log("Actualizando filtros globales:", newFilters);
    const filtersChanged = currentFilters.branch !== newFilters.branch || currentFilters.analyst !== newFilters.analyst || currentFilters.serviceType !== newFilters.serviceType || currentFilters.dateRange?.start !== newFilters.dateRange?.start || currentFilters.dateRange?.end !== newFilters.dateRange?.end;
    if (filtersChanged) {
        currentFilters = { branch: null, analyst: null, serviceType: null, dateRange: { start: null, end: null }, ...newFilters };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(currentFilters.dateRange?.start)) { currentFilters.dateRange.start = null; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(currentFilters.dateRange?.end)) { currentFilters.dateRange.end = null; }
        filteredDataCache = { services: null, expenses: null, clients: null, moneyTransfers: null };
        console.log("Caché de datos filtrados invalidado debido a cambio de filtros.");
    } else { console.log("Filtros sin cambios, caché mantenido."); }
}
export function getCurrentFilters() { return { ...currentFilters }; }

function getFilteredData(dataArray, cacheKey, applyDateFilter = false, dateField = 'date') {
     if (filteredDataCache[cacheKey]) { console.log(`Usando caché para ${cacheKey}.`); return filteredDataCache[cacheKey]; }
     console.log(`Filtrando datos para: ${cacheKey} con filtros:`, currentFilters);
     const { branch, analyst, serviceType, dateRange } = currentFilters;
     const filtered = dataArray.filter(item => { const matchBranch = !branch || (item.branch && item.branch === branch); let matchAnalyst = !analyst; if (analyst === 'null') { matchAnalyst = item.analyst === null || item.analyst === undefined; } else if (analyst) { matchAnalyst = item.analyst === analyst; } const matchServiceType = cacheKey !== 'services' || !serviceType || item.type === serviceType; let matchDate = !applyDateFilter || (!dateRange?.start && !dateRange?.end); if (applyDateFilter && (dateRange?.start || dateRange?.end)) { const itemDate = item[dateField]; if (itemDate && /^\d{4}-\d{2}-\d{2}$/.test(itemDate)) { const matchStart = !dateRange.start || itemDate >= dateRange.start; const matchEnd = !dateRange.end || itemDate <= dateRange.end; matchDate = matchStart && matchEnd; } else { matchDate = false; } } return matchBranch && matchAnalyst && matchServiceType && matchDate; });
     console.log(`Resultado filtrado para ${cacheKey}: ${filtered.length} items.`); filteredDataCache[cacheKey] = filtered; return filtered;
}
// --- Datos Dummy ---
export let dummyData = {
    users: [
        { username: 'dueño', password: '123', role: 'Dueño', branch: null },
        { username: 'gerente', password: '123', role: 'Gerente General', branch: null },
        { username: 'supervisorA', password: '123', role: 'Supervisor', branch: 'Sucursal Centro' }, // Asignado
        { username: 'supervisorB', password: '123', role: 'Supervisor', branch: 'Sucursal Norte' },  // Asignado
        { username: 'analista1', password: '123', role: 'Analista', branch: 'Sucursal Centro' },
        { username: 'analista2', password: '123', role: 'Analista', branch: 'Sucursal Norte' },
        { username: 'analista3', password: '123', role: 'Analista', branch: 'Sucursal Centro' },
        { username: 'analista4', password: '123', role: 'Analista', branch: 'Sucursal Norte' },
        { username: 'tesorero1', password: '123', role: 'Tesorería', branch: 'Sucursal Centro' },
        { username: 'tesorero2', password: '123', role: 'Tesorería', branch: 'Sucursal Norte' },
    ],
    branches: [
                { id: 1, name: 'Sucursal Centro', address: 'Av. Principal 123, La Victoria, Lima', status: 'Activa', creationDate: '2024-01-15', capitalAsignado: 50000, patrimonioEstimado: 65000, deudaEstimada: 15000 },
        { id: 2, name: 'Sucursal Norte', address: 'Calle Norte 456, Los Olivos, Lima', status: 'Activa', creationDate: '2024-06-20', capitalAsignado: 45000, patrimonioEstimado: 58000, deudaEstimada: 13000 },
        { id: 3, name: 'Sucursal Sur (Inactiva)', address: 'Jr. Sur 789, Villa El Salvador, Lima', status: 'Inactiva', creationDate: '2024-11-01', capitalAsignado: 0, patrimonioEstimado: 0, deudaEstimada: 0 },
    ],
    clients: [
        { id: 101, name: 'Juan Perez Garcia', dni: '12345678', branch: 'Sucursal Centro', analyst: 'analista1', registeredDate: '2025-01-15', birthDate: '1985-03-20', address: 'Calle Falsa 123, La Victoria', phone: '987654321', facadePhotoUrl: 'images/fachada_101.jpg', dniPhotoUrl: 'images/dni_101.jpg', plusCode: '57V4PQR8+2X', paymentComments: ['Pago adelantado Feb.', 'Pago puntual Mar.'], supplyPhotoUrl: 'images/recibo_101.jpg' },
        { id: 102, name: 'Maria Garcia Lopez', dni: '87654321', branch: 'Sucursal Norte', analyst: 'analista2', registeredDate: '2025-02-10', birthDate: '1992-11-05', address: 'Av. Sol 456, Los Olivos', phone: '912345678', facadePhotoUrl: 'images/fachada_102.jpg', dniPhotoUrl: 'images/dni_102.jpg', plusCode: '7789ABC1+YZ', paymentComments: [], supplyPhotoUrl: null },
        { id: 103, name: 'Carlos Mendoza Diaz', dni: '11223344', branch: 'Sucursal Centro', analyst: 'analista1', registeredDate: '2025-03-05', birthDate: '1978-07-10', address: 'Jr. Luna 789, Cercado de Lima', phone: '998877665', facadePhotoUrl: null, dniPhotoUrl: 'images/dni_103.jpg', plusCode: '57V4XVV5+FG', paymentComments: ['Retraso leve Abril'], supplyPhotoUrl: 'images/recibo_103.pdf' },
        { id: 104, name: 'Ana Torres Silva', dni: '44556677', branch: 'Sucursal Centro', analyst: 'analista3', registeredDate: '2025-03-20', birthDate: '1995-01-25', address: 'Psj. Estrella 101, Callao', phone: '965432109', facadePhotoUrl: 'images/fachada_104.jpg', dniPhotoUrl: 'images/dni_104.jpg', plusCode: '57W6ABCD+EF', paymentComments: [], supplyPhotoUrl: 'images/recibo_104.jpg' },
        { id: 105, name: 'Luis Chavez Rojas', dni: '22446688', branch: 'Sucursal Norte', analyst: 'analista2', registeredDate: '2025-04-01', birthDate: '1980-09-30', address: 'Urb. Las Flores Mz A Lote 5, SMP', phone: '954321098', facadePhotoUrl: 'images/fachada_105.jpg', dniPhotoUrl: 'images/dni_105.jpg', plusCode: '7789XYZ7+89', paymentComments: ['Cliente requiere seguimiento cercano', 'Pago con dificultad Mar.'], supplyPhotoUrl: 'images/recibo_105.jpg' },
        { id: 106, name: 'Sofia Vargas Luna', dni: '77889900', branch: 'Sucursal Centro', analyst: 'analista3', registeredDate: '2025-04-10', birthDate: '1998-02-14', address: 'Av. Aviación 234, San Borja', phone: '911223344', facadePhotoUrl: null, dniPhotoUrl: 'images/dni_106.jpg', plusCode: null, paymentComments: [], supplyPhotoUrl: 'images/recibo_106.pdf' },
        { id: 107, name: 'Pedro Ramirez Soto', dni: '66554433', branch: 'Sucursal Norte', analyst: 'analista4', registeredDate: '2025-04-20', birthDate: '1975-12-01', address: 'Calle Mercurio 987, Comas', phone: '933445566', facadePhotoUrl: 'images/fachada_107.jpg', dniPhotoUrl: 'images/dni_107.jpg', plusCode: '7788WXYZ+12', paymentComments: ['Primer préstamo'], supplyPhotoUrl: 'images/recibo_107.jpg' },
        { id: 108, name: 'Elena Flores Quispe', dni: '10101010', branch: 'Sucursal Centro', analyst: 'analista1', registeredDate: '2025-04-22', birthDate: '1990-05-15', address: 'Calle Sol 123', phone: '910101010', facadePhotoUrl: null, dniPhotoUrl: null, plusCode: null, paymentComments: [], supplyPhotoUrl: null },
        { id: 109, name: 'Mario Casas Paredes', dni: '20202020', branch: 'Sucursal Norte', analyst: 'analista2', registeredDate: '2025-04-25', birthDate: '1988-10-10', address: 'Av Luna 456', phone: '920202020', facadePhotoUrl: 'images/fachada_109.jpg', dniPhotoUrl: 'images/dni_109.jpg', plusCode: null, paymentComments: [], supplyPhotoUrl: 'images/recibo_109.jpg' },
    ],
    // Servicios: Añadidos campos para soportar nuevos flujos
    services: [
         // Ejemplo Préstamo
         { id: 1, type: 'Préstamo', clientId: 101, amount: 500, status: 'Pagado', date: '2025-01-15', approvalDate: '2025-01-16', branch: 'Sucursal Centro', analyst: 'analista1', nextPayment: null, disbursementDate: '2025-01-16', disbursementMethod: 'Efectivo', lastPaymentDate: '2025-04-10', lastPaymentAmount: 170, interestRate: 10.5, totalInterest: 75, paymentType: 'Mensual', numInstallments: 3, installmentAmount: 191.67, guarantorId: null, guarantorRelationship: null, rejectionReason: null, documents: { facadePhoto: 'fachada_101.jpg', dniPhoto: 'dni_101.jpg', promissoryNote: 'pagare_1.pdf', declaration: 'dj_1.pdf', commitment: 'acta_1.pdf', disbursementVoucher: 'voucher_des_1.pdf', plusCodeProvided: true, supplyPhotoUrl: 'recibo_101.jpg' },
          // NUEVO: Historial de pagos y plan de pagos
          payments: [
            { date: '2025-02-16', amount: 150, method: 'Efectivo', notes: 'Pago 1' },
            { date: '2025-03-16', amount: 180, method: 'Efectivo', notes: 'Pago 2' },
            { date: '2025-04-10', amount: 170, method: 'Yape', notes: 'Pago final' }
          ],
          paymentPlan: [
            { dueDate: '2025-02-16', amount: 191.67, paid: true },
            { dueDate: '2025-03-16', amount: 191.67, paid: true },
            { dueDate: '2025-04-16', amount: 191.67, paid: false }
          ]
        },
        // Ejemplo Empeño
        { id: 4, type: 'Empeño', clientId: 101, 
            items: [
                { id: 'i1', quantity: 1, article: 'Reloj Rolex Oro', brand: 'Rolex', model: 'Submariner', serial: 'SNX123', invoicePhoto: null, photos: ['rolex1.jpg', 'rolex2.jpg'], observation: 'Ligero desgaste', itemStatus: 'Bueno', valuation: 3000 }
            ], 
            vehicleDetails: null, 
            totalValuation: 3000, 
            pawnPercentage: 50, 
            amount: 1500, 
            interestCategory: 'Joyas', 
            interestRatePawn: 12.0, 
            totalInterest: 360, 
            paymentType: 'Mensual', 
            numInstallments: 2, 
            installmentAmount: 930, 
            status: 'Moroso', date: '2025-03-10', approvalDate: '2025-03-11', branch: 'Sucursal Centro', analyst: 'analista1', nextPayment: '2025-04-08', disbursementDate: '2025-03-11', disbursementMethod: 'Efectivo', lastPaymentAttemptDate: '2025-04-20', 
            documents: { facadePhoto: 'fachada_101.jpg', dniPhoto: 'dni_101.jpg', articlePhoto: 'rolex1.jpg, rolex2.jpg', 
                articlesCombinedPhoto: 'reloj_items.jpg', 
                promissoryNote: 'pagare_4.pdf', declaration: 'dj_4.pdf', commitment: 'acta_4.pdf', disbursementVoucher: 'voucher_des_4.pdf', plusCodeProvided: true, supplyPhotoUrl: 'recibo_101.jpg' },
            // NUEVO: Historial de pagos y plan de pagos
            payments: [
              { date: '2025-03-20', amount: 930, method: 'Efectivo', notes: 'Pago 1' }
            ],
            paymentPlan: [
              { dueDate: '2025-03-20', amount: 930, paid: true },
              { dueDate: '2025-04-20', amount: 930, paid: false }
            ]
        },
        { id: 9, type: 'Préstamo', clientId: 101, amount: 1000, status: 'Aprobado', date: '2025-04-22', approvalDate: '2025-04-27', branch: 'Sucursal Centro', analyst: 'analista1', nextPayment: null, /* term: 6, */ disbursementDate: null, interestRate: 10.5, totalInterest: 630, paymentType: 'Mensual', numInstallments: 6, installmentAmount: 271.67, documents: { facadePhoto: 'fachada_101.jpg', dniPhoto: 'dni_101.jpg', promissoryNote: 'pagare_9.pdf', declaration: 'dj_9.pdf', commitment: 'acta_9.pdf', disbursementVoucher: null, plusCodeProvided: true, supplyPhotoUrl: 'recibo_101.jpg' } },
        { id: 2, type: 'Empeño', clientId: 102, items: [{ id: 'i1', quantity: 1, article: 'Laptop HP Core i5', brand: 'HP', model: 'Pavilion', serial: 'HPSN456', invoicePhoto: null, photos: ['laptop_hp.jpg'], observation: '', itemStatus: 'Bueno', valuation: 1800 }], vehicleDetails: null, totalValuation: 1800, pawnPercentage: 50, amount: 900, interestCategory: 'Electrónicos', interestRatePawn: 11.0, totalInterest: 396, paymentType: 'Mensual', numInstallments: 4, installmentAmount: 324, status: 'Por Cobrar', date: '2025-02-15', approvalDate: '2025-02-16', branch: 'Sucursal Norte', analyst: 'analista2', nextPayment: '2025-05-15', /* term: 4, */ disbursementDate: '2025-02-16', disbursementMethod: 'Transferencia', documents: { facadePhoto: 'fachada_102.jpg', dniPhoto: 'dni_102.jpg', articlePhoto: 'laptop_hp.jpg', articlesCombinedPhoto: null, promissoryNote: 'pagare_2.pdf', declaration: 'dj_2.pdf', commitment: 'acta_2.pdf', disbursementVoucher: 'voucher_des_2.pdf', plusCodeProvided: true, supplyPhotoUrl: null } },
        { id: 10, type: 'Empeño', clientId: 102, items: [{ id: 'i1', quantity: 1, article: 'Celular Samsung S23', brand: 'Samsung', model: 'S23', serial: 'SAMSN789', invoicePhoto: null, photos: ['samsung_s23.jpg'], observation: 'Pantalla ok', itemStatus: 'Bueno', valuation: 1500 }], vehicleDetails: null, totalValuation: 1500, pawnPercentage: 46.67, amount: 700.05, interestCategory: 'Electrónicos', interestRatePawn: 15.0, totalInterest: 315.02, paymentType: 'Mensual', numInstallments: 3, installmentAmount: 338.36, status: 'Pendiente', date: '2025-04-23', approvalDate: null, branch: 'Sucursal Norte', analyst: 'analista2', nextPayment: null, /* term: 3, */ disbursementDate: null, documents: {facadePhoto: 'fachada_102.jpg', dniPhoto: 'dni_102.jpg', articlePhoto: 'samsung_s23.jpg', articlesCombinedPhoto: null, promissoryNote: null, declaration: null, commitment: null, disbursementVoucher: null, plusCodeProvided: true, supplyPhotoUrl: null } },
        { id: 12, type: 'Préstamo', clientId: 106, amount: 600, status: 'Verificado', date: '2025-04-21', approvalDate: null, branch: 'Sucursal Centro', analyst: 'analista3', nextPayment: null, /* term: 4, */ disbursementDate: null, interestRate: 10.5, totalInterest: 252, paymentType: 'Mensual', numInstallments: 4, installmentAmount: 213, documents: {facadePhoto: 'fachada_106.jpg', dniPhoto: 'dni_106.jpg', promissoryNote: 'pagare_12.pdf', declaration: 'dj_12.pdf', commitment: 'acta_12.pdf', plusCodeProvided: true, supplyPhotoUrl: 'images/recibo_106.pdf'} },
        { id: 13, type: 'Préstamo', clientId: 107, amount: 1500, status: 'Pendiente', date: '2025-04-23', approvalDate: null, branch: 'Sucursal Norte', analyst: 'analista4', nextPayment: null, /* term: 12, */ disbursementDate: null, interestRate: 10.5, totalInterest: 1890, paymentType: 'Mensual', numInstallments: 12, installmentAmount: 282.5, documents: { facadePhoto: 'fachada_107.jpg', dniPhoto: 'dni_107.jpg', plusCodeProvided: true, supplyPhotoUrl: 'images/recibo_107.jpg'} },
        { id: 14, type: 'Préstamo', clientId: 108, amount: 750, status: 'Desembolsado', date: '2025-04-22', approvalDate: '2025-04-22', branch: 'Sucursal Centro', analyst: 'analista1', nextPayment: '2025-05-22', /* term: 3, */ disbursementDate: '2025-04-22', disbursementMethod: 'Efectivo', interestRate: 10.5, totalInterest: 236.25, paymentType: 'Mensual', numInstallments: 3, installmentAmount: 328.75, documents: {facadePhoto: null, dniPhoto: null, promissoryNote: 'pagare_14.pdf', declaration: null, commitment: null, disbursementVoucher: 'voucher_des_14.pdf', plusCodeProvided: false, supplyPhotoUrl: null } },
        { id: 15, type: 'Empeño', clientId: 109, items: [{ id: 'i1', quantity: 1, article: 'Tablet Lenovo', brand: 'Lenovo', model: 'Tab M10', serial: 'LENTAB001', invoicePhoto: null, photos: ['tablet_lenovo.jpg'], observation: '', itemStatus: 'Regular', valuation: 600 }], vehicleDetails: null, totalValuation: 600, pawnPercentage: 50, amount: 300, interestCategory: 'Electrónicos', interestRatePawn: 14.0, totalInterest: 84, paymentType: 'Mensual', numInstallments: 2, installmentAmount: 192, status: 'Pendiente', date: '2025-04-26', approvalDate: null, branch: 'Sucursal Norte', analyst: 'analista2', nextPayment: null, /* term: 2, */ disbursementDate: null, documents: {facadePhoto: 'fachada_109.jpg', dniPhoto: 'dni_109.jpg', articlePhoto: 'tablet_lenovo.jpg', articlesCombinedPhoto: 'tablet_items.jpg', promissoryNote: null, declaration: null, commitment: null, disbursementVoucher: null, plusCodeProvided: true, supplyPhotoUrl: 'images/recibo_109.jpg' } },
        { id: 17, type: 'Préstamo', clientId: 104, amount: 900, status: 'Pendiente', date: '2025-04-27', approvalDate: null, branch: 'Sucursal Centro', analyst: 'analista3', nextPayment: null, /* term: 5, */ disbursementDate: null, interestRate: 10.5, totalInterest: 472.5, paymentType: 'Mensual', numInstallments: 5, installmentAmount: 274.5, documents: { facadePhoto: 'fachada_104.jpg', dniPhoto: 'dni_104.jpg', promissoryNote: null, declaration: null, commitment: null, disbursementVoucher: null, plusCodeProvided: true, supplyPhotoUrl: 'images/recibo_104.jpg' } },
        //... añadir más ejemplos si es necesario
    ],
    expenses: [
        { id: 1, date: '2025-04-19', type: 'Transporte', description: 'Movilidad Analista 1', amount: 15.00, analyst: 'analista1', branch: 'Sucursal Centro', voucherFile: 'voucher_trans_a1_1904.jpg' }, 
        { id: 2, date: '2025-04-18', type: 'Útiles Oficina', description: 'Papel Bond A4', amount: 45.50, analyst: null, branch: 'Sucursal Centro', voucherFile: 'factura_papel_1804.pdf' }, 
        { id: 3, date: '2025-04-19', type: 'Comida', description: 'Almuerzo Analista 2', amount: 12.00, analyst: 'analista2', branch: 'Sucursal Norte', voucherFile: null }, 
        { id: 4, date: '2025-04-20', type: 'Transporte', description: 'Taxi reunión cliente', amount: 25.00, analyst: 'analista3', branch: 'Sucursal Centro', voucherFile: 'recibo_taxi_2004.png' }, 
        { id: 5, date: '2025-04-20', type: 'Servicios', description: 'Pago Luz Oficina Norte', amount: 150.00, analyst: null, branch: 'Sucursal Norte', voucherFile: 'recibo_luz_norte_abr.pdf' }, 
        { id: 6, date: '2025-04-22', type: 'Transporte', description: 'Movilidad Analista 2', amount: 18.00, analyst: 'analista2', branch: 'Sucursal Norte', voucherFile: null }, 
        { id: 7, date: '2025-04-23', type: 'Comida', description: 'Almuerzo Analista 1', amount: 13.50, analyst: 'analista1', branch: 'Sucursal Centro', voucherFile: 'boleta_almuerzo_a1_2304.jpg' }, 
        { id: 8, date: '2025-04-23', type: 'Marketing', description: 'Volantes Publicitarios', amount: 80.00, analyst: null, branch: 'Sucursal Centro', voucherFile: 'factura_volantes_2304.pdf' }, 
        { id: 9, date: '2025-04-25', type: 'Transporte', description: 'Pasajes Analista 4', amount: 10.00, analyst: 'analista4', branch: 'Sucursal Norte', voucherFile: null }, 
        { id: 10, date: '2025-04-26', type: 'Reparaciones', description: 'Arreglo puerta oficina', amount: 120.00, analyst: null, branch: 'Sucursal Centro', voucherFile: 'factura_reparacion_2604.pdf' }, 
        { id: 11, date: '2025-04-27', type: 'Comida', description: 'Almuerzo Analista 4', amount: 15.00, analyst: 'analista4', branch: 'Sucursal Norte', voucherFile: null },
    ],
   moneyTransfers: [
        { id: 1001, date: '2025-04-19', type: 'given', treasuryUser: 'tesorero1', analyst: 'analista1', amount: 200.00, proofFile: 'foto_entrega_a1_1904.jpg', notes: 'Capital para ruta diaria' }, 
        { id: 1002, date: '2025-04-19', type: 'received', treasuryUser: 'tesorero1', analyst: 'analista1', amount: 185.50, method: 'Efectivo', proofFile: 'foto_recepcion_a1_1904.jpg', notes: 'Cuadre final del día 19' }, 
        { id: 1003, date: '2025-04-20', type: 'given', treasuryUser: 'tesorero2', analyst: 'analista2', amount: 300.00, proofFile: 'foto_entrega_a2_2004.jpg', notes: 'Adelanto semana' }, 
        { id: 1004, date: '2025-04-22', type: 'received', treasuryUser: 'tesorero2', analyst: 'analista2', amount: 250.00, method: 'Efectivo Cuadre', proofFile: null, notes: 'Liquidación ruta 22/04' }, 
        { id: 1005, date: '2025-04-23', type: 'given', treasuryUser: 'tesorero1', analyst: 'analista3', amount: 150.00, proofFile: 'foto_entrega_a3_2304.jpg', notes: 'Capital ruta 23/04' }, 
        { id: 1006, date: '2025-04-25', type: 'given', treasuryUser: 'tesorero2', analyst: 'analista4', amount: 100.00, proofFile: 'foto_entrega_a4_2304.jpg', notes: 'Capital inicial ruta 25/04' }, 
        { id: 1007, date: '2025-04-26', type: 'received', treasuryUser: 'tesorero1', analyst: 'analista1', amount: 150.00, method: 'Yape Cobranza', proofFile: 'captura_yape_a1_2304.png', notes: 'Cobranza Yape día 26' }, 
        { id: 1008, date: '2025-04-27', type: 'given', treasuryUser: 'tesorero1', analyst: 'analista1', amount: 50.00, proofFile: null, notes: 'Adicional ruta 27/04' },
    ],
    // Simulación estado de caja por analista
    cashBoxStatus: {
        // 'analistaUsername': { isOpen: false, lastOpenDate: null, openingBalance: 0, cashIn: 0, cashOut: 0, closingBalance: 0, lastCloseDate: null, discrepancy: 0, discrepancyNotes: null }
        'analista1': { isOpen: false, lastOpenDate: '2025-04-26', openingBalance: 50, cashIn: 150, cashOut: 185.5, closingBalance: 14.5, lastCloseDate: '2025-04-26', discrepancy: 0, discrepancyNotes: null },
        'analista2': { isOpen: true, lastOpenDate: '2025-04-27', openingBalance: 100, cashIn: 0, cashOut: 0, closingBalance: 0, lastCloseDate: '2025-04-26', discrepancy: 0, discrepancyNotes: null },
        //... otros analistas
    },
     // Simulación de solicitudes de egreso pendientes
     expenseRequests: [
        // { id: erq1, date: 'YYYY-MM-DD', analyst: '...', branch: '...', concept: '...', provider: '...', amount: ..., status: 'Pendiente/Aprobado/Rechazado', voucherFile: '...', series: '...', number: '...', observations: '...'}
     ],
     // Simulación de datos de bóveda
     vault: [
        {
            reportNumber: 'R-001',
            id: 1,
            date: '2025-04-25',
            cashBox: 'Caja Principal',
            status: 'Cerrado',
            branch: 'Sucursal Centro',
            user: 'tesorero1',
            initialBalance: 10000,
            bills: 'S/ 100 x 50, S/ 50 x 40',
            payments: 1200,
            companyPayments: 300,
            incomes: 2000,
            totalIncomes: 3500,
            disbursements: 1000,
            expenses: 500,
            totalExpenses: 1500,
            missing: 0,
            surplus: 0,
            closingBalance: 12000,
            closing: '2025-04-25 18:00',
            bankCompanyPayments: 200
        },
        {
            reportNumber: 'R-002',
            id: 2,
            date: '2025-04-26',
            cashBox: 'Caja Principal',
            status: 'Abierto',
            branch: 'Sucursal Norte',
            user: 'tesorero2',
            initialBalance: 8000,
            bills: 'S/ 100 x 30, S/ 50 x 60',
            payments: 900,
            companyPayments: 100,
            incomes: 1500,
            totalIncomes: 2500,
            disbursements: 700,
            expenses: 400,
            totalExpenses: 1100,
            missing: 0,
            surplus: 50,
            closingBalance: 9450,
            closing: '',
            bankCompanyPayments: 100
        }
    ],
     kpis: {
        getClientPaymentStatusInfo: (clientId) => { 
            const services = dummyData.services.filter(s => s.clientId === clientId && ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)); 
            if (services.length === 0) { 
                return { 
                    status: 'al-dia', 
                    daysOverdue: 0, 
                    statusText: 'Sin Deuda Activa', 
                    rowClass: '' }; 
                } 
                services.sort((a, b) => { 
                    const dateA = a.nextPayment ? new Date(a.nextPayment + 'T00:00:00Z').getTime() : Infinity; 
                    const dateB = b.nextPayment ? new Date(b.nextPayment + 'T00:00:00Z').getTime() : Infinity; 
                    if (isNaN(dateA)) 
                        return 1; 
                    if (isNaN(dateB)) 
                        return -1; 
                    return dateA - dateB; 
                }
            ); 
            const mostDueService = services[0]; 
            if (!mostDueService || !mostDueService.nextPayment || !/^\d{4}-\d{2}-\d{2}$/.test(mostDueService.nextPayment)) { 
                console.warn(`Cliente ${clientId}, Servicio ${mostDueService?.id}: Fecha próximo pago inválida (${mostDueService?.nextPayment}).`); 
                return { 
                    status: 'error', daysOverdue: 0, statusText: 'Error Fecha', rowClass: '' 
                }; 
            } 
            const nextPaymentDate = new Date(mostDueService.nextPayment + 'T00:00:00Z'); 
            const today = new Date(HOY_SIMULADO + 'T00:00:00Z'); 
            if (isNaN(nextPaymentDate.getTime())) { 
                console.warn(`Cliente ${clientId}, Servicio ${mostDueService.id}: Error al parsear fecha próximo pago ${mostDueService.nextPayment}.`); 
                return { 
                    status: 'error', daysOverdue: 0, statusText: 'Error Fecha', rowClass: '' 
                }; 
            } 
            if (nextPaymentDate > today) { 
                const diffTimeFuture = nextPaymentDate - today; 
                const diffDaysFuture = Math.ceil(diffTimeFuture / (1000 * 60 * 60 * 24)); 
                return { 
                    status: 'al-dia', daysOverdue: 0, statusText: `Vence en ${diffDaysFuture}d`, rowClass: '' 
                }; 
            } 
            const diffTimePast = today - nextPaymentDate; 
            const diffDays = Math.max(0, Math.floor(diffTimePast / (1000 * 60 * 60 * 24))); 
            let status = 'al-dia'; 
            let statusText = 'Vence Hoy'; 
            let rowClass = ''; 
            if (diffDays === 0) { 
                status = 'al-dia'; 
                statusText = 'Vence Hoy'; 
                rowClass = ''; 
            } else if (diffDays >= 1 && diffDays <= 5) { 
                status = 'normal'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-normal'; 
            } else if (diffDays >= 6 && diffDays <= 10) { 
                status = 'cpp'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-cpp'; 
            } else if (diffDays >= 11 && diffDays <= 15) { 
                status = 'deficiente'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-deficiente'; 
            } else if (diffDays >= 16 && diffDays <= 20) { 
                status = 'dudoso'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-dudoso'; 
            } else if (diffDays >= 21 && diffDays <= 60) { 
                status = 'perdida'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-perdida'; 
            } else if (diffDays > 60) { 
                status = 'sin-calificacion'; 
                statusText = `Retraso ${diffDays}d`; 
                rowClass = 'table-row-sin-calificacion'; 
            } return { 
                status, daysOverdue: diffDays, statusText, rowClass 
            }; 
        },
    },
};

// --- Servicio de KPIs (Modificado para usar filtros globales y nuevos KPIs) ---
export const kpiService = {
    getAllKPIs: () => { 
        const services = getFilteredData(dummyData.services, 'services', true, 'date'); 
        const disbursedServices = getFilteredData(dummyData.services, 'services', true, 'disbursementDate'); 
        const expenses = getFilteredData(dummyData.expenses, 'expenses', true, 'date'); 
        const clients = getFilteredData(dummyData.clients, 'clients', true, 'registeredDate'); 
        const moneyTransfers = getFilteredData(dummyData.moneyTransfers, 'moneyTransfers', true, 'date'); 
        const branches = getCurrentFilters().branch ? dummyData.branches.filter(b => b.name === getCurrentFilters().branch && b.status === 'Activa') : dummyData.branches.filter(b => b.status === 'Activa'); 
        const totalIngresos = services.reduce((sum, s) => sum + (s.totalInterest || 0), 0); 
        const totalGastos = expenses.reduce((sum, e) => sum + (e.amount || 0), 0); 
        const capitalTotal = branches.reduce((sum, b) => sum + (b.capitalAsignado || 0), 0); 
        const beneficioNeto = totalIngresos - totalGastos; 
        const morosidadInfo = kpiService.calculateMorosidad(services); 
        const totalGiven = moneyTransfers.filter(t => t.type === 'given').reduce((sum, t) => sum + t.amount, 0); 
        const totalReceived = moneyTransfers.filter(t => t.type === 'received').reduce((sum, t) => sum + t.amount, 0); 
        const branchExpenses = getFilteredData(dummyData.expenses, 'expenses', true, 'date').filter(e=> e.analyst === null); 
        const totalBranchExpenses = branchExpenses.reduce((sum, e) => sum + (e.amount || 0), 0); 
        const disponibleEnBoveda = totalReceived - totalGiven - totalBranchExpenses; 
        const interesPorCobrar = services .filter(s => ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)) .reduce((sum, s) => sum + (s.totalInterest || 0) - 0, 0); 
        const morososEstados = ['cpp', 'deficiente', 'dudoso', 'perdida', 'sin-calificacion']; 
        const clientesMorososIds = new Set(); 
        dummyData.clients.forEach(c => { const statusInfo = dummyData.kpis.getClientPaymentStatusInfo(c.id); 
            if (morososEstados.includes(statusInfo.status)) { 
                clientesMorososIds.add(c.id); 
            } 
        });
        const valorEnMorosidad = services .filter(s => clientesMorososIds.has(s.clientId) && ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)) .reduce((sum, s) => sum + (s.amount || 0), 0); 
        const clientesPerdidaIds = new Set(); 
        dummyData.clients.forEach(c => { const statusInfo = dummyData.kpis.getClientPaymentStatusInfo(c.id); 
            if (statusInfo.status === 'sin-calificacion') { clientesPerdidaIds.add(c.id); 

            } 
        }); 
        const perdidaEstimada = services .filter(s => clientesPerdidaIds.has(s.clientId) && ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)) .reduce((sum, s) => sum + (s.amount || 0), 0); 
        const capitalEnPrestamos = disbursedServices .filter(s => ['Por Cobrar', 'Moroso', 'Desembolsado'].includes(s.status)) .reduce((sum, s) => sum + (s.amount || 0), 0);
        const capitalDisponible = capitalTotal - capitalEnPrestamos; 
        const capitalRecuperado = totalReceived; 
        const todayObj = new Date(HOY_SIMULADO + 'T00:00:00Z'); 
        const oneWeekAgo = new Date(todayObj); 
        oneWeekAgo.setUTCDate(todayObj.getUTCDate() - 7); 
        const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0]; 
        const { branch, analyst } = getCurrentFilters(); 
        const clientesNuevosSemana = dummyData.clients.filter(c => c.registeredDate >= oneWeekAgoStr && c.registeredDate <= HOY_SIMULADO && (!branch || c.branch === branch) && (!analyst || analyst === 'null' ? !c.analyst : c.analyst === analyst) ).length; 
        const prestamosSemana = dummyData.services.filter(s => s.date >= oneWeekAgoStr && s.date <= HOY_SIMULADO && s.type === 'Préstamo' && (!branch || s.branch === branch) && (!analyst || analyst === 'null' ? !s.analyst : s.analyst === analyst) && s.status !== 'Rechazado' ).length; 
        const empenosSemana = dummyData.services.filter(s => s.date >= oneWeekAgoStr && s.date <= HOY_SIMULADO && s.type === 'Empeño' && (!branch || s.branch === branch) && (!analyst || analyst === 'null' ? !s.analyst : s.analyst === analyst) && s.status !== 'Rechazado' ).length; 
       return { sumaIngresosTotales: totalIngresos, sumaGastosTotales: totalGastos, sumaCapitalTotal: capitalTotal, beneficioNetoCalculado: beneficioNeto, tasaMorosidadTotal: morosidadInfo.tasaMorosidad, conteosMorosidad: morosidadInfo.conteos, valorTotalCarteraActiva: capitalEnPrestamos, disponibleEnBoveda: disponibleEnBoveda, interesPorCobrar: interesPorCobrar, valorEnMorosidad: valorEnMorosidad, perdidaEstimada: perdidaEstimada, capitalDisponible: capitalDisponible, capitalEnPrestamos: capitalEnPrestamos, capitalRecuperado: capitalRecuperado, clientesNuevosSemana: clientesNuevosSemana, prestamosSemana: prestamosSemana, empenosSemana: empenosSemana, margenInteresNeto: '5.8% (Pl)', roa: '1.5% (Pl)', roe: '8.2% (Pl)', margenBeneficioNeto: 'N/A', tasaIncumplimientoCastigo: '1.2% (Pl)', tasaRedencionPromedio: '85% (Pl)', ratioEficienciaConsolidado: 'N/A', volumenTotalPrestamosNumero: services.length, volumenTotalPrestamosMonto: services.reduce((sum, s) => sum + (s.amount || 0), 0), rotacionTotalInventarioEmpeno: '3.5 (Pl)', ratioDeudaPatrimonioTotal: 'N/A', };
    },
    calculateMorosidad: (filteredServices) => {
         const counts = { 'normal': 0, 'cpp': 0, 'deficiente': 0, 'dudoso': 0, 'perdida': 0, 'sin-calificacion': 0, 'al-dia': 0, 'error': 0 }; const processedClientIds = new Set(); const clientIdsInFilter = [...new Set(filteredServices.map(s => s.clientId))]; clientIdsInFilter.forEach(clientId => { if (!clientId || processedClientIds.has(clientId)) return; const paymentInfo = dummyData.kpis.getClientPaymentStatusInfo(clientId); if (paymentInfo && counts.hasOwnProperty(paymentInfo.status)) { if (paymentInfo.status !== 'al-dia' || paymentInfo.statusText === 'Vence Hoy') { counts[paymentInfo.status]++; } } else { counts['error']++; } processedClientIds.add(clientId); }); const morososCount = counts['cpp'] + counts['deficiente'] + counts['dudoso'] + counts['perdida'] + counts['sin-calificacion']; const totalClientesConDeuda = Object.values(counts).reduce((a, b) => a + b, 0) - counts['error'] - counts['al-dia'] + (counts['al-dia'] > 0 && counts['al-dia'] === clientIdsInFilter.length ? 0 : counts['al-dia']); // Ajuste para contar 'al-dia' si no todos están así
          const tasaMorosidad = totalClientesConDeuda > 0 ? ((morososCount / totalClientesConDeuda) * 100).toFixed(1) + '%' : '0.0%'; console.log("Nuevos conteos morosidad:", counts); return { tasaMorosidad, conteos: counts };
    },
    getBranchKPIs: (branchName) => {
         const branchInfo = dummyData.branches.find(b => b.name === branchName); if (!branchInfo) return null; const branchServices = dummyData.services.filter(s => s.branch === branchName); const branchExpenses = dummyData.expenses.filter(e => e.branch === branchName); const branchClients = dummyData.clients.filter(c => c.branch === branchName); const ingresosDirectos = branchServices.reduce((sum, s) => sum + (s.totalInterest || 0), 0); const gastosDirectos = branchExpenses.reduce((sum, e) => sum + e.amount, 0); const contribucionBeneficio = ingresosDirectos - gastosDirectos; const morosidadSucursalInfo = kpiService.calculateMorosidad(branchServices); const originados = branchServices.filter(s => s.disbursementDate); const prestamosOriginadosNum = originados.length; const prestamosOriginadosMonto = originados.reduce((sum, s) => sum + (s.amount || 0), 0); const montoPromedio = prestamosOriginadosNum > 0 ? prestamosOriginadosMonto / prestamosOriginadosNum : 0; const hoyMes = HOY_SIMULADO.slice(0, 7); const nuevosClientesSucursal = branchClients.filter(c => c.registeredDate && c.registeredDate.startsWith(hoyMes)).length; const tasaIncumplimientoSucursal = '1.1% (Pl)'; const tasaRedencionSucursal = '88% (Pl)'; const ltvPromedioSucursal = '65% (Pl)'; const ratioEficienciaSucursal = ingresosDirectos > 0 ? ((gastosDirectos / ingresosDirectos) * 100).toFixed(1) + '%' : 'N/A'; const rotacionInventarioSucursal = '4.0 (Pl)';
         return { nombre: branchName, contribucionAlBeneficio: contribucionBeneficio, ingresosIntereses: ingresosDirectos, ingresosComisionesCargos: 0, ingresosVentaArticulos: 0, margenBrutoVentaArticulos: 'N/A', tasaMorosidadSucursal: morosidadSucursalInfo.tasaMorosidad, conteosMorosidadSucursal: morosidadSucursalInfo.conteos, tasaIncumplimientoCastigoSucursal: tasaIncumplimientoSucursal, tasaRedencionEmpenosSucursal: tasaRedencionSucursal, ltvPromedioEmpenosSucursal: ltvPromedioSucursal, numPrestamosOriginadosSucursal: prestamosOriginadosNum, montoPrestamosOriginadosSucursal: prestamosOriginadosMonto, montoPromedioPrestamoSucursal: montoPromedio, gastosOperativosDirectosSucursal: gastosDirectos, ratioEficienciaSucursal: ratioEficienciaSucursal, rotacionInventarioEmpenoSucursal: rotacionInventarioSucursal, numClientesNuevosSucursal: nuevosClientesSucursal, numClientesTotalSucursal: branchClients.length };
    },
    getAnalystKPIs: (analystUsername) => {
         const analystInfo = dummyData.users.find(u => u.username === analystUsername); if (!analystInfo || analystInfo.role !== 'Analista') return null; const analystServices = dummyData.services.filter(s => s.analyst === analystUsername); const solicitudesProcesadas = analystServices.length; const originados = analystServices.filter(s => s.disbursementDate); const aprobadosOriginados = originados.length; const montoAprobadoOriginado = originados.reduce((sum, s) => sum + (s.amount || 0), 0); const tasaMorosidadTemprana = '2.5% (Pl)'; const tasaIncumplimientoAnalista = '0.8% (Pl)'; const rechazados = analystServices.filter(s => s.status === 'Rechazado').length; const tasaAprobacionVsRechazo = solicitudesProcesadas > 0 ? `${((solicitudesProcesadas - rechazados) / solicitudesProcesadas * 100).toFixed(1)}% Aprob.` : 'N/A'; const articulosValuados = analystServices.filter(s => s.type === 'Empeño').length; const precisionValuacion = '95% (Pl)'; const tasaRedencionAnalista = '90% (Pl)';
         return { username: analystUsername, branch: analystInfo.branch, numSolicitudesProcesadas: solicitudesProcesadas, numPrestamosAprobados: aprobadosOriginados, montoTotalAprobado: montoAprobadoOriginado, tiempoPromedioProcesamiento: 'N/A (Pl)', numArticulosValuadosEmpeno: articulosValuados, tasaMorosidadTempranaAnalista: tasaMorosidadTemprana, tasaIncumplimientoAnalista: tasaIncumplimientoAnalista, tasaAprobacionVsRechazoAnalista: tasaAprobacionVsRechazo, precisionValuacionEmpenoAnalista: precisionValuacion, tasaRedencionEmpenosAnalista: tasaRedencionAnalista };
    }
};
// --- Funciones de Acceso/Modificación ---
export function getUser(username) { return dummyData.users.find(u => u.username === username); }
export function getClient(id) { const numId = parseInt(id); return !isNaN(numId) ? dummyData.clients.find(c => c.id === numId) : undefined; }
export function getService(id) { const numId = parseInt(id); return !isNaN(numId) ? dummyData.services.find(s => s.id === numId) : undefined; }
export function getBranch(id) { const numId = parseInt(id); return !isNaN(numId) ? dummyData.branches.find(b => b.id === numId) : undefined; }
export function getExpense(id) { const numId = parseInt(id); return !isNaN(numId) ? dummyData.expenses.find(e => e.id === numId) : undefined; }
export function addClient(newClientData) { const newId = (dummyData.clients.length > 0 ? Math.max(...dummyData.clients.map(c => c.id)) : 100) + 1; const clientToAdd = { ...newClientData, id: newId }; dummyData.clients.push(clientToAdd); filteredDataCache.clients = null; return clientToAdd; }
export function updateClient(clientId, updatedData) { const index = dummyData.clients.findIndex(c => c.id === clientId); if (index > -1) { dummyData.clients[index] = { ...dummyData.clients[index], ...updatedData, id: clientId }; filteredDataCache.clients = null; return dummyData.clients[index]; } return null;}

/**
 * Agrega un nuevo servicio (Préstamo o Empeño) a los datos.
 * MODIFICADO: Adaptado para la nueva estructura de Empeño.
 * @param {object} newServiceData - Datos del nuevo servicio.
 * @returns {object} El servicio agregado.
 */
export function addService(newServiceData) {
    let newId;
    do { newId = 10000 + Math.floor(Math.random() * 90000); } while (dummyData.services.some(s => s.id === newId));

    // Definir estructura base con todos los campos posibles (null por defecto)
    const baseService = {
        id: newId,
        type: null, // 'Préstamo' o 'Empeño'
        clientId: null,
        amount: 0, // Monto prestado
        status: 'Pendiente',
        date: new Date().toISOString().split('T')[0],
        approvalDate: null,
        rejectionReason: null,
        branch: null,
        analyst: null,
        nextPayment: null,
        disbursementDate: null,
        disbursementMethod: null,
        lastPaymentDate: null,
        lastPaymentAmount: null,
        paymentType: null, // Diario, Semanal, Mensual
        numInstallments: 0,
        installmentAmount: 0,
        totalInterest: 0,
        totalToPay: 0,
        guarantorId: null,
        guarantorRelationship: null,
        documents: {}, // Objeto para nombres de archivo

        // Campos específicos Préstamo
        interestRate: null, // Tasa % para préstamo

        // Campos específicos Empeño
        items: [], // Array de objetos artículo
        vehicleDetails: null, // Objeto con detalles vehiculares o null
        totalValuation: 0, // Suma de valoraciones
        pawnPercentage: 0, // % prestado sobre valoración
        interestCategory: null, // Categoría para tasa empeño
        interestRatePawn: null, // Tasa % para empeño

        // NUEVO: Historial de pagos y plan de pagos
        payments: [],
        paymentPlan: []
    };

   // Fusionar datos entrantes con la estructura base
   const serviceToAdd = { ...baseService, ...newServiceData };

   dummyData.services.push(serviceToAdd);
   filteredDataCache.services = null; // Invalidar caché
   console.log(`Servicio ${serviceToAdd.id} (${serviceToAdd.type}) añadido:`, serviceToAdd);
   return serviceToAdd;
}

/**
 * Actualiza un servicio existente.
 * MODIFICADO: Asegura que la estructura base (incluyendo nuevos campos) se mantenga.
 * @param {number} serviceId - ID del servicio a actualizar.
 * @param {object} updatedData - Campos a actualizar.
 * @returns {object|null} El servicio actualizado o null si no se encontró.
 */
export function updateService(serviceId, updatedData) {
    const index = dummyData.services.findIndex(s => s.id === serviceId);
    if (index > -1) {
        // Fusionar datos actualizados con el existente, asegurando no perder campos
        dummyData.services[index] = { ...dummyData.services[index], ...updatedData, id: serviceId };
        filteredDataCache.services = null; // Invalidar caché
        console.log(`Servicio ${serviceId} actualizado.`);
        return dummyData.services[index];
    }
    console.error(`Error al actualizar: Servicio ${serviceId} no encontrado.`);
    return null;
}

/**
 * Registra un pago/abono en el historial de un servicio y actualiza el estado y plan de pagos.
 * @param {number} serviceId - ID del servicio.
 * @param {object} paymentData - { date, amount, method, notes }
 * @returns {object|null} Servicio actualizado o null si no existe.
 */
export function addPaymentToService(serviceId, paymentData) {
    const service = getService(serviceId);
    if (!service) return null;
    if (!service.payments) service.payments = [];
    service.payments.push(paymentData);
    // Actualizar plan de pagos
    if (service.paymentPlan && Array.isArray(service.paymentPlan)) {
        let remaining = paymentData.amount;
        for (let cuota of service.paymentPlan) {
            if (!cuota.paid && remaining > 0) {
                if (remaining >= cuota.amount) {
                    cuota.paid = true;
                    remaining -= cuota.amount;
                } else {
                    // Pago parcial de cuota
                    cuota.paid = false;
                    break;
                }
            }
        }
    }
    // Actualizar estado del servicio
    const allPaid = service.paymentPlan && service.paymentPlan.every(c => c.paid);
    if (allPaid) {
        service.status = 'Pagado';
    } else {
        // Si hay cuotas vencidas no pagadas, poner en moroso
        const today = new Date(HOY_SIMULADO + 'T00:00:00Z');
        const vencidas = service.paymentPlan && service.paymentPlan.some(c => !c.paid && new Date(c.dueDate + 'T00:00:00Z') < today);
        if (vencidas) service.status = 'Moroso';
        else service.status = 'Por Cobrar';
    }
    // Actualizar último pago
    service.lastPaymentDate = paymentData.date;
    service.lastPaymentAmount = paymentData.amount;
    updateService(serviceId, service);
    return service;
}

export function addExpense(newExpenseData) { const newId = (dummyData.expenses.length > 0 ? Math.max(...dummyData.expenses.map(e => e.id)) : 0) + 1; const expenseToAdd = { ...newExpenseData, id: newId }; dummyData.expenses.push(expenseToAdd); filteredDataCache.expenses = null; return expenseToAdd; }
export function deleteExpenseById(expenseId) { const index = dummyData.expenses.findIndex(e => e.id === expenseId); if (index > -1) { dummyData.expenses.splice(index, 1); filteredDataCache.expenses = null; return true; } return false; }
export function addMoneyTransfer(newTransferData) { const newId = (dummyData.moneyTransfers.length > 0 ? Math.max(...dummyData.moneyTransfers.map(t => t.id)) : 1000) + 1; const transferToAdd = { ...newTransferData, id: newId }; dummyData.moneyTransfers.push(transferToAdd); filteredDataCache.moneyTransfers = null; return transferToAdd; }
export function getClientCreditsCount(clientId) { return dummyData.services.filter(s => s.clientId === clientId).length; }
export function getClientTotalDebt(clientId) { const pendingStatuses = ['Por Cobrar', 'Moroso', 'Moroso Grave', 'Desembolsado', 'Aprobado', 'Verificado']; return dummyData.services.filter(s => s.clientId === clientId && pendingStatuses.includes(s.status)).reduce((sum, s) => sum + (s.amount || 0), 0); }
export function getClientPaymentStatusInfo(clientId) { return dummyData.kpis.getClientPaymentStatusInfo(clientId); }
export function addUser(newUserData) { if (dummyData.users.some(u => u.username === newUserData.username)) { throw new Error(`El nombre de usuario '${newUserData.username}' ya existe.`); } const userToAdd = { ...newUserData }; dummyData.users.push(userToAdd); console.log('Usuario añadido:', userToAdd); return userToAdd; }
export function deleteUserByUsername(username) { const index = dummyData.users.findIndex(u => u.username === username); if (index > -1) { dummyData.users.splice(index, 1); console.log(`Usuario ${username} eliminado.`); return true; } console.warn(`Intento de eliminar usuario no encontrado: ${username}`); return false; }

// --- Funciones para Caja (Simulación) ---
/** Obtiene el estado actual de la caja para un analista */
export function getCashBoxStatus(analystUsername) {
    return dummyData.cashBoxStatus[analystUsername] || { isOpen: false, lastOpenDate: null, openingBalance: 0, cashIn: 0, cashOut: 0, closingBalance: 0, lastCloseDate: null, discrepancy: 0, discrepancyNotes: null };
}
/** Actualiza el estado de la caja */
export function updateCashBoxStatus(analystUsername, statusUpdate) {
    if (!dummyData.cashBoxStatus[analystUsername]) {
        dummyData.cashBoxStatus[analystUsername] = {}; // Inicializar si no existe
    }
    dummyData.cashBoxStatus[analystUsername] = {
        ...getCashBoxStatus(analystUsername), // Mantener estado anterior
        ...statusUpdate // Aplicar cambios
    };
    console.log(`Estado de caja actualizado para ${analystUsername}:`, dummyData.cashBoxStatus[analystUsername]);
    // Aquí podríamos simular el envío a Tesorería en el cierre
    if (statusUpdate.isOpen === false && statusUpdate.lastCloseDate) {
         console.log(`*** SIMULACIÓN: Reporte de cierre de caja para ${analystUsername} enviado a Tesorería ***`);
    }
}
/** Agrega una solicitud de egreso */
export function addExpenseRequest(requestData) {
     const newId = `ERQ-${Date.now()}`;
     const requestToAdd = { ...requestData, id: newId, status: 'Pendiente' };
     dummyData.expenseRequests.push(requestToAdd);
     console.log("Solicitud de Egreso añadida:", requestToAdd);
     return requestToAdd;
}

/**
 * Agrega un nuevo proveedor al sistema.
 * @param {object} newProviderData - Datos del proveedor a registrar.
 * @returns {object} El proveedor agregado.
 */
export function addProvider(newProviderData) {
    if (!dummyData.providers) dummyData.providers = [];
    // Validar RUC único (opcional)
    if (dummyData.providers.some(p => p.ruc === newProviderData.ruc)) {
        throw new Error('Ya existe un proveedor con ese RUC.');
    }
    const newId = (dummyData.providers.length > 0 ? Math.max(...dummyData.providers.map(p => p.id)) : 1) + 1;
    const providerToAdd = { ...newProviderData, id: newId };
    dummyData.providers.push(providerToAdd);
    return providerToAdd;
}