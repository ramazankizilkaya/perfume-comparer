# Shofy özgün sayfa önizlemeleri

Bu üç HTML, 13 Eylül 2026 tarihinde Shofy'nin herkese açık demosunda yüklenmiş DOM'dan alınmıştır; yeni bir tema veya Aura Compare uygulaması değildir.

- `anasayfa.html`: Shofy ana sayfası ve kendi örnek ürünleri.
- `parfum.html`: Parfüm detay sayfası için değerlendirilen özgün ürün detay düzeni; Shofy'nin bileklik örnek verisi korunmuştur.
- `arama.html`: Shofy katalog düzeni ve kaydedilen 12 ürün üzerinde metin araması.

HTML, CSS, görseller ve yazı tipleri yereldir; kaynak adresleri `sources.json` dosyasındadır. Özgün İngilizce metinler, renkler ve mobil kırılımlar korunmuştur. Açık/koyu tema eklenmemiştir; kaynak tema açık görünüm sunar. React kaynak paketi veya tema lisansı bu dosyalara dahil değildir.

Menü açma/kapatma, detay sekmeleri, liste/ızgara geçişi, metin araması ve üç demo arasındaki bağlantılar yerel olarak çalışır. Kaynak sunucuya yazma işlemleri yapılmaz; sepet, ödeme, hesap, gelişmiş filtreler, sayfalama ve ürün seçimine göre detay değişimi bu görsel önizlemenin parçası değildir. Tüm yerel ürün bağlantıları aynı örnek detaya gider; diğer sayfa bağlantıları özgün demoyu açar. Slaytlar ilk görüntüde sabitlenmiştir.

Dosyaları doğrudan tarayıcıda açabilir veya bu klasörde `python3 -m http.server 8766 --bind 127.0.0.1` çalıştırabilirsiniz. Yerel adres: `http://127.0.0.1:8766/anasayfa.html`.
