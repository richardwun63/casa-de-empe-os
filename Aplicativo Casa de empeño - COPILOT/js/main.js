// js/main.js
import { initAuth } from './modules/auth.js';
import { setupEventListeners, clearUI } from './modules/ui.js'; // Importar funciones necesarias de UI
import * as data from './modules/data.js'; // Importar data para inicialización

console.log('main.js cargado. Iniciando aplicación...');

// --- Inicializar estructuras de datos para el Analista ---
function initDataStructures() {
    console.log('Inicializando estructuras de datos para el Analista...');
    
    // Inicializar estructura para operaciones de caja
    if (!data.dummyData.cash_box_operations) {
        data.dummyData.cash_box_operations = [];
    }
    
    // Inicializar estructura para movimientos de caja
    if (!data.dummyData.cash_movements) {
        data.dummyData.cash_movements = [];
    }
    
    // Inicializar estructura para discrepancias de caja
    if (!data.dummyData.cash_discrepancies) {
        data.dummyData.cash_discrepancies = [];
    }
    
    // Inicializar estructura para solicitudes de efectivo
    if (!data.dummyData.cash_requests) {
        data.dummyData.cash_requests = [];
    }
    
    // Añadir algunos datos de ejemplo para demostración
    setupExampleData();
}

// Configura datos de ejemplo para las nuevas funcionalidades
function setupExampleData() {
    // Si ya hay datos, no añadir más ejemplos
    if (data.dummyData.cash_box_operations.length > 0) {
        return;
    }
    
    // Ejemplo de operación de caja (apertura) para el analista1
    data.dummyData.cash_box_operations.push({
        id: 10001,
        date: data.HOY_SIMULADO,
        time: '08:30',
        analystUsername: 'analista1',
        branch: 'Sucursal Centro',
        operationType: 'open',
        initialBalance: 500.00,
        closingBalance: 500.00,
        notes: 'Apertura día normal',
        status: 'active'
    });
    
    // Algunos movimientos de caja para analista1
    data.dummyData.cash_movements.push(
        {
            id: 2001,
            date: data.HOY_SIMULADO,
            time: '09:15',
            analystUsername: 'analista1',
            branch: 'Sucursal Centro',
            type: 'income',
            concept: 'Abono de Cliente',
            reference: '101',
            amount: 150.00,
            method: 'Efectivo',
            observations: 'Pago puntual cuota préstamo'
        },
        {
            id: 2002,
            date: data.HOY_SIMULADO,
            time: '10:30',
            analystUsername: 'analista1',
            branch: 'Sucursal Centro',
            type: 'expense',
            concept: 'Desembolso Crédito',
            reference: '14',
            amount: 750.00,
            method: 'Efectivo',
            observations: 'Desembolso a cliente'
        },
        {
            id: 2003,
            date: data.HOY_SIMULADO,
            time: '11:45',
            analystUsername: 'analista1',
            branch: 'Sucursal Centro',
            type: 'expense',
            concept: 'Transporte',
            reference: null,
            amount: 15.00,
            method: 'Efectivo',
            observations: 'Taxi para visita cliente'
        }
    );
    
    // Una solicitud de efectivo para analista2
    data.dummyData.cash_requests.push({
        id: 3001,
        date: data.HOY_SIMULADO,
        time: '09:00',
        analystUsername: 'analista2',
        branch: 'Sucursal Norte',
        amount: 1000.00,
        reason: 'Desembolso',
        observations: 'Para préstamo aprobado',
        status: 'pending',
        approvedBy: null,
        approvalDate: null,
        deliveredBy: null,
        deliveryDate: null
    });
}

// --- Listener Principal del DOM ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM completamente cargado y parseado.');

    // --- Selección de Elementos del DOM (Centralizada) ---
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const branchSelectContainer = document.getElementById('branch-select-container');
    const branchSelect = document.getElementById('branch');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('logout-button');
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    const branchDisplay = document.getElementById('branch-display');
    const contentArea = document.getElementById('content-area'); // Contenedor principal para delegación

    // Validar que los elementos esenciales existan
    if (!loginPage || !appContainer || !loginForm || !contentArea || !logoutButton) {
         console.error("Error Crítico: Faltan elementos esenciales del DOM (loginPage, appContainer, loginForm, contentArea, logoutButton). La aplicación no puede iniciarse correctamente.");
         document.body.innerHTML = '<p style="color: red; font-weight: bold; padding: 20px;">Error crítico al cargar la aplicación. Faltan elementos HTML esenciales.</p>';
         return; // Detener ejecución
    }
     if (!usernameInput || !passwordInput || !branchSelectContainer || !branchSelect || !loginError || !usernameDisplay || !userRoleDisplay || !branchDisplay) {
          console.warn("Advertencia: Faltan algunos elementos secundarios del DOM. Funcionalidades podrían verse afectadas.");
     }

    try {
        // --- Inicializar Módulo de Autenticación ---
        initAuth(
            loginForm,
            usernameInput,
            passwordInput,
            branchSelectContainer,
            branchSelect,
            loginError,
            appContainer,
            loginPage,
            logoutButton,
            usernameDisplay,
            userRoleDisplay,
            branchDisplay
        );

        // Inicializar estructuras de datos para el Analista
        initDataStructures();

        // --- Inicializar Listeners de Eventos Generales (Delegación) ---
        setupEventListeners(contentArea);

        // --- Configuración Inicial de la UI ---
        loginPage.style.display = 'flex';
        appContainer.style.display = 'none';
        clearUI(); // Asegura UI limpia al inicio

        // --- Cargar contenido inicial tras login exitoso ---
        window.addEventListener('user-logged-in', () => {
            try {
                loginPage.style.display = 'none';
                appContainer.style.display = 'block';
                // Cargar la vista inicial según el rol
                import('./modules/ui.js').then(ui => {
                    ui.loadInitialContent();
                });
            } catch (e) {
                console.error('Error al cargar la vista inicial tras login:', e);
            }
        });

        // --- Manejo global de errores no capturados ---
        window.addEventListener('error', (event) => {
            console.error('Error global no capturado:', event.error || event.message);
            document.body.innerHTML = `<p style="color: red; font-weight: bold; padding: 20px;">Ocurrió un error inesperado en la aplicación. Por favor, recargue la página o contacte al soporte.</p><pre>${event.error?.stack || event.message}</pre>`;
        });
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promesa no capturada:', event.reason);
            document.body.innerHTML = `<p style="color: red; font-weight: bold; padding: 20px;">Ocurrió un error inesperado en la aplicación. Por favor, recargue la página o contacte al soporte.</p><pre>${event.reason?.stack || event.reason}</pre>`;
        });

        console.log('Aplicación inicializada correctamente.');

    } catch (error) {
        console.error("Error durante la inicialización de la aplicación:", error);
        document.body.innerHTML = `<p style="color: red; font-weight: bold; padding: 20px;">Ocurrió un error inesperado al iniciar la aplicación. Por favor, intente recargar la página o contacte al soporte.</p><pre>${error.stack}</pre>`;
    }
});

console.log('main.js finalizado.');