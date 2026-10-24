"""
RoadSight Dataset Augmentation & Train/Val/Test Splitter
Expands a dataset to 500+ images with bounding-box preserving transformations:
- Horizontal flip (with bounding box x_center inversion)
- Brightness jitter (+/- 25%)
- Contrast adjustment
- Gaussian Blur
- Generates 70/20/10 train/val/test splits and data.yaml
"""

import os
import glob
import random
import shutil
from PIL import Image, ImageEnhance, ImageFilter

def flip_horizontal(image, bboxes):
    """
    Flips image horizontally and inverts YOLO x_center.
    YOLO bbox format: [class_id, x_center, y_center, width, height]
    """
    flipped_img = image.transpose(Image.FLIP_LEFT_RIGHT)
    flipped_boxes = []
    for cls_id, cx, cy, w, h in bboxes:
        flipped_boxes.append([cls_id, 1.0 - cx, cy, w, h])
    return flipped_img, flipped_boxes

def adjust_brightness(image, factor):
    enhancer = ImageEnhance.Brightness(image)
    return enhancer.enhance(factor)

def adjust_contrast(image, factor):
    enhancer = ImageEnhance.Contrast(image)
    return enhancer.enhance(factor)

def apply_blur(image):
    return image.filter(ImageFilter.GaussianBlur(radius=1.5))

def read_yolo_label(label_path):
    boxes = []
    if not os.path.exists(label_path):
        return boxes
    with open(label_path, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) >= 5:
                cls_id = int(parts[0])
                cx, cy, w, h = map(float, parts[1:5])
                boxes.append([cls_id, cx, cy, w, h])
    return boxes

def write_yolo_label(label_path, boxes):
    with open(label_path, 'w') as f:
        for cls_id, cx, cy, w, h in boxes:
            f.write(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")

def augment_dataset(raw_dir, output_dir, target_count=800):
    """
    Augments dataset from raw_dir and saves to output_dir with 70/20/10 split.
    Expected raw_dir structure:
      raw_dir/images/*.jpg
      raw_dir/labels/*.txt
    """
    os.makedirs(f"{output_dir}/images/train", exist_ok=True)
    os.makedirs(f"{output_dir}/images/val", exist_ok=True)
    os.makedirs(f"{output_dir}/images/test", exist_ok=True)
    os.makedirs(f"{output_dir}/labels/train", exist_ok=True)
    os.makedirs(f"{output_dir}/labels/val", exist_ok=True)
    os.makedirs(f"{output_dir}/labels/test", exist_ok=True)

    img_paths = glob.glob(f"{raw_dir}/images/*.jpg") + glob.glob(f"{raw_dir}/images/*.png")
    print(f"Found {len(img_paths)} original images in {raw_dir}")

    samples = []
    for img_p in img_paths:
        base = os.path.splitext(os.path.basename(img_p))[0]
        lbl_p = os.path.join(raw_dir, "labels", f"{base}.txt")
        if os.path.exists(lbl_p):
            samples.append((img_p, lbl_p))

    print(f"Total labeled pairs: {len(samples)}")
    if len(samples) == 0:
        print("No valid image/label pairs found.")
        return

    # Create augmented pool
    all_generated = []
    aug_idx = 0

    for img_p, lbl_p in samples:
        base = os.path.splitext(os.path.basename(img_p))[0]
        img = Image.open(img_p).convert("RGB")
        boxes = read_yolo_label(lbl_p)

        # 1. Original
        all_generated.append((img, boxes, f"{base}_orig"))

        # 2. Horizontal flip
        img_flip, boxes_flip = flip_horizontal(img, boxes)
        all_generated.append((img_flip, boxes_flip, f"{base}_flip"))

        # 3. Brightness +25%
        img_bright = adjust_brightness(img, 1.25)
        all_generated.append((img_bright, boxes, f"{base}_bright"))

        # 4. Low light / dusk simulation (Brightness -25%)
        img_dark = adjust_brightness(img, 0.75)
        all_generated.append((img_dark, boxes, f"{base}_dark"))

        # 5. Contrast jitter & slight motion blur
        img_contrast = adjust_contrast(img, 1.3)
        img_blur = apply_blur(img_contrast)
        all_generated.append((img_blur, boxes, f"{base}_contrast_blur"))

    print(f"Generated {len(all_generated)} augmented samples.")

    # Shuffle and split 70% Train, 20% Val, 10% Test
    random.seed(42)
    random.shuffle(all_generated)

    total = len(all_generated)
    n_train = int(total * 0.70)
    n_val = int(total * 0.20)

    train_set = all_generated[:n_train]
    val_set = all_generated[n_train:n_train + n_val]
    test_set = all_generated[n_train + n_val:]

    def save_split(split_data, split_name):
        for img, boxes, name in split_data:
            out_img = f"{output_dir}/images/{split_name}/{name}.jpg"
            out_lbl = f"{output_dir}/labels/{split_name}/{name}.txt"
            img.save(out_img, quality=92)
            write_yolo_label(out_lbl, boxes)

    save_split(train_set, "train")
    save_split(val_set, "val")
    save_split(test_set, "test")

    # Generate data.yaml
    data_yaml_content = f"""path: {os.path.abspath(output_dir)}
train: images/train
val: images/val
test: images/test

names:
  0: pothole
"""
    yaml_path = os.path.join(output_dir, "data.yaml")
    with open(yaml_path, "w") as f:
        f.write(data_yaml_content)

    print(f"✅ Dataset prepared successfully!")
    print(f"Train: {len(train_set)}, Val: {len(val_set)}, Test: {len(test_set)}")
    print(f"data.yaml written to: {yaml_path}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Augment pothole dataset and split 70/20/10")
    parser.add_argument("--raw_dir", type=str, default="./raw_dataset", help="Path to raw dataset with images/ and labels/")
    parser.add_argument("--output_dir", type=str, default="./pothole_dataset", help="Output directory")
    args = parser.parse_args()

    augment_dataset(args.raw_dir, args.output_dir)
