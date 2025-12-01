import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BOMRecord, BOMFormData } from '@/types/bom';
import { GOOGLE_SCRIPT_URL } from '@/constants/api';

const STORAGE_KEY = '@bom_records';
const USER_KEY = '@current_user';

export const [BOMContext, useBOM] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<string>('');

  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(USER_KEY);
      return stored || '';
    }
  });

  const recordsQuery = useQuery({
    queryKey: ['bomRecords'],
    queryFn: async () => {
      console.log('Cargando registros desde Google Sheets...');
      
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL + '?action=getBOMRecords', {
          method: 'GET',
        });

        const result = await response.json();
        console.log('Respuesta de Google Sheets:', result);

        if (result.success && result.data) {
          const validRecords = result.data.filter((record: any) => {
            try {
              if (!record || typeof record !== 'object') {
                console.log('Registro null/undefined o no es objeto:', record);
                return false;
              }
              if (!record.descripcion_insumo || typeof record.descripcion_insumo !== 'string' || record.descripcion_insumo.trim() === '') {
                console.log('Registro sin descripcion_insumo válida:', JSON.stringify(record));
                return false;
              }
              if (!record.codigo_sku || typeof record.codigo_sku !== 'string' || record.codigo_sku.trim() === '') {
                console.log('Registro sin codigo_sku válido:', JSON.stringify(record));
                return false;
              }
              if (!record.descripcion_sku || typeof record.descripcion_sku !== 'string' || record.descripcion_sku.trim() === '') {
                console.log('Registro sin descripcion_sku válida:', JSON.stringify(record));
                return false;
              }
              if (!record.categoria_insumo || typeof record.categoria_insumo !== 'string' || record.categoria_insumo.trim() === '') {
                console.log('Registro sin categoria_insumo válida:', JSON.stringify(record));
                return false;
              }
              return true;
            } catch (error) {
              console.error('Error al validar registro:', error, record);
              return false;
            }
          });
          
          console.log(`Registros válidos cargados desde Google Sheets: ${validRecords.length}`);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(validRecords));
          return validRecords;
        }

        console.log('No se pudieron cargar registros de Google Sheets, usando cache local');
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const cachedRecords = stored ? JSON.parse(stored) : [];
        return cachedRecords.filter((record: any) => {
          try {
            return record && 
              typeof record === 'object' &&
              record.descripcion_insumo && 
              typeof record.descripcion_insumo === 'string' &&
              record.descripcion_insumo.trim() !== '' &&
              record.codigo_sku && 
              typeof record.codigo_sku === 'string' &&
              record.codigo_sku.trim() !== '' &&
              record.descripcion_sku && 
              typeof record.descripcion_sku === 'string' &&
              record.descripcion_sku.trim() !== '' &&
              record.categoria_insumo &&
              typeof record.categoria_insumo === 'string' &&
              record.categoria_insumo.trim() !== '';
          } catch (error) {
            console.error('Error filtrando registro del cache:', error);
            return false;
          }
        });
      } catch (error) {
        console.error('Error al cargar desde Google Sheets, usando cache local:', error);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const cachedRecords = stored ? JSON.parse(stored) : [];
        return cachedRecords.filter((record: any) => {
          try {
            return record && 
              typeof record === 'object' &&
              record.descripcion_insumo && 
              typeof record.descripcion_insumo === 'string' &&
              record.descripcion_insumo.trim() !== '' &&
              record.codigo_sku && 
              typeof record.codigo_sku === 'string' &&
              record.codigo_sku.trim() !== '' &&
              record.descripcion_sku && 
              typeof record.descripcion_sku === 'string' &&
              record.descripcion_sku.trim() !== '' &&
              record.categoria_insumo &&
              typeof record.categoria_insumo === 'string' &&
              record.categoria_insumo.trim() !== '';
          } catch (error) {
            console.error('Error filtrando registro del cache en catch:', error);
            return false;
          }
        });
      }
    },
    refetchInterval: 30000,
  });

  const saveUserMutation = useMutation({
    mutationFn: async (userName: string) => {
      await AsyncStorage.setItem(USER_KEY, userName);
      return userName;
    },
    onSuccess: (userName) => {
      setCurrentUser(userName);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

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
            record: newRecord
          })
        });

        const result = await response.json();
        console.log('Respuesta de Google Sheets:', result);

        if (!result.success) {
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
    }
  });

  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BOMFormData> }) => {
      const records: BOMRecord[] = recordsQuery.data || [];
      const recordToUpdate = records.find(r => r.id === id);
      
      if (!recordToUpdate) {
        throw new Error('Registro no encontrado');
      }

      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser
      };

      console.log('========== INICIANDO ACTUALIZACION ==========');
      console.log('ID del registro:', id);
      console.log('Código SKU:', recordToUpdate.codigo_sku);
      console.log('Actualizaciones:', JSON.stringify(updates, null, 2));

      try {
        const requestBody = {
          action: 'updateBOMRecord',
          codigo_sku: recordToUpdate.codigo_sku,
          updates
        };
        
        console.log('Request body completo:', JSON.stringify(requestBody, null, 2));
        console.log('URL destino:', GOOGLE_SCRIPT_URL);
        console.log('Enviando petición...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const responseText = await response.text();
        console.log('Response text (first 200 chars):', responseText.substring(0, 200));

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error parseando JSON:', parseError);
          console.error('Response completo:', responseText);
          throw new Error('Respuesta inválida del servidor');
        }

        console.log('Respuesta parseada:', JSON.stringify(result, null, 2));

        if (!result.success) {
          throw new Error(result.error || 'Error al actualizar en Google Sheets');
        }

        const updated = records.map(record => 
          record.id === id 
            ? { ...record, ...updates } 
            : record
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('========== ACTUALIZACION EXITOSA ==========');
        return updated;
      } catch (error) {
        console.error('========== ERROR EN ACTUALIZACION ==========');
        console.error('Tipo de error:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Mensaje:', error instanceof Error ? error.message : String(error));
        console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
        
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error('La petición tardó demasiado tiempo. Verifica tu conexión a internet.');
          }
          if (error.message.includes('Failed to fetch')) {
            throw new Error('No se pudo conectar con Google Sheets.\n\nPosibles causas:\n• El script no está desplegado\n• La URL del script es incorrecta\n• No hay conexión a internet\n• El script necesita re-desplegarse\n\nURL actual: ' + GOOGLE_SCRIPT_URL);
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
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('========== INICIANDO ELIMINACION EN APP ==========');
      console.log('ID a eliminar:', id);
      console.log('Tipo de ID:', typeof id);
      
      const records: BOMRecord[] = recordsQuery.data || [];
      console.log('Total de registros locales:', records.length);
      
      const recordToDelete = records.find(r => r.id === id);
      
      if (!recordToDelete) {
        console.error('ERROR: Registro no encontrado localmente con ID:', id);
        console.log('IDs disponibles localmente:', records.map(r => r.id).slice(0, 5));
        throw new Error('Registro no encontrado localmente');
      }

      console.log('Registro encontrado localmente:');
      console.log('  - ID:', recordToDelete.id);
      console.log('  - Código SKU:', recordToDelete.codigo_sku);
      console.log('  - Descripción:', recordToDelete.descripcion_sku);

      console.log('Enviando petición a Google Sheets...');
      console.log('URL:', GOOGLE_SCRIPT_URL);
      console.log('Payload:', JSON.stringify({ action: 'deleteBOMRecord', id: String(id) }));

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteBOMRecord',
            id: String(id)
          })
        });

        if (!response.ok) {
          console.error('ERROR HTTP:', response.status, response.statusText);
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Respuesta recibida de Google Sheets:', JSON.stringify(result));

        if (!result.success) {
          console.error('ERROR: Google Sheets retornó success=false');
          console.error('Mensaje de error:', result.error);
          throw new Error(result.error || 'Error al eliminar en Google Sheets');
        }

        console.log('EXITO: Registro eliminado en Google Sheets');
        
        const updated = records.filter(record => record.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('Cache local actualizado. Registros restantes:', updated.length);
        console.log('========== ELIMINACION COMPLETADA ==========');
        return updated;
      } catch (error) {
        console.error('========== ERROR EN ELIMINACION ==========');
        console.error('Tipo de error:', error instanceof Error ? error.message : String(error));
        console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
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
    }
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
