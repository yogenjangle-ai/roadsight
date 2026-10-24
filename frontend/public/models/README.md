# RoadSight Custom Models Directory

Place your fine-tuned YOLOv8n or YOLO11n exported models here!

### Supported Format:
- `best.onnx`: Exported from your Ultralytics YOLO training notebook with:
  ```bash
  yolo export model=runs/detect/train/weights/best.pt format=onnx imgsz=640 opset=12 simplify=True
  ```
- Copy `best.onnx` into this folder: `roadsight/frontend/public/models/best.onnx`.

When the app detects `best.onnx` in this folder, it automatically switches from the built-in heuristic/simulator engine to the accelerated client-side ONNX Runtime Web engine. You can also upload any `.onnx` model directly via the in-app Settings modal at runtime without re-deploying!
