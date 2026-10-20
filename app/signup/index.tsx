import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { Redirect, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, BuildingStorefrontIcon, UserIcon } from '../../components/Icons';

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

// ─── Signup Screen ───────────────────────────────────────────────
export default function SignupScreen() {
  const { user, signup, isLoading, error, clearError } = useAuthStore();
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');

  if (user) return <Redirect href="/dashboard" />;

  const handleSignup = () => {
    setLocalError('');
    clearError();
    if (!shopName.trim() || !ownerName.trim() || !email.trim() || !password || !confirm) {
      setLocalError('Punan ang lahat ng fields.'); return;
    }
    if (password !== confirm) {
      setLocalError('Hindi magkatugma ang password.'); return;
    }
    if (password.length < 6) {
      setLocalError('Ang password ay dapat hindi bababa sa 6 na karakter.'); return;
    }
    signup(email, password, shopName, ownerName);
  };

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {show
        ? <EyeSlashIcon size={18} color={Colors.ink3} />
        : <EyeIcon size={18} color={Colors.ink3} />
      }
    </TouchableOpacity>
  );

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroLogo}>Kita</Text>
            <Text style={styles.heroTagline}>Simulan natin ang iyong negosyo!</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>

            {/* Tab switcher */}
            <View style={styles.tabs}>
              <Link href="/login" style={styles.tabLink} asChild>
                <TouchableOpacity style={styles.tab}>
                  <Text style={styles.tabText}>Mag-login</Text>
                </TouchableOpacity>
              </Link>
              <View style={[styles.tab, styles.tabActive]}>
                <Text style={[styles.tabText, styles.tabTextActive]}>Mag-sign up</Text>
              </View>
            </View>

            <Field
              label="Pangalan ng Tindahan"
              value={shopName}
              onChangeText={(v) => { setShopName(v); setLocalError(''); }}
              placeholder="e.g. Aling Rosa's Carinderia"
              autoCapitalize="words"
              icon={<BuildingStorefrontIcon size={18} color={Colors.ink3} />}
            />

            <Field
              label="Pangalan mo"
              value={ownerName}
              onChangeText={(v) => { setOwnerName(v); setLocalError(''); }}
              placeholder="e.g. Rosa Santos"
              autoCapitalize="words"
              icon={<UserIcon size={18} color={Colors.ink3} />}
            />

            <Field
              label="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); setLocalError(''); }}
              placeholder="rosa@email.com"
              keyboardType="email-address"
              icon={<EnvelopeIcon size={18} color={Colors.ink3} />}
            />

            <Field
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); setLocalError(''); }}
              placeholder="Min. 6 characters"
              secureTextEntry={!showPass}
              icon={<LockClosedIcon size={18} color={Colors.ink3} />}
              rightElement={<EyeToggle show={showPass} onToggle={() => setShowPass(p => !p)} />}
            />

            <Field
              label="Ulitin ang Password"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); setLocalError(''); }}
              placeholder="Ulit-ulitin"
              secureTextEntry={!showConfirm}
              icon={<LockClosedIcon size={18} color={Colors.ink3} />}
              rightElement={<EyeToggle show={showConfirm} onToggle={() => setShowConfirm(p => !p)} />}
            />

            {displayError ? <Text style={styles.errorText}>{displayError}</Text> : null}

            <TouchableOpacity
              style={[styles.btnPrimary, isLoading && styles.btnDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnPrimaryText}>Gumawa ng Account →</Text>
              }
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>May account na? </Text>
              <Link href="/login" style={styles.switchLink}>Mag-login</Link>
            </View>
          </View>

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
  heroTagline: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.85)', lineHeight: 24 },

  // Card
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, marginHorizontal: Spacing.lg, padding: Spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },

  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: 3, marginBottom: Spacing.xl },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabLink: { flex: 1 },
  tabText: { fontSize: FontSize.sm, color: Colors.ink3, fontWeight: '500' },
  tabTextActive: { color: Colors.ink, fontWeight: '700' },

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
});
