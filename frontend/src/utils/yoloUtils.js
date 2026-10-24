/**
 * YOLOv8 / YOLO11 Post-processing utilities for RoadSight
 * Handles tensor parsing, coordinate re-scaling, IoU, NMS, and severity scoring.
 */

/**
 * Calculates severity based on bounding box area relative to frame area
 * @param {number} boxArea - area in pixels (width * height)
 * @param {number} frameArea - frame total area in pixels
 * @returns {{ label: 'Small'|'Medium'|'Large', color: string, badgeBg: string, level: number }}
 */
export function calculateSeverity(boxArea, frameArea) {
  const ratio = boxArea / Math.max(frameArea, 1);
  if (ratio < 0.035) {
    return {
      label: 'Small',
      color: '#eab308', // Yellow
      badgeBg: 'rgba(234, 179, 8, 0.2)',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500',
      description: 'Minor crack / shallow pothole',
      level: 1,
    };
  } else if (ratio < 0.10) {
    return {
      label: 'Medium',
      color: '#f97316', // Orange
      badgeBg: 'rgba(249, 115, 22, 0.2)',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500',
      description: 'Moderate pothole - jarring impact',
      level: 2,
    };
  } else {
    return {
      label: 'Large',
      color: '#ef4444', // Red
      badgeBg: 'rgba(239, 68, 68, 0.25)',
      textColor: 'text-red-400',
      borderColor: 'border-red-500',
      description: 'Critical road hazard - tire/rim risk',
      level: 3,
    };
  }
}

/**
 * Calculates Intersection over Union (IoU) between two bounding boxes
 * Box format: [x1, y1, x2, y2]
 */
export function calculateIoU(boxA, boxB) {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  if (interArea === 0) return 0;

  const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

  return interArea / (boxAArea + boxBArea - interArea);
}

/**
 * Performs Non-Maximum Suppression (NMS) on candidate detections
 * @param {Array} detections - array of { box: [x1, y1, x2, y2], score, classId }
 * @param {number} iouThreshold - IoU cutoff for suppression (e.g. 0.45)
 */
export function nonMaxSuppression(detections, iouThreshold = 0.45) {
  // Sort detections by confidence score descending
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const selected = [];

  while (sorted.length > 0) {
    const current = sorted.shift();
    selected.push(current);

    for (let i = sorted.length - 1; i >= 0; i--) {
      const iou = calculateIoU(current.box, sorted[i].box);
      if (iou >= iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return selected;
}

/**
 * Decodes standard YOLOv8/YOLO11 ONNX output tensor
 * Output shape can be [1, 5, 8400] or [1, 8400, 5]
 * Format per anchor: [cx, cy, w, h, class0_score, (class1_score...)]
 */
export function processYoloOutput(
  outputTensor,
  confThreshold = 0.35,
  iouThreshold = 0.45,
  imgWidth = 640,
  imgHeight = 640,
  origWidth = 640,
  origHeight = 640
) {
  const data = outputTensor.data;
  const dims = outputTensor.dims; // e.g. [1, 5, 8400] or [1, 8400, 5]
  const detections = [];

  let numAnchors = 8400;
  let numChannels = 5;
  let isTransposed = false;

  if (dims.length === 3) {
    if (dims[1] < dims[2]) {
      // Shape [1, channels, anchors] -> [1, 5, 8400]
      numChannels = dims[1];
      numAnchors = dims[2];
      isTransposed = false;
    } else {
      // Shape [1, anchors, channels] -> [1, 8400, 5]
      numAnchors = dims[1];
      numChannels = dims[2];
      isTransposed = true;
    }
  }

  const scaleX = origWidth / imgWidth;
  const scaleY = origHeight / imgHeight;
  const frameArea = origWidth * origHeight;

  for (let i = 0; i < numAnchors; i++) {
    let cx, cy, w, h, score;

    if (!isTransposed) {
      // Index in [1, channels, anchors]
      // Row 0: cx, Row 1: cy, Row 2: w, Row 3: h, Row 4+: class scores
      score = data[4 * numAnchors + i];
      if (score < confThreshold) continue;

      cx = data[0 * numAnchors + i];
      cy = data[1 * numAnchors + i];
      w = data[2 * numAnchors + i];
      h = data[3 * numAnchors + i];
    } else {
      // Index in [1, anchors, channels]
      const offset = i * numChannels;
      score = data[offset + 4];
      if (score < confThreshold) continue;

      cx = data[offset + 0];
      cy = data[offset + 1];
      w = data[offset + 2];
      h = data[offset + 3];
    }

    // Convert center x,y,w,h to [x1, y1, x2, y2]
    const x1 = Math.max(0, (cx - w / 2) * scaleX);
    const y1 = Math.max(0, (cy - h / 2) * scaleY);
    const x2 = Math.min(origWidth, (cx + w / 2) * scaleX);
    const y2 = Math.min(origHeight, (cy + h / 2) * scaleY);

    const boxWidth = Math.max(0, x2 - x1);
    const boxHeight = Math.max(0, y2 - y1);
    const boxArea = boxWidth * boxHeight;

    if (boxWidth < 10 || boxHeight < 10) continue; // Ignore tiny noise

    const severity = calculateSeverity(boxArea, frameArea);

    detections.push({
      box: [x1, y1, x2, y2],
      x: x1,
      y: y1,
      width: boxWidth,
      height: boxHeight,
      score: Number(score.toFixed(3)),
      label: 'pothole',
      severity,
    });
  }

  return nonMaxSuppression(detections, iouThreshold);
}
