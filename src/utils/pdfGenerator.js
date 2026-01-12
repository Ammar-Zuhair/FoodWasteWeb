import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// تحويل الصورة إلى base64
const imageToBase64 = (imagePath) => {
  return new Promise((resolve, reject) => {
    fetch(imagePath)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = imagePath;
      });
  });
};

// إنشاء HTML للتقرير
const createReportHTML = (reportData, selectedSections, language, logoBase64) => {
  const periodText =
    language === "ar"
      ? reportData.selectedPeriod === "week"
        ? "أسبوع"
        : reportData.selectedPeriod === "month"
          ? "شهر"
          : reportData.selectedPeriod === "quarter"
            ? "ربع سنوي"
            : "سنة"
      : reportData.selectedPeriod.charAt(0).toUpperCase() + reportData.selectedPeriod.slice(1);

  let html = `
    <!DOCTYPE html>
    <html dir="${language === "ar" ? "rtl" : "ltr"}" lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${language === "ar" ? "تقرير شامل" : "Comprehensive Report"}</title>
      <style>
        @font-face {
          font-family: 'Cairo';
          font-style: normal;
          font-weight: 400;
          font-display: swap;
          src: local('Cairo'), 
               local('Cairo-Regular'),
               local('Segoe UI'),
               local('Tahoma'),
               local('Arial Unicode MS');
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', 'Tahoma', 'Arial Unicode MS', 'Arial', sans-serif;
          padding: 5mm;
          margin: 0;
          background: #ffffff;
          color: #053F5C;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: "liga" 1, "calt" 1;
          direction: ${language === "ar" ? "rtl" : "ltr"};
          text-align: ${language === "ar" ? "right" : "left"};
          word-spacing: normal;
          letter-spacing: normal;
          width: 200mm;
          min-height: 287mm;
          box-sizing: border-box;
        }
        * {
          font-family: inherit;
        }
        h1, h2, h3, h4, h5, h6 {
          word-spacing: normal;
          letter-spacing: normal;
        }
        
        /* Cover Page Styles */
        .cover-page {
          height: 270mm; /* Slightly less than A4 to ensure single page */
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #053F5C 0%, #0F5878 100%);
          color: white;
          text-align: center;
          position: relative;
          page-break-after: always;
          border-radius: 0;
          margin-bottom: 0;
          padding: 20mm;
          box-sizing: border-box;
        }
        .cover-logo {
          width: 60mm;
          height: auto;
          margin-bottom: 15mm;
          filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
          background: rgba(255,255,255,0.1);
          padding: 5mm;
          border-radius: 10px;
        }
        .cover-title {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 8mm;
          text-shadow: 0 4px 10px rgba(0,0,0,0.3);
          line-height: 1.3;
        }
        .cover-subtitle {
          font-size: 20px;
          font-weight: 500;
          opacity: 0.9;
          margin-bottom: 20mm;
          background: rgba(255,255,255,0.1);
          padding: 3mm 10mm;
          border-radius: 30px;
        }
        .cover-info {
          background: rgba(255,255,255,0.05);
          padding: 10mm;
          border-radius: 12px;
          width: 80%;
          backdrop-filter: blur(5px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .cover-info-item {
          margin-bottom: 4mm;
          font-size: 14px;
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 2mm;
        }
        .cover-info-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        .cover-label {
          font-weight: bold;
          opacity: 0.8;
        }
        .cover-value {
          font-weight: 600;
        }
        /* Exec Summary Styles */
        .exec-summary-box {
          background: #f8fafc;
          border-right: 5px solid #429EBD; /* RTL support default */
          border-left: 0;
          padding: 6mm;
          margin-bottom: 6mm;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        [dir="ltr"] .exec-summary-box {
           border-left: 5px solid #429EBD;
           border-right: 0;
        }
        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 2mm;
          background: linear-gradient(135deg, #8B5CF6, #EC4899);
          color: white;
          padding: 1mm 3mm;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 3mm;
        }
        .header {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 8mm;
          padding: 8mm 5mm;
          background: linear-gradient(135deg, #053F5C 0%, #429EBD 100%);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(5, 63, 92, 0.15);
          position: relative;
          overflow: visible;
          min-height: 25mm;
        }
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          ${language === "ar" ? "right" : "left"}: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .logo {
          max-width: 45mm;
          max-height: 22mm;
          object-fit: contain;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
          z-index: 1;
          margin-bottom: 4mm;
        }
        .header-text {
          text-align: center;
          z-index: 1;
          width: 100%;
          overflow: visible;
        }
        .main-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 3mm;
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          letter-spacing: 0;
          text-align: center;
          line-height: 1.3;
          word-spacing: normal;
          white-space: normal;
          padding: 0 3mm;
          direction: ${language === "ar" ? "rtl" : "ltr"};
        }
        .subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.95);
          font-weight: 500;
          background: rgba(255, 255, 255, 0.15);
          padding: 2mm 4mm;
          border-radius: 15px;
          display: inline-block;
          backdrop-filter: blur(10px);
          text-align: center;
          margin-top: 2mm;
        }
        .section {
          margin-bottom: 6mm;
          page-break-inside: avoid !important;
          page-break-before: auto !important;
          page-break-after: auto !important;
          break-inside: avoid !important;
          background: #ffffff;
          padding: 5mm;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(5, 63, 92, 0.08);
          border: 1px solid rgba(66, 158, 189, 0.1);
        }
        .section-with-table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          color: #053F5C;
          margin-bottom: 4mm;
          padding-bottom: 2mm;
          border-bottom: 2px solid;
          border-image: linear-gradient(90deg, #429EBD 0%, #9FE7F5 100%) 1;
          position: relative;
          display: flex;
          align-items: center;
          gap: 3mm;
          direction: ${language === "ar" ? "rtl" : "ltr"};
          text-align: ${language === "ar" ? "right" : "left"};
        }
        .section-title::before {
          content: '';
          width: 2mm;
          height: 8mm;
          background: linear-gradient(135deg, #429EBD 0%, #9FE7F5 100%);
          border-radius: 1mm;
        }
        .icon-badge {
          display: none;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4mm;
          margin-bottom: 4mm;
        }
        .stat-item {
          background: linear-gradient(135deg, #F0FAFC 0%, #E8F4F8 100%);
          padding: 4mm;
          border-radius: 5px;
          border: 1.5px solid rgba(66, 158, 189, 0.2);
          box-shadow: 0 2px 6px rgba(66, 158, 189, 0.1);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .stat-item::before {
          content: '';
          position: absolute;
          top: 0;
          ${language === "ar" ? "right" : "left"}: 0;
          width: 5px;
          height: 100%;
          background: linear-gradient(180deg, #429EBD 0%, #9FE7F5 100%);
        }
        .stat-label {
          font-size: 10px;
          color: #666;
          margin-bottom: 2mm;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .stat-label::before {
          content: '';
        }
        .stat-value {
          font-size: 18px;
          font-weight: 700;
          color: #053F5C;
          line-height: 1.2;
        }
        .data-list {
          list-style: none;
          padding: 0;
        }
        .data-item {
          padding: 3mm 4mm;
          margin-bottom: 2mm;
          background: linear-gradient(135deg, #F0FAFC 0%, #ffffff 100%);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid rgba(66, 158, 189, 0.15);
          box-shadow: 0 1px 3px rgba(5, 63, 92, 0.05);
          line-height: 1.4;
        }
        .data-item:nth-child(even) {
          background: linear-gradient(135deg, #E8F4F8 0%, #F0FAFC 100%);
        }
        .data-item:hover {
          transform: translateX(${language === "ar" ? "-5px" : "5px"});
          box-shadow: 0 4px 12px rgba(66, 158, 189, 0.15);
        }
        .section-with-table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: always !important;
          page-break-after: auto !important;
          margin-top: 10mm;
        }
        .page-break {
          page-break-before: always !important;
          break-before: page !important;
        }
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-bottom: 4mm;
          font-size: 10px;
          border-radius: 5px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(5, 63, 92, 0.1);
          page-break-inside: avoid !important;
          page-break-before: auto !important;
          break-inside: avoid !important;
          border: none;
          display: table !important;
          direction: ${language === "ar" ? "rtl" : "ltr"};
        }
        table thead {
          border: none;
          border-collapse: separate;
        }
        table thead tr {
          border: none;
          border-collapse: separate;
        }
        table thead th {
          border: none !important;
          border-bottom: none !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
        }
        table tbody tr:first-child td {
          border-top: none;
        }
        thead {
          display: table-header-group !important;
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
        }
        tbody {
          display: table-row-group !important;
          page-break-inside: avoid !important;
        }
        tr {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
          display: table-row !important;
        }
        thead tr {
          page-break-after: avoid !important;
          page-break-inside: avoid !important;
          page-break-before: avoid !important;
        }
        tbody tr {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }
        td, th {
          page-break-inside: avoid !important;
        }
        th {
          background: linear-gradient(135deg, #429EBD 0%, #053F5C 100%);
          color: white;
          padding: 3mm 2.5mm;
          text-align: ${language === "ar" ? "right" : "left"} !important;
          font-weight: 700;
          font-size: 10px;
          ${language === "ar" ? "" : "text-transform: uppercase;"}
          letter-spacing: 0.2px;
          border: none;
          position: relative;
          vertical-align: middle;
          line-height: 1.3;
          white-space: nowrap;
          direction: ${language === "ar" ? "rtl" : "ltr"} !important;
        }
        th:first-child {
          border-top-${language === "ar" ? "right" : "left"}-radius: 5px;
        }
        th:last-child {
          border-top-${language === "ar" ? "left" : "right"}-radius: 5px;
        }
        td {
          padding: 2.5mm;
          border-bottom: 1px solid rgba(66, 158, 189, 0.1);
          color: #053F5C;
          font-weight: 500;
          background: #ffffff;
          vertical-align: middle;
          line-height: 1.3;
          font-size: 9px;
          text-align: ${language === "ar" ? "right" : "left"} !important;
          direction: ${language === "ar" ? "rtl" : "ltr"} !important;
        }
        tr:nth-child(even) td {
          background: linear-gradient(135deg, #F0FAFC 0%, #ffffff 100%);
        }
        tr:last-child td:first-child {
          border-bottom-${language === "ar" ? "right" : "left"}-radius: 5px;
        }
        tr:last-child td:last-child {
          border-bottom-${language === "ar" ? "left" : "right"}-radius: 5px;
        }
        tr:hover td {
          background: linear-gradient(135deg, #E8F4F8 0%, #F0FAFC 100%);
          transform: scale(1.01);
        }
        .recommendations {
          margin-top: 25px;
        }
        .priority-high {
          background: linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%);
          border-${language === "ar" ? "right" : "left"}: 2mm solid;
          border-image: linear-gradient(180deg, #EF4444 0%, #DC2626 100%) 1;
          padding: 4mm;
          margin-bottom: 4mm;
          border-radius: 5px;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
          position: relative;
          overflow: hidden;
        }
        .priority-high::before {
          content: '';
          position: absolute;
          top: 0;
          ${language === "ar" ? "right" : "left"}: 0;
          width: 100%;
          height: 1.5mm;
          background: linear-gradient(90deg, #EF4444 0%, #DC2626 100%);
        }
        .priority-medium {
          background: linear-gradient(135deg, #FEF3C7 0%, #FEF9E7 100%);
          border-${language === "ar" ? "right" : "left"}: 2mm solid;
          border-image: linear-gradient(180deg, #F59E0B 0%, #D97706 100%) 1;
          padding: 4mm;
          margin-bottom: 4mm;
          border-radius: 5px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
          position: relative;
          overflow: hidden;
        }
        .priority-medium::before {
          content: '';
          position: absolute;
          top: 0;
          ${language === "ar" ? "right" : "left"}: 0;
          width: 100%;
          height: 1.5mm;
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
        }
        .priority-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 3mm;
          color: #053F5C;
          display: flex;
          align-items: center;
          gap: 3mm;
        }
        .priority-title::before {
          content: '';
        }
        .priority-list {
          list-style: none;
          padding: 0;
        }
        .priority-list li {
          padding: 2mm 0;
          padding-${language === "ar" ? "right" : "left"}: 6mm;
          position: relative;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.6;
        }
        .priority-list li:before {
          content: "•";
          position: absolute;
          ${language === "ar" ? "right" : "left"}: 0;
          font-size: 14px;
          color: #429EBD;
          font-weight: bold;
        }
        .footer {
          margin-top: 8mm;
          padding: 4mm;
          background: linear-gradient(135deg, #F0FAFC 0%, #E8F4F8 100%);
          border-radius: 5px;
          text-align: center;
          font-size: 9px;
          color: #666;
          border-top: 2px solid;
          border-image: linear-gradient(90deg, #429EBD 0%, #9FE7F5 100%) 1;
          font-weight: 500;
        }
        @media print {
          body {
            padding: 5mm;
            background: white;
            margin: 0;
            width: 200mm;
          }
          .section {
            page-break-inside: avoid;
            box-shadow: none;
            border: 1px solid #E0E0E0;
          }
          .header {
            box-shadow: none;
          }
          table {
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          tbody {
            display: table-row-group !important;
            page-break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
          }
          td, th {
            page-break-inside: avoid !important;
          }
          .section {
            break-inside: avoid !important;
          }
          .section-with-table {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: auto !important;
          }
          table {
            page-break-before: auto !important;
          }
        }
      </style>
    </head>
    <body>
      ${selectedSections.cover ? `
        <div class="cover-page">
          ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="cover-logo" />` : ""}
          <h1 class="cover-title">${language === "ar" ? "تقرير شامل لتقليل هدر الطعام" : "Comprehensive Report - Food Waste Reduction"}</h1>
          <div class="cover-subtitle">${periodText}</div>
          
          <div class="cover-info">
             <div class="cover-info-item">
               <span class="cover-label">${language === "ar" ? "تاريخ التقرير" : "Report Date"}</span>
               <span class="cover-value">${new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</span>
             </div>
             <div class="cover-info-item">
               <span class="cover-label">${language === "ar" ? "المنشأة" : "Facility"}</span>
               <span class="cover-value">${reportData.facilityName || (language === "ar" ? "الفرع الرئيسي" : "Main Branch")}</span>
             </div>
             <div class="cover-info-item">
               <span class="cover-label">${language === "ar" ? "بواسطة" : "Generated By"}</span>
               <span class="cover-value">System Admin</span>
             </div>
          </div>
        </div>
      ` : ""}

      <div class="header" style="${selectedSections.cover ? 'margin-top: 0;' : ''}">
        ${!selectedSections.cover && logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ""}
        <div class="header-text">
          <h1 class="main-title">${language === "ar" ? "تقرير المتابعة والتحليل" : "Monitoring & Analysis Report"}</h1>
          <p class="subtitle">
            ${language === "ar" ? "الفترة:" : "Period:"} ${periodText} | 
            ${language === "ar" ? "تاريخ الإصدار:" : "Issued:"} ${new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
          </p>
        </div>
      </div>
  `;

  // Executive Summary (AI Powered)
  if (selectedSections.summary && reportData.aiSummary && !reportData.aiSummary.error) {
    const ai = reportData.aiSummary;
    html += `
      <div class="section">
        <h2 class="section-title">
           ${language === "ar" ? "الملخص التنفيذي" : "Executive Summary"}
           <span class="ai-badge" style="float: ${language === "ar" ? "left" : "right"};">AI Analysis</span>
        </h2>
        
        <div class="exec-summary-box">
          <p style="font-size: 12px; font-weight: 500; margin-bottom: 10px; line-height: 1.8; color: #334155;">
            ${ai.summary || (language === "ar" ? "لا يوجد ملخص متاح." : "No summary available.")}
          </p>
          
          ${ai.key_findings && ai.key_findings.length > 0 ? `
            <div style="margin-top: 15px;">
              <h4 style="font-size: 11px; font-weight: bold; color: #053F5C; margin-bottom: 8px;">${language === "ar" ? "النتائج الرئيسية:" : "Key Findings:"}</h4>
              <ul style="list-style: disc; padding-${language === "ar" ? "right" : "left"}: 18px; font-size: 11px; color: #475569;">
                ${ai.key_findings.map(finding => `
                  <li style="margin-bottom: 6px;">${typeof finding === 'string' ? finding : (finding.text || finding.description || "N/A")}</li>
                `).join('')}
              </ul>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  // General Statistics (KPIs)
  if (selectedSections.kpis) {
    const dirAttr = language === "ar" ? ' dir="rtl"' : ' dir="ltr"';
    html += `
      <div class="section"${dirAttr}>
        <h2 class="section-title"${dirAttr}>${language === "ar" ? "مؤشرات الأداء الرئيسية" : "Key Performance Indicators"}</h2>
        <div class="stats-grid"${dirAttr}>
          <div class="stat-item"${dirAttr}>
            <div class="stat-label"${dirAttr}>${language === "ar" ? "إجمالي الهدر" : "Total Waste"}</div>
            <div class="stat-value"${dirAttr}>${reportData.generalStats.totalWaste.toLocaleString()} ${language === "ar" ? "حبة" : "pcs"}</div>
          </div>
          <div class="stat-item"${dirAttr}>
            <div class="stat-label"${dirAttr}>${language === "ar" ? "المرتجعات المتوقعة" : "Expected Returns"}</div>
            <div class="stat-value"${dirAttr}>${reportData.generalStats.totalReturns.toLocaleString()}</div>
          </div>
          <div class="stat-item"${dirAttr}>
            <div class="stat-label"${dirAttr}>${language === "ar" ? "مخاطر التبريد" : "Refrigeration Risk"}</div>
            <div class="stat-value"${dirAttr}>${reportData.generalStats.avgRefrigerationRisk}%</div>
          </div>
          <div class="stat-item"${dirAttr}>
            <div class="stat-label"${dirAttr}>${language === "ar" ? "مخاطر النقل" : "Transport Risk"}</div>
            <div class="stat-value"${dirAttr}>${reportData.generalStats.avgVehicleRisk}%</div>
          </div>
        </div>
      </div >
  `;
  }

  // Monthly Waste Trend
  if (selectedSections.monthly) {
    html += `
      <div class="section">
        <h2 class="section-title">${language === "ar" ? "اتجاه الهدر الشهري" : "Monthly Waste Trend"}</h2>
        <ul class="data-list">
    `;
    reportData.wasteTrendData.forEach((item) => {
      html += `
        <li class="data-item">
          ${item.month}: ${item.waste.toLocaleString()} ${language === "ar" ? "حبة" : "pcs"} 
          (${item.incidents} ${language === "ar" ? "حادثة" : "incidents"})
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Waste Cause Distribution
  if (selectedSections.causes) {
    html += `
      <div class="section">
        <h2 class="section-title">${language === "ar" ? "توزيع أسباب الهدر" : "Waste Cause Distribution"}</h2>
        <ul class="data-list">
    `;
    reportData.wasteCauseDistribution.forEach((item) => {
      html += `
        <li class="data-item">
          ${item.name}: ${item.value.toLocaleString()} ${language === "ar" ? "حبة" : "pcs"}
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Equipment Risk Distribution
  if (selectedSections.risks) {
    html += `
      <div class="section">
        <h2 class="section-title">${language === "ar" ? "توزيع مخاطر المعدات" : "Equipment Risk Distribution"}</h2>
        <ul class="data-list">
    `;
    reportData.equipmentRiskData.forEach((item) => {
      html += `
        <li class="data-item">
          ${item.name}: ${item.value} ${language === "ar" ? "معدة" : "equipment"}
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Return Probability
  if (selectedSections.returns) {
    html += `
      <div class="section">
        <h2 class="section-title">${language === "ar" ? "احتمالية المرتجع للمنتجات" : "Product Return Probabilities"}</h2>
        <ul class="data-list">
    `;
    reportData.returnsTrendData.forEach((item) => {
      html += `
        <li class="data-item">
          ${item.product}: ${item.probability}%
        </li>
      `;
    });
    html += `</ul></div>`;
  }

  // Detailed Tables (Waste & Returns)
  if (selectedSections.details) {
    const dirAttr = language === "ar" ? ' dir="rtl"' : ' dir="ltr"';

    // Waste Details
    html += `
      <div class="section section-with-table"${dirAttr}>
        <h2 class="section-title"${dirAttr}>${language === "ar" ? "تفاصيل حوادث الهدر" : "Waste Incidents Details"}</h2>
        <table${dirAttr}>
          <thead>
            <tr>
              <th${dirAttr}>${language === "ar" ? "تاريخ الحادثة" : "Incident Date"}</th>
              <th${dirAttr}>${language === "ar" ? "اسم المنتج" : "Product Name"}</th>
              <th${dirAttr}>${language === "ar" ? "سبب الهدر" : "Waste Cause"}</th>
              <th${dirAttr}>${language === "ar" ? "كمية الهدر (حبة)" : "Waste Amount (pcs)"}</th>
              <th${dirAttr}>${language === "ar" ? "مستوى الثقة" : "Confidence"}</th>
            </tr>
          </thead>
          <tbody>
    `;
    reportData.detailedWasteData.forEach((item) => {
      html += `
        <tr>
          <td${dirAttr}>${item.date}</td>
          <td${dirAttr}>${item.product}</td>
          <td${dirAttr}>${item.cause}</td>
          <td${dirAttr}>${item.amount.toLocaleString()}</td>
          <td${dirAttr} style="color: ${item.confidence >= 80 ? "#10b981" : item.confidence >= 60 ? "#f59e0b" : "#ef4444"}; font-weight: 700;">${item.confidence}%</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;

    // Returns Details
    html += `
      <div class="section section-with-table"${dirAttr}>
        <h2 class="section-title"${dirAttr}>${language === "ar" ? "تفاصيل المرتجعات" : "Returns Details"}</h2>
        <table${dirAttr}>
          <thead>
            <tr>
              <th${dirAttr}>${language === "ar" ? "اسم المنتج" : "Product Name"}</th>
              <th${dirAttr}>${language === "ar" ? "سبب المرتجع" : "Return Reason"}</th>
              <th${dirAttr}>${language === "ar" ? "احتمالية المرتجع" : "Probability"}</th>
              <th${dirAttr}>${language === "ar" ? "الكمية المتوقعة" : "Exp. Quantity"}</th>
            </tr>
          </thead>
          <tbody>
    `;
    reportData.detailedReturnsData.forEach((item) => {
      html += `
        <tr>
          <td${dirAttr}>${item.product}</td>
          <td${dirAttr}>${item.reason}</td>
          <td${dirAttr} style="color: ${item.probability >= 70 ? "#ef4444" : item.probability >= 40 ? "#f59e0b" : "#10b981"}; font-weight: 700;">${item.probability}%</td>
          <td${dirAttr}>${item.quantity.toLocaleString()}</td>
        </tr>
      `;
    });
    html += `</tbody></table></div>`;
  }

  // Recommendations
  if (selectedSections.recommendations) {
    html += `
      <div class="section recommendations">
        <h2 class="section-title">${language === "ar" ? "التوصيات والإجراءات الموصى بها" : "Recommendations and Suggested Actions"}</h2>
        <div class="priority-high">
          <div class="priority-title">${language === "ar" ? "أولوية عالية" : "High Priority"}</div>
          <ul class="priority-list">
            <li>${language === "ar" ? "تحسين ظروف التخزين في المخازن عالية المخاطر" : "Improve storage conditions in high-risk warehouses"}</li>
            <li>${language === "ar" ? "صيانة فورية للثلاجات ذات مخاطر الفشل العالية" : "Immediate maintenance for refrigerators with high failure risk"}</li>
            <li>${language === "ar" ? "مراقبة المنتجات ذات احتمالية المرتجع العالية" : "Monitor products with high return probability"}</li>
          </ul>
        </div>
        <div class="priority-medium">
          <div class="priority-title">${language === "ar" ? "أولوية متوسطة" : "Medium Priority"}</div>
          <ul class="priority-list">
            <li>${language === "ar" ? "تحسين عمليات النقل لتقليل التلف" : "Improve transport operations to reduce damage"}</li>
            <li>${language === "ar" ? "مراجعة كميات الإنتاج لتجنب الإفراط" : "Review production quantities to avoid overproduction"}</li>
            <li>${language === "ar" ? "تحسين إدارة المخزون لمنع انتهاء الصلاحية" : "Improve inventory management to prevent expiry"}</li>
          </ul>
        </div>
      </div>
    `;
  }

  html += `
  < div class="footer" >
    <p>© ${new Date().getFullYear()} ${language === "ar" ? "نظام تقليل هدر الطعام" : "Food Waste Reduction System"}</p>
      </div >
    </body >
    </html >
  `;

  return html;
};

// إنشاء PDF منسق
export const generatePDFReport = async (
  reportData,
  selectedSections,
  language,
  logoPath = "/logo.png"
) => {
  // تحميل الشعار
  let logoBase64 = null;
  try {
    const logoUrl = logoPath.startsWith("/") ? logoPath : `/ ${logoPath} `;
    logoBase64 = await imageToBase64(logoUrl);
  } catch (error) {
    console.warn("Could not load logo, continuing without it:", error);
  }

  // إنشاء HTML للتقرير
  const htmlContent = createReportHTML(reportData, selectedSections, language, logoBase64);

  // إنشاء iframe مخفي لتحميل HTML - أبعاد A4 بالضبط
  const iframe = document.createElement("iframe");
  iframe.style.position = "absolute";
  iframe.style.width = "210mm"; // A4 width
  iframe.style.height = "297mm"; // A4 height
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // التأكد من أن direction صحيح في iframe
        iframeDoc.documentElement.setAttribute('dir', language === "ar" ? "rtl" : "ltr");
        iframeDoc.documentElement.setAttribute('lang', language);
        iframeDoc.documentElement.style.direction = language === "ar" ? "rtl" : "ltr";
        iframeDoc.body.style.direction = language === "ar" ? "rtl" : "ltr";
        iframeDoc.body.style.textAlign = language === "ar" ? "right" : "left";

        // انتظار تحميل الخطوط والصور
        await new Promise((resolve) => {
          // انتظار تحميل الخطوط
          const checkFonts = async () => {
            try {
              if (iframeDoc.fonts && iframeDoc.fonts.check) {
                // التحقق من تحميل خط Cairo
                const fontLoaded = iframeDoc.fonts.check('16px Cairo') ||
                  iframeDoc.fonts.check('16px "Cairo"');

                if (fontLoaded) {
                  // انتظار إضافي للتأكد من تحميل جميع الأوزان
                  await new Promise(r => setTimeout(r, 300));
                  resolve();
                } else if (iframeDoc.fonts.ready) {
                  await iframeDoc.fonts.ready;
                  await new Promise(r => setTimeout(r, 500));
                  resolve();
                } else {
                  setTimeout(resolve, 2500);
                }
              } else if (iframeDoc.fonts && iframeDoc.fonts.ready) {
                await iframeDoc.fonts.ready;
                await new Promise(r => setTimeout(r, 500));
                resolve();
              } else {
                // انتظار كافٍ لتحميل الخطوط من Google Fonts
                setTimeout(resolve, 3000);
              }
            } catch (error) {
              console.warn("Font loading check failed:", error);
              setTimeout(resolve, 3000);
            }
          };

          checkFonts();
        });

        // تحويل HTML إلى canvas مع دعم كامل للخطوط
        // حساب الأبعاد بدقة لصفحة A4
        const a4Width = 210; // mm
        const a4Height = 297; // mm
        const dpi = 96;
        const mmToPx = dpi / 25.4;
        const widthPx = a4Width * mmToPx;
        const heightPx = a4Height * mmToPx;

        // تحويل HTML إلى canvas مع دعم كامل للخطوط
        const canvas = await html2canvas(iframeDoc.body, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: widthPx,
          height: iframeDoc.body.scrollHeight || heightPx,
          windowWidth: widthPx,
          windowHeight: iframeDoc.body.scrollHeight || heightPx,
          onclone: (clonedDoc) => {
            // التأكد من أن الخطوط محملة في المستند المستنسخ
            const clonedHtml = clonedDoc.documentElement;
            clonedHtml.setAttribute('dir', language === "ar" ? "rtl" : "ltr");
            clonedHtml.setAttribute('lang', language);
            clonedHtml.style.direction = language === "ar" ? "rtl" : "ltr";

            const clonedBody = clonedDoc.body;
            clonedBody.style.fontFamily = "'Cairo', 'Segoe UI', 'Tahoma', 'Arial Unicode MS', 'Arial', sans-serif";
            clonedBody.style.webkitFontSmoothing = "antialiased";
            clonedBody.style.mozOsxFontSmoothing = "grayscale";
            clonedBody.style.padding = "5mm";
            clonedBody.style.margin = "0";
            clonedBody.style.width = "200mm";
            clonedBody.style.direction = language === "ar" ? "rtl" : "ltr";
            clonedBody.style.textAlign = language === "ar" ? "right" : "left";

            // التأكد من أن جميع العناصر لها direction صحيح
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el) => {
              if (language === "ar") {
                el.setAttribute('dir', 'rtl');
                el.style.direction = "rtl";
                if (el.tagName === 'TH' || el.tagName === 'TD') {
                  el.style.textAlign = "right";
                }
              } else {
                el.setAttribute('dir', 'ltr');
                el.style.direction = "ltr";
                if (el.tagName === 'TH' || el.tagName === "TD") {
                  el.style.textAlign = "left";
                }
              }
            });
          },
        });

        // إنشاء PDF من canvas مع تقسيم ذكي للصفحات
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = 297; // A4 height in mm
        const scale = canvas.width / (imgWidth * 3.779527559); // تحويل mm إلى px

        // حساب مواضع جميع الأقسام في canvas بدقة
        // نحتاج إلى حساب المواضع بعد تحميل المحتوى والخطوط
        await new Promise(resolve => setTimeout(resolve, 800));

        // حساب مواضع جميع الأقسام (sections) - ليس فقط الجداول
        const allSections = iframeDoc.querySelectorAll('.section');
        const sectionPositions = [];

        // حساب scale الفعلي من canvas
        const actualScale = canvas.width / iframeDoc.body.scrollWidth;

        allSections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const bodyRect = iframeDoc.body.getBoundingClientRect();

          // حساب الموضع النسبي من body
          const top = rect.top - bodyRect.top;
          const height = rect.height;

          // استخدام scale الفعلي بدلاً من افتراض 2
          sectionPositions.push({
            top: Math.round(top * actualScale),
            height: Math.round(height * actualScale),
            bottom: Math.round((top + height) * actualScale),
            className: section.className
          });
        });

        // ترتيب الأقسام حسب الموضع
        sectionPositions.sort((a, b) => a.top - b.top);

        console.log(`Canvas scale: ${actualScale.toFixed(2)}, Canvas dimensions: ${canvas.width}x${canvas.height} px`);
        console.log(`Found ${sectionPositions.length} sections: `);
        sectionPositions.forEach((section, index) => {
          console.log(`  Section ${index + 1} (${section.className}): Top = ${section.top} px, Height = ${section.height} px, Bottom = ${section.bottom} px`);
        });

        // تقسيم canvas إلى صفحات مع تجنب قطع الأقسام
        let sourceY = 0;
        let pageNumber = 0;
        const canvasHeightPx = canvas.height;
        const pageHeightPx = Math.round((pageHeight * canvas.width) / imgWidth);

        console.log(`Canvas height: ${canvasHeightPx} px, Page height: ${pageHeightPx} px`);

        while (sourceY < canvasHeightPx) {
          if (pageNumber > 0) {
            pdf.addPage();
          }

          // حساب ارتفاع الصفحة الحالية
          let pageEndY = Math.min(sourceY + pageHeightPx, canvasHeightPx);

          // التحقق من وجود أي قسم سيُقطع في نهاية الصفحة
          let adjustedEndY = pageEndY;
          let sectionToMove = null;

          for (const section of sectionPositions) {
            // إذا كان القسم يبدأ قبل نهاية الصفحة وينتهي بعدها (سيُقطع)
            if (section.top >= sourceY && section.top < pageEndY && section.bottom > pageEndY) {
              // إذا كان القسم صغيراً (أقل من 20% من الصفحة) ويمكن وضعه في الصفحة التالية
              // أو إذا كان القسم كبيراً جداً (أكبر من 80% من الصفحة)، نضعه في صفحة جديدة
              const sectionHeight = section.bottom - section.top;
              const spaceBeforeSection = section.top - sourceY;

              if (sectionHeight > pageHeightPx * 0.8 || spaceBeforeSection < pageHeightPx * 0.1) {
                // القسم كبير جداً أو المساحة قبلها صغيرة جداً - ابدأ الصفحة التالية من بداية القسم
                adjustedEndY = Math.min(adjustedEndY, section.top);
                sectionToMove = section;
              } else {
                // القسم صغير ويمكن وضعه في الصفحة التالية
                adjustedEndY = Math.min(adjustedEndY, section.top);
                sectionToMove = section;
              }
            }
          }

          // التحقق مرة أخرى بعد التعديل للتأكد من عدم قطع أي قسم
          let needsRecheck = true;
          while (needsRecheck) {
            needsRecheck = false;
            for (const section of sectionPositions) {
              if (section.top >= sourceY && section.top < adjustedEndY && section.bottom > adjustedEndY) {
                adjustedEndY = section.top;
                needsRecheck = true;
                sectionToMove = section;
              }
            }
          }

          // التأكد من أن adjustedEndY أكبر من sourceY (على الأقل 10% من الصفحة)
          const minPageHeight = pageHeightPx * 0.1;
          if (adjustedEndY <= sourceY || (adjustedEndY - sourceY) < minPageHeight) {
            adjustedEndY = Math.min(sourceY + pageHeightPx, canvasHeightPx);
            sectionToMove = null;
          }

          pageEndY = adjustedEndY;

          // تسجيل معلومات الصفحة
          if (sectionToMove) {
            const spaceUsed = pageEndY - sourceY;
            const spacePercent = Math.round((spaceUsed / pageHeightPx) * 100);
            console.log(`Page ${pageNumber + 1}: Ends at ${pageEndY} px(${spacePercent} % used) - Section "${sectionToMove.className}" moved to next page`);
          }

          // إنشاء canvas للصفحة الحالية
          const pageHeightActual = Math.min(pageEndY - sourceY, canvasHeightPx - sourceY);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = pageHeightActual;
          const pageCtx = pageCanvas.getContext('2d');

          // نسخ جزء من الصورة الأصلية
          pageCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, pageHeightActual,
            0, 0, canvas.width, pageHeightActual
          );

          // تحويل إلى صورة
          const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
          const pageImgHeightMm = (pageHeightActual * imgWidth) / canvas.width;

          // إضافة الصفحة إلى PDF
          pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, pageImgHeightMm);

          // التحقق النهائي: التأكد من عدم قطع أي قسم في هذه الصفحة
          let allSectionsComplete = true;
          for (const section of sectionPositions) {
            if (section.top >= sourceY && section.top < pageEndY && section.bottom > pageEndY) {
              console.error(`❌ ERROR: Section "${section.className}" is STILL CUT on page ${pageNumber + 1} !(${section.top} -${section.bottom}, page: ${sourceY} -${pageEndY})`);
              allSectionsComplete = false;
            } else if (section.top >= sourceY && section.bottom <= pageEndY) {
              // قسم كامل في هذه الصفحة
            }
          }

          if (allSectionsComplete && sectionPositions.some(s => s.top >= sourceY && s.bottom <= pageEndY)) {
            const completeSections = sectionPositions.filter(s => s.top >= sourceY && s.bottom <= pageEndY);
            console.log(`✅ Page ${pageNumber + 1}: ${completeSections.length} section(s) complete`);
          }

          sourceY = pageEndY;
          pageNumber++;

          // حماية من الحلقات اللانهائية
          if (pageNumber > 100) {
            console.warn("⚠️ Too many pages (100+), breaking loop to prevent infinite loop");
            break;
          }
        }

        console.log(`✅ PDF generation complete: ${pageNumber} page(s) created`);

        // تنظيف
        document.body.removeChild(iframe);

        // حفظ الملف بأسماء عربية معبرة
        const periodNames = {
          week: language === "ar" ? "أسبوع" : "week",
          month: language === "ar" ? "شهر" : "month",
          quarter: language === "ar" ? "ربع_سنوي" : "quarter",
          year: language === "ar" ? "سنة" : "year"
        };
        const periodLabel = periodNames[reportData.selectedPeriod] || reportData.selectedPeriod;
        const dateStr = new Date().toISOString().split("T")[0];
        const fileName = language === "ar"
          ? `تقرير_ترشيد_شامل_${periodLabel}_${dateStr}.pdf`
          : `comprehensive_report_${periodLabel}_${dateStr}.pdf`;
        pdf.save(fileName);
        resolve();
      } catch (error) {
        document.body.removeChild(iframe);
        reject(error);
      }
    };

    iframe.onerror = () => {
      document.body.removeChild(iframe);
      reject(new Error("Failed to load iframe"));
    };

    // بدء تحميل iframe
    iframe.src = "about:blank";
  });
};
