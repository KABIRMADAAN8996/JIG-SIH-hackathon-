import json
import os
from neo4j import GraphDatabase

# =========================
# JIG Neo4j Importer
# =========================
# Put this file in the same folder as jig_cases.json.
#
# Install dependency:
#   pip install neo4j
#
# Default local Neo4j settings:
#   URI      = bolt://localhost:7687
#   USERNAME = neo4j
#
# Set your password in the environment variable NEO4J_PASSWORD:
#   Windows PowerShell:
#       $env:NEO4J_PASSWORD="YOUR_PASSWORD"
#   Windows CMD:
#       set NEO4J_PASSWORD=YOUR_PASSWORD

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not PASSWORD:
    raise SystemExit(
        "ERROR: NEO4J_PASSWORD is not set.\n"
        "PowerShell: $env:NEO4J_PASSWORD=\"YOUR_PASSWORD\"\n"
        "Then run: python import_cases.py"
    )

DATASET_FILE = "jig_cases.json"


def create_case(tx, item):
    fir = item["fir"]
    case = item["case"]

    # FIR
    tx.run("""
        MERGE (f:FIR {fir_number: $fir_number})
        SET f.filed_date = date($filed_date),
            f.police_station = $police_station,
            f.complainant = $complainant,
            f.accused = $accused,
            f.sections = $sections
    """,
    fir_number=fir["fir_number"],
    filed_date=fir["filed_date"],
    police_station=fir.get("police_station"),
    complainant=fir.get("complainant"),
    accused=fir.get("accused"),
    sections=fir.get("sections", []))

    # CASE, only if a judicial case exists.
    if case is not None:
        tx.run("""
            MATCH (f:FIR {fir_number: $fir_number})
            MERGE (c:CASE {case_number: $case_number})
            SET c.registration_date = date($registration_date),
                c.court_name = $court_name,
                c.status = $status,
                c.chargesheet_filed = $chargesheet_filed,
                c.chargesheet_deadline = date($chargesheet_deadline)
        """,
        fir_number=fir["fir_number"],
        case_number=case["case_number"],
        registration_date=case["registration_date"],
        court_name=case.get("court_name"),
        status=case.get("status"),
        chargesheet_filed=case["chargesheet_filed"],
        chargesheet_deadline=case["chargesheet_deadline"])

        # Chargesheet date is optional.
        if case.get("chargesheet_date"):
            tx.run("""
                MATCH (c:CASE {case_number: $case_number})
                SET c.chargesheet_date = date($chargesheet_date)
            """,
            case_number=case["case_number"],
            chargesheet_date=case["chargesheet_date"])

        # FIR -> CASE
        tx.run("""
            MATCH (f:FIR {fir_number: $fir_number})
            MATCH (c:CASE {case_number: $case_number})
            MERGE (f)-[:LEADS_TO]->(c)
        """,
        fir_number=fir["fir_number"],
        case_number=case["case_number"])

        # Hearings
        for h in item.get("hearings", []):
            tx.run("""
                MATCH (c:CASE {case_number: $case_number})
                MERGE (h:HEARING {hearing_id: $hearing_id})
                SET h.hearing_date = date($hearing_date),
                    h.hearing_type = $hearing_type,
                    h.outcome = $outcome
                MERGE (c)-[:HAS]->(h)
            """,
            case_number=case["case_number"],
            hearing_id=h["hearing_id"],
            hearing_date=h["hearing_date"],
            hearing_type=h.get("hearing_type"),
            outcome=h.get("outcome"))

            # Only create the property when a real date exists.
            if h.get("next_hearing_date"):
                tx.run("""
                    MATCH (h:HEARING {hearing_id: $hearing_id})
                    SET h.next_hearing_date = date($next_hearing_date)
                """,
                hearing_id=h["hearing_id"],
                next_hearing_date=h["next_hearing_date"])

        # Orders
        for o in item.get("orders", []):
            tx.run("""
                MERGE (o:ORDER {order_id: $order_id})
                SET o.order_date = date($order_date),
                    o.order_type = $order_type,
                    o.judge_or_court = $judge_or_court,
                    o.summary = $summary
            """,
            order_id=o["order_id"],
            order_date=o["order_date"],
            order_type=o.get("order_type"),
            judge_or_court=o.get("judge_or_court"),
            summary=o.get("summary"))

            # Link an order to the hearing on the same date when possible.
            tx.run("""
                MATCH (h:HEARING)
                WHERE h.hearing_date = date($order_date)
                MATCH (o:ORDER {order_id: $order_id})
                MERGE (h)-[:PRODUCES]->(o)
            """,
            order_date=o["order_date"],
            order_id=o["order_id"])


def main():
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    cases = dataset["cases"]

    driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))

    try:
        driver.verify_connectivity()
        print("Connected to Neo4j:", URI)

        # Safety: clear current database before importing the test dataset.
        with driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n").consume()
            print("Cleared existing graph.")

            for item in cases:
                session.execute_write(create_case, item)
                print("Imported:", item["case_id"])

            result = session.run("""
                MATCH (n)
                RETURN count(n) AS nodes
            """).single()
            print("Total nodes:", result["nodes"])

            result = session.run("""
                MATCH ()-[r]->()
                RETURN count(r) AS relationships
            """).single()
            print("Total relationships:", result["relationships"])

        print("\nIMPORT COMPLETE.")
    finally:
        driver.close()


if __name__ == "__main__":
    main()
