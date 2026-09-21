<div dir="rtl">

# قالب اشتراک وایرگارد

صفحه‌ی اشتراک برای پنل‌های [PasarGuard](https://github.com/PasarGuard/panel) که **فقط کانفیگ وایرگارد** سرو می‌کنن.
مشتری فایل `.conf` رو دانلود می‌کنه یا کد QR رو اسکن می‌کنه — هیچ چیزی برای کپی کردن نیست.

فورک‌شده از [PasarGuard/subscription-template](https://github.com/PasarGuard/subscription-template).

## فرق با نسخه‌ی اصلی

| | نسخه اصلی | این فورک |
| --- | --- | --- |
| ردیف لینک اشتراک | با دکمه‌ی کپی و QR | حذف شده |
| عنوان بخش | لینک کانفیگ ها | **دانلود کانفیگ‌ها** |
| دکمه‌ی بالا | کپی همه کانفیگ‌ها | **دانلود همه کانفیگ‌ها** (واقعاً دانلود می‌کنه) |
| دکمه‌های هر کانفیگ | کپی، QR، دانلود | **دانلود کانفیگ** و **کد QR**، هر دو با متن |
| مودال QR | کپی کانفیگ، کپی Base64، دانلود | QR + **دانلود کانفیگ** |

بقیه‌ی صفحه — کارت وضعیت، چارت مصرف، آمار ترافیک، لیست اپ‌ها، چهار زبان، دارک‌مود و راست‌چین — دست‌نخورده‌ست.

دو تا رفع باگ هم نسبت به نسخه‌ی اصلی داره:

- اگه دو کانفیگ اسم یکسان داشته باشن، دیگه فایل دومی روی اولی نمی‌افته (`TR.conf` و `TR-2.conf`).
- `install.sh` اول تو فایل موقت دانلود می‌کنه و اعتبارش رو چک می‌کنه، پس دانلود ناموفق دیگه نمی‌تونه صفحه‌ی مشتری‌هات رو سفید کنه. یه نسخه‌ی `.bak` هم برای برگشت نگه می‌داره.

## نصب سریع

روی سروری که پنل پاسارگارد روش نصبه:

```sh
curl -fsSL https://raw.githubusercontent.com/mihajlisinkil/wg-subscription-template/main/install.sh \
  | sudo bash -s -- --lang fa
```

مقادیر مجاز `--lang`: ‏`en`، `fa`، `zh`، `ru`. مقادیر `--version`: ‏`latest` (پیش‌فرض) یا تگ ریلیز مثل `v1.0.0`.

اسکریپت، صفحه‌ی از قبل بیلدشده رو از ریلیزهای همین ریپو دانلود می‌کنه، می‌ذاردش تو
`/var/lib/pasarguard/templates/subscription/index.html`، پنل رو بهش وصل می‌کنه و ری‌استارت می‌زنه.
سرور اصلاً به Node یا Bun نیاز نداره.

## نصب دستی

```sh
sudo mkdir -p /var/lib/pasarguard/templates/subscription
sudo curl -fsSL -o /var/lib/pasarguard/templates/subscription/index.html \
  https://github.com/mihajlisinkil/wg-subscription-template/releases/latest/download/index.html
```

بعد توی `/opt/pasarguard/.env`:

```dotenv
CUSTOM_TEMPLATES_DIRECTORY="/var/lib/pasarguard/templates/"
SUBSCRIPTION_PAGE_TEMPLATE="subscription/index.html"
```

و ری‌استارت:

```sh
pasarguard restart
```

## انتشار نسخه‌ی جدید

ورک‌فلوی ریلیز برای هر زبان یک فایل HTML تک‌تکه می‌سازه و به ریلیز می‌چسبونه —
‏`index.html` (فارسی، پیش‌فرض)، `en.html`، `ru.html`، `zh.html`.

۱. تغییرات رو پوش کن روی `main`
۲. تو گیت‌هاب: **Releases ← Draft a new release**، یه تگ مثل `v1.0.0` بساز و منتشرش کن
۳. صبر کن ورک‌فلوی **Release** تموم بشه، بعد دستور نصب بالا رو بزن

ورک‌فلو فقط با انتشار ریلیز اجرا می‌شه، با تگ خالی اجرا نمی‌شه.

## بیلد از سورس

```sh
bun install
VITE_FALLBACK_LANGUAGE=fa bun run build
sudo cp dist/index.html /var/lib/pasarguard/templates/subscription/index.html
```

## شخصی‌سازی ظاهر

این‌ها رو قبل از بیلد توی `.env` بذار:

```dotenv
VITE_PRIMARY_COLOR_LIGHT=oklch(0.48 0.11 250)
VITE_PRIMARY_COLOR_DARK=oklch(0.60 0.12 250)
VITE_BORDER_RADIUS=0.65rem
VITE_FALLBACK_LANGUAGE=fa
```

</div>
