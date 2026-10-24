import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Polygon, Circle, Wedge, Rectangle

# Set up high-res figure (16:9 ratio, ultra crisp 300 DPI)
fig, ax = plt.subplots(figsize=(24, 12), dpi=300)
fig.patch.set_facecolor('#ffffff')
ax.set_facecolor('#ffffff')
ax.set_xlim(0, 100)
ax.set_ylim(0, 50)
ax.axis('off')

# Style Constants
BORDER_COLOR = '#1e293b'
LINE_WIDTH = 1.8
HEADER_FONT_SIZE = 13.5
TITLE_FONT_SIZE = 10.5
BODY_FONT_SIZE = 8.5
FONT_FAMILY = 'DejaVu Sans'

def draw_rounded_box(ax, x, y, w, h, bg_color='#ffffff', border_color=BORDER_COLOR, lw=LINE_WIDTH, radius=1.0):
    box = FancyBboxPatch((x, y), w, h,
                         boxstyle=f"round,pad=0.2,rounding_size={radius}",
                         facecolor=bg_color, edgecolor=border_color, linewidth=lw, zorder=2)
    ax.add_patch(box)
    return box

def draw_arrow(ax, x1, y1, x2, y2, color='#1e293b', lw=1.8):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="-|>", color=color, lw=lw, mutation_scale=16),
                zorder=4)

# ----------------- COLUMN HEADERS -----------------
headers = [
    (10, 47.5, "INPUT"),
    (30.5, 47.5, "PROCESSING (EDGE AI - YOLOv8)"),
    (50.5, 47.5, "STORAGE"),
    (69.5, 47.5, "MATCHING ENGINE"),
    (89.5, 47.5, "OUTPUT & CIVIC DISPATCH")
]

for x, y, text in headers:
    ax.text(x, y, text, ha='center', va='center', fontsize=HEADER_FONT_SIZE, fontweight='bold', color='#0f172a', fontfamily=FONT_FAMILY)

# ==================== COLUMN 1: INPUT ====================
# Box 1: Phone Camera / Dashcam
draw_rounded_box(ax, 2, 33.5, 16, 11, bg_color='#f8fafc')
ax.text(10, 42.8, "Phone Camera / Dashcam", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(10, 41, "(Live Video Stream 640x640)", ha='center', va='center', fontsize=BODY_FONT_SIZE, color='#475569')

# Draw Camera Graphic
cam_rect = Rectangle((8, 36.8), 4, 2.5, facecolor='#0284c7', edgecolor='#0369a1', lw=1.2, zorder=3)
ax.add_patch(cam_rect)
cam_lens = Circle((10, 38.05), 0.9, facecolor='#ffffff', edgecolor='#0369a1', lw=1.2, zorder=4)
ax.add_patch(cam_lens)
cam_top = Rectangle((9.2, 39.3), 1.6, 0.5, facecolor='#0369a1', zorder=3)
ax.add_patch(cam_top)
ax.text(10, 35, "Real-Time Asphalt Road Feed", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#0369a1')

# Box 2: GPS Module
draw_rounded_box(ax, 2, 20.5, 16, 11, bg_color='#f8fafc')
ax.text(10, 29.8, "Mobile GPS / NEO-6M", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(10, 28, "(HTML5 / Hardware GPS)", ha='center', va='center', fontsize=BODY_FONT_SIZE, color='#475569')

# Draw GPS Satellite Graphic
sat_dish = Wedge((9.2, 24.5), 1.2, 30, 210, facecolor='#059669', edgecolor='#047857', lw=1.2, zorder=3)
ax.add_patch(sat_dish)
ax.plot([9.2, 11.2], [24.5, 25.5], color='#047857', lw=2, zorder=4)
ax.text(10, 22, "Location (Lat, Long) & Speed", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#047857')

# Box 3: Roadmap Accelerometer
draw_rounded_box(ax, 2, 7.5, 16, 11, bg_color='#fefce8', border_color='#ca8a04')
ax.text(10, 16.8, "MPU6050 IMU (Roadmap)", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#854d0e')
ax.text(10, 15, "(Accelerometer + Gyro)", ha='center', va='center', fontsize=BODY_FONT_SIZE, color='#854d0e')

# Draw Sensor Board Graphic
imu_board = Rectangle((7.8, 11.2), 4.4, 2.5, facecolor='#eab308', edgecolor='#a16207', lw=1.2, zorder=3)
ax.add_patch(imu_board)
imu_chip = Rectangle((9.2, 11.9), 1.6, 1.1, facecolor='#1e293b', zorder=4)
ax.add_patch(imu_chip)
ax.text(10, 9.3, "Vibration & Shock Telemetry", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#854d0e')

# ==================== COLUMN 2: PROCESSING (EDGE AI) ====================
draw_rounded_box(ax, 21.5, 6, 18, 38.5, bg_color='#ffffff')
ax.text(30.5, 42.8, "Client-Side ONNX Runtime /", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(30.5, 41, "Raspberry Pi On-Device AI", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0284c7')

# Step 1
draw_rounded_box(ax, 23, 32.5, 15, 6.5, bg_color='#f8fafc')
ax.text(30.5, 36.8, "1. Video Frame Ingestion", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#0f172a')
ax.text(30.5, 34.5, "Resize 640x640, Normalization", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#475569')

# Step 2
draw_rounded_box(ax, 23, 24.2, 15, 6.5, bg_color='#eff6ff', border_color='#3b82f6')
ax.text(30.5, 28.5, "2. YOLOv8 Deep Learning", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#1d4ed8')
ax.text(30.5, 26.2, "Neural Network Object Detection", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#1e40af')

# Step 3
draw_rounded_box(ax, 23, 15.9, 15, 6.5, bg_color='#f8fafc')
ax.text(30.5, 20.2, "3. Post-Processing & NMS", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#0f172a')
ax.text(30.5, 17.9, "IoU 0.45 Filter Overlapping Boxes", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#475569')

# Step 4
draw_rounded_box(ax, 23, 7.6, 15, 6.5, bg_color='#fef2f2', border_color='#ef4444')
ax.text(30.5, 11.9, "4. Severity Classification", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#991b1b')
ax.text(30.5, 9.6, "Small / Medium / Large Crater", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#b91c1c')

# Internal arrows inside Processing
draw_arrow(ax, 30.5, 32.5, 30.5, 30.7)
draw_arrow(ax, 30.5, 24.2, 30.5, 22.4)
draw_arrow(ax, 30.5, 15.9, 30.5, 14.1)

# ==================== COLUMN 3: STORAGE ====================
draw_rounded_box(ax, 42.5, 6, 16, 38.5, bg_color='#ffffff')
ax.text(50.5, 42.8, "SQLite & IndexedDB", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(50.5, 41, "(Local Route Memory)", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, color='#475569')

# Draw Database Cylinder Graphic
db_top = patches.Ellipse((50.5, 37.8), 3.2, 1.0, facecolor='#0284c7', edgecolor='#0369a1', lw=1.2, zorder=4)
ax.add_patch(db_top)
db_body = Rectangle((48.9, 35.2), 3.2, 2.6, facecolor='#0284c7', edgecolor='#0369a1', lw=1.2, zorder=3)
ax.add_patch(db_body)
db_bottom = patches.Ellipse((50.5, 35.2), 3.2, 1.0, facecolor='#0369a1', edgecolor='#0369a1', lw=1.2, zorder=4)
ax.add_patch(db_bottom)

db_fields = [
    "- PWD Ticket ID (PWD-2026-X)",
    "- Hazard Type (Pothole)",
    "- Severity (Small / Med / Large)",
    "- GPS Latitude & Longitude",
    "- Reverse Geocoded Street Name",
    "- Timestamp & Date",
    "- Photo Evidence Snapshot",
    "- Technical Road Condition Note",
    "- Repair Status (Pending / Filled)"
]

y_pos = 32.5
for field in db_fields:
    ax.text(44, y_pos, field, ha='left', va='center', fontsize=BODY_FONT_SIZE-0.5, color='#1e293b', fontfamily=FONT_FAMILY)
    y_pos -= 2.8

# ==================== COLUMN 4: MATCHING ====================
draw_rounded_box(ax, 61.5, 6, 16, 38.5, bg_color='#ffffff')
ax.text(69.5, 42.8, "Matching Engine &", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(69.5, 41, "Proactive Alert Logic", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, color='#475569')

# Step 1
draw_rounded_box(ax, 63, 33, 13, 6, bg_color='#f8fafc')
ax.text(69.5, 36.8, "1. Live GPS Query", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#0f172a')
ax.text(69.5, 34.8, "From Device / NEO-6M", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#475569')

# Step 2
draw_rounded_box(ax, 63, 24.2, 13, 6.2, bg_color='#f8fafc')
ax.text(69.5, 28.2, "2. Spatial Search", ha='center', va='center', fontsize=TITLE_FONT_SIZE-1, fontweight='bold', color='#0f172a')
ax.text(69.5, 26, "Check Radius (50m - 100m)", ha='center', va='center', fontsize=BODY_FONT_SIZE-1, color='#475569')

# Decision Diamond
diamond_pts = [[69.5, 21.0], [75.2, 17.0], [69.5, 13.0], [63.8, 17.0]]
diamond = Polygon(diamond_pts, closed=True, facecolor='#fef3c7', edgecolor='#d97706', linewidth=2.0, zorder=3)
ax.add_patch(diamond)
ax.text(69.5, 17.8, "3. Hazard", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#92400e')
ax.text(69.5, 16.2, "Ahead?", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#92400e')

# Step 4
draw_rounded_box(ax, 63, 7.6, 13, 4.4, bg_color='#fef2f2', border_color='#ef4444')
ax.text(69.5, 9.8, "4. Prepare Alert & Docket", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#b91c1c')

# Internal arrows inside Matching
draw_arrow(ax, 69.5, 33, 69.5, 30.4)
draw_arrow(ax, 69.5, 24.2, 69.5, 21.0)
draw_arrow(ax, 69.5, 13.0, 69.5, 12.0)
ax.text(70.8, 12.5, "Yes", fontsize=8.5, fontweight='bold', color='#16a34a')

# ==================== COLUMN 5: OUTPUT ====================
draw_rounded_box(ax, 80.5, 6, 18, 38.5, bg_color='#ffffff')

# Top Output: Driver Alert
draw_rounded_box(ax, 82, 24.5, 15, 18.5, bg_color='#f8fafc')
ax.text(89.5, 41.2, "Driver Safety Alerts", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#0f172a')

# Speaker Graphic
spk_pts = [[85.8, 37.5], [87.2, 37.5], [88.6, 39], [88.6, 35], [87.2, 36.5], [85.8, 36.5]]
spk = Polygon(spk_pts, closed=True, facecolor='#d97706', edgecolor='#b45309', lw=1.2, zorder=3)
ax.add_patch(spk)
ax.plot([89.3, 89.8], [37.5, 37.5], color='#b45309', lw=2, zorder=3)
ax.plot([89.3, 89.7], [38.3, 38.7], color='#b45309', lw=2, zorder=3)
ax.plot([89.3, 89.7], [36.7, 36.3], color='#b45309', lw=2, zorder=3)

ax.text(89.5, 34, '"Pothole Ahead in 50m.', ha='center', va='center', fontsize=BODY_FONT_SIZE+0.5, style='italic', color='#1e293b')
ax.text(89.5, 32.2, 'Please Slow Down!"', ha='center', va='center', fontsize=BODY_FONT_SIZE+0.5, style='italic', color='#1e293b')
ax.text(89.5, 28.5, "Live HUD Bounding Boxes", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#0284c7')
ax.text(89.5, 26.5, "Reticles & Severity Badges", ha='center', va='center', fontsize=8, color='#64748b')

# Bottom Output: PWD Civic Action
draw_rounded_box(ax, 82, 7.6, 15, 15.5, bg_color='#fef2f2', border_color='#dc2626')
ax.text(89.5, 21.5, "PWD Civic Dispatch", ha='center', va='center', fontsize=TITLE_FONT_SIZE, fontweight='bold', color='#991b1b')
ax.text(89.5, 18.5, "- 1-Click Official PWD Email", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#0f172a')
ax.text(89.5, 16.5, "- WhatsApp Road Helpline", ha='center', va='center', fontsize=BODY_FONT_SIZE, fontweight='bold', color='#059669')
ax.text(89.5, 14.5, "- Download CSV / PDF Docket", ha='center', va='center', fontsize=BODY_FONT_SIZE, color='#475569')
ax.text(89.5, 12.5, "- Google Maps Pin & GPS Link", ha='center', va='center', fontsize=BODY_FONT_SIZE, color='#475569')
ax.text(89.5, 9.8, "Goal: PWD Repairs & Fills Hazard", ha='center', va='center', fontsize=8, fontweight='bold', color='#dc2626')

# ==================== MAIN CONNECTING ARROWS ====================
# Inputs -> Processing
draw_arrow(ax, 18, 39, 21.5, 35)
draw_arrow(ax, 18, 26, 21.5, 26)
draw_arrow(ax, 18, 13, 21.5, 18)

# Processing -> Storage
draw_arrow(ax, 39.5, 25.2, 42.5, 25.2)

# Storage -> Matching
draw_arrow(ax, 58.5, 25.2, 61.5, 25.2)

# Matching -> Output
draw_arrow(ax, 75.2, 17.0, 82, 33.5) # Diamond to Driver Alert
draw_arrow(ax, 76, 9.8, 82, 15.3)    # Action step to PWD

ax.text(78, 26.5, "Hazard\nTrigger", ha='center', va='center', fontsize=8.5, fontweight='bold', color='#b91c1c')

# Save outputs
out_path_1 = '/Users/bhavesh/Desktop/jobshield-ai/roadsight/system_architecture.png'
out_path_2 = '/Users/bhavesh/Desktop/system_architecture.png'

plt.tight_layout()
plt.savefig(out_path_1, dpi=300, bbox_inches='tight', facecolor='#ffffff')
plt.savefig(out_path_2, dpi=300, bbox_inches='tight', facecolor='#ffffff')
print("Successfully generated high-resolution architecture diagram!")
