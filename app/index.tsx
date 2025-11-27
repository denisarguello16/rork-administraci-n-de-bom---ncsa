import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useBOM } from '@/context/BOMContext';
import { CARNIC_COLORS } from '@/constants/colors';
import { ArrowRight } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [name, setName] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const { login, isLoadingUser } = useBOM();
  const router = useRouter();

  const handleLogin = () => {
    if (name.trim()) {
      login(name.trim());
      router.replace('/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <View style={styles.logoCard}>
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/pahcl4pwrboz94h1g6dt5' }}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.welcomeText}>Bienvenido</Text>
              <Text style={styles.title}>Administración de BOM</Text>
              <View style={styles.divider} />
              <Text style={styles.subtitle}>Planeación Estratégica</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderLine} />
              <Text style={styles.formTitle}>Iniciar Sesión</Text>
              <View style={styles.formHeaderLine} />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nombre de Usuario</Text>
              <View style={[
                styles.inputContainer,
                isFocused && styles.inputContainerFocused
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa tu nombre completo"
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                !name.trim() && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={!name.trim() || isLoadingUser}
              activeOpacity={0.85}
            >
              {isLoadingUser ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Continuar</Text>
                  <View style={styles.arrowCircle}>
                    <ArrowRight size={20} color="#ffffff" strokeWidth={2.5} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>Desarrollado en Nuevo Carnic, S.A.</Text>
            <View style={styles.footerDot} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CARNIC_COLORS.background,
  },
  backgroundPattern: {
    position: 'absolute',
    width: width,
    height: height,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.08,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: CARNIC_COLORS.primary,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: CARNIC_COLORS.secondary,
    bottom: -50,
    left: -70,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: CARNIC_COLORS.primary,
    top: height * 0.4,
    left: -50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCard: {
    width: 200,
    height: 90,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: CARNIC_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(227, 30, 36, 0.1)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.gray[500],
    marginBottom: 8,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: CARNIC_COLORS.dark,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  divider: {
    width: 60,
    height: 3,
    backgroundColor: CARNIC_COLORS.primary,
    borderRadius: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: CARNIC_COLORS.gray[600],
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  formHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: CARNIC_COLORS.gray[200],
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: CARNIC_COLORS.gray[700],
    marginHorizontal: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: CARNIC_COLORS.gray[700],
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputContainer: {
    backgroundColor: CARNIC_COLORS.gray[50],
    borderRadius: 14,
    borderWidth: 2,
    borderColor: CARNIC_COLORS.gray[200],
  },
  inputContainerFocused: {
    borderColor: CARNIC_COLORS.primary,
    backgroundColor: '#ffffff',
  },
  input: {
    height: 54,
    paddingHorizontal: 18,
    fontSize: 16,
    color: CARNIC_COLORS.dark,
    fontWeight: '500' as const,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: CARNIC_COLORS.primary,
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: CARNIC_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  loginButtonDisabled: {
    backgroundColor: CARNIC_COLORS.gray[300],
    shadowOpacity: 0.05,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: CARNIC_COLORS.gray[400],
    marginHorizontal: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: CARNIC_COLORS.gray[500],
    letterSpacing: 0.5,
  },
});
