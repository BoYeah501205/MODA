# Employee Station Assignment Instructions

## File to Edit
`Employee_Station_Assignment.csv`

## Task
Fill in the **Home Station** column (last column) for each employee.

---

## Valid Station Values (use exactly as shown)

### Pilot Stations (Start Here)
| Station ID | Station Name |
|------------|--------------|
| `auto-fc` | Automation (Floor/Ceiling) |
| `auto-walls` | Automation (Walls) |
| `mezzanine` | Mezzanine |

### All Other Stations (for future expansion)
| Station ID | Station Name |
|------------|--------------|
| `elec-ceiling` | Electrical - Ceilings |
| `wall-set` | Wall Set |
| `ceiling-set` | Ceiling Set |
| `soffits` | Soffits |
| `mech-rough` | Mechanical Rough-In |
| `elec-rough` | Electrical Rough-In |
| `plumb-rough` | Plumbing Rough-In |
| `exteriors` | Exteriors |
| `drywall-bp` | Drywall - BackPanel |
| `drywall-ttp` | Drywall - Tape/Texture/Paint |
| `roofing` | Roofing |
| `pre-finish` | Pre-Finish |
| `mech-trim` | Mechanical Trim |
| `elec-trim` | Electrical Trim |
| `plumb-trim` | Plumbing Trim |
| `final-finish` | Final Finish |
| `sign-off` | Module Sign-Off |
| `close-up` | Close-Up |

---

## Example

```csv
Employee ID,First Name,Last Name,HR Department,Shift,Hire Date,Home Station
15,Jon,Pope,AVICAB,Shift-A,2023-12-18,auto-fc
16,Ernest,Garcia,AVICAB,Shift-A,2023-01-09,mezzanine
18,David,Cornett,AVICAB,Shift-A,2022-02-21,auto-walls
```

---

## Notes
- Only fill in stations for employees you want to track in the Training Matrix
- Leave blank for employees not assigned to production stations
- For the pilot, focus on employees assigned to: `auto-fc`, `auto-walls`, `mezzanine`
- You can assign the same station to multiple employees
- One employee = one home station (their primary assignment)

---

## After Completing
Return the filled CSV and I will:
1. Import the station assignments
2. Build the Training Matrix for Automation FC/W and Mezzanine
3. Define the skills to track for each station
