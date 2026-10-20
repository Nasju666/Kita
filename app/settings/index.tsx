import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useKYCStore, KYCStatus } from '../../store/useKYCStore';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import {
  ArrowLeftIcon, UserCircleIcon, BuildingStorefrontIcon,
  EnvelopeIcon, QrCodeIcon, TagIcon, GlobeAltIcon,
  TrashIcon, ArrowRightOnRectangleIcon,
  ShieldCheckIcon, IdentificationIcon, ClockIcon, ChevronRightIcon,
} from '../../components/Icons';

// ─── Coloured icon box (iOS Settings style) ───────────────────────
const IconBox = ({ color, children }: { color: string; children: React.ReactNode }) => (
  <View style={[s.iconBox, { backgroundColor: color }]}>{children}</View>
);

const KYC_CONFIG: Record<KYCStatus, { label: string; color: string; icon: React.ReactNode }> = {
  unverified: { label: 'Not Verified', color: Colors.ink3, icon: <IdentificationIcon size={18} color="#fff" /> },
  pending:    { label: 'Under Review', color: Colors.warning, icon: <ClockIcon size={18} color="#fff" /> },
  verified:   { label: 'Verified',     color: Colors.success, icon: <ShieldCheckIcon size={18} color="#fff" /> },
  rejected:   { label: 'Rejected',     color: Colors.danger,  icon: <IdentificationIcon size={18} color="#fff" /> },
};

export default function SettingsScreen() {
  const { user, updateProfile, logout } = useAuthStore();
  const { t, language, setLanguage } = useLanguageStore();
  const { kyc } = useKYCStore();
  const router = useRouter();
  const kycStatus: KYCStatus = kyc?.status ?? 'unverified';
  const kycCfg = KYC_CONFIG[kycStatus];

  const [shopName, setShopName] = useState(user?.shopName ?? '');
  const [ownerName, setOwnerName] = useState(user?.ownerName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasChanges = shopName.trim() !== user?.shopName || ownerName.trim() !== user?.ownerName;

  const save = async () => {
    if (!shopName.trim() || !ownerName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ shopName: shopName.trim(), ownerName: ownerName.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Hindi ma-save. Subukan muli.');
    }
    setSaving(false);
  };

  const confirmLogout = () => {
    Alert.alert(
      t.signOutConfirmTitle,
      t.signOutConfirmBody,
      [
        { text: t.no, style: 'cancel' },
        { text: t.signOutYes, style: 'destructive', onPress: logout },
      ],
    );
  };

  const clearCollection = async (path: string[]) => {
    if (!user) return;
    const col = collection(db, ...path as [string, string, string]);
    const snap = await getDocs(col);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const confirmClearSales = () => {
    Alert.alert(
      'Clear Sales History?',
      'This will permanently delete ALL orders and sales data from the dashboard. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Sales', style: 'destructive', onPress: async () => {
          try {
            await clearCollection(['orders', user!.uid, 'transactions']);
            Alert.alert('Done', 'Sales history cleared.');
          } catch { Alert.alert('Error', 'Could not clear sales data.'); }
        }},
      ],
    );
  };

  const confirmClearExpenses = () => {
    Alert.alert(
      'Clear Expenses History?',
      'This will permanently delete ALL expense records. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Expenses', style: 'destructive', onPress: async () => {
          try {
            await clearCollection(['expenses', user!.uid, 'items']);
            Alert.alert('Done', 'Expenses history cleared.');
          } catch { Alert.alert('Error', 'Could not clear expenses.'); }
        }},
      ],
    );
  };

  const confirmClearAll = () => {
    Alert.alert(
      '⚠️ Clear ALL Dashboard Data?',
      'This will delete ALL sales, orders, and expenses permanently. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Everything', style: 'destructive', onPress: async () => {
          try {
            await Promise.all([
              clearCollection(['orders', user!.uid, 'transactions']),
              clearCollection(['expenses', user!.uid, 'items']),
            ]);
            Alert.alert('Done', 'All dashboard data cleared.');
          } catch { Alert.alert('Error', 'Could not clear all data.'); }
        }},
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeftIcon size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t.settings}</Text>
        {hasChanges && (
          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={s.saveBtnText}>{saved ? t.saved : t.save}</Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Avatar */}
        <View style={s.avatarBlock}>
          <View style={s.avatar}>
            <Text style={s.avatarInitials}>
              {(user?.ownerName ?? 'U').slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={s.avatarName}>{user?.ownerName}</Text>
          <Text style={s.avatarEmail}>{user?.email}</Text>
        </View>

        {/* KYC Verification */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>IDENTITY VERIFICATION</Text>
          <View style={s.group}>
            <TouchableOpacity
              style={s.fieldRow}
              onPress={() => kycStatus !== 'verified' && router.push('/kyc')}
              activeOpacity={kycStatus === 'verified' ? 1 : 0.7}
            >
              <IconBox color={kycCfg.color}>{kycCfg.icon}</IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>KYC Status</Text>
                <Text style={[s.fieldValue, { color: kycCfg.color, fontWeight: '700' }]}>
                  {kycCfg.label}
                </Text>
                {kycStatus === 'unverified' && (
                  <Text style={[s.fieldLabel, { marginTop: 2, color: Colors.ink3 }]}>
                    I-verify para makakuha ng verified badge
                  </Text>
                )}
                {kycStatus === 'pending' && (
                  <Text style={[s.fieldLabel, { marginTop: 2, color: Colors.warning }]}>
                    Nire-review ang iyong mga dokumento...
                  </Text>
                )}
                {kycStatus === 'verified' && kyc?.fullName && (
                  <Text style={[s.fieldLabel, { marginTop: 2, color: Colors.success }]}>
                    {kyc.fullName} · {kyc.businessType}
                    {kyc.verificationMethod === 'permit' ? ' · w/ Permit ✓' : ''}
                  </Text>
                )}
              </View>
              {kycStatus !== 'verified' && <ChevronRightIcon size={18} color={Colors.ink3} />}
            </TouchableOpacity>

            {/* Upgrade option — only shown when verified via Basic (no permit) */}
            {kycStatus === 'verified' && kyc?.verificationMethod === 'basic' && (
              <>
                <View style={s.divider} />
                <TouchableOpacity
                  style={s.fieldRow}
                  onPress={() => router.push('/kyc?upgrade=true')}
                  activeOpacity={0.7}
                >
                  <IconBox color={Colors.primary}>
                    <IdentificationIcon size={18} color="#fff" />
                  </IconBox>
                  <View style={s.fieldBody}>
                    <Text style={s.fieldLabel}>I-upgrade ang KYC</Text>
                    <Text style={[s.fieldLabel, { marginTop: 2, color: Colors.ink3 }]}>
                      Mag-submit ng Business Permit para sa mas mataas na loan score
                    </Text>
                  </View>
                  <ChevronRightIcon size={18} color={Colors.ink3} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Business Info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t.businessInfo}</Text>
          <View style={s.group}>
            <View style={s.fieldRow}>
              <IconBox color="#E8642A">
                <BuildingStorefrontIcon size={18} color="#fff" />
              </IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{t.shopNameLabel}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder={t.shopNamePlaceholder}
                  placeholderTextColor={Colors.ink3}
                />
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <IconBox color="#5856D6">
                <UserCircleIcon size={18} color="#fff" />
              </IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{t.ownerNameLabel}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder={t.ownerNamePlaceholder}
                  placeholderTextColor={Colors.ink3}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Account Info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t.account}</Text>
          <View style={s.group}>
            <View style={s.fieldRow}>
              <IconBox color="#34C759"><EnvelopeIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{t.emailLabel}</Text>
                <Text style={s.fieldValue}>{user?.email}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.fieldRow}>
              <IconBox color="#007AFF"><QrCodeIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{t.userIdLabel}</Text>
                <Text style={[s.fieldValue, s.mono]} numberOfLines={1}>{user?.uid}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t.app}</Text>
          <View style={s.group}>
            <View style={s.fieldRow}>
              <IconBox color="#8E8E93"><TagIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={s.fieldLabel}>{t.version}</Text>
                <Text style={s.fieldValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t.language}</Text>
          <View style={s.group}>
            <View style={s.fieldRow}>
              <IconBox color="#007AFF"><GlobeAltIcon size={18} color="#fff" /></IconBox>
              <View style={[s.fieldBody, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <Text style={s.fieldLabel}>{t.languageLabel}</Text>
                <View style={s.langToggle}>
                  {(['taglish', 'english'] as const).map(lang => (
                    <TouchableOpacity
                      key={lang}
                      style={[s.langBtn, language === lang && s.langBtnActive]}
                      onPress={() => setLanguage(lang)}
                    >
                      <Text style={[s.langBtnText, language === lang && s.langBtnTextActive]}>
                        {lang === 'taglish' ? '🇵🇭 Taglish' : '🇬🇧 English'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Contributors */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t.contributors}</Text>
          <View style={s.group}>
            {[
              { name: 'Kevin Jheazer Villaro',  initials: 'KV', color: '#5856D6' },
              { name: 'Francis Nino Surban',    initials: 'FS', color: '#34C759' },
              { name: 'Junas Amanence',         initials: 'JA', color: '#E8642A' },
            ].map(({ name, initials, color }, i, arr) => (
              <View key={name}>
                <View style={s.fieldRow}>
                  <View style={[s.contributorAvatar, { backgroundColor: color }]}>
                    <Text style={s.contributorInitials}>{initials}</Text>
                  </View>
                  <Text style={s.contributorName}>{name}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: Colors.danger }]}>DANGER ZONE</Text>
          <View style={[s.group, { borderColor: Colors.danger }]}>
            <TouchableOpacity style={s.dangerRow} onPress={confirmClearSales}>
              <IconBox color={Colors.danger}><TrashIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={s.dangerLabel}>Clear Sales History</Text>
                <Text style={s.dangerSub}>Delete all orders & sales records</Text>
              </View>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.dangerRow} onPress={confirmClearExpenses}>
              <IconBox color="#FF9500"><TrashIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={s.dangerLabel}>Clear Expenses History</Text>
                <Text style={s.dangerSub}>Delete all expense records</Text>
              </View>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.dangerRow} onPress={confirmClearAll}>
              <IconBox color="#8E0000"><TrashIcon size={18} color="#fff" /></IconBox>
              <View style={s.fieldBody}>
                <Text style={[s.dangerLabel, { color: Colors.danger }]}>Clear ALL Dashboard Data</Text>
                <Text style={s.dangerSub}>Wipes sales + expenses permanently</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout}>
          <IconBox color={Colors.danger}>
            <ArrowRightOnRectangleIcon size={18} color="#fff" />
          </IconBox>
          <Text style={s.logoutText}>{t.signOut}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 8, minWidth: 60, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },

  scroll: { padding: Spacing.lg, gap: Spacing.lg },

  // Avatar
  avatarBlock: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: Colors.white },
  avatarName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink },
  avatarEmail: { fontSize: FontSize.sm, color: Colors.ink3 },

  // Section
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1 },
  group: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 72 },

  // Icon box (iOS style)
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  fieldBody: { flex: 1 },
  fieldLabel: { fontSize: FontSize.xs, color: Colors.ink3, fontWeight: '600', marginBottom: 3 },
  fieldInput: { fontSize: FontSize.base, color: Colors.ink, fontWeight: '500', padding: 0 },
  fieldValue: { fontSize: FontSize.base, color: Colors.ink, fontWeight: '500' },
  mono: { fontSize: FontSize.xs, color: Colors.ink3, fontFamily: 'monospace' },

  // Sign Out
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.dangerSoft, borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.danger },
  logoutText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.danger },

  // Contributors
  contributorAvatar: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  contributorInitials: { fontSize: FontSize.sm, fontWeight: '800', color: '#fff' },
  contributorName: { fontSize: FontSize.base, fontWeight: '600', color: Colors.ink },

  // Language toggle
  langToggle: { flexDirection: 'row', gap: 6 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.bgInput, borderWidth: 1.5, borderColor: 'transparent' },
  langBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  langBtnText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink2 },
  langBtnTextActive: { color: Colors.primary },

  // Danger zone
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  dangerLabel: { fontSize: FontSize.base, fontWeight: '700', color: Colors.ink },
  dangerSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
});
