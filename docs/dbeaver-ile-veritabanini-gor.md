# Veritabanını Gözlerinle Görmek 👀 (DBeaver ile)

Merhaba canım! 🌷 Bu belge, projedeki bilgilerin (parfümler, markalar, yorumlar…)
saklandığı **veritabanını** kendi gözlerinle, tıpkı bir Excel tablosu gibi
görmen için yazıldı. Korkma, hiçbir şeyi bozmazsın — biz sadece **bakacağız**.

**DBeaver** dediğimiz şey, bu tabloları güzelce gösteren **ücretsiz** bir program.
Hepsi bu. Şimdi adım adım gidelim, acelemiz yok. ☕

---

## 1. Adım — DBeaver'ı kur

Bir kereye mahsus, programı bilgisayara indiriyoruz.

- İnternette şu adrese git: **https://dbeaver.io/download/**
- **DBeaver Community** (ücretsiz olan) yazanı indir, kur. İleri-ileri-bitti. ✅

> Bilgisayarda Terminal kullanmayı seviyorsan tek satırla da olur:
> `brew install --cask dbeaver-community`

---

## 2. Adım — Veritabanının "açık" olduğundan emin ol

Veritabanı **PostgreSQL** adlı bir motorla çalışıyor ve genelde açıktır.
Emin olmak istersen Terminal'e şunu yaz, `accepting connections` yazıyorsa her şey yolunda:

```
pg_isready
```

Yazmıyorsa şununla başlat: `brew services start postgresql@15`

---

## 3. Adım — DBeaver'ı aç ve bağlantı kur

1. DBeaver açılınca sol üstte **fişli priz gibi bir simge** (ya da **Database → New Database Connection**) var, ona tıkla.
2. Listeden **PostgreSQL**'i seç, **Next / İleri** de.
3. Karşına küçük kutucuklar çıkacak. **Aynen şöyle** doldur:

| Kutu | Ne yazacaksın |
|------|----------------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `perfume_comparer` |
| **Username** | `ramazankizilkaya` |
| **Password** | *(boş bırak — şifre yok)* |

4. Alt köşedeki **Test Connection** düğmesine bas.
   İlk kez sürücü indirmek isterse **Download / İndir** de, izin ver.
5. **"Connected / Bağlandı"** ✅ yazısını görünce **Finish / Bitir** de.

Tebrikler, bağlandın! 🎉

---

## 4. Adım — Tabloları gez ve içine bak

1. Solda ağaç gibi bir liste açılır. Şu sırayla oklara tıklayarak aç:
   **perfume_comparer → Schemas → public → Tables**
2. Altında bir sürü tablo göreceksin: `perfumes`, `brands`, `notes`, `comments`, `app_users`…
3. Görmek istediğin tablonun üstüne **çift tıkla**, sağda açılan pencerede
   **Data / Veri** sekmesine geç. İşte satırlar tıpkı Excel gibi karşında! 🧾

---

## Rahat ol 💛

- Sadece bakmakla **hiçbir şey bozulmaz.**
- Bir şey karışırsa DBeaver'ı kapatıp açman yeter, veriye dokunmaz.
- Takılırsan bana sor, birlikte hallederiz.

Kolay gelsin! 🌼
