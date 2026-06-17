export type Locale = "en" | "hi" | "ta" | "te" | "bn" | "mr" | "kn";

export interface Translations {
  [key: string]: string;
}

const translations: Record<Locale, Translations> = {
  en: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-enabled National Learning Operating System",
    "nav.dashboard": "Dashboard",
    "nav.tutor": "AI Tutor",
    "nav.path": "Learning Path",
    "nav.assessments": "Assessments",
    "nav.settings": "Settings",
    "nav.logout": "Logout",
    "auth.login": "Sign In",
    "auth.register": "Create Account",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.forgot": "Forgot Password?",
    "dashboard.welcome": "Welcome back",
    "dashboard.progress": "Overall Progress",
    "dashboard.streak": "Learning Streak",
    "tutor.placeholder": "Type your question...",
    "tutor.send": "Send",
    "tutor.greeting": "Hi! I'm your AI tutor. Ask me anything!",
    "assessment.submit": "Submit",
    "assessment.next": "Next",
    "assessment.previous": "Previous",
    "assessment.results": "Results",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.retry": "Try Again",
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel",
  },
  hi: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-सक्षम राष्ट्रीय शिक्षण ऑपरेटिंग सिस्टम",
    "nav.dashboard": "डैशबोर्ड",
    "nav.tutor": "AI ट्यूटर",
    "nav.path": "सीखने का मार्ग",
    "nav.assessments": "मूल्यांकन",
    "nav.settings": "सेटिंग्स",
    "nav.logout": "लॉग आउट",
    "auth.login": "साइन इन",
    "auth.register": "खाता बनाएं",
    "auth.email": "ईमेल पता",
    "auth.password": "पासवर्ड",
    "auth.forgot": "पासवर्ड भूल गए?",
    "dashboard.welcome": "वापस स्वागत है",
    "dashboard.progress": "कुल प्रगति",
    "dashboard.streak": "सीखने की लय",
    "tutor.placeholder": "अपना प्रश्न लिखें...",
    "tutor.send": "भेजें",
    "tutor.greeting": "नमस्ते! मैं आपका AI ट्यूटर हूं। मुझसे कुछ भी पूछें!",
    "assessment.submit": "जमा करें",
    "assessment.next": "अगला",
    "assessment.previous": "पिछला",
    "assessment.results": "परिणाम",
    "common.loading": "लोड हो रहा है...",
    "common.error": "एक त्रुटि हुई",
    "common.retry": "पुनः प्रयास करें",
    "common.back": "वापस",
    "common.save": "सहेजें",
    "common.cancel": "रद्द करें",
  },
  ta: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-இயக்கப்பட்ட தேசிய கற்றல் இயங்குதளம்",
    "nav.dashboard": "டாஷ்போர்ட்",
    "nav.tutor": "AI ஆசிரியர்",
    "nav.path": "கற்றல் பாதை",
    "nav.assessments": "மதிப்பீடுகள்",
    "nav.settings": "அமைப்புகள்",
    "nav.logout": "வெளியேறு",
    "auth.login": "உள்நுழை",
    "auth.register": "கணக்கை உருவாக்கு",
    "auth.email": "மின்னஞ்சல்",
    "auth.password": "கடவுச்சொல்",
    "auth.forgot": "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
    "dashboard.welcome": "மீண்டும் வரவேற்கிறோம்",
    "dashboard.progress": "மொத்த முன்னேற்றம்",
    "dashboard.streak": "கற்றல் தொடர்ச்சி",
    "tutor.placeholder": "உங்கள் கேள்வியை தட்டச்சு செய்யுங்கள்...",
    "tutor.send": "அனுப்பு",
    "tutor.greeting": "வணக்கம்! நான் உங்கள் AI ஆசிரியர். எதையும் கேளுங்கள்!",
    "assessment.submit": "சமர்ப்பிக்கவும்",
    "assessment.next": "அடுத்து",
    "assessment.previous": "முந்தைய",
    "assessment.results": "முடிவுகள்",
    "common.loading": "ஏற்றுகிறது...",
    "common.error": "பிழை ஏற்பட்டது",
    "common.retry": "மீண்டும் முயற்சிக்கவும்",
    "common.back": "பின்",
    "common.save": "சேமி",
    "common.cancel": "ரத்து",
  },
  te: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-ఆధారిత జాతీయ అభ్యాస ఆపరేటింగ్ సిస్టమ్",
    "nav.dashboard": "డాష్‌బోర్డ్",
    "nav.tutor": "AI ట్యూటర్",
    "nav.path": "నేర్చుకునే మార్గం",
    "nav.assessments": "అంచనాలు",
    "nav.settings": "సెట్టింగ్‌లు",
    "nav.logout": "లాగ్ అవుట్",
    "auth.login": "సైన్ ఇన్",
    "auth.register": "ఖాతా సృష్టించు",
    "auth.email": "ఇమెయిల్",
    "auth.password": "పాస్‌వర్డ్",
    "auth.forgot": "పాస్‌వర్డ్ మర్చిపోయారా?",
    "dashboard.welcome": "తిరిగి స్వాగతం",
    "dashboard.progress": "మొత్తం పురోగతి",
    "dashboard.streak": "నేర్చుకునే క్రమం",
    "tutor.placeholder": "మీ ప్రశ్న టైప్ చేయండి...",
    "tutor.send": "పంపు",
    "tutor.greeting": "హలో! నేను మీ AI ట్యూటర్. ఏదైనా అడగండి!",
    "assessment.submit": "సమర్పించు",
    "assessment.next": "తదుపరి",
    "assessment.previous": "మునుపటి",
    "assessment.results": "ఫలితాలు",
    "common.loading": "లోడ్ అవుతోంది...",
    "common.error": "లోపం సంభవించింది",
    "common.retry": "మళ్ళీ ప్రయత్నించండి",
    "common.back": "వెనుకకు",
    "common.save": "సేవ్",
    "common.cancel": "రద్దు",
  },
  bn: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-সক্ষম জাতীয় শিক্ষা অপারেটিং সিস্টেম",
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.tutor": "AI শিক্ষক",
    "nav.path": "শেখার পথ",
    "nav.assessments": "মূল্যায়ন",
    "nav.settings": "সেটিংস",
    "nav.logout": "লগ আউট",
    "auth.login": "সাইন ইন",
    "auth.register": "অ্যাকাউন্ট তৈরি করুন",
    "auth.email": "ইমেইল",
    "auth.password": "পাসওয়ার্ড",
    "auth.forgot": "পাসওয়ার্ড ভুলে গেছেন?",
    "dashboard.welcome": "স্বাগতম",
    "dashboard.progress": "সামগ্রিক অগ্রগতি",
    "dashboard.streak": "শেখার ধারাবাহিকতা",
    "tutor.placeholder": "আপনার প্রশ্ন লিখুন...",
    "tutor.send": "পাঠান",
    "tutor.greeting": "হ্যালো! আমি আপনার AI শিক্ষক। যেকোনো কিছু জিজ্ঞাসা করুন!",
    "assessment.submit": "জমা দিন",
    "assessment.next": "পরবর্তী",
    "assessment.previous": "আগের",
    "assessment.results": "ফলাফল",
    "common.loading": "লোড হচ্ছে...",
    "common.error": "একটি ত্রুটি ঘটেছে",
    "common.retry": "আবার চেষ্টা করুন",
    "common.back": "পিছনে",
    "common.save": "সংরক্ষণ",
    "common.cancel": "বাতিল",
  },
  mr: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-सक्षम राष्ट्रीय शिक्षण ऑपरेटिंग सिस्टम",
    "nav.dashboard": "डॅशबोर्ड",
    "nav.tutor": "AI शिक्षक",
    "nav.path": "शिकण्याचा मार्ग",
    "nav.assessments": "मूल्यांकन",
    "nav.settings": "सेटिंग्ज",
    "nav.logout": "लॉग आउट",
    "auth.login": "साइन इन",
    "auth.register": "खाते तयार करा",
    "auth.email": "ईमेल",
    "auth.password": "पासवर्ड",
    "auth.forgot": "पासवर्ड विसरलात?",
    "dashboard.welcome": "परत स्वागत आहे",
    "dashboard.progress": "एकूण प्रगती",
    "dashboard.streak": "शिकण्याची सातत्यता",
    "tutor.placeholder": "तुमचा प्रश्न लिहा...",
    "tutor.send": "पाठवा",
    "tutor.greeting": "नमस्कार! मी तुमचा AI शिक्षक आहे. काहीही विचारा!",
    "assessment.submit": "सादर करा",
    "assessment.next": "पुढे",
    "assessment.previous": "मागे",
    "assessment.results": "निकाल",
    "common.loading": "लोड होत आहे...",
    "common.error": "एक त्रुटी आली",
    "common.retry": "पुन्हा प्रयत्न करा",
    "common.back": "मागे",
    "common.save": "जतन करा",
    "common.cancel": "रद्द करा",
  },
  kn: {
    "app.title": "LearningOS",
    "app.subtitle": "AI-ಸಕ್ಷಮ ರಾಷ್ಟ್ರೀಯ ಕಲಿಕಾ ಆಪರೇಟಿಂಗ್ ಸಿಸ್ಟಮ್",
    "nav.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "nav.tutor": "AI ಶಿಕ್ಷಕ",
    "nav.path": "ಕಲಿಕಾ ಮಾರ್ಗ",
    "nav.assessments": "ಮೌಲ್ಯಮಾಪನ",
    "nav.settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "nav.logout": "ಲಾಗ್ ಔಟ್",
    "auth.login": "ಸೈನ್ ಇನ್",
    "auth.register": "ಖಾತೆ ರಚಿಸಿ",
    "auth.email": "ಇಮೇಲ್",
    "auth.password": "ಪಾಸ್‌ವರ್ಡ್",
    "auth.forgot": "ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?",
    "dashboard.welcome": "ಮರಳಿ ಸ್ವಾಗತ",
    "dashboard.progress": "ಒಟ್ಟಾರೆ ಪ್ರಗತಿ",
    "dashboard.streak": "ಕಲಿಕಾ ಸರಣಿ",
    "tutor.placeholder": "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ...",
    "tutor.send": "ಕಳುಹಿಸಿ",
    "tutor.greeting": "ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ಶಿಕ್ಷಕ. ಏನಾದರೂ ಕೇಳಿ!",
    "assessment.submit": "ಸಲ್ಲಿಸಿ",
    "assessment.next": "ಮುಂದೆ",
    "assessment.previous": "ಹಿಂದಿನ",
    "assessment.results": "ಫಲಿತಾಂಶ",
    "common.loading": "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
    "common.error": "ದೋಷ ಸಂಭವಿಸಿದೆ",
    "common.retry": "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    "common.back": "ಹಿಂದೆ",
    "common.save": "ಉಳಿಸಿ",
    "common.cancel": "ರದ್ದು",
  },
};

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
  te: "తెలుగు",
  bn: "বাংলা",
  mr: "मराठी",
  kn: "ಕನ್ನಡ",
};

/**
 * Get translation for a key in the specified locale.
 * Falls back to English if the key is not found in the target locale.
 */
export function t(key: string, locale: Locale = defaultLocale): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

/**
 * Get all translations for a locale.
 */
export function getTranslations(locale: Locale): Translations {
  return translations[locale] || translations.en;
}

/**
 * Detect locale from browser or subdomain.
 */
export function detectLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;

  // Check URL params
  const params = new URLSearchParams(window.location.search);
  const paramLocale = params.get("lang") as Locale | null;
  if (paramLocale && translations[paramLocale]) return paramLocale;

  // Check localStorage
  const stored = localStorage.getItem("locale") as Locale | null;
  if (stored && translations[stored]) return stored;

  // Check browser language
  const browserLang = navigator.language.split("-")[0] as Locale;
  if (translations[browserLang]) return browserLang;

  return defaultLocale;
}

/**
 * Save locale preference.
 */
export function setLocale(locale: Locale): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("locale", locale);
  }
}
