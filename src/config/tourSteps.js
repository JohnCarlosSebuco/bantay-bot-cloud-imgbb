// Tour step configurations for each page
// Each step targets an element with data-tour attribute

export const dashboardTourSteps = [
  {
    target: 'dashboard-header',
    title: {
      en: 'Welcome to BantayBot!',
      tl: 'Maligayang Pagdating sa BantayBot!'
    },
    description: {
      en: 'This is your smart crop protection app. Let me show you around!',
      tl: 'Ito ang iyong smart na app para protektahan ang iyong tanim. Ituturo ko sa iyo kung paano gamitin!'
    },
    position: 'bottom',
    icon: '👋'
  },
  {
    target: 'dashboard-connection-status',
    title: {
      en: 'Connection Status',
      tl: 'Status ng Koneksyon'
    },
    description: {
      en: 'This shows if your BantayBot is connected. Green means online, red means offline.',
      tl: 'Dito makikita kung nakakonekta ang BantayBot mo. Berde kung online, pula kung offline.'
    },
    position: 'bottom',
    icon: '📡'
  },
  {
    target: 'dashboard-bird-count',
    title: {
      en: 'Birds Detected Today',
      tl: 'Ibon na Nakita Ngayon'
    },
    description: {
      en: 'Shows how many birds were detected by your BantayBot today.',
      tl: 'Ipinapakita kung ilan ang ibon na nakita ng BantayBot mo ngayong araw.'
    },
    position: 'bottom',
    icon: '🐦'
  },
  {
    target: 'dashboard-last-update',
    title: {
      en: 'Last Update Time',
      tl: 'Huling Update'
    },
    description: {
      en: 'Shows when the data was last updated from your device.',
      tl: 'Ipinapakita kung kailan huling nag-update ang datos mula sa device mo.'
    },
    position: 'bottom',
    icon: '🕐'
  },
  {
    target: 'dashboard-soil-sensors',
    title: {
      en: 'Soil Condition',
      tl: 'Kalagayan ng Lupa'
    },
    description: {
      en: 'Monitor your soil\'s moisture, temperature, nutrients, and pH level in real-time.',
      tl: 'Tingnan ang kalagayan ng lupa mo - kung basa, mainit, may sustansya, at pH level.'
    },
    position: 'top',
    icon: '🌱'
  },
  {
    target: 'dashboard-quick-controls',
    title: {
      en: 'Quick Controls',
      tl: 'Mabilisang Kontrol'
    },
    description: {
      en: 'Quickly control your BantayBot: move arms, rotate head, or sound the alarm.',
      tl: 'Mabilis na kontrolin ang BantayBot: igalaw ang braso, ikutin ang ulo, o patunugin ang alarma.'
    },
    position: 'top',
    icon: '⚡'
  },
  {
    target: 'dashboard-soil-health',
    title: {
      en: 'Soil Health Score',
      tl: 'Kalusugan ng Lupa'
    },
    description: {
      en: 'See your overall soil health score. Green is good, yellow needs attention, red needs action.',
      tl: 'Tingnan ang overall na kalusugan ng lupa mo. Berde ay mabuti, dilaw ay kailangan ng atensyon, pula ay kailangan ng aksyon.'
    },
    position: 'top',
    icon: '💚'
  },
  {
    target: 'dashboard-recommendations',
    title: {
      en: 'Smart Recommendations',
      tl: 'Mga Rekomendasyon'
    },
    description: {
      en: 'Get smart advice on what to do based on your soil conditions. Tap the info button for details!',
      tl: 'Makakuha ng payo kung ano ang dapat gawin batay sa kalagayan ng lupa mo. Pindutin ang info button para sa detalye!'
    },
    position: 'top',
    icon: '💡'
  },
  {
    target: 'nav-bar',
    title: {
      en: 'Navigation Bar',
      tl: 'Navigation Bar'
    },
    description: {
      en: 'Use these buttons to navigate: Dashboard, Controls, Analytics, History, and Settings.',
      tl: 'Gamitin ang mga button na ito para lumipat: Dashboard, Kontrol, Ulat, History, at Settings.'
    },
    position: 'top',
    icon: '📱'
  }
];

export const controlsTourSteps = [
  {
    target: 'controls-header',
    title: {
      en: 'Control Center',
      tl: 'Control Center'
    },
    description: {
      en: 'Here you can control all parts of your BantayBot device.',
      tl: 'Dito mo mako-kontrol ang lahat ng bahagi ng BantayBot mo.'
    },
    position: 'bottom',
    icon: '🎮'
  },
  {
    target: 'controls-last-command',
    title: {
      en: 'Last Command',
      tl: 'Huling Ginawa'
    },
    description: {
      en: 'Shows the last command you sent and when it was executed.',
      tl: 'Ipinapakita ang huling utos na ipinadala mo at kung kailan ito ginawa.'
    },
    position: 'bottom',
    icon: '✅'
  },
  {
    target: 'controls-movement',
    title: {
      en: 'Movement Controls',
      tl: 'Kontrol ng Galaw'
    },
    description: {
      en: 'Move the arms and head of your BantayBot to scare away birds.',
      tl: 'Igalaw ang braso at ulo ng BantayBot mo para takutin ang mga ibon.'
    },
    position: 'bottom',
    icon: '🦾'
  },
  {
    target: 'controls-head-position',
    title: {
      en: 'Head Position',
      tl: 'Posisyon ng Ulo'
    },
    description: {
      en: 'Choose where the head should face. Tap any position to rotate.',
      tl: 'Piliin kung saan haharap ang ulo. Pindutin ang kahit anong posisyon para umikot.'
    },
    position: 'top',
    icon: '🔄'
  },
  {
    target: 'controls-audio',
    title: {
      en: 'Audio Controls',
      tl: 'Kontrol ng Tunog'
    },
    description: {
      en: 'Control the alarm sounds. Adjust volume or play different sounds.',
      tl: 'Kontrolin ang mga tunog ng alarma. Ayusin ang lakas o patugtugin ang iba\'t ibang tunog.'
    },
    position: 'top',
    icon: '🔊'
  },
  {
    target: 'controls-emergency-stop',
    title: {
      en: 'Emergency Stop',
      tl: 'Emergency Stop'
    },
    description: {
      en: 'Use this button to immediately stop all BantayBot movements and sounds.',
      tl: 'Gamitin ang button na ito para agad na itigil ang lahat ng galaw at tunog ng BantayBot.'
    },
    position: 'top',
    icon: '🛑'
  }
];

export const settingsTourSteps = [
  {
    target: 'settings-header',
    title: {
      en: 'Settings',
      tl: 'Settings'
    },
    description: {
      en: 'Configure your BantayBot app and device settings here.',
      tl: 'Dito mo maa-ayos ang settings ng BantayBot app at device mo.'
    },
    position: 'bottom',
    icon: '⚙️'
  },
  {
    target: 'settings-connection',
    title: {
      en: 'Connection Settings',
      tl: 'Settings ng Koneksyon'
    },
    description: {
      en: 'Set up the IP addresses to connect to your BantayBot device.',
      tl: 'I-setup ang IP addresses para makakonekta sa BantayBot device mo.'
    },
    position: 'bottom',
    icon: '🔌'
  },
  {
    target: 'settings-auto-discovery',
    title: {
      en: 'Auto-Discovery',
      tl: 'Auto-Discovery'
    },
    description: {
      en: 'Tap "Scan" to automatically find BantayBot devices on your network.',
      tl: 'Pindutin ang "Hanapin" para awtomatikong hanapin ang mga BantayBot device sa network mo.'
    },
    position: 'bottom',
    icon: '🔍'
  },
  {
    target: 'settings-audio',
    title: {
      en: 'Audio Settings',
      tl: 'Settings ng Tunog'
    },
    description: {
      en: 'Adjust the speaker volume of your BantayBot device.',
      tl: 'Ayusin ang lakas ng tunog ng speaker ng BantayBot mo.'
    },
    position: 'top',
    icon: '🔈'
  },
  {
    target: 'settings-language',
    title: {
      en: 'Language',
      tl: 'Wika'
    },
    description: {
      en: 'Switch between English and Tagalog.',
      tl: 'Palitan kung English o Tagalog ang wika.'
    },
    position: 'top',
    icon: '🌐'
  },
  {
    target: 'settings-dark-mode',
    title: {
      en: 'Dark Mode',
      tl: 'Madilim na Kulay'
    },
    description: {
      en: 'Turn on dark mode for easier viewing at night.',
      tl: 'I-on ang madilim na kulay para mas madaling tingnan sa gabi.'
    },
    position: 'top',
    icon: '🌙'
  },
  {
    target: 'settings-save',
    title: {
      en: 'Save Settings',
      tl: 'I-save ang Settings'
    },
    description: {
      en: 'Don\'t forget to save your changes!',
      tl: 'Huwag kalimutang i-save ang mga pagbabago mo!'
    },
    position: 'top',
    icon: '💾'
  },
  {
    target: 'settings-reset-tour',
    title: {
      en: 'Reset Tour',
      tl: 'Ulitin ang Tour'
    },
    description: {
      en: 'Tap here if you want to see this guide again on all pages.',
      tl: 'Pindutin dito kung gusto mong makita ulit ang gabay na ito sa lahat ng pages.'
    },
    position: 'top',
    icon: '🔄'
  }
];

export const historyTourSteps = [
  {
    target: 'history-header',
    title: {
      en: 'History',
      tl: 'History'
    },
    description: {
      en: 'View all past sensor readings and bird detections.',
      tl: 'Tingnan ang lahat ng nakaraang sensor readings at mga nakitang ibon.'
    },
    position: 'bottom',
    icon: '📋'
  },
  {
    target: 'history-tabs',
    title: {
      en: 'Data Tabs',
      tl: 'Mga Tab ng Datos'
    },
    description: {
      en: 'Switch between Sensor data and Bird Detection records.',
      tl: 'Lumipat sa pagitan ng Sensor data at mga record ng Nakitang Ibon.'
    },
    position: 'bottom',
    icon: '📊'
  },
  {
    target: 'history-filters',
    title: {
      en: 'Filters',
      tl: 'Mga Filter'
    },
    description: {
      en: 'Filter records by date or status. Sort by newest or oldest.',
      tl: 'I-filter ang mga record ayon sa petsa o status. Ayusin ayon sa pinakabago o pinakaluma.'
    },
    position: 'bottom',
    icon: '🔽'
  },
  {
    target: 'history-list',
    title: {
      en: 'Record List',
      tl: 'Listahan ng mga Record'
    },
    description: {
      en: 'All your data is recorded here. Scroll to see more records.',
      tl: 'Lahat ng datos mo ay naka-record dito. Mag-scroll para makita ang iba pang records.'
    },
    position: 'top',
    icon: '📜'
  },
  {
    target: 'history-live-indicator',
    title: {
      en: 'Live Data',
      tl: 'Live na Datos'
    },
    description: {
      en: 'The green dot means data is updating in real-time.',
      tl: 'Ang berdeng tuldok ay ibig sabihin real-time na nag-uupdate ang datos.'
    },
    position: 'top',
    icon: '🟢'
  }
];

export const analyticsTourSteps = [
  {
    target: 'analytics-header',
    title: {
      en: 'Analytics Dashboard',
      tl: 'Analytics Dashboard'
    },
    description: {
      en: 'View AI-powered insights and predictions for your farm.',
      tl: 'Tingnan ang mga AI-powered insights at predictions para sa iyong bukid.'
    },
    position: 'bottom',
    icon: '📊'
  },
  {
    target: 'analytics-soil-health',
    title: {
      en: 'Soil Health Score',
      tl: 'Kalusugan ng Lupa'
    },
    description: {
      en: 'See your overall soil health score based on all sensor readings.',
      tl: 'Tingnan ang overall na kalagayan ng lupa mo batay sa lahat ng sensor readings.'
    },
    position: 'bottom',
    icon: '🌱'
  },
  {
    target: 'analytics-recommendations',
    title: {
      en: 'Smart Recommendations',
      tl: 'Mga Rekomendasyon'
    },
    description: {
      en: 'Get personalized advice based on your current soil conditions.',
      tl: 'Makakuha ng payo batay sa kasalukuyang kalagayan ng lupa mo.'
    },
    position: 'top',
    icon: '💡'
  }
];

// Helper function to get tour steps by page name
export const getTourSteps = (pageName) => {
  switch (pageName) {
    case 'dashboard':
      return dashboardTourSteps;
    case 'controls':
      return controlsTourSteps;
    case 'settings':
      return settingsTourSteps;
    case 'history':
      return historyTourSteps;
    case 'analytics':
      return analyticsTourSteps;
    default:
      return [];
  }
};
