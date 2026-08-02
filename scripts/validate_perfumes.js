/**
 * Fragrantica Parfüm Verileri Validasyon Scripti (Joi Kullanılarak)
 * 
 * Sadece diske çekilmiş (var olan) parfüm JSON verilerini ve görsellerini doğrular.
 * 
 * Kullanım:
 *   - Tüm çekilmiş verileri doğrulamak için:
 *       node scripts/validate_perfumes.js
 * 
 *   - Belirli bir markanın çekilmiş verilerini doğrulamak için:
 *       node scripts/validate_perfumes.js amouage
 */

const fs = require('fs');
const path = require('path');
const Joi = require('joi');

// Joi Parfüm Veri Şeması
const perfumeSchema = Joi.object({
  name: Joi.string().required().trim().messages({
    'string.empty': 'Parfüm adı boş olamaz',
    'any.required': 'Parfüm adı (name) alanı eksik'
  }),
  targetGender: Joi.string().allow('').required().messages({
    'any.required': 'Hedef cinsiyet (targetGender) alanı eksik'
  }),
  image: Joi.string().allow('').required().messages({
    'any.required': 'Resim URL (image) alanı eksik'
  }),
  url: Joi.string().required().trim().messages({
    'string.empty': 'Parfüm URL boş olamaz',
    'any.required': 'Parfüm URL (url) alanı eksik'
  }),
  brand: Joi.string().required().trim().messages({
    'string.empty': 'Marka adı boş olamaz',
    'any.required': 'Marka adı (brand) alanı eksik'
  }),
  description: Joi.string().allow('').required().messages({
    'any.required': 'Açıklama (description) alanı eksik'
  }),
  mainAccords: Joi.array().items(Joi.object({
    name: Joi.string().required().messages({
      'any.required': 'Akort adı eksik'
    }),
    width: Joi.string().allow('').required().messages({
      'any.required': 'Akort genişliği (width) eksik'
    })
  })).required().messages({
    'any.required': 'Ana akortlar (mainAccords) dizisi eksik'
  }),
  rating: Joi.object({
    score: Joi.string().allow('').required(),
    votesCount: Joi.string().allow('').required(),
    breakdown: Joi.object({
      love: Joi.string().allow('').required(),
      like: Joi.string().allow('').required(),
      ok: Joi.string().allow('').required(),
      dislike: Joi.string().allow('').required(),
      hate: Joi.string().allow('').required()
    }).required().messages({
      'any.required': 'Puan detayları (rating.breakdown) nesnesi eksik'
    })
  }).required().messages({
    'any.required': 'Puanlama (rating) nesnesi eksik'
  }),
  seasons: Joi.object({
    winter: Joi.string().allow('').required(),
    spring: Joi.string().allow('').required(),
    summer: Joi.string().allow('').required(),
    autumn: Joi.string().allow('').required(),
    day: Joi.string().allow('').required(),
    night: Joi.string().allow('').required()
  }).required().messages({
    'any.required': 'Mevsimler (seasons) nesnesi eksik'
  }),
  notes: Joi.object({
    top: Joi.array().items(Joi.string()).required().messages({
      'any.required': 'Üst notalar (notes.top) eksik'
    }),
    middle: Joi.array().items(Joi.string()).required().messages({
      'any.required': 'Orta notalar (notes.middle) eksik'
    }),
    base: Joi.array().items(Joi.string()).required().messages({
      'any.required': 'Alt notalar (notes.base) eksik'
    }),
    // Piramit yayınlanmamış parfümlerde notalar üçe bölünmez, düz liste olarak gelir.
    all: Joi.array().items(Joi.string()).default([])
  }).required().messages({
    'any.required': 'Notalar (notes) nesnesi eksik'
  }),
  longevity: Joi.object({
    veryWeak: Joi.string().allow('').required(),
    weak: Joi.string().allow('').required(),
    moderate: Joi.string().allow('').required(),
    longLasting: Joi.string().allow('').required(),
    eternal: Joi.string().allow('').required()
  }).required().messages({
    'any.required': 'Kalıcılık (longevity) nesnesi eksik'
  }),
  sillage: Joi.object({
    intimate: Joi.string().allow('').required(),
    moderate: Joi.string().allow('').required(),
    strong: Joi.string().allow('').required(),
    enormous: Joi.string().allow('').required()
  }).required().messages({
    'any.required': 'Yayılım (sillage) nesnesi eksik'
  }),
  genderVoting: Joi.object({
    female: Joi.string().allow('').required(),
    moreFemale: Joi.string().allow('').required(),
    unisex: Joi.string().allow('').required(),
    moreMale: Joi.string().allow('').required(),
    male: Joi.string().allow('').required()
  }).required().messages({
    'any.required': 'Cinsiyet oylaması (genderVoting) nesnesi eksik'
  }),
  priceVoting: Joi.object({
    wayOverpriced: Joi.string().allow('').required(),
    overpriced: Joi.string().allow('').required(),
    fair: Joi.string().allow('').required(),
    goodValue: Joi.string().allow('').required(),
    greatValue: Joi.string().allow('').required()
  }).required().messages({
    'any.required': 'Fiyat oylaması (priceVoting) nesnesi eksik'
  }),
  remindsMeOf: Joi.array().items(Joi.object({
    brand: Joi.string().required(),
    name: Joi.string().required()
  })).required().messages({
    'any.required': 'Hatırlatan parfümler (remindsMeOf) dizisi eksik'
  }),
  peopleAlsoLike: Joi.array().items(Joi.object({
    brand: Joi.string().required(),
    name: Joi.string().required()
  })).required().messages({
    'any.required': 'Benzer beğenilenler (peopleAlsoLike) dizisi eksik'
  })
});

/**
 * Çekilmiş tek bir markanın mevcut parfüm JSON dosyalarını doğrular
 */
function validateBrand(brandSlug) {
  const slug = brandSlug.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
  const perfumesDir = path.join(__dirname, '..', 'scrape_files', 'perfumes');
  const brandPerfumesDir = path.join(perfumesDir, slug);

  if (!fs.existsSync(brandPerfumesDir)) {
    console.log(`ℹ️ Bilgi: '${slug}' markası için henüz hiç veri çekilmemiş (klasör yok).`);
    return null;
  }

  // Klasördeki tüm .json dosyalarını bul
  const jsonFiles = fs.readdirSync(brandPerfumesDir).filter(f => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.log(`ℹ️ Bilgi: '${slug}' markası klasöründe çekilmiş JSON dosyası yok.`);
    return null;
  }

  console.log(`\n==================================================`);
  console.log(`Marka Doğrulanıyor: ${slug} (${jsonFiles.length} çekilmiş parfüm)`);
  console.log(`==================================================`);

  const results = {
    slug: slug,
    totalScrapedPerfumes: jsonFiles.length,
    validCount: 0,
    invalidCount: 0,
    missingImagesCount: 0,
    issues: []
  };

  for (let idx = 0; idx < jsonFiles.length; idx++) {
    const jsonFile = jsonFiles[idx];
    const perfumeSlug = jsonFile.replace('.json', '');
    const jsonPath = path.join(brandPerfumesDir, jsonFile);
    const imagePath = path.join(brandPerfumesDir, 'images', `${perfumeSlug}.webp`);

    const perfumeIssues = [];

    try {
      const fileContent = fs.readFileSync(jsonPath, 'utf8');
      if (!fileContent || fileContent.trim().length === 0) {
        perfumeIssues.push(`[BOŞ DOSYA] JSON dosyası 0 byte`);
      } else {
        const jsonContent = JSON.parse(fileContent);

        // 1. Joi Şema Validasyonu (Eksik key/value, tip ve nesne yapıları)
        const { error } = perfumeSchema.validate(jsonContent, { abortEarly: false });
        if (error) {
          error.details.forEach(detail => {
            perfumeIssues.push(`[ŞEMA HATASI] ${detail.path.join('.')}: ${detail.message}`);
          });
        }

        // 2. Resim Kontrolü (JSON'da resim URL var ise WebP dosyası var mı?)
        if (jsonContent.image && jsonContent.image.length > 0) {
          if (!fs.existsSync(imagePath) || fs.statSync(imagePath).size === 0) {
            perfumeIssues.push(`[RESİM EKSİK] WebP resmi bulunamadı: images/${perfumeSlug}.webp`);
            results.missingImagesCount++;
          }
        }
      }
    } catch (err) {
      perfumeIssues.push(`[JSON SİNTAKS HATASI] Dosya okunamadı/parse edilemedi: ${err.message}`);
    }

    if (perfumeIssues.length === 0) {
      results.validCount++;
    } else {
      results.invalidCount++;
      results.issues.push({
        perfumeFile: jsonFile,
        perfumeSlug: perfumeSlug,
        errors: perfumeIssues
      });
    }
  }

  console.log(`  --> Çekilen Parfüm Sayısı : ${results.totalScrapedPerfumes}`);
  console.log(`  --> ✅ Geçerli Veriler     : ${results.validCount}/${results.totalScrapedPerfumes}`);
  console.log(`  --> ❌ Hatalı/Eksik Veriler : ${results.invalidCount}/${results.totalScrapedPerfumes}`);
  if (results.missingImagesCount > 0) {
    console.log(`  --> 🖼 Eksik WebP Resmi    : ${results.missingImagesCount}`);
  }

  return results;
}

/**
 * Çekilmiş tüm marka klasörlerini tarar ve özet rapor oluşturur
 */
function validateAllScrapedBrands() {
  const perfumesDir = path.join(__dirname, '..', 'scrape_files', 'perfumes');
  if (!fs.existsSync(perfumesDir)) {
    console.error(`❌ HATA: Perfumes klasörü bulunamadı: ${perfumesDir}`);
    return;
  }

  const brandDirs = fs.readdirSync(perfumesDir).filter(f => {
    return fs.statSync(path.join(perfumesDir, f)).isDirectory();
  }).sort();

  console.log(`\n🔍 ÇEKİLMİŞ TOPLAM ${brandDirs.length} MARKA KLASÖRÜ VALİDE EDİLİYOR...\n`);

  let grandTotalScraped = 0;
  let grandValidCount = 0;
  let grandInvalidCount = 0;
  let grandMissingImages = 0;

  const allBrandResults = [];

  brandDirs.forEach(bSlug => {
    const res = validateBrand(bSlug);
    if (res) {
      allBrandResults.push(res);
      grandTotalScraped += res.totalScrapedPerfumes;
      grandValidCount += res.validCount;
      grandInvalidCount += res.invalidCount;
      grandMissingImages += res.missingImagesCount;
    }
  });

  // Özet Rapor Dosyasını Yaz
  const reportPath = path.join(__dirname, '..', 'scrape_files', 'validation_report.json');
  const summaryReport = {
    timestamp: new Date().toISOString(),
    totalScrapedBrands: allBrandResults.length,
    grandTotalScraped,
    grandValidCount,
    grandInvalidCount,
    grandMissingImages,
    brandSummary: allBrandResults.map(b => ({
      slug: b.slug,
      totalScraped: b.totalScrapedPerfumes,
      valid: b.validCount,
      invalid: b.invalidCount,
      missingImages: b.missingImagesCount,
      issuesCount: b.issues.length
    })),
    details: allBrandResults.filter(b => b.issues.length > 0)
  };

  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2), 'utf8');

  console.log(`\n==================================================`);
  console.log(`🎉 ÇEKİLEN VERİLER VALİDASYON RAPORU ÖZETİ`);
  console.log(`==================================================`);
  console.log(`Çekim Yapılmış Marka Sayısı : ${allBrandResults.length}`);
  console.log(`Toplam Çekilen Parfüm JSON : ${grandTotalScraped}`);
  console.log(`✅ Geçerli Parfüm Verileri  : ${grandValidCount}`);
  console.log(`❌ Hatalı/Eksik Veriler     : ${grandInvalidCount}`);
  console.log(`🖼 Eksik WebP Resmi        : ${grandMissingImages}`);
  console.log(`\n📄 Detaylı validasyon raporu kaydedildi: ${reportPath}\n`);
}

// CLI Parametre Kontrolü
const args = process.argv.slice(2);
if (args.length > 0 && !args[0].startsWith('--')) {
  validateBrand(args[0]);
} else {
  validateAllScrapedBrands();
}

