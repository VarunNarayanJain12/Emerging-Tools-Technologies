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
    "assessment_name",
    "assessment_type",
    "score_obtained",
    "max_score",
    "assessment_date",
    "weightage"
}

def pick_excel_file():
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)

    file_path = filedialog.askopenfilename(
        title="Select Assessment Scores Excel File",
        filetypes=[("Excel Files", "*.xlsx")]
    )

    root.destroy()
    return file_path

def process_assessments():
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

    print("⏳ Processing assessment records...")

    for _, row in df.iterrows():
        try:
            if pd.isna(row["student_id"]) or pd.isna(row["score_obtained"]) or pd.isna(row["max_score"]):
                logging.warning("Missing assessment fields")
                skipped += 1
                continue

            if row["score_obtained"] > row["max_score"]:
                logging.warning(f"Score exceeds max for {row['student_id']}")
                skipped += 1
                continue

            batch_data.append((
                row["student_id"],
                subject_code,
                row["assessment_name"],
                row["assessment_type"],
                row["score_obtained"],
                row["max_score"],
                row["assessment_date"],
                row["weightage"]
            ))

        except Exception as e:
            logging.warning(f"Corrupted assessment row skipped: {e}")
            skipped += 1

    if batch_data:
        cur.executemany("""
            INSERT INTO assessment_records
            (student_id, subject_code, assessment_name, assessment_type,
             score_obtained, max_score, assessment_date, weightage)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
        """, batch_data)

    conn.commit()
    cur.close()
    conn.close()

    print(f"✅ Assessment upload complete ({len(batch_data)} records)")
    print(f"⚠️ Skipped {skipped} invalid rows")

if __name__ == "__main__":
    process_assessments()
