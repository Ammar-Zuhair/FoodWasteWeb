# دليل سريع لبناء APK - لديك Android Studio ✅

## الخطوات السريعة

### 1. ✅ تم فتح Android Studio تلقائياً

المشروع الآن مفتوح في Android Studio.

### 2. انتظر تحميل المشروع

- انتظر حتى يتم تحميل Gradle dependencies
- قد يستغرق 2-5 دقائق في المرة الأولى
- تأكد من ظهور "Gradle sync finished" في الأسفل

### 3. بناء APK

#### أ. Debug APK (للاختبار):

1. من القائمة العلوية: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. انتظر حتى يكتمل البناء (1-2 دقيقة)
3. سيظهر إشعار في الأسفل: **APK(s) generated successfully**
4. اضغط على **locate** في الإشعار

**موقع APK:**
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

#### ب. أو استخدم Terminal:

```bash
cd frontend/android
./gradlew assembleDebug
```

APK سيكون في:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. تثبيت APK على الموبايل

#### الطريقة 1: USB Debugging (الأسهل)

1. فعّل **Developer Options** على الموبايل:
   - Settings > About Phone > Build Number (اضغط 7 مرات)
2. فعّل **USB Debugging**:
   - Settings > Developer Options > USB Debugging
3. وصّل الموبايل بالكمبيوتر
4. في Android Studio: **Run > Run 'app'**
5. اختر الموبايل من القائمة
6. سيتم تثبيت التطبيق تلقائياً!

#### الطريقة 2: نقل APK يدوياً

1. انسخ `app-debug.apk` إلى الموبايل
2. على الموبايل، افتح APK
3. فعّل **Install from Unknown Sources** إذا طُلب
4. اضغط **Install**

---

## 🔍 التحقق من البناء

### في Android Studio:

1. **Build > Make Project** - للتحقق من عدم وجود أخطاء
2. **Build > Rebuild Project** - لإعادة البناء الكامل

### في Terminal:

```bash
cd frontend/android
./gradlew clean
./gradlew assembleDebug
```

---

## ⚠️ استكشاف الأخطاء الشائعة

### المشكلة: "SDK location not found"
**الحل:**
1. في Android Studio: **File > Project Structure > SDK Location**
2. حدد موقع Android SDK (عادة: `C:\Users\YOUR_USER\AppData\Local\Android\Sdk`)
3. أو أنشئ `android/local.properties`:
   ```
   sdk.dir=C\:\\Users\\YOUR_USER\\AppData\\Local\\Android\\Sdk
   ```

### المشكلة: "Gradle sync failed"
**الحل:**
1. **File > Invalidate Caches / Restart**
2. اختر **Invalidate and Restart**
3. انتظر إعادة التشغيل
4. **File > Sync Project with Gradle Files**

### المشكلة: "Build failed"
**الحل:**
1. تحقق من Logcat في Android Studio
2. امسح `android/.gradle` و `android/app/build`
3. **Build > Clean Project**
4. **Build > Rebuild Project**

---

## 📱 اختبار التطبيق

بعد تثبيت APK:

1. ✅ افتح التطبيق
2. ✅ سجّل الدخول (`driver1` / `driver123`)
3. ✅ تحقق من GPS - يجب أن يطلب الإذن
4. ✅ تحقق من الإشعارات - يجب أن يطلب الإذن
5. ✅ اختر شحنة للبدء بتتبعها
6. ✅ تحقق من تحديث الموقع تلقائياً

---

## 🎯 الميزات المتاحة

- ✅ GPS Tracking تلقائي
- ✅ تحديث موقع الشحنة تلقائياً
- ✅ إشعارات فورية
- ✅ WebSocket للتحديثات الفورية
- ✅ تتبع درجة الحرارة

---

## 📝 ملاحظات

- **Debug APK** للاختبار فقط (~50MB)
- **Release APK** للتوزيع (~20MB) - يحتاج Keystore
- APK جاهز للتثبيت على أي جهاز Android

---

## 🚀 الخطوة التالية

بعد بناء APK بنجاح:
1. اختبره على الموبايل
2. تأكد من عمل جميع الميزات
3. يمكنك بناء Release APK للتوزيع






