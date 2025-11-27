# Sistema de Gestión BOM con Google Sheets - Resumen

## 📋 Descripción General

Este sistema permite gestionar información de productos e insumos (Bill of Materials) con sincronización automática a Google Sheets. Incluye:

- ✅ Control de versiones automático
- ✅ Historial de cambios en hoja OBSOLETO
- ✅ Validación de códigos duplicados
- ✅ 3 hojas principales: INFORMACION_INSUMOS, INFORMACION_PRODUCTO, OBSOLETO
- ✅ Sistema de logs para auditoría

## 🎯 Flujo de Trabajo

### Crear Nuevo Registro
1. El usuario completa el formulario en la app
2. La app valida que el código SKU no exista (consulta a Google Sheets)
3. Si es válido, se crea el registro con versión 0
4. Se guarda en la hoja INFORMACION_INSUMOS

### Actualizar Registro
1. El usuario edita un registro existente
2. Al guardar, el sistema:
   - Copia la versión actual a la hoja OBSOLETO
   - Incrementa el número de versión en 1
   - Actualiza el registro en INFORMACION_INSUMOS
3. Todos los registros con el mismo código SKU se actualizan juntos

### Información de Producto
1. Similar al flujo de BOM
2. Se guarda en INFORMACION_PRODUCTO
3. Al actualizar, la versión antigua va a OBSOLETO

## 📊 Estructura de Hojas

### INFORMACION_INSUMOS
| Columna | Descripción |
|---------|-------------|
| ID | Identificador único |
| Versión | Número de versión (0, 1, 2...) |
| Código SKU | Código del producto |
| Descripción SKU | Nombre del producto |
| Categoría Insumo | Tipo de insumo |
| Código Insumo | Código del insumo |
| Descripción Insumo | Nombre del insumo |
| Cantidad Requerida | Cantidad calculada |
| Cantidad Piezas por Caja | Piezas por caja |
| Consumo por Caja | Consumo por caja/pieza |
| Unidad Medida | KG, BOLSAS, UND, etc. |
| Creado Por | Usuario que creó |
| Fecha Creación | Timestamp de creación |
| Actualizado Por | Usuario que actualizó |
| Fecha Actualización | Timestamp de actualización |
| Estado | Activo/Inactivo |

### INFORMACION_PRODUCTO
| Columna | Descripción |
|---------|-------------|
| ID | Identificador único |
| Versión | Número de versión |
| Código | Código del producto |
| Nombre Producto | Nombre del producto |
| Cantidad Paquetes por Caja | Paquetes por caja |
| Peso por Caja | Peso de la caja |
| Peso Promedio por Paquete | Peso promedio |
| Tipo Empaque | THERMOPACK, BULK PACK, etc. |
| Size Empaque | 2X1, 3X1, 2X2 |
| Sala Origen | Sala de producción |
| Creado Por | Usuario que creó |
| Fecha Creación | Timestamp |
| Actualizado Por | Usuario que actualizó |
| Fecha Actualización | Timestamp |

### OBSOLETO
| Columna | Descripción |
|---------|-------------|
| ID | ID único de la entrada obsoleta |
| Versión Anterior | Versión que se reemplazó |
| Tipo | BOM o PRODUCTO |
| Código SKU/Producto | Código del item |
| Datos Antiguos | JSON con datos completos |
| Reemplazado Por | Nueva versión |
| Fecha Obsolescencia | Cuándo se marcó como obsoleto |
| Usuario | Quién hizo el cambio |
| ... | Columnas de BOM/Producto |

## 🔄 APIs Disponibles

### GET Endpoints
- `?action=getBOMRecords` - Obtener todos los registros BOM activos
- `?action=getExistingCodes` - Obtener códigos SKU existentes
- `?action=getProducts` - Obtener todos los productos

### POST Endpoints
- `action: addBOMRecord` - Crear registro BOM
- `action: updateBOMRecord` - Actualizar registro BOM
- `action: deleteBOMRecord` - Eliminar (marcar inactivo) registro BOM
- `action: addProduct` - Crear producto
- `action: updateProduct` - Actualizar producto
- `action: deleteProduct` - Eliminar producto
- `action: getExistingCodes` - Verificar códigos duplicados

## 💡 Características Especiales

### Sistema de Versiones
- Cada registro comienza en versión 0
- Cada actualización incrementa automáticamente la versión
- La versión antigua se preserva en OBSOLETO
- Permite auditoría completa de cambios

### Validación de Duplicados
- Al crear un registro, se consulta getExistingCodes
- Si el código SKU ya existe, se rechaza la creación
- Mantiene la integridad de los datos

### Actualización por Código SKU
- updateBOMRecord usa codigo_sku en vez de id
- Permite actualizar múltiples registros con el mismo SKU
- Todos se incrementan a la misma versión

### Actualización por Código Producto
- updateProduct usa codigo en vez de id
- Mantiene consistencia con el flujo de BOM

## 🚀 Configuración Rápida

1. Copiar Code.gs a Google Apps Script
2. Implementar como Web App (Anyone can access)
3. Copiar URL de implementación
4. Pegar en constants/api.ts
5. ¡Listo para usar!

## 📝 Notas Importantes

- Cada SKU puede tener múltiples registros (diferentes categorías de insumo)
- Al actualizar un SKU, TODOS sus registros se actualizan
- Las versiones antiguas NUNCA se borran, van a OBSOLETO
- Los logs registran toda actividad para debugging
- La app trabaja offline usando AsyncStorage y sincroniza cuando puede

## 🔍 Ejemplo de Uso

```javascript
// Crear registro
POST {
  action: 'addBOMRecord',
  record: {
    id: '123',
    codigo_sku: '1-193',
    descripcion_sku: 'PRODUCTO TEST',
    categoria_insumo: 'Bolsa Master',
    // ...
  }
}

// Actualizar registro (todos los registros con ese SKU)
POST {
  action: 'updateBOMRecord',
  codigo_sku: '1-193',
  updates: {
    consumo_por_caja: 1.5,
    updatedBy: 'Usuario'
  }
}
```

## 📞 Soporte

Para más información, revisar:
- INSTRUCCIONES.txt - Guía paso a paso de configuración
- Code.gs - Código comentado del backend
- constants/api.ts - Configuración del URL
