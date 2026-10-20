import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { Redirect, Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '../../components/Icons';

// ─── Icon Input Field ────────────────────────────────────────────
type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  rightElement?: React.ReactNode;
};

const Field = ({
  label, value, onChangeText, placeholder,
  icon, secureTextEntry, keyboardType = 'default',
  autoCapitalize = 'none', rightElement,
}: FieldProps) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.inputRow}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.ink3}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {rightElement && <View style={styles.inputRight}>{rightElement}</View>}
    </View>
  </View>
);

// ─── Login Screen ────────────────────────────────────────────────
export default function LoginScreen() {
  const { user, login, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();
  const [email, setEmail] = useState('demo@kita.ph');
  const [password, setPassword] = useState('demo1234');
  const [showPass, setShowPass] = useState(false);

  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 10) {
      tapCount.current = 0;
      router.push('/admin');
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    }
  };

  if (user) return <Redirect href="/home" />;

  const handleLogin = () => {
    clearError();
    login(email, password);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <TouchableOpacity onPress={handleLogoTap} activeOpacity={1}>
              <Text style={styles.heroLogo}>Kita</Text>
            </TouchableOpacity>
            <Text style={styles.heroTagline}>Ang POS na ginawa para sa{'\n'}karinderia ng Pilipinas.</Text>
            <View style={styles.heroFeatures}>
              {[
                'Tindera mode — tap-to-order',
                'Real-time inventory tracking',
                'AI insights para sa negosyo mo',
                'GCash-ready checkout',
              ].map((f) => (
                <View key={f} style={styles.heroFeatureRow}>
                  <View style={styles.heroDot} />
                  <Text style={styles.heroFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Card */}
          <View style={styles.card}>

            {/* Tab switcher */}
            <View style={styles.tabs}>
              <View style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Mag-login</Text>
              </View>
              <Link href="/signup" style={styles.tabLink} asChild>
                <TouchableOpacity style={styles.tab}>
                  <Text style={styles.tabText}>Mag-sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Text style={styles.formTitle}>Maligayang pagbabalik!</Text>
            <Text style={styles.formSub}>I-login ang iyong account para magsimula.</Text>

            <Field
              label="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              placeholder="email@halimbawa.com"
              keyboardType="email-address"
              icon={<EnvelopeIcon size={18} color={Colors.ink3} />}
            />

            <Field
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              placeholder="Ang iyong password"
              secureTextEntry={!showPass}
              icon={<LockClosedIcon size={18} color={Colors.ink3} />}
              rightElement={
                <TouchableOpacity onPress={() => setShowPass(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  {showPass
                    ? <EyeSlashIcon size={18} color={Colors.ink3} />
                    : <EyeIcon size={18} color={Colors.ink3} />
                  }
                </TouchableOpacity>
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnPrimaryText}>Mag-login →</Text>
              }
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Wala pang account? </Text>
              <Link href="/signup" style={styles.switchLink}>Mag-sign up</Link>
            </View>
          </View>

          <Text style={styles.footer}>Freedom to run your negosyo.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, paddingBottom: Spacing.xxl },

  // Hero
  hero: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },
  heroLogo: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: -1, marginBottom: Spacing.sm },
  heroTagline: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)', lineHeight: 24, marginBottom: Spacing.lg },
  heroFeatures: { gap: Spacing.sm },
  heroFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  heroFeatureText: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },

  // Card
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, marginHorizontal: Spacing.lg, padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: 3, marginBottom: Spacing.xl },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabLink: { flex: 1 },
  tabText: { fontSize: FontSize.sm, color: Colors.ink3, fontWeight: '500' },
  tabTextActive: { color: Colors.ink, fontWeight: '700' },

  formTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.xs },
  formSub: { fontSize: FontSize.sm, color: Colors.ink3, marginBottom: Spacing.lg },

  // Field with icon
  field: { marginBottom: Spacing.md },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2, marginBottom: Spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'transparent' },
  inputIcon: { paddingLeft: Spacing.md },
  input: { flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: FontSize.base, color: Colors.ink },
  inputRight: { paddingRight: Spacing.md },

  // Error
  errorText: { color: Colors.danger, fontSize: FontSize.sm, marginBottom: Spacing.md, backgroundColor: Colors.dangerSoft, padding: Spacing.md, borderRadius: Radius.md },

  // Button
  btnPrimary: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '700' },

  // Switch
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  switchText: { fontSize: FontSize.sm, color: Colors.ink3 },
  switchLink: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },

  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: FontSize.xs, marginTop: Spacing.xl, paddingHorizontal: Spacing.xl },
});
