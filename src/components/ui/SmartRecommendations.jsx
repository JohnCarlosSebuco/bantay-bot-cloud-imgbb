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

  // Generate recommendations based on sensor values (Rice-specific for Lopez, Quezon)
  const getRecommendations = () => {
    const recommendations = [];

    // Humidity recommendations (Rice needs flooded paddies: 60-90% is normal)
    if (sensorData.soilHumidity < 60) {
      recommendations.push({
        icon: 'droplets',
        iconColor: 'text-blue-500',
        action: language === 'tl' ? 'Padaluyin ang Tubig' : 'Irrigate paddy',
        reason: language === 'tl' ? 'Kulang ang tubig sa palayan' : 'Paddy needs water',
        priority: 'high',
        color: 'error'
      });
    } else if (sensorData.soilHumidity > 95) {
      recommendations.push({
        icon: 'droplets',
        iconColor: 'text-blue-500',
        action: language === 'tl' ? 'Pagsasapaw' : 'Mid-season drainage',
        reason: language === 'tl' ? 'Patuyuin ng 1 linggo' : 'Drain for 1 week',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Temperature recommendations (Rice: water regulates temperature, not mulch)
    if (sensorData.soilTemperature > 35) {
      recommendations.push({
        icon: 'thermometer',
        iconColor: 'text-orange-500',
        action: language === 'tl' ? 'Dagdagan ang Tubig' : 'Increase water depth',
        reason: language === 'tl' ? 'Mainit ang lupa - tubig ang pampalamig' : 'Soil too hot - water cools it',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilTemperature < 18) {
      recommendations.push({
        icon: 'snowflake',
        iconColor: 'text-sky-400',
        action: language === 'tl' ? 'Palalimin ang Tubig' : 'Deepen water level',
        reason: language === 'tl' ? 'Malamig - tubig ang kumot ng lupa' : 'Cold - water insulates soil',
        priority: 'medium',
        color: 'warning'
      });
    }

    // Conductivity recommendations (Rice: fertilizer per hectare, not per plant)
    if (sensorData.soilConductivity < 300) {
      recommendations.push({
        icon: 'leaf',
        iconColor: 'text-green-500',
        action: language === 'tl' ? 'Magpataba' : 'Apply fertilizer',
        reason: language === 'tl' ? 'Kulang sa sustansya' : 'Low nutrients',
        priority: 'medium',
        color: 'warning'
      });
    } else if (sensorData.soilConductivity > 1500) {
      recommendations.push({
        icon: 'zap',
        iconColor: 'text-yellow-500',
        action: language === 'tl' ? 'Huwag Muna Magpataba' : 'Skip fertilizer application',
        reason: language === 'tl' ? 'Sobra na ang sustansya' : 'Excess nutrients',
        priority: 'medium',
        color: 'warning'
      });
    }

    // pH recommendations (Rice: use abo ng dayami, not commercial lime)
    if (sensorData.ph < 5.5) {
      recommendations.push({
        icon: 'flask',
        iconColor: 'text-purple-500',
        action: language === 'tl' ? 'Maglagay ng Abo ng Dayami' : 'Apply rice straw ash',
        reason: language === 'tl' ? 'Maasim ang lupa' : 'Too acidic',
        priority: 'high',
        color: 'error'
      });
    }
    // Removed alkaline soil (>7.5) recommendation - rare in Quezon and impractical for farmers

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
  };

  // Detailed info for each recommendation type
  const getRecommendationDetails = (action) => {
    const details = {
      en: {
        'Irrigate paddy': {
          title: 'Irrigate Rice Paddy',
          whatIsIt: 'Your rice paddy (palayan) needs more water. Rice grows best in flooded conditions with 3-5 cm standing water.',
          whyNeeded: 'Without adequate water, rice cannot absorb nutrients, tillering stops, and yield will significantly decrease.',
          howToDo: [
            'Open the irrigation canal to let water flow into the paddy',
            'Maintain 3-5 cm water depth (ankle-deep/bukung-bukong)',
            'Check water level at 3-4 spots across your field',
            'During flowering stage, increase to 5-7 cm (knee-deep/tuhod)'
          ],
          tips: 'For large fields (2+ hectares): Check water at the edges, middle, and far end to ensure even distribution.',
          currentLabel: 'Current Moisture',
          optimalLabel: 'Optimal Range',
          optimal: '60-90%',
          reference: {
            study: 'Water management significantly affects rice yield. Maintaining 3-5 cm water depth during vegetative stage is optimal for rice production.',
            source: 'IRRI Rice Knowledge Bank - Water Management',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/step-by-step-production/growth/water-management'
          }
        },
        'Mid-season drainage': {
          title: 'Mid-Season Drainage (Pagsasapaw)',
          whatIsIt: 'Your rice paddy is oversaturated. Draining for 5-7 days strengthens rice roots and prevents lodging (falling over).',
          whyNeeded: 'Mid-season drainage reduces weak stems, prevents rice from falling during storms, and can increase yield by 10-15%.',
          howToDo: [
            'Open drainage canal to let water out of the paddy',
            'Allow field to dry for 5-7 days until cracks appear on soil surface',
            'Best timing: 45 days after transplanting (before panicle initiation)',
            'Refill with water after drainage period'
          ],
          tips: 'Pagsasapaw also reduces methane emissions by 30-50% - good for the environment!',
          currentLabel: 'Current Moisture',
          optimalLabel: 'Optimal Range',
          optimal: '60-90%',
          reference: {
            study: 'Mid-season drainage (AWD) strengthens rice roots, reduces lodging by 20-30%, and decreases methane emissions by 30-50%.',
            source: 'Alternate Wetting and Drying (AWD) Technology for Rice Production',
            author: 'PhilRice (Philippine Rice Research Institute)',
            year: '2022',
            url: 'https://www.philrice.gov.ph/wp-content/uploads/2022/10/RS4DM-Alternate-Wetting-Drying-Technology-Vol.-11.pdf'
          }
        },
        'Increase water depth': {
          title: 'Increase Water Depth',
          whatIsIt: 'Your rice paddy soil is too hot. Deep water (10-15 cm) acts as a natural coolant for rice plants.',
          whyNeeded: 'Extreme heat damages rice during flowering, causing empty grains (ipa) and reduced yield.',
          howToDo: [
            'Increase water depth to 10-15 cm during extreme heat',
            'Open irrigation canal to let more water in',
            'Maintain deeper water during midday (10 AM - 3 PM)',
            'Can reduce back to 5 cm after heat wave passes'
          ],
          tips: 'Water acts as a thermal buffer - it absorbs heat during the day and releases it slowly at night.',
          currentLabel: 'Current Temperature',
          optimalLabel: 'Optimal Range',
          optimal: '20-35°C',
          reference: {
            study: 'Standing water acts as thermal buffer, reducing soil temperature by 5-8°C during extreme heat events.',
            source: 'Climate-Smart Agriculture Sourcebook - Crop Production',
            author: 'FAO (Food and Agriculture Organization)',
            year: '2020',
            url: 'https://www.fao.org/climate-smart-agriculture-sourcebook/production-resources/module-b1-crops/chapter-b1-3/en/'
          }
        },
        'Deepen water level': {
          title: 'Deepen Water for Cold Protection',
          whatIsIt: 'Your rice paddy soil is too cold. Deep water (10-15 cm) insulates the soil and protects rice from cold damage.',
          whyNeeded: 'Cold temperatures slow rice growth, cause yellowing, and can delay harvest by 2-3 weeks.',
          howToDo: [
            'Increase water depth to 10-15 cm immediately',
            'Maintain deep water especially at night when temperatures drop',
            'Keep water flowing slowly (fresh water brings warmth)',
            'Reduce depth back to normal when cold spell ends'
          ],
          tips: 'Water acts like a blanket - it holds heat and protects rice roots from cold air temperatures.',
          currentLabel: 'Current Temperature',
          optimalLabel: 'Optimal Range',
          optimal: '20-35°C',
          reference: {
            study: 'Deep water (10-15cm) protects rice from cold injury by maintaining stable soil temperature above 15°C.',
            source: 'IRRI Rice Knowledge Bank - Good Water Management Practices',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/training/fact-sheets/water-management/item/good-water-management-practices'
          }
        },
        'Apply fertilizer': {
          title: 'Apply Fertilizer',
          whatIsIt: 'Your rice paddy lacks essential nutrients (nitrogen, phosphorus, potassium) needed for healthy growth.',
          whyNeeded: 'Nutrient deficiency causes yellow leaves, few tillers, and poor grain filling - reducing your harvest.',
          howToDo: [
            'Apply 4 sacks Complete (14-14-14) + 2 sacks Urea PER HECTARE',
            'For 2 hectares: 8 sacks Complete + 4 sacks Urea total',
            'Split into 3 applications: at planting, 21 days, and 45 days after transplanting',
            'Broadcast method: walk through paddy and scatter fertilizer evenly'
          ],
          tips: 'Buy fertilizer from your local agri-supply store. Complete and Urea are available in most towns in Lopez, Quezon.',
          currentLabel: 'Current Nutrients',
          optimalLabel: 'Optimal Range',
          optimal: '300-1500 µS/cm',
          reference: {
            study: 'Split fertilizer application (basal, tillering, panicle initiation) increases nitrogen use efficiency by 20-30% compared to single application.',
            source: 'PalayCheck System 2022 Revised Edition - Nutrient Management',
            author: 'PhilRice (Philippine Rice Research Institute)',
            year: '2022',
            url: 'https://www.philrice.gov.ph/wp-content/uploads/2023/02/PalayCheck-System-2022-Revised-Edition.pdf'
          }
        },
        'Skip fertilizer application': {
          title: 'Skip Fertilizer Application',
          whatIsIt: 'Your rice paddy has excess nutrients. Too much fertilizer causes dark green leaves, weak stems, and attracts pests.',
          whyNeeded: 'Over-fertilized rice is prone to lodging (falling over), pest attacks, and produces more leaves than grain.',
          howToDo: [
            'Do NOT apply any fertilizer for the next 2-3 weeks',
            'If leaves are very dark green, skip the next scheduled application',
            'Resume normal fertilization only when leaves return to light green',
            'Observe for signs of weak stems or pest increase'
          ],
          tips: 'Signs of too much fertilizer: very dark green leaves, weak/soft stems, plants taller than usual, increased stem borers.',
          currentLabel: 'Current Nutrients',
          optimalLabel: 'Optimal Range',
          optimal: '300-1500 µS/cm',
          reference: {
            study: 'Excess nitrogen causes dark green leaves, weak stems (lodging), and increases susceptibility to pests and diseases.',
            source: 'IRRI Rice Knowledge Bank - Nitrogen Excess',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/nitrogen-excess'
          }
        },
        'Apply rice straw ash': {
          title: 'Apply Rice Straw Ash (Abo ng Dayami)',
          whatIsIt: 'Your rice paddy soil is too acidic. Rice straw ash is a FREE soil amendment that raises pH and adds potassium.',
          whyNeeded: 'Acidic soil locks up nutrients, causing poor root growth and reduced yield even when fertilizer is applied.',
          howToDo: [
            'Collect ash after burning rice straw (dayami) from your last harvest',
            'For small fields (<1 hectare): Use all the ash you can collect',
            'For large fields (2+ hectares): If not enough ash, buy Dolomite (P150-200/sack) from agri-supply',
            'Spread ash evenly 2 weeks before transplanting or planting'
          ],
          tips: 'Rice straw ash is FREE! After harvest, burn the straw and collect the ash. This is a traditional practice that works.',
          currentLabel: 'Current pH',
          optimalLabel: 'Optimal Range',
          optimal: '5.5-6.5',
          reference: {
            study: 'Rice straw-derived biochar application raises soil pH by 3.29 units and increases cation exchange capacity, effectively reducing soil acidity.',
            source: 'Long-Term Successive Seasonal Application of Rice Straw-Derived Biochar Improves the Acidity and Fertility of Red Soil',
            author: 'MDPI Agronomy Journal',
            year: '2023',
            url: 'https://www.mdpi.com/2073-4395/13/2/505'
          }
        }
      },
      tl: {
        'Padaluyin ang Tubig': {
          title: 'Padaluyin ang Tubig sa Palayan',
          whatIsIt: 'Kulang ang tubig sa palayan. Ang palay ay kailangang may tubig na 3-5 cm (bukung-bukong) para lumaki ng maayos.',
          whyNeeded: 'Kapag kulang ang tubig, hindi makakuha ng sustansya ang palay, titigil ang pagtitiller, at bababa ang ani.',
          howToDo: [
            'Buksan ang irigasyon para dumaloy ang tubig sa palayan',
            'Panatilihin ang 3-5 cm tubig (bukung-bukong ang lalim)',
            'Tingnan ang tubig sa 3-4 na bahagi ng palayan - gilid, gitna, at dulo',
            'Kapag namumulaklak na, dagdagan hanggang 5-7 cm (tuhod ang lalim)'
          ],
          tips: 'Para sa malaking palayan (2+ ektarya): Tingnan ang tubig sa gilid, gitna, at dulo para pantay ang distribusyon.',
          currentLabel: 'Basa ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '60-90%',
          reference: {
            study: 'Ang tamang pamamahala ng tubig ay lubos na nakakaapekto sa ani ng palay. Ang 3-5 cm na tubig ay optimal para sa vegetative stage.',
            source: 'IRRI Rice Knowledge Bank - Water Management',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/step-by-step-production/growth/water-management'
          }
        },
        'Pagsasapaw': {
          title: 'Pagsasapaw (Mid-Season Drainage)',
          whatIsIt: 'Sobrang basa na ang palayan. Ang pagpapatuyo ng 5-7 araw ay nagpapatibay ng ugat at pumipigil sa pagdapa ng palay.',
          whyNeeded: 'Ang pagsasapaw ay nagpapalakas ng tangkay, pumipigil sa pagdapa ng palay sa bagyo, at nakakapagdagdag ng 10-15% sa ani.',
          howToDo: [
            'Buksan ang drainage canal para lumabas ang tubig',
            'Hayaang matuyo ang palayan ng 5-7 araw hanggang magka-crack ang lupa',
            'Pinakamabuting timing: 45 araw pagkatapos magtanim (bago mag-panicle initiation)',
            'Buhusan ulit ng tubig pagkatapos ng pagsasapaw'
          ],
          tips: 'Ang pagsasapaw ay nakakabawas din ng methane emissions ng 30-50% - mabuti para sa kalikasan!',
          currentLabel: 'Basa ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '60-90%',
          reference: {
            study: 'Ang mid-season drainage (AWD) ay nagpapatibay ng ugat ng palay, nagpapababa ng lodging ng 20-30%, at nagpapababa ng methane emissions ng 30-50%.',
            source: 'Alternate Wetting and Drying (AWD) Technology for Rice Production',
            author: 'PhilRice (Philippine Rice Research Institute)',
            year: '2022',
            url: 'https://www.philrice.gov.ph/wp-content/uploads/2022/10/RS4DM-Alternate-Wetting-Drying-Technology-Vol.-11.pdf'
          }
        },
        'Dagdagan ang Tubig': {
          title: 'Dagdagan ang Tubig sa Palayan',
          whatIsIt: 'Mainit ang lupa sa palayan. Ang malalim na tubig (10-15 cm) ay natural na pampalamig ng palay.',
          whyNeeded: 'Ang sobrang init ay nakakasira sa palay kapag namumulaklak, na nagiging sanhi ng ipa (walang laman na butil) at mababang ani.',
          howToDo: [
            'Dagdagan ang tubig hanggang 10-15 cm kapag sobrang init',
            'Buksan ang irigasyon para mas maraming tubig ang pumasok',
            'Panatilihin ang malalim na tubig sa tanghali (10 AM - 3 PM)',
            'Pwedeng bawasan sa 5 cm pagkatapos ng heat wave'
          ],
          tips: 'Ang tubig ay parang aircon ng palayan - sinisipsip nito ang init sa araw at dahan-dahang inilalabas sa gabi.',
          currentLabel: 'Init ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '20-35°C',
          reference: {
            study: 'Ang tubig ay nagsisilbing thermal buffer, na nagpapababa ng temperatura ng lupa ng 5-8°C sa panahon ng matinding init.',
            source: 'Climate-Smart Agriculture Sourcebook - Crop Production',
            author: 'FAO (Food and Agriculture Organization)',
            year: '2020',
            url: 'https://www.fao.org/climate-smart-agriculture-sourcebook/production-resources/module-b1-crops/chapter-b1-3/en/'
          }
        },
        'Palalimin ang Tubig': {
          title: 'Palalimin ang Tubig para sa Lamig',
          whatIsIt: 'Malamig ang lupa sa palayan. Ang malalim na tubig (10-15 cm) ay nagsisilbing kumot ng lupa at pinoprotektahan ang palay sa lamig.',
          whyNeeded: 'Ang malamig na temperatura ay nagpapabagal ng paglaki ng palay, nagiging dilaw ang dahon, at maaaring ma-delay ang ani ng 2-3 linggo.',
          howToDo: [
            'Dagdagan ang tubig hanggang 10-15 cm kaagad',
            'Panatilihin ang malalim na tubig lalo na sa gabi kapag bumababa ang temperatura',
            'Panatilihing dumadaloy ang tubig (ang sariwang tubig ay may dalang init)',
            'Bawasan ang lalim pabalik sa normal kapag tapos na ang lamig'
          ],
          tips: 'Ang tubig ay parang kumot - pinapanatili nito ang init at pinoprotektahan ang ugat ng palay sa malamig na hangin.',
          currentLabel: 'Init ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '20-35°C',
          reference: {
            study: 'Ang malalim na tubig (10-15cm) ay nagpoprotekta sa palay mula sa pinsala ng lamig sa pamamagitan ng pagpapanatili ng stable na temperatura ng lupa na higit sa 15°C.',
            source: 'IRRI Rice Knowledge Bank - Good Water Management Practices',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/training/fact-sheets/water-management/item/good-water-management-practices'
          }
        },
        'Magpataba': {
          title: 'Magpataba',
          whatIsIt: 'Kulang sa sustansya (nitrogen, phosphorus, potassium) ang palayan para sa malusog na paglaki ng palay.',
          whyNeeded: 'Ang kakulangan sa sustansya ay nagdudulot ng dilaw na dahon, kaunting tiller, at hindi magandang pagpuno ng butil - bumababa ang ani.',
          howToDo: [
            'Maglagay ng 4 sako Complete (14-14-14) + 2 sako Urea KADA EKTARYA',
            'Para sa 2 ektarya: 8 sako Complete + 4 sako Urea ang kabuuan',
            'Hatiin sa 3 application: sa pagtatanim, 21 araw, at 45 araw pagkatapos magtanim',
            'Broadcast method: maglakad sa palayan at ikalat ang pataba ng pantay'
          ],
          tips: 'Bumili ng pataba sa pinakamalapit na agri-supply store. Ang Complete at Urea ay available sa karamihan ng bayan sa Lopez, Quezon.',
          currentLabel: 'Sustansya Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '300-1500 µS/cm',
          reference: {
            study: 'Ang split fertilizer application (basal, tillering, panicle initiation) ay nakakapagdagdag ng 20-30% sa efficiency ng nitrogen kumpara sa isang beses na application.',
            source: 'PalayCheck System 2022 Revised Edition - Nutrient Management',
            author: 'PhilRice (Philippine Rice Research Institute)',
            year: '2022',
            url: 'https://www.philrice.gov.ph/wp-content/uploads/2023/02/PalayCheck-System-2022-Revised-Edition.pdf'
          }
        },
        'Huwag Muna Magpataba': {
          title: 'Huwag Muna Magpataba',
          whatIsIt: 'Sobra na ang sustansya sa palayan. Ang sobrang pataba ay nagdudulot ng maitim na berdeng dahon, mahinang tangkay, at umakit ng peste.',
          whyNeeded: 'Ang sobrang pataba ay nagpapahina ng tangkay (madaling madapa), dumarami ang peste, at mas maraming dahon kaysa butil ang lumalabas.',
          howToDo: [
            'HUWAG maglagay ng anumang pataba sa susunod na 2-3 linggo',
            'Kung sobrang itim na berde ang dahon, i-skip ang susunod na scheduled na application',
            'Magpataba ulit lang kapag bumalik na sa light green ang mga dahon',
            'Bantayan kung may senyales ng mahinang tangkay o dumaming peste'
          ],
          tips: 'Senyales ng sobrang pataba: sobrang itim na berdeng dahon, malambot/mahinang tangkay, mas matangkad kaysa karaniwan, dumaming stem borers.',
          currentLabel: 'Sustansya Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '300-1500 µS/cm',
          reference: {
            study: 'Ang sobrang nitrogen ay nagdudulot ng maitim na berdeng dahon, mahinang tangkay (lodging), at mas madaling atakihin ng peste at sakit.',
            source: 'IRRI Rice Knowledge Bank - Nitrogen Excess',
            author: 'International Rice Research Institute (IRRI)',
            year: '2023',
            url: 'http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/nitrogen-excess'
          }
        },
        'Maglagay ng Abo ng Dayami': {
          title: 'Maglagay ng Abo ng Dayami',
          whatIsIt: 'Maasim ang lupa sa palayan. Ang abo ng dayami ay LIBRENG soil amendment na nagpapataas ng pH at nagdadagdag ng potassium.',
          whyNeeded: 'Ang maasim na lupa ay nag-lo-lock ng sustansya, na nagiging sanhi ng mahina ugat at mababang ani kahit may pataba.',
          howToDo: [
            'Ipunin ang abo pagkatapos magsunog ng dayami mula sa nakaraang ani',
            'Para sa maliit na palayan (<1 ektarya): Gamitin lahat ng abo na nakuha',
            'Para sa malaking palayan (2+ ektarya): Kung kulang ang abo, bumili ng Dolomite (P150-200/sako) sa agri-supply',
            'Ikalat ang abo ng pantay 2 linggo bago magtanim'
          ],
          tips: 'Ang abo ng dayami ay LIBRE! Pagkatapos ng ani, sunugin ang dayami at ipunin ang abo. Ito ay tradisyonal na praktis na gumagana.',
          currentLabel: 'pH ng Lupa Ngayon',
          optimalLabel: 'Tamang Antas',
          optimal: '5.5-6.5',
          reference: {
            study: 'Ang abo ng dayami ay epektibong nagpapataas ng pH ng lupa ng hanggang 3.29 units at nagpapabuti ng fertility ng lupa.',
            source: 'Long-Term Successive Seasonal Application of Rice Straw-Derived Biochar Improves the Acidity and Fertility of Red Soil',
            author: 'MDPI Agronomy Journal',
            year: '2023',
            url: 'https://www.mdpi.com/2073-4395/13/2/505'
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

    // Get current sensor value based on recommendation type (Rice-specific actions)
    const getCurrentValue = () => {
      // Water/Moisture related actions
      if (recommendation.action.includes('Irrigate') || recommendation.action.includes('Padaluyin') ||
          recommendation.action.includes('drainage') || recommendation.action.includes('Pagsasapaw')) {
        return `${sensorData.soilHumidity}%`;
      }
      // Temperature related actions (water depth for hot/cold)
      if (recommendation.action.includes('water depth') || recommendation.action.includes('Tubig') ||
          recommendation.action.includes('Deepen') || recommendation.action.includes('Palalimin') ||
          recommendation.action.includes('Dagdagan')) {
        return `${sensorData.soilTemperature}°C`;
      }
      // Nutrient/Fertilizer related actions
      if (recommendation.action.includes('fertilizer') || recommendation.action.includes('pataba') ||
          recommendation.action.includes('Magpataba') || recommendation.action.includes('Skip')) {
        return `${sensorData.soilConductivity} µS/cm`;
      }
      // pH related actions (rice straw ash)
      if (recommendation.action.includes('Abo') || recommendation.action.includes('ash') ||
          recommendation.action.includes('straw')) {
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
