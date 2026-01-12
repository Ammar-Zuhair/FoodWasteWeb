# دليل المزامنة التلقائية مع Android Studio

## نظرة عامة

تم إعداد نظام مراقبة تلقائي لمزامنة التغييرات مع Android Studio. عند تعديل أي ملف في `src/` أو `dist/`، سيتم تلقائياً:

1. مراقبة التغييرات
2. مزامنة التغييرات مع Capacitor
3. تحديث Android Studio تلقائياً

## الطريقة الأولى: استخدام Watch Mode (موصى به)

### على Windows:
```bash
cd frontend
npm run watch:sync
```

أو مباشرة:
```bash
cd frontend
.\watch-and-sync.bat
```

### على Linux/Mac:
```bash
cd frontend
npm run watch:sync
```

أو مباشرة:
```bash
cd frontend
chmod +x watch-and-sync.sh
./watch-and-sync.sh
```

## الطريقة الثانية: Build + Sync يدوياً

### خطوة واحدة:
```bash
cd frontend
npm run cap:build:android
```

### خطوات منفصلة:
```bash
# 1. بناء المشروع
npm run build

# 2. مزامنة مع Capacitor
npm run cap:sync

# 3. فتح Android Studio (اختياري)
npm run cap:open:android
```

## الطريقة الثالثة: Development Mode مع Auto-Sync

لتطوير سريع مع مزامنة تلقائية:

```bash
# Terminal 1: تشغيل Vite dev server
npm run dev

# Terminal 2: تشغيل watch mode للمزامنة
npm run watch:sync
```

## كيف يعمل Watch Mode؟

1. **مراقبة الملفات**: يراقب `src/` و `dist/` للتغييرات
2. **Debouncing**: ينتظر 3 ثوانٍ بعد آخر تغيير قبل المزامنة
3. **Auto Sync**: يقوم بـ `npx cap sync android` تلقائياً
4. **Android Studio**: يكتشف التغييرات تلقائياً ويقترح إعادة تحميل

## ملاحظات مهمة

### ✅ ما يتم مزامنته تلقائياً:
- ملفات `src/**/*` (JSX, JS, CSS, إلخ)
- ملفات `dist/**/*` (الملفات المبنية)
- ملفات التكوين (`capacitor.config.json`, `package.json`)

### ❌ ما لا يتم مزامنته:
- `node_modules/`
- `.git/`
- ملفات `.map` (source maps)

### 🔄 متى تحتاج لإعادة بناء APK؟
- عند تغيير `capacitor.config.json`
- عند إضافة/إزالة plugins
- عند تغيير `AndroidManifest.xml` أو `build.gradle`

في هذه الحالات، قم بـ:
```bash
npm run cap:build:android
```

## استكشاف الأخطاء

### المشكلة: Watch mode لا يعمل
**الحل**: تأكد من تثبيت chokidar:
```bash
npm install --save-dev chokidar
```

### المشكلة: Android Studio لا يكتشف التغييرات
**الحل**: 
1. في Android Studio: File → Sync Project with Gradle Files
2. أو: Build → Rebuild Project

### المشكلة: التغييرات لا تظهر في التطبيق
**الحل**:
1. تأكد من أن التطبيق يعمل في وضع التطوير
2. أعد تشغيل التطبيق في Android Studio
3. تحقق من أن `capacitor.config.json` يحتوي على:
```json
"server": {
  "url": "http://YOUR_IP:5173"
}
```

## نصائح للعمل بكفاءة

1. **استخدم Watch Mode أثناء التطوير**: افتح terminal منفصل واتركه يعمل
2. **Android Studio Sync**: اضغط `Ctrl+Shift+O` (Windows/Linux) أو `Cmd+Shift+O` (Mac) للمزامنة السريعة
3. **Hot Reload**: استخدم `npm run dev` مع `watch:sync` للحصول على تحديثات فورية

## الأوامر المتاحة

| الأمر | الوصف |
|------|-------|
| `npm run watch:sync` | مراقبة تلقائية ومزامنة |
| `npm run cap:sync` | مزامنة يدوية واحدة |
| `npm run cap:build:android` | بناء + مزامنة + فتح Android Studio |
| `npm run cap:open:android` | فتح Android Studio فقط |

---

**ملاحظة**: تأكد من أن Android Studio مفتوح وأن المشروع متزامن قبل بدء Watch Mode للحصول على أفضل تجربة.













