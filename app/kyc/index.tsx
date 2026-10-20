import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/useAuthStore';
import { useKYCStore } from '../../store/useKYCStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import {
  ArrowLeftIcon, CameraIcon, CheckIcon,
  IdentificationIcon, PhotoIcon, DocumentTextIcon,
  ClockIcon, CheckCircleIcon,
} from '../../components/Icons';

type Method = 'basic' | 'permit';
const TOTAL_STEPS = 4;
const BUSINESS_TYPES = ['Karenderya', 'Sari-sari Store', 'Food Stall', 'Bakery', 'Tindahan', 'Iba pa'];

// ─── Step indicator ───────────────────────────────────────────────
const StepBar = ({ current, total }: { current: number; total: number }) => (
  <View style={s.stepBar}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[s.stepDot, i < current ? s.stepDotDone : i === current ? s.stepDotActive : s.stepDotIdle]} />
    ))}
  </View>
);

// ─── Photo picker card ────────────────────────────────────────────
const PhotoCard = ({
  uri, label, hint, required, onPickGallery, onPickCamera,
}: {
  uri: string | null; label: string; hint: string; required?: boolean;
  onPickGallery: () => void; onPickCamera: () => void;
}) => (
  <View style={s.photoCard}>
    {uri ? (
      <Image source={{ uri }} style={s.photoPreview} resizeMode="cover" />
    ) : (
      <View style={s.photoPlaceholder}>
        <PhotoIcon size={36} color={Colors.ink3} />
        <View style={s.photoLabelRow}>
          <Text style={s.photoPlaceholderText}>{label}</Text>
          {required && <View style={s.reqBadge}><Text style={s.reqBadgeText}>Required</Text></View>}
        </View>
        <Text style={s.photoHint}>{hint}</Text>
      </View>
    )}
    <View style={s.photoActions}>
      <TouchableOpacity style={s.photoBtn} onPress={onPickGallery}>
        <PhotoIcon size={16} color={Colors.primary} />
        <Text style={s.photoBtnText}>Gallery</Text>
      </TouchableOpacity>
      <View style={s.photoBtnDivider} />
      <TouchableOpacity style={s.photoBtn} onPress={onPickCamera}>
        <CameraIcon size={16} color={Colors.primary} />
        <Text style={s.photoBtnText}>Camera</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Method Selection ─────────────────────────────────────────────
const MethodCard = ({
  icon, title, subtitle, items, badge, badgeColor, selected, onPress,
}: {
  icon: React.ReactNode; title: string; subtitle: string;
  items: string[]; badge: string; badgeColor: string;
  selected: boolean; onPress: () => void;
}) => (
  <TouchableOpacity
    style={[s.methodCard, selected && { borderColor: Colors.primary, borderWidth: 2 }]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={s.methodHead}>
      <View style={[s.methodIcon, { backgroundColor: selected ? Colors.primarySoft : Colors.bgInput }]}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.methodTitle, selected && { color: Colors.primary }]}>{title}</Text>
        <Text style={s.methodSub}>{subtitle}</Text>
      </View>
      <View style={[s.methodBadge, { backgroundColor: badgeColor + '22' }]}>
        <Text style={[s.methodBadgeText, { color: badgeColor }]}>{badge}</Text>
      </View>
    </View>
    <View style={s.methodItems}>
      {items.map((item, i) => (
        <View key={i} style={s.methodItem}>
          <CheckIcon size={12} color={Colors.success} />
          <Text style={s.methodItemText}>{item}</Text>
        </View>
      ))}
    </View>
    {selected && (
      <View style={s.methodSelected}>
        <CheckIcon size={14} color={Colors.primary} />
        <Text style={s.methodSelectedText}>Napili</Text>
      </View>
    )}
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────
export default function KYCScreen() {
  const router = useRouter();
  const { upgrade } = useLocalSearchParams<{ upgrade?: string }>();
  const isUpgrade = upgrade === 'true';

  const { user } = useAuthStore();
  const { submitKYC, isSubmitting } = useKYCStore();

  const [method, setMethod] = useState<Method | null>(isUpgrade ? 'permit' : null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(isUpgrade ? 'permit' : null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Basic info
  const [fullName, setFullName] = useState(user?.ownerName ?? '');
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [customBusinessType, setCustomBusinessType] = useState('');

  // Steps 2–4 — Photos
  const [idFront, setIdFront] = useState<string | null>(null);
  const [idBack, setIdBack] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [businessPhoto, setBusinessPhoto] = useState<string | null>(null);
  const [permit, setPermit] = useState<string | null>(null);

  const requestPerms = async () => {
    const { status: lib } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cam } = await ImagePicker.requestCameraPermissionsAsync();
    if (lib !== 'granted' || cam !== 'granted') {
      Alert.alert('Permission needed', 'Kailangan ng access sa camera at gallery.');
      return false;
    }
    return true;
  };

  const pickFromGallery = async (setter: (uri: string) => void) => {
    if (!await requestPerms()) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const pickFromCamera = async (setter: (uri: string) => void, front = false) => {
    if (!await requestPerms()) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7, allowsEditing: true,
      aspect: front ? [1, 1] : [4, 3],
      cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    });
    if (!result.canceled) setter(result.assets[0].uri);
  };

  const resolvedBusinessType = businessType === 'Iba pa' ? customBusinessType.trim() : businessType;

  const canProceed = () => {
    if (step === 0) return fullName.trim() && location.trim() && businessType && (businessType !== 'Iba pa' || customBusinessType.trim());
    if (step === 1) return !!idFront && !!idBack;
    if (step === 2) return !!selfie;
    if (step === 3) return method === 'permit' ? (!!businessPhoto && !!permit) : !!businessPhoto;
    return false;
  };

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    if (!user || !idFront || !idBack || !selfie || !businessPhoto) return;
    if (method === 'permit' && !permit) return;
    try {
      await submitKYC(
        user.uid,
        { fullName: fullName.trim(), location: location.trim(), businessType: resolvedBusinessType, verificationMethod: method! },
        { idFront, idBack, selfie, businessPhoto, ...(permit ? { permit } : {}) },
      );
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Hindi ma-submit. Subukan muli.');
    }
  };

  // ── Success ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.successContainer}>
          {/* Pending icon */}
          <View style={[s.successIcon, { backgroundColor: Colors.warning, shadowColor: Colors.warning }]}>
            <ClockIcon size={48} color={Colors.white} />
          </View>

          <Text style={s.successTitle}>Naka-submit na!</Text>
          <Text style={s.successBody}>
            Ang iyong KYC documents ay matagumpay na na-upload.{'\n'}
            Naghihintay na ito ng approval mula sa aming admin.
          </Text>

          {/* Pending status badge */}
          <View style={s.pendingBadge}>
            <ClockIcon size={14} color={Colors.warning} />
            <Text style={s.pendingBadgeText}>Under Review — Pending Admin Approval</Text>
          </View>

          {/* Steps */}
          <View style={s.stepsCard}>
            {[
              { done: true,  label: 'Nai-upload ang mga dokumento' },
              { done: false, label: 'Sinusuri ng admin ang iyong submission' },
              { done: false, label: 'Makakatanggap ka ng verified badge' },
            ].map((step, i) => (
              <View key={i} style={[s.stepRow, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border }]}>
                <View style={[s.stepDotIcon, { backgroundColor: step.done ? Colors.successSoft : Colors.bgInput }]}>
                  {step.done
                    ? <CheckCircleIcon size={16} color={Colors.success} />
                    : <View style={s.stepDotEmpty} />}
                </View>
                <Text style={[s.stepLabel, { color: step.done ? Colors.ink : Colors.ink3 }]}>{step.label}</Text>
              </View>
            ))}
          </View>

          <View style={[s.methodPillResult, { backgroundColor: method === 'permit' ? Colors.primarySoft : Colors.successSoft }]}>
            <Text style={[s.methodPillResultText, { color: method === 'permit' ? Colors.primary : Colors.success }]}>
              {method === 'permit' ? 'With Business Permit' : 'Basic Verification'}
            </Text>
          </View>

          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Bumalik sa Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Method Selection ───────────────────────────────────────────
  if (method === null) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ArrowLeftIcon size={22} color={Colors.ink} />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>KYC Verification</Text>
            <Text style={s.headerSub}>Pumili ng paraan ng pag-verify</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.methodIntro}>
            <IdentificationIcon size={32} color={Colors.primary} />
            <Text style={s.methodIntroTitle}>
              {isUpgrade ? 'I-upgrade ang iyong\nKYC Verification' : 'Paano mo ive-verify\nang iyong negosyo?'}
            </Text>
            <Text style={s.methodIntroSub}>
              {isUpgrade
                ? 'Mag-submit ng Business Permit para makakuha ng mas mataas na loan readiness score.'
                : 'Piliin ang paraan na akma sa iyong sitwasyon. Pareho ay makakatanggap ng verified badge.'}
            </Text>
          </View>

          {!isUpgrade && (
            <MethodCard
              icon={<IdentificationIcon size={22} color={selectedMethod === 'basic' ? Colors.primary : Colors.ink2} />}
              title="Basic Verification"
              subtitle="Walang business permit"
              items={['Government ID', 'Selfie photo', 'Business / store photo']}
              badge="3 documents"
              badgeColor={Colors.success}
              selected={selectedMethod === 'basic'}
              onPress={() => setSelectedMethod('basic')}
            />
          )}

          <MethodCard
            icon={<DocumentTextIcon size={22} color={selectedMethod === 'permit' ? Colors.primary : Colors.ink2} />}
            title="May Business Permit"
            subtitle="Para sa mas mataas na loan score"
            items={['Government ID', 'Selfie photo', 'Business / store photo', 'Barangay / Business Permit']}
            badge="Higher Score ↑"
            badgeColor={Colors.primary}
            selected={selectedMethod === 'permit'}
            onPress={() => setSelectedMethod('permit')}
          />

          <View style={s.methodNote}>
            <Text style={s.methodNoteText}>
              💡 Ang may business permit ay may mas mataas na loan readiness score sa RAFI at iba pang microfinance institutions.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity
            style={[s.nextBtn, !selectedMethod && s.nextBtnDisabled]}
            onPress={() => { if (selectedMethod) { setMethod(selectedMethod); setStep(0); } }}
            disabled={!selectedMethod}
          >
            <Text style={s.nextBtnText}>Simulan ang Verification</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => step === 0 ? setMethod(null) : setStep(s => s - 1)}>
          <ArrowLeftIcon size={22} color={Colors.ink} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>KYC Verification</Text>
          <Text style={s.headerSub}>Step {step + 1} of {TOTAL_STEPS}</Text>
        </View>
        {/* Method pill */}
        <View style={[s.methodPill, { backgroundColor: method === 'permit' ? Colors.primarySoft : Colors.successSoft }]}>
          <Text style={[s.methodPillText, { color: method === 'permit' ? Colors.primary : Colors.success }]}>
            {method === 'permit' ? 'w/ Permit' : 'Basic'}
          </Text>
        </View>
      </View>

      <StepBar current={step} total={TOTAL_STEPS} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Step 1: Basic Info ─────────────────────────────── */}
        {step === 0 && (
          <View style={s.stepContent}>
            <View style={s.stepHeader}>
              <IdentificationIcon size={28} color={Colors.primary} />
              <Text style={s.stepTitle}>Personal & Business Info</Text>
              <Text style={s.stepDesc}>Ilagay ang iyong impormasyon para ma-verify ang iyong identity bilang business owner.</Text>
            </View>
            <View style={s.formGroup}>
              <Text style={s.label}>Buong Pangalan *</Text>
              <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="e.g. Maria Santos" placeholderTextColor={Colors.ink3} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.label}>Lungsod / Munisipalidad *</Text>
              <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="e.g. Cebu City, Mandaue" placeholderTextColor={Colors.ink3} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.label}>Uri ng Negosyo *</Text>
              <View style={s.typeGrid}>
                {BUSINESS_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[s.typeChip, businessType === type && s.typeChipActive]}
                    onPress={() => { setBusinessType(type); if (type !== 'Iba pa') setCustomBusinessType(''); }}
                  >
                    <Text style={[s.typeChipText, businessType === type && s.typeChipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {businessType === 'Iba pa' && (
                <TextInput
                  style={[s.input, { marginTop: Spacing.sm }]}
                  value={customBusinessType}
                  onChangeText={setCustomBusinessType}
                  placeholder="Ilagay ang uri ng negosyo"
                  placeholderTextColor={Colors.ink3}
                  autoFocus
                />
              )}
            </View>
          </View>
        )}

        {/* ── Step 2: Government ID ──────────────────────────── */}
        {step === 1 && (
          <View style={s.stepContent}>
            <View style={s.stepHeader}>
              <IdentificationIcon size={28} color={Colors.primary} />
              <Text style={s.stepTitle}>Government ID</Text>
              <Text style={s.stepDesc}>Mag-upload ng harap at likod ng iyong valid government ID (PhilSys, Passport, Driver's License, Voter's ID, etc.).</Text>
            </View>

            <Text style={s.subSectionLabel}>Harap ng ID (Front)</Text>
            <PhotoCard uri={idFront} label="Harap ng ID" hint="Siguraduhing malinaw at buong makikita ang harap" required
              onPickGallery={() => pickFromGallery(setIdFront)}
              onPickCamera={() => pickFromCamera(setIdFront)} />
            {idFront && <View style={s.checkRow}><CheckIcon size={16} color={Colors.success} /><Text style={s.checkText}>Front ready</Text></View>}

            <Text style={[s.subSectionLabel, { marginTop: Spacing.sm }]}>Likod ng ID (Back)</Text>
            <PhotoCard uri={idBack} label="Likod ng ID" hint="Siguraduhing makita ang signature at iba pang detalye" required
              onPickGallery={() => pickFromGallery(setIdBack)}
              onPickCamera={() => pickFromCamera(setIdBack)} />
            {idBack && <View style={s.checkRow}><CheckIcon size={16} color={Colors.success} /><Text style={s.checkText}>Back ready</Text></View>}
          </View>
        )}

        {/* ── Step 3: Selfie ─────────────────────────────────── */}
        {step === 2 && (
          <View style={s.stepContent}>
            <View style={s.stepHeader}>
              <CameraIcon size={28} color={Colors.primary} />
              <Text style={s.stepTitle}>Selfie Verification</Text>
              <Text style={s.stepDesc}>Kumuha ng selfie para ma-confirm na ikaw ang may-ari ng ID. Siguraduhing maliwanag ang mukha mo.</Text>
            </View>
            <PhotoCard uri={selfie} label="Kumuha ng selfie" hint="Huwag suotin ang salamin o mask" required
              onPickGallery={() => pickFromGallery(setSelfie)}
              onPickCamera={() => pickFromCamera(setSelfie, true)} />
            {selfie && <View style={s.checkRow}><CheckIcon size={16} color={Colors.success} /><Text style={s.checkText}>Selfie ready</Text></View>}
          </View>
        )}

        {/* ── Step 4: Business Photo (+ permit if method=permit) */}
        {step === 3 && (
          <View style={s.stepContent}>
            <View style={s.stepHeader}>
              <PhotoIcon size={28} color={Colors.primary} />
              <Text style={s.stepTitle}>Business Photo{method === 'permit' ? ' & Permit' : ''}</Text>
              <Text style={s.stepDesc}>
                {method === 'permit'
                  ? 'Mag-upload ng larawan ng iyong tindahan at ng iyong business permit para sa mas mataas na verification level.'
                  : 'Mag-upload ng larawan ng iyong tindahan o negosyo para mapatunayan na ikaw ay isang tunay na business owner.'}
              </Text>
            </View>

            <Text style={s.subSectionLabel}>Business / Store Photo</Text>
            <PhotoCard uri={businessPhoto} label="Larawan ng tindahan" hint="Kasama ang harap ng tindahan o setup ng negosyo" required
              onPickGallery={() => pickFromGallery(setBusinessPhoto)}
              onPickCamera={() => pickFromCamera(setBusinessPhoto)} />
            {businessPhoto && <View style={s.checkRow}><CheckIcon size={16} color={Colors.success} /><Text style={s.checkText}>Business photo ready</Text></View>}

            {method === 'permit' && (
              <>
                <Text style={[s.subSectionLabel, { marginTop: Spacing.lg }]}>Business / Barangay Permit</Text>
                <PhotoCard uri={permit} label="Business Permit" hint="Barangay Clearance o Municipal/City Business Permit" required
                  onPickGallery={() => pickFromGallery(setPermit)}
                  onPickCamera={() => pickFromCamera(setPermit)} />
                {permit && <View style={s.checkRow}><CheckIcon size={16} color={Colors.success} /><Text style={s.checkText}>Permit ready</Text></View>}
                {!permit && (
                  <View style={s.permitWarning}>
                    <Text style={s.permitWarningText}>⚠ Kailangan ang permit para sa method na ito.</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, (!canProceed() || isSubmitting) && s.nextBtnDisabled]}
          onPress={next}
          disabled={!canProceed() || isSubmitting}
        >
          {isSubmitting ? (
            <><ActivityIndicator size="small" color={Colors.white} /><Text style={s.nextBtnText}>Ini-upload...</Text></>
          ) : (
            <Text style={s.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'I-submit ang KYC' : 'Susunod'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },
  methodPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  methodPillText: { fontSize: 10, fontWeight: '800' },

  stepBar: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard },
  stepDot: { flex: 1, height: 4, borderRadius: 99 },
  stepDotIdle: { backgroundColor: Colors.border },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.success },

  scroll: { padding: Spacing.lg, gap: Spacing.lg },
  stepContent: { gap: Spacing.lg },
  stepHeader: { gap: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.md },
  stepTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.ink, textAlign: 'center' },
  stepDesc: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center', lineHeight: 20 },

  formGroup: { gap: Spacing.xs },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink2, letterSpacing: 0.5 },
  subSectionLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink2, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.base, color: Colors.ink },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.full, backgroundColor: Colors.bgCard, borderWidth: 1.5, borderColor: Colors.border },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  typeChipText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.ink2 },
  typeChipTextActive: { color: Colors.primary },

  photoCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  photoPreview: { width: '100%', height: 220 },
  photoPlaceholder: { height: 180, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg },
  photoLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  photoPlaceholderText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink2 },
  reqBadge: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  reqBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.danger },
  photoHint: { fontSize: FontSize.xs, color: Colors.ink3, textAlign: 'center' },
  photoActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  photoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 14 },
  photoBtnText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  photoBtnDivider: { width: 1, backgroundColor: Colors.border },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  checkText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.success },

  permitWarning: { backgroundColor: Colors.warningSoft, borderRadius: Radius.md, padding: Spacing.md },
  permitWarningText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: '600' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  nextBtnDisabled: { backgroundColor: Colors.ink3, shadowOpacity: 0, elevation: 0 },
  nextBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },

  // Method selection
  methodIntro: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  methodIntroTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink, textAlign: 'center', lineHeight: 30 },
  methodIntroSub: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center', lineHeight: 20 },
  methodCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, gap: Spacing.md },
  methodHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  methodSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  methodBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  methodBadgeText: { fontSize: 10, fontWeight: '800' },
  methodItems: { gap: 6 },
  methodItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  methodItemText: { fontSize: FontSize.sm, color: Colors.ink2 },
  methodSelected: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  methodSelectedText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary },
  methodNote: { backgroundColor: Colors.infoSoft, borderRadius: Radius.md, padding: Spacing.md },
  methodNoteText: { fontSize: FontSize.sm, color: Colors.info, lineHeight: 20 },

  // Success / Pending
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.lg },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  successTitle: { fontSize: FontSize.xxl, fontWeight: '900', color: Colors.ink },
  successBody: { fontSize: FontSize.base, color: Colors.ink3, textAlign: 'center', lineHeight: 24 },

  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.warningSoft, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.warning },
  pendingBadgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.warning },

  stepsCard: { width: '100%', backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  stepDotIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ink3 },
  stepLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },

  methodPillResult: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 8 },
  methodPillResultText: { fontSize: FontSize.sm, fontWeight: '800' },
  doneBtn: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, paddingHorizontal: Spacing.xxl, marginTop: Spacing.sm },
  doneBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },
});
