
export type Locale = 'en' | 'hi';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // General
    'get_started': 'Get Started',
    'welcome_back': 'Welcome Back!',
    'login_to_continue': 'Login to continue.',
    'phone_number': 'Phone Number',
    'send_otp': 'Send OTP',
    'or_continue_with': 'OR CONTINUE WITH',
    'login_with_google': 'Login with Google',
    'dont_have_account': "Don't have an account?",
    'signup': 'Signup',
    'toast_coming_soon': 'This feature is coming soon!',
    'services': 'Services',
  },
  hi: {
    // General
    'get_started': 'शुरू करें',
    'welcome_back': 'वापसी पर स्वागत है!',
    'login_to_continue': 'जारी रखने के लिए लॉगिन करें।',
    'phone_number': 'फ़ोन नंबर',
    'send_otp': 'OTP भेजें',
    'or_continue_with': 'या इसके साथ जारी रखें',
    'login_with_google': 'Google के साथ लॉगिन करें',
    'dont_have_account': 'खाता नहीं है?',
    'signup': 'साइन अप करें',
    'toast_coming_soon': 'यह सुविधा जल्द ही आ रही है!',
    'services': 'सेवाएं',
  },
};
