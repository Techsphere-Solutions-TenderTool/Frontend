// JSDoc typedefs only—no runtime code

/**
 * @typedef {Object} EtendersRelease
 * @property {string} [id]
 * @property {string} [ocid]
 * @property {{ title?: string, description?: string }} [tender]
 * @property {any} [buyer]
 * @property {any} [awards]
 * @property {any} [parties]
 * @property {any} [planning]
 * @property {any} [contracts]
 */

/**
 * @typedef {Object} EtendersResponse
 * @property {number} page
 * @property {number} pageSize
 * @property {string} dateFrom
 * @property {string} dateTo
 * @property {number} count
 * @property {boolean} hasMore
 * @property {number|null} nextPage
 * @property {EtendersRelease[]} releases
 */
