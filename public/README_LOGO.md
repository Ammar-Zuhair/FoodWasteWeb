# إضافة شعار الشركة

## الخطوات:

1. ضع ملف الشعار في مجلد `public/` باسم `logo.png` أو `logo.svg`
2. افتح ملف `src/components/shared/Logo.jsx`
3. استبدل الكود الحالي بـ:

```jsx
function Logo({ className = "" }) {
  return (
    <img 
      src="/logo.png" 
      alt="HSA Logo" 
      className={`h-12 w-auto object-contain ${className}`}
    />
  );
}
```

أو إذا كان الشعار SVG:

```jsx
function Logo({ className = "" }) {
  return (
    <img 
      src="/logo.svg" 
      alt="HSA Logo" 
      className={`h-12 w-auto object-contain ${className}`}
    />
  );
}
```

## ملاحظات:
- الشعار سيظهر تلقائياً في Header و LoginPage
- يمكن تعديل الحجم بتغيير `h-12` إلى الحجم المناسب











