ModScan Pro - Service Deployment Package
========================================

Usage:

Linux:
1.  Run 'chmod +x install-linux.sh'
2.  Run './install-linux.sh'
3.  Service will start automatically on port 3000.

Windows (Installer):
1.  Download 'nssm.exe' (https://nssm.cc/) and place it in this folder.
2.  Install 'Inno Setup' (https://jrsoftware.org/isdl.php).
3.  Right-click 'setup.iss' -> Compile.
4.  You will get a professional 'ModScanPro_Setup.exe'.

Windows (Manual Script):
1.  Right-click 'install-windows.bat' and Run as Administrator.
2.  Follow instructions.

NOTE:
If you have issues with Serial Port, you may need to run:
npm install --production
inside this folder to rebuild native modules for your specific OS.
