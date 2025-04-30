// js/modules/utils.js
console.log('Modulo utils.js cargado.');

/**
 * Formatea un número como moneda peruana (S/).
 * @param {number|string|null|undefined} value - El valor a formatear.
 * @returns {string} - El valor formateado como string (e.g., "S/ 1,234.50").
 */
export const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) { return 'S/ 0.00'; }
    return `S/ ${number.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Formatea una cadena de fecha (YYYY-MM-DD) a un formato localizado (DD/MM/YYYY).
 * @param {string|null|undefined} dateString - La cadena de fecha en formato YYYY-MM-DD.
 * @returns {string} - La fecha formateada (e.g., "23/04/2025") o 'Fecha Inválida'.
 */
export const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return 'Fecha Inválida';
    }
    try {
        const date = new Date(dateString + 'T00:00:00Z'); // Usar UTC
        if (isNaN(date.getTime())) { return 'Fecha Inválida'; }
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { return 'Fecha Inválida'; }
};

/**
 * Genera un ID único simple (para datos dummy).
 * @returns {number} Un timestamp numérico.
 */
export const generateUniqueId = () => {
    return Date.now() + Math.floor(Math.random() * 1000); // Añadir aleatorio para mayor unicidad
};

/**
 * Escapa un valor para usarlo de forma segura en un archivo CSV.
 * @param {*} value - El valor a escapar.
 * @returns {string} - El valor escapado y listo para CSV.
 */
export const escapeCSVValue = (value) => {
    if (value === null || value === undefined) { return ''; }
    const stringValue = String(value);
    if (/[",\n\r]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Calcula la diferencia en días entre dos fechas (YYYY-MM-DD).
 * @param {string} date1 - Fecha inicial (YYYY-MM-DD).
 * @param {string} date2 - Fecha final (YYYY-MM-DD).
 * @returns {number} - Número de días de diferencia (puede ser negativo).
 * @example
 *   daysBetween('2025-04-01', '2025-04-10') // 9
 */
export const daysBetween = (date1, date2) => {
    try {
        const d1 = new Date(date1 + 'T00:00:00Z');
        const d2 = new Date(date2 + 'T00:00:00Z');
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return NaN;
        return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
    } catch (e) { return NaN; }
};

/**
 * Valida si un string es un email válido.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
};

/**
 * Valida si un string es un DNI peruano válido (8 dígitos).
 * @param {string} dni
 * @returns {boolean}
 */
export const isValidDNI = (dni) => {
    return /^\d{8}$/.test(dni);
};

/**
 * Normaliza un string para búsquedas insensibles a mayúsculas/minúsculas y tildes.
 * @param {string} str
 * @returns {string}
 */
export const normalizeString = (str) => {
    return (str || '').toLowerCase()
        .normalize('NFD')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Elimina caracteres de control
        .replace(/[\u0300-\u036f]/g, ''); // Elimina tildes
};

/**
 * Realiza una copia profunda de un objeto o array.
 * @param {object|array} obj
 * @returns {object|array}
 */
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};