import os
from neo4j import GraphDatabase
from datetime import date


URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
PASSWORD = os.getenv("NEO4J_PASSWORD")

if not PASSWORD:
    raise SystemExit("ERROR: Set NEO4J_PASSWORD before running this file.")

REFERENCE_DATE = date.today().isoformat()

QUERY = """
MATCH (f:FIR)
OPTIONAL MATCH (f)-[:LEADS_TO]->(c:CASE)
WITH f, c,
     duration.inDays(f.filed_date, date($reference_date)).days AS fir_age
OPTIONAL MATCH (c)-[:HAS]->(h:HEARING)
WITH f, c, fir_age, collect(h) AS hearings

WITH f, c, fir_age, hearings,
     CASE
       WHEN c IS NULL AND fir_age > 15 THEN "TRIGGERED"
       ELSE "NOT TRIGGERED"
     END AS rule_1,
     CASE
       WHEN c IS NOT NULL
            AND size(hearings) = 0
            AND duration.inDays(c.registration_date, date($reference_date)).days > 60
       THEN "TRIGGERED"
       ELSE "NOT TRIGGERED"
     END AS rule_2

WITH f, c, rule_1, rule_2, hearings,
     CASE
       WHEN size(hearings) > 0
       THEN reduce(
          latest = hearings[0],
          x IN hearings |
          CASE WHEN x.hearing_date > latest.hearing_date THEN x ELSE latest END
       )
       ELSE NULL
     END AS latest_hearing

WITH f, c, rule_1, rule_2, latest_hearing,
     CASE
       WHEN latest_hearing IS NOT NULL
            AND latest_hearing.outcome IN ["adjourned", "ongoing"]
            AND NOT "next_hearing_date" IN keys(latest_hearing)
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
  c.case_number AS case_number,
  rule_1, rule_2, rule_3, rule_4,
  CASE
    WHEN rule_1 = "TRIGGERED" AND rule_2 = "TRIGGERED"
         AND rule_3 = "TRIGGERED" AND rule_4 = "TRIGGERED"
      THEN "RULES 1 + 2 + 3 + 4"
    WHEN rule_1 = "TRIGGERED" AND rule_2 = "TRIGGERED"
         AND rule_3 = "TRIGGERED"
      THEN "RULES 1 + 2 + 3"
    WHEN rule_1 = "TRIGGERED" AND rule_2 = "TRIGGERED"
         AND rule_4 = "TRIGGERED"
      THEN "RULES 1 + 2 + 4"
    WHEN rule_1 = "TRIGGERED" AND rule_3 = "TRIGGERED"
         AND rule_4 = "TRIGGERED"
      THEN "RULES 1 + 3 + 4"
    WHEN rule_2 = "TRIGGERED" AND rule_3 = "TRIGGERED"
         AND rule_4 = "TRIGGERED"
      THEN "RULES 2 + 3 + 4"
    WHEN rule_3 = "TRIGGERED" AND rule_4 = "TRIGGERED"
      THEN "RULES 3 + 4"
    WHEN rule_1 = "TRIGGERED" AND rule_4 = "TRIGGERED"
      THEN "RULES 1 + 4"
    WHEN rule_1 = "TRIGGERED" AND rule_3 = "TRIGGERED"
      THEN "RULES 1 + 3"
    WHEN rule_2 = "TRIGGERED" AND rule_4 = "TRIGGERED"
      THEN "RULES 2 + 4"
    WHEN rule_2 = "TRIGGERED" AND rule_3 = "TRIGGERED"
      THEN "RULES 2 + 3"
    WHEN rule_1 = "TRIGGERED" THEN "RULE 1"
    WHEN rule_2 = "TRIGGERED" THEN "RULE 2"
    WHEN rule_3 = "TRIGGERED" THEN "RULE 3"
    WHEN rule_4 = "TRIGGERED" THEN "RULE 4"
    ELSE "CLEAN"
  END AS overall_result
ORDER BY f.fir_number
"""


def main():
    driver = GraphDatabase.driver(URI, auth=(USERNAME, PASSWORD))
    try:
        driver.verify_connectivity()
        with driver.session() as session:
            rows = list(session.run(QUERY, reference_date=REFERENCE_DATE))

        print("\nJIG RULE ENGINE RESULTS")
        print("=" * 90)
        for r in rows:
            print(
                f"{r['fir_number']:16} "
                f"{str(r['case_number']):12} "
                f"R1={r['rule_1']:<14} "
                f"R2={r['rule_2']:<14} "
                f"R3={r['rule_3']:<14} "
                f"R4={r['rule_4']:<14} "
                f"=> {r['overall_result']}"
            )
        print("=" * 90)
    finally:
        driver.close()


if __name__ == "__main__":
    main()
