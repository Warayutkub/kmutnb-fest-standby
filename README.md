# คิวสำรองบูธ · KMUTNB MUSIC FEST 2026

หน้าประกาศรายชื่อร้านค้าที่ได้ที่นั่งสำรอง (ธีมอวกาศ) จากดีไซน์ Figma `utils` → section “คิวสำรองบูธ อวกาศ”
เป็น HTML/CSS/JS ล้วน ไม่ต้อง build — อัปขึ้น GitHub Pages ได้ทันที

```
index.html   โครงหน้า
styles.css   สไตล์ (มือถือก่อน, เดสก์ท็อป ≥1024px)
app.js       โหลดข้อมูล + ค้นหา
config.js    ตั้งค่า + ข้อมูลจำลอง  ← แก้ไฟล์นี้ไฟล์เดียว
assets/      ไอคอน/ดาวเคราะห์/โลโก้ที่ export จาก Figma
```

## ดูในเครื่อง

```bash
python -m http.server 5500
```

แล้วเปิด http://localhost:5500

- `?q=ทาโกะ` — เปิดมาพร้อมคำค้น (แชร์ลิงก์ให้ร้านค้าได้)
- `?state=pending` — ดูหน้า “ยังไม่ประกาศ”
- `?state=announced` — บังคับแสดงรายชื่อ (ใช้ทดสอบก่อนเวลาประกาศ)

## ต่อ Google Form

1. เปิด Google Form → แท็บ **Responses** → **Link to Sheets**
2. ใน Google Sheet: **File → Share → Publish to web** → เลือกชีต `Form Responses 1` → รูปแบบ **CSV** → Publish แล้วคัดลอกลิงก์
3. วางลิงก์ใน `config.js` ที่ `sheetCsvUrl`
4. ตรวจ `columns` ให้ตรงกับหัวคอลัมน์ในชีต
   - `timestamp` — ใช้เรียงลำดับการสมัคร
   - `shopName` — ชื่อร้าน
   - `status` (ไม่บังคับ) — เพิ่มคอลัมน์ “สถานะ” เองในชีต แล้วพิมพ์ `สำรอง` ให้ร้านที่ได้ที่นั่งสำรอง ถ้าไม่มีคอลัมน์นี้หรือว่างทั้งหมด จะแสดงทุกแถว
5. ตั้ง `announceAt` — ก่อนเวลานี้หน้าเว็บจะขึ้น “ยังไม่ประกาศ”

> ลิงก์ CSV ที่ publish แล้วใครก็เปิดได้ — อย่าให้ชีตนั้นมีเบอร์โทร/อีเมลผู้สมัคร
> ทางที่ปลอดภัยกว่า: สร้างชีตใหม่ที่ดึงเฉพาะคอลัมน์ที่จำเป็น เช่น `=QUERY('Form Responses 1'!A:C, "select A, B, C")` แล้ว publish ชีตนั้นแทน

Google แคชไฟล์ที่ publish ไว้ราว 5 นาที ข้อมูลใหม่อาจขึ้นช้าเล็กน้อย

## Deploy บน GitHub Pages (GitHub Actions)

ใช้ workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — push เข้า `main` เมื่อไหร่ เว็บอัปเดตเอง

1. repo → **Settings → Pages** → Source: **GitHub Actions**
2. push โค้ดขึ้น `main`
3. ดูความคืบหน้าที่แท็บ **Actions** (ราว 1 นาที) เสร็จแล้วลิงก์อยู่ในงาน `deploy`
   → `https://<username>.github.io/<repo>/`

workflow จะอัปโหลดเฉพาะ `index.html styles.css app.js config.js assets/ .nojekyll`
ถ้าเพิ่มไฟล์ใหม่ที่หน้าเว็บต้องใช้ ให้เพิ่มชื่อในบรรทัด `cp -r ...` ของ workflow ด้วย
กดรันใหม่เองได้ที่ Actions → Deploy to GitHub Pages → **Run workflow**
