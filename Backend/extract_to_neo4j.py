import json
import os
import sys
from pathlib import Path

from neo4j import GraphDatabase


# =========================================================
# NEO4J CONFIGURATION
# =========================================================

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not PASSWORD:
    raise SystemExit(
        "ERROR: Set NEO4J_PASSWORD before running this file."
    )


# =========================================================
# LOAD JSON
# =========================================================

def load_json(filename):
    path = Path(filename)

    if not path.exists():
        raise SystemExit(
            f"ERROR: File not found: {filename}"
        )

    try:
        return json.loads(
            path.read_text(encoding="utf-8")
        )
    except json.JSONDecodeError as e:
        raise SystemExit(
            f"ERROR: Invalid JSON file: {e}"
        )


# =========================================================
# IMPORT CASE INTO NEO4J
# =========================================================

def import_case(tx, data):

    # -----------------------------------------------------
    # Get main sections
    # -----------------------------------------------------

    fir = data.get("fir")
    case = data.get("case")

    if not fir:
        raise ValueError(
            "Extracted data does not contain a 'fir' object."
        )


    # =====================================================
    # 1. FIR
    # =====================================================

    fir_number = fir.get("fir_number")

    if not fir_number:
        raise ValueError(
            "FIR number is missing."
        )

    tx.run(
        """
        MERGE (f:FIR {fir_number: $fir_number})
        SET
            f.filed_date = date($filed_date),
            f.police_station = $police_station,
            f.complainant = $complainant,
            f.accused = $accused,
            f.sections = $sections
        """,
        fir_number=fir_number,
        filed_date=fir.get("filed_date"),
        police_station=fir.get("police_station"),
        complainant=fir.get("complainant"),
        accused=fir.get("accused"),
        sections=fir.get("sections", [])
    )


    # =====================================================
    # 2. CASE
    # =====================================================

    if case:

        case_number = case.get("case_number")

        if not case_number:
            raise ValueError(
                "Case number is missing."
            )

        tx.run(
            """
            MERGE (c:CASE {case_number: $case_number})
            SET
                c.registration_date = date($registration_date),
                c.court_name = $court_name,
                c.status = $status,
                c.chargesheet_filed = $chargesheet_filed,

                c.chargesheet_date =
                    CASE
                        WHEN $chargesheet_date IS NULL
                        THEN NULL
                        ELSE date($chargesheet_date)
                    END,

                c.chargesheet_deadline =
                    CASE
                        WHEN $chargesheet_deadline IS NULL
                        THEN NULL
                        ELSE date($chargesheet_deadline)
                    END
            """,
            case_number=case_number,
            registration_date=case.get("registration_date"),
            court_name=case.get("court_name"),
            status=case.get("status"),
            chargesheet_filed=case.get("chargesheet_filed"),
            chargesheet_date=case.get("chargesheet_date"),
            chargesheet_deadline=case.get("chargesheet_deadline")
        )


        # -------------------------------------------------
        # FIR -> CASE
        # -------------------------------------------------

        tx.run(
            """
            MATCH (f:FIR {fir_number: $fir_number})
            MATCH (c:CASE {case_number: $case_number})

            MERGE (f)-[:LEADS_TO]->(c)
            """,
            fir_number=fir_number,
            case_number=case_number
        )


    # =====================================================
    # 3. HEARINGS
    # =====================================================

    for hearing in data.get("hearings", []):

        hearing_id = hearing.get("hearing_id")

        if not hearing_id:
            continue

        hearing_date = hearing.get("hearing_date")

        if not hearing_date:
            raise ValueError(
                f"Hearing {hearing_id} is missing hearing_date."
            )

        tx.run(
            """
            MERGE (h:HEARING {hearing_id: $hearing_id})

            SET
                h.hearing_date = date($hearing_date),
                h.hearing_type = $hearing_type,
                h.outcome = $outcome,

                h.next_hearing_date =
                    CASE
                        WHEN $next_hearing_date IS NULL
                        THEN NULL
                        ELSE date($next_hearing_date)
                    END
            """,
            hearing_id=hearing_id,
            hearing_date=hearing_date,
            hearing_type=hearing.get("hearing_type"),
            outcome=hearing.get("outcome"),
            next_hearing_date=hearing.get("next_hearing_date")
        )


        # -------------------------------------------------
        # CASE -> HEARING
        # -------------------------------------------------

        if case:

            tx.run(
                """
                MATCH (c:CASE {case_number: $case_number})
                MATCH (h:HEARING {hearing_id: $hearing_id})

                MERGE (c)-[:HAS]->(h)
                """,
                case_number=case.get("case_number"),
                hearing_id=hearing_id
            )


    # =====================================================
    # 4. ORDERS
    # =====================================================

    for order in data.get("orders", []):

        order_id = order.get("order_id")

        if not order_id:
            continue

        order_date = order.get("order_date")

        if not order_date:
            raise ValueError(
                f"Order {order_id} is missing order_date."
            )


        # -------------------------------------------------
        # Create / update ORDER node
        # -------------------------------------------------

        tx.run(
            """
            MERGE (o:ORDER {order_id: $order_id})

            SET
                o.order_date = date($order_date),
                o.order_type = $order_type,
                o.judge_or_court = $judge_or_court,
                o.summary = $summary
            """,
            order_id=order_id,
            order_date=order_date,
            order_type=order.get("order_type"),
            judge_or_court=order.get("judge_or_court"),
            summary=order.get("summary")
        )


        # -------------------------------------------------
        # HEARING -> ORDER
        #
        # The current dataset does not explicitly provide
        # hearing_id inside the order.
        #
        # Therefore we connect the order to the hearing
        # whose hearing_date matches the order_date.
        # -------------------------------------------------

        if case:

            tx.run(
                """
                MATCH (c:CASE {case_number: $case_number})

                MATCH (c)-[:HAS]->(h:HEARING)

                WHERE h.hearing_date = date($order_date)

                MATCH (o:ORDER {order_id: $order_id})

                MERGE (h)-[:PRODUCES]->(o)
                """,
                case_number=case.get("case_number"),
                order_id=order_id,
                order_date=order_date
            )


    # =====================================================
    # 5. IMPORT VERIFICATION
    # =====================================================

    result = tx.run(
        """
        MATCH (f:FIR {fir_number: $fir_number})

        OPTIONAL MATCH (f)-[:LEADS_TO]->(c:CASE)

        OPTIONAL MATCH (c)-[:HAS]->(h:HEARING)

        OPTIONAL MATCH (h)-[:PRODUCES]->(o:ORDER)

        RETURN
            f.fir_number AS fir_number,
            c.case_number AS case_number,
            collect(DISTINCT h.hearing_id) AS hearings,
            collect(DISTINCT o.order_id) AS orders
        """,
        fir_number=fir_number
    ).single()


    print("\n========================================")
    print("CASE IMPORT VERIFICATION")
    print("========================================")

    if result:

        print(
            f"FIR       : {result['fir_number']}"
        )

        print(
            f"CASE      : {result['case_number']}"
        )

        print(
            f"HEARINGS  : {result['hearings']}"
        )

        print(
            f"ORDERS    : {result['orders']}"
        )

    print("========================================")
    print("Case imported successfully.")
    print("========================================\n")


# =========================================================
# MAIN
# =========================================================

def main():

    if len(sys.argv) < 2:

        raise SystemExit(
            "Usage: python extract_to_neo4j.py extracted_case.json"
        )


    filename = sys.argv[1]

    # -----------------------------------------------------
    # Load extracted JSON
    # -----------------------------------------------------

    data = load_json(filename)


    # -----------------------------------------------------
    # Connect to Neo4j
    # -----------------------------------------------------

    driver = GraphDatabase.driver(
        URI,
        auth=(USERNAME, PASSWORD)
    )


    try:

        driver.verify_connectivity()

        print("Connected to Neo4j.")


        # -------------------------------------------------
        # Write complete case graph
        # -------------------------------------------------

        with driver.session() as session:

            session.execute_write(
                import_case,
                data
            )


    except Exception as e:

        print(
            f"\nERROR: Neo4j import failed:\n{e}",
            file=sys.stderr
        )

        raise


    finally:

        driver.close()

        print("Neo4j connection closed.")


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":
    main()