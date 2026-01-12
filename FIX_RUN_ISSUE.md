# حل مشكلة عدم القدرة على Run في Android Studio

## المشاكل الشائعة والحلول

### المشكلة 1: لا يوجد Device متصل

**الحل:**
1. **وصّل الموبايل بالكمبيوتر** عبر USB
2. فعّل **USB Debugging** على الموبايل:
   - Settings > About Phone > Build Number (اضغط 7 مرات)
   - Settings > Developer Options > USB Debugging
3. في Android Studio، اضغط على أيقونة **Device Manager** (في الأسفل)
4. يجب أن يظهر الموبايل في القائمة
5. إذا لم يظهر، اضغط **Refresh** أو **Rescan**

### المشكلة 2: Gradle Sync لم يكتمل

**الحل:**
1. في Android Studio، انتظر حتى يظهر **"Gradle sync finished"** في الأسفل
2. إذا كان هناك أخطاء، اضغط على **Sync Project with Gradle Files** (أيقونة السهم الدائري)
3. أو: **File > Sync Project with Gradle Files**

### المشكلة 3: Build Errors

**الحل:**
1. افتح **Build** tab في الأسفل
2. تحقق من الأخطاء
3. **Build > Clean Project**
4. **Build > Rebuild Project**

### المشكلة 4: لا يوجد Device محدد

**الحل:**
1. في شريط الأدوات العلوي، بجانب زر Run
2. اضغط على القائمة المنسدلة
3. اختر **"No devices"** أو **"Create Virtual Device"**
4. أو وصّل موبايل حقيقي

---

## خطوات حل المشكلة خطوة بخطوة

### الخطوة 1: التحقق من Gradle

```bash
cd frontend/android
./gradlew clean
./gradlew build
```

### الخطوة 2: فتح Device Manager

في Android Studio:
1. **View > Tool Windows > Device Manager**
2. أو اضغط على أيقونة **Device Manager** في الأسفل

### الخطوة 3: إنشاء Virtual Device (إذا لم يكن لديك موبايل)

1. في Device Manager، اضغط **Create Device**
2. اختر جهاز (مثلاً: Pixel 5)
3. اختر System Image (مثلاً: API 33)
4. اضغط **Finish**
5. اضغط **Play** بجانب الجهاز لبدء تشغيله

### الخطوة 4: التحقق من Run Configuration

1. بجانب زر Run، اضغط على القائمة المنسدلة
2. اختر **"app"**
3. تأكد من اختيار device

### الخطوة 5: بناء APK يدوياً (بدون Run)

إذا استمرت المشكلة، يمكنك بناء APK يدوياً:

```bash
cd frontend/android
./gradlew assembleDebug
```

APK سيكون في:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

## بديل: استخدام Android Studio Terminal

1. في Android Studio: **View > Tool Windows > Terminal**
2. اكتب:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
3. بعد اكتمال البناء، انسخ APK إلى الموبايل

---

## التحقق من الأخطاء

### في Android Studio:

1. **Build > Make Project** - للتحقق من الأخطاء
2. افتح **Build** tab في الأسفل
3. تحقق من أي أخطاء في **Logcat**

### في Terminal:

```bash
cd frontend/android
./gradlew assembleDebug --stacktrace
```

---

## حلول سريعة

### 1. Invalidate Caches:
**File > Invalidate Caches / Restart > Invalidate and Restart**

### 2. Sync Gradle:
**File > Sync Project with Gradle Files**

### 3. Clean & Rebuild:
**Build > Clean Project**
**Build > Rebuild Project**

### 4. Check SDK:
**File > Project Structure > SDK Location**
تأكد من تحديد Android SDK

---

## إذا لم يعمل أي شيء

### بناء APK من Terminal:

```bash
cd frontend/android
./gradlew clean
./gradlew assembleDebug
```

ثم انسخ APK إلى الموبايل يدوياً.






