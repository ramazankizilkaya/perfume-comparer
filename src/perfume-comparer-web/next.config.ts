import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { NextConfig } from "next";

/**
 * Depo kökündeki `.env` dosyasını okur. Next yalnızca kendi klasöründeki .env
 * dosyalarını otomatik yükler; sırlar tek dosyada toplansın diye kökteki dosyayı
 * burada elle okuyoruz. Ortamda tanımlı gerçek değişkenler ezilmez, böylece
 * deploy'da .env olmadan da çalışır.
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

        // Tarayıcıya yalnızca NEXT_PUBLIC_* değişkenleri gider; gerisi burada işimize yaramaz.
        if (!key.startsWith("NEXT_PUBLIC_") || !value) continue;
        if (process.env[key]) continue;

        values[key] = value;
    }

    return values;
}

function validateEnvironment(env: Record<string, string>): void {
    const isDeployProduction = process.env.DEPLOY_ENV === "production";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || env.NEXT_PUBLIC_API_BASE;

    const errors: string[] = [];
    const warnings: string[] = [];

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

    if (isDeployProduction) {
        if (errors.length > 0) {
            console.error("\n❌ [CANLI DAĞITIM HATASI] Ortam değişkenleri geçersiz:");
            for (const err of errors) {
                console.error(`   - ${err}`);
            }
            console.error("\nCanlı dağıtım build'i için .env dosyasında veya ortamda geçerli https:// adresleri tanımlanmalıdır.\n");
            throw new Error(`Canlı dağıtım build doğrulaması başarısız oldu: ${errors.join("; ")}`);
        }
    } else {
        if (errors.length > 0) {
            warnings.push(...errors);
        }
        if (warnings.length > 0 && process.env.NODE_ENV !== "test") {
            console.warn("\n⚠️  [Yerel Geliştirme Uyarısı] Ortam değişkenleri canlı standartlarına uymuyor (yerelde normaldir):");
            for (const w of warnings) {
                console.warn(`   - ${w}`);
            }
            console.warn("");
        }
    }
}

const rootEnv = loadRootEnv();
validateEnvironment(rootEnv);

const nextConfig: NextConfig = {
    env: rootEnv,
};

export default nextConfig;
