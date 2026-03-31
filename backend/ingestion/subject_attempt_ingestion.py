import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
import pandas as pd
from tkinter import Tk, filedialog
from backend.db.db_connection import get_connection

import logging



logging.basicConfig(
    filename="backend/logs/data_quality.log",
    level=logging.WARNING,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

REQUIRED_COLUMNS = {
    "student_id",
    "attempts_used",
    "max_attempts_allowed",
    "last_attempt_date"
}

def pick_excel_file():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    file_path = filedialog.askopenfilename(
        title="Select Subject Attempt Excel File",
        filetypes=[("Excel Files", "*.xlsx")]
    )

    root.destroy()
    return file_path

def process_subject_attempts():
    subject_code = input("Enter Subject Code: ").strip()
    print("📂 Opening file picker...")

    file_path = pick_excel_file()
    if not file_path:
        print("❌ No file selected.")
        return

    df = pd.read_excel(file_path)

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        print(f"❌ Missing columns: {missing}")
        return

    conn = get_connection()
    cur = conn.cursor()

    batch_data = []
    skipped = 0

    print("⏳ Processing subject attempt records...")

    for _, row in df.iterrows():
        try:
            if pd.isna(row["student_id"]) or pd.isna(row["attempts_used"]) or pd.isna(row["max_attempts_allowed"]):
                logging.warning("Missing subject attempt data")
                skipped += 1
                continue

            if row["attempts_used"] > row["max_attempts_allowed"]:
                logging.warning(f"Attempts exceeded max for {row['student_id']}")
                skipped += 1
                continue

            status = "exhausted" if row["attempts_used"] >= row["max_attempts_allowed"] else "ongoing"

            batch_data.append((
                row["student_id"],
                subject_code,
                row["attempts_used"],
                row["max_attempts_allowed"],
                row["last_attempt_date"],
                status
            ))

        except Exception as e:
            logging.warning(f"Corrupted attempt row skipped: {e}")
            skipped += 1

    if batch_data:
        cur.executemany("""
            INSERT INTO subject_attempts
            (student_id, subject_code, attempts_used,
             max_attempts_allowed, last_attempt_date, status)
            VALUES (%s,%s,%s,%s,%s,%s)
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

    print(f"✅ Subject attempt upload complete ({len(batch_data)} records)")
    print(f"⚠️ Skipped {skipped} invalid rows")

if __name__ == "__main__":
    process_subject_attempts()
