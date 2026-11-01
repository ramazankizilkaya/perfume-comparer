import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

/**
 * Yalnızca sunucuda okunan, tarayıcıya hiç gitmeyen değişkenler. Kök .env'den
 * okunup process.env'e yazılır (bundle'a gömülmez). Deploy'da gerçek ortam
 * değişkeni olarak verilir ve .env'deki değer onu ezmez.
 */
const SERVER_ONLY_KEYS = ["API_INTERNAL_KEY", "DEPLOY_ENV"] as const;

/**
 * Depo kökündeki `.env` dosyasını okur. Next yalnızca kendi klasöründeki .env
 * dosyalarını otomatik yükler; sırlar tek dosyada toplansın diye kökteki dosyayı
 * burada elle okuyoruz. Ortamda tanımlı gerçek değişkenler ezilmez, böylece
 * deploy'da .env olmadan da çalışır.
 *
 * Dönen nesne yalnızca NEXT_PUBLIC_* değerlerini içerir (bunlar tarayıcıya gider).
 * SERVER_ONLY_KEYS listesindekiler ise doğrudan process.env'e yazılır.
 */
function loadRootEnv(): Record<string, string> {
    const values: Record<string, string> = {};

    // Kökü ararken yukarı doğru çık: hem repo içinden hem alt klasörden çalışsın.
    let dir = process.cwd();
    let file: string | null = null;

    for (let i = 0; i < 6; i++) {
        try {
            const candidate = join(dir, ".env");
            readFileSync(candidate, "utf8");
            file = candidate;
            break;
        } catch {
            const parent = dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }

    if (!file) return values;

    for (const raw of readFileSync(file, "utf8").split("\n")) {
        const line = raw.trim().replace(/^export\s+/, "");
        if (!line || line.startsWith("#")) continue;

        const eq = line.indexOf("=");
        if (eq <= 0) continue;

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        if (value.length >= 2 && value[0] === value[value.length - 1] && (value[0] === '"' || value[0] === "'")) {
            value = value.slice(1, -1);
        }

        if (!value || process.env[key]) continue;

        if ((SERVER_ONLY_KEYS as readonly string[]).includes(key)) {
            // Sunucu sırrı: sadece çalışan Node sürecine verilir, bundle'a girmez.
            process.env[key] = value;
            continue;
        }

        // Tarayıcıya yalnızca NEXT_PUBLIC_* değişkenleri gider; gerisi burada işimize yaramaz.
        if (!key.startsWith("NEXT_PUBLIC_")) continue;

        values[key] = value;
    }

    return values;
}

/**
 * Canlı adres kontrolü.
 *
 * Katı mod (hatalar build'i durdurur) şu durumlarda açıktır:
 * - DEPLOY_ENV=production verildiyse (her zaman), veya
 * - NODE_ENV=production ise (yani `next build`) ve DEPLOY_ENV=local DEĞİLSE.
 *
 * Böylece canlı pipeline DEPLOY_ENV'i unutsa bile yanlış adreslerle build çıkamaz.
 * Yerel makinede `npm run build` almak için kök .env'e `DEPLOY_ENV=local` yazılır;
 * o zaman aynı kontroller yalnızca uyarı olarak basılır. `next dev` her zaman esnektir.
 */
function validateEnvironment(env: Record<string, string>): void {
    const deployEnv = process.env.DEPLOY_ENV;
    const isProductionBuild = process.env.NODE_ENV === "production";
    const strict = deployEnv === "production" || (isProductionBuild && deployEnv !== "local");

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || env.NEXT_PUBLIC_API_BASE;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const internalKey = process.env.API_INTERNAL_KEY;

    const errors: string[] = [];

    // SITE_URL kontrolü
    if (!siteUrl) {
        errors.push("NEXT_PUBLIC_SITE_URL tanımlı değil.");
    } else if (/localhost|127\.0\.0\.1/i.test(siteUrl)) {
        errors.push(`NEXT_PUBLIC_SITE_URL localhost içeremez: "${siteUrl}"`);
    } else if (!siteUrl.startsWith("https://")) {
        errors.push(`NEXT_PUBLIC_SITE_URL https:// ile başlamalıdır: "${siteUrl}"`);
    }

    // API_BASE kontrolü
    if (!apiBase) {
        errors.push("NEXT_PUBLIC_API_BASE tanımlı değil.");
    } else if (/localhost|127\.0\.0\.1/i.test(apiBase)) {
        errors.push(`NEXT_PUBLIC_API_BASE localhost içeremez: "${apiBase}"`);
    } else if (!apiBase.startsWith("https://")) {
        errors.push(`NEXT_PUBLIC_API_BASE https:// ile başlamalıdır: "${apiBase}"`);
    }

    // Sunucudan API'ye giden istekleri hız sınırından muaf tutan iç anahtar
    if (!internalKey) {
        errors.push("API_INTERNAL_KEY tanımlı değil (sunucu → API istekleri hız sınırına takılır).");
    }

    // Google zorunlu giriş sağlayıcısıdır (Facebook isteğe bağlı); kimliği yoksa kimse giriş yapamaz.
    if (!googleClientId) {
        errors.push("NEXT_PUBLIC_GOOGLE_CLIENT_ID tanımlı değil (canlıda Google girişi çalışmaz).");
    }

    if (errors.length === 0) return;

    if (strict) {
        console.error("\n❌ [CANLI DAĞITIM HATASI] Ortam değişkenleri geçersiz:");
        for (const err of errors) console.error(`   - ${err}`);
        console.error(
            "\nCanlı build için ortamda geçerli https:// adresleri ve API_INTERNAL_KEY tanımlanmalıdır. " +
                "Yerel bir deneme build'i için kök .env dosyasına DEPLOY_ENV=local yazın.\n",
        );
        throw new Error(`Canlı dağıtım build doğrulaması başarısız oldu: ${errors.join("; ")}`);
    }

    if (process.env.NODE_ENV !== "test") {
        console.warn("\n⚠️  [Yerel Geliştirme Uyarısı] Ortam değişkenleri canlı standartlarına uymuyor (yerelde normaldir):");
        for (const w of errors) console.warn(`   - ${w}`);
        console.warn("");
    }
}

const rootEnv = loadRootEnv();
validateEnvironment(rootEnv);

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
    env: rootEnv,
    // Geliştirmeye özel: telefondan / ngrok üzerinden bağlanırken tarayıcı göreli
    // /api ve /media adreslerini kullanır (bkz. lib/urls.ts); bu rewrite'lar onları
    // yerel .NET API'sine iletir. Canlıda tarayıcı doğrudan NEXT_PUBLIC_API_BASE'e
    // gittiği için bu bloklar üretilmez (rewrites build anında sabitlenir).
    ...(isDev
        ? {
              allowedDevOrigins: [
                  "*.ngrok-free.dev",
                  "*.ngrok-free.app",
                  "*.ngrok.app",
                  "localhost:3000",
                  "127.0.0.1:3000",
              ],
              async rewrites() {
                  const api = (process.env.NEXT_PUBLIC_API_BASE || rootEnv.NEXT_PUBLIC_API_BASE || "http://localhost:5026").replace(/\/+$/, "");
                  return [
                      { source: "/api/:path*", destination: `${api}/api/:path*` },
                      { source: "/media/:path*", destination: `${api}/media/:path*` },
                      { source: "/blog_backgrounds/:path*", destination: `${api}/blog_backgrounds/:path*` },
                  ];
              },
          }
        : {}),
};

export default nextConfig;
