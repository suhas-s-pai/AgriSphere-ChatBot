/**
 * Initial Seed Data Generator for ScamSniff
 * Provides realistic demo scans and populates memory store / MongoDB if empty.
 */

const Scan = require('../models/Scan');
const { getStatus, memoryStore } = require('../config/db');

const SEED_SCANS = [
  {
    mode: 'PAYMENT',
    category: 'Prize/Lottery Scam',
    riskLevel: 'HIGH',
    riskScore: 95,
    confidence: 0.94,
    sanitizedContent: "Congratulations! You have been selected for a ₹50,000 government reward. Pay ₹299 processing fee immediately.",
    redFlags: [
      {
        title: 'Advance payment demanded',
        description: 'The message requires you to pay ₹299 before receiving ₹50,000.',
        severity: 'HIGH'
      },
      {
        title: 'Unrealistic reward promised',
        description: 'Large unearned financial reward created to entice immediate action.',
        severity: 'HIGH'
      },
      {
        title: 'Urgency created',
        description: 'Demands immediate payment to prevent user from verifying.',
        severity: 'HIGH'
      }
    ],
    confirmedIndicators: ['Upfront payment requested for prize', 'Government authority reference'],
    suspiciousIndicators: ['Pressure to act immediately'],
    unknownInformation: ['Official authorization certificate unverified'],
    explanation: 'This message combines a large unexpected financial reward, an advance processing fee request, and urgency. Legitimate government rewards never ask for upfront payment fees.',
    recommendedActions: [
      "Do not send the ₹299 fee.",
      "Do not click links or call numbers in the message.",
      "Verify official government schemes on official .gov.in websites only.",
      "Report the sender number to national cyber crime authorities."
    ],
    createdAt: new Date(Date.now() - 3600000 * 2) // 2 hours ago
  },
  {
    mode: 'INTERNSHIP',
    category: 'Job/Internship Scam',
    riskLevel: 'HIGH',
    riskScore: 92,
    confidence: 0.91,
    sanitizedContent: "Your internship application has been shortlisted. Pay ₹1,500 registration fee to confirm your position.",
    redFlags: [
      {
        title: 'Mandatory upfront registration fee',
        description: 'Legitimate companies pay interns; they never charge applicants a registration fee.',
        severity: 'HIGH'
      },
      {
        title: 'Irregular hiring process',
        description: 'Offer extended without formal technical interview or verifiable employer domain.',
        severity: 'HIGH'
      }
    ],
    confirmedIndicators: ['Upfront money demanded for job offer confirmation'],
    suspiciousIndicators: ['Recruiter using generic messaging app'],
    unknownInformation: ['Company incorporation details unverified'],
    explanation: 'Demanding money to confirm an internship or issue an offer letter is a classic fake internship scam. Real companies do not charge registration or training fees.',
    recommendedActions: [
      "Refuse to pay the ₹1,500 registration fee.",
      "Check the company's official website careers page.",
      "Look up the recruiter's official email address and LinkedIn profile."
    ],
    createdAt: new Date(Date.now() - 3600000 * 6)
  },
  {
    mode: 'LINK',
    category: 'Phishing',
    riskLevel: 'HIGH',
    riskScore: 90,
    confidence: 0.92,
    sanitizedContent: "Your bank KYC has expired. Click this link immediately to avoid account suspension: http://secure-bank-kyc.top/login",
    redFlags: [
      {
        title: 'Fake account suspension threat',
        description: 'Creates panic by threatening account suspension.',
        severity: 'HIGH'
      },
      {
        title: 'Insecure HTTP link',
        description: 'The link uses HTTP instead of encrypted HTTPS.',
        severity: 'HIGH'
      },
      {
        title: 'Suspicious TLD (.top)',
        description: 'Uses a high-risk cheap domain extension (.top) instead of official bank domain.',
        severity: 'HIGH'
      }
    ],
    confirmedIndicators: ['Lookalike bank domain', 'Account suspension coercion'],
    suspiciousIndicators: ['Non-HTTPS link structure'],
    unknownInformation: ['Domain owner registration details obscured'],
    explanation: 'This is a phishing link designed to steal your online banking login details. Banks will never send SMS links with high-risk TLDs like .top to update KYC.',
    recommendedActions: [
      "Do NOT click the link.",
      "Do NOT enter your banking login ID or password.",
      "Access your bank account only through the official mobile app or official website bookmark."
    ],
    createdAt: new Date(Date.now() - 3600000 * 18)
  },
  {
    mode: 'PAYMENT',
    category: 'UPI/Payment Scam',
    riskLevel: 'HIGH',
    riskScore: 96,
    confidence: 0.95,
    sanitizedContent: "Someone is asking me for an [REDACTED_OTP] to process my refund.",
    redFlags: [
      {
        title: 'OTP request for receiving funds',
        description: 'You NEVER need an OTP or PIN to RECEIVE money or refunds via UPI or bank transfer.',
        severity: 'HIGH'
      },
      {
        title: 'Account takeover risk',
        description: 'Sharing an OTP allows scammers to authorize transactions or take over your bank account.',
        severity: 'HIGH'
      }
    ],
    confirmedIndicators: ['OTP requested under guise of refund'],
    suspiciousIndicators: ['Unsolicited support agent calling'],
    unknownInformation: ['Caller employee credentials unverified'],
    explanation: 'OTP is an authentication secret used only to DEDUCT money or log in. Anyone asking for an OTP to give you a refund is attempting a scam.',
    recommendedActions: [
      "NEVER share the OTP with anyone under any circumstances.",
      "Hang up immediately.",
      "Check your official app directly for true refund status."
    ],
    createdAt: new Date(Date.now() - 3600000 * 28)
  },
  {
    mode: 'MESSAGE',
    category: 'Other Suspicious Activity',
    riskLevel: 'LOW',
    riskScore: 12,
    confidence: 0.88,
    sanitizedContent: "Hi Team, please find attached the slide deck for our project presentation scheduled for tomorrow at 10 AM. Regards, Alex.",
    redFlags: [],
    confirmedIndicators: [],
    suspiciousIndicators: [],
    unknownInformation: ['External email domain unverified'],
    explanation: 'No obvious scam indicators, urgency language, payment requests, or suspicious links were detected in this message.',
    recommendedActions: [
      "Verify sender email address if you do not know Alex.",
      "Exercise standard file attachment caution."
    ],
    createdAt: new Date(Date.now() - 3600000 * 40)
  }
];

async function seedInitialData() {
  const { isConnected } = getStatus();

  if (isConnected) {
    try {
      const count = await Scan.countDocuments();
      if (count === 0) {
        await Scan.insertMany(SEED_SCANS);
        console.log(`✅ Seeded ${SEED_SCANS.length} demo scans into MongoDB.`);
      }
    } catch (err) {
      console.warn('⚠️ Seeding MongoDB failed:', err.message);
    }
  }

  // Populate memory store regardless for fast offline fallback
  if (memoryStore.scans.length === 0) {
    memoryStore.scans = SEED_SCANS.map((s, idx) => ({
      _id: `seed-scan-${idx + 1}`,
      ...s
    }));
    console.log(`✅ Seeded memory store with ${memoryStore.scans.length} demo scans.`);
  }
}

module.exports = {
  SEED_SCANS,
  seedInitialData
};
