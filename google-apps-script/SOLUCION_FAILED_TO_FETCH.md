# Solución: Error "Failed to fetch" al actualizar registros

## Problema
Al intentar actualizar un registro desde el módulo de "Actualización de Registros", aparece el error:
```
Error: Failed to fetch
No se pudo conectar con Google Sheets
```

## Causa
Este error ocurre porque el Google Apps Script necesita ser **re-desplegado** cada vez que se hacen cambios en el código. La URL antigua deja de funcionar con las nuevas versiones del script.

## Solución

### Opción 1: Crear una NUEVA implementación (Recomendado)

1. **Abre tu Google Sheets** donde tienes los datos

2. **Ve a Extensiones > Apps Script**

3. **Verifica que el código** (Code.gs) está actualizado con la última versión

4. **Clic en "Implementar" (botón azul arriba a la derecha)**

5. **Selecciona "Nueva implementación"**

6. **Configura la implementación:**
   - Tipo: **Aplicación web**
   - Descripción: `BOM API - v2` (o cualquier nombre)
   - Ejecutar como: **Yo (tu correo)**
   - Quién tiene acceso: **Cualquier persona**

7. **Clic en "Implementar"**

8. **Autoriza el script** si te lo pide (puede pedir autorización nuevamente)

9. **IMPORTANTE: Copia la NUEVA URL** que te da (empieza con `https://script.google.com/macros/s/...`)

10. **Actualiza la URL en tu app React Native:**
    - Abre el archivo `constants/api.ts`
    - Reemplaza `GOOGLE_SCRIPT_URL` con la nueva URL
    - Guarda el archivo

### Opción 2: Actualizar implementación existente

1. **Abre tu Google Sheets** donde tienes los datos

2. **Ve a Extensiones > Apps Script**

3. **Clic en "Implementar" > "Administrar implementaciones"**

4. **Clic en el ícono de editar (lápiz)** en la implementación activa

5. **Cambia "Versión"** de "Head" a **"Nueva versión"**

6. **Agrega una descripción** de la versión (ej: "Fix update records")

7. **Clic en "Implementar"**

8. **La URL seguirá siendo la misma**, pero ahora usará el código actualizado

## Verificación

Después de re-desplegar, prueba lo siguiente:

1. **Refresca tu app** (recarga la página web o reinicia la app)

2. **Intenta actualizar un registro** desde "Actualización de Registros"

3. **Revisa los logs en la consola** para ver si hay errores

4. **Verifica en Google Sheets** que los cambios se guardaron correctamente

## Notas Importantes

- **SIEMPRE** que cambies el código en Google Apps Script, debes crear una nueva implementación o actualizar la existente
- La URL del script **solo cambia** cuando creas una NUEVA implementación
- Si usas la Opción 2, la URL se mantiene igual, por lo que no necesitas actualizar `api.ts`
- **Recomendación:** Usa la Opción 2 (actualizar existente) para evitar tener que cambiar la URL cada vez

## Problemas adicionales

### Si sigue sin funcionar después de re-desplegar:

1. **Verifica la URL** en `constants/api.ts`:
   ```typescript
   export const GOOGLE_SCRIPT_URL = 'TU_URL_AQUI';
   ```

2. **Prueba la URL en el navegador** agregando `?action=getBOMRecords` al final:
   ```
   https://script.google.com/macros/s/TU_ID/exec?action=getBOMRecords
   ```
   
   Deberías ver una respuesta JSON con tus registros.

3. **Revisa los permisos** del script:
   - Asegúrate de que está configurado como "Cualquier persona" puede acceder
   - Verifica que diste todos los permisos cuando autorizaste el script

4. **Limpia el caché** de tu app:
   - En web: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)
   - En móvil: Cierra y vuelve a abrir la app

### Si el error solo ocurre al ACTUALIZAR (pero agregar funciona):

Esto indica que el problema está específicamente en la función `updateBOMRecord`. Verifica:

1. Que el código en `Code.gs` tiene la función `updateBOMRecord` completa
2. Que no hay errores de sintaxis en el Apps Script
3. Revisa los logs en Apps Script (Ejecuciones > Ver registros)

## Contacto de Soporte

Si después de seguir estos pasos el problema persiste, reporta:
1. La URL que estás usando
2. Los mensajes de error en la consola del navegador
3. Los logs de Google Apps Script (Ejecuciones > Ver registros)
