/**************************************************
 * CONFIGURACIÓN DEL SCRIPT
 **************************************************/

/**
 * ID del archivo de Google Sheets
 * - Si el script está vinculado al Sheets (Extensiones > Apps Script): Dejar en null
 * - Si el script es independiente: Colocar el ID del archivo entre comillas
 */
const SPREADSHEET_ID = null; // Si es independiente, pon aquí el ID del archivo.

/**
 * Nombres de las hojas
 */
const SHEETS = {
  INFORMACION_INSUMOS: 'INFORMACION_INSUMOS',
  INFORMACION_PRODUCTO: 'INFORMACION_PRODUCTO',
  OBSOLETO: 'OBSOLETO',
  LOGS: 'Logs',
};

/**************************************************
 * FUNCIONES PRINCIPALES (doPost / doGet)
 **************************************************/

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({
        success: false,
        error: 'Petición POST sin cuerpo (e.postData.contents vacío)',
      });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse({
        success: false,
        error: 'Error parseando JSON en doPost: ' + parseError,
      });
    }

    const action = data.action;
    if (!action) {
      return jsonResponse({
        success: false,
        error: 'Acción no especificada en el cuerpo de la petición',
      });
    }

    let response;

    switch (action) {
      case 'addBOMRecord':
        response = addBOMRecord(data.record);
        break;

      case 'updateBOMRecord':
        response = updateBOMRecord(data.codigo_sku, data.updates);
        break;

      case 'deleteBOMRecord':
        response = deleteBOMRecord(data.id);
        break;

      case 'getBOMRecords':
        response = getBOMRecords();
        break;

      case 'getExistingCodes':
        response = getExistingCodes();
        break;

      case 'addProduct':
        response = addProduct(data.product);
        break;

      case 'updateProduct':
        response = updateProduct(data.codigo, data.updates);
        break;

      case 'deleteProduct':
        response = deleteProduct(data.id);
        break;

      case 'getProducts':
        response = getProducts();
        break;

      default:
        response = { success: false, error: 'Acción no reconocida: ' + action };
    }

    logRequest(action, data, response);
    return jsonResponse(response);
  } catch (error) {
    const errorResponse = { success: false, error: 'Error en doPost: ' + error };
    Logger.log(errorResponse.error);
    return jsonResponse(errorResponse);
  }
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action;
    if (!action) {
      return jsonResponse({
        success: false,
        error: 'Acción no especificada en parámetros (GET)',
      });
    }

    let response;

    switch (action) {
      case 'getBOMRecords':
        response = getBOMRecords();
        break;

      case 'getExistingCodes':
        response = getExistingCodes();
        break;

      case 'getProducts':
        response = getProducts();
        break;

      default:
        response = { success: false, error: 'Acción no reconocida (GET): ' + action };
    }

    return jsonResponse(response);
  } catch (error) {
    const errorResponse = { success: false, error: 'Error en doGet: ' + error };
    Logger.log(errorResponse.error);
    return jsonResponse(errorResponse);
  }
}

/**************************************************
 * UTILIDADES GENERALES
 **************************************************/

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  if (SPREADSHEET_ID === null) {
    return SpreadsheetApp.getActiveSpreadsheet();
  } else {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    if (sheetName === SHEETS.INFORMACION_INSUMOS) {
      sheet.getRange('A1:P1').setValues([[
        'ID', 'Versión', 'Código SKU', 'Descripción SKU', 'Categoría Insumo',
        'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida',
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida',
        'Creado Por', 'Fecha Creación', 'Actualizado Por', 'Fecha Actualización', 'Estado',
      ]]);
      sheet.getRange('A1:P1').setFontWeight('bold').setBackground('#4CAF50').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.INFORMACION_PRODUCTO) {
      sheet.getRange('A1:N1').setValues([[
        'ID', 'Versión', 'Código', 'Nombre Producto', 'Cantidad Paquetes por Caja',
        'Peso por Caja', 'Peso Promedio por Paquete', 'Tipo Empaque',
        'Size Empaque', 'Sala Origen', 'Creado Por', 'Fecha Creación',
        'Actualizado Por', 'Fecha Actualización',
      ]]);
      sheet.getRange('A1:N1').setFontWeight('bold').setBackground('#2196F3').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.OBSOLETO) {
      sheet.getRange('A1:Q1').setValues([[
        'ID', 'Versión Anterior', 'Tipo', 'Código SKU/Producto', 'Datos Antiguos',
        'Reemplazado Por', 'Fecha Obsolescencia', 'Usuario', 'Código SKU', 'Descripción SKU',
        'Categoría Insumo', 'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida',
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida',
      ]]);
      sheet.getRange('A1:Q1').setFontWeight('bold').setBackground('#FF5722').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.LOGS) {
      sheet.getRange('A1:D1').setValues([[
        'Fecha', 'Acción', 'Datos', 'Respuesta',
      ]]);
      sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#FF9800').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**************************************************
 * FUNCIONES PARA BOM (INFORMACION_INSUMOS)
 **************************************************/

/**
 * Agregar un registro BOM (robusto, sin riesgo de .descripcion_insumo sobre undefined)
 */
function addBOMRecord(record) {
  try {
    if (!record || typeof record !== 'object') {
      const detalle = record === undefined
        ? 'undefined'
        : record === null
          ? 'null'
          : JSON.stringify(record);
      return {
        success: false,
        error: 'Parámetro "record" inválido o ausente en addBOMRecord. Valor recibido: ' + detalle,
      };
    }

    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);

    const id = record.id || (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9));
    const codigo_sku = record.codigo_sku || '';
    const descripcion_sku = record.descripcion_sku || '';
    const categoria_insumo = record.categoria_insumo || '';
    const codigo_insumo = record.codigo_insumo || '';
    const descripcion_insumo = record.descripcion_insumo || '';

    const cantidad_requerida = Number(record.cantidad_requerida) || 0;
    const cantidad_piezas_por_caja = Number(record.cantidad_piezas_por_caja) || 0;
    const consumo_por_caja = Number(record.consumo_por_caja) || 0;

    const unidad_medida = record.unidad_medida || '';
    const createdBy = record.createdBy || 'Sistema';
    const createdAt = record.createdAt || new Date().toISOString();
    const updatedBy = record.updatedBy || '';
    const updatedAt = record.updatedAt || '';

    const row = [
      id,                       // A
      0,                        // B - versión
      codigo_sku,               // C
      descripcion_sku,          // D
      categoria_insumo,         // E
      codigo_insumo,            // F
      descripcion_insumo,       // G
      cantidad_requerida,       // H
      cantidad_piezas_por_caja, // I
      consumo_por_caja,         // J
      unidad_medida,            // K
      createdBy,                // L
      createdAt,                // M
      updatedBy,                // N
      updatedAt,                // O
      'Activo',                 // P
    ];

    sheet.appendRow(row);

    return {
      success: true,
      message: 'Registro agregado correctamente',
      id: id,
    };
  } catch (error) {
    Logger.log('Error en addBOMRecord: ' + error);
    return { success: false, error: 'Error en addBOMRecord: ' + error };
  }
}

/**
 * Actualizar un registro BOM (robusto) y mover versión antigua a OBSOLETO
 */
function updateBOMRecord(codigo_sku, updates) {
  try {
    if (!codigo_sku) {
      return {
        success: false,
        error: 'Parámetro "codigo_sku" requerido en updateBOMRecord',
      };
    }

    if (!updates || typeof updates !== 'object') {
      const detalle = updates === undefined
        ? 'undefined'
        : updates === null
          ? 'null'
          : JSON.stringify(updates);

      return {
        success: false,
        error: 'Parámetro "updates" inválido o ausente en updateBOMRecord. Valor recibido: ' + detalle,
      };
    }

    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    const data = sheet.getDataRange().getValues();
    const timestamp = new Date().toISOString();
    const updatedBy = updates.updatedBy || 'Sistema';

    let updatedCount = 0;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const estado = String(row[15] || '').trim();

      if (row[2] === codigo_sku && estado !== 'Inactivo') {
        const oldVersion = row[1] || 0;
        const newVersion = oldVersion + 1;

        const obsoleteRow = [
          Date.now().toString() + '_' + i,
          oldVersion,
          'BOM',
          codigo_sku,
          JSON.stringify({
            categoria_insumo: row[4],
            codigo_insumo: row[5],
            descripcion_insumo: row[6],
            cantidad_requerida: row[7],
            cantidad_piezas_por_caja: row[8],
            consumo_por_caja: row[9],
            unidad_medida: row[10],
          }),
          'Versión ' + newVersion,
          timestamp,
          updatedBy,
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          row[10],
        ];

        obsoleteSheet.appendRow(obsoleteRow);

        sheet.getRange(i + 1, 2).setValue(newVersion);

        if ('codigo_sku' in updates) sheet.getRange(i + 1, 3).setValue(updates.codigo_sku);
        if ('descripcion_sku' in updates) sheet.getRange(i + 1, 4).setValue(updates.descripcion_sku);
        if ('categoria_insumo' in updates) sheet.getRange(i + 1, 5).setValue(updates.categoria_insumo);
        if ('codigo_insumo' in updates) sheet.getRange(i + 1, 6).setValue(updates.codigo_insumo);
        if ('descripcion_insumo' in updates) sheet.getRange(i + 1, 7).setValue(updates.descripcion_insumo);
        if ('cantidad_requerida' in updates) sheet.getRange(i + 1, 8).setValue(updates.cantidad_requerida);
        if ('cantidad_piezas_por_caja' in updates) sheet.getRange(i + 1, 9).setValue(updates.cantidad_piezas_por_caja);
        if ('consumo_por_caja' in updates) sheet.getRange(i + 1, 10).setValue(updates.consumo_por_caja);
        if ('unidad_medida' in updates) sheet.getRange(i + 1, 11).setValue(updates.unidad_medida);

        sheet.getRange(i + 1, 14).setValue(updatedBy);
        sheet.getRange(i + 1, 15).setValue(timestamp);

        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      return {
        success: true,
        message: updatedCount + ' registro(s) actualizado(s) correctamente',
      };
    }

    return {
      success: false,
      error: 'Registro BOM no encontrado para código SKU: ' + codigo_sku,
    };
  } catch (error) {
    Logger.log('Error en updateBOMRecord: ' + error);
    return { success: false, error: 'Error en updateBOMRecord: ' + error };
  }
}

/**
 * Marcar un registro BOM como Inactivo (eliminar lógico)
 */
function deleteBOMRecord(id) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const data = sheet.getDataRange().getValues();

    Logger.log('========== INICIANDO ELIMINACION BOM ==========');
    Logger.log('ID buscado: "' + id + '" (tipo: ' + typeof id + ')');

    if (data.length <= 1) {
      return { success: false, error: 'No hay registros en la hoja' };
    }

    const searchId = String(id).trim();

    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][0]).trim();
      const estado = String(data[i][15] || '').trim();

      if (rowId === searchId) {
        sheet.getRange(i + 1, 16).setValue('Inactivo');
        SpreadsheetApp.flush();
        Logger.log('EXITO: Registro marcado como Inactivo en fila ' + (i + 1));
        return { success: true, message: 'Registro eliminado correctamente' };
      }
    }

    Logger.log('ERROR: Registro no encontrado para ID: ' + id);
    return {
      success: false,
      error: 'Registro no encontrado. ID buscado: "' + id + '"',
    };
  } catch (error) {
    Logger.log('ERROR en deleteBOMRecord: ' + error);
    return { success: false, error: 'Error en deleteBOMRecord: ' + error };
  }
}

/**
 * Obtener todos los registros BOM activos
 */
function getBOMRecords() {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const records = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const estado = String(row[15] || '').trim();

      if (estado !== 'Inactivo') {
        records.push({
          id: row[0],
          version: row[1],
          codigo_sku: row[2],
          descripcion_sku: row[3],
          categoria_insumo: row[4],
          codigo_insumo: row[5],
          descripcion_insumo: row[6],
          cantidad_requerida: row[7],
          cantidad_piezas_por_caja: row[8],
          consumo_por_caja: row[9],
          unidad_medida: row[10],
          createdBy: row[11],
          createdAt: row[12],
          updatedBy: row[13],
          updatedAt: row[14],
        });
      }
    }

    return { success: true, data: records };
  } catch (error) {
    Logger.log('Error en getBOMRecords: ' + error);
    return { success: false, error: 'Error en getBOMRecords: ' + error };
  }
}

/**
 * Obtener códigos de SKU existentes (solo Activos o sin estado)
 */
function getExistingCodes() {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const data = sheet.getDataRange().getValues();
    const codes = new Set();

    for (let i = 1; i < data.length; i++) {
      const estado = String(data[i][15] || '').trim();
      if (estado === 'Activo' || estado === '') {
        if (data[i][2]) {
          codes.add(data[i][2]);
        }
      }
    }

    return { success: true, data: Array.from(codes) };
  } catch (error) {
    Logger.log('Error en getExistingCodes: ' + error);
    return { success: false, error: 'Error en getExistingCodes: ' + error };
  }
}

/**************************************************
 * FUNCIONES PARA PRODUCTOS (INFORMACION_PRODUCTO)
 **************************************************/

function addProduct(product) {
  try {
    if (!product || typeof product !== 'object') {
      const detalle = product === undefined
        ? 'undefined'
        : product === null
          ? 'null'
          : JSON.stringify(product);
      return {
        success: false,
        error: 'Parámetro "product" inválido en addProduct: ' + detalle,
      };
    }

    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);

    const id = product.id || (Date.now().toString() + '_prod_' + Math.random().toString(36).substr(2, 9));
    const version = 0;
    const codigo = product.codigo || '';
    const nombre_producto = product.nombre_producto || '';
    const cantidad_paquetes_por_caja = Number(product.cantidad_paquetes_por_caja) || 0;
    const peso_por_caja = Number(product.peso_por_caja) || 0;
    const peso_promedio_por_paquete = Number(product.peso_promedio_por_paquete) || 0;
    const tipo_empaque = product.tipo_empaque || '';
    const size_empaque = product.size_empaque || '';
    const sala_origen = product.sala_origen || '';
    const createdBy = product.createdBy || 'Sistema';
    const createdAt = product.createdAt || new Date().toISOString();
    const updatedBy = product.updatedBy || '';
    const updatedAt = product.updatedAt || '';

    const row = [
      id,
      version,
      codigo,
      nombre_producto,
      cantidad_paquetes_por_caja,
      peso_por_caja,
      peso_promedio_por_paquete,
      tipo_empaque,
      size_empaque,
      sala_origen,
      createdBy,
      createdAt,
      updatedBy,
      updatedAt,
    ];

    sheet.appendRow(row);

    return { success: true, message: 'Producto agregado correctamente', id: id };
  } catch (error) {
    Logger.log('Error en addProduct: ' + error);
    return { success: false, error: 'Error en addProduct: ' + error };
  }
}

function updateProduct(codigo, updates) {
  try {
    if (!codigo) {
      return { success: false, error: 'Parámetro "codigo" requerido en updateProduct' };
    }

    if (!updates || typeof updates !== 'object') {
      const detalle = updates === undefined
        ? 'undefined'
        : updates === null
          ? 'null'
          : JSON.stringify(updates);
      return {
        success: false,
        error: 'Parámetro "updates" inválido en updateProduct: ' + detalle,
      };
    }

    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    const obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    const data = sheet.getDataRange().getValues();
    const timestamp = new Date().toISOString();
    const updatedBy = updates.updatedBy || 'Sistema';

    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[2] === codigo) {
        const oldVersion = row[1] || 0;
        const newVersion = oldVersion + 1;

        const obsoleteRow = [
          Date.now().toString() + '_prod_' + i,
          oldVersion,
          'PRODUCTO',
          codigo,
          JSON.stringify({
            nombre_producto: row[3],
            cantidad_paquetes_por_caja: row[4],
            peso_por_caja: row[5],
            peso_promedio_por_paquete: row[6],
            tipo_empaque: row[7],
            size_empaque: row[8],
            sala_origen: row[9],
          }),
          'Versión ' + newVersion,
          timestamp,
          updatedBy,
          '', '', '', '', '', '', '', '', '',
        ];

        obsoleteSheet.appendRow(obsoleteRow);

        sheet.getRange(i + 1, 2).setValue(newVersion);
        if ('codigo' in updates) sheet.getRange(i + 1, 3).setValue(updates.codigo);
        if ('nombre_producto' in updates) sheet.getRange(i + 1, 4).setValue(updates.nombre_producto);
        if ('cantidad_paquetes_por_caja' in updates) sheet.getRange(i + 1, 5).setValue(updates.cantidad_paquetes_por_caja);
        if ('peso_por_caja' in updates) sheet.getRange(i + 1, 6).setValue(updates.peso_por_caja);
        if ('peso_promedio_por_paquete' in updates) sheet.getRange(i + 1, 7).setValue(updates.peso_promedio_por_paquete);
        if ('tipo_empaque' in updates) sheet.getRange(i + 1, 8).setValue(updates.tipo_empaque);
        if ('size_empaque' in updates) sheet.getRange(i + 1, 9).setValue(updates.size_empaque);
        if ('sala_origen' in updates) sheet.getRange(i + 1, 10).setValue(updates.sala_origen);

        sheet.getRange(i + 1, 13).setValue(updatedBy);
        sheet.getRange(i + 1, 14).setValue(timestamp);

        return { success: true, message: 'Producto actualizado correctamente' };
      }
    }

    return {
      success: false,
      error: 'Producto no encontrado. Código buscado: ' + codigo,
    };
  } catch (error) {
    Logger.log('Error en updateProduct: ' + error);
    return { success: false, error: 'Error en updateProduct: ' + error };
  }
}

function deleteProduct(id) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: 'Producto eliminado correctamente' };
      }
    }

    return {
      success: false,
      error: 'Producto no encontrado. ID buscado: ' + id,
    };
  } catch (error) {
    Logger.log('Error en deleteProduct: ' + error);
    return { success: false, error: 'Error en deleteProduct: ' + error };
  }
}

function getProducts() {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    const data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    const products = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      products.push({
        id: row[0],
        version: row[1],
        codigo: row[2],
        nombre_producto: row[3],
        cantidad_paquetes_por_caja: row[4],
        peso_por_caja: row[5],
        peso_promedio_por_paquete: row[6],
        tipo_empaque: row[7],
        size_empaque: row[8],
        sala_origen: row[9],
        createdBy: row[10],
        createdAt: row[11],
        updatedBy: row[12],
        updatedAt: row[13],
      });
    }

    return { success: true, data: products };
  } catch (error) {
    Logger.log('Error en getProducts: ' + error);
    return { success: false, error: 'Error en getProducts: ' + error };
  }
}

/**************************************************
 * LOGS
 **************************************************/

function logRequest(action, data, response) {
  try {
    const sheet = getOrCreateSheet(SHEETS.LOGS);
    const timestamp = new Date().toISOString();

    sheet.appendRow([
      timestamp,
      action,
      JSON.stringify(data),
      JSON.stringify(response),
    ]);
  } catch (error) {
    Logger.log('Error al registrar log: ' + error);
  }
}
