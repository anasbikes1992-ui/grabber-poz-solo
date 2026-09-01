export type Lang = 'en' | 'si' | 'ta';

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    hub: 'Hub',
    counterPos: 'Counter POS',
    inventory: 'Inventory',
    orders: 'Orders',
    returns: 'Returns',
    reports: 'Reports',
    customers: 'Customers',
    creditLedger: 'Credit Ledger',
    storefront: 'Storefront',
    signOut: 'Sign Out',
    signIn: 'Sign In',
  },
  si: {
    hub: 'මධ්‍යස්ථානය',
    counterPos: 'POS කවුන්ටරය',
    inventory: 'ඉන්වෙන්ටරි',
    orders: 'ඇණවුම්',
    returns: 'ආපසු',
    reports: 'වාර්තා',
    customers: 'පාරිභෝගික',
    creditLedger: 'ණය පොත',
    storefront: 'සාප්පුව',
    signOut: 'පිටවීම',
    signIn: 'පිවිසෙන්න',
  },
  ta: {
    hub: 'மையம்',
    counterPos: 'POS கவுண்டர்',
    inventory: 'சரக்கு',
    orders: 'ஆர்டர்கள்',
    returns: 'திரும்ப',
    reports: 'அறிக்கைகள்',
    customers: 'வாடிக்கையாளர்',
    creditLedger: 'கடன் புத்தகம்',
    storefront: 'கடை',
    signOut: 'வெளியேறு',
    signIn: 'உள்நுழை',
  },
};

export function t(key: string, lang: Lang = 'en'): string {
  return STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
}

export function readLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const v = localStorage.getItem('grabber_lang');
  return v === 'si' || v === 'ta' ? v : 'en';
}
