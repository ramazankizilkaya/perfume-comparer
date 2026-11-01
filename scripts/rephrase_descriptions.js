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

// Kök .env dosyasını oku ve process.env'e ekle
function loadRootDotenv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim().replace(/^export\s+/, '');
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (val.length >= 2 && (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch (err) {
      // sessizce geç
    }
  }

  // Yedek olarak appsettings.Local.json'dan da oku
  const appSettingsPath = path.resolve(__dirname, '..', 'src', 'PerfumeComparer', 'appsettings.Local.json');
  if (fs.existsSync(appSettingsPath)) {
    try {
      const appSettings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
      if (appSettings.Gemini?.ApiKey && !process.env.GEMINI_API_KEY) {
        process.env.GEMINI_API_KEY = appSettings.Gemini.ApiKey;
      }
      if (appSettings.OpenAI?.ApiKey && !process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = appSettings.OpenAI.ApiKey;
      } else if (appSettings.Ai?.ApiKey && !process.env.OPENAI_API_KEY) {
        process.env.OPENAI_API_KEY = appSettings.Ai.ApiKey;
      }
      if (appSettings.Groq?.ApiKey && !process.env.GROQ_API_KEY) {
        process.env.GROQ_API_KEY = appSettings.Groq.ApiKey;
      }
      if (appSettings.DeepSeek?.ApiKey && !process.env.DEEPSEEK_API_KEY) {
        process.env.DEEPSEEK_API_KEY = appSettings.DeepSeek.ApiKey;
      }
      if (appSettings.Mistral?.ApiKey && !process.env.MISTRAL_API_KEY) {
        process.env.MISTRAL_API_KEY = appSettings.Mistral.ApiKey;
      }
    } catch (err) {
      // sessizce geç
    }
  }
}

loadRootDotenv();

// API Anahtarı Kontrolü
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
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
 * DeepSeek API çağrısı yapar (REST API)
 */
async function callDeepSeekAPI(promptText) {
  const url = 'https://api.deepseek.com/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('DeepSeek API boş yanıt döndürdü.');
  }
  return resultText.trim();
}

/**
 * Groq API çağrısı yapar (REST API)
 */
async function callGroqAPI(promptText) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('Groq API boş yanıt döndürdü.');
  }
  return resultText.trim();
}

/**
 * Mistral AI API çağrısı yapar (REST API)
 */
async function callMistralAPI(promptText) {
  const url = 'https://api.mistral.ai/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: promptText }],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API Hatası (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('Mistral API boş yanıt döndürdü.');
  }
  return resultText.trim();
}

/**
 * AI Servisini çağırır (DeepSeek öncelikli -> Mistral -> Gemini -> Groq -> OpenAI Fallback ve Otomatik Yeniden Deneme)
 */
async function generateAIResponse(promptText) {
  const providers = [];

  // DeepSeek ücretli hesap olduğu için paralellik ve hızda ilk sırada
  if (DEEPSEEK_API_KEY) {
    providers.push({
      name: 'DeepSeek (deepseek-chat)',
      fn: () => callDeepSeekAPI(promptText)
    });
  }
  if (MISTRAL_API_KEY) {
    providers.push({
      name: 'Mistral (mistral-small-latest)',
      fn: () => callMistralAPI(promptText)
    });
  }
  if (GEMINI_API_KEY) {
    providers.push({
      name: 'Google Gemini (3.5 Flash)',
      fn: () => callGeminiAPI(promptText)
    });
  }
  if (GROQ_API_KEY) {
    providers.push({
      name: 'Groq (Llama 3.3 70B)',
      fn: () => callGroqAPI(promptText)
    });
  }
  if (OPENAI_API_KEY) {
    providers.push({
      name: 'OpenAI (gpt-4o-mini)',
      fn: () => callOpenAIAPI(promptText)
    });
  }

  if (providers.length === 0) {
    throw new Error('Hiçbir AI API Anahtarı bulunamadı! Lütfen appsettings.Local.json veya .env dosyasını kontrol edin.');
  }

  let lastError = null;

  for (const provider of providers) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await provider.fn();
      } catch (err) {
        lastError = err;
        const msg = String(err.message || err);
        console.warn(`   ⚠️ [${provider.name}] Deneme ${attempt} başarısız: ${msg.slice(0, 100)}...`);
        // Geçici ağ veya 503/429 durumlarında kısa bekleme
        await new Promise(r => setTimeout(r, 1200 * attempt));
      }
    }
    console.warn(`   🔄 [Fallback]: ${provider.name} tükendi, sıradaki AI sağlayıcısına geçiliyor...`);
  }

  throw new Error(`Tüm AI servisleri başarısız oldu. Son hata: ${lastError?.message || lastError}`);
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
  let concurrency = 5; // Varsayılan 5 paralel worker

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      concurrency = parseInt(args[i + 1], 10);
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
  console.log(`⚡ Eşzamanlı Çalışan Worker Sayısı : ${concurrency}`);

  const activeProviders = [];
  if (DEEPSEEK_API_KEY) activeProviders.push('DeepSeek');
  if (MISTRAL_API_KEY) activeProviders.push('Mistral');
  if (GEMINI_API_KEY) activeProviders.push('Gemini');
  if (GROQ_API_KEY) activeProviders.push('Groq');
  if (OPENAI_API_KEY) activeProviders.push('OpenAI');

  if (activeProviders.length === 0) {
    console.error(`\n❌ HATA: appsettings.Local.json veya .env içinde aktif hiçbir API anahtarı bulunamadı!`);
    process.exit(1);
  }

  console.log(`🤖 Aktif Fallback Sağlayıcı Zinciri : ${activeProviders.join(' -> ')}`);

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

  // İşlenecek tüm dosyaları topla
  const allFiles = [];
  for (const bSlug of brandDirs) {
    const brandDir = path.join(perfumesBaseDir, bSlug);
    const jsonFiles = fs.readdirSync(brandDir).filter(f => f.endsWith('.json'));
    for (const jFile of jsonFiles) {
      allFiles.push({
        brand: bSlug,
        filename: jFile,
        fullPath: path.join(brandDir, jFile)
      });
    }
  }

  console.log(`📦 Taranan Toplam Parfüm Dosyası    : ${allFiles.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  // Havuz (Worker Pool) ile kontrollü paralellik
  let fileIndex = 0;
  async function worker(workerId) {
    while (fileIndex < allFiles.length && processedCount < limit) {
      const current = allFiles[fileIndex++];
      if (!current) break;

      try {
        const res = await processPerfumeFile(current.fullPath, force);
        if (res.status === 'success') {
          successCount++;
          processedCount++;
          console.log(`  [W#${workerId}] [${processedCount}/${limit === Infinity ? allFiles.length : limit}] Tamamlandı: ${res.name}`);
        } else if (res.status === 'skipped') {
          skippedCount++;
        }
      } catch (err) {
        errorCount++;
        console.error(`  [W#${workerId}] ❌ HATA (${current.filename}):`, err.message);
      }
    }
  }

  const workerPromises = [];
  const actualConcurrency = Math.min(concurrency, allFiles.length);
  for (let i = 1; i <= actualConcurrency; i++) {
    workerPromises.push(worker(i));
  }

  await Promise.all(workerPromises);

  console.log(`\n==================================================`);
  console.log(`🎉 ÖZET RAPOR`);
  console.log(`==================================================`);
  console.log(`Başarıyla Rephrase Edilen : ${successCount}`);
  console.log(`Atlanan (Zaten Var)       : ${skippedCount}`);
  console.log(`Hata Alan Dosyalar        : ${errorCount}`);
  console.log(`==================================================\n`);
}

main().catch(err => {
  console.error('Kritik Hata:', err);
});
