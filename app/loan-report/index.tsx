import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { db } from '../../firebase/config';
import { useAuthStore } from '../../store/useAuthStore';
import { useKYCStore } from '../../store/useKYCStore';
import { useExpensesStore } from '../../store/useExpensesStore';
import { generateLoanReport, LoanReport, LoanReportInput } from '../../services/gemini';
import { Colors, FontSize, Spacing, Radius } from '../../constants/colors';
import {
  ArrowLeftIcon, ShieldCheckIcon, IdentificationIcon,
  DocumentTextIcon, CheckIcon, ClockIcon, BuildingStorefrontIcon,
  BanknotesIcon, CheckCircleIcon,
} from '../../components/Icons';

// ─── RAFI product config ──────────────────────────────────────────
const RAFI_PRODUCTS: Record<string, { color: string; icon: React.ReactNode; tag: string }> = {
  'Mauswagon Loan':       { color: Colors.info,    icon: <BanknotesIcon size={18} color="#fff" />,          tag: 'Micro Loan · Entry level'   },
  'Mauswagon Plus Loan':  { color: '#2563EB',      icon: <BanknotesIcon size={18} color="#fff" />,          tag: 'Micro Loan · Enhanced'      },
  'Kabuhayan Loan':       { color: '#15803D',      icon: <BuildingStorefrontIcon size={18} color="#fff" />, tag: 'Micro Loan · Agricultural'  },
  'Tindahan Ni Nanay':    { color: '#D97706',      icon: <BuildingStorefrontIcon size={18} color="#fff" />, tag: 'Social Development Program' },
  'Capital Build-Up (CBU)': { color: Colors.success, icon: <CheckCircleIcon size={18} color="#fff" />,      tag: 'Micro Savings · Mandatory'  },
  'Capital Build-Up':     { color: Colors.success,  icon: <CheckCircleIcon size={18} color="#fff" />,       tag: 'Micro Savings · Mandatory'  },
  'MyIpon':               { color: '#7C3AED',      icon: <BanknotesIcon size={18} color="#fff" />,          tag: 'Micro Savings · Voluntary'  },
  'SAGIP Loan':           { color: Colors.danger,  icon: <CheckCircleIcon size={18} color="#fff" />,        tag: 'Emergency Loan'             },
  'Housing Improvement Loan': { color: '#0369A1', icon: <BuildingStorefrontIcon size={18} color="#fff" />, tag: 'Supplemental Loan'          },
  'Education Loan':       { color: '#0369A1',      icon: <DocumentTextIcon size={18} color="#fff" />,       tag: 'Supplemental Loan'          },
};

// ─── Score ring ───────────────────────────────────────────────────
const SCORE_COLOR: Record<string, string> = {
  'Mahusay': Colors.success,
  'Maganda': '#16A34A',
  'Sapat':   Colors.warning,
  'Mahirap': Colors.danger,
};

const ScoreRing = ({ value, label }: { value: number; label: string }) => {
  const color = SCORE_COLOR[label] ?? Colors.ink3;
  return (
    <View style={[sr.ring, { borderColor: color }]}>
      <Text style={[sr.value, { color }]}>{value}</Text>
      <Text style={[sr.label, { color }]}>{label}</Text>
      <Text style={sr.sub}>/ 100</Text>
    </View>
  );
};
const sr = StyleSheet.create({
  ring: { width: 110, height: 110, borderRadius: 55, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  label: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 0.5, marginTop: 2 },
  sub: { fontSize: FontSize.xs, color: Colors.ink3 },
});

// ─── PDF HTML template ────────────────────────────────────────────
function buildPdfHtml(report: LoanReport, input: LoanReportInput, kycVerified: boolean): string {
  const scoreColor =
    report.creditScore === 'Mahusay' ? '#1A7F4B' :
    report.creditScore === 'Maganda' ? '#16A34A' :
    report.creditScore === 'Sapat'   ? '#B45309' : '#C8451F';

  const reqRows = [
    { label: 'May valid government ID (KYC)', met: kycVerified },
    { label: 'May naitala na sales / kita',   met: input.monthSales > 0 },
    { label: 'Nagke-kita ang negosyo',        met: input.netProfit > 0 },
    { label: 'May recorded na expenses',      met: input.monthExpenses > 0 },
  ].map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #EBEAE5;">${r.met ? '✅' : '❌'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #EBEAE5;">${r.label}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #EBEAE5;font-weight:700;color:${r.met ? '#1A7F4B' : '#C8451F'}">${r.met ? 'Met' : 'Missing'}</td>
    </tr>`).join('');

  const strengths = report.strengths.map(s => `<li style="margin:4px 0;">${s}</li>`).join('');
  const concerns = report.concerns.map(c => `<li style="margin:4px 0;color:#B45309;">${c}</li>`).join('');

  const now = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1A1A17; background: #fff; padding: 32px; font-size: 13px; }
  h1 { font-size: 20px; } h2 { font-size: 15px; margin-bottom: 8px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #D97706; padding-bottom: 16px; margin-bottom: 24px; }
  .rafi-badge { background: #D97706; color: #fff; font-weight: 900; padding: 8px 14px; border-radius: 10px; font-size: 18px; }
  .section { margin-bottom: 20px; }
  .label { font-size: 10px; font-weight: 700; color: #9A9A95; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
  .card { border: 1px solid #EBEAE5; border-radius: 12px; padding: 14px; background: #fafaf8; }
  .score-ring { display: inline-block; border: 6px solid ${scoreColor}; border-radius: 50%; width: 90px; height: 90px; text-align: center; line-height: 1; padding-top: 14px; }
  .score-value { font-size: 26px; font-weight: 900; color: ${scoreColor}; }
  .score-row { display: flex; align-items: center; gap: 20px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; background: #fafaf8; border: 1px solid #EBEAE5; }
  th { background: #f5f4f0; padding: 8px 12px; text-align: left; font-size: 11px; color: #9A9A95; }
  .product-card { border: 2px solid #1D4ED8; border-radius: 12px; padding: 14px; background: #EFF6FF; }
  .rec-card { border: 1.5px solid #1D4ED8; border-radius: 12px; padding: 14px; background: #EFF6FF; }
  .cta { background: #FFF8E7; border: 1.5px solid #D97706; border-radius: 12px; padding: 16px; text-align: center; margin-top: 20px; }
  .disclaimer { color: #9A9A95; font-size: 10px; margin-top: 16px; text-align: center; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>Loan Readiness Report</h1>
    <p style="color:#9A9A95;margin-top:4px;">Generated on ${now}</p>
  </div>
  <div style="text-align:right">
    <div class="rafi-badge">RAFI MFI</div>
    <p style="font-size:11px;color:#B45309;margin-top:4px;">rafimfi.org.ph</p>
  </div>
</div>

<div class="section">
  <div class="label">Business Information</div>
  <div class="card" style="display:flex;gap:24px;">
    <div><strong>${input.shopName}</strong><br><span style="color:#9A9A95;">${input.ownerName}</span></div>
    <div><strong>${input.businessType}</strong><br><span style="color:#9A9A95;">Business Type</span></div>
    <div><span class="badge" style="background:${kycVerified ? '#EDFAF4' : '#FDF1EE'};color:${kycVerified ? '#1A7F4B' : '#C8451F'};">${kycVerified ? 'KYC Verified ✓' : 'KYC Not Verified'}</span></div>
  </div>
</div>

<div class="section">
  <div class="label">RAFI Loan Readiness Score</div>
  <div class="card">
    <div class="score-row">
      <div class="score-ring">
        <div class="score-value">${report.scoreValue}</div>
        <div style="font-size:10px;font-weight:700;color:${scoreColor};">${report.creditScore}</div>
        <div style="font-size:10px;color:#9A9A95;">/ 100</div>
      </div>
      <div>
        <p style="font-size:18px;font-weight:900;color:${scoreColor};">${report.creditScore}</p>
        <p style="color:#9A9A95;margin:4px 0;">${input.shopName}</p>
        <p><strong>₱${input.monthSales.toLocaleString()}</strong> <span style="color:#9A9A95;">30-day sales</span></p>
        <p><strong style="color:${input.netProfit >= 0 ? '#1A7F4B' : '#C8451F'}">₱${Math.abs(input.netProfit).toLocaleString()}</strong> <span style="color:#9A9A95;">${input.netProfit >= 0 ? 'net profit' : 'net loss'}</span></p>
      </div>
    </div>
    <p style="color:#4A4A45;line-height:1.6;border-top:1px solid #EBEAE5;padding-top:10px;">${report.summary}</p>
  </div>
</div>

<div class="section">
  <div class="label">RAFI Basic Requirements</div>
  <table>
    <thead><tr><th></th><th>Requirement</th><th>Status</th></tr></thead>
    <tbody>${reqRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="label">Inirerekomendang RAFI Program</div>
  <div class="product-card">
    <p style="font-size:16px;font-weight:800;color:#1D4ED8;">${report.rafiProduct}
      <span class="badge" style="background:${report.rafiEligible ? '#EDFAF4' : '#FFFBEB'};color:${report.rafiEligible ? '#1A7F4B' : '#B45309'};margin-left:8px;">${report.rafiEligible ? 'Eligible' : 'Build up'}</span>
    </p>
    <p style="color:#4A4A45;margin-top:8px;line-height:1.6;">${report.rafiProductDesc}</p>
  </div>
</div>

<div style="display:flex;gap:16px;" class="section">
  <div style="flex:1;">
    <div class="label">Mga Kalakasan</div>
    <div class="card" style="border-color:#1A7F4B;">
      <ul style="padding-left:16px;">${strengths}</ul>
    </div>
  </div>
  <div style="flex:1;">
    <div class="label">Mga Alalahanin</div>
    <div class="card" style="border-color:#B45309;">
      <ul style="padding-left:16px;">${concerns}</ul>
    </div>
  </div>
</div>

<div class="section">
  <div class="label">Rekomendasyon</div>
  <div class="rec-card">
    <p style="color:#1D4ED8;font-weight:600;line-height:1.6;">${report.recommendation}</p>
  </div>
</div>

<div class="cta">
  <p style="font-size:15px;font-weight:800;color:#92400E;">Handa ka na bang mag-apply sa RAFI?</p>
  <p style="color:#B45309;margin-top:6px;line-height:1.6;">Bisitahin ang pinakamalapit na RAFI MFI branch o pumunta sa <strong>rafimfi.org.ph</strong> para sa higit pang impormasyon tungkol sa <strong>${report.rafiProduct}</strong>.</p>
</div>

<p class="disclaimer">* Ang report na ito ay AI-generated at para lamang sa gabay. Hindi ito kumakatawan sa opisyal na credit decision ng RAFI MFI. · Generated by Kita App</p>

</body>
</html>`;
}

// ─── Main Screen ──────────────────────────────────────────────────
export default function LoanReportScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { kyc } = useKYCStore();
  const { items: expenseItems } = useExpensesStore();

  const [report, setReport] = useState<LoanReport | null>(null);
  const [input, setInput] = useState<LoanReportInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const kycVerified = kyc?.status === 'verified';

  const fetchAndGenerate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const snap = await getDocs(query(
        collection(db, 'orders', user.uid, 'transactions'),
        where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('createdAt', 'asc'),
      ));

      let monthSales = 0, totalOrders = 0;
      snap.forEach(doc => { monthSales += doc.data().total; totalOrders++; });

      const monthExpenses = expenseItems
        .filter(e => {
          const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt ?? 0);
          return d >= thirtyDaysAgo;
        })
        .reduce((s, e) => s + e.amount, 0);

      const payload: LoanReportInput = {
        shopName: user.shopName || 'Tindahan',
        ownerName: user.ownerName || 'May-ari',
        businessType: kyc?.businessType || 'Negosyo',
        kycVerified,
        monthSales,
        monthExpenses,
        netProfit: monthSales - monthExpenses,
        avgDailySales: monthSales / 30,
        totalOrders,
        lowStockCount: 0,
      };

      setInput(payload);
      const result = await generateLoanReport(payload);
      setReport(result);
    } catch (e: any) {
      setError(e?.message ?? 'Hindi ma-generate. Subukan muli.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAndGenerate(); }, []);

  const exportPDF = async () => {
    if (!report || !input) return;
    setExporting(true);
    try {
      const html = buildPdfHtml(report, input, kycVerified);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'I-save ang Loan Report' });
    } catch {
      Alert.alert('Error', 'Hindi ma-export ang PDF. Subukan muli.');
    } finally {
      setExporting(false);
    }
  };

  // Build requirements checklist from actual data
  const reqChecks = input ? [
    { label: 'May valid government ID (KYC)', met: kycVerified },
    { label: 'May naitala na sales / kita',   met: input.monthSales > 0 },
    { label: 'Nagke-kita ang negosyo',        met: input.netProfit > 0 },
    { label: 'May recorded na expenses',      met: input.monthExpenses > 0 },
  ] : [];

  const rafiCfg = report ? (RAFI_PRODUCTS[report.rafiProduct] ?? RAFI_PRODUCTS['Capital Build-Up']) : null;
  const scoreColor = report ? (SCORE_COLOR[report.creditScore] ?? Colors.ink3) : Colors.ink3;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeftIcon size={22} color={Colors.ink} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Loan Readiness Report</Text>
          <Text style={s.headerSub}>Powered by RAFI MFI criteria</Text>
        </View>
        <TouchableOpacity
          style={[s.exportBtn, (!report || exporting) && { opacity: 0.4 }]}
          onPress={exportPDF}
          disabled={!report || exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color={Colors.white} />
            : <DocumentTextIcon size={16} color={Colors.white} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* RAFI Banner */}
        <View style={s.rafiBanner}>
          <View style={s.rafiLogoBox}>
            <Text style={s.rafiLogoText}>RAFI</Text>
            <Text style={s.rafiLogoSub}>MFI</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rafiTitle}>RAFI Microfinance Institute</Text>
            <Text style={s.rafiSub}>Ang iyong financial data ay ine-evaluate base sa aktwal na pamantayan ng RAFI MFI para sa loan eligibility.</Text>
          </View>
        </View>

        {/* KYC Status */}
        <View style={[s.kycBanner, { backgroundColor: kycVerified ? Colors.successSoft : Colors.warningSoft, borderColor: kycVerified ? Colors.success : Colors.warning }]}>
          <View style={[s.kycIconBox, { backgroundColor: kycVerified ? Colors.success : Colors.warning }]}>
            {kycVerified ? <ShieldCheckIcon size={18} color={Colors.white} /> : <IdentificationIcon size={18} color={Colors.white} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.kycTitle, { color: kycVerified ? Colors.success : Colors.warning }]}>
              {kycVerified ? 'KYC Verified ✓' : 'KYC Hindi Pa Verified'}
            </Text>
            <Text style={s.kycSub}>
              {kycVerified
                ? `${kyc?.fullName} · ${kyc?.businessType}`
                : 'Kailangan ng valid ID para maaprubahan ng RAFI ang loan.'}
            </Text>
          </View>
          {!kycVerified && (
            <TouchableOpacity onPress={() => router.push('/kyc')}>
              <Text style={[s.kycAction, { color: Colors.warning }]}>I-verify →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Loading */}
        {loading && (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={Colors.info} />
            <Text style={s.loadingTitle}>Sinusuri ang RAFI eligibility...</Text>
            <Text style={s.loadingSub}>Kinokolekta ang sales, expenses, at financial data.</Text>
          </View>
        )}

        {/* Error */}
        {!!error && !loading && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={s.retryBtn} onPress={fetchAndGenerate}>
              <Text style={s.retryBtnText}>Subukan Muli</Text>
            </TouchableOpacity>
          </View>
        )}

        {report && !loading && (
          <>
            {/* Score Card */}
            <View style={s.scoreCard}>
              <Text style={s.scoreCardLabel}>RAFI LOAN READINESS SCORE</Text>
              <View style={s.scoreRow}>
                <ScoreRing value={report.scoreValue} label={report.creditScore} />
                <View style={s.scoreMeta}>
                  <Text style={[s.scoreCreditLabel, { color: scoreColor }]}>{report.creditScore}</Text>
                  <Text style={s.scoreMetaSub}>{user?.shopName}</Text>
                  {input && (
                    <View style={{ marginTop: Spacing.sm }}>
                      <Text style={s.scoreStat}>₱{input.monthSales.toLocaleString()}</Text>
                      <Text style={s.scoreStatLabel}>30-day sales</Text>
                      <Text style={[s.scoreStat, { color: input.netProfit >= 0 ? Colors.success : Colors.danger }]}>
                        ₱{Math.abs(input.netProfit).toLocaleString()}
                      </Text>
                      <Text style={s.scoreStatLabel}>{input.netProfit >= 0 ? 'net profit' : 'net loss'}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={s.summaryText}>{report.summary}</Text>
            </View>

            {/* RAFI Requirements Checklist */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>RAFI BASIC REQUIREMENTS</Text>
              <View style={s.checklistCard}>
                {reqChecks.map((req, i) => (
                  <View key={i} style={[s.checklistRow, i > 0 && s.checklistDivider]}>
                    <View style={[s.checklistIcon, { backgroundColor: req.met ? Colors.successSoft : Colors.dangerSoft }]}>
                      {req.met
                        ? <CheckIcon size={13} color={Colors.success} />
                        : <Text style={s.crossText}>✗</Text>}
                    </View>
                    <Text style={[s.checklistLabel, { color: req.met ? Colors.ink : Colors.ink3 }]}>{req.label}</Text>
                    <Text style={[s.checklistStatus, { color: req.met ? Colors.success : Colors.danger }]}>
                      {req.met ? 'Met' : 'Missing'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* RAFI Product Match */}
            {rafiCfg && (
              <View style={s.section}>
                <Text style={s.sectionLabel}>INIREREKOMENDANG RAFI PROGRAM</Text>
                <View style={[s.productCard, { borderColor: rafiCfg.color }]}>
                  <View style={s.productHead}>
                    <View style={[s.productIconBox, { backgroundColor: rafiCfg.color }]}>
                      {rafiCfg.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.productName, { color: rafiCfg.color }]}>{report.rafiProduct}</Text>
                      <View style={[s.productTag, { backgroundColor: rafiCfg.color + '22' }]}>
                        <Text style={[s.productTagText, { color: rafiCfg.color }]}>{rafiCfg.tag}</Text>
                      </View>
                    </View>
                    <View style={[s.eligibleBadge, { backgroundColor: report.rafiEligible ? Colors.successSoft : Colors.warningSoft }]}>
                      <Text style={[s.eligibleText, { color: report.rafiEligible ? Colors.success : Colors.warning }]}>
                        {report.rafiEligible ? 'Eligible' : 'Build up'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.productDesc}>{report.rafiProductDesc}</Text>
                </View>
              </View>
            )}

            {/* Strengths */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>MGA KALAKASAN</Text>
              <View style={[s.listCard, { borderColor: Colors.success }]}>
                {report.strengths.map((str, i) => (
                  <View key={i} style={[s.listRow, i > 0 && s.listDivider]}>
                    <View style={s.listIcon}><CheckIcon size={13} color={Colors.success} /></View>
                    <Text style={s.listText}>{str}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Concerns */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>MGA ALALAHANIN</Text>
              <View style={[s.listCard, { borderColor: Colors.warning }]}>
                {report.concerns.map((con, i) => (
                  <View key={i} style={[s.listRow, i > 0 && s.listDivider]}>
                    <View style={[s.listIcon, { backgroundColor: Colors.warningSoft }]}>
                      <ClockIcon size={13} color={Colors.warning} />
                    </View>
                    <Text style={s.listText}>{con}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Recommendation */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>REKOMENDASYON</Text>
              <View style={[s.recCard, { borderColor: Colors.info, backgroundColor: Colors.infoSoft }]}>
                <DocumentTextIcon size={20} color={Colors.info} />
                <Text style={[s.recText, { color: Colors.info }]}>{report.recommendation}</Text>
              </View>
            </View>

            {/* RAFI Contact CTA */}
            <View style={s.rafiCTA}>
              <Text style={s.rafiCTATitle}>Handa ka na bang mag-apply sa RAFI?</Text>
              <Text style={s.rafiCTASub}>Bisitahin ang pinakamalapit na RAFI MFI branch o pumunta sa rafimfi.org.ph para sa higit pang impormasyon tungkol sa <Text style={{ fontWeight: '800' }}>{report.rafiProduct}</Text>.</Text>
              <View style={s.rafiCTABadge}>
                <Text style={s.rafiCTABadgeText}>rafimfi.org.ph</Text>
              </View>
            </View>

            {/* Export PDF Button */}
            <TouchableOpacity
              style={[s.pdfBtn, exporting && { opacity: 0.6 }]}
              onPress={exportPDF}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <DocumentTextIcon size={18} color={Colors.white} />
              )}
              <Text style={s.pdfBtnText}>{exporting ? 'Nagge-generate...' : 'I-export bilang PDF'}</Text>
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              * Ang report na ito ay AI-generated at para lamang sa gabay. Hindi ito kumakatawan sa opisyal na credit decision ng RAFI MFI.
            </Text>
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgInput, alignItems: 'center', justifyContent: 'center' },
  exportBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.ink },
  headerSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 1 },

  scroll: { padding: Spacing.lg, gap: Spacing.lg },

  // RAFI Banner
  rafiBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: '#FFF8E7', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1.5, borderColor: '#D97706',
  },
  rafiLogoBox: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: '#D97706', alignItems: 'center', justifyContent: 'center',
  },
  rafiLogoText: { fontSize: FontSize.sm, fontWeight: '900', color: '#fff', lineHeight: 16 },
  rafiLogoSub: { fontSize: 9, fontWeight: '700', color: '#fff9', letterSpacing: 1 },
  rafiTitle: { fontSize: FontSize.sm, fontWeight: '800', color: '#92400E' },
  rafiSub: { fontSize: FontSize.xs, color: '#B45309', marginTop: 3, lineHeight: 17 },

  // KYC Banner
  kycBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5 },
  kycIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kycTitle: { fontSize: FontSize.sm, fontWeight: '800' },
  kycSub: { fontSize: FontSize.xs, color: Colors.ink3, marginTop: 2 },
  kycAction: { fontSize: FontSize.sm, fontWeight: '700' },

  loadingBox: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.md },
  loadingTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.ink },
  loadingSub: { fontSize: FontSize.sm, color: Colors.ink3, textAlign: 'center' },

  errorBox: { alignItems: 'center', gap: Spacing.md },
  errorText: { fontSize: FontSize.sm, color: Colors.danger, textAlign: 'center', backgroundColor: Colors.dangerSoft, padding: Spacing.md, borderRadius: Radius.md },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: Spacing.xl },
  retryBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.sm },

  // Score
  scoreCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  scoreCardLabel: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  scoreCreditLabel: { fontSize: FontSize.lg, fontWeight: '900' },
  scoreMeta: { flex: 1 },
  scoreMetaSub: { fontSize: FontSize.sm, color: Colors.ink3 },
  scoreStat: { fontSize: FontSize.md, fontWeight: '800', color: Colors.ink },
  scoreStatLabel: { fontSize: FontSize.xs, color: Colors.ink3, marginBottom: 4 },
  summaryText: { fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },

  // Checklist
  section: { gap: Spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: Colors.ink3, letterSpacing: 1 },
  checklistCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 13 },
  checklistDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  checklistIcon: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  crossText: { fontSize: 12, fontWeight: '800', color: Colors.danger },
  checklistLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: '500' },
  checklistStatus: { fontSize: FontSize.xs, fontWeight: '700' },

  // RAFI Product card
  productCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 2, padding: Spacing.md, gap: Spacing.sm },
  productHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  productIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: FontSize.base, fontWeight: '800' },
  productTag: { alignSelf: 'flex-start', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  productTagText: { fontSize: 10, fontWeight: '700' },
  eligibleBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  eligibleText: { fontSize: FontSize.xs, fontWeight: '800' },
  productDesc: { fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20 },

  // List cards
  listCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1.5, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md },
  listDivider: { borderTopWidth: 1, borderTopColor: Colors.border },
  listIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: Colors.successSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  listText: { flex: 1, fontSize: FontSize.sm, color: Colors.ink2, lineHeight: 20 },

  // Recommendation
  recCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5 },
  recText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', lineHeight: 20 },

  // RAFI CTA
  rafiCTA: {
    backgroundColor: '#FFF8E7', borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.sm,
    borderWidth: 1.5, borderColor: '#D97706', alignItems: 'center',
  },
  rafiCTATitle: { fontSize: FontSize.base, fontWeight: '800', color: '#92400E', textAlign: 'center' },
  rafiCTASub: { fontSize: FontSize.sm, color: '#B45309', textAlign: 'center', lineHeight: 20 },
  rafiCTABadge: { backgroundColor: '#D97706', borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 8, marginTop: 4 },
  rafiCTABadgeText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },

  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    borderRadius: Radius.md, paddingVertical: 14,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  pdfBtnText: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white },
  disclaimer: { fontSize: FontSize.xs, color: Colors.ink3, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.sm },
});
