import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Save, ChevronDown } from 'lucide-react-native';
import { useProduct } from '@/context/ProductContext';
import { useBOM } from '@/context/BOMContext';
import { ProductFormData, ProductInfo } from '@/types/product';
import { CARNIC_COLORS } from '@/constants/colors';
import { TIPOS_EMPAQUE, SIZES_EMPAQUE, SALAS_ORIGEN } from '@/constants/products';

type PickerOption = string;

export default function CreateProductScreen() {
  const { products, addProduct, updateProduct, isAddingProduct, isUpdatingProduct } = useProduct();
  const { currentUser } = useBOM();
  const router = useRouter();
  const params = useLocalSearchParams();
  const editId = typeof params.edit === 'string' ? params.edit : undefined;
  const isEditing = !!editId;

  const [codigo, setCodigo] = useState<string>('');
  const [nombreProducto, setNombreProducto] = useState<string>('');
  const [cantidadPaquetes, setCantidadPaquetes] = useState<string>('');
  const [pesoPorCaja, setPesoPorCaja] = useState<string>('');
  const [tipoEmpaque, setTipoEmpaque] = useState<string>(TIPOS_EMPAQUE[0]);
  const [sizeEmpaque, setSizeEmpaque] = useState<string>(SIZES_EMPAQUE[0]);
  const [salaOrigen, setSalaOrigen] = useState<string>(SALAS_ORIGEN[0]);

  const [showTipoEmpaquePicker, setShowTipoEmpaquePicker] = useState<boolean>(false);
  const [showSizeEmpaquePicker, setShowSizeEmpaquePicker] = useState<boolean>(false);
  const [showSalaOrigenPicker, setShowSalaOrigenPicker] = useState<boolean>(false);

  useEffect(() => {
    if (isEditing) {
      const product = products.find((p: ProductInfo) => p.id === editId);
      if (product) {
        setCodigo(product.codigo);
        setNombreProducto(product.nombre_producto);
        setCantidadPaquetes(product.cantidad_paquetes_por_caja.toString());
        setPesoPorCaja(product.peso_por_caja.toString());
        setTipoEmpaque(product.tipo_empaque);
        setSizeEmpaque(product.size_empaque);
        setSalaOrigen(product.sala_origen);
      }
    }
  }, [isEditing, editId, products]);

  const formatCodigoProducto = (text: string): string => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (digits.length === 0) return '';
    if (digits.length === 1) return digits;
    return digits[0] + '-' + digits.substring(1);
  };

  const handleCodigoChange = (text: string) => {
    const formatted = formatCodigoProducto(text);
    setCodigo(formatted);
  };

  const calculatePesoPromedioPaquete = (): number => {
    const pesos = parseFloat(pesoPorCaja);
    const cantidad = parseFloat(cantidadPaquetes);
    if (pesos > 0 && cantidad > 0) {
      return pesos / cantidad;
    }
    return 0;
  };

  const pesoPromedioPaquete = calculatePesoPromedioPaquete();

  const isBulkPack = tipoEmpaque === 'BULK PACK (GRANEL)';
  const isThermopack = tipoEmpaque === 'THERMOPACK';

  const isFormValid = () => {
    const baseValid = codigo.trim() && nombreProducto.trim() && pesoPorCaja.trim() && tipoEmpaque && salaOrigen && parseFloat(pesoPorCaja) > 0;
    
    if (isBulkPack) {
      return baseValid;
    }
    
    const thermopackValid = isThermopack ? sizeEmpaque : true;
    
    return (
      baseValid &&
      cantidadPaquetes.trim() &&
      thermopackValid &&
      parseFloat(cantidadPaquetes) > 0 &&
      pesoPromedioPaquete > 0
    );
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    const formData: ProductFormData = {
      codigo: codigo.trim(),
      nombre_producto: nombreProducto.trim().toUpperCase(),
      cantidad_paquetes_por_caja: isBulkPack ? 0 : parseFloat(cantidadPaquetes),
      peso_por_caja: parseFloat(pesoPorCaja),
      peso_promedio_por_paquete: isBulkPack ? 0 : pesoPromedioPaquete,
      tipo_empaque: tipoEmpaque,
      size_empaque: isBulkPack ? 'N/A' : (isThermopack ? sizeEmpaque : 'N/A'),
      sala_origen: salaOrigen,
      createdBy: currentUser,
      updatedBy: isEditing ? currentUser : undefined,
    };

    try {
      if (isEditing && editId) {
        await new Promise<void>((resolve, reject) => {
          updateProduct({ id: editId, data: formData }, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error)
          });
        });
      } else {
        await new Promise<void>((resolve, reject) => {
          addProduct(formData, {
            onSuccess: () => resolve(),
            onError: (error) => reject(error)
          });
        });
      }
      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      if (Platform.OS === 'web') {
        alert(
          (isEditing ? 'Error al actualizar producto' : 'Error al guardar producto') +
          '\n\n' + errorMessage
        );
      } else {
        Alert.alert(
          isEditing ? 'Error al actualizar producto' : 'Error al guardar producto',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const DropdownPicker = ({
    label,
    value,
    options,
    isOpen,
    onToggle,
    onSelect,
  }: {
    label: string;
    value: string;
    options: PickerOption[];
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (option: PickerOption) => void;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={onToggle}>
        <Text style={styles.dropdownText}>{value}</Text>
        <ChevronDown size={20} color={CARNIC_COLORS.gray[500]} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownMenu}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.dropdownItem,
                  option === value && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onSelect(option);
                  onToggle();
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    option === value && styles.dropdownItemTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: isEditing ? 'Editar Producto' : 'Nuevo Producto',
          headerStyle: {
            backgroundColor: CARNIC_COLORS.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código del Producto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1234"
                placeholderTextColor={CARNIC_COLORS.gray[400]}
                value={codigo}
                onChangeText={handleCodigoChange}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre del Producto</Text>
              <TextInput
                style={styles.input}
                placeholder="Ingrese el nombre del producto"
                placeholderTextColor={CARNIC_COLORS.gray[400]}
                value={nombreProducto}
                onChangeText={(text) => setNombreProducto(text.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>

            <DropdownPicker
              label="Tipo de Empaque"
              value={tipoEmpaque}
              options={TIPOS_EMPAQUE}
              isOpen={showTipoEmpaquePicker}
              onToggle={() => {
                setShowTipoEmpaquePicker(!showTipoEmpaquePicker);
                setShowSizeEmpaquePicker(false);
                setShowSalaOrigenPicker(false);
              }}
              onSelect={setTipoEmpaque}
            />

            {!isBulkPack && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cantidad de Paquetes por Caja</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 12"
                  placeholderTextColor={CARNIC_COLORS.gray[400]}
                  value={cantidadPaquetes}
                  onChangeText={setCantidadPaquetes}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peso Promedio por Caja (lb)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 24.5"
                placeholderTextColor={CARNIC_COLORS.gray[400]}
                value={pesoPorCaja}
                onChangeText={setPesoPorCaja}
                keyboardType="decimal-pad"
              />
            </View>

            {!isBulkPack && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Peso Promedio por Paquete (lb)</Text>
                <View style={[styles.input, styles.calculatedInput]}>
                  <Text style={styles.calculatedText}>
                    {pesoPromedioPaquete > 0 ? pesoPromedioPaquete.toFixed(2) : '0.00'}
                  </Text>
                </View>
                <Text style={styles.helperText}>Campo calculado automáticamente</Text>
              </View>
            )}

            {isThermopack && (
              <DropdownPicker
                label="Size de Empaque"
                value={sizeEmpaque}
                options={SIZES_EMPAQUE}
                isOpen={showSizeEmpaquePicker}
                onToggle={() => {
                  setShowSizeEmpaquePicker(!showSizeEmpaquePicker);
                  setShowTipoEmpaquePicker(false);
                  setShowSalaOrigenPicker(false);
                }}
                onSelect={setSizeEmpaque}
              />
            )}

            <DropdownPicker
              label="Sala de Origen"
              value={salaOrigen}
              options={SALAS_ORIGEN}
              isOpen={showSalaOrigenPicker}
              onToggle={() => {
                setShowSalaOrigenPicker(!showSalaOrigenPicker);
                setShowTipoEmpaquePicker(false);
                setShowSizeEmpaquePicker(false);
              }}
              onSelect={setSalaOrigen}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, !isFormValid() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!isFormValid() || isAddingProduct || isUpdatingProduct}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isFormValid() ? ['#0ea5e9', '#0284c7'] : ['#cbd5e1', '#94a3b8']}
              style={styles.saveButtonGradient}
            >
              <Save size={20} color="#fff" strokeWidth={2.5} />
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.dark,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: CARNIC_COLORS.dark,
    borderWidth: 1,
    borderColor: CARNIC_COLORS.gray[200],
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: CARNIC_COLORS.gray[200],
  },
  dropdownText: {
    fontSize: 15,
    color: CARNIC_COLORS.dark,
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: CARNIC_COLORS.gray[200],
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CARNIC_COLORS.gray[100],
  },
  dropdownItemActive: {
    backgroundColor: '#dbeafe',
  },
  dropdownItemText: {
    fontSize: 15,
    color: CARNIC_COLORS.dark,
  },
  dropdownItemTextActive: {
    fontWeight: '600' as const,
    color: '#0284c7',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: CARNIC_COLORS.gray[200],
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  saveButtonDisabled: {
    shadowOpacity: 0.05,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  calculatedInput: {
    backgroundColor: CARNIC_COLORS.gray[50],
    justifyContent: 'center',
  },
  calculatedText: {
    fontSize: 15,
    color: CARNIC_COLORS.gray[600],
    fontWeight: '600' as const,
  },
  helperText: {
    fontSize: 12,
    color: CARNIC_COLORS.gray[500],
    marginTop: -4,
  },
});
