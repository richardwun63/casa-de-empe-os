// js/modules/components/branchManagement.js (STUB)
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
console.log('Modulo branchManagement.js (STUB) cargado.');

console.log('Modulo branchManagement.js cargado.');

/**
 * Carga la vista de gestión de sucursales.
 * @param {HTMLElement} contentArea - El área donde renderizar el contenido.
 * @param {HTMLElement} sectionTitleElement - El elemento para actualizar el título.
 */
export function loadBranchManagement(contentArea, sectionTitleElement) {
    console.log("Cargando Gestión de Sucursales...");
    sectionTitleElement.textContent = 'Gestión de Sucursales';

    // Definir columnas para la tabla de sucursales
    const columns = [
        { key: 'id', label: 'ID'},
        { key: 'name', label: 'Nombre' },
        { key: 'address', label: 'Dirección' },
        { key: 'creationDate', label: 'Fec. Creación', format: 'date'}, // Usar formato de fecha
        // Aplicar formato específico para el estado de la sucursal
        {
            key: 'status',
            label: 'Estado',
            format: (value) => {
                const statusClass = String(value || 'desconocido').toLowerCase();
                // Añadir clases específicas para fondo/color
                const branchStatusClass = statusClass === 'activa' ? 'status-branch-activa' : (statusClass === 'inactiva' ? 'status-branch-inactiva' : '');
                // Usar tag span con clases status y la específica de sucursal
                return `<span class="status ${branchStatusClass}">${value ?? 'N/A'}</span>`;
            }
        },
        { key: 'capitalAsignado', label: 'Capital Asignado', format: 'currency', numeric: true} // Usar formato de moneda
    ];

    // Definir acciones para la tabla
    const actions = [
        { label: 'Ver Detalles', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-detalles-sucursal' }, // Clave de acción específica
        { label: 'Editar', class: 'btn-warning', icon: 'fa-edit', actionKey: 'editar-sucursal' },
        { label: 'Eliminar', class: 'btn-danger', icon: 'fa-trash-alt', actionKey: 'eliminar-sucursal' }
    ];

    // Generar HTML: Botón + Tabla
    contentArea.innerHTML = `
        <button class="btn btn-primary mb-3" data-action="add-branch">
            <i class="fas fa-plus"></i> Agregar Sucursal
        </button>
        ${ui.renderTable(data.dummyData.branches, columns, actions, { defaultMessage: 'No hay sucursales registradas.' })}
    `;
    console.log('Vista Gestión de Sucursales renderizada.');
    // La delegación de eventos en ui.js manejará los clics en los botones de acción y el botón "Agregar".
}

/**
 * Abre el modal para agregar una nueva sucursal.
 */
export function addBranch() { // Llamada desde el handler de acción 'add-branch' en ui.js
    console.log("Abriendo modal para agregar sucursal...");
    const today = new Date().toISOString().slice(0, 10); // Fecha actual por defecto

    // HTML del formulario
    const formHTML = `
        <form id="branch-form-add" class="app-form">
            <div class="input-group">
                <label for="branch-name-add">Nombre <span class="text-danger">*</span>:</label>
                <input type="text" id="branch-name-add" required>
            </div>
            <div class="input-group">
                <label for="branch-address-add">Dirección <span class="text-danger">*</span>:</label>
                <input type="text" id="branch-address-add" required>
            </div>
            <div class="input-group">
                <label for="branch-capital-add">Capital Asignado (S/) <span class="text-danger">*</span>:</label>
                <input type="number" id="branch-capital-add" step="0.01" required min="0" value="0">
            </div>
            <div class="input-group">
                <label for="branch-status-add">Estado:</label>
                <select id="branch-status-add">
                    <option value="Activa" selected>Activa</option>
                    <option value="Inactiva">Inactiva</option>
                </select>
            </div>
            <div class="input-group">
                <label for="branch-creationDate-add">Fecha Creación <span class="text-danger">*</span>:</label>
                <input type="date" id="branch-creationDate-add" value="${today}" required>
            </div>
        </form>`;

    // Función callback para el botón de confirmar del modal
    const handleAddConfirm = () => {
        try {
            console.log("Confirmación para agregar sucursal recibida.");
            const nameInput = document.getElementById('branch-name-add');
            const addressInput = document.getElementById('branch-address-add');
            const capitalInput = document.getElementById('branch-capital-add');
            const statusSelect = document.getElementById('branch-status-add');
            const creationDateInput = document.getElementById('branch-creationDate-add');

            // Validaciones básicas
            if (!nameInput || !addressInput || !capitalInput || !statusSelect || !creationDateInput ||
                !nameInput.value.trim() || !addressInput.value.trim() || !creationDateInput.value) {
                alert('Por favor completa todos los campos requeridos (*).');
                return false;
            }
            const capital = parseFloat(capitalInput.value);
            if (isNaN(capital) || capital < 0) {
                alert('El capital asignado debe ser un número válido mayor o igual a 0.');
                return false;
            }

            const newBranchData = {
                name: nameInput.value.trim(),
                address: addressInput.value.trim(),
                status: statusSelect.value,
                creationDate: creationDateInput.value,
                capitalAsignado: capital
            };

            // Simulación de añadido
            const newId = (data.dummyData.branches.length > 0 ? Math.max(...data.dummyData.branches.map(b => b.id)) : 0) + 1;
            const branchToAdd = { ...newBranchData, id: newId };
            data.dummyData.branches.push(branchToAdd);
            console.log("Nueva sucursal añadida (simulación):", branchToAdd);

            alert('Sucursal agregada exitosamente (simulación).');
            ui.closeModal();
            ui.reloadCurrentView();
            return true;
        } catch (error) {
            console.error('Error inesperado al agregar sucursal:', error);
            alert('Ocurrió un error inesperado al agregar la sucursal.');
            ui.closeModal();
            ui.reloadCurrentView();
            return false;
        }
    };

    // Abrir el modal usando ui.js
    ui.openModal('Agregar Nueva Sucursal', formHTML, true, 'Guardar Sucursal', 'medium', handleAddConfirm);
}

/**
 * Abre el modal para editar una sucursal existente.
 * @param {number} branchId - El ID de la sucursal a editar.
 */
export function editBranch(branchId) { // Llamada desde el handler de acción 'editar-sucursal'
    console.log(`Abriendo modal para editar sucursal ID: ${branchId}`);
    const branch = data.getBranch(branchId); // Obtener datos de la sucursal

    if (!branch) {
        alert(`Error: No se encontró la sucursal con ID ${branchId}.`);
        console.error(`Sucursal ID ${branchId} no encontrada en data.js`);
        return;
    }

    // HTML del formulario de edición
    // **Añadido 'readonly' al input de fecha de creación**
    const formHTML = `
        <form id="branch-form-edit" class="app-form">
            <input type="hidden" id="branch-id-edit" value="${branch.id}">
            <div class="input-group">
                <label for="branch-name-edit">Nombre <span class="text-danger">*</span>:</label>
                <input type="text" id="branch-name-edit" value="${branch.name || ''}" required>
            </div>
            <div class="input-group">
                <label for="branch-address-edit">Dirección <span class="text-danger">*</span>:</label>
                <input type="text" id="branch-address-edit" value="${branch.address || ''}" required>
            </div>
            <div class="input-group">
                <label for="branch-capital-edit">Capital Asignado (S/) <span class="text-danger">*</span>:</label>
                <input type="number" id="branch-capital-edit" step="0.01" required min="0" value="${branch.capitalAsignado ?? 0}">
            </div>
            <div class="input-group">
                <label for="branch-status-edit">Estado:</label>
                <select id="branch-status-edit">
                    <option value="Activa" ${branch.status === 'Activa' ? 'selected' : ''}>Activa</option>
                    <option value="Inactiva" ${branch.status === 'Inactiva' ? 'selected' : ''}>Inactiva</option>
                </select>
            </div>
            <div class="input-group">
                <label for="branch-creationDate-edit">Fecha Creación:</label>
                <input type="date" id="branch-creationDate-edit" value="${branch.creationDate || ''}" readonly>
                <small>La fecha de creación no se puede modificar.</small>
            </div>
        </form>`;

    // Callback para confirmar la edición
    const handleEditConfirm = () => {
        try {
            console.log(`Confirmación para editar sucursal ID: ${branchId}`);
            const nameInput = document.getElementById('branch-name-edit');
            const addressInput = document.getElementById('branch-address-edit');
            const capitalInput = document.getElementById('branch-capital-edit');
            const statusSelect = document.getElementById('branch-status-edit');
            // No leemos creationDate porque es readonly

            // Validaciones
            if (!nameInput || !addressInput || !capitalInput || !statusSelect ||
                !nameInput.value.trim() || !addressInput.value.trim()) {
                alert('Por favor completa todos los campos requeridos (*).');
                return false;
            }
            const capital = parseFloat(capitalInput.value);
            if (isNaN(capital) || capital < 0) {
                alert('El capital asignado debe ser un número válido mayor o igual a 0.');
                return false;
            }

            const updatedData = {
                name: nameInput.value.trim(),
                address: addressInput.value.trim(),
                status: statusSelect.value,
                capitalAsignado: capital
            };

            // Simulación de actualización
            const index = data.dummyData.branches.findIndex(b => b.id === branchId);
            if (index > -1) {
                data.dummyData.branches[index] = { ...data.dummyData.branches[index], ...updatedData };
                console.log("Sucursal actualizada (simulación):", data.dummyData.branches[index]);
                alert('Sucursal actualizada exitosamente (simulación).');
                ui.closeModal();
                ui.reloadCurrentView();
                return true;
            } else {
                console.error(`Error: Sucursal ID ${branchId} no encontrada durante la actualización.`);
                alert('Error al guardar los cambios.');
                ui.closeModal();
                ui.reloadCurrentView();
                return false;
            }
        } catch (error) {
            console.error('Error inesperado al editar sucursal:', error);
            alert('Ocurrió un error inesperado al editar la sucursal.');
            ui.closeModal();
            ui.reloadCurrentView();
            return false;
        }
    };

    // Abrir modal de edición
    ui.openModal(`Editar Sucursal: ${branch.name}`, formHTML, true, 'Guardar Cambios', 'medium', handleEditConfirm);
}

/**
 * Maneja la eliminación de una sucursal (con confirmación).
 * @param {number} branchId - ID de la sucursal a eliminar.
 */
export function deleteBranch(branchId) { // Llamada desde el handler 'eliminar-sucursal'
    console.log(`Intentando eliminar sucursal ID: ${branchId}`);
    const branch = data.getBranch(branchId);
    if (!branch) {
        alert(`Error: No se encontró la sucursal con ID ${branchId}.`);
        return;
    }

    // **Validación Adicional (Ejemplo): No permitir eliminar si tiene usuarios o servicios activos**
    const hasActiveUsers = data.dummyData.users.some(u => u.branch === branch.name);
    const hasActiveServices = data.dummyData.services.some(s => s.branch === branch.name && s.status !== 'Pagado' && s.status !== 'Rechazado');

    if (hasActiveUsers || hasActiveServices) {
         let message = `No se puede eliminar la sucursal "${branch.name}" porque tiene:`;
         if (hasActiveUsers) message += `\n- Usuarios asignados.`;
         if (hasActiveServices) message += `\n- Servicios activos o pendientes.`;
         message += `\nPrimero reasigna o resuelve estos elementos.`;
         alert(message);
         console.warn(`Intento de eliminar sucursal ${branchId} bloqueado debido a dependencias.`);
         return;
    }
    // --- Fin Validación Adicional ---


    // Confirmación
    if (confirm(`¿Estás seguro de eliminar la sucursal "${branch.name}" (ID: ${branchId})? Esta acción no se puede deshacer (simulación).`)) {
        console.log(`Confirmada eliminación para sucursal ID: ${branchId}`);
        // Simulación de eliminación
        // const success = data.deleteBranchById(branchId); // Asumiendo data.deleteBranchById
        // Simulación directa:
        const initialLength = data.dummyData.branches.length;
        data.dummyData.branches = data.dummyData.branches.filter(b => b.id !== branchId);
        const success = data.dummyData.branches.length < initialLength;

        if (success) {
            console.log(`Sucursal ID ${branchId} eliminada (simulación).`);
            alert('Sucursal eliminada (simulación).');
            ui.reloadCurrentView(); // Recargar tabla
        } else {
            console.error(`Error: No se pudo eliminar la sucursal ID ${branchId} (no se encontró después del filtro).`);
            alert('Error al intentar eliminar la sucursal.');
        }
    } else {
        console.log(`Eliminación cancelada por el usuario para sucursal ID: ${branchId}`);
    }
}

/**
 * Muestra los detalles de una sucursal en un modal.
 * @param {number} branchId - ID de la sucursal.
 */
export function viewBranchDetails(branchId) { // Llamada desde handler 'ver-detalles-sucursal'
    console.log(`Cargando detalles para sucursal ID: ${branchId}`);
    const branch = data.getBranch(branchId);
    if (!branch) {
        alert(`Error: No se encontró la sucursal con ID ${branchId}.`);
        return;
    }

    // Obtener datos relacionados (analistas, gastos, etc.) para mostrar en el modal
    const analysts = data.dummyData.users.filter(u => u.role === 'Analista' && u.branch === branch.name);
    const branchExpenses = data.dummyData.expenses.filter(e => e.branch === branch.name);
    const branchServices = data.dummyData.services.filter(s => s.branch === branch.name);

    // KPIs avanzados
    const totalCapital = branch.capitalAsignado;
    const totalExpensesAmount = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
    const activeServices = branchServices.filter(s => !['Pagado', 'Rechazado'].includes(s.status));
    const valueInStreet = activeServices.reduce((sum, s) => sum + ((s.totalToPay || s.amount || 0) - (s.payments ? s.payments.reduce((a, p) => a + (p.amount || 0), 0) : 0)), 0);
    const ingresosSucursal = branchServices.reduce((sum, s) => sum + (s.totalInterest || 0), 0);
    const morosidad = (() => {
        const morosos = activeServices.filter(s => {
            if (!s.paymentPlan) return false;
            return s.paymentPlan.some(c => !c.paid && new Date(c.dueDate) < new Date(data.HOY_SIMULADO));
        });
        return morosos.length > 0 ? `${((morosos.length / activeServices.length) * 100).toFixed(1)}%` : '0%';
    })();

    // Generar HTML para el cuerpo del modal
    let modalContentHTML = `
        <h4>Información Básica</h4>
        <p><strong>Nombre:</strong> ${branch.name}</p>
        <p><strong>Dirección:</strong> ${branch.address}</p>
        <p><strong>Estado:</strong> <span class="status status-branch-${branch.status.toLowerCase()}">${branch.status}</span></p>
        <p><strong>Fecha Creación:</strong> ${utils.formatDate(branch.creationDate)}</p>
        <p><strong>Capital Asignado:</strong> ${utils.formatCurrency(totalCapital)}</p>
        <hr>
        <h4>KPIs Operativos</h4>
        <p><strong>Servicios Activos/Pendientes:</strong> ${activeServices.length}</p>
        <p><strong>Valor en Calle (Saldo por Cobrar):</strong> ${utils.formatCurrency(valueInStreet)}</p>
        <p><strong>Ingresos Generados (Interés):</strong> ${utils.formatCurrency(ingresosSucursal)}</p>
        <p><strong>Morosidad (servicios con cuotas vencidas):</strong> ${morosidad}</p>
        <p><strong>Gastos Registrados:</strong> ${utils.formatCurrency(totalExpensesAmount)} (${branchExpenses.length} registros)</p>
        <hr>
        <h4>Analistas Asignados</h4>`;

     if (analysts.length > 0) {
         modalContentHTML += '<ul>';
         analysts.forEach(a => {
             modalContentHTML += `<li>${a.username}</li>`;
         });
         modalContentHTML += '</ul>';
     } else {
         modalContentHTML += '<p><em>No hay analistas asignados a esta sucursal.</em></p>';
     }

     modalContentHTML += `<hr>
         <button class="btn btn-info btn-sm" data-action="ver-gastos-sucursal" data-id="${branch.name}"><i class="fas fa-search-dollar"></i> Ver Detalle Gastos (${branchExpenses.length})</button>
         <button class="btn btn-secondary btn-sm" data-action="ver-servicios-sucursal" data-id="${branch.name}"><i class="fas fa-list"></i> Ver Servicios</button>
     `;

    // Abrir el modal sin botón de confirmación
    ui.openModal(`Detalles Sucursal: ${branch.name}`, modalContentHTML, false, '', 'large');

     // Añadir listener específico para los botones dentro del modal
     const modalBodyElement = document.getElementById('modal-body');
     modalBodyElement.querySelector('button[data-action="ver-gastos-sucursal"]')?.addEventListener('click', (e) => {
          const branchName = e.target.closest('button').dataset.id;
          ui.closeModal(); // Cerrar modal de detalles
          // Llamar a la función que carga el reporte de gastos filtrado por esa sucursal
          if (typeof reports !== 'undefined' && reports.loadExpenseReport) {
                reports.loadExpenseReport({ branchName: branchName });
           } else {
                alert("Error al intentar cargar el reporte de gastos.");
           }
     });

     modalBodyElement.querySelector('button[data-action="ver-servicios-sucursal"]')?.addEventListener('click', (e) => {
          const branchName = e.target.closest('button').dataset.id;
          ui.closeModal(); // Cerrar modal de detalles
          // Llamar a la función que carga el reporte de servicios filtrado por esa sucursal
          if (typeof reports !== 'undefined' && reports.loadServicesReport) {
                reports.loadServicesReport({ branchName: branchName });
           } else {
                alert("Error al intentar cargar el reporte de servicios.");
           }
     });
}