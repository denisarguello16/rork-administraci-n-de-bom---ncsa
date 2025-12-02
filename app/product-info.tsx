import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react-native';
import { useProduct } from '@/context/ProductContext';
import { ProductInfo } from '@/types/product';
import { CARNIC_COLORS } from '@/constants/colors';

// Helper seguro para formatear números
const formatNumber = (value: any, decimals: number = 2): string => {
  if (value === null || value === undefined || value === '') return '-';

  const num =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(',', '.')); // por si viene con coma

  if (Number.isNaN(num)) {
    // si no se puede convertir, regresamos el valor como texto
    return String(value);
  }

  return num.toFixed(decimals);
};

export default function ProductInfoScreen() {
  const { products, deleteProduct } = useProduct();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p: ProductInfo) =>
        (p.codigo || '').toLowerCase().includes(query) ||
        (p.nombre_producto || '').toLowerCase().includes(query) ||
        (p.sala_origen || '').toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleDelete = (product: ProductInfo) => {
    setSelectedProduct(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (selectedProduct) {
      deleteProduct(selectedProduct.id);
      setShowDeleteModal(false);
      setSelectedProduct(null);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Información de Producto',
          headerStyle: {
            backgroundColor: CARNIC_COLORS.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />

      <LinearGradient
        colors={['#0ea5e9', '#0284c7']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Productos Registrados</Text>
        <Text style={styles.headerSubtitle}>
          {filteredProducts.length} productos encontrados
        </Text>
      </LinearGradient>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color={CARNIC_COLORS.gray[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código, nombre o sala..."
            placeholderTextColor={CARNIC_COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={CARNIC_COLORS.gray[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredProducts.map((product: ProductInfo) => (
          <View key={product.id} style={styles.productCard}>
            <View style={styles.productHeader}>
              <View style={styles.productHeaderLeft}>
                <Text style={styles.productCode}>{product.codigo}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{product.tipo_empaque}</Text>
                </View>
              </View>
              <View style={styles.productActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({ pathname: '/create-product', params: { edit: product.id } })
                  }
                >
                  <Edit2 size={18} color={CARNIC_COLORS.secondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(product)}
                >
                  <Trash2 size={18} color={CARNIC_COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.productName}>{product.nombre_producto}</Text>

            <View style={styles.productDetails}>
              {product.tipo_empaque !== 'BULK PACK (GRANEL)' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Paquetes por Caja:</Text>
                  <Text style={styles.detailValue}>
                    {product.cantidad_paquetes_por_caja ?? '-'}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Peso Promedio por Caja:</Text>
                <Text style={styles.detailValue}>
                  {formatNumber(product.peso_por_caja, 2)} lb
                </Text>
              </View>
              {product.tipo_empaque !== 'BULK PACK (GRANEL)' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Peso Promedio/Paquete:</Text>
                  <Text style={styles.detailValue}>
                    {formatNumber(product.peso_promedio_por_paquete, 2)} lb
                  </Text>
                </View>
              )}
              {product.tipo_empaque === 'THERMOPACK' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Size Empaque:</Text>
                  <Text style={styles.detailValue}>{product.size_empaque || '-'}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Sala Origen:</Text>
                <Text style={styles.detailValue}>{product.sala_origen}</Text>
              </View>
            </View>

            <View style={styles.productFooter}>
              <Text style={styles.footerText}>
                Creado por {product.createdBy || 'Desconocido'} •{' '}
                {product.createdAt
                  ? new Date(product.createdAt).toLocaleDateString()
                  : '-'}
              </Text>
            </View>
          </View>
        ))}

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim()
                ? 'No se encontraron productos'
                : 'No hay productos registrados'}
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/create-product')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#0ea5e9', '#0284c7']}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#fff" strokeWidth={3} />
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmar Eliminación</Text>
            <Text style={styles.modalText}>
              ¿Estás seguro de eliminar el producto &quot;{selectedProduct?.nombre_producto}&quot;?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: CARNIC_COLORS.dark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  productCode: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#0ea5e9',
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0284c7',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: CARNIC_COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.dark,
    marginBottom: 16,
  },
  productDetails: {
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: CARNIC_COLORS.gray[600],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.dark,
  },
  productFooter: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: CARNIC_COLORS.gray[200],
  },
  footerText: {
    fontSize: 12,
    color: CARNIC_COLORS.gray[500],
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: CARNIC_COLORS.gray[500],
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 28,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: CARNIC_COLORS.dark,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: CARNIC_COLORS.gray[600],
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: CARNIC_COLORS.gray[100],
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.gray[700],
  },
  deleteButton: {
    backgroundColor: CARNIC_COLORS.primary,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});

