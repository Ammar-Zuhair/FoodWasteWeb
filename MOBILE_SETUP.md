# إعداد التطبيق على الموبايل

## المشكلة
عند تشغيل التطبيق على الموبايل (APK)، لا يمكنه الاتصال بقاعدة البيانات لأن `localhost` على الموبايل يشير إلى الجهاز نفسه وليس الكمبيوتر.

## الحل

### الخطوة 1: معرفة IP address للكمبيوتر

1. افتح **Command Prompt** أو **PowerShell** على الكمبيوتر
2. اكتب:
   ```bash
   ipconfig
   ```
3. ابحث عن **IPv4 Address** تحت **Wi-Fi** أو **Ethernet**
4. مثال: `192.168.8.184`

### الخطوة 2: إنشاء ملف `.env.local` في مجلد `frontend`

1. أنشئ ملف جديد باسم `.env.local` في مجلد `frontend`
2. أضف المحتوى التالي (استبدل IP address بآخر جهازك):

```env
VITE_API_URL=http://192.168.8.184:8000
VITE_LLAMA_URL=http://192.168.8.184:8001
```

**مهم:** استبدل `192.168.8.184` بـ IP address جهازك!

### الخطوة 3: التأكد من أن Backend يعمل

1. افتح **Terminal** في مجلد `backend`
2. شغّل:
   ```bash
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   
   **مهم:** استخدم `--host 0.0.0.0` وليس `localhost` حتى يقبل الاتصالات من الشبكة المحلية!

### الخطوة 4: التأكد من أن الكمبيوتر والموبايل على نفس الشبكة

- يجب أن يكون الكمبيوتر والموبايل متصلين بنفس Wi-Fi
- أو استخدم Hotspot من الكمبيوتر

### الخطوة 5: إعادة بناء التطبيق

```bash
cd frontend
npm run build
npx cap sync
```

### الخطوة 6: بناء APK جديد في Android Studio

1. افتح Android Studio
2. File > Sync Project with Gradle Files
3. Build > Build Bundle(s) / APK(s) > Build APK(s)

### الخطوة 7: اختبار الاتصال

1. ثبت APK على الموبايل
2. افتح التطبيق
3. حاول تسجيل الدخول
4. إذا لم يعمل، تحقق من:
   - أن Backend يعمل على الكمبيوتر
   - أن IP address صحيح في `.env.local`
   - أن الكمبيوتر والموبايل على نفس الشبكة
   - أن Firewall على الكمبيوتر يسمح بالاتصالات على Port 8000

## استكشاف الأخطاء

### الخطأ: "Network request failed"
- تحقق من أن Backend يعمل
- تحقق من IP address في `.env.local`
- تحقق من أن الكمبيوتر والموبايل على نفس الشبكة

### الخطأ: "Connection refused"
- تأكد من استخدام `--host 0.0.0.0` عند تشغيل Backend
- تحقق من Firewall على الكمبيوتر

### الخطأ: "CORS error"
- تم إصلاح هذا في Backend - تأكد من إعادة تشغيل Backend بعد التحديثات

## ملاحظات

- IP address قد يتغير إذا انقطع الاتصال بالشبكة
- في حالة تغيير IP، حدّث `.env.local` وأعد بناء التطبيق
- للإنتاج، استخدم domain name بدلاً من IP address



