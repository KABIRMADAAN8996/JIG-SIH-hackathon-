import json
import re
import sys
from pathlib import Path


def clean_value(value):
    if value is None:
        return None

    value = value.strip()

    if value.lower() in ["null", "none", "n/a", "na", "-", ""]:
        return None

    return value

def get_value(text, label):
    """
    Supports all of these formats:

    FIR Number: FIR-707/2026
    FIR Number = FIR-707/2026
    FIR Number - FIR-707/2026
    FIR Number FIR-707/2026
    """

    # First try formats with a separator
    pattern = rf"^\s*{re.escape(label)}\s*(?::|=|-)\s*(.*?)\s*$"

    match = re.search(
        pattern,
        text,
        re.MULTILINE | re.IGNORECASE
    )

    if match:
        return clean_value(match.group(1))

    # Then support label followed directly by value
    pattern = rf"^\s*{re.escape(label)}\s+(.+?)\s*$"

    match = re.search(
        pattern,
        text,
        re.MULTILINE | re.IGNORECASE
    )

    if match:
        return clean_value(match.group(1))

    return None

def get_bool(text, label):
    value = get_value(text, label)

    if value is None:
        return None

    if value.lower() == "true":
        return True

    if value.lower() == "false":
        return False

    return None


def extract_sections(text):
    value = get_value(text, "Sections")

    if not value:
        return []

    return [
        x.strip()
        for x in re.split(r"[,;]", value)
        if x.strip()
    ]


def extract_case(document_text):

    fir = {
        "fir_number": get_value(document_text, "FIR Number"),
        "filed_date": get_value(document_text, "Filed Date"),
        "police_station": get_value(document_text, "Police Station"),
        "complainant": get_value(document_text, "Complainant"),
        "accused": get_value(document_text, "Accused"),
        "sections": extract_sections(document_text)
    }

    case_number = get_value(document_text, "Case Number")

    case = None

    if case_number:
        case = {
            "case_number": case_number,
            "registration_date": get_value(
                document_text, "Registration Date"
            ),
            "court_name": get_value(
                document_text, "Court"
            ),
            "status": get_value(
                document_text, "Status"
            ),
            "chargesheet_filed": get_bool(
                document_text, "Chargesheet Filed"
            ),
            "chargesheet_date": get_value(
                document_text, "Chargesheet Date"
            ),
            "chargesheet_deadline": get_value(
                document_text, "Chargesheet Deadline"
            )
        }

    hearings = []

    hearing_blocks = re.split(
        r"(?=Hearing ID\s*[:=\-])",
        document_text,
        flags=re.IGNORECASE
    )

    for block in hearing_blocks:

        hearing_id = get_value(block, "Hearing ID")

        if not hearing_id:
            continue

        hearings.append({
            "hearing_id": hearing_id,
            "hearing_date": get_value(
                block, "Hearing Date"
            ),
            "hearing_type": get_value(
                block, "Hearing Type"
            ),
            "outcome": get_value(
                block, "Outcome"
            ),
            "next_hearing_date": get_value(
                block, "Next Hearing Date"
            )
        })

    orders = []

    order_blocks = re.split(
        r"(?=Order ID\s*[:=\-])",
        document_text,
        flags=re.IGNORECASE
    )

    for block in order_blocks:

        order_id = get_value(block, "Order ID")

        if not order_id:
            continue

        orders.append({
            "order_id": order_id,
            "order_date": get_value(
                block, "Order Date"
            ),
            "order_type": get_value(
                block, "Order Type"
            ),
            "judge_or_court": get_value(
                block, "Judge/Court"
            ),
            "summary": get_value(
                block, "Summary"
            )
        })

    return {
        "case_id": None,
        "fir": fir,
        "case": case,
        "hearings": hearings,
        "orders": orders
    }


def main():

    if len(sys.argv) < 2:
        raise SystemExit(
            "Usage: python llm_extractor.py a.txt"
        )

    input_file = Path(sys.argv[1])

    if not input_file.exists():
        raise SystemExit(
            f"ERROR: File not found: {input_file}"
        )

    document_text = input_file.read_text(
        encoding="utf-8"
    )

    extracted = extract_case(document_text)

    output_file = Path("extracted_case.json")

    output_file.write_text(
        json.dumps(
            extracted,
            indent=2,
            ensure_ascii=False
        ),
        encoding="utf-8"
    )

    print(f"Extraction saved to: {output_file}")


if __name__ == "__main__":
    main()