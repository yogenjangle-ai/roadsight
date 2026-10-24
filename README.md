# 🛣️ RoadSight PWD: Real-Time Mobile Pothole Detection & Govt Road Grievance Portal

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![ONNX Runtime Web](https://img.shields.io/badge/Inference-ONNX_Runtime_Web-005CED?logo=onnx&logoColor=white)](https://onnxruntime.ai/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![YOLOv8](https://img.shields.io/badge/AI_Model-YOLOv8n_%2F_YOLO11n-00FFFF?logo=ultralytics&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**RoadSight PWD** is a complete, mobile-first Edge AI road safety and civic action web application. It connects directly to your phone camera (rear dashcam mode) or webcam, detects potholes in real time, generates technical asphalt condition notes with exact GPS coordinates and Google Maps navigation links, and automatically formats and dispatches official road repair grievance notices to the **Public Works Department (PWD)**, Municipal Corporations, or Highway Authorities (NHAI) via email, WhatsApp helpline, and downloadable repair dockets so hazardous potholes get filled fast.

---

## 📑 Table of Contents
1. [Project Overview, Features & UI Preview](#1-project-overview-features--ui-preview)
2. [Folder Structure Explained](#2-folder-structure-explained)
3. [System Requirements & Installation](#3-system-requirements--installation)
4. [Dataset Guide](#4-dataset-guide)
5. [Model Training Guide (Google Colab)](#5-model-training-guide-google-colab)
6. [Running Locally & Phone Testing via ngrok HTTPS](#6-running-locally--phone-testing-via-ngrok-https)
7. [Backend Setup & API Reference](#7-backend-setup--api-reference)
8. [Production Deployment Guide](#8-production-deployment-guide)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)
10. [Future Enhancements, License & Credits](#10-future-enhancements-license--credits)

---

## 1. Project Overview, Features & UI Preview

### Key Capabilities
- **Real-Time In-Browser Computer Vision**: Runs fine-tuned **YOLOv8n / YOLO11n** directly on the mobile GPU using ONNX Runtime Web (WASM + WebGL) achieving **15–35+ FPS** without sending video frames over the network.
- **Dynamic Severity Classification**: Evaluates bounding box area relative to the camera frame:
  - 🟡 **Small Hazard** (`< 3.5%` frame area): Shallow potholes, transverse asphalt cracks.
  - 🟠 **Medium Hazard** (`3.5% – 10%` frame area): Moderate craters, jarring impact risks.
  - 🔴 **Large Hazard** (`> 10%` frame area): Critical rim-bending craters, immediate blowout risk.
- **🚨 1-Click PWD Grievance Dispatch System**:
  - Automatically generates an official **PWD Ticket Reference ID** (e.g. `PWD-2026-94812`).
  - Drafts an **Official Technical Condition Report** describing the crater size, risk to two-wheelers, and recommended asphalt patching technique.
  - **1-Click Official Email**: Opens default email with pre-filled subject, coordinates, Google Maps pin, and PWD grievance officer recipient.
  - **1-Click WhatsApp Helpline**: Formats an official road complaint with coordinates and links ready to send to civic road helplines.
  - **Printable Docket**: Generates downloadable `.txt` work order dockets ready for municipal audit.
- **Interactive Drive Simulator**: Test the entire detection and PWD dispatch workflow right from your laptop or indoors without stepping outside, using an animated road surface feed.
- **Municipal Status Tracker**: Tracks the real-world repair lifecycle (`REPORTED TO PWD` -> `INSPECTION SCHEDULED` -> `WORK ORDER ISSUED` -> `REPAIRED & FILLED`).
- **Interactive Hazard Map**: Dark-mode Leaflet map with custom repair-status pins, popup previews, and one-tap "Navigate with Google Maps" links.
- **Offline-First Resilience**: All captures and annotations persist in browser IndexedDB, with background synchronization to the optional FastAPI backend.

### UI & Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                               ROADSIGHT APPLICATION ARCHITECTURE                  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Phone Camera Stream] (getUserMedia rear-facing)                                 |
|            |                                                                      |
|            v                                                                      |
|  [Canvas Video Stream 640x640]                                                    |
|            |                                                                      |
|            v                                                                      |
|  +--------------------+   WebGL/WASM    +--------------------------------------+  |
|  | ONNX Runtime Web   | --------------> | YOLOv8n/11n best.onnx (Client-Side)  |  |
|  +--------------------+                 +--------------------------------------+  |
|            |                                                                      |
|            v (Center X, Y, W, H, Score)                                           |
|  +-----------------------------------------------------------------------------+  |
|  | Post-Processing: NMS Filter (0.45 IoU) & Dynamic Severity Estimator          |  |
|  +-----------------------------------------------------------------------------+  |
|            |                                                                      |
|     +------+-----------------------------+-------------------------------+        |
|     |                                    |                               |        |
|     v                                    v                               v        |
|  [Canvas HUD Overlay]             [Web Audio Alert]            [Geo-Tag & Snapshot]
|  - Corner reticles                - 550Hz Small                - HTML5 GPS        |
|  - Confidence badge               - 680Hz Medium               - Street Geocoding |
|  - Live FPS / Latency             - 880Hz Large Warning        - IndexedDB Sync   |
|                                                                          |        |
|                                                                          v        |
|                                                                  [FastAPI + SQLite]
+-----------------------------------------------------------------------------------+
```

---

## 2. Folder Structure Explained

```
roadsight/
├── frontend/                     # React + Vite + Tailwind mobile web application
│   ├── public/
│   │   ├── models/               # Storage directory for fine-tuned best.onnx model
│   │   │   └── README.md         # Instructions on model placement
│   │   └── pothole-icon.svg      # Road hazard application icon
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraView.jsx    # Live camera feed, canvas HUD, auto-capture & torch
│   │   │   ├── UploadView.jsx    # Photo upload detector & manual annotation form
│   │   │   ├── MapView.jsx       # Dark Leaflet road hazard map with severity pins
│   │   │   ├── GalleryView.jsx   # Captured report grid, search, filters & CSV export
│   │   │   ├── Navbar.jsx        # Mobile thumb-navigation & telemetry header
│   │   │   └── SettingsModal.jsx # Sensitivity sliders, model switcher, backend config
│   │   ├── services/
│   │   │   ├── detector.js       # ONNX Runtime Web inference engine & simulator
│   │   │   ├── audio.js          # Web Audio API alert frequency synthesizer
│   │   │   ├── geo.js            # Geolocation watcher & OpenStreetMap reverse geocoder
│   │   │   ├── storage.js        # IndexedDB offline-first report persistence
│   │   │   └── api.js            # FastAPI synchronization client
│   │   ├── utils/
│   │   │   ├── yoloUtils.js      # Letterboxing, IoU, Non-Max Suppression, severity scoring
│   │   │   └── formatters.js     # Date/time formatting, CSV/JSON report exporters
│   │   ├── App.jsx               # Main application coordinator
│   │   ├── main.jsx              # React DOM entry point
│   │   └── index.css             # Tailwind base & dark-mode Leaflet styles
│   ├── package.json              # NPM dependencies & scripts
│   ├── vite.config.js            # Vite bundler configuration & WASM headers
│   └── tailwind.config.js        # Road-safety color palette configuration
│
├── backend/                      # Optional FastAPI + SQLite report synchronization server
│   ├── app/
│   │   ├── main.py               # FastAPI application with CORS and lifespan events
│   │   ├── models.py             # SQLAlchemy DB schemas & Pydantic request models
│   │   ├── database.py           # Async SQLite engine configuration (aiosqlite)
│   │   ├── routes.py             # REST endpoints (reports CRUD, stats, detection)
│   │   └── inference.py          # Optional server-side YOLO inference engine
│   ├── requirements.txt          # Python package requirements
│   └── run.py                    # Server launcher script
│
├── colab/                        # Model training resources
│   ├── RoadSight_YOLO_Training.ipynb # Complete step-by-step Google Colab notebook
│   ├── augment.py                # Standalone Python script for dataset expansion
│   └── data.yaml.example         # YOLO dataset configuration template
│
└── README.md                     # Comprehensive project documentation
```

---

## 3. System Requirements & Installation

### Prerequisites
- **Node.js**: v18.0.0 or newer (v20+ recommended)
- **Python**: v3.9+ to v3.13
- **Git**
- Modern Web Browser:
  - iOS: Safari (iOS 15+)
  - Android: Chrome (v100+)
  - Desktop: Chrome, Brave, Edge, Firefox

---

### Step 1: Install Frontend Dependencies
```bash
cd roadsight/frontend
npm install
```

### Step 2: Install Backend Dependencies
```bash
cd ../backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## 4. Dataset Guide

### Recommended Datasets (YOLO Format)
For detecting road damage and potholes with high accuracy, choose one of these tested datasets:
1. **Roboflow Universe: Pothole Detection Dataset (v2)**
   - Link: [Roboflow Universe Potholes](https://universe.roboflow.com/search?q=pothole)
   - Size: 650–1,200+ annotated images.
   - Format: Direct YOLOv8 PyTorch export.
2. **Kaggle: Annotated Potholes Dataset (`chitholian/annotated-potholes-dataset`)**
   - Size: 665 real road photos with bounding box annotations.
   - High variety of lighting: daylight, rain puddles, shadows, gravel edges.

### Setting Up the Kaggle API
1. Go to your Kaggle account: `https://www.kaggle.com/settings` -> click **Create New Token**.
2. Save the downloaded `kaggle.json` file.
3. In Colab or your local terminal:
   ```bash
   mkdir -p ~/.kaggle
   cp kaggle.json ~/.kaggle/
   chmod 600 ~/.kaggle/kaggle.json
   kaggle datasets download -d chitholian/annotated-potholes-dataset -p ./raw_dataset --unzip
   ```

### Expected Dataset Folder Layout
```
pothole_dataset/
├── data.yaml
├── images/
│   ├── train/  # 70% of images
│   ├── val/    # 20% of images
│   └── test/   # 10% of images
└── labels/
    ├── train/  # YOLO txt labels (class x_center y_center width height)
    ├── val/
    └── test/
```

### Example `data.yaml`
```yaml
path: /content/pothole_dataset # Root path
train: images/train
val: images/val
test: images/test

names:
  0: pothole
```

### Verifying Labels
YOLO annotations are normalized floats between `0.0` and `1.0`:
```text
# Format: <class_id> <x_center> <y_center> <width> <height>
0 0.512400 0.684500 0.245000 0.128000
```
- Ensure all coordinates are strictly within `[0.0, 1.0]`.
- Class ID must be `0` for single-class pothole detection.

### Expanding Datasets with Fewer Than 500 Images
Run the bundled augmentation utility:
```bash
python colab/augment.py --raw_dir ./raw_dataset --output_dir ./pothole_dataset
```
This script automatically applies:
- Horizontal bounding-box inversion (`1.0 - x_center`)
- Random brightness shift (`+25%` and `-25%` for dusk/night)
- Contrast perturbation
- Gaussian motion blur
- Generates 70/20/10 train/val/test splits and writes `data.yaml`.

---

## 5. Model Training Guide (Google Colab)

The complete pipeline is ready in [`colab/RoadSight_YOLO_Training.ipynb`](file:///Users/bhavesh/Desktop/jobshield-ai/roadsight/colab/RoadSight_YOLO_Training.ipynb).

### Step 1: Open Colab & Enable GPU
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **Upload** -> select `RoadSight_YOLO_Training.ipynb`.
3. In the top menu, go to **Runtime** -> **Change runtime type** -> select **T4 GPU** -> click **Save**.

### Step 2: Install Ultralytics & Load Dataset
Run the first code cells:
```python
!nvidia-smi
!pip install -q ultralytics onnx onnxruntime onnxslim
```

### Step 3: Run Training
```python
from ultralytics import YOLO

# Load pre-trained nano backbone
model = YOLO('yolov8n.pt')  # or 'yolo11n.pt'

# Fine-tune model
results = model.train(
    data="/content/pothole_dataset/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    patience=10,        # Early stopping triggers after 10 stagnant epochs
    device=0,
    optimizer='auto',
    save=True,
    plots=True
)
```

### Step 4: Evaluate Model Performance
```python
# Validate on the hold-out test split
metrics = model.val(data="/content/pothole_dataset/data.yaml", split='test')
print(f"Precision: {metrics.box.p[0]:.4f}")
print(f"Recall:    {metrics.box.r[0]:.4f}")
print(f"mAP@50:    {metrics.box.map50:.4f}")
print(f"mAP@50-95: {metrics.box.map:.4f}")
```
Key targets to look for:
- **mAP@50 > 0.75**: Excellent detection of potholes at various distances.
- **Recall > 0.70**: Ensures critical road hazards are not missed.
- **Precision > 0.80**: Prevents false alarms on benign road tar lines.

### Step 5: Export to ONNX / TF.js
```python
# Export to optimized ONNX for WebGL
onnx_path = model.export(
    format='onnx',
    imgsz=640,
    opset=12,
    simplify=True
)

# Download to your machine
from google.colab import files
files.download(onnx_path)
```

### Step 6: Install the Model into RoadSight
1. Rename the downloaded file to `best.onnx`.
2. Move it into the frontend public directory:
   ```bash
   cp best.onnx roadsight/frontend/public/models/best.onnx
   ```
3. Restart or refresh the web app. The top status bar will change to **`YOLO-ONNX`**!
4. *Alternative:* Tap the **Gear (Settings)** icon in the web app and click **Load Custom .onnx Model File** to load it directly from your device storage without any file copying or rebuilds.

### How to Improve Accuracy
- **More Diverse Lighting**: Add images of wet roads, nighttime driving with headlights, and gravel roads.
- **Higher Input Resolution**: Train with `imgsz=800` if mobile device has a flagship GPU (Snapdragon 8 Gen 2+ or Apple A16+).
- **Larger Model**: Try `yolov8s.pt` (Small) if target phones maintain > 15 FPS.
- **Active Retraining**: Export false positive captures from RoadSight's Gallery as a zip, re-label them, and train for 20 more epochs with `yolov8n.pt` initialized from `best.pt`.

---

## 6. Running Locally & Phone Testing via ngrok HTTPS

> [!IMPORTANT]
> Modern mobile browsers (**iOS Safari** and **Android Chrome**) strictly require **HTTPS** to grant camera (`getUserMedia`) and GPS permissions, except on `localhost`. When testing on a physical smartphone, you must use an HTTPS tunnel like **ngrok**.

### Step 1: Start the Frontend Locally
```bash
cd roadsight/frontend
npm run dev -- --host
```
The terminal will display:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.50:5173/
```

### Step 2: Start the FastAPI Backend (Optional)
```bash
cd roadsight/backend
python run.py
```
Backend runs on `http://localhost:8000`.

### Step 3: Expose via ngrok for Phone HTTPS Testing
In a new terminal window, run:
```bash
ngrok http 5173
```
ngrok will provide a secure public URL:
```
Forwarding   https://a1b2-c3d4.ngrok-free.app -> http://localhost:5173
```

### Step 4: Open on Your Phone
1. Open **Safari** (iOS) or **Chrome** (Android).
2. Navigate to your ngrok HTTPS URL (`https://a1b2-c3d4.ngrok-free.app`).
3. When prompted, tap **Allow Camera Access** and **Allow Location Access**.
4. Point your phone at the road or a simulated monitor screen to start detecting!

---

## 7. Backend Setup & API Reference

The FastAPI backend provides persistent SQLite storage and REST endpoints for team road audits, municipality reporting, and automated sync.

### Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check |
| `POST` | `/api/reports` | Create or sync a pothole report |
| `GET` | `/api/reports` | List reports (supports `?severity=Large&limit=50`) |
| `GET` | `/api/reports/{id}` | Retrieve specific report details |
| `DELETE`| `/api/reports/{id}` | Delete a report |
| `GET` | `/api/stats` | Aggregated metrics, severity distribution, totals |
| `POST` | `/api/detect` | Server-side YOLO inference for uploaded image files |

### Example Sync Request (`POST /api/reports`)
```json
{
  "client_id": "rep_1729731200_a8f9",
  "timestamp": 1729731200000,
  "latitude": 37.77492,
  "longitude": -122.41941,
  "severity": "Large",
  "confidence": 0.89,
  "potholes_count": 1,
  "address": "Market Street, San Francisco, CA",
  "notes": "Severe rim-bending hole in middle lane",
  "image_data": "data:image/jpeg;base64,..."
}
```

---

## 8. Production Deployment Guide

### Option A: Frontend on Vercel / Netlify
1. Connect your GitHub repository to [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
2. Set **Root Directory** to `roadsight/frontend`.
3. Set **Build Command** to `npm run build`.
4. Set **Output Directory** to `dist`.
5. Under Environment Variables, add:
   - `VITE_API_URL`: Your deployed FastAPI URL (or leave blank for client-side local mode).
6. Click **Deploy**. Vercel automatically assigns a free SSL certificate (`https://your-app.vercel.app`), which enables mobile camera access immediately.

### Option B: Backend on Render / Railway / Fly.io
1. Create a new Web Service pointing to `roadsight/backend`.
2. Set Build Command: `pip install -r requirements.txt`.
3. Set Start Command: `python run.py`.
4. Add environment variable `PORT=8000`.

---

## 9. Troubleshooting & FAQs

### Q1: The camera screen is black or says "Permission Denied"
- **Cause**: The page is loaded over insecure HTTP or camera permission was rejected.
- **Fix**: Use HTTPS (via ngrok or Vercel). On iOS Safari, tap `AA` in the URL bar -> **Website Settings** -> set **Camera** to **Allow**.

### Q2: Low FPS on Mobile (< 10 FPS)
- **Fix 1**: In the app's **Settings Modal**, increase the Confidence Threshold from `0.20` to `0.40` to reduce post-processing overhead.
- **Fix 2**: Close background browser tabs.
- **Fix 3**: Make sure WebGL is enabled in your mobile browser settings.

### Q3: Model says "Sim-Engine" instead of "YOLO-ONNX"
- **Cause**: The application did not find `/models/best.onnx` in the frontend `public` directory.
- **Fix**: Either copy your trained model to `roadsight/frontend/public/models/best.onnx`, or open **Settings** in the app and click **Load Custom .onnx Model File** to load it directly from your device.

### Q4: GPS says "Searching GPS" or "Acquiring..."
- **Fix**: Ensure your mobile device has Location Services toggled on and browser location permissions are granted.

---

## 10. Future Enhancements, License & Credits

### Roadmap
- [ ] **Stereo Depth Estimation**: Integrate WebGL disparity mapping to measure physical pothole depth in centimeters.
- [ ] **OBD-II Bluetooth Telemetry**: Log vehicle speed and suspension shock sensor spikes concurrent with visual detection.
- [ ] **Voice Hazard Alerts**: Text-to-speech warnings ("Hazard 50 meters ahead").
- [ ] **Automated Municipality Export**: Direct export to city 311 reporting APIs.

### License
This project is open-source under the [MIT License](https://opensource.org/licenses/MIT).

### Credits
- **Ultralytics YOLOv8 / YOLO11**: [ultralytics.com](https://github.com/ultralytics/ultralytics)
- **ONNX Runtime Web**: [onnxruntime.ai](https://github.com/microsoft/onnxruntime)
- **CartoDB & OpenStreetMap**: Dark Matter Map Tiles
- **Lucide Icons**: Modern road-safety iconography
