// Medical Engine — Core Medical Intelligence for MUSLLY AI OS

export interface DrugInfo {
  name: string
  nameAr: string
  activeIngredient: string
  category: string
  dosage: {
    adult: string
    pediatric: string
    elderly: string
    pregnancy: string
  }
  contraindications: string[]
  sideEffects: string[]
  interactions: string[]
  pregnancyCategory: string
  breastfeeding: boolean
  liverCaution: boolean
  kidneyCaution: boolean
  maxDailyDose: string
  storage: string
  manufacturer: string
}

export interface DiagnosisResult {
  disease: string
  confidence: number
  symptoms: string[]
  recommendedTests: string[]
  recommendedDrugs: string[]
  contraindications: string[]
  urgency: 'low' | 'medium' | 'high' | 'emergency'
  referralNeeded: boolean
  specialty: string
}

export class MedicalEngine {
  private drugDatabase: Map<string, DrugInfo>
  private diseaseDatabase: Map<string, any>
  private interactionMatrix: Map<string, string[]>

  constructor() {
    this.drugDatabase = new Map()
    this.diseaseDatabase = new Map()
    this.interactionMatrix = new Map()
    this.initializeDrugDatabase()
    this.initializeDiseaseDatabase()
    this.initializeInteractions()
  }

  private initializeDrugDatabase() {
    const drugs: DrugInfo[] = [
      {
        name: 'Paracetamol',
        nameAr: 'باراسيتامول',
        activeIngredient: 'Paracetamol (Acetaminophen)',
        category: 'مسكن وخافض حرارة',
        dosage: {
          adult: '500-1000mg كل 4-6 ساعات، بحد أقصى 4000mg/يوم',
          pediatric: '10-15mg/kg كل 4-6 ساعات',
          elderly: 'تقليل الجرعة بنسبة 25-50%',
          pregnancy: 'آمن في الحمل (Category B)',
        },
        contraindications: ['فرط الحساسية للباراسيتامول', 'فشل كبدي حاد', 'إدمان الكحول'],
        sideEffects: ['غثيان', 'طفح جلدي', 'آنفية', 'نادراً: تلف كبدي'],
        interactions: ['الوارفارين (يزيد التأثير)', 'الكحول', 'كاربامازيبين', 'فينوباربيتال'],
        pregnancyCategory: 'B',
        breastfeeding: true,
        liverCaution: true,
        kidneyCaution: false,
        maxDailyDose: '4000mg',
        storage: 'في مكان بارد وجاف بعيداً عن الضوء',
        manufacturer: 'GSK',
      },
      {
        name: 'Amoxicillin',
        nameAr: 'أموكسيسيلين',
        activeIngredient: 'Amoxicillin',
        category: 'مضاد حيوي (بنسلين)',
        dosage: {
          adult: '250-500mg كل 8 ساعات',
          pediatric: '20-40mg/kg/يوم مقسمة على 3 جرعات',
          elderly: 'جرعة عادية مع مراقبة الكلى',
          pregnancy: 'آمن في الحمل (Category B)',
        },
        contraindications: ['حساسية للبنسلين', 'حساسية للسيفالوسبورين', 'التهاب الغدد اللمفاوية الفيروسي'],
        sideEffects: ['إسهال', 'طفح جلدي', 'غثيان', 'التهاب فطري في الفم'],
        interactions: ['البروبينسيد', 'الوارفارين', 'الميثوتريكسات', 'حبوب منع الحمل'],
        pregnancyCategory: 'B',
        breastfeeding: true,
        liverCaution: false,
        kidneyCaution: true,
        maxDailyDose: '4000mg/يوم',
        storage: 'في الثلاجة بعد التحضير',
        manufacturer: 'Sandoz',
      },
      {
        name: 'Omeprazole',
        nameAr: 'أوميبرازول',
        activeIngredient: 'Omeprazole',
        category: 'مثبط مضخة البروتون (PPI)',
        dosage: {
          adult: '20-40mg مرة واحدة يومياً قبل الأكل بـ 30 دقيقة',
          pediatric: '0.6-1mg/kg/يوم',
          elderly: 'جرعة عادية',
          pregnancy: 'استخدم بحذر (Category C)',
        },
        contraindications: ['حساسية للأوميبرازول', 'الأطفال أقل من سنة'],
        sideEffects: ['صداع', 'إسهال', 'غثيان', 'نقص مغنيسيوم مع الاستخدام الطويل'],
        interactions: ['كلوبيدوجريل', 'الوارفارين', 'الفينيتوين', 'الديازيبام'],
        pregnancyCategory: 'C',
        breastfeeding: false,
        liverCaution: true,
        kidneyCaution: false,
        maxDailyDose: '40mg/يوم',
        storage: 'في درجة حرارة أقل من 25°م',
        manufacturer: 'AstraZeneca',
      },
      {
        name: 'Insulin Glargine',
        nameAr: 'إنسولين جلارجين',
        activeIngredient: 'Insulin Glargine (rDNA)',
        category: 'إنسولين طويل المفعول',
        dosage: {
          adult: '10-80 units مرة واحدة يومياً في نفس الوقت',
          pediatric: 'حسب الحاجة والتوجيه الطبي',
          elderly: 'ابدأ بجرعة منخفضة',
          pregnancy: 'آمن (Category B)',
        },
        contraindications: ['نقص سكر الدم الحاد', 'حساسية للإنسولين'],
        sideEffects: ['نقص سكر الدم', 'زيادة وزن', 'احتقان في موقع الحقن', 'تصلب الأنسجة الدهنية'],
        interactions: ['بيتا حاصرات', 'الكحول', 'الستيرويدات', 'الساليسيلات'],
        pregnancyCategory: 'B',
        breastfeeding: true,
        liverCaution: false,
        kidneyCaution: true,
        maxDailyDose: 'حسب التوجيه الطبي',
        storage: 'في الثلاجة (2-8°م)، لا تتجمد',
        manufacturer: 'Sanofi',
      },
      {
        name: 'Metformin',
        nameAr: 'ميتفورمين',
        activeIngredient: 'Metformin Hydrochloride',
        category: 'مُحسّن حساسية الأنسولين',
        dosage: {
          adult: '500mg مرتين يومياً مع الوجبات، يمكن زيادة إلى 2000mg/يوم',
          pediatric: '10-16 سنة: 500mg مرتين يومياً',
          elderly: 'ابدأ بـ 500mg مرة يومياً',
          pregnancy: 'استخدم بحذر (Category B)',
        },
        contraindications: ['فشل كلوي حاد (eGFR < 30)', 'حمض الأكساليك', 'حساسية للميتفورمين', 'التهاب كبدي حاد', 'إدمان الكحول'],
        sideEffects: ['غثيان', 'إسهال', 'فقدان شهية', 'نقص فيتامين B12 مع الاستخدام الطويل'],
        interactions: ['اليود المشع', 'الكحول', 'الستيرويدات', 'المدرات', 'السيميتيدين'],
        pregnancyCategory: 'B',
        breastfeeding: false,
        liverCaution: true,
        kidneyCaution: true,
        maxDailyDose: '2000mg/يوم',
        storage: 'في مكان بارد وجاف',
        manufacturer: 'Merck',
      },
    ]

    drugs.forEach(drug => this.drugDatabase.set(drug.name.toLowerCase(), drug))
  }

  private initializeDiseaseDatabase() {
    const diseases = [
      {
        name: 'Type 2 Diabetes',
        nameAr: 'السكري النوع الثاني',
        symptoms: ['عطش مفرط', 'تبول متكرر', 'تعب', 'ضبابية الرؤية', 'شفاء بطيء للجروح'],
        tests: ['HbA1c', 'Fasting Blood Sugar', 'Oral Glucose Tolerance', 'Microalbuminuria'],
        drugs: ['Metformin', 'Insulin Glargine', 'Glipizide', 'Sitagliptin'],
        urgency: 'medium',
        referral: true,
        specialty: 'Endocrinology',
      },
      {
        name: 'Bacterial Infection',
        nameAr: 'عدوى بكتيرية',
        symptoms: ['حمى', 'احمرار', 'تورم', 'ألم', 'صديد'],
        tests: ['CBC', 'CRP', 'Blood Culture', 'Wound Culture'],
        drugs: ['Amoxicillin', 'Azithromycin', 'Ciprofloxacin', 'Cefuroxime'],
        urgency: 'medium',
        referral: false,
        specialty: 'General Practice',
      },
      {
        name: 'Gastritis',
        nameAr: 'التهاب المعدة',
        symptoms: ['ألم بطني', 'غثيان', 'انتفاخ', 'فقدان شهية', 'حرقة'],
        tests: ['H. pylori Test', 'Endoscopy', 'Stool Antigen'],
        drugs: ['Omeprazole', 'Ranitidine', 'Amoxicillin + Clarithromycin (H. pylori)'],
        urgency: 'low',
        referral: false,
        specialty: 'Gastroenterology',
      },
      {
        name: 'Hypertension',
        nameAr: 'ارتفاع ضغط الدم',
        symptoms: ['صداع', 'دوخة', 'أنفية', 'طنين في الأذن', 'نزيف أنفي'],
        tests: ['BP Monitoring', 'ECG', 'Kidney Function', 'Lipid Profile'],
        drugs: ['Amlodipine', 'Losartan', 'Hydrochlorothiazide', 'Metoprolol'],
        urgency: 'medium',
        referral: true,
        specialty: 'Cardiology',
      },
      {
        name: 'Migraine',
        nameAr: 'الصداع النصفي',
        symptoms: ['صداع نابض', 'غثيان', 'حساسية للضوء', 'حساسية للصوت', 'هالة بصرية'],
        tests: ['CT Brain (if first severe)', 'MRI (if red flags)'],
        drugs: ['Paracetamol', 'Ibuprofen', 'Sumatriptan', 'Propranolol (prophylaxis)'],
        urgency: 'low',
        referral: false,
        specialty: 'Neurology',
      },
    ]

    diseases.forEach(d => this.diseaseDatabase.set(d.name.toLowerCase(), d))
  }

  private initializeInteractions() {
    this.interactionMatrix.set('paracetamol', ['warfarin', 'alcohol', 'carbamazepine', 'phenobarbital'])
    this.interactionMatrix.set('amoxicillin', ['probenecid', 'warfarin', 'methotrexate', 'oral_contraceptives'])
    this.interactionMatrix.set('omeprazole', ['clopidogrel', 'warfarin', 'phenytoin', 'diazepam'])
    this.interactionMatrix.set('insulin', ['beta_blockers', 'alcohol', 'steroids', 'salicylates'])
    this.interactionMatrix.set('metformin', ['radiographic_contrast', 'alcohol', 'steroids', 'diuretics'])
  }

  // Drug Lookup
  lookupDrug(drugName: string): DrugInfo | null {
    return this.drugDatabase.get(drugName.toLowerCase()) || null
  }

  // Dose Calculator
  calculateDose(drugName: string, age: number, weight: number, condition?: string): string {
    const drug = this.lookupDrug(drugName)
    if (!drug) return 'الدواء غير موجود في قاعدة البيانات'

    if (age < 18) {
      return drug.dosage.pediatric.replace('kg', `${weight}kg`)
    } else if (age > 65) {
      return drug.dosage.elderly
    } else {
      return drug.dosage.adult
    }
  }

  // Interaction Checker
  checkInteractions(drugs: string[]): { hasInteraction: boolean; interactions: string[] } {
    const interactions: string[] = []

    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const drug1Interactions = this.interactionMatrix.get(drugs[i].toLowerCase()) || []
        if (drug1Interactions.includes(drugs[j].toLowerCase())) {
          interactions.push(`تداخل بين ${drugs[i]} و ${drugs[j]}`)
        }
      }
    }

    return { hasInteraction: interactions.length > 0, interactions }
  }

  // Pregnancy Safety
  checkPregnancySafety(drugName: string): { safe: boolean; category: string; recommendation: string } {
    const drug = this.lookupDrug(drugName)
    if (!drug) return { safe: false, category: 'Unknown', recommendation: 'استشر الطبيب' }

    const category = drug.pregnancyCategory
    const safe = category === 'A' || category === 'B'

    return {
      safe,
      category,
      recommendation: safe 
        ? 'آمن في الحمل'
        : category === 'C' 
          ? 'استخدم بحذر وفقط إذا كانت الفوائد تفوق المخاطر'
          : 'ممنوع في الحمل',
    }
  }

  // Pediatric Safety
  checkPediatricSafety(drugName: string, age: number): { safe: boolean; recommendation: string } {
    const drug = this.lookupDrug(drugName)
    if (!drug) return { safe: false, recommendation: 'استشر الطبيب' }

    if (age < 2 && drug.name === 'Omeprazole') {
      return { safe: false, recommendation: 'ممنوع للأطفال أقل من سنة' }
    }

    return { safe: true, recommendation: 'جرعة حسب الوزن: ' + drug.dosage.pediatric }
  }

  // Symptom Diagnosis
  diagnose(symptoms: string[]): DiagnosisResult[] {
    const results: DiagnosisResult[] = []

    this.diseaseDatabase.forEach((disease) => {
      const matchingSymptoms = disease.symptoms.filter((s: string) => 
        symptoms.some(userSymptom => userSymptom.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(userSymptom.toLowerCase()))
      )

      const confidence = matchingSymptoms.length / disease.symptoms.length

      if (confidence > 0.3) {
        results.push({
          disease: disease.nameAr,
          confidence: Math.round(confidence * 100),
          symptoms: matchingSymptoms,
          recommendedTests: disease.tests,
          recommendedDrugs: disease.drugs,
          contraindications: [],
          urgency: disease.urgency,
          referralNeeded: disease.referral,
          specialty: disease.specialty,
        })
      }
    })

    return results.sort((a, b) => b.confidence - a.confidence)
  }

  // Prescription Validator
  validatePrescription(drugs: string[], patientAge: number, patientWeight: number, pregnancy: boolean): {
    valid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []

    // Check interactions
    const interactionCheck = this.checkInteractions(drugs)
    if (interactionCheck.hasInteraction) {
      errors.push(...interactionCheck.interactions)
    }

    // Check each drug
    drugs.forEach(drug => {
      const drugInfo = this.lookupDrug(drug)
      if (!drugInfo) {
        warnings.push(`الدواء ${drug} غير موجود في قاعدة البيانات`)
        return
      }

      // Pregnancy check
      if (pregnancy) {
        const pregnancyCheck = this.checkPregnancySafety(drug)
        if (!pregnancyCheck.safe) {
          errors.push(`${drug}: ${pregnancyCheck.recommendation}`)
        }
      }

      // Pediatric check
      if (patientAge < 18) {
        const pediatricCheck = this.checkPediatricSafety(drug, patientAge)
        if (!pediatricCheck.safe) {
          errors.push(`${drug}: ${pediatricCheck.recommendation}`)
        }
      }

      // Dose validation
      const recommendedDose = this.calculateDose(drug, patientAge, patientWeight)
      warnings.push(`جرعة ${drug}: ${recommendedDose}`)
    })

    return { valid: errors.length === 0, warnings, errors }
  }

  // Get All Drugs
  getAllDrugs(): DrugInfo[] {
    return Array.from(this.drugDatabase.values())
  }

  // Search Drugs
  searchDrugs(query: string): DrugInfo[] {
    return this.getAllDrugs().filter(drug => 
      drug.name.toLowerCase().includes(query.toLowerCase()) ||
      drug.nameAr.includes(query) ||
      drug.activeIngredient.toLowerCase().includes(query.toLowerCase()) ||
      drug.category.includes(query)
    )
  }
}

export const medicalEngine = new MedicalEngine()
