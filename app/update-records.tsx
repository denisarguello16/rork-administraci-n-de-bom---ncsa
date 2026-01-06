import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Edit,
  Package,
  X,
  ChevronDown,
  Save,
} from 'lucide-react-native';
import { useBOM } from '@/context/BOMContext';
import { useProduct } from '@/context/ProductContext';
import { ProductInfo } from '@/types/product';
import { CARNIC_COLORS } from '@/constants/colors';
import {
  CATEGORIAS_INSUMO,
  CATALOGO_INSUMOS,
  Insumo,
} from '@/constants/catalogs';

const CATEGORIAS_CON_CONSUMO_POR_PIEZA = [
  'Etiqueta Caja',
  'Etiqueta Paquetería',
  'Film Fondo',
  'Film Tapa',
  'Fleje',
  'Grapa',
  'Papel Encerado',
];

interface InsumoEdit {
  id: string;
  categoria_insumo: string;
  codigo_insumo: string;
  descripcion_insumo: string;
  cantidad_requerida: number;
  consumo_por_caja: number;
  unidad_medida: string;
  cantidad_piezas_por_caja: number;
  selectedInsumo: Insumo | null;
}

export default function UpdateRecordsScreen() {
  const router = useRouter();
  const { records, updateRecord, isUpdatingRecord, currentUser } = useBOM();
  const { products, updateProduct, isUpdatingProduct } = useProduct();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [productEdits, setProductEdits] = useState<Partial<ProductInfo>>({});
  
  const [insumos, setInsumos] = useState<InsumoEdit[]>([]);
  const [editingInsumoIndex, setEditingInsumoIndex] = useState<number | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showInsumoModal, setShowInsumoModal] = useState(false);

  const uniqueCodigos = Array.from(
    new Set(records.map((r) => r.codigo_sku))
  ).sort();

  const filteredCodigos = uniqueCodigos.filter((codigo) =>
    codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentEditingInsumo = editingInsumoIndex !== null ? insumos[editingInsumoIndex] : null;
  
  const filteredInsumosForCatalog = currentEditingInsumo
    ? CATALOGO_INSUMOS.filter(
        (insumo) => insumo.categoria === currentEditingInsumo.categoria_insumo
      )
    : [];

  const handleSelectCategoria = (categoria: string) => {
    if (editingInsumoIndex === null) return;
    
    const updated = [...insumos];
    updated[editingInsumoIndex] = {
      ...updated[editingInsumoIndex],
      categoria_insumo: categoria,
      descripcion_insumo: '',
      codigo_insumo: '',
      selectedInsumo: null,
    };
    setInsumos(updated);
    setShowCategoryModal(false);
  };

  const handleSelectInsumo = (insumo: Insumo) => {
    if (editingInsumoIndex === null) return;
    
    const updated = [...insumos];
    const currentInsumo = updated[editingInsumoIndex];
    
    updated[editingInsumoIndex] = {
      ...currentInsumo,
      descripcion_insumo: insumo.descripcion,
      codigo_insumo: insumo.codigo,
      unidad_medida: insumo.unidad_medida,
      selectedInsumo: insumo,
    };
    
    const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(
      currentInsumo.categoria_insumo
    );
    
    let cantidadCalculada = 0;
    if (usaConsumoPorPieza) {
      if (currentInsumo.cantidad_piezas_por_caja > 0 && currentInsumo.consumo_por_caja > 0) {
        cantidadCalculada =
          (currentInsumo.cantidad_piezas_por_caja * currentInsumo.consumo_por_caja) /
          insumo.contenido_por_unidad;
      }
    } else {
      if (currentInsumo.consumo_por_caja > 0) {
        cantidadCalculada = currentInsumo.consumo_por_caja / insumo.contenido_por_unidad;
      }
    }
    
    updated[editingInsumoIndex].cantidad_requerida = cantidadCalculada;
    setInsumos(updated);
    setShowInsumoModal(false);
  };

  const updateInsumoConsumption = (index: number, consumo: number) => {
    const updated = [...insumos];
    const insumo = updated[index];
    insumo.consumo_por_caja = consumo;
    
    if (insumo.selectedInsumo) {
      const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(
        insumo.categoria_insumo
      );
      
      let cantidadCalculada = 0;
      if (usaConsumoPorPieza) {
        if (insumo.cantidad_piezas_por_caja > 0 && consumo > 0) {
          cantidadCalculada =
            (insumo.cantidad_piezas_por_caja * consumo) /
            insumo.selectedInsumo.contenido_por_unidad;
        }
      } else {
        if (consumo > 0) {
          cantidadCalculada = consumo / insumo.selectedInsumo.contenido_por_unidad;
        }
      }
      insumo.cantidad_requerida = cantidadCalculada;
    }
    
    setInsumos(updated);
  };

  const handleOpenProduct = (codigo: string) => {
    const productData = products.find((p: ProductInfo) => p.codigo === codigo);
    const insumosData = records.filter((r) => r.codigo_sku === codigo);

    if (!productData) {
      Alert.alert('Error', 'No se encontró información del producto');
      return;
    }

    setSelectedCodigo(codigo);
    setProductInfo(productData);
    setProductEdits({});

    const insumosEdit: InsumoEdit[] = insumosData.map((record) => {
      const catalogInsumo = CATALOGO_INSUMOS.find(
        (i) => i.codigo === record.codigo_insumo
      );
      return {
        id: record.id,
        categoria_insumo: record.categoria_insumo,
        codigo_insumo: record.codigo_insumo,
        descripcion_insumo: record.descripcion_insumo,
        cantidad_requerida: record.cantidad_requerida,
        consumo_por_caja: record.consumo_por_caja,
        unidad_medida: record.unidad_medida,
        cantidad_piezas_por_caja: record.cantidad_piezas_por_caja,
        selectedInsumo: catalogInsumo || null,
      };
    });

    setInsumos(insumosEdit);
    setEditModalVisible(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedCodigo || !productInfo) return;

    try {
      const hasProductChanges = Object.keys(productEdits).length > 0;
      
      if (hasProductChanges) {
        console.log('Actualizando información del producto...');
        await new Promise<void>((resolve, reject) => {
          updateProduct(
            { 
              id: productInfo.id, 
              data: { 
                ...productEdits, 
                updatedBy: currentUser || 'Usuario' 
              } 
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }

      for (const insumo of insumos) {
        console.log('Actualizando insumo:', insumo.id);
        await new Promise<void>((resolve, reject) => {
          updateRecord(
            {
              id: insumo.id,
              data: {
                categoria_insumo: insumo.categoria_insumo,
                descripcion_insumo: insumo.descripcion_insumo,
                codigo_insumo: insumo.codigo_insumo,
                consumo_por_caja: insumo.consumo_por_caja,
                cantidad_requerida: insumo.cantidad_requerida,
                unidad_medida: insumo.unidad_medida,
                updatedBy: currentUser || 'Usuario',
              },
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error),
            }
          );
        });
      }

      setEditModalVisible(false);
      Alert.alert('Éxito', 'Cambios guardados exitosamente');
    } catch (error: any) {
      console.error('Error al guardar cambios:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'No se pudieron guardar los cambios'
      );
    }
  };



  const closeModal = () => {
    setEditModalVisible(false);
    setSelectedCodigo(null);
    setProductInfo(null);
    setProductEdits({});
    setInsumos([]);
    setEditingInsumoIndex(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Actualización de Registros',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
            >
              <ArrowLeft size={24} color={CARNIC_COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código SKU, descripción..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredCodigos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'No se encontraron productos'
                : 'No hay productos aún'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery
                ? 'Intenta con otro código'
                : 'Crea tu primer producto'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.recordsList}
            contentContainerStyle={styles.recordsContent}
          >
            {filteredCodigos.map((codigo) => {
              const productData = products.find((p: ProductInfo) => p.codigo === codigo);
              const insumosCount = records.filter(
                (r) => r.codigo_sku === codigo
              ).length;

              return (
                <TouchableOpacity
                  key={codigo}
                  style={styles.recordCard}
                  onPress={() => handleOpenProduct(codigo)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recordHeader}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {insumosCount} insumo{insumosCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Edit size={20} color={CARNIC_COLORS.secondary} />
                  </View>

                  <Text style={styles.partNumber}>Código: {codigo}</Text>
                  <Text style={styles.partName}>
                    {productData?.nombre_producto || 'Sin nombre'}
                  </Text>

                  {productData && (
                    <View style={styles.recordDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Paquetes/Caja:</Text>
                        <Text style={styles.detailValue}>
                          {productData.cantidad_paquetes_por_caja}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Peso/Caja:</Text>
                        <Text style={styles.detailValue}>
                          {productData.peso_por_caja} kg
                        </Text>
                      </View>
                    </View>
                  )}

                  <Text style={styles.metadata}>
                    Creado por {productData?.createdBy || 'Desconocido'} el{' '}
                    {productData?.createdAt
                      ? new Date(productData.createdAt).toLocaleDateString('es-ES')
                      : 'N/A'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* MODAL EDITAR REGISTRO */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={closeModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Registro</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.sectionTitle}>Información del Producto</Text>
              
              {productInfo && (
                <View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Código</Text>
                    <View style={styles.disabledInput}>
                      <Text style={styles.disabledInputText}>
                        {productInfo.codigo}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nombre del Producto</Text>
                    <TextInput
                      style={styles.input}
                      value={productEdits.nombre_producto ?? productInfo.nombre_producto}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({
                          ...prev,
                          nombre_producto: value,
                        }))
                      }
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Cantidad Paquetes por Caja</Text>
                    <TextInput
                      style={styles.input}
                      value={String(
                        productEdits.cantidad_paquetes_por_caja ??
                          productInfo.cantidad_paquetes_por_caja
                      )}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({
                          ...prev,
                          cantidad_paquetes_por_caja: parseFloat(value) || 0,
                        }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Peso por Caja (kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(
                        productEdits.peso_por_caja ?? productInfo.peso_por_caja
                      )}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({
                          ...prev,
                          peso_por_caja: parseFloat(value) || 0,
                        }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Peso Promedio por Paquete (kg)</Text>
                    <TextInput
                      style={styles.input}
                      value={String(
                        productEdits.peso_promedio_por_paquete ??
                          productInfo.peso_promedio_por_paquete
                      )}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({
                          ...prev,
                          peso_promedio_por_paquete: parseFloat(value) || 0,
                        }))
                      }
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Tipo de Empaque</Text>
                    <TextInput
                      style={styles.input}
                      value={productEdits.tipo_empaque ?? productInfo.tipo_empaque}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({ ...prev, tipo_empaque: value }))
                      }
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Size Empaque</Text>
                    <TextInput
                      style={styles.input}
                      value={productEdits.size_empaque ?? productInfo.size_empaque}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({ ...prev, size_empaque: value }))
                      }
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Sala Origen</Text>
                    <TextInput
                      style={styles.input}
                      value={productEdits.sala_origen ?? productInfo.sala_origen}
                      onChangeText={(value) =>
                        setProductEdits((prev) => ({ ...prev, sala_origen: value }))
                      }
                    />
                  </View>
                </View>
              )}

              <Text style={styles.sectionTitle}>Insumos Asociados</Text>
              
              {insumos.map((insumo, index) => {
                const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(
                  insumo.categoria_insumo
                );
                
                return (
                  <View key={insumo.id} style={styles.insumoCard}>
                    <Text style={styles.insumoTitle}>
                      Insumo {index + 1}: {insumo.categoria_insumo}
                    </Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Categoría de Insumo</Text>
                      <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                          setEditingInsumoIndex(index);
                          setShowCategoryModal(true);
                        }}
                      >
                        <Text style={styles.dropdownText}>
                          {insumo.categoria_insumo}
                        </Text>
                        <ChevronDown size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Descripción de Insumo</Text>
                      <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                          setEditingInsumoIndex(index);
                          setShowInsumoModal(true);
                        }}
                      >
                        <Text style={styles.dropdownText}>
                          {insumo.descripcion_insumo}
                        </Text>
                        <ChevronDown size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Código de Insumo</Text>
                      <View style={styles.disabledInput}>
                        <Text style={styles.disabledInputText}>
                          {insumo.codigo_insumo}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>
                        {usaConsumoPorPieza
                          ? 'Consumo por Pieza'
                          : 'Consumo por Caja'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={String(insumo.consumo_por_caja)}
                        onChangeText={(value) =>
                          updateInsumoConsumption(index, parseFloat(value) || 0)
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Cantidad Requerida (Calculada)</Text>
                      <View style={styles.calculatedField}>
                        <Text style={styles.calculatedValue}>
                          {insumo.unidad_medida === 'BOLSAS' ||
                          insumo.unidad_medida === 'UND'
                            ? Math.round(insumo.cantidad_requerida)
                            : insumo.cantidad_requerida.toFixed(6)}
                        </Text>
                        {insumo.selectedInsumo && (
                          <Text style={styles.calculatedHint}>
                            {usaConsumoPorPieza
                              ? `= (${insumo.cantidad_piezas_por_caja} × ${insumo.consumo_por_caja}) / ${insumo.selectedInsumo.contenido_por_unidad}`
                              : `= ${insumo.consumo_por_caja} / ${insumo.selectedInsumo.contenido_por_unidad}`}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Unidad de Medida</Text>
                      <View style={styles.disabledInput}>
                        <Text style={styles.disabledInputText}>
                          {insumo.unidad_medida}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (isUpdatingRecord || isUpdatingProduct) && styles.updateButtonDisabled,
                ]}
                onPress={handleSaveChanges}
                disabled={isUpdatingRecord || isUpdatingProduct}
                activeOpacity={0.8}
              >
                <Save size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.updateButtonText}>
                  {isUpdatingRecord || isUpdatingProduct
                    ? 'Guardando...'
                    : 'Guardar Cambios'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* MODAL CATEGORÍA */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentSmall}>
              <View style={styles.modalHeaderSmall}>
                <Text style={styles.modalTitleSmall}>Seleccione Categoría</Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryModal(false)}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {CATEGORIAS_INSUMO.map((categoria) => (
                  <TouchableOpacity
                    key={categoria}
                    style={[
                      styles.modalItem,
                      currentEditingInsumo?.categoria_insumo === categoria &&
                        styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectCategoria(categoria)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        currentEditingInsumo?.categoria_insumo === categoria &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {categoria}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* MODAL INSUMO */}
        <Modal
          visible={showInsumoModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowInsumoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentSmall}>
              <View style={styles.modalHeaderSmall}>
                <Text style={styles.modalTitleSmall}>Seleccione Insumo</Text>
                <TouchableOpacity
                  onPress={() => setShowInsumoModal(false)}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {filteredInsumosForCatalog.map((insumo) => (
                  <TouchableOpacity
                    key={insumo.codigo}
                    style={[
                      styles.modalItem,
                      currentEditingInsumo?.codigo_insumo === insumo.codigo &&
                        styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectInsumo(insumo)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        currentEditingInsumo?.codigo_insumo === insumo.codigo &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {insumo.descripcion}
                    </Text>
                    <Text style={styles.modalItemSubtext}>
                      Código: {insumo.codigo} | Contenido:{' '}
                      {insumo.contenido_por_unidad} {insumo.unidad_medida}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#0f172a',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
  recordsList: {
    flex: 1,
  },
  recordsContent: {
    padding: 16,
    paddingTop: 8,
  },
  recordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: CARNIC_COLORS.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: CARNIC_COLORS.secondary,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: CARNIC_COLORS.secondary,
    marginBottom: 4,
  },
  partName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  recordDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  metadata: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
  },
  dropdown: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  dropdownDisabled: {
    backgroundColor: '#f1f5f9',
    opacity: 0.6,
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
  },
  disabledInputText: {
    fontSize: 16,
    color: '#64748b',
  },
  calculatedField: {
    backgroundColor: '#e6f7ed',
    borderWidth: 1,
    borderColor: CARNIC_COLORS.secondary,
    borderRadius: 12,
    padding: 16,
  },
  calculatedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: CARNIC_COLORS.secondary,
    marginBottom: 4,
  },
  calculatedHint: {
    fontSize: 12,
    color: CARNIC_COLORS.secondary,
  },
  updateButton: {
    backgroundColor: CARNIC_COLORS.secondary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CARNIC_COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 40,
  },
  updateButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 20,
    marginBottom: 16,
  },
  insumoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  insumoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CARNIC_COLORS.secondary,
    marginBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContentSmall: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeaderSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitleSmall: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '400',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemSelected: {
    backgroundColor: CARNIC_COLORS.lightGreen,
  },
  modalItemText: {
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 4,
  },
  modalItemTextSelected: {
    color: CARNIC_COLORS.secondary,
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
});
