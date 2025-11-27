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
  Switch,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { ArrowLeft, Save, Package, ChevronDown, Plus, X } from 'lucide-react-native';
import { useBOM } from '@/context/BOMContext';
import { useProduct } from '@/context/ProductContext';
import { ProductInfo } from '@/types/product';
import { BOMFormData } from '@/types/bom';
import { CARNIC_COLORS } from '@/constants/colors';
import { CATEGORIAS_INSUMO, CATALOGO_INSUMOS, Insumo } from '@/constants/catalogs';

const CATEGORIAS_CON_CONSUMO_POR_PIEZA = [
  'Film Fondo',
  'Film Tapa',
  'Fleje',
  'Grapa',
  'Papel Encerado',
];

interface CategoryData {
  descripcion_insumo: string;
  codigo_insumo: string;
  cantidad_piezas_por_caja: number;
  consumo_por_caja: number;
  cantidad_requerida: number;
  unidad_medida: string;
  selectedInsumo: Insumo | null;
  isCheckbox?: boolean;
}

interface AdditionalInsumo {
  id: string;
  categoria_insumo: string;
  descripcion_insumo: string;
  codigo_insumo: string;
  cantidad_piezas_por_caja: number;
  consumo_por_caja: number;
  cantidad_requerida: number;
  unidad_medida: string;
  selectedInsumo: Insumo | null;
}

export default function CreateRecordScreen() {
  const router = useRouter();
  const { addRecordAsync, isAddingRecord, currentUser } = useBOM();
  const { products } = useProduct();

  const [codigoSKU, setCodigoSKU] = useState<string>('');
  const [descripcionSKU, setDescripcionSKU] = useState<string>('');
  const [matchingProducts, setMatchingProducts] = useState<typeof products>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState<boolean>(false);
  const [selectedProductInfo, setSelectedProductInfo] = useState<ProductInfo | null>(null);
  const [additionalInsumos, setAdditionalInsumos] = useState<AdditionalInsumo[]>([]);

  const initialCategoryData: CategoryData = {
    descripcion_insumo: '',
    codigo_insumo: '',
    cantidad_piezas_por_caja: 0,
    consumo_por_caja: 0,
    cantidad_requerida: 0,
    unidad_medida: '',
    selectedInsumo: null,
  };

  const [categoriesData, setCategoriesData] = useState<Record<string, CategoryData>>(
    CATEGORIAS_INSUMO.reduce((acc, categoria) => {
      acc[categoria] = { ...initialCategoryData };
      return acc;
    }, {} as Record<string, CategoryData>)
  );

  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [targetCategoryForModal, setTargetCategoryForModal] = useState<string>('');
  const [insumoSearchText, setInsumoSearchText] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalInsumoId, setCategoryModalInsumoId] = useState<string | null>(null);

  const filteredInsumos = CATALOGO_INSUMOS.filter(
    insumo => {
      const matchesCategory = insumo.categoria === selectedCategory;
      if (!insumoSearchText.trim()) return matchesCategory;
      
      const searchLower = insumoSearchText.toLowerCase();
      const matchesSearch = 
        insumo.descripcion.toLowerCase().includes(searchLower) ||
        insumo.codigo.toLowerCase().includes(searchLower);
      
      return matchesCategory && matchesSearch;
    }
  );

  const formatCodigoSKU = (text: string): string => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (cleaned.length === 0) return '';
    if (cleaned.length === 1) return cleaned;
    return `${cleaned[0]}-${cleaned.slice(1)}`;
  };

  const handleCodigoSKUChange = (text: string) => {
    const formatted = formatCodigoSKU(text);
    setCodigoSKU(formatted);
    
    if (formatted.length > 0) {
      const matches = products.filter((p: ProductInfo) => 
        p.codigo.toLowerCase().includes(formatted.toLowerCase())
      );
      setMatchingProducts(matches);
      setShowProductSuggestions(matches.length > 0);
    } else {
      setMatchingProducts([]);
      setShowProductSuggestions(false);
    }
  };

  const handleSelectProduct = (product: ProductInfo) => {
    setCodigoSKU(product.codigo);
    setDescripcionSKU(product.nombre_producto);
    setShowProductSuggestions(false);
    setSelectedProductInfo(product);
  };

  const [additionalInsumoModalId, setAdditionalInsumoModalId] = useState<string | null>(null);

  const handleSelectInsumo = (insumo: Insumo, targetCategory: string) => {
    if (additionalInsumoModalId) {
      updateAdditionalInsumo(additionalInsumoModalId, 'descripcion_insumo', insumo.descripcion);
      updateAdditionalInsumo(additionalInsumoModalId, 'codigo_insumo', insumo.codigo);
      updateAdditionalInsumo(additionalInsumoModalId, 'unidad_medida', insumo.unidad_medida);
      updateAdditionalInsumo(additionalInsumoModalId, 'selectedInsumo', insumo);
      
      const additionalItem = additionalInsumos.find(item => item.id === additionalInsumoModalId);
      if (additionalItem && selectedProductInfo) {
        if (additionalItem.categoria_insumo === 'Etiqueta Paquetería') {
          updateAdditionalInsumo(additionalInsumoModalId, 'cantidad_piezas_por_caja', selectedProductInfo.cantidad_paquetes_por_caja);
        } else if (additionalItem.categoria_insumo === 'Etiqueta Caja') {
          updateAdditionalInsumo(additionalInsumoModalId, 'cantidad_piezas_por_caja', 1);
          updateAdditionalInsumo(additionalInsumoModalId, 'consumo_por_caja', 2);
        } else if (additionalItem.categoria_insumo === 'Tapa Carton Corrugado' || additionalItem.categoria_insumo === 'Fondo Carton Corrugado' || additionalItem.categoria_insumo === 'Bolsa Master') {
          updateAdditionalInsumo(additionalInsumoModalId, 'consumo_por_caja', 1);
          updateAdditionalInsumo(additionalInsumoModalId, 'cantidad_piezas_por_caja', 1);
        }
      }
      
      setAdditionalInsumoModalId(null);
    } else {
      const isEtiquetaPaqueteria = selectedCategory === 'Etiqueta Paquetería';
      const isEtiquetaCaja = selectedCategory === 'Etiqueta Caja';
      const isTapaFondoCarton = selectedCategory === 'Tapa Carton Corrugado' || selectedCategory === 'Fondo Carton Corrugado';
      const isBolsaMaster = selectedCategory === 'Bolsa Master';
      let cantidadPiezas = 0;
      let consumoPorCaja = 0;
      
      if (isEtiquetaPaqueteria && selectedProductInfo) {
        cantidadPiezas = selectedProductInfo.cantidad_paquetes_por_caja;
      } else if (isEtiquetaCaja && selectedProductInfo) {
        cantidadPiezas = 1;
        consumoPorCaja = 2;
      } else if (isTapaFondoCarton || isBolsaMaster) {
        cantidadPiezas = 1;
        consumoPorCaja = 1;
      }
      
      setCategoriesData(prev => ({
        ...prev,
        [targetCategory]: {
          ...prev[targetCategory],
          descripcion_insumo: insumo.descripcion,
          codigo_insumo: insumo.codigo,
          unidad_medida: insumo.unidad_medida,
          selectedInsumo: insumo,
          cantidad_piezas_por_caja: cantidadPiezas,
          consumo_por_caja: consumoPorCaja,
        },
      }));
    }
    setInsumoSearchText('');
    setShowInsumoModal(false);
  };

  const getCategoriesForPackageType = (tipoEmpaque: string): string[] => {
    switch (tipoEmpaque) {
      case 'BULK PACK':
        return ['Bolsa Master', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado'];
      case 'CAJAS INDIVIDUALES':
        return ['Empaque Primario', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Caja Detalle Tortas', 'Caja Master Tortas', 'Papel Encerado', 'Tapa Carton Corrugado', 'Fondo Carton Corrugado', 'Fleje'];
      case 'FUNDA PLASTICA':
        return ['Bolsa Master', 'Empaque Primario', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado', 'Grapa'];
      case 'INDIVIDUALLY WRAPPED (IW)':
        return ['Bolsa Master', 'Empaque Primario', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado'];
      case 'LAYER PACK (LP)':
        return ['Bolsa Master', 'Empaque Primario', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado'];
      case 'THERMOPACK':
        return ['Bolsa Master', 'Etiqueta Paquetería', 'Etiqueta Paquetería 2', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado', 'Film Tapa', 'Film Fondo'];
      case 'VACUUM PACK':
      case 'VACUUM PACK TBG':
        return ['Bolsa Master', 'Empaque Primario', 'Etiqueta Paquetería', 'Etiqueta Paquetería 2', 'Etiqueta Caja', 'Etiqueta Caja 2', 'Fleje', 'Fondo Carton Corrugado', 'Tapa Carton Corrugado'];
      default:
        return [];
    }
  };

  const visibleCategories = selectedProductInfo 
    ? getCategoriesForPackageType(selectedProductInfo.tipo_empaque)
    : [];

  const handleCheckboxToggle = (categoria: string, checked: boolean) => {
    if (checked) {
      let autoConsumoPorCaja = 0;
      if (categoria === 'Fleje') {
        autoConsumoPorCaja = 0.00045;
      } else if (categoria === 'Grapa') {
        autoConsumoPorCaja = 0.00294;
      }
      
      const flejeInsumo = CATALOGO_INSUMOS.find(i => i.categoria === categoria);
      if (flejeInsumo) {
        setCategoriesData(prev => ({
          ...prev,
          [categoria]: {
            ...prev[categoria],
            descripcion_insumo: flejeInsumo.descripcion,
            codigo_insumo: flejeInsumo.codigo,
            unidad_medida: flejeInsumo.unidad_medida,
            selectedInsumo: flejeInsumo,
            consumo_por_caja: autoConsumoPorCaja,
            cantidad_piezas_por_caja: 1,
            isCheckbox: true,
          },
        }));
      }
    } else {
      setCategoriesData(prev => ({
        ...prev,
        [categoria]: { ...initialCategoryData },
      }));
    }
  };

  const addAdditionalInsumo = () => {
    const newInsumo: AdditionalInsumo = {
      id: Date.now().toString(),
      categoria_insumo: '',
      descripcion_insumo: '',
      codigo_insumo: '',
      cantidad_piezas_por_caja: 0,
      consumo_por_caja: 0,
      cantidad_requerida: 0,
      unidad_medida: '',
      selectedInsumo: null,
    };
    setAdditionalInsumos(prev => [...prev, newInsumo]);
  };

  const removeAdditionalInsumo = (id: string) => {
    setAdditionalInsumos(prev => prev.filter(item => item.id !== id));
  };

  const updateAdditionalInsumo = (id: string, field: keyof AdditionalInsumo, value: any) => {
    setAdditionalInsumos(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  useEffect(() => {
    if (!selectedProductInfo) return;

    if (selectedProductInfo.tipo_empaque === 'THERMOPACK' && selectedProductInfo.size_empaque) {
      const cantidadPaquetes = selectedProductInfo.cantidad_paquetes_por_caja || 0;
      
      let consumoFilmFondo = 0;
      let consumoFilmTapa = 0;

      switch (selectedProductInfo.size_empaque) {
        case '3X1':
          consumoFilmFondo = cantidadPaquetes * 0.000245;
          consumoFilmTapa = cantidadPaquetes * 0.000333;
          break;
        case '2X1':
          consumoFilmFondo = cantidadPaquetes * 0.000369;
          consumoFilmTapa = cantidadPaquetes * 0.000492;
          break;
        case '2X2':
          consumoFilmFondo = cantidadPaquetes * 0.00025;
          consumoFilmTapa = cantidadPaquetes * 0.000327;
          break;
      }

      const filmFondoInsumo = CATALOGO_INSUMOS.find(i => i.categoria === 'Film Fondo');
      const filmTapaInsumo = CATALOGO_INSUMOS.find(i => i.categoria === 'Film Tapa');

      if (filmFondoInsumo && consumoFilmFondo > 0) {
        setCategoriesData(prev => ({
          ...prev,
          'Film Fondo': {
            ...prev['Film Fondo'],
            descripcion_insumo: filmFondoInsumo.descripcion,
            codigo_insumo: filmFondoInsumo.codigo,
            unidad_medida: filmFondoInsumo.unidad_medida,
            selectedInsumo: filmFondoInsumo,
            consumo_por_caja: consumoFilmFondo,
            cantidad_piezas_por_caja: cantidadPaquetes,
          },
        }));
      }

      if (filmTapaInsumo && consumoFilmTapa > 0) {
        setCategoriesData(prev => ({
          ...prev,
          'Film Tapa': {
            ...prev['Film Tapa'],
            descripcion_insumo: filmTapaInsumo.descripcion,
            codigo_insumo: filmTapaInsumo.codigo,
            unidad_medida: filmTapaInsumo.unidad_medida,
            selectedInsumo: filmTapaInsumo,
            consumo_por_caja: consumoFilmTapa,
            cantidad_piezas_por_caja: cantidadPaquetes,
          },
        }));
      }
    }
  }, [selectedProductInfo]);

  useEffect(() => {
    Object.keys(categoriesData).forEach(categoria => {
      const categoryData = categoriesData[categoria];
      const insumo = categoryData.selectedInsumo;
      
      if (insumo) {
        let cantidadCalculada = 0;
        const realCategoria = (categoria === 'Etiqueta Paquetería 2' ? 'Etiqueta Paquetería' : 
                                categoria === 'Etiqueta Caja 2' ? 'Etiqueta Caja' : categoria);
        const isEtiquetaPaqueteria = realCategoria === 'Etiqueta Paquetería';
        const isEtiquetaCaja = realCategoria === 'Etiqueta Caja';
        const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(realCategoria as any);
        
        if (isEtiquetaPaqueteria) {
          if (categoryData.cantidad_piezas_por_caja > 0) {
            cantidadCalculada = categoryData.cantidad_piezas_por_caja / insumo.contenido_por_unidad;
          }
        } else if (isEtiquetaCaja) {
          if (categoryData.consumo_por_caja > 0) {
            cantidadCalculada = categoryData.consumo_por_caja / insumo.contenido_por_unidad;
          }
        } else if (usaConsumoPorPieza) {
          if (categoryData.cantidad_piezas_por_caja > 0 && categoryData.consumo_por_caja > 0) {
            cantidadCalculada = (categoryData.cantidad_piezas_por_caja * categoryData.consumo_por_caja) / insumo.contenido_por_unidad;
          }
        } else {
          if (categoryData.consumo_por_caja > 0) {
            cantidadCalculada = categoryData.consumo_por_caja / insumo.contenido_por_unidad;
          }
        }
        
        if (cantidadCalculada !== categoryData.cantidad_requerida) {
          setCategoriesData(prev => ({
            ...prev,
            [categoria]: {
              ...prev[categoria],
              cantidad_requerida: cantidadCalculada,
            },
          }));
        }
      }
    });

    additionalInsumos.forEach(item => {
      if (item.selectedInsumo) {
        const insumo = item.selectedInsumo;
        let cantidadCalculada = 0;
        const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(item.categoria_insumo);
        const isEtiquetaPaqueteria = item.categoria_insumo === 'Etiqueta Paquetería';
        const isEtiquetaCaja = item.categoria_insumo === 'Etiqueta Caja';
        
        if (isEtiquetaPaqueteria) {
          if (item.cantidad_piezas_por_caja > 0) {
            cantidadCalculada = item.cantidad_piezas_por_caja / insumo.contenido_por_unidad;
          }
        } else if (isEtiquetaCaja) {
          if (item.consumo_por_caja > 0) {
            cantidadCalculada = item.consumo_por_caja / insumo.contenido_por_unidad;
          }
        } else if (usaConsumoPorPieza) {
          if (item.cantidad_piezas_por_caja > 0 && item.consumo_por_caja > 0) {
            cantidadCalculada = (item.cantidad_piezas_por_caja * item.consumo_por_caja) / insumo.contenido_por_unidad;
          }
        } else {
          if (item.consumo_por_caja > 0) {
            cantidadCalculada = item.consumo_por_caja / insumo.contenido_por_unidad;
          }
        }
        
        if (cantidadCalculada !== item.cantidad_requerida) {
          updateAdditionalInsumo(item.id, 'cantidad_requerida', cantidadCalculada);
        }
      }
    });
  }, [categoriesData, additionalInsumos]);

  const updateCategoryField = (categoria: string, field: keyof CategoryData, value: any) => {
    setCategoriesData(prev => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!codigoSKU.trim()) {
      Alert.alert('Error', 'El código SKU es requerido');
      return;
    }
    if (!descripcionSKU.trim()) {
      Alert.alert('Error', 'La descripción SKU es requerida');
      return;
    }

    const categoriasConDatos = visibleCategories.filter(categoria => {
      const data = categoriesData[categoria];
      const isEtiquetaPaqueteria2 = categoria === 'Etiqueta Paquetería 2';
      const isEtiquetaCaja2 = categoria === 'Etiqueta Caja 2';
      if ((isEtiquetaPaqueteria2 || isEtiquetaCaja2) && data.descripcion_insumo.trim() === '') {
        return false;
      }
      return data.descripcion_insumo.trim() !== '' && data.consumo_por_caja > 0;
    });

    const insumosAdicionalesValidos = additionalInsumos.filter(item => 
      item.categoria_insumo.trim() !== '' && 
      item.descripcion_insumo.trim() !== '' && 
      item.consumo_por_caja > 0
    );

    if (categoriasConDatos.length === 0 && insumosAdicionalesValidos.length === 0) {
      Alert.alert('Error', 'Debe completar al menos una categoría de insumo');
      return;
    }

    for (const categoria of categoriasConDatos) {
      const data = categoriesData[categoria];
      const realCategoria = (categoria === 'Etiqueta Paquetería 2' ? 'Etiqueta Paquetería' : 
                              categoria === 'Etiqueta Caja 2' ? 'Etiqueta Caja' : categoria);
      const isEtiquetaPaqueteria = realCategoria === 'Etiqueta Paquetería';
      const isEtiquetaCaja = realCategoria === 'Etiqueta Caja';
      const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(realCategoria);

      if (!data.codigo_insumo.trim()) {
        Alert.alert('Error', `El código de insumo es requerido en "${categoria}"`);
        return;
      }
      if (!data.descripcion_insumo.trim()) {
        Alert.alert('Error', `La descripción de insumo es requerida en "${categoria}"`);
        return;
      }
      if (!isEtiquetaPaqueteria && !isEtiquetaCaja && data.consumo_por_caja <= 0) {
        Alert.alert('Error', `El ${usaConsumoPorPieza ? 'consumo por pieza' : 'consumo por caja'} debe ser mayor a 0 en "${categoria}"`);
        return;
      }
      if (data.cantidad_piezas_por_caja <= 0) {
        Alert.alert('Error', `La cantidad de ${isEtiquetaPaqueteria ? 'etiquetas' : 'piezas'} por caja debe ser mayor a 0 en "${categoria}"`);
        return;
      }
    }

    for (const item of insumosAdicionalesValidos) {
      const isEtiquetaPaqueteria = item.categoria_insumo === 'Etiqueta Paquetería';
      const isEtiquetaCaja = item.categoria_insumo === 'Etiqueta Caja';
      const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(item.categoria_insumo);
      
      if (!item.codigo_insumo.trim()) {
        Alert.alert('Error', `El código de insumo es requerido en un insumo adicional`);
        return;
      }
      if (!isEtiquetaPaqueteria && !isEtiquetaCaja && item.consumo_por_caja <= 0) {
        Alert.alert('Error', `El ${usaConsumoPorPieza ? 'consumo por pieza' : 'consumo por caja'} debe ser mayor a 0 en un insumo adicional`);
        return;
      }
      if (item.cantidad_piezas_por_caja <= 0) {
        Alert.alert('Error', `La cantidad de ${isEtiquetaPaqueteria ? 'etiquetas' : 'piezas'} por caja debe ser mayor a 0 en un insumo adicional`);
        return;
      }
    }

    const totalRegistros = categoriasConDatos.length + insumosAdicionalesValidos.length;
    console.log(`Preparando para guardar ${totalRegistros} registros`);

    const registrosParaGuardar: BOMFormData[] = [];

    categoriasConDatos.forEach(categoria => {
      const data = categoriesData[categoria];
      let realCategoria = categoria;
      if (categoria === 'Etiqueta Paquetería 2') {
        realCategoria = 'Etiqueta Paquetería';
      } else if (categoria === 'Etiqueta Caja 2') {
        realCategoria = 'Etiqueta Caja';
      }
      
      const formData: BOMFormData = {
        codigo_sku: codigoSKU,
        descripcion_sku: descripcionSKU,
        categoria_insumo: realCategoria,
        codigo_insumo: data.codigo_insumo,
        descripcion_insumo: data.descripcion_insumo,
        cantidad_requerida: data.cantidad_requerida,
        cantidad_piezas_por_caja: data.cantidad_piezas_por_caja,
        consumo_por_caja: data.consumo_por_caja,
        unidad_medida: data.unidad_medida,
        createdBy: currentUser,
      };
      registrosParaGuardar.push(formData);
    });

    insumosAdicionalesValidos.forEach(item => {
      const formData: BOMFormData = {
        codigo_sku: codigoSKU,
        descripcion_sku: descripcionSKU,
        categoria_insumo: item.categoria_insumo,
        codigo_insumo: item.codigo_insumo,
        descripcion_insumo: item.descripcion_insumo,
        cantidad_requerida: item.cantidad_requerida,
        cantidad_piezas_por_caja: item.cantidad_piezas_por_caja,
        consumo_por_caja: item.consumo_por_caja,
        unidad_medida: item.unidad_medida,
        createdBy: currentUser,
      };
      registrosParaGuardar.push(formData);
    });

    console.log(`Total de registros preparados: ${registrosParaGuardar.length}`);

    let registrosGuardadosExitosamente = 0;

    for (let i = 0; i < registrosParaGuardar.length; i++) {
      const registro = registrosParaGuardar[i];
      console.log(`Guardando registro ${i + 1}/${registrosParaGuardar.length}: ${registro.categoria_insumo}`);
      try {
        await addRecordAsync(registro);
        registrosGuardadosExitosamente++;
        console.log(`Registro ${i + 1} guardado exitosamente`);
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error guardando registro ${i + 1}:`, error);
        Alert.alert(
          'Error',
          `Error al guardar el registro ${i + 1} de ${registrosParaGuardar.length}.\n\n${registrosGuardadosExitosamente} registros fueron guardados exitosamente antes del error.\n\nPor favor, intenta nuevamente.`
        );
        return;
      }
    }
    
    console.log(`Todos los ${registrosGuardadosExitosamente} registros guardados exitosamente`);
    
    Alert.alert(
      'Éxito',
      `${registrosGuardadosExitosamente} registro(s) creado(s) exitosamente`,
      [
        {
          text: 'Ver Registros',
          onPress: () => router.replace('/update-records'),
        },
        {
          text: 'Crear Otro',
          onPress: () => {
            setCodigoSKU('');
            setDescripcionSKU('');
            setSelectedProductInfo(null);
            setAdditionalInsumos([]);
            setCategoriesData(
              CATEGORIAS_INSUMO.reduce((acc, categoria) => {
                acc[categoria] = { ...initialCategoryData };
                return acc;
              }, {} as Record<string, CategoryData>)
            );
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: 'Crear Nuevo Registro',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={CARNIC_COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.iconHeader}>
            <View style={styles.iconCircle}>
              <Package size={32} color={CARNIC_COLORS.secondary} />
            </View>
            <Text style={styles.headerTitle}>Nuevo Material</Text>
            <Text style={styles.headerSubtitle}>Complete la información del registro</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Código SKU *</Text>
              <Text style={styles.hint}>Ingrese solo números (ej: 1193 → 1-193)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 1193"
                value={codigoSKU}
                onChangeText={handleCodigoSKUChange}
                keyboardType="numeric"
                maxLength={5}
              />
              {showProductSuggestions && matchingProducts.length > 0 && (
                <View style={styles.suggestions}>
                  {matchingProducts.slice(0, 5).map((product: ProductInfo) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectProduct(product)}
                    >
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionCode}>{product.codigo}</Text>
                        <Text style={styles.suggestionName}>{product.nombre_producto}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre del Producto *</Text>
              <Text style={styles.hint}>Autollenado al seleccionar un código SKU</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledInputText}>
                  {descripcionSKU || 'Seleccione un código SKU'}
                </Text>
              </View>
            </View>

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Categorías de Insumo</Text>
              <Text style={styles.sectionSubtitle}>
                Complete las categorías que necesite. Se creará un registro por cada categoría completada.
              </Text>
            </View>

            {!selectedProductInfo && (
              <View style={styles.noProductWarning}>
                <Text style={styles.noProductWarningText}>
                  Seleccione un código SKU para ver las categorías de insumo
                </Text>
              </View>
            )}

            {selectedProductInfo && visibleCategories.map(categoria => {
              const categoryData = categoriesData[categoria] || { ...initialCategoryData };
              const isEtiquetaPaqueteria2 = categoria === 'Etiqueta Paquetería 2';
              const isEtiquetaCaja2 = categoria === 'Etiqueta Caja 2';
              let realCategoria = categoria;
              if (isEtiquetaPaqueteria2) {
                realCategoria = 'Etiqueta Paquetería';
              } else if (isEtiquetaCaja2) {
                realCategoria = 'Etiqueta Caja';
              }
              const isEtiquetaPaqueteria = realCategoria === 'Etiqueta Paquetería';
              const isEtiquetaCaja = realCategoria === 'Etiqueta Caja';
              const isTapaFondoCarton = categoria === 'Tapa Carton Corrugado' || categoria === 'Fondo Carton Corrugado';
              const isBolsaMaster = categoria === 'Bolsa Master';
              const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(realCategoria);
              const isCheckboxCategory = categoria === 'Fleje' || categoria === 'Grapa';
              const isFilmAutoCalculated = (categoria === 'Film Tapa' || categoria === 'Film Fondo') && selectedProductInfo.tipo_empaque === 'THERMOPACK';
              const isChecked = categoryData?.descripcion_insumo !== '';
              
              return (
                <View key={categoria} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryTitle}>{categoria}</Text>
                    {isCheckboxCategory && (
                      <Switch
                        value={isChecked}
                        onValueChange={(checked) => handleCheckboxToggle(categoria, checked)}
                        trackColor={{ false: '#e2e8f0', true: CARNIC_COLORS.secondary }}
                        thumbColor="#fff"
                      />
                    )}
                  </View>

                  {isCheckboxCategory && isChecked && (
                    <View style={styles.autoFilledNotice}>
                      <Text style={styles.autoFilledNoticeText}>
                        ✓ Valor automático: {categoria === 'Fleje' ? '0.00045' : '0.00294'}
                      </Text>
                    </View>
                  )}

                  {isFilmAutoCalculated && categoryData.descripcion_insumo && (
                    <View style={styles.autoFilledNotice}>
                      <Text style={styles.autoFilledNoticeText}>
                        ✓ Calculado automáticamente según Size de Empaque ({selectedProductInfo.size_empaque})
                      </Text>
                    </View>
                  )}
                  
                  {!isCheckboxCategory && !isFilmAutoCalculated && (
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Descripción de Insumo</Text>
                      <Text style={styles.hint}>
                        {isEtiquetaPaqueteria2 ? 'Opcional: Segunda etiqueta de paquetería' : 
                         isEtiquetaCaja2 ? 'Opcional: Segunda etiqueta de caja' : 
                         'Seleccione del catálogo filtrado por categoría'}
                      </Text>
                      <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => {
                          setSelectedCategory(realCategoria);
                          setTargetCategoryForModal(categoria);
                          setShowInsumoModal(true);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownText,
                            !categoryData.descripcion_insumo && styles.placeholderText,
                          ]}
                        >
                          {categoryData.descripcion_insumo || 'Seleccione un insumo'}
                        </Text>
                        <ChevronDown size={20} color={CARNIC_COLORS.gray[500]} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {(isTapaFondoCarton || isBolsaMaster) && categoryData.descripcion_insumo && (
                    <View style={styles.autoFilledNotice}>
                      <Text style={styles.autoFilledNoticeText}>
                        ✓ Consumo por caja fijo: 1 unidad
                      </Text>
                    </View>
                  )}

                  {isEtiquetaCaja && categoryData.descripcion_insumo && (
                    <View style={styles.autoFilledNotice}>
                      <Text style={styles.autoFilledNoticeText}>
                        ✓ Consumo por caja fijo: 2 unidades
                      </Text>
                    </View>
                  )}

                  {!isCheckboxCategory && categoryData.descripcion_insumo && (
                    <>
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Código de Insumo</Text>
                        <View style={styles.disabledInput}>
                          <Text style={styles.disabledInputText}>
                            {categoryData.codigo_insumo || 'Se asigna automáticamente'}
                          </Text>
                        </View>
                      </View>

                      {isEtiquetaPaqueteria && (
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Cantidad de Etiquetas por Caja</Text>
                          <View style={styles.disabledInput}>
                            <Text style={styles.disabledInputText}>
                              {categoryData.cantidad_piezas_por_caja || 'Tomado del producto'}
                            </Text>
                          </View>
                          <Text style={styles.hint}>
                            Tomado automáticamente de la cantidad de paquetes por caja del producto
                          </Text>
                        </View>
                      )}



                      {!isEtiquetaPaqueteria && !isEtiquetaCaja && usaConsumoPorPieza && !isFilmAutoCalculated && (
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>Cantidad de Piezas por Caja</Text>
                          <Text style={styles.hint}>Número de piezas que contiene cada caja</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0"
                            value={categoryData.cantidad_piezas_por_caja > 0 ? String(categoryData.cantidad_piezas_por_caja) : ''}
                            onChangeText={value => {
                              const num = parseFloat(value) || 0;
                              updateCategoryField(categoria, 'cantidad_piezas_por_caja', num);
                            }}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      )}

                      {!isEtiquetaPaqueteria && !isEtiquetaCaja && !isFilmAutoCalculated && !isTapaFondoCarton && !isBolsaMaster && (
                        <View style={styles.formGroup}>
                          <Text style={styles.label}>{usaConsumoPorPieza ? 'Consumo por Pieza' : 'Consumo por Caja'}</Text>
                          <Text style={styles.hint}>
                            {usaConsumoPorPieza 
                              ? 'Cantidad que consume cada pieza'
                              : 'Cantidad que consume cada caja del SKU'}
                          </Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0"
                            value={categoryData.consumo_por_caja > 0 ? String(categoryData.consumo_por_caja) : ''}
                            onChangeText={value => {
                              const num = parseFloat(value) || 0;
                              updateCategoryField(categoria, 'consumo_por_caja', num);
                            }}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      )}

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Cantidad Requerida (Calculada)</Text>
                        <View style={styles.calculatedField}>
                          <Text style={styles.calculatedValue}>
                            {categoryData.cantidad_requerida > 0
                              ? (categoryData.unidad_medida === 'BOLSAS' || categoryData.unidad_medida === 'UND'
                                  ? Math.round(categoryData.cantidad_requerida).toString()
                                  : categoryData.cantidad_requerida.toFixed(6))
                              : (categoryData.unidad_medida === 'BOLSAS' || categoryData.unidad_medida === 'UND' ? '0' : '0.000000')}
                          </Text>
                          {categoryData.selectedInsumo && (
                            <Text style={styles.calculatedHint}>
                              {isEtiquetaPaqueteria
                                ? `= ${categoryData.cantidad_piezas_por_caja} / ${categoryData.selectedInsumo.contenido_por_unidad}`
                                : isEtiquetaCaja
                                ? `= ${categoryData.consumo_por_caja} / ${categoryData.selectedInsumo.contenido_por_unidad}`
                                : usaConsumoPorPieza
                                ? `= (${categoryData.cantidad_piezas_por_caja} × ${categoryData.consumo_por_caja}) / ${categoryData.selectedInsumo.contenido_por_unidad}`
                                : `= ${categoryData.consumo_por_caja} / ${categoryData.selectedInsumo.contenido_por_unidad}`}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Unidad de Medida</Text>
                        <View style={styles.disabledInput}>
                          <Text style={styles.disabledInputText}>
                            {categoryData.unidad_medida || 'Se asigna automáticamente'}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            {selectedProductInfo && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Insumos Adicionales</Text>
                  <Text style={styles.sectionSubtitle}>
                    Agregue cualquier insumo adicional que no esté en las categorías principales
                  </Text>
                </View>

                {additionalInsumos.map((item, index) => {
                  const isEtiquetaPaqueteria = item.categoria_insumo === 'Etiqueta Paquetería';
                  const isEtiquetaCaja = item.categoria_insumo === 'Etiqueta Caja';
                  const isTapaFondoCarton = item.categoria_insumo === 'Tapa Carton Corrugado' || item.categoria_insumo === 'Fondo Carton Corrugado';
                  const isBolsaMaster = item.categoria_insumo === 'Bolsa Master';
                  const usaConsumoPorPieza = CATEGORIAS_CON_CONSUMO_POR_PIEZA.includes(item.categoria_insumo);
                  
                  return (
                    <View key={item.id} style={styles.additionalInsumoSection}>
                      <View style={styles.additionalInsumoHeader}>
                        <Text style={styles.additionalInsumoTitle}>Insumo Adicional #{index + 1}</Text>
                        <TouchableOpacity
                          onPress={() => removeAdditionalInsumo(item.id)}
                          style={styles.removeButton}
                        >
                          <X size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Categoría de Insumo *</Text>
                        <TouchableOpacity
                          style={styles.dropdown}
                          onPress={() => {
                            setCategoryModalInsumoId(item.id);
                            setShowCategoryModal(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownText,
                              !item.categoria_insumo && styles.placeholderText,
                            ]}
                          >
                            {item.categoria_insumo || 'Seleccione una categoría'}
                          </Text>
                          <ChevronDown size={20} color={CARNIC_COLORS.gray[500]} />
                        </TouchableOpacity>
                      </View>

                      {item.categoria_insumo && (
                        <>
                          <View style={styles.formGroup}>
                            <Text style={styles.label}>Descripción de Insumo *</Text>
                            <TouchableOpacity
                              style={styles.dropdown}
                              onPress={() => {
                                setSelectedCategory(item.categoria_insumo);
                                setAdditionalInsumoModalId(item.id);
                                setShowInsumoModal(true);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownText,
                                  !item.descripcion_insumo && styles.placeholderText,
                                ]}
                              >
                                {item.descripcion_insumo || 'Seleccione un insumo'}
                              </Text>
                              <ChevronDown size={20} color={CARNIC_COLORS.gray[500]} />
                            </TouchableOpacity>
                          </View>

                          {(isTapaFondoCarton || isBolsaMaster) && item.descripcion_insumo && (
                            <View style={styles.autoFilledNotice}>
                              <Text style={styles.autoFilledNoticeText}>
                                ✓ Consumo por caja fijo: 1 unidad
                              </Text>
                            </View>
                          )}

                          {isEtiquetaCaja && item.descripcion_insumo && (
                            <View style={styles.autoFilledNotice}>
                              <Text style={styles.autoFilledNoticeText}>
                                ✓ Consumo por caja fijo: 2 unidades
                              </Text>
                            </View>
                          )}

                          {item.descripcion_insumo && (
                            <>
                              <View style={styles.formGroup}>
                                <Text style={styles.label}>Código de Insumo</Text>
                                <View style={styles.disabledInput}>
                                  <Text style={styles.disabledInputText}>
                                    {item.codigo_insumo || 'Se asigna automáticamente'}
                                  </Text>
                                </View>
                              </View>

                              {isEtiquetaPaqueteria && (
                                <View style={styles.formGroup}>
                                  <Text style={styles.label}>Cantidad de Etiquetas por Caja</Text>
                                  <View style={styles.disabledInput}>
                                    <Text style={styles.disabledInputText}>
                                      {item.cantidad_piezas_por_caja || 'Tomado del producto'}
                                    </Text>
                                  </View>
                                  <Text style={styles.hint}>
                                    Tomado automáticamente de la cantidad de paquetes por caja del producto
                                  </Text>
                                </View>
                              )}



                              {!isEtiquetaPaqueteria && !isEtiquetaCaja && usaConsumoPorPieza && (
                                <View style={styles.formGroup}>
                                  <Text style={styles.label}>Cantidad de Piezas por Caja *</Text>
                                  <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={item.cantidad_piezas_por_caja > 0 ? String(item.cantidad_piezas_por_caja) : ''}
                                    onChangeText={value => {
                                      const num = parseFloat(value) || 0;
                                      updateAdditionalInsumo(item.id, 'cantidad_piezas_por_caja', num);
                                    }}
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                              )}

                              {!isEtiquetaPaqueteria && !isEtiquetaCaja && !isTapaFondoCarton && !isBolsaMaster && (
                                <View style={styles.formGroup}>
                                  <Text style={styles.label}>{usaConsumoPorPieza ? 'Consumo por Pieza *' : 'Consumo por Caja *'}</Text>
                                  <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    value={item.consumo_por_caja > 0 ? String(item.consumo_por_caja) : ''}
                                    onChangeText={value => {
                                      const num = parseFloat(value) || 0;
                                      updateAdditionalInsumo(item.id, 'consumo_por_caja', num);
                                    }}
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                              )}

                              <View style={styles.formGroup}>
                                <Text style={styles.label}>Cantidad Requerida (Calculada)</Text>
                                <View style={styles.calculatedField}>
                                  <Text style={styles.calculatedValue}>
                                    {item.cantidad_requerida > 0
                                      ? (item.unidad_medida === 'BOLSAS' || item.unidad_medida === 'UND'
                                          ? Math.round(item.cantidad_requerida).toString()
                                          : item.cantidad_requerida.toFixed(6))
                                      : (item.unidad_medida === 'BOLSAS' || item.unidad_medida === 'UND' ? '0' : '0.000000')}
                                  </Text>
                                  {item.selectedInsumo && (
                                    <Text style={styles.calculatedHint}>
                                      {isEtiquetaPaqueteria
                                        ? `= ${item.cantidad_piezas_por_caja} / ${item.selectedInsumo.contenido_por_unidad}`
                                        : isEtiquetaCaja
                                        ? `= ${item.consumo_por_caja} / ${item.selectedInsumo.contenido_por_unidad}`
                                        : usaConsumoPorPieza
                                        ? `= (${item.cantidad_piezas_por_caja} × ${item.consumo_por_caja}) / ${item.selectedInsumo.contenido_por_unidad}`
                                        : `= ${item.consumo_por_caja} / ${item.selectedInsumo.contenido_por_unidad}`}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={addAdditionalInsumo}
                >
                  <Plus size={20} color={CARNIC_COLORS.secondary} />
                  <Text style={styles.addButtonText}>Agregar Insumo Adicional</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isAddingRecord && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isAddingRecord}
            activeOpacity={0.8}
          >
            <Save size={20} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.submitButtonText}>
              {isAddingRecord ? 'Guardando...' : 'Guardar Registro'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showInsumoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowInsumoModal(false);
          setInsumoSearchText('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccione Insumo</Text>
              <TouchableOpacity onPress={() => {
                setShowInsumoModal(false);
                setInsumoSearchText('');
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por descripción o código..."
                value={insumoSearchText}
                onChangeText={setInsumoSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView>
              {filteredInsumos.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {insumoSearchText.trim() 
                      ? 'No se encontraron insumos con ese criterio'
                      : 'No hay insumos para esta categoría'}
                  </Text>
                </View>
              ) : (
                filteredInsumos.map((insumo, index) => {
                  let isSelected = false;
                  if (additionalInsumoModalId) {
                    const additionalItem = additionalInsumos.find(item => item.id === additionalInsumoModalId);
                    isSelected = additionalItem?.codigo_insumo === insumo.codigo && additionalItem?.descripcion_insumo === insumo.descripcion;
                  } else if (targetCategoryForModal) {
                    const categoryData = categoriesData[targetCategoryForModal];
                    if (categoryData) {
                      isSelected = categoryData.codigo_insumo === insumo.codigo && categoryData.descripcion_insumo === insumo.descripcion;
                    }
                  }
                  
                  return (
                    <TouchableOpacity
                      key={`${insumo.codigo}-${insumo.descripcion}-${index}`}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected,
                      ]}
                      onPress={() => handleSelectInsumo(insumo, targetCategoryForModal || selectedCategory)}
                    >
                      <Text
                        style={[
                          styles.modalItemText,
                          isSelected && styles.modalItemTextSelected,
                        ]}
                      >
                        {insumo.descripcion}
                      </Text>
                      <Text style={styles.modalItemSubtext}>
                        Código: {insumo.codigo} | Contenido: {insumo.contenido_por_unidad} {insumo.unidad_medida}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCategoryModal(false);
          setCategoryModalInsumoId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccione Categoría</Text>
              <TouchableOpacity onPress={() => {
                setShowCategoryModal(false);
                setCategoryModalInsumoId(null);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CATEGORIAS_INSUMO.map((cat, index) => (
                <TouchableOpacity
                  key={`category-${cat}-${index}`}
                  style={styles.modalItem}
                  onPress={() => {
                    if (categoryModalInsumoId) {
                      updateAdditionalInsumo(categoryModalInsumoId, 'categoria_insumo', cat);
                    }
                    setShowCategoryModal(false);
                    setCategoryModalInsumoId(null);
                  }}
                >
                  <Text style={styles.modalItemText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CARNIC_COLORS.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#f8fafc',
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
  submitButton: {
    flexDirection: 'row',
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
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
  },

  suggestions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  suggestionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionContent: {
    padding: 14,
  },
  suggestionCode: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#0ea5e9',
    marginBottom: 4,
  },
  suggestionName: {
    fontSize: 13,
    color: '#334155',
  },
  sectionDivider: {
    marginVertical: 24,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  categorySection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: CARNIC_COLORS.secondary,
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: CARNIC_COLORS.lightGreen,
  },
  autoFilledNotice: {
    backgroundColor: '#e6f7ed',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  autoFilledNoticeText: {
    fontSize: 13,
    color: CARNIC_COLORS.secondary,
    fontWeight: '600' as const,
  },
  noProductWarning: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  noProductWarningText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  additionalInsumoSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fefce8',
    padding: 16,
    borderRadius: 12,
  },
  additionalInsumoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  additionalInsumoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#854d0e',
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CARNIC_COLORS.secondary,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.secondary,
    marginLeft: 8,
  },
});
