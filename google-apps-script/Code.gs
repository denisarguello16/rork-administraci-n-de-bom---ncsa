const SPREADSHEET_ID = 'PON_AQUI_TU_SPREADSHEET_ID';
const SHEET_NAME = 'BOM'; // Cambia al nombre real de la hoja

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('No se encontró la hoja: ' + SHEET_NAME);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getHeaderRow_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

function getHeaderMap_(sheet) {
  const headerRow = getHeaderRow_(sheet);
  const map = {};
  headerRow.forEach(function (name, idx) {
    if (!name) return;
    const key = String(name).trim();
    if (key) {
      map[key] = idx + 1; // 1-based
    }
  });
  return map;
}

function findColumnIndex_(headerRow, targetName) {
  const targetLower = String(targetName).trim().toLowerCase();
  for (var i = 0; i < headerRow.length; i++) {
    var cell = headerRow[i];
    if (!cell) continue;
    if (String(cell).trim().toLowerCase() === targetLower) {
      return i + 1; // 1-based
    }
  }
  return -1;
}

function doGet(e) {
  try {
    var action = e && e.parameter && e.parameter.action ? e.parameter.action : '';
    if (action === 'getBOMRecords') {
      return handleGetBOMRecords_();
    }
    return jsonResponse({
      success: false,
      error: 'Acción GET no soportada: ' + action,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err),
    });
  }
}

function doPost(e) {
  try {
    var bodyText =
      e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var body = {};
    try {
      body = JSON.parse(bodyText);
    } catch (parseErr) {
      return jsonResponse({
        success: false,
        error:
          'No se pudo parsear el JSON de la petición: ' + String(parseErr),
      });
    }

    var action = body.action;

    if (action === 'addBOMRecord') {
      return handleAddBOMRecord_(body);
    }
    if (action === 'updateBOMRecord') {
      return handleUpdateBOMRecord_(body);
    }
    if (action === 'deleteBOMRecord') {
      return handleDeleteBOMRecord_(body);
    }

    return jsonResponse({
      success: false,
      error: 'Acción POST no soportada: ' + action,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err),
    });
  }
}

function handleGetBOMRecords_() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol === 0) {
    return jsonResponse({
      success: true,
      data: [],
    });
  }

  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var rows = values.slice(1);

  var data = rows
    .map(function (row) {
      var obj = {};
      headers.forEach(function (header, index) {
        if (!header) return;
        var key = String(header).trim();
        if (!key) return;
        obj[key] = row[index];
      });
      return obj;
    })
    .filter(function (record) {
      try {
        if (!record || typeof record !== 'object') return false;

        var descripcion_insumo = record.descripcion_insumo;
        var codigo_sku = record.codigo_sku;
        var descripcion_sku = record.descripcion_sku;
        var categoria_insumo = record.categoria_insumo;

        if (
          typeof descripcion_insumo !== 'string' ||
          !descripcion_insumo.trim()
        )
          return false;
        if (typeof codigo_sku !== 'string' || !codigo_sku.trim()) return false;
        if (typeof descripcion_sku !== 'string' || !descripcion_sku.trim())
          return false;
        if (
          typeof categoria_insumo !== 'string' ||
          !categoria_insumo.trim()
        )
          return false;

        return true;
      } catch (err) {
        Logger.log('Error filtrando registro en handleGetBOMRecords_: ' + err);
        return false;
      }
    });

  return jsonResponse({
    success: true,
    data: data,
  });
}

function handleAddBOMRecord_(body) {
  var record = body && body.record;
  if (!record || typeof record !== 'object') {
    return jsonResponse({
      success: false,
      error: 'Objeto "record" no recibido o inválido en addBOMRecord',
    });
  }

  var sheet = getSheet();
  var headerRow = getHeaderRow_(sheet);
  var lastCol = sheet.getLastColumn();

  var rowValues = [];
  for (var c = 1; c <= lastCol; c++) {
    var headerName = headerRow[c - 1];
    if (!headerName) {
      rowValues.push('');
      continue;
    }
    var key = String(headerName).trim();
    rowValues.push(record.hasOwnProperty(key) ? record[key] : '');
  }

  sheet.appendRow(rowValues);

  return jsonResponse({
    success: true,
  });
}

function handleUpdateBOMRecord_(body) {
  var codigo_sku = body && body.codigo_sku;
  var updates = body && body.updates;

  if (!codigo_sku) {
    return jsonResponse({
      success: false,
      error: 'Falta "codigo_sku" en la petición de updateBOMRecord',
    });
  }

  if (!updates || typeof updates !== 'object') {
    return jsonResponse({
      success: false,
      error:
        'Objeto "updates" no recibido o inválido en updateBOMRecord',
    });
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol === 0) {
    return jsonResponse({
      success: false,
      error: 'La hoja está vacía, no hay registros para actualizar',
    });
  }

  var headerRow = getHeaderRow_(sheet);
  var headerMap = getHeaderMap_(sheet);

  var skuCol = findColumnIndex_(headerRow, 'codigo_sku');
  if (skuCol === -1) {
    return jsonResponse({
      success: false,
      error: 'No se encontró la columna "codigo_sku" en los encabezados',
    });
  }

  var skuBuscar = String(codigo_sku).trim().toLowerCase();
  var targetRow = -1;

  for (var r = 2; r <= lastRow; r++) {
    var cellValue = sheet.getRange(r, skuCol).getValue();
    if (String(cellValue).trim().toLowerCase() === skuBuscar) {
      targetRow = r;
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({
      success: false,
      error: 'No se encontró ningún registro con codigo_sku: ' + codigo_sku,
    });
  }

  Object.keys(updates).forEach(function (key) {
    var col = headerMap[key];
    if (!col) return;
    sheet.getRange(targetRow, col).setValue(updates[key]);
  });

  return jsonResponse({
    success: true,
  });
}

function handleDeleteBOMRecord_(body) {
  var id = body && body.id;
  if (!id) {
    return jsonResponse({
      success: false,
      error: 'Falta "id" en la petición de deleteBOMRecord',
    });
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol === 0) {
    return jsonResponse({
      success: false,
      error: 'La hoja está vacía, no hay registros para eliminar',
    });
  }

  var headerRow = getHeaderRow_(sheet);
  var idCol = findColumnIndex_(headerRow, 'id');
  if (idCol === -1) {
    return jsonResponse({
      success: false,
      error: 'No se encontró la columna "id" en los encabezados',
    });
  }

  var idBuscar = String(id).trim().toLowerCase();
  var targetRow = -1;

  for (var r = 2; r <= lastRow; r++) {
    var cellValue = sheet.getRange(r, idCol).getValue();
    if (String(cellValue).trim().toLowerCase() === idBuscar) {
      targetRow = r;
      break;
    }
  }

  if (targetRow === -1) {
    return jsonResponse({
      success: false,
      error: 'No se encontró ningún registro con id: ' + id,
    });
  }

  sheet.deleteRow(targetRow);

  return jsonResponse({
    success: true,
  });
}
