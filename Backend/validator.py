import json
import sys
from pathlib import Path


REQUIRED_FIR_FIELDS = [
    "fir_number",
    "filed_date"
]


def validate_case(data):
    errors = []
    warnings = []

    if not isinstance(data, dict):
        return {
            "valid": False,
            "errors": ["Extracted data must be a JSON object."],
            "warnings": []
        }

    fir = data.get("fir")

    if not isinstance(fir, dict):
        errors.append("FIR information is missing.")
    else:
        for field in REQUIRED_FIR_FIELDS:
            if not fir.get(field):
                errors.append(
                    f"Required FIR field missing: {field}"
                )

    case = data.get("case")

    if case is not None:
        if not isinstance(case, dict):
            errors.append("Case information must be an object.")
        elif not case.get("case_number"):
            warnings.append(
                "Case exists but case_number is missing."
            )

    hearings = data.get("hearings", [])

    if not isinstance(hearings, list):
        errors.append("Hearings must be a list.")
    else:
        for index, hearing in enumerate(hearings):
            if not isinstance(hearing, dict):
                errors.append(
                    f"Hearing {index + 1} is invalid."
                )
                continue

            if not hearing.get("hearing_id"):
                warnings.append(
                    f"Hearing {index + 1} has no hearing_id."
                )

            if not hearing.get("hearing_date"):
                warnings.append(
                    f"Hearing {index + 1} has no hearing_date."
                )

    orders = data.get("orders", [])

    if not isinstance(orders, list):
        errors.append("Orders must be a list.")
    else:
        for index, order in enumerate(orders):
            if not isinstance(order, dict):
                errors.append(
                    f"Order {index + 1} is invalid."
                )
                continue

            if not order.get("order_id"):
                warnings.append(
                    f"Order {index + 1} has no order_id."
                )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }


def main():
    if len(sys.argv) < 2:
        raise SystemExit(
            "Usage: python validator.py extracted.json"
        )

    input_file = Path(sys.argv[1])

    if not input_file.exists():
        raise SystemExit(
            f"ERROR: File not found: {input_file}"
        )

    data = json.loads(
        input_file.read_text(encoding="utf-8")
    )

    result = validate_case(data)

    print(
        json.dumps(
            result,
            indent=2
        )
    )


if __name__ == "__main__":
    main()
    