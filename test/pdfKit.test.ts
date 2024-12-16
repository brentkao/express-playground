import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// 獲取 uploads 資料夾的絕對路徑
const uploadsDir = path.join(__dirname, "..", "uploads","test");

// 檢查並創建 uploads 資料夾（如果不存在）
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// 設定檔案路徑
const pdfPath = path.join(uploadsDir, `test_basic_${Date.now()}.pdf`);

const doc = new PDFDocument();
const fileStream = fs.createWriteStream(pdfPath);

fileStream
  .on("finish", () => {
    console.log("簡單的 PDF 生成成功");
  })
  .on("error", (error) => {
    console.error("PDF 寫入錯誤:", error);
  });

doc.pipe(fileStream);

doc.text("Hello, this is a simple PDF.");
doc.end();
