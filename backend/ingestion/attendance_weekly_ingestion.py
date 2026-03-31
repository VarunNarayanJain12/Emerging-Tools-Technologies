import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pandas as pd
import logging
from tkinter import Tk, filedialog
from backend.db.db_connection import get_connection


logging.basicConfig(
    filename="backend/logs/data_quality.log",
    level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


def pick_excel_file():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    file_path = filedialog.askopenfilename(
        title="Select Weekly Attendance Excel File",
        filetypes=[("Excel Files", "*.xlsx")]
    )

    root.destroy()
    return file_path


def process_weekly_attendance():
    subject_code = input("Enter Subject Code: ").strip()
    print("📂 Opening file picker...")

    file_path = pick_excel_file()
    if not file_path:
        print("❌ No file selected. Exiting.")
        return

    print(f"📂 Selected file: {file_path}")

    df = pd.read_excel(file_path)

    date_columns = df.columns[1:]
    period_start = min(date_columns)
    period_end = max(date_columns)

    conn = get_connection()
    cur = conn.cursor()

    batch_data = []
    skipped_count = 0

    print("⏳ Processing attendance records...")
    for idx, (_, row) in enumerate(df.iterrows()):

        # ✅ FIX ADDED HERE
        if pd.isna(row["student_id"]):
            continue

        student_id = row["student_id"]

        total_classes = 0
        attended_classes = 0

        for col in date_columns:
            if row[col] == "P":
                attended_classes += 1
                total_classes += 1
            elif row[col] == "A":
                total_classes += 1

        if total_classes == 0:
            skipped_count += 1
            continue

        attendance_percentage = round(
            (attended_classes / total_classes) * 100, 2
        )

        batch_data.append((
            student_id,
            subject_code,
            period_start,
            period_end,
            total_classes,
            attended_classes,
            attendance_percentage
        ))

        if (idx + 1) % 10 == 0:
            print(f"  Processed {idx + 1} records...")

    if batch_data:
        print(f"📤 Uploading {len(batch_data)} records to database...")
        cur.executemany("""
            INSERT INTO attendance_records
            (student_id, subject_code, period_start, period_end,
             classes_conducted, classes_attended, attendance_percentage)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (student_id, subject_code, period_start, period_end)
            DO UPDATE SET
              classes_conducted = EXCLUDED.classes_conducted,
              classes_attended = EXCLUDED.classes_attended,
              attendance_percentage = EXCLUDED.attendance_percentage,
              recorded_at = CURRENT_TIMESTAMP;
        """, batch_data)

    conn.commit()
    cur.close()
    conn.close()

    if batch_data:
        print("🔄 Recalculating risk scores for affected students...")
        from backend.risk_engine.risk_scorer import calculate_and_persist_risk
        unique_students = set(row[0] for row in batch_data)
        for sid in unique_students:
            try:
                calculate_and_persist_risk(sid, trigger='ingestion')
            except Exception as e:
                print(f"  ⚠️ Failed to recalculate risk for {sid}: {e}")

    print(f"✅ Attendance uploaded successfully ({len(batch_data)} records)")
    if skipped_count > 0:
        print(f"⚠️ Skipped {skipped_count} records (no classes)")


if __name__ == "__main__":
    process_weekly_attendance()