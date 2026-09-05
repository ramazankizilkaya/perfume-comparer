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

const nextConfig: NextConfig = {
    env: loadRootEnv(),
};

export default nextConfig;
