# ModScan Pro - เอกสารรายละเอียดผลิตภัณฑ์

## ภาพรวมผลิตภัณฑ์ (Product Overview)

**ModScan Pro** คือโซลูชันซอฟต์แวร์ครบวงจรสำหรับจัดการและตรวจสอบอุปกรณ์ Modbus RTU ที่ได้รับการออกแบบมาเพื่อให้วิศวกรและช่างเทคนิคทำงานได้ง่ายและรวดเร็วที่สุด ด้วยหน้าจอที่ทันสมัย (Modern UI) ใช้งานง่าย รองรับการทำงานทั้งตรวจสอบ สแกน และตั้งค่าอุปกรณ์ พร้อมระบบที่เสถียรสำหรับใช้งานจริงในระดับอุตสาหกรรม

---

## จุดเด่นสำคัญ (Key Highlights)

- **User-Friendly Modern Interface**: หน้าจอใช้งานง่าย ออกแบบด้วยเทคโนโลยีเว็บสมัยใหม่ แสดงผลชัดเจน พร้อมคำแนะนำภาษาไทย
- **Comprehensive Tools**: รวมทุกฟังก์ชันที่จำเป็นไว้ในที่เดียว ทั้งการสแกนหาอุปกรณ์ การอ่าน/เขียนข้อมูล และการตั้งค่า
- **Plug-and-Play**: รองรับการค้นหา Serial Port อัตโนมัติ กรอง Port ที่ไม่มีจริงออก ให้เหลือเฉพาะอุปกรณ์ที่เชื่อมต่อจริง
- **Cross-Platform Service**: สามารถติดตั้งและรันเป็น Background Service ได้ รองรับทั้ง Windows และ Linux

---

## คุณสมบัติและฟังก์ชันการทำงาน (Features & Functions)

### 1. ระบบค้นหาอุปกรณ์อัจฉริยะ (Smart Device Scanning)

- **Auto Scan**: ค้นหาอุปกรณ์ Modbus ในเครือข่าย RS485 ได้โดยไม่ต้องทราบ Address ล่วงหน้า
- **Full Range Scanning**: รองรับการสแกนตั้งแต่ Address 1 ถึง 247
- **Device Health Check**: แสดงค่า Response Time ของแต่ละอุปกรณ์ เพื่อประเมินคุณภาพการสื่อสาร

### 2. การอ่านข้อมูล (Data Reading)

รองรับการอ่านข้อมูลมาตรฐานครบถ้วน (Modbus Function Codes):

- **FC01 (Read Coils)**: อ่านสถานะ Output (On/Off)
- **FC02 (Read Discrete Inputs)**: อ่านสถานะ Input (On/Off)
- **FC03 (Read Holding Registers)**: อ่านค่าข้อมูลทั่วไป (16-bit)
- **FC04 (Read Input Registers)**: อ่านค่าข้อมูลจากเซนเซอร์ (16-bit)
- _Feature พิเศษ_: รองรับการอ่านแบบ Batch เพื่อประสิทธิภาพสูงสุด

### 3. การเขียนและควบคุม (Data Writing & Control)

สั่งงานและควบคุมอุปกรณ์ได้ดั่งใจ:

- **FC05 (Write Single Coil)**: สั่งงาน Output ทีละช่อง
- **FC06 (Write Single Register)**: เขียนค่า Config หรือ Setpoint ทีละค่า
- **FC15 (Write Multiple Coils)**: สั่งงาน Output หลายช่องพร้อมกัน
- **FC16 (Write Multiple Registers)**: เขียนค่าข้อมูลชุดใหญ่ในครั้งเดียว

### 4. การจัดการอุปกรณ์ (Device Management)

- **Change Slave ID**: ฟังก์ชันพิเศษสำหรับเปลี่ยน Address ของอุปกรณ์ (รองรับการเขียนผ่าน FC06 และ FC16) ทำให้สะดวกไม่ต้องใช้อุปกรณ์ตั้งค่าแยกต่างหาก
- **Verification**: มีระบบตรวจสอบความถูกต้องหลังการตั้งค่าใหม่ทันที

---

## ข้อมูลทางเทคนิค (Technical Specifications)

- **Supported Platforms**:
  - Linux (รองรับการติดตั้งเป็น Systemd Service)
  - Windows (มีตัวติดตั้ง Setup Wizard)
- **Communication**:
  - Interface: RS485 via USB/Serial
  - Protocol: Modbus RTU
  - Baud Rates: Configurable (9600, 19200, 38400, 57600, 115200, etc.)
  - Parity/Stop Bits: Configurable

---

## รูปแบบลิขสิทธิ์ (Licensing Model)

- **Machine-Locked License**: ระบบล็อกลิขสิทธิ์ผูกกับ Hardware ID ของเครื่อง คอมพิวเตอร์ ป้องกันการละเมิดลิขสิทธิ์และการคัดลอก
- **One-Time Purchase**: รูปแบบการขายขาด ไม่ต้องจ่ายรายปี
- **Secure Activation**: ใช้ระบบ Key Generation ที่ปลอดภัยสำหรับการ Activate ใช้งาน

---
