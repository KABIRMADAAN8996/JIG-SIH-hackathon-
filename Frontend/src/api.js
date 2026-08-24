const API_BASE_URL = "http://localhost:5000";

async function request(endpoint, options = {}) {
    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        options
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(
            error || `API request failed: ${response.status}`
        );
    }

    return response.json();
}


export async function getCases() {
    return request("/api/cases");
}


export async function getCase(caseNumber) {
    return request(
        `/api/cases/${encodeURIComponent(caseNumber)}`
    );
}


export async function getCaseGraph(caseNumber) {
    return request(
        `/api/cases/${encodeURIComponent(caseNumber)}/graph`
    );
}


/*
 * Send a document to the JIG extraction pipeline.
 *
 * Frontend
 *    ↓
 * /api/extract
 *    ↓
 * llm_extractor.py
 *    ↓
 * validator.py
 *    ↓
 * Neo4j
 */
export async function extractDocument(text) {
    return request("/api/extract", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            text: text
        })
    });
}