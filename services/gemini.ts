/**
 * AI service — powered by Groq (free, no credit card)
 * Text:   llama-3.3-70b-versatile  — fast & smart
 * Vision: meta-llama/llama-4-scout-17b-16e-instruct — OCR receipts
 *
 * Get your FREE key at: https://console.groq.com/keys
 * Paste it in constants/gemini.ts
 */

import { GROQ_API_KEY } from '../constants/gemini';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL   = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// ─── Types ────────────────────────────────────────────────────────
export type InsightType = 'success' | 'warning' | 'info' | 'tip';
export type Insight = { type: InsightType; title: string; body: string };

export type InsightsData = {
  shopName: string;
  ownerName: string;
  weekSales: number;
  todaySales: number;
  todayExpenses: number;
  netProfit: number;
  orders: number;
  topItems: { name: string; count: number; revenue: number }[];
  lowStock: { name: string; stock: number; unit: string }[];
  chartData: { day: string; v: number }[];
};

export type ReceiptData = {
  name: string;
  amount: number;
  category: string;
  note: string;
};

// ─── Raw Groq call ────────────────────────────────────────────────
async function groqCall(model: string, messages: object[], maxTokens = 1024): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

// ─── Generate Business Insights ───────────────────────────────────
export async function generateInsights(data: InsightsData): Promise<Insight[]> {
  const lowStockStr = data.lowStock.length
    ? data.lowStock.map(i => `${i.name} (${i.stock} ${i.unit} natitira)`).join(', ')
    : 'Walang low stock';

  const topItemsStr = data.topItems.length
    ? data.topItems.map(i => `${i.name} — ${i.count}x, ₱${i.revenue}`).join('; ')
    : 'Wala pang benta ngayon';

  const weekStr = data.chartData.map(d => `${d.day}: ₱${d.v}`).join(', ');

  const messages = [
    {
      role: 'system',
      content: `You are a smart and warm business advisor for small Filipino karenderya/food stall owners. You speak in Taglish (Filipino-English mix), like texting a close friend. You ALWAYS return valid JSON only — no markdown fences, no explanation, just the raw JSON array.`,
    },
    {
      role: 'user',
      content: `Business data for "${data.shopName}" (owner: ${data.ownerName}):
- Sales ngayon: ₱${data.todaySales.toLocaleString()}
- Gastos ngayon: ₱${data.todayExpenses.toLocaleString()}
- Net profit: ₱${data.netProfit.toLocaleString()}${data.netProfit < 0 ? ' — LOSS!' : ''}
- Orders ngayon: ${data.orders}
- Weekly trend: ${weekStr}
- Top sellers: ${topItemsStr}
- Low stock: ${lowStockStr}

Generate exactly 4 short, practical, actionable insights. Return ONLY this JSON array:
[{"type":"success"|"warning"|"info"|"tip","title":"Max 5 words","body":"1-2 sentences max 50 words in Taglish"}]

Rules: warning=low stock or loss, success=good profit/sales, tip=recommendation, info=observation.`,
    },
  ];

  const text = await groqCall(TEXT_MODEL, messages);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array in response');
  return JSON.parse(jsonMatch[0]) as Insight[];
}

// ─── Loan Readiness Report (RAFI MFI) ────────────────────────────
export type LoanReport = {
  scoreValue: number;
  creditScore: string;        // 'Mahusay' | 'Maganda' | 'Sapat' | 'Mahirap'
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendation: string;
  rafiProduct: string;        // Recommended RAFI loan product
  rafiProductDesc: string;    // Why this product fits the user
  rafiEligible: boolean;      // Meets basic RAFI eligibility
};

export type LoanReportInput = {
  shopName: string;
  ownerName: string;
  businessType: string;
  kycVerified: boolean;
  monthSales: number;
  monthExpenses: number;
  netProfit: number;
  avgDailySales: number;
  totalOrders: number;
  lowStockCount: number;
};

export async function generateLoanReport(data: LoanReportInput): Promise<LoanReport> {
  const isSmallVendor = /karenderya|sari.sari|tindahan|food stall|bakery/i.test(data.businessType);

  const messages = [
    {
      role: 'system',
      content: `You are a credit analyst for RAFI MFI (Rural Agro-Industrial Foundation for Integral Development, Inc.), a leading microfinance institution in the Philippines. You evaluate small Filipino business owners for loan readiness using RAFI's actual loan products and requirements. You respond in Taglish. You ALWAYS return valid JSON only — no markdown, no explanation.

RAFI MFI Products (use EXACT names below):

MICRO LOANS:
- Mauswagon Loan — For business operations: digital tools, operating expenses, raw materials, business improvements. Best entry-level business loan.
- Mauswagon Plus Loan — Enhanced business loan for purchase, construction, marketing, working capital, or loan buy-outs. For more established businesses.
- Kabuhayan Loan — For agricultural businesses: hog raisers, purchasing feeds, livestock. For farming-related businesses.
- Housing Improvement Loan — Supplemental loan for housing upgrades and sanitation. Not a business loan.
- Education Loan — For tuition and school expenses. Not a business loan.
- SAGIP Loan — Emergency loan for disasters or medical emergencies.

MICRO SAVINGS:
- Capital Build-Up (CBU) — Mandatory savings product. For those not yet eligible for loans, helps develop savings habit and build creditworthiness.
- MyIpon — Voluntary savings linked to supplemental loan.

SOCIAL DEVELOPMENT:
- Tindahan Ni Nanay — NOT a loan. A social development program for small store owners (karenderya, sari-sari). Provides product development support, market linkages, and digital platforms. Recommend alongside a loan product.

MINIMUM REQUIREMENTS (all RAFI products):
- Age 18–64
- Resident of current address for at least 1 year
- Good credit standing; no active legal cases
- Stable family income
- Able to attend regular center meetings
- Disciplined and responsible

ADDITIONAL REQUIREMENTS for Mauswagon Plus:
- Age 21–60, business operating 2+ years, valid business permit, resident 3+ years, max 2 existing loans, business within 25km of RAFI branch`,
    },
    {
      role: 'user',
      content: `Evaluate RAFI loan readiness for "${data.shopName}" (${data.businessType}), owner: ${data.ownerName}.

Financial Data (last 30 days):
- KYC/Gov't ID Verified: ${data.kycVerified ? 'YES ✓' : 'NO ✗'}
- Business Type: ${data.businessType}${isSmallVendor ? ' — qualifies for Tindahan Ni Nanay program' : ''}
- Total Sales: ₱${data.monthSales.toLocaleString()}
- Total Expenses: ₱${data.monthExpenses.toLocaleString()}
- Net Profit: ₱${data.netProfit.toLocaleString()}${data.netProfit < 0 ? ' ⚠ LOSS' : ''}
- Avg Daily Sales: ₱${data.avgDailySales.toFixed(0)}
- Total Orders (30 days): ${data.totalOrders}

Scoring Rules:
- No KYC = max score 35, rafiEligible: false
- KYC verified + consistent profit = score 65–90
- Loss or zero sales = score 15–40
- Some sales but no profit = score 40–60

Product Selection Rules (pick the BEST fit from the exact product names):
- karenderya/sari-sari/food stall + KYC + profit → "Mauswagon Loan" (primary) + note Tindahan Ni Nanay in desc
- established business + strong sales → "Mauswagon Plus Loan"
- farming/livestock → "Kabuhayan Loan"
- poor data or no KYC → "Capital Build-Up (CBU)"
- emergency situation → "SAGIP Loan"

Return ONLY this JSON (use EXACT product name from the list above):
{
  "scoreValue": <integer 0-100>,
  "creditScore": "<Mahusay|Maganda|Sapat|Mahirap>",
  "summary": "<2-3 sentences in Taglish about their RAFI loan readiness>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<1-2 sentences: specific next step advice referencing a RAFI product>",
  "rafiProduct": "<exact product name>",
  "rafiProductDesc": "<1-2 sentences sa Taglish kung bakit angkop ang product + kung small vendor, mention Tindahan Ni Nanay program>",
  "rafiEligible": <true|false>
}`,
    },
  ];

  const text = await groqCall(TEXT_MODEL, messages, 900);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in loan report response');
  return JSON.parse(jsonMatch[0]) as LoanReport;
}

// ─── OCR: Extract ALL line items from a receipt ──────────────────
export async function extractReceiptOCR(base64Image: string): Promise<ReceiptData[]> {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
        {
          type: 'text',
          text: `Look at this receipt or expense image. Extract ALL individual purchased items.
Return ONLY a valid JSON array (no markdown, no extra text):
[{"name":"item name","amount":price,"category":"Ingredients|Utilities|Labor|Supplies|Rent|Maintenance|Other","note":""}]

Rules:
- Include every separate line item as its own object
- "amount" = that item's price, NOT the receipt total
- If unreadable or no items: []`,
        },
      ],
    },
  ];

  const text = await groqCall(VISION_MODEL, messages, 512);
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed as ReceiptData[] : [];
  } catch { return []; }
}
