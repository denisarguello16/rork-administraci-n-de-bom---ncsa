import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FilePlus, RefreshCw, LogOut, Package, Info } from 'lucide-react-native';
import { useBOM } from '@/context/BOMContext';
import { CARNIC_COLORS } from '@/constants/colors';
import { BOMRecord } from '@/types/bom';
import { ProductInfo } from '@/types/product';

import { useProduct } from '@/context/ProductContext';

export default function DashboardScreen() {
  const { currentUser, logout, records } = useBOM();
  const { products } = useProduct();
  const router = useRouter();

  const validRecords = records.filter((record: any): record is BOMRecord => {
    if (!record || typeof record !== 'object') return false;
    if (!record.descripcion_insumo || typeof record.descripcion_insumo !== 'string') return false;
    return true;
  });
  
  const validProducts = products.filter((product: any): product is ProductInfo => {
    if (!product || typeof product !== 'object') return false;
    return true;
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[CARNIC_COLORS.primary, '#ff4d56']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pahcl4pwrboz94h1g6dt5' }}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.greeting}>Bienvenido,</Text>
              <Text style={styles.userName}>{currentUser}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Package size={24} color="#fff" />
            <Text style={styles.statNumber}>{validRecords.length}</Text>
            <Text style={styles.statLabel}>Registros BOM</Text>
          </View>
          <View style={styles.statCard}>
            <Info size={24} color="#fff" />
            <Text style={styles.statNumber}>{validProducts.length}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Módulos del Sistema</Text>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => router.push('/create-record')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[CARNIC_COLORS.secondary, '#00a347']}
            style={styles.moduleGradient}
          >
            <View style={styles.iconContainer}>
              <FilePlus size={32} color="#fff" strokeWidth={2.5} />
            </View>
            <Text style={styles.moduleTitle}>Creación de Nuevo Registro</Text>
            <Text style={styles.moduleDescription}>
              Agregar un nuevo SKU al BOM
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => router.push('/update-records')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[CARNIC_COLORS.primary, '#ff4d56']}
            style={styles.moduleGradient}
          >
            <View style={styles.iconContainer}>
              <RefreshCw size={32} color="#fff" strokeWidth={2.5} />
            </View>
            <Text style={styles.moduleTitle}>Actualización de Registro</Text>
            <Text style={styles.moduleDescription}>
              Consultar y actualizar registros existentes en el sistema
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => router.push('/product-info' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#0ea5e9', '#0284c7']}
            style={styles.moduleGradient}
          >
            <View style={styles.iconContainer}>
              <Info size={32} color="#fff" strokeWidth={2.5} />
            </View>
            <Text style={styles.moduleTitle}>Información de Producto</Text>
            <Text style={styles.moduleDescription}>
              Gestionar información detallada de productos
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 80,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
  },
  logoutButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#0f172a',
    marginBottom: 20,
  },
  moduleCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  moduleGradient: {
    padding: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  moduleTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 20,
  },
});
