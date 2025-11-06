import argparse
import os
from typing import List

import pandas as pd

from constants import DEPTS


def get_files(directory: str) -> List[str]:
    """Return a list of files in directory."""
    items = os.listdir(directory)
    files = [item for item in items if os.path.isfile(os.path.join(directory, item))]
    return files


def combine_course_data(semester):
    """Combine course data from all departments into a single CSV."""
    files = get_files(semester)
    all_csvs = []
    for dept in DEPTS:
        dept_files = [os.path.join(semester, f) for f in files if f.startswith(dept)]
        consolidated_csv = consolidate_csvs(dept_files, f"{semester}/consolidated.csv")
        all_csvs.append(consolidated_csv)
    final_df = pd.concat(all_csvs, ignore_index=True)
    final_df.to_csv(f"{semester}/{semester}.csv", index=False)


def consolidate_csvs(file_list, output_file):
    """Consolidate multiple CSV files for a given department into one, removing duplicates."""
    all_data = []

    for file in file_list:
        df = pd.read_csv(file, dtype=str, keep_default_na=False)
        all_data.append(df)
        print(f"Loaded {file}: {len(df)} rows")

    if not all_data:
        print("No data loaded")
        return None

    # Concatenate all dataframes
    combined_df = pd.concat(all_data, ignore_index=True)
    print(f"\nTotal rows before deduplication: {len(combined_df)}")

    # Remove duplicate rows
    deduplicated_df = combined_df.drop_duplicates()
    print(f"Total rows after deduplication: {len(deduplicated_df)}")
    print(f"Duplicates removed: {len(combined_df) - len(deduplicated_df)}")

    # Save to file
    deduplicated_df.to_csv(output_file, index=False)
    print(f"\nConsolidated data saved to: {output_file}")

    return deduplicated_df


# Usage: python combine_course_data.py s2026
def main():
    """Combine course data from all departments into one CSV file."""
    parser = argparse.ArgumentParser(description="Combine course data from multiple depts into one CSV file.")
    parser.add_argument("semester", type=str, help="Semester to consolidate e.g. f2019 s2022")
    args = parser.parse_args()
    semester = args.semester

    if os.path.isdir(semester):
        combine_course_data(semester)
    else:
        print(f"Directory for semester {semester} does not exist. Please fetch data first.")
        return


if __name__ == "__main__":
    main()
