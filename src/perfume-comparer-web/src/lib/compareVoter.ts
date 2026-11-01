import { readLocal, writeLocal } from "./clientStore";

const VOTER_ID_KEY = "compare-voter-id";

function newVoterId(): string {
    // randomUUID yalnızca güvenli bağlamda (https/localhost) vardır; yerel ağdan http ile
    // açılan sayfada getRandomValues'a düşülür. API yalnızca harf, rakam ve tire kabul eder.
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Giriş yapmamış ziyaretçinin karşılaştırma oyları için tarayıcıya yazılan anonim kimlik.
 * API çift başına bu kimlik başına tek oy sayar. Girişli kullanıcıda sunucu kullanıcı
 * id'sini kullanır, ama başlık yine de gönderilir. Yalnızca tarayıcıda çağrılmalıdır.
 */
export function getVoterId(): string {
    const existing = readLocal<string | null>(VOTER_ID_KEY, null);
    if (existing) return existing;

    const fresh = newVoterId();
    writeLocal(VOTER_ID_KEY, fresh);
    return fresh;
}
