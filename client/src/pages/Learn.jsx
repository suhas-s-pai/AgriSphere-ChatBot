import React from 'react';
import { BookOpen, ShieldAlert, KeyRound, Globe, Briefcase, CreditCard, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Learn() {
  const topics = [
    {
      icon: ShieldAlert,
      color: 'text-red-500 bg-red-500/10',
      title: '1. What is Phishing?',
      summary: 'Phishing is a cyber attack where scammers impersonate trusted brands or organizations to trick you into revealing sensitive information like passwords or credit card numbers.',
      keyTakeaway: 'Always verify the sender address and never click suspicious login links sent via SMS or email.',
      redFlags: [
        'Urgent threats like "Account suspended in 10 minutes"',
        'Generic greetings like "Dear Customer"',
        'Mismatch between sender name and email domain'
      ]
    },
    {
      icon: Briefcase,
      color: 'text-amber-500 bg-amber-500/10',
      title: '2. How do fake job & internship scams work?',
      summary: 'Scammers offer lucrative work-from-home jobs or prestigious internships, then demand upfront "registration fees", "training charges", or "security deposits".',
      keyTakeaway: 'Legitimate employers pay interns and employees. Real companies NEVER demand upfront money to issue an offer letter or interview.',
      redFlags: [
        'Asking for ₹500–₹2,000 upfront registration fees',
        'Job offer extended immediately without technical interview',
        'Communication restricted to Telegram or personal WhatsApp numbers'
      ]
    },
    {
      icon: Globe,
      color: 'text-purple-500 bg-purple-500/10',
      title: '3. How can I identify a fake website?',
      summary: 'Fake websites use lookalike domains (e.g., paytm-security-verify.top instead of paytm.com) to mimic real banking and shopping portals.',
      keyTakeaway: 'Check the domain name carefully. Look for HTTPS and beware of unusual top-level domains like .xyz, .top, or .site.',
      redFlags: [
        'Excessive hyphens in domain name (e.g. secure-bank-login-update.com)',
        'Lack of HTTPS green padlock icon',
        'IP address host instead of registered domain name'
      ]
    },
    {
      icon: KeyRound,
      color: 'text-blue-500 bg-blue-500/10',
      title: '4. Why should I NEVER share an OTP?',
      summary: 'An OTP (One-Time Password) is a two-factor authentication secret key used to grant access or approve money debits from your bank account.',
      keyTakeaway: 'You NEVER need an OTP to RECEIVE money or refunds. Sharing an OTP gives scammers full control over your bank account.',
      redFlags: [
        'Anyone asking for an OTP over the phone to process a "refund"',
        'Messages saying "Share OTP to claim your prize"',
        'Support agents demanding your SMS verification code'
      ]
    },
    {
      icon: CreditCard,
      color: 'text-emerald-500 bg-emerald-500/10',
      title: '5. How do UPI & Payment Scams work?',
      summary: 'Scammers send UPI payment requests or QR codes claiming you are receiving money. Scanning a QR code or entering your UPI PIN always DEBUCTS money.',
      keyTakeaway: 'Entering your UPI PIN is only required to SEND money, never to receive money.',
      redFlags: [
        'Being asked to scan a QR code to receive a refund or payment',
        'Receiving a UPI request titled "REFUND" that asks for your PIN',
        'Overpayment scam where buyer asks you to send back extra change'
      ]
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
          <BookOpen className="w-4 h-4" />
          <span>CYBERSECURITY EDUCATION & GUIDES</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Learn How to Spot Online Scams
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
          Essential cybersecurity knowledge written in plain language for students, job seekers, and internet users.
        </p>
      </div>

      {/* Educational Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {topics.map((topic, idx) => {
          const Icon = topic.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${topic.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {topic.title}
                  </h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {topic.summary}
                </p>

                {/* Key Takeaway Box */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Golden Rule: </span>
                    {topic.keyTakeaway}
                  </div>
                </div>

                {/* Red Flags List */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Common Red Flags:
                  </span>
                  {topic.redFlags.map((flag, fIdx) => (
                    <div key={fIdx} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
