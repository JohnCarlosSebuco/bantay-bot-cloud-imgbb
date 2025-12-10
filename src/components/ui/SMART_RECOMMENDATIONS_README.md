# Smart Recommendations for Rice Farming

## Overview
The SmartRecommendations component provides **rice-specific recommendations** tailored for farmers in **Lopez, Quezon, Philippines**. All recommendations use materials farmers already have or can easily obtain from local agri-supply stores.

---

## Sensor Thresholds (Rice-Specific)

| Condition | Threshold | Trigger |
|-----------|-----------|---------|
| Low Moisture | < 60% | Irrigate paddy |
| High Moisture | > 95% | Mid-season drainage (Pagsasapaw) |
| High Temperature | > 35°C | Increase water depth |
| Low Temperature | < 18°C | Deepen water level |
| Low Nutrients | < 300 µS/cm | Apply fertilizer |
| High Nutrients | > 1500 µS/cm | Skip fertilizer application |
| Acidic Soil | < 5.5 pH | Apply rice straw ash (Abo ng Dayami) |

### Why These Thresholds?
- **Rice paddies are flooded** - 60-90% moisture is normal (unlike vegetables at 40-70%)
- **Water regulates temperature** - deep water (10-15cm) cools in summer, insulates in cold
- **Higher nutrient tolerance** - rice tolerates up to 1500 µS/cm before showing excess symptoms

---

## Recommendations Details

### 1. Irrigate Paddy (Padaluyin ang Tubig)
**Trigger:** Soil humidity < 60%

**Instructions:**
- Tagalog: "Padaluyin ang tubig hanggang 3-5 cm (bukung-bukong) para sa nagtitiller na palay. Para sa namumulaklak, 5-7 cm (tuhod)."
- English: "Flood paddy to 3-5 cm (ankle depth) for tillering stage. For flowering, maintain 5-7 cm (knee depth)."
- Large Field Tip: "Para sa malaking palayan, tingnan ang tubig sa 3-4 na parte - gilid, gitna, at dulo."

**Scientific Reference:**
- Study: "Water management significantly affects rice yield. Maintaining 3-5 cm water depth during vegetative stage is optimal."
- Source: IRRI Rice Knowledge Bank - Water Management
- Author: International Rice Research Institute (IRRI)
- Year: 2023
- URL: http://www.knowledgebank.irri.org/step-by-step-production/growth/water-management

---

### 2. Mid-Season Drainage (Pagsasapaw)
**Trigger:** Soil humidity > 95%

**Instructions:**
- Tagalog: "Patuyuin ang palayan ng 1 linggo, 45 araw pagkatapos magtanim. Para tumibay ang ugat at hindi madapa ang palay."
- English: "Drain paddy for 1 week, 45 days after transplanting. This strengthens roots and prevents lodging."

**Scientific Reference:**
- Study: "Mid-season drainage (AWD) strengthens rice roots, reduces lodging by 20-30%, and decreases methane emissions by 30-50%."
- Source: Alternate Wetting and Drying (AWD) Technology for Rice Production
- Author: PhilRice (Philippine Rice Research Institute)
- Year: 2022
- URL: https://www.philrice.gov.ph/wp-content/uploads/2022/10/RS4DM-Alternate-Wetting-Drying-Technology-Vol.-11.pdf

---

### 3. Increase Water Depth (Dagdagan ang Tubig)
**Trigger:** Soil temperature > 35°C

**Instructions:**
- Tagalog: "Dagdagan ang tubig hanggang 10-15 cm para lumamig ang lupa. Ang tubig ang natural na aircon ng palayan."
- English: "Increase water depth to 10-15 cm to cool the soil. Water acts as natural air conditioning for the paddy."

**Scientific Reference:**
- Study: "Standing water acts as thermal buffer, reducing soil temperature by 5-8°C during extreme heat events."
- Source: Climate-Smart Agriculture Sourcebook - Crop Production
- Author: FAO (Food and Agriculture Organization)
- Year: 2020
- URL: https://www.fao.org/climate-smart-agriculture-sourcebook/production-resources/module-b1-crops/chapter-b1-3/en/

---

### 4. Deepen Water Level (Palalimin ang Tubig)
**Trigger:** Soil temperature < 18°C

**Instructions:**
- Tagalog: "Panatilihin ang malalim na tubig (10-15 cm). Ang tubig ay nagiging kumot ng lupa - pinoprotektahan sa lamig."
- English: "Maintain deep water (10-15 cm). Water acts as a blanket for the soil - protecting from cold."

**Scientific Reference:**
- Study: "Deep water (10-15cm) protects rice from cold injury by maintaining stable soil temperature above 15°C."
- Source: IRRI Rice Knowledge Bank - Good Water Management Practices
- Author: International Rice Research Institute (IRRI)
- Year: 2023
- URL: http://www.knowledgebank.irri.org/training/fact-sheets/water-management/item/good-water-management-practices

---

### 5. Apply Fertilizer (Magpataba)
**Trigger:** Soil conductivity < 300 µS/cm

**Instructions (Per Hectare - Scalable):**
- Tagalog: "Maglagay ng 4 sako Complete (14-14-14) + 2 sako Urea (46-0-0) KADA EKTARYA. Kung 2 ektarya: 8 sako Complete + 4 sako Urea. Hatiin sa 3: Pagtatanim, 21 araw, 45 araw."
- English: "Apply 4 bags Complete (14-14-14) + 2 bags Urea (46-0-0) PER HECTARE. For 2 hectares: 8 bags Complete + 4 bags Urea. Split into 3 applications: Planting, 21 days, 45 days."
- Application Method: "Magkalat habang naglalakad sa palayan (broadcast method)"

**Materials (from local agri-supply):**
- Complete (14-14-14) - Balanced NPK fertilizer
- Urea (46-0-0) - Nitrogen fertilizer
- Ammonium Sulfate (21-0-0) - Alternative nitrogen + sulfur

**Scientific Reference:**
- Study: "Split fertilizer application (basal, tillering, panicle initiation) increases nitrogen use efficiency by 20-30% compared to single application."
- Source: PalayCheck System 2022 Revised Edition - Nutrient Management
- Author: PhilRice (Philippine Rice Research Institute)
- Year: 2022
- URL: https://www.philrice.gov.ph/wp-content/uploads/2023/02/PalayCheck-System-2022-Revised-Edition.pdf

---

### 6. Skip Fertilizer Application (Huwag Muna Magpataba)
**Trigger:** Soil conductivity > 1500 µS/cm

**Instructions:**
- Tagalog: "Huwag muna maglagay ng pataba ng 2-3 linggo. Kung maitim-itim na berde ang dahon at nanghihina ang tangkay, sobra na ang sustansya."
- English: "Skip fertilizer for 2-3 weeks. If leaves are dark green and stems are weak, there's excess nutrients."

**Signs of Over-fertilization:**
- Dark green (almost black) leaves
- Weak, easily lodging stems
- Increased pest/disease susceptibility

**Scientific Reference:**
- Study: "Excess nitrogen causes dark green leaves, weak stems (lodging), and increases susceptibility to pests and diseases."
- Source: IRRI Rice Knowledge Bank - Nitrogen Excess
- Author: International Rice Research Institute (IRRI)
- Year: 2023
- URL: http://www.knowledgebank.irri.org/training/fact-sheets/nutrient-management/deficiencies-and-toxicities-fact-sheet/item/nitrogen-excess

---

### 7. Apply Rice Straw Ash (Maglagay ng Abo ng Dayami)
**Trigger:** Soil pH < 5.5 (acidic)

**Instructions:**

**For Small Fields (< 1 hectare):**
- Tagalog: "Ipunin ang abo pagkatapos magsunog ng dayami. Ikalat sa palayan 2 linggo bago magtanim. LIBRE lang!"
- English: "Collect ash after burning rice straw. Spread on paddy 2 weeks before planting. It's FREE!"

**For Large Fields (2+ hectares):**
- Tagalog: "Kung kulang ang abo, bumili ng Dolomite sa agri-supply. Para sa 2 ektarya: 20-40 sako Dolomite (P150-200 kada sako). Ikalat gamit ang broadcast method."
- English: "If ash is insufficient, buy Dolomite from agri-supply. For 2 hectares: 20-40 bags Dolomite (P150-200 per bag). Spread using broadcast method."

**Why Abo ng Dayami (Rice Straw Ash)?**
- FREE - farmers already have rice straw from harvest
- Contains calcium carbonate (like lime)
- Raises soil pH naturally
- Sustainable recycling of farm waste

**Scientific Reference:**
- Study: "Rice straw-derived biochar application raises soil pH by 3.29 units and increases cation exchange capacity, effectively reducing soil acidity."
- Source: Long-Term Successive Seasonal Application of Rice Straw-Derived Biochar Improves the Acidity and Fertility of Red Soil
- Author: MDPI Agronomy Journal
- Year: 2023
- URL: https://www.mdpi.com/2073-4395/13/2/505

---

## Materials Farmers Already Have (FREE or Cheap)

| Material | Filipino Term | Use | Cost |
|----------|---------------|-----|------|
| Rice straw | Dayami | Mulch (for non-rice crops) | FREE |
| Rice straw ash | Abo ng dayami | Soil pH correction | FREE |
| Animal manure | Dumi ng kalabaw/baka/manok | Organic fertilizer | FREE |
| Irrigation water | Tubig (canal/ulan) | Flooding paddy | FREE |

## Materials from Agri-Supply Store

| Material | Filipino Term | Use | Approx. Cost |
|----------|---------------|-----|--------------|
| Complete 14-14-14 | Complete | Balanced fertilizer | ~P1,200/sako |
| Urea 46-0-0 | Urea | Nitrogen fertilizer | ~P1,500/sako |
| Ammonium Sulfate | Ammosul | Nitrogen + sulfur | ~P800/sako |
| Dolomite | Dolomite | pH correction (large fields) | P150-200/sako |

---

## Optimal Ranges Display

The component shows optimal ranges for rice farming:
- **Humidity:** 60-90% (flooded paddy conditions)
- **Temperature:** 20-35°C (tropical rice growing range)
- **pH:** 5.5-6.5 (slightly acidic is ideal for rice)

---

## Removed Recommendations

### Alkaline Soil (pH > 7.5)
**Reason for removal:**
- Alkaline soil is rare in Quezon province
- Fixing alkaline soil requires sulfur which is not commonly available
- Impractical for local farmers

---

## Scientific Sources

1. **IRRI** - International Rice Research Institute (irri.org)
2. **PhilRice** - Philippine Rice Research Institute (philrice.gov.ph)
3. **FAO** - Food and Agriculture Organization (fao.org)
4. **Asian Journal of Agricultural Research** - Peer-reviewed agricultural studies

---

## Language Support

All recommendations are available in:
- **Tagalog/Filipino** - Primary language for Lopez, Quezon farmers
- **English** - Secondary option

The component automatically switches based on the `language` prop.
