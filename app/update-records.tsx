import { useState, useEffect } from 'react';
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
import { ArrowLeft, Search, Edit, Trash2, Package, X, ChevronDown } from 'lucide-react-native';
import { useBOM } from '@/context/BOMContext';
import { BOMRecord, BOMFormData } from '@/types/bom';
import { CARNIC_COLORS } from '@/constants/colors';
import { CATEGORIAS_INSUMO, CATALOGO_INSUMOS, Insumo } from '@/constants/catalogs';

const CATEGORIAS_CON_CONSUMO_POR_PIEZA = [
  'Etiqueta Caja',
  'Etiqueta Paquetería',
  'Film Fondo',
  'Film Tapa',
  'Fleje',
  'Grapa',
  'Papel Encerado',
];

export default function UpdateRecordsScreen() {
  const router = useRouter();
  const { records, updateRecord, deleteRecord, isUpdatingRecord } = useBOM();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<BOMRecord | null>(null);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<BOMFormData>>({});
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);

  const filteredRecords = records.filter((record: BOMRecord | null | undefined): record is BOMRecord => {
    if (!record) {
      console.log('Registro undefined o null encontrado');
      return false;
    }
    
    if (!record.descripcion_insumo || !record.codigo_sku || !record.descripcion_sku) {
      console.log('Registro con datos incompletos:', record);
      return false;
    }
    
    const searchLower = searchQuery.toLowerCase();
    return (
      record.codigo_sku.toLowerCase().includes(searchLower) ||
      record.descripcion_sku.toLowerCase().includes(searchLower) ||
      record.categoria_insumo.toLowerCase().includes(searchLower) ||
      record.descripcion_insumo.toLowerCase().includes(searchLower)
    );
  });

  const filteredInsumos = CATALOGO_INSUMOS.filter(
    insumo => insumo.categoria === formData.categoria_insumo
  );

  const handleSelectCategoria = (categoria: string) => {
    updateField('categoria_insumo', categoria);
    updateField('descripcion_insumo', '');
    updateField('codigo_insumo', '');
    setSelectedInsumo(null);
    setShowCategoryModal(false);
  };

  const handleSelectInsumo = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    updateField('descripcion_insumo', insumo.descripcion);
    updateField('codigo_insumo', insumo.codigo);
    updateField('unidad_medida', insumo.unidad_medida);
    setShowInsumoModal(false);
  };

  const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(formData.categoria_insumo || '');

  useEffect(() => {
    if (selectedInsumo) {
      let cantidadCalculada = 0;
      
      if (usaConsumoPorPieza) {
        if ((formData.cantidad_piezas_por_caja || 0) > 0 && (formData.consumo_por_caja || 0) > 0) {
          cantidadCalculada = ((formData.cantidad_piezas_por_caja || 0) * (formData.consumo_por_caja || 0)) / selectedInsumo.contenido_por_unidad;
        }
      } else {
        if ((formData.consumo_por_caja || 0) > 0) {
          cantidadCalculada = (formData.consumo_por_caja || 0) / selectedInsumo.contenido_por_unidad;
        }
      }
      
      updateField('cantidad_requerida', cantidadCalculada);
    }
  }, [formData.consumo_por_caja, formData.cantidad_piezas_por_caja, selectedInsumo, usaConsumoPorPieza]);

  const updateField = <K extends keyof BOMFormData>(field: K, value: BOMFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEdit = (record: BOMRecord) => {
    setSelectedRecord(record);
    setFormData({
      codigo_sku: record.codigo_sku,
      descripcion_sku: record.descripcion_sku,
      categoria_insumo: record.categoria_insumo,
      codigo_insumo: record.codigo_insumo,
      descripcion_insumo: record.descripcion_insumo,
      cantidad_requerida: record.cantidad_requerida,
      cantidad_piezas_por_caja: record.cantidad_piezas_por_caja,
      consumo_por_caja: record.consumo_por_caja,
      unidad_medida: record.unidad_medida,
    });

    const insumo = CATALOGO_INSUMOS.find(i => i.codigo === record.codigo_insumo);
    if (insumo) {
      setSelectedInsumo(insumo);
    }

    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!selectedRecord) return;

    if (!formData.categoria_insumo?.trim()) {
      Alert.alert('Error', 'La categoría de insumo es requerida');
      return;
    }
    if (!formData.descripcion_insumo?.trim()) {
      Alert.alert('Error', 'La descripción de insumo es requerida');
      return;
    }
    if ((formData.consumo_por_caja || 0) <= 0) {
      Alert.alert('Error', usaConsumoPorPieza ? 'El consumo por pieza debe ser mayor a 0' : 'El consumo por caja debe ser mayor a 0');
      return;
    }

    const updates: Partial<BOMFormData> = {
      categoria_insumo: formData.categoria_insumo,
      descripcion_insumo: formData.descripcion_insumo,
      codigo_insumo: formData.codigo_insumo,
      consumo_por_caja: formData.consumo_por_caja,
      cantidad_requerida: formData.cantidad_requerida,
      unidad_medida: formData.unidad_medida,
    };

    try {
      updateRecord({ id: selectedRecord.id, data: updates });
      setEditModalVisible(false);
      Alert.alert('Éxito', 'Registro actualizado exitosamente');
    } catch (error) {
      console.error('Error en handleUpdate:', error);
      Alert.alert(
        'Error al Actualizar',
        error instanceof Error ? error.message : 'No se pudo actualizar el registro'
      );
    }
  };

  const handleDelete = (record: BOMRecord) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Está seguro de eliminar el registro "${record.descripcion_sku}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteRecord(record.id);
            Alert.alert('Éxito', 'Registro eliminado exitosamente');
          },
        },
      ]
    );
  };

  const closeModal = () => {
    setEditModalVisible(false);
    setSelectedRecord(null);
    setFormData({});
    setSelectedInsumo(null);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Actualización de Registros',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
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

        {filteredRecords.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No se encontraron registros' : 'No hay registros aún'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Intenta con otro término de búsqueda' : 'Crea tu primer registro'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.recordsList} contentContainerStyle={styles.recordsContent}>
            {filteredRecords.map((record: BOMRecord) => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{record.categoria_insumo}</Text>
                  </View>
                  <View style={styles.recordActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(record)}
                    >
                      <Edit size={18} color={CARNIC_COLORS.secondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(record)}
                    >
                      <Trash2 size={18} color={CARNIC_COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.partNumber}>SKU: {record.codigo_sku || 'N/A'}</Text>
                <Text style={styles.partName}>{record.descripcion_sku || 'N/A'}</Text>

                <View style={styles.recordDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Código Insumo:</Text>
                    <Text style={styles.detailValue}>{record.codigo_insumo || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cantidad Req:</Text>
                    <Text style={styles.detailValue}>
                      {record.unidad_medida === 'BOLSAS' || record.unidad_medida === 'UND'
                        ? Math.round(record.cantidad_requerida)
                        : record.cantidad_requerida.toFixed(6)} {record.unidad_medida}
                    </Text>
                  </View>
                </View>

                <Text style={styles.description} numberOfLines={2}>
                  {record.descripcion_insumo || 'N/A'}
                </Text>

                <Text style={styles.metadata}>
                  Creado por {record.createdBy || 'Desconocido'} el{' '}
                  {record.createdAt ? new Date(record.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

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
              <View style={styles.formGroup}>
                <Text style={styles.label}>Código SKU</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>
                    {formData.codigo_sku || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción SKU</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>
                    {formData.descripcion_sku || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría de Insumo *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCategoryModal(true)}
                >
                  <Text style={styles.dropdownText}>{formData.categoria_insumo}</Text>
                  <ChevronDown size={20} color={CARNIC_COLORS.gray[500]} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción de Insumo *</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdown,
                    !formData.categoria_insumo && styles.dropdownDisabled
                  ]}
                  onPress={() => {
                    console.log('========== PICKER DESCRIPCION INSUMO PRESIONADO ==========');
                    console.log('Categoría actual:', formData.categoria_insumo);
                    console.log('Descripción actual:', formData.descripcion_insumo);
                    console.log('Insumos filtrados:', filteredInsumos.length);
                    console.log('Primeros 3 insumos:', filteredInsumos.slice(0, 3).map(i => i.descripcion));
                    
                    if (!formData.categoria_insumo) {
                      Alert.alert(
                        'Categoría Requerida',
                        'Primero seleccione una categoría de insumo'
                      );
                      return;
                    }
                    if (filteredInsumos.length === 0) {
                      Alert.alert(
                        'Sin insumos',
                        `No hay insumos disponibles para la categoría "${formData.categoria_insumo}"`
                      );
                      return;
                    }
                    console.log('Abriendo modal de insumos...');
                    setShowInsumoModal(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      !formData.descripcion_insumo && styles.placeholderText,
                    ]}
                  >
                    {formData.descripcion_insumo || 'Seleccione un insumo'}
                  </Text>
                  <ChevronDown size={20} color={!formData.categoria_insumo ? '#cbd5e1' : CARNIC_COLORS.gray[500]} />
                </TouchableOpacity>
                {formData.categoria_insumo && (
                  <Text style={styles.hint}>
                    {filteredInsumos.length > 0 
                      ? `${filteredInsumos.length} insumo(s) disponible(s) - Toca para cambiar` 
                      : `Sin insumos para "${formData.categoria_insumo}"`}
                  </Text>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Código de Insumo</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>
                    {formData.codigo_insumo || 'Se asigna automáticamente'}
                  </Text>
                </View>
              </View>

              {usaConsumoPorPieza && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cantidad de Piezas por Caja</Text>
                  <View style={styles.disabledInput}>
                    <Text style={styles.disabledInputText}>
                      {formData.cantidad_piezas_por_caja || 0}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>{usaConsumoPorPieza ? 'Consumo por Pieza *' : 'Consumo por Caja *'}</Text>
                <Text style={styles.hint}>
                  {usaConsumoPorPieza 
                    ? 'Cantidad que consume cada pieza'
                    : 'Cantidad que consume cada caja del SKU'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.consumo_por_caja ? String(formData.consumo_por_caja) : ''}
                  onChangeText={value => {
                    const num = parseFloat(value) || 0;
                    updateField('consumo_por_caja', num);
                  }}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Cantidad Requerida (Calculada)</Text>
                <View style={styles.calculatedField}>
                  <Text style={styles.calculatedValue}>
                    {formData.cantidad_requerida
                      ? (formData.unidad_medida === 'BOLSAS' || formData.unidad_medida === 'UND'
                          ? Math.round(formData.cantidad_requerida).toString()
                          : formData.cantidad_requerida.toFixed(6))
                      : (formData.unidad_medida === 'BOLSAS' || formData.unidad_medida === 'UND' ? '0' : '0.000000')}
                  </Text>
                  {selectedInsumo && formData.consumo_por_caja && (
                    <Text style={styles.calculatedHint}>
                      {usaConsumoPorPieza
                        ? `= (${formData.cantidad_piezas_por_caja || 0} × ${formData.consumo_por_caja}) / ${selectedInsumo.contenido_por_unidad}`
                        : `= ${formData.consumo_por_caja} / ${selectedInsumo.contenido_por_unidad}`}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unidad de Medida</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>
                    {formData.unidad_medida || 'N/A'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.updateButton, isUpdatingRecord && styles.updateButtonDisabled]}
                onPress={handleUpdate}
                disabled={isUpdatingRecord}
                activeOpacity={0.8}
              >
                <Text style={styles.updateButtonText}>
                  {isUpdatingRecord ? 'Actualizando...' : 'Actualizar Registro'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

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
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {CATEGORIAS_INSUMO.map(categoria => (
                  <TouchableOpacity
                    key={categoria}
                    style={[
                      styles.modalItem,
                      formData.categoria_insumo === categoria && styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectCategoria(categoria)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        formData.categoria_insumo === categoria &&
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
                <TouchableOpacity onPress={() => setShowInsumoModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {filteredInsumos.map(insumo => (
                  <TouchableOpacity
                    key={insumo.codigo}
                    style={[
                      styles.modalItem,
                      formData.codigo_insumo === insumo.codigo && styles.modalItemSelected,
                    ]}
                    onPress={() => handleSelectInsumo(insumo)}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        formData.codigo_insumo === insumo.codigo &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {insumo.descripcion}
                    </Text>
                    <Text style={styles.modalItemSubtext}>
                      Código: {insumo.codigo} | Contenido: {insumo.contenido_por_unidad}{' '}
                      {insumo.unidad_medida}
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
    color: CARNIC_COLORS.secondary,
    marginBottom: 4,
  },
  partName: {
    fontSize: 18,
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '700' as const,
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '400' as const,
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
    fontWeight: '600' as const,
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#64748b',
  },
});
