/**
 * Parfüm Açıklamalarını AI İle Yeniden Yazma ve Valide Etme Scripti (Rephrase & Validation)
 * 
 * 2 Aşamalı AI Boru Hattı (Pipeline):
 *   1. Aşamada: 1. AI Ajanı açıklamayı nesnel, zenginleştirilmiş ve çekici Türkçe ile rephrase eder.
 *   2. Aşamada: 2. AI Ajanı (Gemini/GPT-4o Validator) orijinal metin ile 1. ajanın metnini karşılaştırır,
 *               nota doğruluğunu ve akıcılığı denetleyip yayına hazır nihai metni oluşturur.
 * 
 * Kullanım:
 *   - Önce API Key tanımlayın (Gemini veya OpenAI):
 *       export GEMINI_API_KEY="AIzaSy..."
 *       # VEYA
 *       export OPENAI_API_KEY="sk-..."
 * 
 *   - Çalıştırma örnekleri:
 *       node scripts/rephrase_descriptions.js              # Tüm eksik açıklamaları işler
 *       node scripts/rephrase_descriptions.js amouage       # Sadece 'amouage' markasını işler
 *       node scripts/rephrase_descriptions.js --limit 5     # Test amaçlı ilk 5 parfümü işler
 *       node scripts/rephrase_descriptions.js --force       # Zaten oluşturulmuş olsa bile yeniden üretir
 */

const fs = require('fs');
const path = require('path');

// API Anahtarı Kontrolü
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 1. AI Ajanı (Rephrase & Knowledge Enrichment) Prompt Hazırlama
function buildRephrasePrompt(perfumeName, brandName, originalDescription) {
  return `Sen lüks koku ve parfüm dünyasında uzman bir içerik yazarısın.

Aşağıda verilen ürün tanıtım metnini Türkçe olarak yeniden yazmanı (rephrase) istiyoruz:

[ÜRÜN BİLGİSİ]
Ürün Adı: ${perfumeName}
Marka: ${brandName}
Mevcut Metin: "${originalDescription}"

[TALİMATLAR & KURALLAR]
1. YASAL VE TARZ NÖTRLEŞTİRMESİ: Metni doğrudan bir kopyalama olarak değil, özgün ve edebi bir ürün inceleme/tanıtım yazısı tarzında ele al.
2. NOTALAR VE BİLEŞENLER: Orijinal metindeki çıkış yılı, parfümer (tasarımcı), koku ailesi ve (üst, orta, alt) nota bilgilerini sadık kalarak metnin içine doğal biçimde harmanla.
3. İLAVE BİLGİ ZENGİNLEŞTİRMESİ: Eğer bu parfüm, marka mirası, kullanım mevsimi/ortamı veya koku karakteri hakkında kendi bilgi dağarcığında ilave/detaylı bilgi varsa, metni zenginleştirmek için doğal şekilde metne ekle.
4. DİL VE TON: Türkçe dilbilgisine tamamen uygun, akıcı, merak uyandıran ve premium bir e-ticaret anlatımı kullan.

Lütfen sadece oluşturduğun yenilenmiş paragrafı döndür (başlık veya tırnak işareti ekleme).`;
}

// 2. AI Ajanı (Validation & Refinement) Prompt Hazırlama
function buildValidationPrompt(perfumeName, brandName, originalDescription, rephrasedDraft) {
  return `Sen baş editör ve kalite denetçisisin.

Görevin, aşağıdaki parfüm ürünü için hazırlanan taslak yeniden yazım metnini denetlemek, orijinal metinle karşılaştırmak ve yayınlanmaya hazır nihai Türkçe metni üretmektir.

[ÜRÜN VE METİNLER]
Ürün Adı: ${perfumeName}
Marka: ${brandName}
Orijinal Metin: "${originalDescription}"
1. AI Yazarının Taslağı: "${rephrasedDraft}"

[DENETİM VE VALİDASYON KİTERLERİ]
1. NOTA VE BİLGİ DOĞRULUĞU: Orijinal metindeki çıkış yılı, notalar (üst, orta, alt) veya parfümer bilgilerinin yanlış aktarılmadığından emin ol.
2. ZENGİNLEŞTİRME KONTROLÜ: Taslakta eklenen ilave bilgilerin parfümün karakteriyle çelişmediğini ve mantıklı olduğunu doğrula.
3. ANLATIM VE AKICILIK: Cümlelerde düşüklük, tekrar veya yapay ifadeler varsa düzelt.
4. SONUÇ: Tüm kontrolleri tamamladıktan sonra, yayına tamamen hazır, mükemmel Türkçeye sahip nihai parfüm açıklamasını ver.

Lütfen SADECE yayınlanmaya hazır nihai metni çıktı olarak ver (başka açıklama, onay cümlesi veya tırnak ekleme).`;
}

/**
 * Gemini API çağrısı yapar (REST API)
 */
async function callGeminiAPI(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) {
    throw new Error('Gemini API boş yanıt döndürdü.');
  }
  return resultText.trim();
}

/**
 * OpenAI API çağrısı yapar (REST API)
 */
async function callOpenAIAPI(promptText) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('OpenAI API boş yanıt döndürdü.');
  }
  return resultText.trim();
}

/**
 * AI Servisini çağırır (Gemini öncelikli, yoksa OpenAI)
 */
async function generateAIResponse(promptText) {
  if (GEMINI_API_KEY) {
    return await callGeminiAPI(promptText);
  } else if (OPENAI_API_KEY) {
    return await callOpenAIAPI(promptText);
  } else {
    throw new Error('API Anahtarı bulunamadı! Lütfen GEMINI_API_KEY veya OPENAI_API_KEY ortam değişkenini tanımlayın.');
  }
}

/**
 * Tek bir parfüm dosyasını rephrase ve valide eder
 */
async function processPerfumeFile(filePath, force = false) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const perfumeData = JSON.parse(fileContent);

  // Eğer zaten rephrase edilmişse ve --force yoksa atla
  if (perfumeData.description_rephrased && !force) {
    return { status: 'skipped', name: perfumeData.name };
  }

  const originalDesc = perfumeData.description;
  if (!originalDesc || originalDesc.trim().length === 0) {
    return { status: 'no_description', name: perfumeData.name };
  }

  console.log(`\n  [İşleniyor]: ${perfumeData.name}`);
  console.log(`   └─ 1. Aşama: AI Yazar metni zenginleştirip yeniden yazıyor...`);

  // AŞAMA 1: Rephrase & Knowledge Enrichment
  const step1Prompt = buildRephrasePrompt(perfumeData.name, perfumeData.brand, originalDesc);
  const draftRephrased = await generateAIResponse(step1Prompt);

  console.log(`   └─ 2. Aşama: AI Validator (Gemini/GPT-4o) kontrol edip valide ediyor...`);

  // AŞAMA 2: Validation & Final Polish
  const step2Prompt = buildValidationPrompt(perfumeData.name, perfumeData.brand, originalDesc, draftRephrased);
  const finalValidatedDesc = await generateAIResponse(step2Prompt);

  // Dosyayı Güncelle ve Kaydet
  perfumeData.description_rephrased = finalValidatedDesc;
  fs.writeFileSync(filePath, JSON.stringify(perfumeData, null, 2), 'utf8');

  console.log(`   ✅ BAŞARILI: 'description_rephrased' eklendi!`);
  return { status: 'success', name: perfumeData.name };
}

/**
 * Ana Çalıştırma Fonksiyonu
 */
async function main() {
  const args = process.argv.slice(2);
  let targetBrand = null;
  let limit = Infinity;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (!args[i].startsWith('--')) {
      targetBrand = args[i].toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
    }
  }

  console.log(`==================================================`);
  console.log(`Parfüm Açıklamaları AI Rephrase & Validasyon Scripti`);
  console.log(`==================================================`);

  if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    console.log(`\n⚠️ UYARI: Herhangi bir AI API Anahtarı bulunamadı!`);
    console.log(`Lütfen terminalinizde aşağıdaki komutlardan birini çalıştırın:\n`);
    console.log(`  export GEMINI_API_KEY="Sizin-Gemini-API-Anahtarınız"`);
    console.log(`  # VEYA`);
    console.log(`  export OPENAI_API_KEY="Sizin-OpenAI-API-Anahtarınız"\n`);
    console.log(`Ardından scripti tekrar çalıştırın.`);
    process.exit(1);
  }

  const provider = GEMINI_API_KEY ? 'Google Gemini (2.0 Flash)' : 'OpenAI (GPT-4o-mini)';
  console.log(`🤖 Kullanılan AI Sağlayıcı: ${provider}`);

  const perfumesBaseDir = path.join(__dirname, '..', 'scrape_files', 'perfumes');
  if (!fs.existsSync(perfumesBaseDir)) {
    console.error(`❌ HATA: Perfumes klasörü bulunamadı: ${perfumesBaseDir}`);
    process.exit(1);
  }

  let brandDirs = fs.readdirSync(perfumesBaseDir).filter(f => fs.statSync(path.join(perfumesBaseDir, f)).isDirectory());

  if (targetBrand) {
    brandDirs = brandDirs.filter(b => b.includes(targetBrand));
    if (brandDirs.length === 0) {
      console.error(`❌ HATA: '${targetBrand}' isimli marka klasörü bulunamadı.`);
      process.exit(1);
    }
  }

  let totalProcessed = 0;
  let successCount = 0;
  let skippedCount = 0;

  for (const bSlug of brandDirs) {
    if (totalProcessed >= limit) break;

    const brandDir = path.join(perfumesBaseDir, bSlug);
    const jsonFiles = fs.readdirSync(brandDir).filter(f => f.endsWith('.json'));

    for (const jFile of jsonFiles) {
      if (totalProcessed >= limit) break;

      const fullPath = path.join(brandDir, jFile);
      try {
        const res = await processPerfumeFile(fullPath, force);
        if (res.status === 'success') {
          successCount++;
          totalProcessed++;
        } else if (res.status === 'skipped') {
          skippedCount++;
        }
      } catch (err) {
        console.error(`   ❌ HATA (${jFile}):`, err.message);
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 ÖZET RAPOR`);
  console.log(`==================================================`);
  console.log(`İşlenen Parfüm Sayısı : ${successCount}`);
  console.log(`Atlanan (Zaten Var)  : ${skippedCount}`);
  console.log(`==================================================\n`);
}

main().catch(err => {
  console.error('Kritik Hata:', err);
});
