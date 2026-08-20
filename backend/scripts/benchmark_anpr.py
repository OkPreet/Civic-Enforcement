"""ANPR accuracy benchmark for the Sentinel plate reader.

Runs ANPRReader over a set of plate images and reports exact-match rate,
character-level accuracy, and mean confidence. Labels come from a CSV/TSV
("filename,expected_plate") or, when absent, from the filename itself
(e.g. "GJ01AB1234.jpg" -> expected "GJ01AB1234"). If --dir is empty, synthetic
Indian-format plate images are generated so the harness can be smoke-tested.

Run (from backend/):
    python -m scripts.benchmark_anpr --dir samples --labels labels.csv
    python -m scripts.benchmark_anpr --samples 40 --json report.json

Exit code is 0 when exact-match accuracy >= --min-exact (CI-gateable).
"""

import argparse
import csv
import os
import re
import tempfile
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from app.cv.engine import ANPRReader, normalize_plate

PLATE_TEXT = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{3,4}$")


def _levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i] + [0] * len(b)
        for j, cb in enumerate(b, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb))
        prev = cur
    return prev[-1]


def char_accuracy(predicted: str, expected: str) -> float:
    if not expected:
        return 0.0
    return max(0.0, 1.0 - _levenshtein(predicted, expected) / len(expected))


def load_labels(labels_path: Optional[Path], dir_path: Path) -> dict:
    labels: dict = {}
    if labels_path is not None:
        with open(labels_path, newline="", encoding="utf-8") as f:
            rows = csv.reader(f)
            header = next(rows, None)
            if header is None:
                return labels
            name_col = 0 if header[0].lower() in ("file", "filename", "image") else 0
            plate_col = next((i for i, h in enumerate(header) if h.lower() in ("plate", "label", "expected")), 1)
            if name_col == plate_col and len(header) > 1:
                plate_col = 1
            for row in rows:
                if len(row) > max(name_col, plate_col):
                    labels[Path(row[name_col]).name] = normalize_plate(row[plate_col])
    else:
        for path in sorted(dir_path.iterdir()):
            stem = path.stem.upper()
            m = re.match(r"[A-Z0-9]{6,10}", stem)
            if m and PLATE_TEXT.match(m.group(0)):
                labels[path.name] = m.group(0)
    return labels


def make_synthetic_plates(count: int, out_dir: Path) -> list:
    states = ["GJ", "MH", "DL", "KA", "TN", "RJ"]
    series = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    np.random.seed(7)
    samples = []
    for _ in range(count):
        plate = f"{np.random.choice(states)}{np.random.randint(10, 99)}"
        plate += "".join(np.random.choice(list(series), 2))
        plate += f"{np.random.randint(1000, 10000)}"
        img = np.full((80, 320, 3), 22, dtype=np.uint8)
        cv2.putText(img, f"{plate[:4]} {plate[4:6]} {plate[6:]}", (12, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.4, (230, 230, 230), 2, cv2.LINE_AA)
        noise = np.random.normal(0, 6, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        path = out_dir / f"{plate}.jpg"
        cv2.imwrite(str(path), img)
        samples.append(path)
    return samples


def run_benchmark(dir_path: Path, labels_path: Optional[Path]) -> list:
    labels = load_labels(labels_path, dir_path)
    reader = ANPRReader()
    rows = []
    for path in sorted(dir_path.iterdir()):
        if path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".bmp"):
            continue
        expected = labels.get(path.name)
        if expected is None:
            continue
        image = cv2.imread(str(path))
        if image is None:
            continue
        predicted, conf = reader.read_image(image)
        predicted_n = normalize_plate(predicted or "")
        exact = predicted_n == expected
        rows.append({
            "file": path.name,
            "expected": expected,
            "predicted": predicted_n or "(none)",
            "exact": exact,
            "char_acc": char_accuracy(predicted_n, expected),
            "confidence": round(conf, 3),
        })
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Sentinel ANPR accuracy benchmark")
    parser.add_argument("--dir", type=Path, default=None, help="directory of plate images")
    parser.add_argument("--labels", type=Path, default=None, help="CSV/TSV: filename,expected_plate")
    parser.add_argument("--samples", type=int, default=0, help="generate N synthetic samples when --dir is empty")
    parser.add_argument("--json", type=Path, default=None, help="write JSON report here")
    parser.add_argument("--min-exact", type=float, default=0.0, help="minimum exact-match accuracy for exit 0")
    args = parser.parse_args()

    temp_dir = None
    dir_path = args.dir
    if dir_path is None:
        if args.samples <= 0:
            parser.error("provide --dir, or --samples to generate synthetic plates")
        temp_dir = Path(tempfile.mkdtemp(prefix="anpr_bench_"))
        make_synthetic_plates(args.samples, temp_dir)
        dir_path = temp_dir
        print(f"[bench] generated {args.samples} synthetic samples in {temp_dir}")

    rows = run_benchmark(dir_path, args.labels)
    if not rows:
        print("[bench] no labeled samples found (labels inferred from filenames like 'GJ01AB1234.jpg')")
        return 2

    exact_rate = sum(r["exact"] for r in rows) / len(rows)
    char_rate = sum(r["char_acc"] for r in rows) / len(rows)
    mean_conf = sum(r["confidence"] for r in rows) / len(rows)

    print(f"\n{'file':<28} {'expected':<12} {'predicted':<12} {'exact':<5} {'char%':<6} {'conf'}")
    print("-" * 76)
    for r in rows:
        print(f"{r['file']:<28} {r['expected']:<12} {r['predicted']:<12} {str(r['exact']):<5} "
              f"{r['char_acc'] * 100:>5.1f}%  {r['confidence']:.3f}")

    print("\n---- aggregate ----")
    print(f"samples    : {len(rows)}")
    print(f"exact match: {exact_rate * 100:.1f}%")
    print(f"char acc   : {char_rate * 100:.1f}%")
    print(f"mean conf  : {mean_conf:.3f}")

    if args.json is not None:
        import json

        report = {
            "samples": len(rows),
            "exact_match_accuracy": round(exact_rate, 4),
            "char_accuracy": round(char_rate, 4),
            "mean_confidence": round(mean_conf, 4),
            "rows": rows,
        }
        args.json.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"\nwrote {args.json}")

    if temp_dir is not None:
        import shutil

        shutil.rmtree(temp_dir, ignore_errors=True)

    return 0 if exact_rate >= args.min_exact else 1


if __name__ == "__main__":
    exit(main())
