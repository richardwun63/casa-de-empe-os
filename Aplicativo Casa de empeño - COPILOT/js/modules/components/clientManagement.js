// js/modules/components/clientManagement.js
import * as ui from '../ui.js';
import * as utils from '../utils.js';
import * as data from '../data.js';
import { getCurrentUser } from '../auth.js';
import * as serviceMgmt from './serviceManagement.js';
// Importar viewServiceDetails desde donde esté definido finalmente (reports o serviceManagement)
import { viewServiceDetails } from './serviceManagement.js'; // Asumiendo que está en serviceManagement

console.log('Modulo clientManagement.js cargado.');

/**
 * Carga el formulario para registrar un nuevo cliente con consulta DNI.
 */
export function loadClientRegistration(contentArea, sectionTitleElement) {
    console.log('Cargando vista: Registro de Cliente');
    sectionTitleElement.textContent = 'Registrar Nuevo Cliente';
    const currentUser = getCurrentUser();
    const today = new Date().toISOString().split('T')[0];

    // HTML del formulario de registro
    contentArea.innerHTML = `
        <h3><i class="fas fa-user-plus"></i> Formulario de Registro de Cliente</h3>
        <form id="client-reg-form" class="app-form">
            <input type="hidden" name="analyst" value="${currentUser?.username || ''}">
            <input type="hidden" name="branch" value="${currentUser?.branch || ''}">
            <input type="hidden" name="registeredDate" value="${data.HOY_SIMULADO}">

            <div class="input-group">
                <label for="client-dni">DNI <span class="text-danger">*</span>:</label>
                <div style="display: flex; gap: 10px;">
                     <input type="text" id="client-dni" name="dni" required pattern="\\d{8}" title="DNI debe tener 8 dígitos" style="flex-grow: 1;">
                     <button type="button" id="search-dni-btn" class="btn btn-secondary btn-sm" style="flex-shrink: 0;"><i class="fas fa-search"></i> Consultar</button>
                </div>
                 <div id="dni-spinner" style="display: none; margin-top: 5px;"><i class="fas fa-spinner fa-spin"></i> Consultando...</div>
            </div>
             <div class="input-group">
                <label for="client-name">Nombres y Apellidos <span class="text-danger">*</span>:</label>
                <input type="text" id="client-name" name="name" required readonly>
                 <small>Se autocompleta al consultar DNI.</small>
            </div>
            <div class="input-group">
                <label for="client-birthDate">Fecha de Nacimiento:</label>
                <input type="date" id="client-birthDate" name="birthDate">
            </div>
            <div class="input-group">
                <label for="client-address">Dirección <span class="text-danger">*</span>:</label>
                <input type="text" id="client-address" name="address" required>
            </div>
             <div class="input-group">
                <label for="client-references">Referencias Domicilio (Ej: Cerca a.../Frente a...):</label>
                <textarea id="client-references" name="references" rows="2"></textarea>
            </div>
             <div class="input-group">
                 <label for="client-plusCode">Google Plus Code (Opcional):</label>
                 <input type="text" id="client-plusCode" name="plusCode" placeholder="Ej: 57V4PQR8+2X">
                 <small><a href="https://plus.codes/map" target="_blank">¿Qué es esto? Busca tu código aquí</a></small>
             </div>
            <div class="input-group">
                <label for="client-phone">Teléfono / Celular <span class="text-danger">*</span>:</label>
                <input type="tel" id="client-phone" name="phone" required>
            </div>
             <div class="input-group">
                 <label for="client-facadePhoto">Foto de Fachada <span class="text-danger">*</span>:</label>
                 <input type="file" id="client-facadePhoto" name="facadePhotoUrl" accept="image/*" required>
                 <small>Se simulará el guardado del nombre del archivo.</small>
            </div>
             <div class="input-group">
                 <label for="client-supplyPhoto">Foto de Suministro (Luz/Agua) <span class="text-danger">*</span>:</label>
                 <input type="file" id="client-supplyPhoto" name="supplyPhotoUrl" accept="image/*,application/pdf" required>
                 <small>Recibo reciente que coincida con la dirección. Se simulará guardado.</small>
            </div>
            <div class="input-group">
                <label for="client-dniPhoto">Foto de DNI (Opcional):</label>
                <input type="file" id="client-dniPhoto" name="dniPhotoUrl" accept="image/*">
                 <small>Se simulará el guardado del nombre del archivo.</small>
            </div>
             <div class="input-group"> 
                <label for="client-additional-info">Información Adicional (Opcional):</label>
                <textarea id="client-additional-info" name="additionalInfo" rows="3"></textarea>
            </div>

            <div class="form-actions">
                <button type="submit" id="register-client-submit" class="btn btn-primary" disabled><i class="fas fa-save"></i> Registrar Cliente</button>
                 <small id="register-client-tooltip" style="margin-left:10px; color: var(--grey-color);">Consulta el DNI primero.</small>
            </div>
            <div id="client-reg-error" class="error-message" style="display: none;"></div>
        </form>
    `;

     // --- Lógica Consulta DNI ---
     const dniInput = contentArea.querySelector('#client-dni');
     const nameInput = contentArea.querySelector('#client-name');
     const searchBtn = contentArea.querySelector('#search-dni-btn');
     const spinner = contentArea.querySelector('#dni-spinner');
     const submitBtn = contentArea.querySelector('#register-client-submit');
     const submitTooltip = contentArea.querySelector('#register-client-tooltip');
     const errorDiv = contentArea.querySelector('#client-reg-error');

     searchBtn?.addEventListener('click', async () => {
         const dni = dniInput.value.trim();
         if (!/^\d{8}$/.test(dni)) {
             errorDiv.textContent = 'Ingresa un DNI válido de 8 dígitos.';
             errorDiv.style.display = 'block';
             dniInput.focus();
             return;
         }
         // Validar DNI duplicado ANTES de consultar API
         if (data.dummyData.clients.some(c => c.dni === dni)) {
             errorDiv.textContent = `El DNI ${dni} ya está registrado.`;
             errorDiv.style.display = 'block';
             return;
         }


         spinner.style.display = 'inline-block';
         searchBtn.disabled = true;
         nameInput.value = ''; // Limpiar nombre
         submitBtn.disabled = true; // Deshabilitar registro mientras consulta
         submitTooltip.style.display = 'inline';
         errorDiv.style.display = 'none';

         const apiUrl = `https://apiperu.dev/api/dni/${dni}`;
         // **IMPORTANTE:** Este token es público en el código del frontend.
         // En una aplicación real, la llamada API debería hacerse desde un backend
         // para proteger el token.
         const apiToken = 'ff8324f775b15df4177dd7997f50764f6b352cbb52d94040c3b21821ab1b4af4';

         console.log(`Consultando DNI ${dni} en apiperu.dev...`);

         try {
             // La función fetch se ejecuta en el navegador del usuario
             const response = await fetch(apiUrl, {
                 method: 'GET',
                 headers: {
                     'Accept': 'application/json',
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${apiToken}`
                 }
             });

             if (!response.ok) {
                 // Intentar leer el mensaje de error de la API si existe
                 let errorMsg = `Error ${response.status}: ${response.statusText}`;
                 try {
                     const errorData = await response.json();
                     errorMsg = `Error ${response.status}: ${errorData.message || response.statusText}`;
                 } catch (parseError) { /* Ignorar si no se puede parsear el error */ }
                 throw new Error(errorMsg);
             }

             const result = await response.json();
             console.log("Respuesta API:", result);

             if (result.success && result.data) {
                 const nombreCompleto = `${result.data.nombres || ''} ${result.data.apellido_paterno || ''} ${result.data.apellido_materno || ''}`.trim().replace(/\s+/g, ' '); // Limpiar espacios extra
                 nameInput.value = nombreCompleto;
                 errorDiv.style.display = 'none';
                 submitBtn.disabled = false; // Habilitar registro
                 submitTooltip.style.display = 'none';
                 // Podríamos autocompletar fecha de nacimiento si la API la devolviera
             } else {
                 throw new Error(result.message || 'La API no devolvió datos válidos.');
             }

         } catch (error) {
             console.error("Error en consulta DNI:", error);
             errorDiv.textContent = `Error al consultar DNI: ${error.message}. Por favor, ingresa los nombres manualmente.`;
             errorDiv.style.display = 'block';
             nameInput.readOnly = false; // Permitir ingreso manual si falla la API
             nameInput.focus();
             // Aún permitir registrar si la API falla, pero el nombre será manual
             submitBtn.disabled = false;
             submitTooltip.style.display = 'none';
         } finally {
             spinner.style.display = 'none';
             searchBtn.disabled = false;
         }
     });


    // Listener del formulario (igual que antes, pero ahora con más campos)
    const form = contentArea.querySelector('#client-reg-form');
    form?.addEventListener('submit', (e) => {
         e.preventDefault();
         if(!errorDiv) return;
         errorDiv.textContent = '';
         errorDiv.style.display = 'none';

         // Verificar si el botón submit está habilitado (implica que se consultó DNI o falló la API)
         if(submitBtn.disabled){
             errorDiv.textContent = 'Debes consultar el DNI antes de registrar.';
             errorDiv.style.display = 'block';
             return;
         }

         if (!form.checkValidity()) {
             errorDiv.textContent = 'Por favor completa todos los campos requeridos (*).';
             errorDiv.style.display = 'block';
             form.reportValidity();
             return;
         }

         const formData = new FormData(form);
         const newClientData = {
             name: formData.get('name'), // Nombre obtenido de API o manual
             dni: formData.get('dni'),
             branch: formData.get('branch'),
             analyst: formData.get('analyst'),
             registeredDate: formData.get('registeredDate'),
             birthDate: formData.get('birthDate') || null,
             address: formData.get('address'),
             references: formData.get('references') || null, // Nuevo campo
             phone: formData.get('phone'),
             facadePhotoUrl: formData.get('facadePhotoUrl')?.name ? `images/${formData.get('facadePhotoUrl').name}` : null,
             supplyPhotoUrl: formData.get('supplyPhotoUrl')?.name ? `images/${formData.get('supplyPhotoUrl').name}` : null, // Nuevo campo
             dniPhotoUrl: formData.get('dniPhotoUrl')?.name ? `images/${formData.get('dniPhotoUrl').name}` : null,
             plusCode: formData.get('plusCode') || null,
             additionalInfo: formData.get('additionalInfo') || null, // Nuevo campo
             paymentComments: []
         };

          // Doble verificación DNI duplicado (por si acaso)
          if (data.dummyData.clients.some(c => c.dni === newClientData.dni)) {
               errorDiv.textContent = `El DNI ${newClientData.dni} ya está registrado.`;
               errorDiv.style.display = 'block';
               return;
           }

          try {
               const addedClient = data.addClient(newClientData);
               console.log('Nuevo cliente añadido:', addedClient);
               alert(`Cliente "${addedClient.name}" registrado con ID ${addedClient.id}.`);
               loadClientManagement(contentArea, sectionTitleElement); // Recargar vista gestión
          } catch(error) {
               console.error("Error al registrar cliente:", error);
               errorDiv.textContent = `Error al guardar: ${error.message}`;
               errorDiv.style.display = 'block';
          }
     });
    console.log('Vista Registro de Cliente renderizada con consulta DNI.');
}

/**
 * Carga la tabla de gestión de clientes (Ahora "Cartera de Clientes") con nuevas columnas.
 */
export function loadClientManagement(contentArea, sectionTitleElement) {
     console.log('Cargando vista: Cartera de Clientes');
     const currentUser = getCurrentUser();
     if (!currentUser || currentUser.role !== 'Analista') {
          return ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
     }
     sectionTitleElement.textContent = 'Cartera de Clientes'; // Nuevo nombre

     const myClients = data.dummyData.clients
        .filter(c => c.analyst === currentUser.username && c.branch === currentUser.branch)
        .sort((a,b) => a.name.localeCompare(b.name));

     // Preparar datos para la tabla, incluyendo los nuevos campos calculados
     const clientTableData = myClients.map((client, index) => {
         const clientCredits = data.getClientCreditsCount(client.id);
         const clientDebt = data.getClientTotalDebt(client.id);
         const paymentStatus = data.getClientPaymentStatusInfo(client.id);
         return {
             ...client,
             rowNumber: index + 1, // N°
             creditsCount: clientCredits, // Créditos
             totalDebt: clientDebt, // Deuda Total
             daysOverdue: paymentStatus.status !== 'al-dia' ? paymentStatus.daysOverdue : 0 // Días Atraso
         };
     });


     // Definir columnas con los nuevos campos
     const columns = [
          { key: 'rowNumber', label: 'N°', numeric: true }, // Nuevo
          { key: 'id', label: 'ID Cli.' },
          { key: 'name', label: 'Nombre' },
          { key: 'dni', label: 'DNI' },
          { key: 'creditsCount', label: 'Créditos', numeric: true, center: true }, // Nuevo
          { key: 'totalDebt', label: 'Deuda Total', format: 'currency', numeric: true }, // Nuevo
          { key: 'daysOverdue', label: 'Días Atraso', numeric: true, center: true }, // Nuevo
          { key: 'id', label: 'Estado Pago', format: 'paymentStatus' },
          { key: 'phone', label: 'Teléfono' } // Podríamos quitar dirección para ahorrar espacio
     ];
     // Acciones (ya deberían funcionar con la delegación de ui.js)
     const actions = [
          { label: 'Ver/Editar', class: 'btn-info btn-sm', icon: 'fa-eye', actionKey: 'ver-editar-cliente', idKey: 'id' },
          { label: 'Nuevo Préstamo', class: 'btn-success btn-sm', icon: 'fa-hand-holding-usd', actionKey: 'nuevo-préstamo-cliente', idKey: 'id' },
          { label: 'Nuevo Empeño', class: 'btn-warning btn-sm', icon: 'fa-gem', actionKey: 'nuevo-empeño-cliente', idKey: 'id' }
      ];

      contentArea.innerHTML = `
            <h3><i class="fas fa-address-book"></i> Cartera de Clientes</h3>
            <div id="my-clients-table-container">
                ${ui.renderTable(clientTableData, columns, actions, {
                    defaultMessage: 'No tienes clientes en tu cartera.',
                    tableId: 'my-clients-table',
                    applyPaymentStatusClass: true,
                    showPaymentStatusColumn: true // Mantiene el botón de comentario
                })}
            </div>`;

       console.log('Vista Cartera de Clientes renderizada.');
 }

/**
 * Muestra/Edita los detalles de un cliente en un modal.
 * @param {number} clientId - ID del cliente.
 * @param {boolean} viewOnly - Si es true, deshabilita la edición.
 */
export function viewEditClient(clientId, viewOnly = false) {
       console.log(`Cargando vista ${viewOnly ? 'Ver' : 'Editar'} Cliente ID: ${clientId}`);
       const client = data.getClient(clientId);
       if (!client) { alert(`Error: Cliente con ID ${clientId} no encontrado.`); return; }

        // Obtener servicios asociados al cliente
       const clientServices = data.dummyData.services
            .filter(s => s.clientId === clientId)
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha

       // Preparar tabla de servicios para el modal
       const serviceColumns = [
            { key: 'id', label: 'ID' }, { key: 'type', label: 'Tipo' },
            { key: 'date', label: 'Fecha', format: 'date'},
            { key: 'amount', label: 'Monto/Valor', format: 'currency' },
            { key: 'status', label: 'Estado' },
            // NUEVO: Botones para ver plan de pagos y abonos
            { key: 'id', label: 'Plan Pagos', center: true, format: (id) => `<button class="btn btn-link btn-sm" data-action="ver-plan-pagos" data-id="${id}" title="Ver Plan de Pagos"><i class="fas fa-calendar-alt"></i></button>` },
            { key: 'id', label: 'Abonos', center: true, format: (id) => `<button class="btn btn-link btn-sm" data-action="ver-abonos" data-id="${id}" title="Ver Abonos"><i class="fas fa-money-bill-wave"></i></button>` }
       ];
       const serviceActions = [ { label: 'Ver Detalle', class: 'btn-info btn-sm', icon: 'fa-eye', actionKey: 'ver-detalles-servicio-modal', idKey: 'id' }]; // Acción específica para modal
       const servicesTableHTML = clientServices.length > 0
            ? ui.renderTable(clientServices, serviceColumns, serviceActions, { tableId: `client-${clientId}-services`})
            : '<p><em>Este cliente no tiene servicios registrados.</em></p>';

        // Preparar lista de comentarios
        const commentsHTML = client.paymentComments && client.paymentComments.length > 0
            ? `<ul style="max-height: 150px; overflow-y: auto; border: 1px solid #eee; padding: 10px; border-radius: 4px;">${client.paymentComments.map(c => `<li>${c}</li>`).join('')}</ul>`
            : '<p><em>No hay comentarios de pago registrados.</em></p>';


       // Genera el HTML del formulario/vista
       let clientHTML = `
        <form id="client-edit-form" class="app-form">
             <input type="hidden" name="id" value="${client.id}">
             <div class="row"> <div class="col-md-6"> <h4><i class="fas fa-user-circle"></i> Datos Personales</h4>
                     <div class="input-group">
                         <label for="edit-client-name">Nombres y Apellidos:</label>
                         <input type="text" id="edit-client-name" name="name" value="${client.name || ''}" ${viewOnly ? 'readonly' : 'required'}>
                     </div>
                     <div class="input-group">
                         <label for="edit-client-dni">DNI:</label>
                         <input type="text" id="edit-client-dni" name="dni" value="${client.dni || ''}" readonly> <small>El DNI no se puede modificar.</small>
                     </div>
                     <div class="input-group">
                         <label for="edit-client-birthDate">Fecha de Nacimiento:</label>
                         <input type="date" id="edit-client-birthDate" name="birthDate" value="${client.birthDate || ''}" ${viewOnly ? 'readonly' : ''}>
                     </div>
                     <div class="input-group">
                         <label for="edit-client-phone">Teléfono / Celular:</label>
                         <input type="tel" id="edit-client-phone" name="phone" value="${client.phone || ''}" ${viewOnly ? 'readonly' : 'required'}>
                     </div>
                 </div>
                 <div class="col-md-6"> <h4><i class="fas fa-map-marker-alt"></i> Ubicación y Contacto</h4>
                     <div class="input-group">
                         <label for="edit-client-address">Dirección:</label>
                         <input type="text" id="edit-client-address" name="address" value="${client.address || ''}" ${viewOnly ? 'readonly' : 'required'}>
                     </div>
                     <div class="input-group">
                          <label for="edit-client-plusCode">Google Plus Code:</label>
                          <input type="text" id="edit-client-plusCode" name="plusCode" value="${client.plusCode || ''}" ${viewOnly ? 'readonly' : ''}>
                          <small>${client.plusCode ? `<a href="https://plus.codes/${encodeURIComponent(client.plusCode)}" target="_blank">Ver en mapa</a>` : 'No registrado'}</small>
                     </div>
                     <div class="input-group">
                         <label>Analista Asignado:</label>
                         <input type="text" value="${client.analyst || 'N/A'}" readonly>
                     </div>
                     <div class="input-group">
                         <label>Sucursal:</label>
                         <input type="text" value="${client.branch || 'N/A'}" readonly>
                     </div>
                      <div class="input-group">
                         <label>Fecha Registro:</label>
                         <input type="text" value="${utils.formatDate(client.registeredDate)}" readonly>
                     </div>
                 </div>
             </div>

             <hr><h4><i class="fas fa-camera"></i> Fotos Registradas</h4>
              <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                 <div>
                     <label>Fachada:</label><br>
                     ${client.facadePhotoUrl ? `<img src="${client.facadePhotoUrl}" alt="Fachada" style="max-height: 100px; border: 1px solid #ccc;"> <a href="#" data-action="view-file" data-filename="${client.facadePhotoUrl}" class="icon-link"><i class="fas fa-search-plus"></i></a>` : '<em>No registrada</em>'}
                 </div>
                  <div>
                     <label>DNI:</label><br>
                      ${client.dniPhotoUrl ? `<img src="${client.dniPhotoUrl}" alt="DNI" style="max-height: 100px; border: 1px solid #ccc;"> <a href="#" data-action="view-file" data-filename="${client.dniPhotoUrl}" class="icon-link"><i class="fas fa-search-plus"></i></a>` : '<em>No registrado</em>'}
                 </div>
              </div>
             <hr><h4><i class="fas fa-history"></i> Historial de Servicios</h4>
              ${servicesTableHTML}

               <hr><h4><i class="fas fa-comments"></i> Comentarios de Pago</h4>
               ${commentsHTML}
               <button type="button" class="btn btn-secondary btn-sm add-comment-btn" data-action="add-comment-modal" data-client-id="${client.id}" style="margin-top: 5px;"><i class="fas fa-plus"></i> Añadir Comentario</button>

               <div id="client-edit-error" class="error-message mt-2" style="display: none;"></div>
         </form>`;

       const handleSaveChanges = () => {
             console.log(`Guardando cambios para cliente ID: ${clientId}`);
             const form = document.getElementById('client-edit-form');
             const errorDiv = document.getElementById('client-edit-error');
              if (!form || !errorDiv) return false;
             errorDiv.style.display = 'none';

             if (!viewOnly && !form.checkValidity()) {
                 errorDiv.textContent = 'Verifica los campos requeridos.'; errorDiv.style.display = 'block'; form.reportValidity(); return false;
             }

             const formData = new FormData(form);
             const updatedData = {
                 name: formData.get('name'),
                 birthDate: formData.get('birthDate') || null,
                 address: formData.get('address'),
                 phone: formData.get('phone'),
                 plusCode: formData.get('plusCode') || null,
                 // DNI, analyst, branch, registeredDate no se editan aquí
                 // Fotos y comentarios se manejan por separado
             };

             try {
                const updatedClient = data.updateClient(clientId, updatedData);
                if (updatedClient) {
                    console.log('Cliente actualizado (simulación):', updatedClient);
                    alert('Cambios guardados exitosamente.');
                    ui.closeModal();
                    // Recargar la vista de gestión si es la actual
                    if (ui.getCurrentLoadFunction() === loadClientManagement) {
                        ui.reloadCurrentView();
                    }
                    return true; // Indicar éxito para cerrar modal
                } else {
                     errorDiv.textContent = 'Error: No se pudo actualizar el cliente.'; errorDiv.style.display = 'block'; return false;
                }
             } catch(error) {
                  console.error("Error actualizando cliente:", error);
                  errorDiv.textContent = `Error al guardar: ${error.message}`; errorDiv.style.display = 'block'; return false;
             }
        };

       ui.openModal(
            viewOnly ? `Ver Cliente: ${client.name}` : `Editar Cliente: ${client.name}`,
            clientHTML,
            !viewOnly, // showConfirm (solo si no es viewOnly)
            'Guardar Cambios',
            'large', // modalSize
            !viewOnly ? handleSaveChanges : null // onConfirm callback (solo si no es viewOnly)
       );

        // Añadir listeners específicos del modal para ver detalles de servicio o añadir comentario
        const modalBodyElement = document.getElementById('modal-body'); // Acceder al body del modal
        modalBodyElement?.addEventListener('click', (e) => {
            const target = e.target.closest('button[data-action], a[data-action]');
            if (!target) return;

            const action = target.dataset.action;
            const id = target.dataset.id || target.dataset.clientId;

            if (action === 'ver-detalles-servicio-modal') {
                 e.preventDefault();
                 const serviceId = parseInt(id);
                 console.log(`Desde modal cliente, viendo servicio ID: ${serviceId}`);
                 viewServiceDetails(serviceId);
            } else if (action === 'add-comment-modal') {
                 e.preventDefault();
                 const btnClientId = parseInt(id);
                 console.log(`Desde modal cliente, añadiendo comentario para cliente ID: ${btnClientId}`);
                 addPaymentComment(btnClientId, () => {
                      ui.closeModal();
                      setTimeout(() => viewEditClient(clientId, viewOnly), 150);
                 });
            } else if (action === 'ver-plan-pagos') {
                 e.preventDefault();
                 const serviceId = parseInt(id);
                 serviceMgmt.viewPaymentPlan(serviceId);
            } else if (action === 'ver-abonos') {
                 e.preventDefault();
                 const serviceId = parseInt(id);
                 serviceMgmt.viewPaymentsHistory(serviceId);
            } else if (action === 'view-file') {
                  console.log("Dejando que ui.js maneje view-file desde modal cliente.");
            }
        });
  }

   /**
    * Abre un modal para añadir un comentario de pago a un cliente.
    * @param {number} clientId
    * @param {function} [onCommentAdded=null] - Callback opcional a ejecutar después de añadir.
    */
   export function addPaymentComment(clientId, onCommentAdded = null) {
        console.log(`Abriendo modal para añadir comentario a cliente ID: ${clientId}`);
        const client = data.getClient(clientId);
         if (!client) { alert(`Error: Cliente ${clientId} no encontrado.`); return; }

         const formHTML = `
             <form id="add-comment-form">
                <p>Añadiendo comentario para: <strong>${client.name}</strong></p>
                <div class="input-group">
                    <label for="payment-comment-text">Nuevo Comentario:</label>
                    <textarea id="payment-comment-text" name="comment" rows="3" required></textarea>
                </div>
                 <div id="add-comment-error" class="error-message" style="display: none;"></div>
             </form>`;

         const handleSaveComment = () => {
              const form = document.getElementById('add-comment-form');
              const errorDiv = document.getElementById('add-comment-error');
              const commentText = form?.querySelector('#payment-comment-text')?.value.trim();
              if(!form || !errorDiv) return false;
              errorDiv.style.display = 'none';

              if (!commentText) {
                  errorDiv.textContent = 'El comentario no puede estar vacío.'; errorDiv.style.display = 'block'; return false;
               }

              try {
                   const updatedComments = [...(client.paymentComments || [])]; // Copiar array
                   const commentToAdd = `(${utils.formatDate(new Date().toISOString().slice(0,10))}) ${commentText}`;
                   updatedComments.push(commentToAdd);

                   data.updateClient(clientId, { paymentComments: updatedComments });
                   console.log(`Comentario añadido a cliente ${clientId}: "${commentToAdd}"`);
                   alert('Comentario guardado.');
                   ui.closeModal();

                   // Ejecutar callback si existe (p.ej. para recargar modal cliente)
                    if (typeof onCommentAdded === 'function') {
                        try { onCommentAdded(); } catch (e) { console.error('Error en callback onCommentAdded:', e); }
                    } else if (ui.getCurrentLoadFunction() === loadClientManagement || ui.getCurrentLoadFunction() === loadSupervisorCollection) {
                       // Recargar vista de lista si es la actual para ver el icono de comentario
                       ui.reloadCurrentView();
                    }
                   return true; // Cerrar modal (ya se hizo)
              } catch(error) {
                    console.error("Error guardando comentario:", error);
                    errorDiv.textContent = `Error: ${error.message}`; errorDiv.style.display = 'block'; return false;
              }
         };

         ui.openModal(`Comentario de Pago - ${client.name}`, formHTML, true, 'Guardar Comentario', 'small', handleSaveComment);
   }

   // --- Funciones para iniciar flujo de servicio DESDE cliente ---
   // Estas funciones simplemente llaman a las funciones correspondientes en serviceManagement.js

   export function startLoanForClient(clientId) {
        console.log(`Iniciando flujo préstamo para cliente ID: ${clientId}`);
        if (serviceMgmt && typeof serviceMgmt.loadLoanRequest === 'function') {
             // Asegurarse de pasar el ID del cliente como opción
             serviceMgmt.loadLoanRequest(ui.contentArea, ui.currentSectionTitle, { clientId: clientId });
        } else {
             console.error("serviceManagement.loadLoanRequest no está disponible.");
             alert("Error al iniciar la solicitud de préstamo.");
        }
   }

   export function startPawnForClient(clientId) {
        console.log(`Iniciando flujo empeño para cliente ID: ${clientId}`);
         if (serviceMgmt && typeof serviceMgmt.loadPawnRequest === 'function') {
              // Asegurarse de pasar el ID del cliente como opción
              serviceMgmt.loadPawnRequest(ui.contentArea, ui.currentSectionTitle, { clientId: clientId });
         } else {
              console.error("serviceManagement.loadPawnRequest no está disponible.");
              alert("Error al iniciar la solicitud de empeño.");
         }
   }

   /**
    * Carga la vista de TODOS los clientes para el Supervisor.
    * (Función añadida para el rol Supervisor)
    */
   export function loadAllClientsForSupervisor(contentArea, sectionTitleElement) {
     console.log('Cargando vista: Ver Todos Clientes (Supervisor)');
     const currentUser = getCurrentUser();
     if (!currentUser || currentUser.role !== 'Supervisor') {
          ui.showError(contentArea, sectionTitleElement, 'Acceso no autorizado.');
          return;
     }
     sectionTitleElement.textContent = 'Todos los Clientes Registrados';

     // Filtrar SOLO clientes de la sucursal del supervisor
     const allClients = data.dummyData.clients
        .filter(c => c.branch === currentUser.branch)
        .map(client => {
            // Calcular estado de pago para colorear fila
            const paymentStatus = data.getClientPaymentStatusInfo(client.id);
            return {
                ...client,
                paymentStatusClass: paymentStatus?.status || 'al-dia',
                paymentStatusText: paymentStatus?.statusText || 'Al día'
            };
        })
        .sort((a,b) => a.name.localeCompare(b.name));

     const columns = [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'dni', label: 'DNI' },
          { key: 'branch', label: 'Sucursal' },
          { key: 'analyst', label: 'Analista' },
          { key: 'phone', label: 'Teléfono' },
          { key: 'registeredDate', label: 'Fec. Reg.', format: 'date'},
          { key: 'id', label: 'Estado Pago', format: 'paymentStatus' }
     ];
     const actions = [
          { label: 'Ver Cliente', class: 'btn-info', icon: 'fa-eye', actionKey: 'ver-cliente', idKey: 'id' }
      ];

      contentArea.innerHTML = `
            <h3><i class="fas fa-users"></i> Listado de Clientes de tu Sucursal</h3>
            <p>Solo se muestran los clientes de tu sucursal (<b>${currentUser.branch}</b>).</p>
            <div id="all-clients-table-container">
                ${ui.renderTable(allClients, columns, actions, {
                    defaultMessage: 'No hay clientes registrados en tu sucursal.',
                    tableId: 'all-clients-supervisor-table',
                    applyPaymentStatusClass: true,
                    showPaymentStatusColumn: true
                })}
            </div>`;

       console.log('Vista Todos Clientes (Supervisor) renderizada.');
   }