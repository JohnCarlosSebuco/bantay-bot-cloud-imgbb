// Notification configuration for BantayBot push notifications

export const NOTIFICATION_TYPES = {
  SOIL_MOISTURE: 'soil_moisture',
  SOIL_TEMPERATURE: 'soil_temperature',
  SOIL_PH: 'soil_ph',
  SOIL_CONDUCTIVITY: 'soil_conductivity',
  HEALTH_SCORE: 'health_score',
  WATER_STRESS: 'water_stress',
  BIRD_DETECTION: 'bird_detection',
};

export const NOTIFICATION_THRESHOLDS = {
  soil_moisture: {
    warning: { below: 40 },
    critical: { below: 20 },
  },
  soil_temperature: {
    warning: { below: 20, above: 30 },
    critical: { below: 10, above: 35 },
  },
  soil_ph: {
    warning: { below: 5.5, above: 7.5 },
    critical: { below: 4.0, above: 8.5 },
  },
  soil_conductivity: {
    warning: { below: 200 },
    critical: { below: 100 },
  },
  health_score: {
    warning: { below: 60 },
    critical: { below: 40 },
  },
  water_stress: {
    warning: { daysWithoutRain: 7 },
    critical: { daysWithoutRain: 14 },
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  enabled: true,
  soil_moisture: { enabled: true, warning: true, critical: true },
  soil_temperature: { enabled: true, warning: true, critical: true },
  soil_ph: { enabled: true, warning: true, critical: true },
  soil_conductivity: { enabled: true, warning: true, critical: true },
  health_score: { enabled: true, warning: true, critical: true },
  water_stress: { enabled: true, warning: true, critical: true },
  bird_detection: { enabled: true },
  throttle: {
    minIntervalMinutes: 30,
    quietHoursStart: 22,
    quietHoursEnd: 6,
    respectQuietHours: false,
  },
};

export const NOTIFICATION_MESSAGES = {
  en: {
    soil_moisture: {
      warning: {
        title: 'Soil Moisture Warning',
        body: 'Soil moisture is low ({value}%). Consider checking irrigation.',
      },
      critical: {
        title: 'Critical: Soil Too Dry!',
        body: 'Soil moisture critically low ({value}%). Crops may be stressed!',
      },
    },
    soil_temperature: {
      warning_high: {
        title: 'Soil Temperature Warning',
        body: 'Soil is getting hot ({value}°C). Monitor crop stress.',
      },
      warning_low: {
        title: 'Soil Temperature Warning',
        body: 'Soil is cold ({value}°C). Growth may slow.',
      },
      critical_high: {
        title: 'Critical: Soil Too Hot!',
        body: 'Soil temperature critical ({value}°C)! Crops at risk.',
      },
      critical_low: {
        title: 'Critical: Soil Too Cold!',
        body: 'Soil temperature critical ({value}°C)! Frost damage possible.',
      },
    },
    soil_ph: {
      warning_acidic: {
        title: 'Soil pH Warning',
        body: 'Soil is acidic (pH {value}). May affect nutrient uptake.',
      },
      warning_alkaline: {
        title: 'Soil pH Warning',
        body: 'Soil is alkaline (pH {value}). May affect nutrient uptake.',
      },
      critical_acidic: {
        title: 'Critical: Soil Too Acidic!',
        body: 'pH extremely low ({value})! Add lime to soil.',
      },
      critical_alkaline: {
        title: 'Critical: Soil Too Alkaline!',
        body: 'pH extremely high ({value})! Add sulfur to soil.',
      },
    },
    soil_conductivity: {
      warning: {
        title: 'Low Nutrient Warning',
        body: 'Soil nutrients low ({value} µS/cm). Consider fertilizing.',
      },
      critical: {
        title: 'Critical: Nutrient Deficiency!',
        body: 'Severe nutrient deficiency ({value} µS/cm)! Fertilize immediately.',
      },
    },
    health_score: {
      warning: {
        title: 'Crop Health Warning',
        body: 'Overall health score dropped to {value}%. Check conditions.',
      },
      critical: {
        title: 'Critical: Poor Crop Health!',
        body: 'Health score critical ({value}%)! Immediate action needed.',
      },
    },
    water_stress: {
      warning: {
        title: 'Drought Warning',
        body: 'No rain for {value} days. Monitor soil moisture closely.',
      },
      critical: {
        title: 'Critical: Extended Drought!',
        body: '{value} days without rain! Crops may suffer.',
      },
    },
    bird_detection: {
      alert: {
        title: 'Bird Detected!',
        body: 'Bird activity detected in your field. Deterrent activated.',
      },
    },
  },
  tl: {
    soil_moisture: {
      warning: {
        title: 'Babala: Basa ng Lupa',
        body: 'Mababa ang basa ng lupa ({value}%). Tingnan ang patubig.',
      },
      critical: {
        title: 'Kritikal: Tuyo ang Lupa!',
        body: 'Sobrang tuyo ang lupa ({value}%). Baka stressed ang pananim!',
      },
    },
    soil_temperature: {
      warning_high: {
        title: 'Babala: Init ng Lupa',
        body: 'Mainit ang lupa ({value}°C). Bantayan ang pananim.',
      },
      warning_low: {
        title: 'Babala: Lamig ng Lupa',
        body: 'Malamig ang lupa ({value}°C). Mabagal ang paglaki.',
      },
      critical_high: {
        title: 'Kritikal: Sobrang Init!',
        body: 'Sobrang init ng lupa ({value}°C)! May panganib ang pananim.',
      },
      critical_low: {
        title: 'Kritikal: Sobrang Lamig!',
        body: 'Sobrang lamig ng lupa ({value}°C)! Posibleng may damage.',
      },
    },
    soil_ph: {
      warning_acidic: {
        title: 'Babala: pH ng Lupa',
        body: 'Maasim ang lupa (pH {value}). Apektado ang sustansya.',
      },
      warning_alkaline: {
        title: 'Babala: pH ng Lupa',
        body: 'Matabang ang lupa (pH {value}). Apektado ang sustansya.',
      },
      critical_acidic: {
        title: 'Kritikal: Sobrang Asim!',
        body: 'Sobrang mababa ang pH ({value})! Dagdagan ng apog.',
      },
      critical_alkaline: {
        title: 'Kritikal: Sobrang Tabang!',
        body: 'Sobrang taas ng pH ({value})! Dagdagan ng sulfur.',
      },
    },
    soil_conductivity: {
      warning: {
        title: 'Babala: Kulang sa Sustansya',
        body: 'Mababa ang sustansya ({value} µS/cm). Magpataba.',
      },
      critical: {
        title: 'Kritikal: Walang Sustansya!',
        body: 'Sobrang kulang sa sustansya ({value} µS/cm)! Magpataba agad.',
      },
    },
    health_score: {
      warning: {
        title: 'Babala: Kalusugan ng Pananim',
        body: 'Bumaba ang health score sa {value}%. Tingnan ang kondisyon.',
      },
      critical: {
        title: 'Kritikal: Mahina ang Pananim!',
        body: 'Health score {value}%! Kailangan ng aksyon agad.',
      },
    },
    water_stress: {
      warning: {
        title: 'Babala: Tagtuyot',
        body: '{value} araw nang walang ulan. Bantayan ang lupa.',
      },
      critical: {
        title: 'Kritikal: Matinding Tagtuyot!',
        body: '{value} araw walang ulan! Baka maapektuhan ang pananim.',
      },
    },
    bird_detection: {
      alert: {
        title: 'May Ibon!',
        body: 'May nakitang ibon sa bukid. Nag-activate ang panakot.',
      },
    },
  },
};

// URL mappings for notification click navigation
export const NOTIFICATION_URLS = {
  soil_moisture: '/',
  soil_temperature: '/',
  soil_ph: '/',
  soil_conductivity: '/',
  health_score: '/crop-health-monitor',
  water_stress: '/rainfall-tracker',
  bird_detection: '/history',
};
