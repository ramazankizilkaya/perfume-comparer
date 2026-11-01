const pending = new Map<string, Promise<void>>();

/**
 * Üçüncü taraf giriş SDK'sını (Facebook) sayfaya bir kez ekler. Aynı id ile tekrar
 * çağrılırsa ikinci bir <script> eklenmez; ilk yüklemenin sonucu paylaşılır.
 */
export function loadScript(id: string, src: string): Promise<void> {
    const known = pending.get(id);
    if (known) return known;

    const promise = new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.id = id;
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
            pending.delete(id);
            s.remove();
            reject(new Error(`${id} yüklenemedi`));
        };
        document.body.appendChild(s);
    });
    pending.set(id, promise);
    return promise;
}
