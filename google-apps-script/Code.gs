/**
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 
 * OPCIÓN A: Script vinculado al Google Sheets (RECOMENDADO)
 * 1. Abrir el Google Sheets donde quieres guardar los datos
 * 2. Ir a Extensiones > Apps Script
 * 3. Copiar y pegar este código completo
 * 4. NO necesitas modificar SPREADSHEET_ID (déjalo en null)
 * 5. Hacer clic en "Implementar" > "Nueva implementación"
 * 6. Seleccionar tipo: "Aplicación web"
 * 7. Configurar:
 *    - Descripción: "BOM API"
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Cualquier persona"
 * 8. Hacer clic en "Implementar"
 * 9. Copiar el URL de la aplicación web
 * 10. En tu app React Native, reemplazar GOOGLE_SCRIPT_URL con ese URL
 * 
 * OPCIÓN B: Script independiente (requiere ID del Sheets)
 * 1. Ir a https://script.google.com
 * 2. Crear un nuevo proyecto
 * 3. Copiar y pegar este código completo
 * 4. En tu Google Sheets, copia el ID de la URL (está entre /d/ y /edit)
 *    Por ejemplo: https://docs.google.com/spreadsheets/d/ABC123xyz/edit
 *    El ID es: ABC123xyz
 * 5. En la línea 48, reemplaza null con el ID entre comillas:
 *    const SPREADSHEET_ID = 'ABC123xyz';
 * 6. Hacer clic en "Implementar" > "Nueva implementación"
 * 7. Seleccionar tipo: "Aplicación web"
 * 8. Configurar:
 *    - Descripción: "BOM API"
 *    - Ejecutar como: "Yo"
 *    - Quién tiene acceso: "Cualquier persona"
 * 9. Hacer clic en "Implementar"
 * 10. Copiar el URL de la aplicación web
 * 11. En tu app React Native, reemplazar GOOGLE_SCRIPT_URL con ese URL
 * 
 * IMPORTANTE: Cada vez que hagas cambios en este script, debes crear una NUEVA implementación
 * o actualizar la versión existente para que los cambios surtan efecto.
 */

/**
 * ID del archivo de Google Sheets
 * - Si el script está vinculado al Sheets (Extensiones > Apps Script): Dejar en null
 * - Si el script es independiente: Colocar el ID del archivo entre comillas
 * 
 * Para obtener el ID del archivo:
 * 1. Abre tu Google Sheets
 * 2. Copia la URL que aparece en el navegador
 * 3. El ID está entre /d/ y /edit
 *    Ejemplo: https://docs.google.com/spreadsheets/d/ABC123xyz/edit
 *    ID = 'ABC123xyz'
 */
const SPREADSHEET_ID = null; // Cambia null por tu ID: 'ABC123xyz'

// Nombre de las hojas en el documento de Google Sheets
const SHEETS = {
  INFORMACION_INSUMOS: 'INFORMACION_INSUMOS',
  INFORMACION_PRODUCTO: 'INFORMACION_PRODUCTO',
  OBSOLETO: 'OBSOLETO',
  LOGS: 'Logs'
};

/**
 * Función principal que maneja las peticiones POST
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let response;
    
    switch(action) {
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
        response = { success: false, error: 'Acción no reconocida' };
    }
    
    logRequest(action, data, response);
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    const errorResponse = { success: false, error: error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Función que maneja las peticiones GET
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    let response;
    
    switch(action) {
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
        response = { success: false, error: 'Acción no reconocida' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    const errorResponse = { success: false, error: error.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtiene el objeto Spreadsheet según la configuración
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID === null) {
    // Script vinculado al Sheets
    return SpreadsheetApp.getActiveSpreadsheet();
  } else {
    // Script independiente con ID específico
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

/**
 * Obtiene o crea una hoja específica
 */
function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    
    // Configurar encabezados según el tipo de hoja
    if (sheetName === SHEETS.INFORMACION_INSUMOS) {
      sheet.getRange('A1:P1').setValues([[
        'ID', 'Versión', 'Código SKU', 'Descripción SKU', 'Categoría Insumo', 
        'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida', 
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida',
        'Creado Por', 'Fecha Creación', 'Actualizado Por', 'Fecha Actualización', 'Estado'
      ]]);
      sheet.getRange('A1:P1').setFontWeight('bold').setBackground('#4CAF50').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.INFORMACION_PRODUCTO) {
      sheet.getRange('A1:N1').setValues([[
        'ID', 'Versión', 'Código', 'Nombre Producto', 'Cantidad Paquetes por Caja',
        'Peso por Caja', 'Peso Promedio por Paquete', 'Tipo Empaque',
        'Size Empaque', 'Sala Origen', 'Creado Por', 'Fecha Creación',
        'Actualizado Por', 'Fecha Actualización'
      ]]);
      sheet.getRange('A1:N1').setFontWeight('bold').setBackground('#2196F3').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.OBSOLETO) {
      sheet.getRange('A1:Q1').setValues([[
        'ID', 'Versión Anterior', 'Tipo', 'Código SKU/Producto', 'Datos Antiguos',
        'Reemplazado Por', 'Fecha Obsolescencia', 'Usuario', 'Código SKU', 'Descripción SKU',
        'Categoría Insumo', 'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida',
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida'
      ]]);
      sheet.getRange('A1:Q1').setFontWeight('bold').setBackground('#FF5722').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    } else if (sheetName === SHEETS.LOGS) {
      sheet.getRange('A1:D1').setValues([['Fecha', 'Acción', 'Datos', 'Respuesta']]);
      sheet.getRange('A1:D1').setFontWeight('bold').setBackground('#FF9800').setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }
  
  return sheet;
}

/**
 * Agregar un registro BOM
 */
function addBOMRecord(record) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    
    const row = [
      record.id,
      0,
      record.codigo_sku,
      record.descripcion_sku,
      record.categoria_insumo,
      record.codigo_insumo,
      record.descripcion_insumo,
      record.cantidad_requerida,
      record.cantidad_piezas_por_caja,
      record.consumo_por_caja,
      record.unidad_medida,
      record.createdBy,
      record.createdAt,
      record.updatedBy || '',
      record.updatedAt || '',
      'Activo'
    ];
    
    sheet.appendRow(row);
    
    return { success: true, message: 'Registro agregado correctamente', id: record.id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Actualizar un registro BOM - Mueve la info antigua a OBSOLETO
 */
function updateBOMRecord(codigo_sku, updates) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    const data = sheet.getDataRange().getValues();
    const timestamp = new Date().toISOString();
    
    let updatedCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][2] === codigo_sku && data[i][15] === 'Activo') {
        const oldVersion = data[i][1] || 0;
        const newVersion = oldVersion + 1;
        
        const obsoleteRow = [
          Date.now().toString() + '_' + i,
          oldVersion,
          'BOM',
          codigo_sku,
          JSON.stringify({
            categoria_insumo: data[i][4],
            codigo_insumo: data[i][5],
            descripcion_insumo: data[i][6],
            cantidad_requerida: data[i][7],
            cantidad_piezas_por_caja: data[i][8],
            consumo_por_caja: data[i][9],
            unidad_medida: data[i][10]
          }),
          'Versión ' + newVersion,
          timestamp,
          updates.updatedBy || 'Sistema',
          data[i][2],
          data[i][3],
          data[i][4],
          data[i][5],
          data[i][6],
          data[i][7],
          data[i][8],
          data[i][9],
          data[i][10]
        ];
        
        obsoleteSheet.appendRow(obsoleteRow);
        
        sheet.getRange(i + 1, 2).setValue(newVersion);
        if (updates.codigo_sku !== undefined) sheet.getRange(i + 1, 3).setValue(updates.codigo_sku);
        if (updates.descripcion_sku !== undefined) sheet.getRange(i + 1, 4).setValue(updates.descripcion_sku);
        if (updates.categoria_insumo !== undefined) sheet.getRange(i + 1, 5).setValue(updates.categoria_insumo);
        if (updates.codigo_insumo !== undefined) sheet.getRange(i + 1, 6).setValue(updates.codigo_insumo);
        if (updates.descripcion_insumo !== undefined) sheet.getRange(i + 1, 7).setValue(updates.descripcion_insumo);
        if (updates.cantidad_requerida !== undefined) sheet.getRange(i + 1, 8).setValue(updates.cantidad_requerida);
        if (updates.cantidad_piezas_por_caja !== undefined) sheet.getRange(i + 1, 9).setValue(updates.cantidad_piezas_por_caja);
        if (updates.consumo_por_caja !== undefined) sheet.getRange(i + 1, 10).setValue(updates.consumo_por_caja);
        if (updates.unidad_medida !== undefined) sheet.getRange(i + 1, 11).setValue(updates.unidad_medida);
        sheet.getRange(i + 1, 14).setValue(updates.updatedBy || 'Sistema');
        sheet.getRange(i + 1, 15).setValue(timestamp);
        
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      return { success: true, message: updatedCount + ' registro(s) actualizado(s) correctamente' };
    }
    
    return { success: false, error: 'Registro no encontrado' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Eliminar un registro BOM (marcado como inactivo)
 */
function deleteBOMRecord(id) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const data = sheet.getDataRange().getValues();
    
    Logger.log('========== INICIANDO ELIMINACION BOM ==========');
    Logger.log('ID buscado: "' + id + '" (tipo: ' + typeof id + ')');
    Logger.log('Total de filas en hoja: ' + data.length);
    
    if (data.length <= 1) {
      Logger.log('ERROR: La hoja no tiene registros (solo header)');
      return { success: false, error: 'No hay registros en la hoja' };
    }
    
    Logger.log('Iniciando búsqueda en ' + (data.length - 1) + ' registros...');
    
    const searchId = String(id).trim();
    
    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][0]).trim();
      const estado = String(data[i][15] || '').trim();
      
      if (i <= 5 || rowId === searchId) {
        Logger.log('Fila ' + i + ': ID="' + rowId + '", Estado="' + estado + '", Match=' + (rowId === searchId));
      }
      
      if (rowId === searchId) {
        if (estado === 'Inactivo') {
          Logger.log('ADVERTENCIA: Registro ya estaba marcado como Inactivo, pero se volverá a marcar');
        }
        
        sheet.getRange(i + 1, 16).setValue('Inactivo');
        
        const verification = sheet.getRange(i + 1, 16).getValue();
        Logger.log('EXITO: Registro marcado como Inactivo en fila ' + (i + 1));
        Logger.log('Verificación - Estado actual en celda: "' + verification + '"');
        
        SpreadsheetApp.flush();
        
        return { success: true, message: 'Registro eliminado correctamente' };
      }
    }
    
    Logger.log('ERROR: Registro no encontrado después de revisar todas las filas');
    Logger.log('Primeros 10 IDs en hoja:');
    for (let i = 1; i < Math.min(11, data.length); i++) {
      Logger.log('  Fila ' + i + ': "' + data[i][0] + '" | Estado: "' + data[i][15] + '"');
    }
    
    return { 
      success: false, 
      error: 'Registro no encontrado. ID buscado: "' + id + '". Total de registros en hoja: ' + (data.length - 1) + '. Verifique los logs para más detalles.' 
    };
  } catch (error) {
    Logger.log('ERROR EXCEPTION: ' + error.toString());
    return { success: false, error: error.toString() };
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
          updatedAt: row[14]
        });
      }
    }
    
    return { success: true, data: records };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Obtener códigos SKU existentes
 */
function getExistingCodes() {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    const data = sheet.getDataRange().getValues();
    
    const codes = new Set();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][15] === 'Activo' || data[i][15] === '') {
        codes.add(data[i][2]);
      }
    }
    
    return { success: true, data: Array.from(codes) };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Agregar un producto
 */
function addProduct(product) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    
    const row = [
      product.id,
      0,
      product.codigo,
      product.nombre_producto,
      product.cantidad_paquetes_por_caja,
      product.peso_por_caja,
      product.peso_promedio_por_paquete,
      product.tipo_empaque,
      product.size_empaque,
      product.sala_origen,
      product.createdBy,
      product.createdAt,
      product.updatedBy || '',
      product.updatedAt || ''
    ];
    
    sheet.appendRow(row);
    
    return { success: true, message: 'Producto agregado correctamente', id: product.id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Actualizar un producto - Mueve la info antigua a OBSOLETO
 */
function updateProduct(codigo, updates) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    const obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    const data = sheet.getDataRange().getValues();
    const timestamp = new Date().toISOString();
    
    Logger.log('Buscando producto con codigo: ' + codigo);
    Logger.log('Total de filas en hoja: ' + data.length);
    
    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }
    
    for (let i = 1; i < data.length; i++) {
      Logger.log('Comparando con fila ' + i + ', codigo en hoja: "' + data[i][2] + '"');
      if (data[i][2] === codigo) {
        const oldVersion = data[i][1] || 0;
        const newVersion = oldVersion + 1;
        
        const obsoleteRow = [
          Date.now().toString() + '_prod_' + i,
          oldVersion,
          'PRODUCTO',
          codigo,
          JSON.stringify({
            nombre_producto: data[i][3],
            cantidad_paquetes_por_caja: data[i][4],
            peso_por_caja: data[i][5],
            peso_promedio_por_paquete: data[i][6],
            tipo_empaque: data[i][7],
            size_empaque: data[i][8],
            sala_origen: data[i][9]
          }),
          'Versión ' + newVersion,
          timestamp,
          updates.updatedBy || 'Sistema',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ''
        ];
        
        obsoleteSheet.appendRow(obsoleteRow);
        
        sheet.getRange(i + 1, 2).setValue(newVersion);
        if (updates.codigo !== undefined) sheet.getRange(i + 1, 3).setValue(updates.codigo);
        if (updates.nombre_producto !== undefined) sheet.getRange(i + 1, 4).setValue(updates.nombre_producto);
        if (updates.cantidad_paquetes_por_caja !== undefined) sheet.getRange(i + 1, 5).setValue(updates.cantidad_paquetes_por_caja);
        if (updates.peso_por_caja !== undefined) sheet.getRange(i + 1, 6).setValue(updates.peso_por_caja);
        if (updates.peso_promedio_por_paquete !== undefined) sheet.getRange(i + 1, 7).setValue(updates.peso_promedio_por_paquete);
        if (updates.tipo_empaque !== undefined) sheet.getRange(i + 1, 8).setValue(updates.tipo_empaque);
        if (updates.size_empaque !== undefined) sheet.getRange(i + 1, 9).setValue(updates.size_empaque);
        if (updates.sala_origen !== undefined) sheet.getRange(i + 1, 10).setValue(updates.sala_origen);
        sheet.getRange(i + 1, 13).setValue(updates.updatedBy || 'Sistema');
        sheet.getRange(i + 1, 14).setValue(timestamp);
        
        return { success: true, message: 'Producto actualizado correctamente' };
      }
    }
    
    Logger.log('Producto no encontrado. Codigos disponibles:');
    for (let i = 1; i < data.length; i++) {
      Logger.log('Fila ' + i + ': "' + data[i][2] + '"');
    }
    
    return { success: false, error: 'Producto no encontrado. Codigo buscado: ' + codigo };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Eliminar un producto
 */
function deleteProduct(id) {
  try {
    const sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    const data = sheet.getDataRange().getValues();
    
    Logger.log('Buscando producto para eliminar con ID: ' + id);
    Logger.log('Total de filas en hoja: ' + data.length);
    
    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }
    
    for (let i = 1; i < data.length; i++) {
      Logger.log('Comparando con fila ' + i + ', ID en hoja: "' + data[i][0] + '" (tipo: ' + typeof data[i][0] + ')');
      
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        Logger.log('Producto encontrado y eliminado en fila ' + (i + 1));
        return { success: true, message: 'Producto eliminado correctamente' };
      }
    }
    
    Logger.log('Producto no encontrado. IDs disponibles:');
    for (let i = 1; i < data.length; i++) {
      Logger.log('Fila ' + i + ': "' + data[i][0] + '"');
    }
    
    return { success: false, error: 'Producto no encontrado. ID buscado: ' + id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Obtener todos los productos
 */
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
        updatedAt: row[13]
      });
    }
    
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Registrar las peticiones en la hoja de logs
 */
function logRequest(action, data, response) {
  try {
    const sheet = getOrCreateSheet(SHEETS.LOGS);
    const timestamp = new Date().toISOString();
    
    sheet.appendRow([
      timestamp,
      action,
      JSON.stringify(data),
      JSON.stringify(response)
    ]);
  } catch (error) {
    // Si hay error al registrar el log, no lo propagamos
    console.error('Error al registrar log:', error);
  }
}
