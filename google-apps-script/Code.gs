const SPREADSHEET_ID = null;

const SHEETS = {
  INFORMACION_INSUMOS: 'INFORMACION_INSUMOS',
  INFORMACION_PRODUCTO: 'INFORMACION_PRODUCTO',
  OBSOLETO: 'OBSOLETO',
  LOGS: 'Logs'
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      var errorBody = {
        success: false,
        error: 'doPost: petición sin body o sin postData.contents'
      };
      return ContentService
        .createTextOutput(JSON.stringify(errorBody))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var bodyText = e.postData.contents;
    var data;

    try {
      data = JSON.parse(bodyText);
    } catch (parseError) {
      var parseResponse = {
        success: false,
        error: 'doPost: error parseando JSON: ' + parseError.toString() + '. Body recibido: ' + bodyText
      };
      return ContentService
        .createTextOutput(JSON.stringify(parseResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var action = data.action;
    var response;

    switch (action) {
      case 'addBOMRecord':
        if (!data.record) {
          response = {
            success: false,
            error: 'doPost: acción "addBOMRecord" recibió un body sin "record". Body: ' + JSON.stringify(data)
          };
        } else {
          response = addBOMRecord(data.record);
        }
        break;

      case 'updateBOMRecord':
        if (!data.id || !data.updates) {
          response = {
            success: false,
            error: 'doPost: acción "updateBOMRecord" requiere "id" y "updates". Body: ' + JSON.stringify(data)
          };
        } else {
          response = updateBOMRecord(data.id, data.updates);
        }
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
        if (!data.product) {
          response = {
            success: false,
            error: 'doPost: acción "addProduct" recibió un body sin "product". Body: ' + JSON.stringify(data)
          };
        } else {
          response = addProduct(data.product);
        }
        break;

      case 'updateProduct':
        if (!data.codigo || !data.updates) {
          response = {
            success: false,
            error: 'doPost: acción "updateProduct" requiere "codigo" y "updates". Body: ' + JSON.stringify(data)
          };
        } else {
          response = updateProduct(data.codigo, data.updates);
        }
        break;

      case 'deleteProduct':
        response = deleteProduct(data.id);
        break;

      case 'getProducts':
        response = getProducts();
        break;

      default:
        response = { success: false, error: 'Acción no reconocida en doPost: ' + action };
    }

    logRequest(action, data, response);

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResponse = { success: false, error: 'Excepción en doPost: ' + error.toString() };
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : null;
    var response;

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
        response = { success: false, error: 'Acción no reconocida en doGet: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorResponse = { success: false, error: 'Excepción en doGet: ' + error.toString() };
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet() {
  if (SPREADSHEET_ID === null) {
    return SpreadsheetApp.getActiveSpreadsheet();
  } else {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
}

function getOrCreateSheet(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);

    if (sheetName === SHEETS.INFORMACION_INSUMOS) {
      sheet.getRange('A1:P1').setValues([[
        'ID', 'Versión', 'Código SKU', 'Descripción SKU', 'Categoría Insumo',
        'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida',
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida',
        'Creado Por', 'Fecha Creación', 'Actualizado Por', 'Fecha Actualización', 'Estado'
      ]]);
      sheet.getRange('A1:P1')
        .setFontWeight('bold')
        .setBackground('#4CAF50')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);

    } else if (sheetName === SHEETS.INFORMACION_PRODUCTO) {
      sheet.getRange('A1:N1').setValues([[
        'ID', 'Versión', 'Código', 'Nombre Producto', 'Cantidad Paquetes por Caja',
        'Peso por Caja', 'Peso Promedio por Paquete', 'Tipo Empaque',
        'Size Empaque', 'Sala Origen', 'Creado Por', 'Fecha Creación',
        'Actualizado Por', 'Fecha Actualización'
      ]]);
      sheet.getRange('A1:N1')
        .setFontWeight('bold')
        .setBackground('#2196F3')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);

    } else if (sheetName === SHEETS.OBSOLETO) {
      sheet.getRange('A1:Q1').setValues([[
        'ID', 'Versión Anterior', 'Tipo', 'Código SKU/Producto', 'Datos Antiguos',
        'Reemplazado Por', 'Fecha Obsolescencia', 'Usuario', 'Código SKU', 'Descripción SKU',
        'Categoría Insumo', 'Código Insumo', 'Descripción Insumo', 'Cantidad Requerida',
        'Cantidad Piezas por Caja', 'Consumo por Caja', 'Unidad Medida'
      ]]);
      sheet.getRange('A1:Q1')
        .setFontWeight('bold')
        .setBackground('#FF5722')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);

    } else if (sheetName === SHEETS.LOGS) {
      sheet.getRange('A1:D1').setValues([[
        'Fecha', 'Acción', 'Datos', 'Respuesta'
      ]]);
      sheet.getRange('A1:D1')
        .setFontWeight('bold')
        .setBackground('#FF9800')
        .setFontColor('#FFFFFF');
      sheet.setFrozenRows(1);
    }
  }

  return sheet;
}

/**
 * BOM
 */
function addBOMRecord(record) {
  try {
    Logger.log('addBOMRecord - payload recibido: ' + JSON.stringify(record));

    if (!record || typeof record !== 'object') {
      return {
        success: false,
        error: 'addBOMRecord: parámetro "record" indefinido o inválido. Valor recibido: ' + JSON.stringify(record)
      };
    }

    var id = record.id || (Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9));
    var version = typeof record.version === 'number' ? record.version : 0;

    var codigo_sku = record.codigo_sku || '';
    var descripcion_sku = record.descripcion_sku || '';
    var categoria_insumo = record.categoria_insumo || '';
    var codigo_insumo = record.codigo_insumo || '';
    var descripcion_insumo = record.descripcion_insumo || '';

    var cantidad_requerida = (typeof record.cantidad_requerida === 'number')
      ? record.cantidad_requerida
      : (record.cantidad_requerida || 0);

    var cantidad_piezas_por_caja = (typeof record.cantidad_piezas_por_caja === 'number')
      ? record.cantidad_piezas_por_caja
      : (record.cantidad_piezas_por_caja || '');

    var consumo_por_caja = (typeof record.consumo_por_caja === 'number')
      ? record.consumo_por_caja
      : (record.consumo_por_caja || '');

    var unidad_medida = record.unidad_medida || '';

    var createdBy = record.createdBy || 'Sistema';
    var createdAt = record.createdAt || new Date().toISOString();
    var updatedBy = record.updatedBy || '';
    var updatedAt = record.updatedAt || '';

    var sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);

    var row = [
      id,
      version,
      codigo_sku,
      descripcion_sku,
      categoria_insumo,
      codigo_insumo,
      descripcion_insumo,
      cantidad_requerida,
      cantidad_piezas_por_caja,
      consumo_por_caja,
      unidad_medida,
      createdBy,
      createdAt,
      updatedBy,
      updatedAt,
      'Activo'
    ];

    Logger.log('addBOMRecord - fila a insertar: ' + JSON.stringify(row));
    sheet.appendRow(row);
    Logger.log('addBOMRecord - registro agregado correctamente con ID: ' + id);

    return {
      success: true,
      message: 'Registro agregado correctamente',
      id: id
    };

  } catch (error) {
    Logger.log('ERROR en addBOMRecord: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function updateBOMRecord(id, updates) {
  try {
    Logger.log('updateBOMRecord - id: ' + id + ', updates: ' + JSON.stringify(updates));

    if (!updates || typeof updates !== 'object') {
      return {
        success: false,
        error: 'updateBOMRecord: parámetro "updates" indefinido o inválido. Valor recibido: ' + JSON.stringify(updates)
      };
    }

    var sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    var obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    var data = sheet.getDataRange().getValues();
    var timestamp = new Date().toISOString();
    var searchId = String(id).trim();

    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][0]).trim();
      var estado = String(data[i][15] || '').trim();
      
      if (rowId === searchId && (estado === 'Activo' || estado === '')) {
        var oldVersion = data[i][1] || 0;
        var newVersion = oldVersion + 1;
        var codigo_sku = data[i][2];

        var obsoleteRow = [
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
        
        SpreadsheetApp.flush();
        
        Logger.log('Registro actualizado correctamente en fila ' + (i + 1) + ', nueva versión: ' + newVersion);
        return { success: true, message: 'Registro actualizado correctamente', version: newVersion };
      }
    }

    return { success: false, error: 'Registro no encontrado con ID: ' + id };

  } catch (error) {
    Logger.log('ERROR en updateBOMRecord: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function deleteBOMRecord(id) {
  try {
    var sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    var data = sheet.getDataRange().getValues();

    Logger.log('========== INICIANDO ELIMINACION BOM ==========');
    Logger.log('ID buscado: "' + id + '" (tipo: ' + (typeof id) + ')');
    Logger.log('Total de filas en hoja: ' + data.length);

    if (data.length <= 1) {
      Logger.log('ERROR: La hoja no tiene registros (solo header)');
      return { success: false, error: 'No hay registros en la hoja' };
    }

    var searchId = String(id).trim();

    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][0]).trim();
      var estado = String(data[i][15] || '').trim();

      if (rowId === searchId) {
        if (estado === 'Inactivo') {
          Logger.log('ADVERTENCIA: Registro ya estaba marcado como Inactivo, se vuelve a marcar');
        }

        sheet.getRange(i + 1, 16).setValue('Inactivo');
        SpreadsheetApp.flush();

        Logger.log('EXITO: Registro marcado como Inactivo en fila ' + (i + 1));
        return { success: true, message: 'Registro eliminado correctamente' };
      }
    }

    Logger.log('ERROR: Registro no encontrado. ID: ' + searchId);
    return {
      success: false,
      error: 'Registro no encontrado. ID buscado: "' + id + '". Total de registros en hoja: ' + (data.length - 1)
    };

  } catch (error) {
    Logger.log('ERROR EXCEPTION en deleteBOMRecord: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getBOMRecords() {
  try {
    var sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    var records = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var estado = String(row[15] || '').trim();

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
    Logger.log('ERROR en getBOMRecords: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getExistingCodes() {
  try {
    var sheet = getOrCreateSheet(SHEETS.INFORMACION_INSUMOS);
    var data = sheet.getDataRange().getValues();

    var codes = {};

    for (var i = 1; i < data.length; i++) {
      var estado = String(data[i][15] || '').trim();
      if (estado === 'Activo' || estado === '') {
        codes[data[i][2]] = true;
      }
    }

    var list = Object.keys(codes);
    return { success: true, data: list };

  } catch (error) {
    Logger.log('ERROR en getExistingCodes: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * PRODUCTOS
 */
function addProduct(product) {
  try {
    Logger.log('addProduct - payload recibido: ' + JSON.stringify(product));

    if (!product || typeof product !== 'object') {
      return {
        success: false,
        error: 'addProduct: parámetro "product" indefinido o inválido. Valor recibido: ' + JSON.stringify(product)
      };
    }

    var id = product.id || (Date.now().toString() + '_prod_' + Math.random().toString(36).substr(2, 9));
    var version = typeof product.version === 'number' ? product.version : 0;

    var codigo = product.codigo || '';
    var nombre_producto = product.nombre_producto || '';
    var cantidad_paquetes_por_caja = product.cantidad_paquetes_por_caja || '';
    var peso_por_caja = product.peso_por_caja || '';
    var peso_promedio_por_paquete = product.peso_promedio_por_paquete || '';
    var tipo_empaque = product.tipo_empaque || '';
    var size_empaque = product.size_empaque || '';
    var sala_origen = product.sala_origen || '';
    var createdBy = product.createdBy || 'Sistema';
    var createdAt = product.createdAt || new Date().toISOString();
    var updatedBy = product.updatedBy || '';
    var updatedAt = product.updatedAt || '';

    var sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);

    var row = [
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
      updatedAt
    ];

    Logger.log('addProduct - fila a insertar: ' + JSON.stringify(row));
    sheet.appendRow(row);

    return {
      success: true,
      message: 'Producto agregado correctamente',
      id: id
    };

  } catch (error) {
    Logger.log('ERROR en addProduct: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function updateProduct(codigo, updates) {
  try {
    Logger.log('updateProduct - codigo: ' + codigo + ', updates: ' + JSON.stringify(updates));

    if (!updates || typeof updates !== 'object') {
      return {
        success: false,
        error: 'updateProduct: parámetro "updates" indefinido o inválido. Valor recibido: ' + JSON.stringify(updates)
      };
    }

    var sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    var obsoleteSheet = getOrCreateSheet(SHEETS.OBSOLETO);
    var data = sheet.getDataRange().getValues();
    var timestamp = new Date().toISOString();

    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][2] === codigo) {
        var oldVersion = data[i][1] || 0;
        var newVersion = oldVersion + 1;

        var obsoleteRow = [
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

    return { success: false, error: 'Producto no encontrado. Codigo buscado: ' + codigo };

  } catch (error) {
    Logger.log('ERROR en updateProduct: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function deleteProduct(id) {
  try {
    var sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    var data = sheet.getDataRange().getValues();

    Logger.log('deleteProduct - ID buscado: ' + id);

    if (data.length <= 1) {
      return { success: false, error: 'No hay productos en la hoja' };
    }

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        Logger.log('deleteProduct - Producto eliminado en fila ' + (i + 1));
        return { success: true, message: 'Producto eliminado correctamente' };
      }
    }

    return { success: false, error: 'Producto no encontrado. ID buscado: ' + id };

  } catch (error) {
    Logger.log('ERROR en deleteProduct: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

function getProducts() {
  try {
    var sheet = getOrCreateSheet(SHEETS.INFORMACION_PRODUCTO);
    var data = sheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: true, data: [] };
    }

    var products = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
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
    Logger.log('ERROR en getProducts: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * LOGS
 */
function logRequest(action, data, response) {
  try {
    var sheet = getOrCreateSheet(SHEETS.LOGS);
    var timestamp = new Date().toISOString();

    sheet.appendRow([
      timestamp,
      action,
      JSON.stringify(data),
      JSON.stringify(response)
    ]);
  } catch (error) {
    Logger.log('ERROR al registrar log: ' + error.toString());
  }
}
