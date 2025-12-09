import React, { useState } from 'react';
import { Droplets, Thermometer, Snowflake, Leaf, Zap, FlaskConical, BookOpen, HelpCircle, CheckCircle, Lightbulb, BookMarked, Info, X } from 'lucide-react';

// Icon mapping for recommendation types
const IconMap = {
  droplets: Droplets,
  thermometer: Thermometer,
  snowflake: Snowflake,
  leaf: Leaf,
  zap: Zap,
  flask: FlaskConical,
};

export default function SmartRecommendations({ sensorData, language }) {
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  // Generate recommendations based on sensor values
  const getRecommendations = () => {
    const recommendations = [];

    // Humidity recommendations
    if (sensorData.soilHumidity < 40) {
      recommendations.push({
        icon: 'droplets',
        iconColor: 'text-blue-500',
        action: language === 'tl' ? 'Magdilig' : 'Irrigate field',
        reason: language === 'tl' ? 'Tuyo ang lupa' : 'Soil is dry',
        priority: 'high',
        color: 'error'
      });
    } else if (sensorData.soilHumidity > 70) {
      recommendations.push({
        icon: 'droplets',
        iconColor: 'text-blue-500',
        action: language === 'tl' ? 'Magdrain ng tubig' : 'Drain excess water',
        reason: language === 'tl' ? 'Sobrang basa' : 'Too wet',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Temperature recommendations
    if (sensorData.soilTemperature > 30) {
      recommendations.push({
        icon: 'thermometer',
        iconColor: 'text-orange-500',
        action: language === 'tl' ? 'Takpan ng dayami' : 'Add mulch/shade',
        reason: language === 'tl' ? 'Mainit ang lupa' : 'Soil too hot',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilTemperature < 20) {
      recommendations.push({
        icon: 'snowflake',
        iconColor: 'text-sky-400',
        action: language === 'tl' ? 'Protektahan sa ginaw' : 'Protect from cold',
        reason: language === 'tl' ? 'Malamig ang lupa' : 'Soil too cold',
        priority: 'low',
        color: 'info'
      });
    }

    // Conductivity recommendations
    if (sensorData.soilConductivity < 200) {
      recommendations.push({
        icon: 'leaf',
        iconColor: 'text-green-500',
        action: language === 'tl' ? 'Magpataba' : 'Apply fertilizer',
        reason: language === 'tl' ? 'Kulang sa pataba' : 'Low nutrients',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilConductivity > 2000) {
      recommendations.push({
        icon: 'zap',
        iconColor: 'text-yellow-500',
        action: language === 'tl' ? 'Bawasan ang pataba' : 'Reduce fertilizer',
        reason: language === 'tl' ? 'Sobra sa pataba' : 'High salinity',
        priority: 'medium',
        color: 'warning'
      });
    }

    // pH recommendations
    if (sensorData.ph < 5.5) {
      recommendations.push({
        icon: 'flask',
        iconColor: 'text-purple-500',
        action: language === 'tl' ? 'Maglagay ng apog' : 'Add lime/calcium',
        reason: language === 'tl' ? 'Maasim ang lupa' : 'Too acidic',
        priority: 'high',
        color: 'error'
      });
    } else if (sensorData.ph > 7.5) {
      recommendations.push({
        icon: 'flask',
        iconColor: 'text-purple-500',
        action: language === 'tl' ? 'Maglagay ng asupre' : 'Apply sulfur',
        reason: language === 'tl' ? 'Matabang ang lupa' : 'Too alkaline',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  };

  // Detailed info for each recommendation type
  const getRecommendationDetails = (action) => {
    const details = {
      en: {
        'Irrigate field': {
          title: 'Irrigate Field',
          whatIsIt: 'Your soil lacks sufficient water. Plants cannot absorb nutrients properly when the soil is too dry.',
          whyNeeded: 'Without adequate water, plants will wilt, growth stops, and your harvest yield will significantly decrease.',
          howToDo: [
            'Water early morning (6-8 AM) or late afternoon (4-6 PM)',
            'Apply 2-3 liters of water per square meter',
            'Water at the base of plants, not on the leaves',
            'Water slowly to allow soil to absorb'
          ],
          tips: 'Check soil moisture by pressing your finger 2 inches deep. If it feels dry, watering is needed.',
          currentLabel: 'Current Humidity',
          optimalLabel: 'Optimal Range',
          optimal: '40-70%',
          reference: {
            study: 'Soil water deficit causes plant water stress affecting crop development and yield.',
            source: 'FAO Irrigation and Drainage Paper No. 56',
            author: 'Allen, R.G., Pereira, L.S., Raes, D., Smith, M.',
            year: '1998',
            url: 'https://www.fao.org/3/x0490e/x0490e00.htm'
          }
        },
        'Drain excess water': {
          title: 'Drain Excess Water',
          whatIsIt: 'Too much water in the soil. Plant roots cannot breathe and may start to rot.',
          whyNeeded: 'Waterlogged soil causes root rot, fungal diseases, and can kill your plants.',
          howToDo: [
            'Create small drainage channels between plant rows',
            'Reduce watering frequency immediately',
            'Add organic matter (compost) to improve drainage',
            'Consider raised beds for future planting'
          ],
          tips: 'Raised beds (6-12 inches high) help prevent waterlogging during rainy season.',
          currentLabel: 'Current Humidity',
          optimalLabel: 'Optimal Range',
          optimal: '40-70%',
          reference: {
            study: 'Flooding stress causes oxygen deficiency in roots, leading to 20-50% yield loss in most crops.',
            source: 'Annals of Botany, Vol. 96, Issue 4, Pages 501-505',
            author: 'Jackson, M.B., Colmer, T.D.',
            year: '2005',
            url: 'https://pubmed.ncbi.nlm.nih.gov/16217870/'
          }
        },
        'Add mulch/shade': {
          title: 'Add Mulch or Shade',
          whatIsIt: 'Your soil temperature is too high. Hot soil damages plant roots and reduces nutrient uptake.',
          whyNeeded: 'Heat stress reduces plant growth, causes flower drop, and lowers fruit quality.',
          howToDo: [
            'Apply 2-3 inch layer of rice straw or dried leaves around plants',
            'Use shade cloth (50% shade) during peak heat (10 AM - 3 PM)',
            'Water in early morning to cool the soil',
            'Avoid watering during midday heat'
          ],
          tips: 'Organic mulch like rice straw also adds nutrients to soil as it decomposes.',
          currentLabel: 'Current Temperature',
          optimalLabel: 'Optimal Range',
          optimal: '20-30°C',
          reference: {
            study: 'Mulching significantly reduces soil surface temperature variation and improves plant production.',
            source: 'Heliyon, Vol. 8, Issue 12, Article e12284',
            author: 'Mangani, T., Mangani, R., Chirima, G., Khomo, L., Truter, W.',
            year: '2022',
            url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9791825/'
          }
        },
        'Protect from cold': {
          title: 'Protect from Cold',
          whatIsIt: 'Soil temperature is too low. Cold soil slows down nutrient absorption and plant growth.',
          whyNeeded: 'Low temperatures slow plant metabolism, reduce growth, and can damage sensitive crops.',
          howToDo: [
            'Cover plants with plastic sheet or cloth at night',
            'Apply dark-colored mulch to absorb more heat',
            'Water during warmer parts of the day (10 AM - 2 PM)',
            'Group container plants together to share warmth'
          ],
          tips: 'Black plastic mulch can raise soil temperature by 5-10°F.',
          currentLabel: 'Current Temperature',
          optimalLabel: 'Optimal Range',
          optimal: '20-30°C',
          reference: {
            study: 'Root growth was lowest in the 9°C treatment. Low soil temperatures significantly reduce root growth and nutrient uptake.',
            source: 'Tree Physiology, Vol. 25, Issue 1, Pages 115-122',
            author: 'Lahti, M., Aphalo, P.J., Finér, L., Ryyppö, A., Lehto, T., Mannerkoski, H.',
            year: '2005',
            url: 'https://pubmed.ncbi.nlm.nih.gov/15519993/'
          }
        },
        'Apply fertilizer': {
          title: 'Apply Fertilizer',
          whatIsIt: 'Your soil lacks essential nutrients (nitrogen, phosphorus, potassium) needed for plant growth.',
          whyNeeded: 'Nutrient deficiency causes yellow leaves, stunted growth, and poor harvest.',
          howToDo: [
            'Use balanced NPK fertilizer (14-14-14)',
            'Apply 1 tablespoon per plant, 3-4 inches away from stem',
            'Water immediately after applying fertilizer',
            'Apply every 2-3 weeks during growing season'
          ],
          tips: 'Compost and animal manure are excellent natural alternatives to chemical fertilizers.',
          currentLabel: 'Current Nutrients',
          optimalLabel: 'Optimal Range',
          optimal: '200-2000 µS/cm',
          reference: {
            study: 'Nonsaline soils with low EC values have fewer available nutrients. Low EC indicates nutrient deficiency affecting plant growth.',
            source: 'USDA NRCS Soil Quality Technical Note',
            author: 'USDA Natural Resources Conservation Service',
            year: '2014',
            url: 'https://www.nrcs.usda.gov/sites/default/files/2022-10/Soil%20Electrical%20Conductivity.pdf'
          }
        },
        'Reduce fertilizer': {
          title: 'Reduce Fertilizer',
          whatIsIt: 'Too many salts and nutrients in the soil. This burns plant roots and blocks water absorption.',
          whyNeeded: 'Excess fertilizer causes leaf burn, wilting, and can kill plants.',
          howToDo: [
            'Flush soil with plenty of clean water (deep watering)',
            'Stop all fertilizer application for 2-3 weeks',
            'Add organic matter (compost) to help balance soil',
            'Test soil before resuming fertilization'
          ],
          tips: 'Always follow fertilizer package instructions. More is NOT better!',
          currentLabel: 'Current Nutrients',
          optimalLabel: 'Optimal Range',
          optimal: '200-2000 µS/cm',
          reference: {
            study: 'High soil salinity reduces water uptake and causes osmotic stress, reducing crop growth by 15-20%.',
            source: 'Annual Review of Plant Biology, Vol. 59, Pages 651-681',
            author: 'Munns, R., Tester, M.',
            year: '2008',
            url: 'https://pubmed.ncbi.nlm.nih.gov/18444910/'
          }
        },
        'Add lime/calcium': {
          title: 'Add Lime (Calcium)',
          whatIsIt: 'Your soil is too acidic (low pH). This locks up nutrients, making them unavailable to plants.',
          whyNeeded: 'Acidic soil prevents plants from absorbing nutrients even when they are present.',
          howToDo: [
            'Apply agricultural lime (apog) - 1 kg per 10 square meters',
            'Mix lime into the top 6 inches of soil',
            'Water thoroughly after application',
            'Wait 2-3 weeks before planting'
          ],
          tips: 'Apply lime 2-3 weeks before planting for best results. Wood ash is a natural alternative.',
          currentLabel: 'Current pH',
          optimalLabel: 'Optimal Range',
          optimal: '5.5-7.5',
          reference: {
            study: 'Aluminum toxicity is the primary factor limiting crop production on acidic soils. About 50% of arable lands are acidic.',
            source: 'Annual Review of Plant Biology, Vol. 55, Pages 459-493',
            author: 'Kochian, L.V., Hoekenga, O.A., Piñeros, M.A.',
            year: '2004',
            url: 'https://pubmed.ncbi.nlm.nih.gov/15377228/'
          }
        },
        'Apply sulfur': {
          title: 'Apply Sulfur',
          whatIsIt: 'Your soil is too alkaline (high pH). Iron and zinc become locked up and unavailable to plants.',
          whyNeeded: 'Alkaline soil causes iron deficiency - yellow leaves with green veins, poor growth.',
          howToDo: [
            'Apply agricultural sulfur - 0.5 kg per 10 square meters',
            'Work sulfur into the soil and water well',
            'Add organic matter like compost',
            'Use acidifying fertilizers (ammonium sulfate)'
          ],
          tips: 'Adding organic matter regularly helps maintain proper soil pH over time.',
          currentLabel: 'Current pH',
          optimalLabel: 'Optimal Range',
          optimal: '5.5-7.5',
          reference: {
            study: 'Iron chlorosis occurs in alkaline/calcareous soils (pH > 7.5) due to reduced iron solubility.',
            source: 'Plant and Soil, Vol. 165, Pages 261-274',
            author: 'Marschner, H., Römheld, V.',
            year: '1994',
            url: 'https://link.springer.com/article/10.1007/BF00008069'
          }
        }
      },
      tl: {
        'Magdilig': {
          title: 'Magdilig',
          whatIsIt: 'Kulang sa tubig ang lupa. Hindi makakuha ng sustansya ang halaman kapag tuyo ang lupa.',
          whyNeeded: 'Kapag kulang sa tubig, malalanta ang halaman, titigil ang paglaki, at bababa ang ani.',
          howToDo: [
            'Diligan ng maaga (6-8 AM) o hapon (4-6 PM)',
            'Maglagay ng 2-3 litro ng tubig kada metro kwadrado',
            'Diligan sa ugat, hindi sa dahon',
            'Dahan-dahang diligan para masipsip ng lupa'
          ],
          tips: 'Suriin ang lupa - itusok ang daliri 2 pulgada. Kung tuyo, kailangan nang diligan.',
          currentLabel: 'Basa ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '40-70%',
          reference: {
            study: 'Ang kakulangan ng tubig sa lupa ay nagdudulot ng stress sa halaman na nakakaapekto sa paglaki at ani.',
            source: 'FAO Irrigation and Drainage Paper No. 56',
            author: 'Allen, R.G., Pereira, L.S., Raes, D., Smith, M.',
            year: '1998',
            url: 'https://www.fao.org/3/x0490e/x0490e00.htm'
          }
        },
        'Magdrain ng tubig': {
          title: 'Magdrain ng Tubig',
          whatIsIt: 'Sobrang tubig sa lupa. Hindi makahinga ang ugat at maaaring mabulok.',
          whyNeeded: 'Ang sobrang tubig ay nagdudulot ng bulok sa ugat at sakit ng halaman.',
          howToDo: [
            'Gumawa ng kanal sa pagitan ng mga hanay',
            'Bawasan ang pagdidilig',
            'Magdagdag ng compost para bumuti ang drainage',
            'Gumamit ng raised beds sa susunod na pagtatanim'
          ],
          tips: 'Ang raised beds (6-12 pulgada ang taas) ay nakakatulong sa panahon ng ulan.',
          currentLabel: 'Basa ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '40-70%',
          reference: {
            study: 'Ang flooding stress ay nagdudulot ng kakulangan ng oxygen sa ugat, na nagdudulot ng 20-50% pagkawala ng ani.',
            source: 'Annals of Botany, Vol. 96, Issue 4, Pages 501-505',
            author: 'Jackson, M.B., Colmer, T.D.',
            year: '2005',
            url: 'https://pubmed.ncbi.nlm.nih.gov/16217870/'
          }
        },
        'Takpan ng dayami': {
          title: 'Takpan ng Dayami',
          whatIsIt: 'Sobrang init ang lupa. Nasasira ang ugat at hindi nakakakuha ng sustansya.',
          whyNeeded: 'Ang sobrang init ay nagpapabagal ng paglaki at nagpapababa ng kalidad ng bunga.',
          howToDo: [
            'Maglagay ng 2-3 pulgada na dayami o tuyong dahon sa paligid ng halaman',
            'Gumamit ng shade cloth (50%) sa tanghali (10 AM - 3 PM)',
            'Diligan ng maaga para lumamig ang lupa',
            'Iwasan ang pagdidilig sa tanghali'
          ],
          tips: 'Ang dayami ay nagdadagdag din ng sustansya sa lupa habang nabubulok.',
          currentLabel: 'Init ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '20-30°C',
          reference: {
            study: 'Ang mulching ay lubos na nagpapababa ng pagbabago ng temperatura ng lupa at nagpapabuti ng produksyon ng halaman.',
            source: 'Heliyon, Vol. 8, Issue 12, Article e12284',
            author: 'Mangani, T., Mangani, R., Chirima, G., Khomo, L., Truter, W.',
            year: '2022',
            url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9791825/'
          }
        },
        'Protektahan sa ginaw': {
          title: 'Protektahan sa Ginaw',
          whatIsIt: 'Malamig ang lupa. Mabagal ang pagsipsip ng sustansya at paglaki ng halaman.',
          whyNeeded: 'Ang lamig ay nagpapabagal ng paglaki at maaaring makapinsala sa mga halaman.',
          howToDo: [
            'Takpan ang halaman ng plastic o tela sa gabi',
            'Gumamit ng maitim na pantakip para sumipsip ng init',
            'Diligan sa mainit na oras (10 AM - 2 PM)',
            'Pagsama-samahin ang mga paso para magbigayan ng init'
          ],
          tips: 'Ang itim na plastic mulch ay nakakapag-init ng lupa ng 5-10°F.',
          currentLabel: 'Init ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '20-30°C',
          reference: {
            study: 'Ang paglaki ng ugat ay pinakamababa sa 9°C treatment. Ang mababang temperatura ng lupa ay lubos na nagpapababa ng paglaki ng ugat at pagsipsip ng sustansya.',
            source: 'Tree Physiology, Vol. 25, Issue 1, Pages 115-122',
            author: 'Lahti, M., Aphalo, P.J., Finér, L., Ryyppö, A., Lehto, T., Mannerkoski, H.',
            year: '2005',
            url: 'https://pubmed.ncbi.nlm.nih.gov/15519993/'
          }
        },
        'Magpataba': {
          title: 'Magpataba',
          whatIsIt: 'Kulang sa sustansya (nitrogen, phosphorus, potassium) ang lupa para sa paglaki ng halaman.',
          whyNeeded: 'Ang kakulangan sa sustansya ay nagdudulot ng dilaw na dahon, maliit na halaman, at mababang ani.',
          howToDo: [
            'Gumamit ng balanced NPK fertilizer (14-14-14)',
            'Maglagay ng 1 kutsara kada halaman, 3-4 pulgada mula sa tangkay',
            'Diligan kaagad pagkatapos magpataba',
            'Magpataba kada 2-3 linggo habang lumalaki'
          ],
          tips: 'Ang compost at dumi ng hayop ay magandang natural na pataba.',
          currentLabel: 'Sustansya Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '200-2000 µS/cm',
          reference: {
            study: 'Ang mga lupa na may mababang EC ay may mas kaunting sustansya. Ang mababang EC ay nagpapahiwatig ng kakulangan sa sustansya na nakakaapekto sa paglaki ng halaman.',
            source: 'USDA NRCS Soil Quality Technical Note',
            author: 'USDA Natural Resources Conservation Service',
            year: '2014',
            url: 'https://www.nrcs.usda.gov/sites/default/files/2022-10/Soil%20Electrical%20Conductivity.pdf'
          }
        },
        'Bawasan ang pataba': {
          title: 'Bawasan ang Pataba',
          whatIsIt: 'Sobrang asin at sustansya sa lupa. Nasusunog ang ugat at hindi nakakasipsip ng tubig.',
          whyNeeded: 'Ang sobrang pataba ay nakakapinsala sa dahon at maaaring makamatay ng halaman.',
          howToDo: [
            'Hugasan ang lupa ng maraming tubig (deep watering)',
            'Itigil ang pagpapataba ng 2-3 linggo',
            'Magdagdag ng compost para mabalanse ang lupa',
            'Suriin ang lupa bago magpataba ulit'
          ],
          tips: 'Sundin ang tagubilin sa pakete ng pataba. Ang sobra ay hindi mabuti!',
          currentLabel: 'Sustansya Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '200-2000 µS/cm',
          reference: {
            study: 'Ang mataas na salinity ng lupa ay nagpapababa ng pagsipsip ng tubig at nagdudulot ng osmotic stress, na nagpapababa ng paglaki ng pananim ng 15-20%.',
            source: 'Annual Review of Plant Biology, Vol. 59, Pages 651-681',
            author: 'Munns, R., Tester, M.',
            year: '2008',
            url: 'https://pubmed.ncbi.nlm.nih.gov/18444910/'
          }
        },
        'Maglagay ng apog': {
          title: 'Maglagay ng Apog',
          whatIsIt: 'Masyadong maasim ang lupa (mababang pH). Naka-lock ang mga sustansya at hindi makuha ng halaman.',
          whyNeeded: 'Ang maasim na lupa ay pumipigil sa halaman na kumuha ng sustansya kahit mayroon.',
          howToDo: [
            'Maglagay ng apog - 1 kilo kada 10 metro kwadrado',
            'Haluin sa ibabaw na 6 pulgada ng lupa',
            'Diligan ng mabuti pagkatapos',
            'Maghintay ng 2-3 linggo bago magtanim'
          ],
          tips: 'Maglagay ng apog 2-3 linggo bago magtanim. Ang abo ng kahoy ay natural na alternatibo.',
          currentLabel: 'pH ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '5.5-7.5',
          reference: {
            study: 'Ang aluminum toxicity ang pangunahing salik na naglilimita sa produksyon ng pananim sa mga maasim na lupa. Mga 50% ng mga lupang matatamnan ay maasim.',
            source: 'Annual Review of Plant Biology, Vol. 55, Pages 459-493',
            author: 'Kochian, L.V., Hoekenga, O.A., Piñeros, M.A.',
            year: '2004',
            url: 'https://pubmed.ncbi.nlm.nih.gov/15377228/'
          }
        },
        'Maglagay ng asupre': {
          title: 'Maglagay ng Asupre',
          whatIsIt: 'Masyadong matabang ang lupa (mataas na pH). Naka-lock ang iron at zinc.',
          whyNeeded: 'Ang matabang na lupa ay nagdudulot ng dilaw na dahon na may berdeng ugat, mahinang paglaki.',
          howToDo: [
            'Maglagay ng asupre - 0.5 kilo kada 10 metro kwadrado',
            'Haluin sa lupa at diligan ng mabuti',
            'Magdagdag ng organic matter tulad ng compost',
            'Gumamit ng acidifying fertilizers (ammonium sulfate)'
          ],
          tips: 'Ang regular na pagdadagdag ng organic matter ay tumutulong sa tamang pH ng lupa.',
          currentLabel: 'pH ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '5.5-7.5',
          reference: {
            study: 'Ang iron chlorosis ay nangyayari sa alkaline/calcareous na lupa (pH > 7.5) dahil sa mababang solubility ng iron.',
            source: 'Plant and Soil, Vol. 165, Pages 261-274',
            author: 'Marschner, H., Römheld, V.',
            year: '1994',
            url: 'https://link.springer.com/article/10.1007/BF00008069'
          }
        }
      }
    };

    const langDetails = details[language] || details.en;
    return langDetails[action] || null;
  };

  // Info Modal Component
  const RecommendationInfoModal = ({ recommendation, onClose }) => {
    if (!recommendation) return null;

    const details = getRecommendationDetails(recommendation.action);
    if (!details) return null;

    // Get current sensor value based on recommendation type
    const getCurrentValue = () => {
      if (recommendation.action.includes('Irrigate') || recommendation.action.includes('Magdilig') ||
          recommendation.action.includes('Drain') || recommendation.action.includes('Magdrain')) {
        return `${sensorData.soilHumidity}%`;
      }
      if (recommendation.action.includes('mulch') || recommendation.action.includes('dayami') ||
          recommendation.action.includes('cold') || recommendation.action.includes('ginaw') ||
          recommendation.action.includes('Protect') || recommendation.action.includes('shade') ||
          recommendation.action.includes('Takpan') || recommendation.action.includes('Protektahan')) {
        return `${sensorData.soilTemperature}°C`;
      }
      if (recommendation.action.includes('fertilizer') || recommendation.action.includes('pataba') ||
          recommendation.action.includes('Magpataba')) {
        return `${sensorData.soilConductivity} µS/cm`;
      }
      if (recommendation.action.includes('apog') || recommendation.action.includes('asupre') ||
          recommendation.action.includes('sulfur') || recommendation.action.includes('Sulfur') ||
          recommendation.action.includes('lime')) {
        return sensorData.ph.toFixed(1);
      }
      return '';
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-md max-h-[70vh] sm:max-h-[75vh] overflow-y-auto surface-primary rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={`sticky top-0 z-10 p-4 rounded-t-2xl flex items-center justify-between border-b border-primary/20 ${
            recommendation.priority === 'high'
              ? 'bg-[#fef2f2] dark:bg-[#2d1f1f]'
              : recommendation.priority === 'medium'
                ? 'bg-[#fffbeb] dark:bg-[#2d2a1f]'
                : 'bg-[#eff6ff] dark:bg-[#1f2937]'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                recommendation.priority === 'high' ? 'bg-error/30' : recommendation.priority === 'medium' ? 'bg-warning/30' : 'bg-info/30'
              }`}>
                {(() => {
                  const IconComponent = IconMap[recommendation.icon];
                  return IconComponent ? <IconComponent size={24} className={recommendation.iconColor} /> : null;
                })()}
              </div>
              <div>
                <h2 className={`font-bold text-lg ${
                  recommendation.priority === 'high' ? 'text-error' : recommendation.priority === 'medium' ? 'text-warning' : 'text-info'
                }`}>{details.title}</h2>
                <span className={`text-xs font-semibold uppercase ${
                  recommendation.priority === 'high' ? 'text-error/70' : recommendation.priority === 'medium' ? 'text-warning/70' : 'text-info/70'
                }`}>
                  {recommendation.priority === 'high' ? (language === 'tl' ? 'Importante' : 'High Priority')
                    : recommendation.priority === 'medium' ? (language === 'tl' ? 'Katamtaman' : 'Medium Priority')
                    : (language === 'tl' ? 'Hindi Gaanong Importante' : 'Low Priority')}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-secondary hover:text-primary transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Current Value Display */}
          <div className="mx-4 mt-4 p-3 rounded-xl bg-tertiary border border-primary">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-secondary">{details.currentLabel}</div>
                <div className={`text-xl font-bold ${
                  recommendation.priority === 'high' ? 'text-error' : recommendation.priority === 'medium' ? 'text-warning' : 'text-info'
                }`}>{getCurrentValue()}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-secondary">{details.optimalLabel}</div>
                <div className="text-lg font-semibold text-success">{details.optimal}</div>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-4 space-y-4">
            {/* What Is It */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-brand" />
                <h3 className="font-bold text-sm text-primary">{language === 'tl' ? 'Ano Ito?' : 'What Is This?'}</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed pl-7">{details.whatIsIt}</p>
            </div>

            {/* Why Needed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle size={18} className="text-warning" />
                <h3 className="font-bold text-sm text-primary">{language === 'tl' ? 'Bakit Kailangan?' : 'Why Is It Needed?'}</h3>
              </div>
              <p className="text-sm text-secondary leading-relaxed pl-7">{details.whyNeeded}</p>
            </div>

            {/* How To Do */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-success" />
                <h3 className="font-bold text-sm text-primary">{language === 'tl' ? 'Ano ang Gagawin?' : 'What To Do?'}</h3>
              </div>
              <div className="pl-7 space-y-2">
                {details.howToDo.map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-brand">{index + 1}</span>
                    </div>
                    <p className="text-sm text-secondary leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="p-3 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-start gap-2">
                <Lightbulb size={18} className="text-success flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-success mb-1">{language === 'tl' ? 'Tip' : 'Tip'}</h3>
                  <p className="text-sm text-success/80 leading-relaxed">{details.tips}</p>
                </div>
              </div>
            </div>

            {/* Scientific Reference */}
            {details.reference && (
              <div className="p-3 rounded-xl bg-info/10 border border-info/20">
                <div className="flex items-start gap-2">
                  <BookMarked size={18} className="text-info flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-info mb-1">{language === 'tl' ? 'Batay sa Pag-aaral' : 'Scientific Reference'}</h3>
                    <p className="text-sm text-info/80 leading-relaxed mb-2">"{details.reference.study}"</p>
                    <p className="text-xs text-secondary">
                      <span className="font-medium">{details.reference.source}</span>
                      <br />
                      <span className="italic">{details.reference.author} ({details.reference.year})</span>
                    </p>
                    {details.reference.url && (
                      <a
                        href={details.reference.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-brand underline hover:text-brand/80 mt-2"
                      >
                        {language === 'tl' ? 'Tingnan ang Pag-aaral' : 'View Study'} →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Button */}
          <div className="p-4 border-t border-primary">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand/90 transition-colors"
            >
              {language === 'tl' ? 'Naintindihan Ko' : 'Got It'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const recommendations = getRecommendations();

  return (
    <>
      <div className="surface-primary rounded-2xl p-4 sm:p-5 shadow-lg border border-primary">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-primary">{language === 'tl' ? 'Mga Rekomendasyon' : 'Recommendations'}</h3>
          <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold ${
            recommendations.length === 0
              ? 'bg-success/20 text-success'
              : recommendations[0]?.priority === 'high'
                ? 'bg-error/20 text-error'
                : 'bg-warning/20 text-warning'
          }`}>
            {recommendations.length === 0
              ? (language === 'tl' ? 'Lahat OK' : 'All Good')
              : `${recommendations.length} ${language === 'tl' ? 'aksyon' : 'action'}${recommendations.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={28} className="text-success" />
            </div>
            <p className="text-sm sm:text-base font-semibold text-success mb-1">
              {language === 'tl' ? 'Lahat ng kondisyon ay optimal!' : 'All conditions are optimal!'}
            </p>
            <p className="text-[10px] sm:text-xs text-secondary">
              {language === 'tl' ? 'Walang aksyon na kailangan' : 'No action needed at this time'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border-l-4 ${
                  rec.priority === 'high'
                    ? 'bg-error/5 border-error'
                    : rec.priority === 'medium'
                      ? 'bg-warning/5 border-warning'
                      : 'bg-info/5 border-info'
                }`}
              >
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  rec.priority === 'high'
                    ? 'bg-error/20'
                    : rec.priority === 'medium'
                      ? 'bg-warning/20'
                      : 'bg-info/20'
                }`}>
                  {(() => {
                    const IconComponent = IconMap[rec.icon];
                    return IconComponent ? <IconComponent size={20} className={rec.iconColor} /> : null;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs sm:text-sm font-semibold ${
                    rec.priority === 'high' ? 'text-error' : rec.priority === 'medium' ? 'text-warning' : 'text-info'
                  }`}>
                    {rec.action}
                  </p>
                  <p className="text-[10px] sm:text-xs text-secondary truncate">{rec.reason}</p>
                </div>
                <button
                  onClick={() => setSelectedRecommendation(rec)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 ${
                    rec.priority === 'high' ? 'bg-error/20 hover:bg-error/30'
                      : rec.priority === 'medium' ? 'bg-warning/20 hover:bg-warning/30' : 'bg-info/20 hover:bg-info/30'
                  }`}
                  title={language === 'tl' ? 'Karagdagang impormasyon' : 'More info'}
                >
                  <Info size={16} className={rec.priority === 'high' ? 'text-error' : rec.priority === 'medium' ? 'text-warning' : 'text-info'} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom info */}
        <div className="pt-3 mt-3 border-t border-primary">
          <p className="text-[10px] sm:text-xs text-secondary leading-relaxed">
            {language === 'tl'
              ? 'Batay sa real-time na datos ng sensor ng lupa.'
              : 'Based on real-time soil sensor data.'}
          </p>
        </div>
      </div>

      {/* Recommendation Info Modal */}
      {selectedRecommendation && (
        <RecommendationInfoModal
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}
    </>
  );
}
