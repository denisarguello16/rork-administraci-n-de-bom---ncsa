import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BOMRecord, BOMFormData } from '@/types/bom';
import { GOOGLE_SCRIPT_URL } from '@/constants/api';

const STORAGE_KEY = '@bom_records';
const CURRENT_USER_KEY = '@current_user';

export const [BOMContext, useBOM] = createContextHook(() => {
  const queryClient = useQueryClient();

  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return stored || 'Usuario';
    },
  });

  const recordsQuery = useQuery({
    queryKey: ['bom-records'],
    queryFn: async () => {
      console.log('Cargando registros BOM desde Google Sheets...');
      
      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBOM`);
        const result = await response.json();
        
        console.log('Respuesta de Google Sheets (BOM):', result);
        
        if (result.success && result.data) {
          console.log(`Registros BOM cargados desde Google Sheets: ${result.data.length}`);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
          return result.data;
        } else {
          console.log('No se pudieron cargar registros BOM de Google Sheets, usando cache local');
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          return stored ? JSON.parse(stored) : [];
        }
      } catch (error) {
        console.error('Error al cargar registros BOM desde Google Sheets, usando cache local:', error);
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      }
    },
    refetchInterval: 30000,
  });

  const addRecordMutation = useMutation({
    mutationFn: async (data: BOMFormData) => {
      const newRecord: BOMRecord = {
        ...data,
        id: Date.now().toString(),
        version: 0,
        createdAt: new Date().toISOString(),
      };

      console.log('========== ENVIANDO REGISTRO BOM A GOOGLE SHEETS ==========');
      console.log('URL:', GOOGLE_SCRIPT_URL);
      console.log('Registro:', JSON.stringify(newRecord, null, 2));

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'addBOM',
            record: newRecord
          })
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Respuesta de Google Sheets:', result);

        if (!result.success) {
          throw new Error(result.error || 'Error al guardar registro BOM en Google Sheets');
        }

        const records: BOMRecord[] = recordsQuery.data || [];
        const updated = [...records, newRecord];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('✅ Registro BOM guardado exitosamente');
        return updated;
      } catch (error) {
        console.error('========== ERROR AL ENVIAR REGISTRO BOM ==========');
        console.error('Tipo de error:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Mensaje:', error instanceof Error ? error.message : String(error));
        console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('URL usada:', GOOGLE_SCRIPT_URL);
        
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          throw new Error(
            '❌ No se pudo conectar con Google Sheets\n\n' +
            '📋 SOLUCIÓN RÁPIDA:\n\n' +
            '1️⃣ Abre tu Google Sheets\n' +
            '2️⃣ Ve a: Extensiones → Apps Script\n' +
            '3️⃣ Clic en "Implementar" → "Administrar implementaciones"\n' +
            '4️⃣ Clic en el ícono de editar (lápiz)\n' +
            '5️⃣ Cambia "Versión" a "Nueva versión"\n' +
            '6️⃣ Clic en "Implementar"\n\n' +
            '✅ La URL seguirá siendo la misma\n\n' +
            '🔗 URL actual: ' + GOOGLE_SCRIPT_URL.substring(0, 60) + '...\n\n' +
            'Si el problema persiste, verifica que el script:\n' +
            '• Esté configurado como "Aplicación web"\n' +
            '• Tenga acceso "Cualquier persona"\n' +
            '• Ejecute como "Yo (tu correo)"'
          );
        }
        
        throw error;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['bom-records'], updated);
    },
    onError: (error) => {
      console.error('❌ Error en addRecordMutation:', error);
    }
  });

  const addRecordAsync = async (data: BOMFormData): Promise<void> => {
    return new Promise((resolve, reject) => {
      addRecordMutation.mutate(data, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const updateRecordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BOMFormData> }) => {
      const records: BOMRecord[] = recordsQuery.data || [];
      const recordToUpdate = records.find(r => r.id === id);
      
      if (!recordToUpdate) {
        throw new Error('Registro no encontrado en la app');
      }

      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: data.updatedBy,
      };

      console.log('Actualizando registro BOM en Google Sheets:', id, updates);

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateBOM',
            id,
            updates
          })
        });

        const result = await response.json();
        console.log('Respuesta de actualización BOM Google Sheets:', result);

        if (!result.success) {
          throw new Error(result.error || 'Error al actualizar registro BOM en Google Sheets');
        }

        const updated = records.map(record => 
          record.id === id 
            ? { ...record, ...updates } 
            : record
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      } catch (error) {
        console.error('Error al actualizar registro BOM en Google Sheets:', error);
        throw error;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['bom-records'], updated);
    }
  });

  const deleteRecordMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Eliminando registro BOM con ID:', id);
      const records: BOMRecord[] = recordsQuery.data || [];
      const recordToDelete = records.find(r => r.id === id);
      
      if (!recordToDelete) {
        console.error('Registro BOM no encontrado localmente con ID:', id);
        throw new Error('Registro no encontrado localmente');
      }

      console.log('Registro encontrado:', recordToDelete);
      console.log('Eliminando registro BOM en Google Sheets con ID:', id);

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteBOM',
            id: String(id)
          })
        });

        const result = await response.json();
        console.log('Respuesta de eliminación BOM Google Sheets:', result);

        if (!result.success) {
          console.error('Error de Google Sheets:', result.error);
          
          if (result.error && result.error.includes('Registro no encontrado')) {
            console.log('El registro no existe en Google Sheets, eliminando solo localmente');
          } else {
            throw new Error(result.error || 'Error al eliminar registro BOM en Google Sheets');
          }
        }

        const updated = records.filter(record => record.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('Registro BOM eliminado exitosamente. Registros restantes:', updated.length);
        return updated;
      } catch (error) {
        console.error('Error al eliminar registro BOM en Google Sheets:', error);
        throw error;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['bom-records'], updated);
    },
    onError: (error) => {
      console.error('Error en deleteRecordMutation:', error);
    }
  });

  const setCurrentUser = async (name: string) => {
    await AsyncStorage.setItem(CURRENT_USER_KEY, name);
    queryClient.setQueryData(['currentUser'], name);
  };

  const login = async (name: string) => {
    await setCurrentUser(name);
  };

  const logout = async () => {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    queryClient.setQueryData(['currentUser'], 'Usuario');
  };

  return {
    records: recordsQuery.data || [],
    isLoadingRecords: recordsQuery.isLoading,
    addRecord: addRecordMutation.mutate,
    addRecordAsync,
    updateRecord: updateRecordMutation.mutate,
    deleteRecord: deleteRecordMutation.mutate,
    isAddingRecord: addRecordMutation.isPending,
    isUpdatingRecord: updateRecordMutation.isPending,
    isDeletingRecord: deleteRecordMutation.isPending,
    currentUser: userQuery.data || 'Usuario',
    setCurrentUser,
    login,
    logout,
    isLoadingUser: userQuery.isLoading,
  };
});
