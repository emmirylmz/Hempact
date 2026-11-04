<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Hempact: Çalışma Kuralları

- Kullanıcıyla **Türkçe** konuş. Proje **canlıda** (hempactly.com): kullanıcı açıkça onaylamadan **commit/push yapılmaz**.
- Yeni faz ya da büyük iş kullanıcı onayı olmadan başlamaz. Tasarım değişikliklerinde önce maket, sonra uygulama.
- 12 sahnelik scroll-hikâye sırası, anlatım mantığı ve palet ailesi korunur.
- `docs/mobil.md` bağlayıcıdır; `docs/denetim-baslangic.md` bilinen sorunların listesidir.

## Orkestrasyon (Kleven modeli)
Ana oturum **şef**tir: işi böler, ajanlara verir, sonuçları derler, `kalite-kontrol`'den geçirir, geri bildirimle düzelttirir ve kullanıcıya raporlar. Büyük işi kendisi yapmaz.

| Ajan (`.claude/agents/`) | Alan |
|---|---|
| `tasarim-direktoru` | Görsel dil, token'lar, maketler, tasarım denetimi |
| `on-yuz-gelistirici` | Sahneler, GSAP, mobil koşular, medya, performans kodu |
| `kalite-kontrol` | Ekran görüntüsü, erişilebilirlik, Lighthouse, kod incelemesi (kod yazmaz) |

- Aynı anda en fazla 5 ajan; aynı dosyaya iki ajan yazmaz.
- Her teslim kullanıcıya gitmeden önce `kalite-kontrol`'den geçer.
- Ajanlar dersleri `.claude/agents/knowledge/` altına yazar. Skill'ler `.claude/skills/` (Kleven'den kopyalandı).
