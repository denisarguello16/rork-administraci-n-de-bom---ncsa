import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductInfo, ProductFormData } from '@/types/product';
import { GOOGLE_SCRIPT_URL } from '@/constants/api';

const STORAGE_KEY = '@product_info';

export const [ProductContext, useProduct] = createContextHook(() => {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      console.log('Cargando productos desde Google Sheets...');
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 25000);

        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getProducts`, {
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });

        const result = await response.json();
        
        console.log('Respuesta de Google Sheets (productos):', result);
        
        if (result.success && result.data) {
          console.log(`Productos cargados desde Google Sheets: ${result.data.length}`);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
          return result.data;
        } else {
          console.log('No se pudieron cargar productos de Google Sheets, usando cache local');
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          return stored ? JSON.parse(stored) : [];
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') {
          console.log('Timeout al cargar productos desde Google Sheets, usando cache local');
        } else {
          console.log('Error al cargar productos desde Google Sheets, usando cache local:', error?.message || String(error));
        }
        try {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          return stored ? JSON.parse(stored) : [];
        } catch (cacheError) {
          console.error('Error loading from cache:', cacheError);
          return [];
        }
      }
    },
    retry: 1,
    staleTime: 60000,
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const newProduct: ProductInfo = {
        ...data,
        id: Date.now().toString(),
        version: 0,
        createdAt: new Date().toISOString(),
      };

      console.log('========== ENVIANDO PRODUCTO A GOOGLE SHEETS ==========');
      console.log('URL:', GOOGLE_SCRIPT_URL);
      console.log('Producto:', JSON.stringify(newProduct, null, 2));

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'addProduct',
            product: newProduct
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
          throw new Error(result.error || 'Error al guardar producto en Google Sheets');
        }

        const products: ProductInfo[] = productsQuery.data || [];
        const updated = [...products, newProduct];
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('✅ Producto guardado exitosamente');
        return updated;
      } catch (error) {
        console.error('========== ERROR AL ENVIAR PRODUCTO ==========');
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
      queryClient.setQueryData(['products'], updated);
    },
    onError: (error) => {
      console.error('❌ Error en addProductMutation:', error);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const products: ProductInfo[] = productsQuery.data || [];
      const productToUpdate = products.find(p => p.id === id);
      
      if (!productToUpdate) {
        throw new Error('Producto no encontrado en la app');
      }

      const originalCodigo = productToUpdate.codigo;

      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: data.updatedBy,
      };

      console.log('Actualizando producto en Google Sheets:', originalCodigo, updates);

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateProduct',
            codigo: originalCodigo,
            updates
          })
        });

        const result = await response.json();
        console.log('Respuesta de actualización producto Google Sheets:', result);

        if (!result.success) {
          throw new Error(result.error || 'Error al actualizar producto en Google Sheets');
        }

        const updated = products.map(product => 
          product.id === id 
            ? { ...product, ...updates } 
            : product
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      } catch (error) {
        console.error('Error al actualizar producto en Google Sheets:', error);
        throw error;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['products'], updated);
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Eliminando producto con ID:', id);
      const products: ProductInfo[] = productsQuery.data || [];
      const productToDelete = products.find(p => p.id === id);
      
      if (!productToDelete) {
        console.error('Producto no encontrado localmente con ID:', id);
        throw new Error('Producto no encontrado localmente');
      }

      console.log('Producto encontrado:', productToDelete);
      console.log('Eliminando producto en Google Sheets con ID:', id);

      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deleteProduct',
            id: String(id)
          })
        });

        const result = await response.json();
        console.log('Respuesta de eliminación producto Google Sheets:', result);

        if (!result.success) {
          console.error('Error de Google Sheets:', result.error);
          
          if (result.error && result.error.includes('Producto no encontrado')) {
            console.log('El producto no existe en Google Sheets, eliminando solo localmente');
          } else {
            throw new Error(result.error || 'Error al eliminar producto en Google Sheets');
          }
        }

        const updated = products.filter(product => product.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        console.log('Producto eliminado exitosamente. Productos restantes:', updated.length);
        return updated;
      } catch (error) {
        console.error('Error al eliminar producto en Google Sheets:', error);
        throw error;
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['products'], updated);
    },
    onError: (error) => {
      console.error('Error en deleteProductMutation:', error);
    }
  });

  return {
    products: productsQuery.data || [],
    isLoadingProducts: productsQuery.isLoading,
    addProduct: addProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    isAddingProduct: addProductMutation.isPending,
    isUpdatingProduct: updateProductMutation.isPending,
    isDeletingProduct: deleteProductMutation.isPending,
  };
});
