# ModScan Pro - Feature Backlog (Technical Edition)

## 1. Topology Map with Signal Quality Heatmap
**ID:** `FEAT-001` | **Priority:** High | **Tech Stack:** React Flow, Next.js

### Description
พัฒนาระบบแสดงผลโครงสร้างการเชื่อมต่อ (Topology) เพื่อใช้วิเคราะห์คุณภาพสัญญาณ (Signal Quality) โดยอาศัยการลากวาง Node ตามหน้างานจริง

### Engineering Guidelines
- **Physical vs Logical:** เนื่องจาก RS485 เป็น Bus Topology ที่โปรแกรมไม่รู้ลำดับจริง ให้ใช้ **React Flow** ย้ายฝั่งความรับผิดชอบให้ผู้ใช้ "ลากวางเรียงลำดับ Node" เอง
- **Heatmap Logic:** นำค่า Response Time (ms) จากการสแกนมา Map กับสีของ Node:
    - **สีเขียว:** สัญญาณดีเยี่ยม
    - **สีส้ม/แดง:** สัญญาณดรอป หรือค่าเริ่มสูงผิดปกติ
- **Diagnostic Tool:** ใช้ข้อมูลนี้เพื่อระบุปัญหาทางกายภาพ เช่น สายยาวเกินไป (Attenuation) หรือการลืมใส่ Terminating Resistor ที่ปลายสาย

### Tasks
- [ ] ติดตั้งและ Config `react-flow` ในโปรเจกต์
- [ ] พัฒนา Component สำหรับ Node อุปกรณ์ Modbus
- [ ] เชื่อมต่อสถานะ Response Time จาก `ModbusContext` เข้าสู่หน้า Topology

---

## 2. Project Persistence & Device Aliasing
**ID:** `FEAT-002` | **Priority:** Medium | **Tech Stack:** Electron (FS), localStorage

### Description
ระบบบันทึกโปรเจกต์และตั้งชื่อเล่นให้อุปกรณ์ (Alias) เพื่อลดภาระการจำหมายเลข ID และการตั้งค่าซ้ำๆ

### Engineering Guidelines
- **Data Structure:** ออกแบบ JSON Schema สำหรับเก็บค่า: `Project Name`, `Port Configuration`, `Slave ID`, `Alias Name`, และ `Watching Registers`
- **Storage Strategy:** 
    - ใช้ **localStorage** สำหรับค่าชั่วคราว/Recent Project
    - ใช้ **Node.js fs (Electron)** สำหรับการบันทึกเป็นไฟล์ `.json` เพื่อให้ผู้ใช้แชร์โปรเจกต์ระหว่างเครื่องได้
- **UX Improvement:** เมื่อโหลดโปรเจกต์ หน้าจอต้องเปลี่ยนจาก "ID: 15" เป็น "เซ็นเซอร์อุณหภูมิเตาเผา 1" ทันที

### Tasks
- [ ] สร้าง IPC Bridge ใน Electron สำหรับ Read/Write `.json` ไฟล์
- [ ] พัฒนา UI สำหรับหน้า "Project Management" (Save/Load/Export)
- [ ] ปรับแก้ Component ทั่วทั้ง App ให้แสดงผล Alias Name ควบคู่กับ Slave ID

---

## 3. Multi-device Dashboard with Backend Polling Queue
**ID:** `FEAT-003` | **Priority:** Critical | **Tech Stack:** Electron (Main Process), modbus-serial

### Description
หน้า Dashboard แสดงผลหลายอุปกรณ์ (Card View) พร้อมระบบจัดการคิวการสื่อสารเพื่อป้องกันข้อมูลชนกันบนสาย RS485

### Engineering Guidelines
- **The Collision Problem:** มาตรฐาน Modbus RTU ไม่สามารถ Request ซ้อนกันได้ การส่งคำสั่งพร้อมกันจะทำให้เกิด Data Collision
- **Polling Queue Implementation:** 
    - ต้องพัฒนา "คิวการอ่าน" ในฝั่ง Backend (Electron Main Process)
    - ระบบต้องวนลูปอ่านอุปกรณ์เรียงตามลำดับ (Sequential Polling): `Card 1 Request` -> `Response` -> `Wait` -> `Card 2 Request`
- **Update Interval:** เพิ่มตัวเลือกให้ผู้ใช้ปรับความถี่ในการวนลูป (เช่น 1s, 5s) เพื่อรักษาสมดุลความร้อนของอุปกรณ์และภาระบนพอร์ต Serial

### Tasks
- [ ] พัฒนา Class `ModbusQueue` ใน `electron/ipc/modbus.js` เพื่อจัดการลำดับคำสั่ง
- [ ] สร้างหน้า Dashboard แบบ Card Grid ใน Next.js
- [ ] เพิ่มระบบจัดการ "Update Interval" และสถานะการอ่าน (Last Updated) ในแต่ละ Card
