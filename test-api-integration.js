/**
 * اختبار ربط Frontend مع Backend API
 * يمكن تشغيله في console المتصفح أو Node.js
 */

const API_BASE_URL = 'http://localhost:8000';

async function testAPI() {
  console.log('============================================================');
  console.log('🚀 اختبار ربط Frontend مع Backend API');
  console.log('============================================================\n');

  const results = [];

  // 1. Health Check
  try {
    console.log('🔍 اختبار Health Check...');
    const response = await fetch(`${API_BASE_URL}/health/`);
    const data = await response.json();
    console.log('✅ Health Check:', data.status);
    results.push({ test: 'Health Check', status: 'success', data });
  } catch (error) {
    console.error('❌ Health Check failed:', error);
    results.push({ test: 'Health Check', status: 'failed', error: error.message });
  }

  // 2. Models List
  try {
    console.log('\n📋 اختبار قائمة النماذج...');
    const response = await fetch(`${API_BASE_URL}/api/v1/models/list`);
    const data = await response.json();
    console.log(`✅ تم العثور على ${data.count} نموذج`);
    console.log('النماذج:', Object.keys(data.models));
    results.push({ test: 'Models List', status: 'success', count: data.count });
  } catch (error) {
    console.error('❌ Models List failed:', error);
    results.push({ test: 'Models List', status: 'failed', error: error.message });
  }

  // 3. Model Info
  try {
    console.log('\nℹ️  اختبار معلومات النموذج...');
    const response = await fetch(`${API_BASE_URL}/api/v1/models/food_value/info`);
    const data = await response.json();
    console.log('✅ Model Info:', data.framework, data.loaded ? '(محمل)' : '(غير محمل)');
    results.push({ test: 'Model Info', status: 'success', framework: data.framework });
  } catch (error) {
    console.error('❌ Model Info failed:', error);
    results.push({ test: 'Model Info', status: 'failed', error: error.message });
  }

  // 4. Model Predict
  try {
    console.log('\n🤖 اختبار استدعاء النموذج...');
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/v1/models/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_name: 'food_value',
        input_data: {
          ideal_temp: 4.0,
          is_high_risk: true,
          sensitivity: 0.8,
          total_trip_hours: 5.0,
          recorded_temp: 8.0,
          hours_above_threshold: 2.0,
        },
      }),
    });
    const elapsed = Date.now() - startTime;
    const data = await response.json();
    console.log(`✅ Prediction: Quality Score = ${data.prediction.quality_score.toFixed(2)}`);
    console.log(`   Action: ${data.prediction.action}`);
    console.log(`   Time: ${elapsed}ms`);
    results.push({ test: 'Model Predict', status: 'success', qualityScore: data.prediction.quality_score });
  } catch (error) {
    console.error('❌ Model Predict failed:', error);
    results.push({ test: 'Model Predict', status: 'failed', error: error.message });
  }

  // 5. LLaMA Status
  try {
    console.log('\n🤖 اختبار حالة LLaMA...');
    const response = await fetch(`${API_BASE_URL}/api/v1/llama/status`);
    const data = await response.json();
    console.log('✅ LLaMA Status:', data.status);
    results.push({ test: 'LLaMA Status', status: 'success', llamaStatus: data.status });
  } catch (error) {
    console.error('❌ LLaMA Status failed:', error);
    results.push({ test: 'LLaMA Status', status: 'failed', error: error.message });
  }

  // 6. LLaMA Generate
  try {
    console.log('\n💬 اختبار توليد نص من LLaMA...');
    const startTime = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/v1/llama/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'مرحبا، كيف يمكنني تقليل الهدر الغذائي؟',
        max_tokens: 50,
        temperature: 0.7,
      }),
    });
    const elapsed = Date.now() - startTime;
    const data = await response.json();
    console.log(`✅ LLaMA Response: ${data.response.substring(0, 50)}...`);
    console.log(`   Time: ${elapsed}ms`);
    results.push({ test: 'LLaMA Generate', status: 'success', responseLength: data.response.length });
  } catch (error) {
    console.error('❌ LLaMA Generate failed:', error);
    results.push({ test: 'LLaMA Generate', status: 'failed', error: error.message });
  }

  // النتائج النهائية
  console.log('\n============================================================');
  console.log('📊 نتائج الاختبارات');
  console.log('============================================================');
  const passed = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  results.forEach(r => {
    console.log(`${r.status === 'success' ? '✅' : '❌'} ${r.test}: ${r.status}`);
  });
  console.log(`\nالإجمالي: ${passed} نجح، ${failed} فشل`);
  
  if (failed === 0) {
    console.log('\n🎉 جميع الاختبارات نجحت!');
  }

  return results;
}

// للاستخدام في Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testAPI;
  // تشغيل تلقائي إذا تم استدعاء الملف مباشرة
  if (require.main === module) {
    testAPI().catch(err => {
      console.error('Test failed:', err);
      process.exit(1);
    });
  }
}

// للاستخدام في المتصفح
if (typeof window !== 'undefined') {
  window.testAPI = testAPI;
}

