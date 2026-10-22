# AstroStarVibes Pictory Helper

ใช้ส่งสคริปต์จาก Channel Stats ใน Claude Desktop ไปทำวิดีโอใน Pictory โดยไม่ต้องใช้ Pictory API

```
Claude Desktop + Channel Stats ──► JSON block (สคริปต์ + ฉาก + ชื่อ/คำอธิบาย/แท็ก)
        │ copy
        ▼
Chrome extension (popup หรือแผงบน app.pictory.ai) ──► Fill script ลงช่องสคริปต์ของ Pictory
        │
        ▼
คุณ หรือ Claude in Chrome กดขั้นตอนของ Pictory ต่อ (ทีละวิดีโอ คุณดูอยู่)
```

## ในโฟลเดอร์นี้

| ไฟล์ | ใช้ทำอะไร |
| --- | --- |
| `extension/` | Chrome extension (Manifest V3) |
| `skill/astrostarvibes-pictory-script/SKILL.md` | Skill ให้ Claude อ่านสถิติจาก Channel Stats แล้วเขียน JSON block |
| `examples/sample-package.json` | แพ็กเกจตัวอย่างไว้ลองระบบ |

## ติดตั้ง

**Extension**
1. เปิด `chrome://extensions` แล้วเปิด **Developer mode** (มุมขวาบน)
2. กด **Load unpacked** แล้วเลือกโฟลเดอร์ `pictory-helper/extension`
3. ปักหมุดไอคอน ✦ ไว้ที่แถบเครื่องมือ

**Skill (ใน Claude Desktop)**
- บีบอัดโฟลเดอร์ `skill/astrostarvibes-pictory-script` เป็น .zip แล้วอัปโหลดในหน้า Skills ของการตั้งค่า Claude
- หรือ copy เนื้อหา `SKILL.md` ไปใส่ใน instructions ของ Project ที่ใช้คุยเรื่องช่อง

## วิธีใช้

1. ใน Claude Desktop (ที่ต่อ Channel Stats อยู่) พิมพ์ประมาณ "วางแผนคลิปถัดไปของ AstroStarVibes สำหรับ Pictory"
2. Claude จะอธิบายว่าทำไมเลือกหัวข้อนี้ แล้วส่ง JSON block มาให้ copy ทั้งคำตอบหรือแค่ block ก็ได้
3. กดไอคอน ✦ → วาง → **Import** (หรือวางในแผงบนหน้า Pictory ก็ได้)
4. เปิด Pictory แล้วเริ่มโปรเจกต์ Script / Text to Video
5. คลิกในช่องสคริปต์ของ Pictory แล้วกด **Fill script** ในแผง AstroStarVibes
6. ทำขั้นตอนของ Pictory ต่อตามปกติ ปุ่ม **Copy title / description / tags** ไว้ใช้ตอนอัปโหลด YouTube

ปุ่มในแผง:

- **Fill script**: แทนที่ข้อความในช่องสคริปต์ด้วยสคริปต์ของแพ็กเกจ (ย่อหน้าละ 1 ฉาก)
- **Pick box**: ถ้ากรอกผิดช่อง ให้กดแล้วคลิกช่องที่ถูกต้อง
- **Copy visuals**: คีย์เวิร์ดหาภาพของแต่ละฉาก
- **Mark done**: ติดสถานะว่าทำเสร็จแล้ว
- แพ็กเกจที่มี `id` เดิมจะถูกแทนที่ตอน import ซ้ำ แก้สคริปต์แล้ว import ใหม่ได้เลย

## ใช้กับ Claude in Chrome

กด **Copy Claude prompt** ในแผง แล้ววางในแผงข้างของ Claude in Chrome บนแท็บ Pictory
Claude in Chrome จะกด Fill script เอง แล้วทำขั้นตอนต่อ โดยต้องถามคุณก่อนกด generate, render หรือดาวน์โหลด

ข้อดีที่เหนือกว่า iMacros: Claude in Chrome อ่านหน้าจริงทุกครั้ง Pictory เปลี่ยนหน้าตาเว็บก็ยังทำงานได้ ไม่เหมือน macro ที่อัดตำแหน่งคลิกไว้แล้วพังเมื่อ UI เปลี่ยน

**ขอบเขต:** extension นี้ไม่กดปุ่มของ Pictory เอง ไม่เรียก server ของ Pictory และไม่มีโหมดรันคิวอัตโนมัติ ใช้ทีละวิดีโอขณะคุณดูอยู่ เหมือนมีผู้ช่วยนั่งพิมพ์ให้ และใช้โควตาจากแพ็กเกจ Pictory ของคุณตามปกติ ถ้าทำเป็นบอทรันชุดใหญ่โดยไม่มีคนดู จะเสี่ยงผิดเงื่อนไขของ Pictory

## ถ้า Fill script ไม่ทำงานบน Pictory จริง

extension ทดสอบกับหน้าจำลองที่มีช่องสคริปต์ 3 แบบ (textarea, rich editor ที่รับ paste, contenteditable ธรรมดา) แต่ยังไม่ได้ลองกับ app.pictory.ai จริง

- ถ้ากรอกไม่ได้ extension จะ copy สคริปต์ไว้ให้ ให้คลิกในช่องแล้วกด Ctrl+V (⌘V บน Mac)
- ถ้าช่องสคริปต์อยู่ในหน้าที่ URL ไม่ใช่ `app.pictory.ai` ให้แก้ `matches` ใน `extension/manifest.json`
- ส่ง HTML ของช่องสคริปต์มาได้ (คลิกขวา → Inspect → คลิกขวาที่ element → Copy → Copy outerHTML) จะได้ปรับให้ตรง

## อัปโหลดขึ้น YouTube

หลังดาวน์โหลดวิดีโอจาก Pictory ให้บอก Claude Desktop ให้อัปโหลดด้วย title, description และ tags จากแพ็กเกจ
ต้องเพิ่มเครื่องมืออัปโหลดใน Channel Stats MCP และขอสิทธิ์ `youtube.upload` ก่อน หน้า privacy policy ใน `channel-stats/` อัปเดตรองรับแล้ว
