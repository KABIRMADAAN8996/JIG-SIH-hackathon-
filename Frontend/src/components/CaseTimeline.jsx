function formatDate(date) {
    if (!date) return "Date not recorded";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) {
        return String(date);
    }

    return d
        .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
        .toUpperCase();
}

function addEvent(events, date, type, title, details = []) {
    if (!date) return;

    events.push({
        date,
        type,
        title,
        details
    });
}

export default function CaseTimeline({ caseGraph }) {
    const apiCase = caseGraph?.apiCase;
    const apiGraph = caseGraph?.apiGraph;

    if (!apiCase && !apiGraph) {
        return null;
    }

    const events = [];

    /*
     * =========================================================
     * FIR
     * =========================================================
     */

    const fir = apiGraph?.nodes?.find(
        (node) => node.type === "FIR"
    );

    if (fir) {
        addEvent(
            events,
            fir.data.filed_date,
            "FIR FILED",
            fir.data.fir_number,
            [
                fir.data.police_station
                    ? `Police Station: ${fir.data.police_station}`
                    : null,

                fir.data.complainant
                    ? `Complainant: ${fir.data.complainant}`
                    : null,

                fir.data.accused
                    ? `Accused: ${fir.data.accused}`
                    : null
            ].filter(Boolean)
        );
    }

    /*
     * =========================================================
     * CASE REGISTRATION
     * =========================================================
     */

    const caseNode = apiGraph?.nodes?.find(
        (node) => node.type === "CASE"
    );

    if (caseNode) {
        addEvent(
            events,
            caseNode.data.registration_date,
            "CASE REGISTERED",
            caseNode.data.case_number,
            [
                caseNode.data.court_name
                    ? `Court: ${caseNode.data.court_name}`
                    : null,

                caseNode.data.status
                    ? `Status: ${caseNode.data.status}`
                    : null
            ].filter(Boolean)
        );
    }

    /*
     * =========================================================
     * HEARINGS
     * =========================================================
     *
     * Every actual HEARING node appears only once.
     *
     * If a hearing has no explicit next_hearing_date,
     * we find the next chronological HEARING and show
     * its date inside the current hearing.
     *
     * IMPORTANT:
     * We do NOT create a separate "NEXT HEARING" event.
     *
     * Example:
     *
     * H-501 -> 15 MAY 2026
     * H-502 -> 05 JUL 2026
     *
     * H-501 displays:
     *
     * Type: bail hearing
     * Outcome: adjourned
     * Next Hearing: 05 JUL 2026
     *
     * H-502 displays:
     *
     * Type: bail hearing
     * Outcome: adjourned
     *
     * No duplicate NEXT HEARING event is created.
     */

    const hearings = (apiGraph?.nodes || [])
        .filter((node) => node.type === "HEARING")
        .sort(
            (a, b) =>
                new Date(a.data?.hearing_date).getTime() -
                new Date(b.data?.hearing_date).getTime()
        );

    hearings.forEach((hearing) => {
        const data = hearing.data;

        /*
         * Start with explicitly stored next hearing date.
         */
        let nextHearingDate = data.next_hearing_date;

        /*
         * If next_hearing_date is not stored,
         * find the next actual hearing chronologically.
         */
        if (!nextHearingDate && data.hearing_date) {
            const currentDate = new Date(data.hearing_date);

            const nextHearings = hearings
                .filter(
                    (other) =>
                        other.data?.hearing_id !==
                        data.hearing_id &&
                        other.data?.hearing_date
                )
                .filter((other) => {
                    const otherDate = new Date(
                        other.data.hearing_date
                    );

                    return (
                        !Number.isNaN(otherDate.getTime()) &&
                        otherDate > currentDate
                    );
                })
                .sort(
                    (a, b) =>
                        new Date(
                            a.data.hearing_date
                        ).getTime() -
                        new Date(
                            b.data.hearing_date
                        ).getTime()
                );

            if (nextHearings.length > 0) {
                nextHearingDate =
                    nextHearings[0].data.hearing_date;
            }
        }

        /*
         * Build details for the actual hearing.
         */
        const hearingDetails = [
            data.hearing_type
                ? `Type: ${data.hearing_type}`
                : null,

            data.outcome
                ? `Outcome: ${data.outcome}`
                : null,

            nextHearingDate
                ? `Next Hearing: ${formatDate(nextHearingDate)}`
                : null
        ].filter(Boolean);

        /*
         * Add ONLY the actual hearing event.
         */
        addEvent(
            events,
            data.hearing_date,
            "HEARING",
            data.hearing_id,
            hearingDetails
        );
    });

    /*
     * =========================================================
     * ORDERS
     * =========================================================
     */

    const orders = (apiGraph?.nodes || []).filter(
        (node) => node.type === "ORDER"
    );

    orders.forEach((order) => {
        const data = order.data;

        addEvent(
            events,
            data.order_date,
            "ORDER",
            data.order_id,
            [
                data.order_type
                    ? `Type: ${data.order_type}`
                    : null,

                data.judge_or_court
                    ? `Judge/Court: ${data.judge_or_court}`
                    : null,

                data.summary
                    ? data.summary
                    : null
            ].filter(Boolean)
        );
    });

    /*
     * =========================================================
     * SORT ALL EVENTS CHRONOLOGICALLY
     * =========================================================
     */

    events.sort(
        (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime()
    );

    /*
     * =========================================================
     * FIR-ONLY CASE
     * =========================================================
     */

    const noCaseRegistered = !caseNode && fir;

    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    return (
        <section className="case-timeline">

            <div className="timeline-heading">

                <div>
                    <div className="section-label">
                        CASE TIMELINE
                    </div>

                    <h3>
                        Chronological case history
                    </h3>
                </div>

                <div className="timeline-count">
                    {events.length} EVENTS
                </div>

            </div>

            {noCaseRegistered && (
                <div className="timeline-warning">
                    CASE REGISTRATION NOT FOUND — FIR remains
                    awaiting judicial case registration.
                </div>
            )}

            {events.length === 0 ? (

                <div className="timeline-empty">
                    No dated events have been recorded.
                </div>

            ) : (

                <div className="timeline-list">

                    {events.map((event, index) => (

                        <div
                            className="timeline-event"
                            key={`${event.type}-${event.title}-${event.date}-${index}`}
                        >

                            <div className="timeline-date">
                                {formatDate(event.date)}
                            </div>

                            <div className="timeline-marker">
                                <span />
                            </div>

                            <div className="timeline-content">

                                <div className="timeline-type">
                                    {event.type}
                                </div>

                                <div className="timeline-title">
                                    {event.title}
                                </div>

                                {event.details.length > 0 && (

                                    <div className="timeline-details">

                                        {event.details.map(
                                            (detail, detailIndex) => (

                                                <div
                                                    key={detailIndex}
                                                >
                                                    {detail}
                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </section>
    );
}