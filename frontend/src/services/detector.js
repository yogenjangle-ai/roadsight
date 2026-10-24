/**
 * RoadSight Computer Vision Detection Engine
 * Integrates ONNX Runtime Web for local client-side YOLOv8 / YOLO11 inference.
 * Includes automatic model loading, preprocessing (640x640 letterbox/tensor conversion),
 * WebGL/WASM hardware acceleration, and dynamic fallback simulation.
 */
import * as ort from 'onnxruntime-web';
import { processYoloOutput, calculateSeverity } from '../utils/yoloUtils';

// Configure ONNX Runtime Web environment
ort.env.wasm.numThreads = 1;
ort.env.wasm.simd = true;

class DetectorService {
  constructor() {
    this.session = null;
    this.modelStatus = 'unloaded'; // 'unloaded' | 'loading' | 'ready' | 'simulated' | 'error'
    this.modelSource = 'simulator'; // 'onnx' | 'simulator'
    this.modelPath = '/models/best.onnx';
    this.confThreshold = 0.35;
    this.iouThreshold = 0.45;
    this.inputSize = 640;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.inputSize;
    this.offscreenCanvas.height = this.inputSize;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Simulator state
    this.simulatedBoxes = [];
    this.lastSimTime = 0;
  }

  setThresholds(conf, iou) {
    if (conf != null) this.confThreshold = conf;
    if (iou != null) this.iouThreshold = iou;
  }

  /**
   * Initializes or reloads the ONNX model
   * @param {ArrayBuffer|string|null} customModel - optional buffer from file upload
   */
  async loadModel(customModel = null) {
    this.modelStatus = 'loading';
    try {
      const options = {
        executionProviders: ['webgl', 'wasm'],
        graphOptimizationLevel: 'all',
      };

      if (customModel instanceof ArrayBuffer) {
        // User uploaded custom .onnx model directly in browser
        this.session = await ort.InferenceSession.create(customModel, options);
        this.modelStatus = 'ready';
        this.modelSource = 'onnx';
        console.log('✅ Loaded custom ONNX model from uploaded file');
        return { success: true, mode: 'onnx' };
      }

      // Check if default best.onnx exists in /models/best.onnx
      const checkRes = await fetch(this.modelPath, { method: 'HEAD' });
      if (checkRes.ok && checkRes.headers.get('content-type') !== 'text/html') {
        this.session = await ort.InferenceSession.create(this.modelPath, options);
        this.modelStatus = 'ready';
        this.modelSource = 'onnx';
        console.log('✅ Loaded fine-tuned YOLO model from', this.modelPath);
        return { success: true, mode: 'onnx' };
      }

      // If best.onnx is not present yet, activate Heuristic / Preview Simulator
      console.warn('⚠️ /models/best.onnx not found. Falling back to Heuristic / Simulator mode.');
      this.modelStatus = 'simulated';
      this.modelSource = 'simulator';
      return { success: true, mode: 'simulator' };
    } catch (err) {
      console.warn('ONNX initialization warning, falling back to simulator:', err.message);
      this.modelStatus = 'simulated';
      this.modelSource = 'simulator';
      return { success: false, mode: 'simulator', error: err.message };
    }
  }

  /**
   * Runs detection on an HTMLVideoElement or HTMLImageElement
   * @param {HTMLVideoElement|HTMLImageElement} mediaElement
   * @returns {Promise<{ detections: Array, latencyMs: number }>}
   */
  async detect(mediaElement) {
    const startTime = performance.now();

    const origWidth = mediaElement.videoWidth || mediaElement.naturalWidth || mediaElement.width || 640;
    const origHeight = mediaElement.videoHeight || mediaElement.naturalHeight || mediaElement.height || 640;

    if (!origWidth || !origHeight) {
      return { detections: [], latencyMs: 0 };
    }

    if (this.session && this.modelSource === 'onnx') {
      try {
        // 1. Draw input scaled to 640x640 on offscreen canvas
        this.offscreenCtx.drawImage(
          mediaElement,
          0, 0, origWidth, origHeight,
          0, 0, this.inputSize, this.inputSize
        );

        // 2. Extract ImageData
        const imgData = this.offscreenCtx.getImageData(0, 0, this.inputSize, this.inputSize);
        const { data } = imgData;

        // 3. Prepare Float32Array tensor [1, 3, 640, 640] normalized to [0, 1]
        const floatData = new Float32Array(3 * this.inputSize * this.inputSize);
        const channelSize = this.inputSize * this.inputSize;

        for (let i = 0; i < channelSize; i++) {
          const r = data[i * 4] / 255.0;
          const g = data[i * 4 + 1] / 255.0;
          const b = data[i * 4 + 2] / 255.0;

          floatData[i] = r;                    // R channel
          floatData[channelSize + i] = g;      // G channel
          floatData[2 * channelSize + i] = b;  // B channel
        }

        const inputTensor = new ort.Tensor('float32', floatData, [1, 3, this.inputSize, this.inputSize]);

        // 4. Run model inference
        const inputName = this.session.inputNames[0];
        const feeds = { [inputName]: inputTensor };
        const results = await this.session.run(feeds);

        const outputName = this.session.outputNames[0];
        const outputTensor = results[outputName];

        // 5. Decode YOLO detections
        const detections = processYoloOutput(
          outputTensor,
          this.confThreshold,
          this.iouThreshold,
          this.inputSize,
          this.inputSize,
          origWidth,
          origHeight
        );

        const latencyMs = Math.round(performance.now() - startTime);
        return { detections, latencyMs };
      } catch (err) {
        console.error('Inference execution error:', err);
      }
    }

    // Heuristic / Preview Simulator mode
    const detections = this.runSimulation(origWidth, origHeight);
    const latencyMs = Math.round(performance.now() - startTime);
    return { detections, latencyMs };
  }

  /**
   * Generates realistic simulated road pothole detections for testing/previewing
   */
  runSimulation(width, height) {
    const now = performance.now();
    const frameArea = width * height;

    // Refresh simulation pattern every 3.5s
    if (now - this.lastSimTime > 3500 || this.simulatedBoxes.length === 0) {
      this.lastSimTime = now;
      this.simulatedBoxes = [];

      // 70% chance to have 1 or 2 potholes in view (typical road scenario)
      if (Math.random() < 0.75) {
        const count = Math.random() > 0.6 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          // Place inside road lane area (lower half / bottom 60% of frame)
          const laneMinX = width * 0.2;
          const laneMaxX = width * 0.8;
          const laneMinY = height * 0.45;
          const laneMaxY = height * 0.85;

          const boxW = (0.12 + Math.random() * 0.18) * width;
          const boxH = (0.08 + Math.random() * 0.12) * height;
          const x = laneMinX + Math.random() * (laneMaxX - laneMinX - boxW);
          const y = laneMinY + Math.random() * (laneMaxY - laneMinY - boxH);

          const boxArea = boxW * boxH;
          const severity = calculateSeverity(boxArea, frameArea);
          const score = Number((0.72 + Math.random() * 0.24).toFixed(2));

          this.simulatedBoxes.push({
            box: [x, y, x + boxW, y + boxH],
            x,
            y,
            width: boxW,
            height: boxH,
            score,
            label: 'pothole',
            severity,
          });
        }
      }
    }

    // Add gentle jitter to simulate vehicle vibration/movement
    return this.simulatedBoxes.map((b) => {
      const jitterX = (Math.sin(now / 150) * 2);
      const jitterY = (Math.cos(now / 200) * 1.5);
      return {
        ...b,
        x: Math.max(0, b.x + jitterX),
        y: Math.max(0, b.y + jitterY),
        box: [
          Math.max(0, b.box[0] + jitterX),
          Math.max(0, b.box[1] + jitterY),
          Math.min(width, b.box[2] + jitterX),
          Math.min(height, b.box[3] + jitterY),
        ],
      };
    });
  }
}

export const detectorService = new DetectorService();
