import json
import subprocess
import sys
from pathlib import Path

from validator import validate_case


def run_extractor(input_file):

    result = subprocess.run(
        [
            sys.executable,
            "llm_extractor.py",
            str(input_file)
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit("Extraction failed.")

    print(result.stdout)


def load_extracted_data():

    output_file = Path("extracted_case.json")

    if not output_file.exists():
        raise SystemExit(
            "ERROR: extracted_case.json was not created."
        )

    return json.loads(
        output_file.read_text(
            encoding="utf-8"
        )
    )


def run_validation(data):

    result = validate_case(data)

    print("\nVALIDATION")
    print("=" * 50)

    print(
        json.dumps(
            result,
            indent=2
        )
    )

    if not result["valid"]:
        raise SystemExit(
            "\nExtraction rejected because validation failed."
        )

    print("\nValidation passed.")


def run_neo4j_import():

    result = subprocess.run(
        [
            sys.executable,
            "extract_to_neo4j.py",
            "extracted_case.json"
        ],
        capture_output=True,
        text=True
    )

    print("\nNEO4J IMPORT")
    print("=" * 50)

    print(result.stdout)

    if result.returncode != 0:
        print(result.stderr)
        raise SystemExit(
            "Neo4j import failed."
        )


def main():

    if len(sys.argv) < 2:
        raise SystemExit(
            "Usage: python pipeline.py document.txt"
        )

    input_file = Path(sys.argv[1])

    if not input_file.exists():
        raise SystemExit(
            f"ERROR: File not found: {input_file}"
        )

    print("\nJIG DOCUMENT PIPELINE")
    print("=" * 50)

    print(f"Input: {input_file}")

    print("\n1. Extracting...")
    run_extractor(input_file)

    print("\n2. Loading extracted data...")
    data = load_extracted_data()

    print("\n3. Validating...")
    run_validation(data)

    print("\n4. Importing into Neo4j...")
    run_neo4j_import()

    print("\nPipeline completed successfully.")


if __name__ == "__main__":
    main()