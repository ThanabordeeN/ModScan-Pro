# Safety Notice

ModScan can read from and write to Modbus devices. Writing coils or registers may affect real
equipment, including PLCs, relays, inverters, motors, valves, and other industrial systems.

**Only use write operations when you:**

- Understand the target device and its register map
- Know the current operating state of the equipment
- Have assessed the risk of writing to the target address
- Have authority and permission to modify the device

**Do not** use write functions on equipment that is live, in production, or controlling safety-
critical processes unless you are a qualified engineer with explicit authorization.

The authors and maintainers of ModScan are not responsible for:

- Equipment damage or destruction
- Production downtime or loss
- Safety incidents or injuries
- Misconfiguration or unintended behavior
- Any other consequence arising from use of this software

Use at your own risk.
