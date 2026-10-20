import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { KYCRecord } from '../../store/useKYCStore';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import { ArrowLeftIcon, CheckIcon, ShieldCheckIcon } from '../../components/Icons';

type KYCEntry = KYCRecord & { uid: string };

const STATUS_COLOR: Record<string, string> = {
  pending:    Colors.warning,
  verified:   Colors.success,
  rejected:   Colors.danger,
  unverified: Colors.ink3,
};

export default function AdminDashboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<KYCEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approvedName, setApprovedName] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'kyc'));
      const data: KYCEntry[] = snap.docs.map(d => ({ uid: d.id, ...(d.data() as KYCRecord) }));
      data.sort((a, b) => {
        const statusOrder = { pending: 0, unverified: 1, verified: 2, rejected: 3 };
        return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      });
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = (entry: KYCEntry) => {
    Alert.alert('I-approve?', `Ive-verify si ${entry.fullName}.`, [
      { text: 'Kanselahin', style: 'cancel' },
      {
        text: 'I-approve', style: 'default',
        onPress: async () => {
          setProcessing(entry.uid);
          await updateDoc(doc(db, 'kyc', entry.uid), {
            status: 'verified',
            verifiedAt: Timestamp.now(),
          });
          setEntries(prev => prev.map(e => e.uid === entry.uid ? { ...e, status: 'verified' } : e));
          setProcessing(null);
          setApprovedName(entry.fullName);
        },
      },
    ]);
  };

  const handleReject = (entry: KYCEntry) => {
    Alert.alert('I-reject?', `Ire-reject ang KYC ni ${entry.fullName}.`, [
      { text: 'Kanselahin', style: 'cancel' },
      {
        text: 'I-reject', style: 'destructive',
        onPress: async () => {
          setProcessing(entry.uid);
          await updateDoc(doc(db, 'kyc', entry.uid), { status: 'rejected' });
          setEntries(prev => prev.map(e => e.uid === entry.uid ? { ...e, status: 'rejected' } : e));
          setProcessing(null);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Mag-logout?', '', [
      { text: 'Hindi', style: 'cancel' },
      { text: 'Oo', onPress: () => { auth.signOut(); router.replace('/login'); } },
    ]);
  };

  const filtered = filter === 'all' ? entries : entries.filter(e => e.status === filter);
  const pendingCount = entries.filter(e => e.status === 'pending').length;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeftIcon size={20} color={Colors.ink} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>KYC Admin</Text>
          <Text style={s.headerSub}>{entries.length} submissions · {pendingCount} pending</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.filters}>
        {(['pending', 'verified', 'rejected', 'all'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'all' ? 'Lahat' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={s.loadingText}>Kino-load ang KYC submissions...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.emptyBox}>
          <ShieldCheckIcon size={40} color={Colors.ink3} />
          <Text style={s.emptyText}>Walang {filter === 'all' ? '' : filter} submissions</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {filtered.map(entry => {
            const isExpanded = expanded === entry.uid;
            const isProcessing = processing === entry.uid;
            const statusColor = STATUS_COLOR[entry.status] ?? Colors.ink3;

            return (
              <View key={entry.uid} style={s.card}>
                {/* Card header — always visible */}
                <TouchableOpacity
                  style={s.cardHeader}
                  onPress={() => setExpanded(isExpanded ? null : entry.uid)}
                  activeOpacity={0.8}
                >
                  <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{entry.fullName}</Text>
                    <Text style={s.meta}>{entry.businessType} · {entry.location}</Text>
                    <Text style={s.meta2}>
                      {entry.verificationMethod === 'permit' ? 'With Business Permit' : 'Basic Verification'}
                      {entry.submittedAt ? ` · ${typeof entry.submittedAt === 'string' ? new Date(entry.submittedAt).toLocaleDateString('en-PH') : ''}` : ''}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[s.statusText, { color: statusColor }]}>{entry.status}</Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded: photos + actions */}
                {isExpanded && (
                  <View style={s.cardBody}>
                    {/* Photos */}
                    <View style={s.photosGrid}>
                      {[
                        { label: 'ID Front', uri: entry.idFrontUrl },
                        { label: 'ID Back',  uri: entry.idBackUrl },
                        { label: 'Selfie',   uri: entry.selfieUrl },
                        { label: 'Business', uri: entry.businessPhotoUrl },
                        ...(entry.permitUrl ? [{ label: 'Permit', uri: entry.permitUrl }] : []),
                      ].map(({ label, uri }) => (
                        <View key={label} style={s.photoItem}>
                          <Image source={{ uri }} style={s.photo} resizeMode="cover" />
                          <Text style={s.photoLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Actions — only for pending */}
                    {entry.status === 'pending' && (
                      <View style={s.actions}>
                        <TouchableOpacity
                          style={[s.rejectBtn, isProcessing && { opacity: 0.5 }]}
                          onPress={() => handleReject(entry)}
                          disabled={isProcessing}
                        >
                          {isProcessing
                            ? <ActivityIndicator size="small" color={Colors.danger} />
                            : <Text style={s.rejectBtnText}>I-reject</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.approveBtn, isProcessing && { opacity: 0.5 }]}
                          onPress={() => handleApprove(entry)}
                          disabled={isProcessing}
                        >
                          {isProcessing
                            ? <ActivityIndicator size="small" color={Colors.white} />
                            : <><CheckIcon size={16} color={Colors.white} /><Text style={s.approveBtnText}>I-approve</Text></>}
                        </TouchableOpacity>
                      </View>
                    )}

                    {entry.status !== 'pending' && (
                      <View style={[s.resolvedBadge, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[s.resolvedText, { color: statusColor }]}>
                          {entry.status === 'verified' ? '✓ Verified na' : '✗ Rejected na'}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Success Modal ───────────────────────────────────────── */}
      <Modal visible={!!approvedName} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <ShieldCheckIcon size={40} color={Colors.white} />
            </View>
            <Text style={s.modalTitle}>Verified!</Text>
            <Text style={s.modalBody}>
              Si <Text style={{ fontWeight: '800', color: Colors.ink }}>{approvedName}</Text> ay matagumpay na na-approve at naka-verified na ngayon.
            </Text>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => setApprovedName(null)}
            >
              <Text style={s.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },
  logoutBtn: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.dangerSoft },
  logoutText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.danger },

  filters: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.bgInput },
  filterChipActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3 },
  filterTextActive: { color: Colors.white },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm, color: Colors.ink3 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.ink3, fontWeight: '600' },

  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  meta: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  meta2: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  cardBody: { borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md, gap: Spacing.md },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoItem: { width: '47%', gap: 4 },
  photo: { width: '100%', height: 120, borderRadius: Radius.md, backgroundColor: Colors.bgInput },
  photoLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.ink3, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  rejectBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.danger, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  rejectBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.danger },
  approveBtn: { flex: 2, backgroundColor: Colors.success, borderRadius: Radius.md, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  approveBtnText: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.white },

  resolvedBadge: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  resolvedText: { fontSize: FontSize.sm, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  modalCard: { width: '100%', backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md },
  modalIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.success, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.ink },
  modalBody: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center', lineHeight: 22 },
  modalBtn: { width: '100%', backgroundColor: Colors.success, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm },
  modalBtnText: { color: Colors.white, fontSize: FontSize.base, fontWeight: '800' },
});
