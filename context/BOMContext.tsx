import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BOMRecord, BOMFormData } from '@/types/bom';
import { GOOGLE_SCRIPT_URL } from '@/constants/api';

const STORAGE_KEY = '@bom_records';
const USER_KEY = '@current_user';

// ---------- HELPERS DE VALIDACIÓN ----------

const isValidBOMRecord = (record: any): record is BOMRecord => {
  try {
    if (!record || typeof record !== 'object') return false;

    const {
      descripcion_insumo,
      codigo_sku,
      descripcion_sku,
      categoria_insumo,
    } = record as any;

    if (typeof descripcion_insumo !== 'string' || !descripcion_insumo.trim()) return false;
    if (typeof codigo_sku !== 'string' || !codigo_sku.trim()) return false;
    if (typeof descripcion_sku !== 'string' || !descripcion_sku.trim()) return false;
    if (typeof categoria_insumo !== 'string' || !categoria_insumo.trim()) return false;

    return true;
  } catch (error) {
    console.error('Error validando BOMRecord:', error, record);
    return false;
  }
};

const sanitizeRecords = (input: any): BOMRecord[] => {
  if (!Array.isArray(input)) return [];
  return input.filter(isValidBOMRecord);
};

// ---------- CONTEXTO ----------

export const [BOMContext, useBOM] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<string>('');

  // Usuario actual (solo nombre)
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_KEY);
        return stored || '';
      } catch (error) {
        console.error('Error loading user from storage:', error);
        return '';
      }
    },
    retry: 1,
  });

  // Registros del BOM
  const recordsQuery = useQuery({
    queryKey: ['bomRecords'],
    queryFn: async () => {
      console.log('Cargando registros desde Google Sheets...');

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 25000);

        const response = await fetch(GOOGLE_SCRIPT_URL + '?action=getBOMRecords', {
          method: 'GET',
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        const result = await response.json();
        console.log('Respuesta de Google Sheets:', result);

        if (result.success && result.data) {
          const validRecords = sanitizeRecords(result.data);
          console.log(
            `Registros válidos cargados desde Google Sheets: ${validRecords.length}`
          );
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validRecords));
          return validRecords;
        }

        console.warn(
          'No se pudieron cargar registros válidos de Google Sheets (success=false), usando cache local'
        );
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error(
            'Error al cargar desde Google Sheets, usando cache local:',
            error
          );
        }
      }

      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const cached = stored ? JSON.parse(stored) : [];
        const validCached = sanitizeRecords(cached);
        console.log(
          `Registros válidos cargados desde cache local: ${validCached.length}`
        );
        return validCached;
      } catch (error) {
        console.error('Error loading from local cache:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 60000,
  });

  // Guardar usuario
  const saveUserMutation = useMutation({
    mutationFn: async (userName: string) => {
      await AsyncStorage.setItem(USER_KEY, userName);
      return userName;
    },
    onSuccess: (userName) => {
      setCurrentUser(userName);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  // Crear registro
const addRecordMutation = useMutation({
  mutationFn: async (data: BOMFormData) => {
    const newRecord: BOMRecord = {
      ...data,
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
      version: 0,
      createdAt: new Date().toISOString(),
    };

    console.log('Enviando registro a Google Sheets:', newRecord);

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addBOMRecord',
          record: newRecord,   // 🔴 IMPORTANTE: la clave DEBE ser "record"
        }),
      });

      const result = await response.json();
      console.log('Respuesta de Google Sheets:', result);

      if (!result.success) {
        // Aquí verás el mensaje que devuelve el Apps Script
        throw new Error(result.error || 'Error al guardar en Google Sheets');
      }

      const records: BOMRecord[] = recordsQuery.data || [];
      const updated = [...records, newRecord];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error('Error al enviar a Google Sheets:', error);
      throw error;
    }
  },
  onSuccess: (updated) => {
    queryClient.setQueryData(['bomRecords'], updated);
  },
  onError: (error) => {
    console.error('Error en addRecordMutation:', error);
  },
});


  // Actualizar registro
  const updateRecordMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<BOMFormData>;
    }) => {
      const records: BOMRecord[] = recordsQuery.data || [];
      const recordToUpdate = records.find((r) => r.id === id);

      if (!recordToUpdate) {
        throw new Error('Registro no encontrado');
      }

      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
      };

      console.log('========== INICIANDO ACTUALIZACION ==========');
      console.log('ID del registro:', id);
      console.log('Código SKU:', recordToUpdate.codigo_sku);
      console.log('Actualizaciones:', JSON.stringify(updates, null, 2));

      try {
        const requestBody = {
          action: 'updateBOMRecord',
          id: id,
          updates,
        };

        console.log(
          'Request body completo (updateBOMRecord):',
          JSON.stringify(requestBody, null, 2)
        );
        console.log('URL destino:', GOOGLE_SCRIPT_URL);
        console.log('Enviando petición...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 25000);

        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const responseText = await response.text();
        console.log(
          'Response text (primeros 200 chars):',
          responseText.substring(0, 200)
        );

        let result: any;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parseando JSON:', parseError);
          console.error('Response completo:', responseText);
          throw new Error('Respuesta inválida del servidor');
        }

        console.log(
          'Respuesta parseada (updateBOMRecord):',
          JSON.stringify(result, null, 2)
        );

        if (!result.success) {
          console.error(
            'Error devuelto por Apps Script (updateBOMRecord):',
            result.error
          );
          throw new Error('Error al actualizar en Google Sheets');
        }

        const updated = sanitizeRecords(
          records.map((record) =>
            record.id === id ? { ...record, ...updates } : record
          )
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('========== ACTUALIZACION EXITOSA ==========');
        return updated;
      } catch (error: any) {
        console.error('========== ERROR EN ACTUALIZACION ==========');
        console.error(
          'Tipo de error:',
          error instanceof Error ? error.constructor.name : typeof error
        );
        console.error(
          'Mensaje:',
          error instanceof Error ? error.message : String(error)
        );
        console.error(
          'Stack:',
          error instanceof Error ? error.stack : 'N/A'
        );

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(
              'La petición tardó demasiado tiempo. Verifica tu conexión a internet.'
            );
          }
          if (error.message.includes('Failed to fetch')) {
            throw new Error(
              'No se pudo conectar con Google Sheets.\n\nPosibles causas:\n• El script no está desplegado\n• La URL del script es incorrecta\n• No hay conexión a internet\n• El script necesita re-desplegarse\n\nURL actual: ' +
                GOOGLE_SCRIPT_URL
            );
          }
        }
        throw error;
      }
    },
    onSuccess: (updated) => {
      console.log('onSuccess: Actualizando cache');
      queryClient.setQueryData(['bomRecords'], updated);
    },
    onError: (error) => {
      console.error('onError: Error en updateRecordMutation:', error);
    },
  });

  // Eliminar registro
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('========== INICIANDO ELIMINACION EN APP ==========');
      console.log('ID a eliminar:', id);
      console.log('Tipo de ID:', typeof id);

      const records: BOMRecord[] = recordsQuery.data || [];
      console.log('Total de registros locales:', records.length);

      const recordToDelete = records.find((r) => r.id === id);

      if (!recordToDelete) {
        console.error(
          'ERROR: Registro no encontrado localmente con ID:',
          id
        );
        console.log(
          'IDs disponibles localmente:',
          records.map((r) => r.id).slice(0, 5)
        );
        throw new Error('Registro no encontrado localmente');
      }

      console.log('Registro encontrado localmente:');
      console.log('  - ID:', recordToDelete.id);
      console.log('  - Código SKU:', recordToDelete.codigo_sku);
      console.log('  - Descripción:', recordToDelete.descripcion_sku);

      console.log('Enviando petición a Google Sheets...');
      console.log('URL:', GOOGLE_SCRIPT_URL);
      console.log(
        'Payload:',
        JSON.stringify({ action: 'deleteBOMRecord', id: String(id) })
      );

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteBOMRecord',
            id: String(id),
          }),
        });

        if (!response.ok) {
          console.error('ERROR HTTP:', response.status, response.statusText);
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        console.log(
          'Respuesta recibida de Google Sheets (deleteBOMRecord):',
          JSON.stringify(result)
        );

        if (!result.success) {
          console.error(
            'ERROR: Google Sheets retornó success=false en deleteBOMRecord'
          );
          console.error('Mensaje de error:', result.error);
          throw new Error('Error al eliminar en Google Sheets');
        }

        console.log('EXITO: Registro eliminado en Google Sheets');

        const updated = sanitizeRecords(
          records.filter((record) => record.id !== id)
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log(
          'Cache local actualizado. Registros restantes:',
          updated.length
        );
        console.log('========== ELIMINACION COMPLETADA ==========');
        return updated;
      } catch (error: any) {
        console.error('========== ERROR EN ELIMINACION ==========');
        console.error(
          'Tipo de error:',
          error instanceof Error ? error.message : String(error)
        );
        console.error(
          'Stack:',
          error instanceof Error ? error.stack : 'N/A'
        );
        throw error;
      }
    },
    onSuccess: async (updated) => {
      console.log('onSuccess: Actualizando cache de React Query');
      queryClient.setQueryData(['bomRecords'], updated);
      console.log('onSuccess: Solicitando refetch de registros');
      await queryClient.refetchQueries({ queryKey: ['bomRecords'] });
      console.log('onSuccess: Refetch completado');
    },
    onError: (error) => {
      console.error('onError: Error en deleteRecordMutation:', error);
    },
  });

  const login = (userName: string) => {
    saveUserMutation.mutate(userName);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    setCurrentUser('');
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  };

  return {
    currentUser: userQuery.data || currentUser,
    isLoadingUser: userQuery.isLoading,
    records: recordsQuery.data || [],
    isLoadingRecords: recordsQuery.isLoading,
    login,
    logout,
    addRecord: addRecordMutation.mutate,
    addRecordAsync: addRecordMutation.mutateAsync,
    updateRecord: updateRecordMutation.mutate,
    deleteRecord: deleteRecordMutation.mutate,
    isAddingRecord: addRecordMutation.isPending,
    isUpdatingRecord: updateRecordMutation.isPending,
    isDeletingRecord: deleteRecordMutation.isPending,
  };
});
