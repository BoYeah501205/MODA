# AUTOVOL DEPARTMENT MAPPING & TRAINING STRUCTURE
**Based on Actual MODA Departments**  
**Date**: December 1, 2024  
**Source**: People > Departments Tab Screenshot

---

## 🏭 PRODUCTION LINE DEPARTMENTS (Stage-Based)

Your departments are organized by **production stages** in the 22-stage modular production line. Here's the mapping:

### **Stage-Based Department Structure:**

| # | Department Name | Employee Code Match | Primary Functions | Training Priority |
|---|----------------|-------------------|------------------|------------------|
| 1 | **Automation** | AVIAUT (?) | Automated systems, robotics, CNC operations | HIGH - Technical |
| 2 | **Mezzanine** | AVIMEZ (?) | Mezzanine level work, upper assembly | MEDIUM |
| 3 | **Wall/Ceiling Set** | AVICEI / AVIFCM | Wall framing, ceiling framing, structural set | HIGH - Foundation |
| 4 | **MEP Rough-Ins** | AVIMEP | Electrical rough-in, plumbing rough-in, HVAC rough-in | HIGH - Code Critical |
| 5 | **Exteriors** | AVIEXT | Exterior siding, trim, weather barriers | MEDIUM |
| 6 | **Drywall** | AVIDRW / AVIFIN | Drywall installation, taping, mudding | MEDIUM |
| 7 | **Pre-Finish** | AVIFIN | Prep work, priming, surface preparation | MEDIUM |
| 8 | **MEP Trim-Out** | AVIMEP | Electrical trim, plumbing fixtures, HVAC finals | HIGH - Code Critical |
| 9 | **Final Finish** | AVIFIN | Paint, final trim, touch-up, detail work | HIGH - Quality Critical |
| 10 | **Module Sign-Off** | AVIOPR (?) | QA inspection, documentation, approval | HIGH - Quality Gate |
| 11 | **Close-Up** | AVIOPR (?) | Final assembly, securing, transport prep | MEDIUM |

### **Support Departments (Not shown in screenshot but in employee data):**
- **AVIADM** - Administration
- **AVIENG** - Engineering  
- **AVIJAN** - Janitorial
- **AVIPRM** - Production Management (Trevor's team)
- **AVIPUR** - Purchasing/Supply Chain
- **AVICAB** - Cabinetry (may be part of another stage?)

---

## 📊 OBSERVATIONS & RECOMMENDATIONS

### Key Insights:
1. ✅ **Stage-based organization** - Departments = production stages, not trades
2. ✅ **Sequential workflow** - Training should follow production sequence
3. ✅ **MEP is split** - "MEP Rough-Ins" and "MEP Trim-Out" are separate stages
4. ⚠️ **Supervisor assignments** - All showing "None assigned" currently
5. ⚠️ **Employee counts** - All showing "0 Employees" - data may need sync

### Department Expansion Needs:
Based on "I will need to further expand some of these departments", you likely need to break out:

**MEP Rough-Ins** could expand to:
- Electrical Rough-In
- Plumbing Rough-In  
- HVAC Rough-In

**MEP Trim-Out** could expand to:
- Electrical Trim-Out
- Plumbing Trim-Out
- HVAC Trim-Out

**Wall/Ceiling Set** could expand to:
- Wall Framing
- Ceiling Framing
- Floor Set (if applicable)

**Final Finish** could expand to:
- Paint
- Trim Installation
- Touch-Up/Detail

---

## 🎯 RECOMMENDED TRAINING SKILLS BY DEPARTMENT

### 1️⃣ **AUTOMATION**
**Category**: Technical Operations
```javascript
{
  'safety-automation': 'Automation Safety & Lockout/Tagout',
  'cnc-ops': 'CNC Operations',
  'robot-safety': 'Robotics Safety',
  'automated-cutting': 'Automated Cutting Systems',
  'quality-check': 'Quality Inspection'
}
```

### 2️⃣ **MEZZANINE**  
**Category**: Upper Level Assembly
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'fall-protection': 'Fall Protection',
  'mezzanine-ops': 'Mezzanine Operations',
  'material-handling': 'Material Handling at Height',
  'quality-check': 'Quality Inspection'
}
```

### 3️⃣ **WALL/CEILING SET**
**Category**: Structural Framing
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'wall-framing': 'Wall Framing',
  'ceiling-framing': 'Ceiling Framing',
  'blueprint-reading': 'Blueprint Reading',
  'measurement': 'Precise Measurement',
  'power-tools': 'Power Tool Operations',
  'structural-specs': 'Structural Specifications',
  'quality-check': 'Quality Inspection'
}
```

### 4️⃣ **MEP ROUGH-INS**
**Category**: Mechanical/Electrical/Plumbing Rough
```javascript
{
  'safety-elec': 'Electrical Safety',
  'safety-plumb': 'Plumbing Safety',
  'elec-rough': 'Electrical Rough-In Wiring',
  'plumb-rough': 'Plumbing Rough-In',
  'hvac-rough': 'HVAC Rough-In',
  'code-compliance': 'Code Compliance (NEC/IPC/IMC)',
  'inspection-prep': 'Inspection Preparation',
  'quality-check': 'Quality Inspection'
}
```

### 5️⃣ **EXTERIORS**
**Category**: Exterior Finishing
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'siding-install': 'Siding Installation',
  'trim-install': 'Exterior Trim Installation',
  'weather-barrier': 'Weather Barrier Application',
  'caulking-sealing': 'Caulking & Sealing',
  'quality-check': 'Quality Inspection'
}
```

### 6️⃣ **DRYWALL**
**Category**: Drywall Installation
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'drywall-hanging': 'Drywall Hanging',
  'taping': 'Drywall Taping',
  'mudding': 'Drywall Mudding',
  'sanding': 'Sanding Techniques',
  'texture-application': 'Texture Application',
  'quality-check': 'Quality Inspection'
}
```

### 7️⃣ **PRE-FINISH**
**Category**: Finish Preparation
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'surface-prep': 'Surface Preparation',
  'priming': 'Priming Techniques',
  'caulking': 'Caulking',
  'masking': 'Masking & Taping',
  'quality-check': 'Quality Inspection'
}
```

### 8️⃣ **MEP TRIM-OUT**
**Category**: MEP Finals
```javascript
{
  'safety-elec': 'Electrical Safety',
  'safety-plumb': 'Plumbing Safety',
  'elec-trim': 'Electrical Trim-Out',
  'fixture-install-elec': 'Electrical Fixture Installation',
  'fixture-install-plumb': 'Plumbing Fixture Installation',
  'hvac-trim': 'HVAC Trim-Out',
  'system-testing': 'System Testing',
  'code-compliance': 'Code Compliance',
  'quality-check': 'Quality Inspection'
}
```

### 9️⃣ **FINAL FINISH**
**Category**: Final Finishing
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'paint-application': 'Paint Application',
  'trim-install': 'Interior Trim Installation',
  'hardware-install': 'Hardware Installation',
  'touch-up': 'Touch-Up & Detail Work',
  'cabinet-final': 'Cabinet Finals',
  'quality-check': 'Quality Inspection'
}
```

### 🔟 **MODULE SIGN-OFF**
**Category**: Quality Assurance
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'qa-inspection': 'Quality Assurance Inspection',
  'punch-list': 'Punch List Creation',
  'documentation': 'Documentation & Paperwork',
  'sign-off-process': 'Sign-Off Procedures',
  'defect-identification': 'Defect Identification'
}
```

### 1️⃣1️⃣ **CLOSE-UP**
**Category**: Final Assembly & Transport Prep
```javascript
{
  'safety-basic': 'Basic Safety & PPE',
  'final-assembly': 'Final Assembly',
  'securing': 'Module Securing',
  'transport-prep': 'Transport Preparation',
  'strapping': 'Strapping & Tie-Down',
  'documentation': 'Transport Documentation',
  'quality-check': 'Final Quality Check'
}
```

---

## 🔄 DEPARTMENT CODE MAPPING

**Based on employee data, here's my best guess at code → name mapping:**

| Department Code (Data) | Department Name (UI) | Confidence |
|----------------------|-------------------|-----------|
| AVICEI | Wall/Ceiling Set | High |
| AVIEXT | Exteriors | High |
| AVIMEP | MEP Rough-Ins + MEP Trim-Out | High |
| AVIDRW (if exists) | Drywall | Medium |
| AVIFIN | Pre-Finish + Final Finish | High |
| AVIOPR | Module Sign-Off + Close-Up | Medium |
| AVICAB | Final Finish (cabinets) | Medium |
| AVIFCM | Wall/Ceiling Set | Medium |

---

## ✅ NEXT STEPS

### Immediate Actions:
1. **Confirm department expansion plans** - Which departments do you want to subdivide?
2. **Review training skills** - Are the skill sets above appropriate for each stage?
3. **Sync employee data** - Why are employee counts showing "0"? Need to link employee records to departments?

### Questions for You:
1. **Cabinetry**: Where does AVICAB (Cabinetry) fit in your stage-based structure? Is it part of Final Finish?
2. **Framing**: Is AVIFCM the same as "Wall/Ceiling Set"?
3. **Operations**: Is AVIOPR split between Module Sign-Off and Close-Up, or is it separate?
4. **Department Expansion**: Which departments specifically need to be expanded?
   - MEP Rough-Ins → Electrical, Plumbing, HVAC?
   - MEP Trim-Out → Electrical, Plumbing, HVAC?
   - Final Finish → Paint, Trim, Cabinets?
5. **Automation Status**: Is Automation a full department with Line Solutioneers or is it Chandra's automation systems team?

### For Training Module Update:
Once you confirm:
- Department expansion plans
- Department code mappings
- Priority departments for initial rollout

I'll update the Training Directory module with your actual 11 departments (or expanded versions) with stage-appropriate training skills!

---

**Ready for your input on:**
1. Which departments to expand first
2. Department name → code mapping confirmation  
3. Any corrections to the training skills listed above

Let's dial this in! 🎯
