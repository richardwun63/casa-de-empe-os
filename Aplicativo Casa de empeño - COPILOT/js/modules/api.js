// js/modules/api.js
// API mock para centralizar operaciones de datos. Si hay backend, reemplazar aquí.
import * as data from './data.js';

console.log('Modulo api.js cargado.');

// --- Usuarios ---
export function getUsers() {
    return data.dummyData.users;
}
export function getUser(username) {
    return data.getUser(username);
}
export function addUser(user) {
    return data.addUser(user);
}
export function updateUser(username, updates) {
    return data.updateUser(username, updates);
}
export function deleteUser(username) {
    return data.deleteUserByUsername(username);
}

// --- Servicios ---
export function getServices() {
    return data.dummyData.services;
}
export function getService(id) {
    return data.getService(id);
}
export function addService(service) {
    return data.addService(service);
}
export function updateService(id, updates) {
    return data.updateService(id, updates);
}
export function deleteService(id) {
    // Implementar si es necesario
}

// --- Sucursales ---
export function getBranches() {
    return data.dummyData.branches;
}
export function getBranch(id) {
    return data.getBranch(id);
}
export function addBranch(branch) {
    // Implementar si es necesario
}
export function updateBranch(id, updates) {
    // Implementar si es necesario
}
export function deleteBranch(id) {
    // Implementar si es necesario
}

// --- Pagos ---
export function getPayments(serviceId) {
    const service = data.getService(serviceId);
    return service?.payments || [];
}
export function addPayment(serviceId, payment) {
    // Implementar si es necesario
}

// --- Gastos ---
export function getExpenses() {
    return data.dummyData.expenses;
}
export function addExpense(expense) {
    // Implementar si es necesario
}

// --- Configuración ---
export function getSettings() {
    // Leer de localStorage o data.js
}
export function updateSettings(settings) {
    // Guardar en localStorage o data.js
}

// --- Ejemplo de función para futuro backend ---
// export async function fetchUsersFromBackend() {
//     const res = await fetch('/api/users');
//     return await res.json();
// }
