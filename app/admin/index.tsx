import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { ArrowLeftIcon, LockClosedIcon, EnvelopeIcon } from '../../components/Icons';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const snap = await getDoc(doc(db, 'admins', cred.user.uid));
      if (!snap.exists()) {
        await auth.signOut();
        Alert.alert('Access Denied', 'Hindi admin ang account na ito.');
        setLoading(false);
        return;
      }
      router.replace('/admin/dashboard');
    } catch (e: any) {
      const msg = e?.code === 'auth/invalid-credential' || e?.code === 'auth/wrong-password'
        ? 'Mali ang email o password.'
        : e?.message ?? 'Hindi makapag-login.';
      Alert.alert('Error', msg);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ArrowLeftIcon size={20} color={Colors.ink} />
          </TouchableOpacity>
        </View>

        <View style={s.content}>
          <View style={s.badge}>
            <Text style={s.badgeText}>ADMIN</Text>
          </View>
          <Text style={s.title}>Admin Access</Text>
          <Text style={s.sub}>Para lamang sa mga awtorisadong admin ng Kita.</Text>

          <View style={s.card}>
            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputRow}>
                <EnvelopeIcon size={18} color={Colors.ink3} />
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="admin@kita.ph"
                  placeholderTextColor={Colors.ink3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputRow}>
                <LockClosedIcon size={18} color={Colors.ink3} />
                <TextInput
                  style={s.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.ink3}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.btn, (!email.trim() || !password.trim() || loading) && s.btnDisabled]}
              onPress={handleLogin}
              disabled={!email.trim() || !password.trim() || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={s.btnText}>Mag-login bilang Admin</Text>}
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>
            Kung wala kang admin account, gumawa ng user sa Firebase Console at idagdag ang UID sa{' '}
            <Text style={{ fontWeight: '800' }}>Firestore › admins › {'<uid>'}</Text>.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, gap: Spacing.md },
  badge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 5 },
  badgeText: { color: Colors.white, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.ink },
  sub: { fontSize: FontSize.sm, color: Colors.ink3, lineHeight: 20 },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink2, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgInput, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Platform.OS === 'ios' ? 14 : 11 },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.ink },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 16, alignItems: 'center', marginTop: Spacing.sm },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },
  hint: { fontSize: FontSize.xs, color: Colors.ink3, textAlign: 'center', lineHeight: 18, marginTop: Spacing.sm },
});
