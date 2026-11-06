/**
 * Seçilen görsel dosyasını tarayıcıda Canvas üzerinden WebP biçimine dönüştürür.
 * Tarayıcı dönüştürmeyi desteklemiyorsa veya hata oluşursa orijinal dosyayı döner
 * (sunucu tarafı da ayrıca WebP'ye dönüştürür).
 */
export async function convertFileToWebp(
    file: File,
    maxDimension = 1920,
    quality = 0.85
): Promise<File> {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return file;
    }

    try {
        const bitmap = await loadImageElement(file);
        let { width, height } = bitmap;

        if (width <= 0 || height <= 0) {
            return file;
        }

        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return file;

        ctx.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/webp", quality)
        );

        if (!blob || blob.type !== "image/webp") {
            return file;
        }

        const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
        return new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
        });
    } catch {
        return file;
    }
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
        img.src = url;
    });
}

