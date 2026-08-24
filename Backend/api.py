import os
import json
import subprocess
import sys
import tempfile
from pathlib import Path
from datetime import date

from flask import Flask, jsonify, request
from flask_cors import CORS
from neo4j import GraphDatabase

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "http://localhost:5173",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    }
)

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not PASSWORD:
    raise RuntimeError(
        'NEO4J_PASSWORD is not set. In PowerShell run:\n'
        '$env:NEO4J_PASSWORD="YOUR_PASSWORD"'
    )

driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))

REFERENCE_DATE = date.today().isoformat()


def serialize(value):
    if value is None:
        return None
    return str(value)


def get_rule_results(tx):
    query = """
    MATCH (f:FIR)
    OPTIONAL MATCH (f)-[:LEADS_TO]->(c:CASE)

    WITH f, c,
         duration.inDays(
             f.filed_date,
             date($reference_date)
         ).days AS fir_age

    OPTIONAL MATCH (c)-[:HAS]->(h:HEARING)

    WITH f, c, fir_age, collect(h) AS hearings

    WITH f, c, fir_age, hearings,
         CASE
           WHEN c IS NULL AND fir_age > 15
           THEN "TRIGGERED"
           ELSE "NOT TRIGGERED"
         END AS rule_1,
         CASE
           WHEN c IS NOT NULL
                AND size(hearings) = 0
                AND duration.inDays(
                    c.registration_date,
                    date($reference_date)
                ).days > 60
           THEN "TRIGGERED"
           ELSE "NOT TRIGGERED"
         END AS rule_2

    WITH f, c, rule_1, rule_2, hearings,
         CASE
           WHEN size(hearings) > 0
           THEN reduce(
             latest = hearings[0],
             x IN hearings |
             CASE
               WHEN x.hearing_date > latest.hearing_date
               THEN x
               ELSE latest
             END
           )
           ELSE NULL
         END AS latest_hearing

    WITH f, c, rule_1, rule_2, latest_hearing,
         CASE
           WHEN latest_hearing IS NOT NULL
                AND latest_hearing.outcome IN ["adjourned", "ongoing"]
                AND (
                    NOT "next_hearing_date" IN keys(latest_hearing)
                    OR latest_hearing.next_hearing_date IS NULL
                )
                AND duration.inDays(
                    latest_hearing.hearing_date,
                    date($reference_date)
                ).days > 30
           THEN "TRIGGERED"
           ELSE "NOT TRIGGERED"
         END AS rule_3,
         CASE
           WHEN c IS NOT NULL
                AND c.chargesheet_filed = false
                AND date($reference_date) > c.chargesheet_deadline
           THEN "TRIGGERED"
           ELSE "NOT TRIGGERED"
         END AS rule_4

    RETURN
  f.fir_number AS fir_number,
  f.accused AS accused,
  f.complainant AS complainant,
  c.case_number AS case_number,
  f.filed_date AS filed_date,
  c.registration_date AS registration_date,
  c.status AS case_status,
  c.court_name AS court_name,
      latest_hearing.hearing_id AS latest_hearing_id,
      latest_hearing.hearing_date AS latest_hearing_date,
      latest_hearing.hearing_type AS latest_hearing_type,
      latest_hearing.outcome AS latest_hearing_outcome,
      latest_hearing.next_hearing_date AS next_hearing_date,
      c.chargesheet_filed AS chargesheet_filed,
      c.chargesheet_deadline AS chargesheet_deadline,
      rule_1,
      rule_2,
      rule_3,
      rule_4,
      CASE
        WHEN rule_1 = "TRIGGERED"
             AND rule_2 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 1 + 2 + 3 + 4"
        WHEN rule_1 = "TRIGGERED"
             AND rule_2 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
        THEN "RULES 1 + 2 + 3"
        WHEN rule_1 = "TRIGGERED"
             AND rule_2 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 1 + 2 + 4"
        WHEN rule_1 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 1 + 3 + 4"
        WHEN rule_2 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 2 + 3 + 4"
        WHEN rule_3 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 3 + 4"
        WHEN rule_1 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 1 + 4"
        WHEN rule_1 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
        THEN "RULES 1 + 3"
        WHEN rule_2 = "TRIGGERED"
             AND rule_4 = "TRIGGERED"
        THEN "RULES 2 + 4"
        WHEN rule_2 = "TRIGGERED"
             AND rule_3 = "TRIGGERED"
        THEN "RULES 2 + 3"
        WHEN rule_1 = "TRIGGERED"
        THEN "RULE 1"
        WHEN rule_2 = "TRIGGERED"
        THEN "RULE 2"
        WHEN rule_3 = "TRIGGERED"
        THEN "RULE 3"
        WHEN rule_4 = "TRIGGERED"
        THEN "RULE 4"
        ELSE "CLEAN"
      END AS overall_result
    ORDER BY f.fir_number
    """

    return list(
        tx.run(
            query,
            reference_date=REFERENCE_DATE
        )
    )


def build_rule_details(r):
    return {
        "rule_1": {
            "title": "Delayed Case Registration",
            "description": "An FIR remains without a registered case beyond the permitted period.",
            "status": r["rule_1"],
            "reason": (
                "No case is linked to this FIR and the FIR has exceeded the 15-day registration threshold."
                if r["rule_1"] == "TRIGGERED"
                else "A case is registered within the permitted period."
            ),
            "evidence": {
                "fir_number": r["fir_number"],
                "filed_date": serialize(r["filed_date"])
            }
        },
        "rule_2": {
            "title": "No Hearing Recorded",
            "description": "A registered case has remained without a hearing beyond the permitted period.",
            "status": r["rule_2"],
            "reason": (
                "No hearing is recorded and the case has exceeded the 60-day threshold."
                if r["rule_2"] == "TRIGGERED"
                else "A hearing is recorded or the permitted period has not been exceeded."
            ),
            "evidence": {
                "case_number": r["case_number"],
                "registration_date": serialize(r["registration_date"])
            }
        },
        "rule_3": {
            "title": "Hearing Follow-up Delay",
            "description": "The latest hearing is adjourned or ongoing, has no next hearing date, and has exceeded 30 days.",
            "status": r["rule_3"],
            "reason": (
                f"The latest hearing is {r['latest_hearing_outcome']}, no next hearing date is recorded, "
                "and more than 30 days have passed since that hearing."
                if r["rule_3"] == "TRIGGERED"
                else "The latest hearing does not satisfy all Rule 3 conditions."
            ),
            "evidence": {
                "latest_hearing_id": r["latest_hearing_id"],
                "hearing_date": serialize(r["latest_hearing_date"]),
                "outcome": r["latest_hearing_outcome"],
                "next_hearing_date": serialize(r["next_hearing_date"]),
                "reference_date": REFERENCE_DATE
            }
        },
        "rule_4": {
            "title": "Charge Sheet Deadline Breach",
            "description": "The charge sheet has not been filed after the recorded deadline.",
            "status": r["rule_4"],
            "reason": (
                "The charge sheet is not filed and the deadline has passed."
                if r["rule_4"] == "TRIGGERED"
                else "The charge sheet condition does not currently breach the deadline."
            ),
            "evidence": {
                "chargesheet_filed": r["chargesheet_filed"],
                "chargesheet_deadline": serialize(r["chargesheet_deadline"]),
                "reference_date": REFERENCE_DATE
            }
        }
    }


def format_case(r):
    return {
        "fir_number": r["fir_number"],
        "case_number": r["case_number"],
        "filed_date": serialize(r["filed_date"]),
        "registration_date": serialize(r["registration_date"]),
        "status": r["case_status"],
        "court_name": r["court_name"],
        "rules": {
            "rule_1": r["rule_1"],
            "rule_2": r["rule_2"],
            "rule_3": r["rule_3"],
            "rule_4": r["rule_4"]
        },
        "rule_details": build_rule_details(r),
        "overall_result": r["overall_result"]
    }


@app.get("/")
def home():
    return jsonify({
        "name": "JIG Backend API",
        "status": "running"
    })


@app.get("/api/cases")
def cases():
    with driver.session() as session:
        rows = session.execute_read(get_rule_results)

    result = [format_case(r) for r in rows]

    return jsonify({
        "reference_date": REFERENCE_DATE,
        "count": len(result),
        "cases": result
    })


def find_case_rules(tx, identifier):
    rows = get_rule_results(tx)

    for r in rows:
        if r["case_number"] == identifier or r["fir_number"] == identifier:
            return r

    return None


@app.get("/api/cases/<path:identifier>")
def case_details(identifier):
    with driver.session() as session:
        r = session.execute_read(
            find_case_rules,
            identifier
        )

    if r is None:
        return jsonify({
            "error": "Case not found"
        }), 404

    result = format_case(r)
    result["reference_date"] = REFERENCE_DATE

    return jsonify(result)


@app.get("/api/cases/<path:identifier>/graph")
def case_graph(identifier):
    query = """
    OPTIONAL MATCH (c:CASE)
    WHERE c.case_number = $identifier

    OPTIONAL MATCH (f1:FIR)-[:LEADS_TO]->(c)

    WITH c, collect(DISTINCT f1) AS case_firs

    OPTIONAL MATCH (f2:FIR)
    WHERE f2.fir_number = $identifier

    WITH
        c,
        CASE
            WHEN size(case_firs) > 0 THEN case_firs
            WHEN f2 IS NOT NULL THEN [f2]
            ELSE []
        END AS firs

OPTIONAL MATCH (c)-[:HAS]->(h:HEARING)

WITH c, firs, collect(DISTINCT h) AS hearings

OPTIONAL MATCH (c)-[:HAS]->(:HEARING)-[:PRODUCES]->(o:ORDER)

WITH c, firs, hearings, collect(DISTINCT o) AS orders

    RETURN c, firs, hearings, orders
    """

    with driver.session() as session:
        row = session.run(
            query,
            identifier=identifier
        ).single()

    if row is None or (row["c"] is None and len(row["firs"]) == 0):
        return jsonify({
            "error": "Case not found"
        }), 404

    nodes = []
    edges = []

    c = row["c"]

    if c is not None:
        nodes.append({
            "id": c["case_number"],
            "type": "CASE",
            "data": {
                "case_number": c["case_number"],
                "registration_date": serialize(c.get("registration_date")),
                "status": c.get("status"),
                "court_name": c.get("court_name"),
                "chargesheet_filed": c.get("chargesheet_filed"),
                "chargesheet_deadline": serialize(
                    c.get("chargesheet_deadline")
                )
            }
        })

    for f in row["firs"]:
        if f is None:
            continue

        fid = f["fir_number"]

        nodes.append({
            "id": fid,
            "type": "FIR",
            "data": {
                "fir_number": fid,
                "filed_date": serialize(f.get("filed_date")),
                "police_station": f.get("police_station"),
                "complainant": f.get("complainant"),
                "accused": f.get("accused"),
                "sections": f.get("sections", [])
            }
        })

        if c is not None:
            edges.append({
                "source": fid,
                "target": c["case_number"],
                "type": "LEADS_TO"
            })

    for h in row["hearings"]:
        if h is None:
            continue

        hid = h["hearing_id"]

        nodes.append({
            "id": hid,
            "type": "HEARING",
            "data": {
                "hearing_id": hid,
                "hearing_date": serialize(h.get("hearing_date")),
                "hearing_type": h.get("hearing_type"),
                "outcome": h.get("outcome"),
                "next_hearing_date": serialize(
                    h.get("next_hearing_date")
                )
            }
        })

        if c is not None:
            edges.append({
                "source": c["case_number"],
                "target": hid,
                "type": "HAS"
            })

    for o in row["orders"]:
        if o is None:
            continue

        oid = o["order_id"]

        nodes.append({
            "id": oid,
            "type": "ORDER",
            "data": {
                "order_id": oid,
                "order_date": serialize(o.get("order_date")),
                "order_type": o.get("order_type"),
                "judge_or_court": o.get("judge_or_court"),
                "summary": o.get("summary")
            }
        })

        for h in row["hearings"]:
            if h is not None and h.get("hearing_date") == o.get("order_date"):
                edges.append({
                    "source": h["hearing_id"],
                    "target": oid,
                    "type": "PRODUCES"
                })

    return jsonify({
        "case_number": c["case_number"] if c is not None else None,
        "fir_number": (
            row["firs"][0]["fir_number"]
            if row["firs"]
            else None
        ),
        "nodes": nodes,
        "edges": edges
    })

@app.get("/api/health")
def health():
    try:
        driver.verify_connectivity()

        return jsonify({
            "status": "ok",
            "neo4j": "connected"
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "neo4j": "disconnected",
            "message": str(e)
        }), 500


@app.route("/api/extract", methods=["POST", "OPTIONS"])
def extract_document():
    if request.method == "OPTIONS":
        return "", 204

    """
    Run the complete JIG document pipeline:

    document text
        ↓
    llm_extractor.py
        ↓
    validator.py
        ↓
    extract_to_neo4j.py
    """

    data = request.get_json(silent=True)

    if not data or "text" not in data:
        return jsonify({
            "error": "Request must contain 'text'."
        }), 400

    document_text = data["text"]

    if not isinstance(document_text, str) or not document_text.strip():
        return jsonify({
            "error": "Document text cannot be empty."
        }), 400

    backend_dir = Path(__file__).resolve().parent

    extractor = backend_dir / "llm_extractor.py"
    validator_file = backend_dir / "validator.py"
    importer = backend_dir / "extract_to_neo4j.py"

    required_files = [
        extractor,
        validator_file,
        importer
    ]

    missing_files = [
        str(path.name)
        for path in required_files
        if not path.exists()
    ]

    if missing_files:
        return jsonify({
            "error": "Required pipeline file(s) missing.",
            "missing_files": missing_files
        }), 500

    input_file = None

    try:
        # --------------------------------------------------
        # 1. Create temporary input document
        # --------------------------------------------------

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".txt",
            delete=False,
            encoding="utf-8"
        ) as temp:
            temp.write(document_text)
            input_file = Path(temp.name)

        # --------------------------------------------------
        # 2. Run extractor
        # --------------------------------------------------

        extraction = subprocess.run(
            [
                sys.executable,
                str(extractor),
                str(input_file)
            ],
            cwd=str(backend_dir),
            capture_output=True,
            text=True
        )

        if extraction.returncode != 0:
            return jsonify({
                "error": "Document extraction failed.",
                "details": extraction.stderr
            }), 500

        # --------------------------------------------------
        # 3. Load extracted JSON
        # --------------------------------------------------

        extracted_file = backend_dir / "extracted_case.json"

        if not extracted_file.exists():
            return jsonify({
                "error": "Extractor did not create extracted_case.json."
            }), 500

        extracted_data = json.loads(
            extracted_file.read_text(
                encoding="utf-8"
            )
        )

        # --------------------------------------------------
        # 4. Validate extracted data
        # --------------------------------------------------

        validation_script = f"""
import json
from validator import validate_case

data = json.loads(
    r'''{json.dumps(extracted_data)}'''
)

result = validate_case(data)

print(json.dumps(result))
"""

        validation = subprocess.run(
            [
                sys.executable,
                "-c",
                validation_script
            ],
            cwd=str(backend_dir),
            capture_output=True,
            text=True
        )

        if validation.returncode != 0:
            return jsonify({
                "error": "Validation process failed.",
                "details": validation.stderr
            }), 500

        try:
            validation_result = json.loads(
                validation.stdout.strip()
            )
        except json.JSONDecodeError:
            return jsonify({
                "error": "Validator returned invalid output.",
                "details": validation.stdout
            }), 500

        # --------------------------------------------------
        # 5. Stop if validation failed
        # --------------------------------------------------

        if not validation_result.get("valid", False):
            return jsonify({
                "status": "rejected",
                "extracted_case": extracted_data,
                "validation": validation_result
            }), 400

        # --------------------------------------------------
        # 6. Import into Neo4j
        # --------------------------------------------------

        import_result = subprocess.run(
            [
                sys.executable,
                str(importer),
                str(extracted_file)
            ],
            cwd=str(backend_dir),
            capture_output=True,
            text=True
        )

        if import_result.returncode != 0:
            return jsonify({
                "error": "Neo4j import failed.",
                "details": import_result.stderr,
                "extracted_case": extracted_data
            }), 500

        # --------------------------------------------------
        # 7. Return result
        # --------------------------------------------------

        return jsonify({
            "status": "success",
            "message": "Document extracted, validated, and imported successfully.",
            "extracted_case": extracted_data,
            "validation": validation_result,
            "neo4j_import": import_result.stdout
        })

    except Exception as e:

        return jsonify({
            "error": "Pipeline failed.",
            "message": str(e)
        }), 500

    finally:

        if input_file is not None and input_file.exists():
            try:
                input_file.unlink()
            except Exception:
                pass

if __name__ == "__main__":
    print("JIG API running at http://localhost:5000")
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )