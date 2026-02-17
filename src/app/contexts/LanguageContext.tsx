import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'he';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  direction: 'ltr' | 'rtl';
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const translations = {
  en: {
    // General
    'dashboard': 'Dashboard',
    'map': 'Map',
    'units': 'Units',
    'incidents': 'Incidents',
    'settings': 'Settings',
    'logout': 'Logout',
    'search_placeholder': 'Search calls by address, caller, or type...',
    'dashboard_overview': 'Dashboard Overview',
    'real_time_ops': 'Real-time emergency operations center',
    'live_map_view': 'Live Map View',
    'interactive_map': 'Interactive Map Area',
    
    // Stats
    'total_calls': 'Total Calls',
    'active_calls': 'Active Calls',
    'completed_calls': 'Completed Calls',
    'avg_response_time': 'Avg Response Time',
    
    // Tabs
    'all_calls': 'All Calls',
    'pending': 'Pending',
    'active': 'Active',
    'critical': 'Critical',
    
    // Call Card
    'call_details': 'Call Details',
    'dispatch': 'Dispatch',
    'view': 'View',
    'status': 'Status',
    'eta': 'ETA',
    
    // Silent Listener
    'silent_listener': 'SilentListener AI',
    'monitoring_comms': 'Monitoring All Comms',
    'live_feed': 'Live Feed',
    'radio': 'Radio',
    'phone': 'Phone',
    'transmitting': 'TRANSMITTING',
    'monitoring': 'MONITORING',
    'push_to_talk': 'PUSH TO TALK',
    'softphone': 'Softphone',
    'enter_number': 'Enter number...',
    'call': 'Call',
    'end_call': 'End Call',
    
    // Units
    'unit_status': 'Unit Status',
    'available': 'Available',
    'busy': 'Busy',
    'dispatched': 'Dispatched',
    'out_of_service': 'Out of Service',
    // Sidebar
    'dispatch_section': 'Dispatch',
    'active_calls_menu': 'Active Calls',
    'units_status_menu': 'Units Status',
    'live_map_menu': 'Live Map',
    'management_section': 'Management',
    'personnel_menu': 'Personnel',
    'reports_menu': 'Reports',
    'call_history_menu': 'Call History',
    'system_settings_menu': 'System Settings',
  },
  he: {
    // General
    'dashboard': 'לוח בקרה',
    'map': 'מפה',
    'units': 'יחידות',
    'incidents': 'תקריות',
    'settings': 'הגדרות',
    'logout': 'התנתק',
    'search_placeholder': 'חפש קריאות לפי כתובת, מתקשר או סוג...',
    'dashboard_overview': 'סקירת לוח בקרה',
    'real_time_ops': 'מרכז מבצעי חירום בזמן אמת',
    'live_map_view': 'תצוגת מפה חיה',
    'interactive_map': 'אזור מפה אינטראקטיבי',
    
    // Stats
    'total_calls': 'סה״כ קריאות',
    'active_calls': 'קריאות פעילות',
    'completed_calls': 'קריאות שהושלמו',
    'avg_response_time': 'זמן תגובה ממוצע',
    
    // Tabs
    'all_calls': 'כל הקריאות',
    'pending': 'ממתינות',
    'active': 'פעילות',
    'critical': 'קריטי',
    
    // Call Card
    'call_details': 'פרטי קריאה',
    'dispatch': 'שגר',
    'view': 'צפה',
    'status': 'סטטוס',
    'eta': 'זמן הגעה משוער',
    
    // Silent Listener
    'silent_listener': 'מאזין שקט AI',
    'monitoring_comms': 'מנטר את כל התקשורת',
    'live_feed': 'שידור חי',
    'radio': 'קשר',
    'phone': 'טלפון',
    'transmitting': 'משדר',
    'monitoring': 'מנטר',
    'push_to_talk': 'לחץ כדי לדבר',
    'softphone': 'טלפון רך',
    'enter_number': 'הכנס מספר...',
    'call': 'חייג',
    'end_call': 'סיים שיחה',
    
    // Units
    'unit_status': 'סטטוס יחידות',
    'available': 'פנוי',
    'busy': 'עסוק',
    'dispatched': 'הוזנק',
    'out_of_service': 'לא בשירות',
    // Sidebar
    'dispatch_section': 'שיגור',
    'active_calls_menu': 'קריאות פעילות',
    'units_status_menu': 'סטטוס יחידות',
    'live_map_menu': 'מפה חיה',
    'management_section': 'ניהול',
    'personnel_menu': 'כוח אדם',
    'reports_menu': 'דוחות',
    'call_history_menu': 'היסטוריית קריאות',
    'system_settings_menu': 'הגדרות מערכת',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  const direction = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
  }, [direction, language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, direction, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
