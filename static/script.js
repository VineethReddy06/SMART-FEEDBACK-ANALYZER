const feedbackForm = document.getElementById("feedbackForm");
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetPasswordForm = document.getElementById("resetPasswordForm");


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;

        try {

            const response = await fetch("/api/login", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })

            });

            const result = await response.json();

            document.getElementById("loginMessage").textContent =
                result.message;

            if (result.success) {

                if (result.role === "admin") {

                    window.location.href = "/admin";

                } else {

                    window.location.href = "/dashboard";

                }
            }

        } catch (error) {

            console.error("Login error:", error);

            document.getElementById("loginMessage").textContent =
                "Unable to login. Please try again.";

        }

    });

}


if (forgotPasswordForm) {

    forgotPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const response = await fetch("/api/forgot-password", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                email: document.getElementById("forgotEmail").value.trim()
            })
        });
        const result = await response.json();
        document.getElementById("forgotMessage").textContent = result.message;
    });
}


if (resetPasswordForm) {

    resetPasswordForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const response = await fetch("/api/reset-password", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                token: resetPasswordForm.dataset.token,
                password: document.getElementById("newPassword").value
            })
        });
        const result = await response.json();
        document.getElementById("resetMessage").textContent = result.message;

        if (result.success) {
            setTimeout(function () {
                window.location.href = "/login";
            }, 1200);
        }
    });
}


// =====================================================
// ADMIN - LOAD FEEDBACK
// =====================================================

async function loadAdminFeedback() {

    const search =
        document.getElementById("searchFeedback")?.value.trim() || "";

    const status =
        document.getElementById("statusFilter")?.value || "";

    const sentiment =
        document.getElementById("sentimentFilter")?.value || "";

    const category =
        document.getElementById("categoryFilter")?.value || "";

    const priority =
        document.getElementById("priorityFilter")?.value || "";


    const params = new URLSearchParams();


    if (search) {

        params.append("search", search);

    }


    if (status) {

        params.append("status", status);

    }


    if (sentiment) {

        params.append("sentiment", sentiment);

    }


    if (category) {

        params.append("category", category);

    }


    if (priority) {

        params.append("priority", priority);

    }


    try {

        const response =
            await fetch(`/api/admin/feedback?${params.toString()}`);

        const result =
            await response.json();


        if (!result.success) {

            return;

        }


        const table =
            document.getElementById("feedbackTable");


        if (!table) {

            return;

        }


        table.innerHTML = "";


        result.feedback.forEach(function (item) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>${item.id}</td>

                <td>${item.feedback_text}</td>

                <td>${item.sentiment || "N/A"}</td>

                <td>${item.category || "N/A"}</td>

                <td>${item.priority || "N/A"}</td>

                <td>${item.status}</td>

                <td>${item.created_at}</td>

                <td>

                    <button
                        onclick="reviewFeedback(${item.id})">
                        Review
                    </button>

                    <button
                        onclick="flagFeedback(${item.id})">
                        Flag
                    </button>

                </td>

            `;


            table.appendChild(row);

        });


    } catch (error) {

        console.error(
            "Admin feedback error:",
            error
        );

    }

}


// =====================================================
// ADMIN - LOAD STATS
// =====================================================

async function loadAdminStats() {

    try {

        const response =
            await fetch("/api/admin/stats");

        const result =
            await response.json();


        if (!result.success) {

            return;

        }


        const stats =
            result.stats;


        const total =
            document.getElementById("totalFeedback");

        const pending =
            document.getElementById("pendingFeedback");

        const reviewed =
            document.getElementById("reviewedFeedback");

        const flagged =
            document.getElementById("flaggedFeedback");


        if (total) {

            total.textContent =
                stats.total || 0;

        }


        if (pending) {

            pending.textContent =
                stats.pending || 0;

        }


        if (reviewed) {

            reviewed.textContent =
                stats.reviewed || 0;

        }


        if (flagged) {

            flagged.textContent =
                stats.flagged || 0;

        }


        createFeedbackChart(stats);


    } catch (error) {

        console.error(
            "Admin stats error:",
            error
        );

    }

}


// =====================================================
// ADMIN - FEEDBACK OVERVIEW CHART
// =====================================================

let feedbackChartInstance = null;


function createFeedbackChart(stats) {

    const canvas =
        document.getElementById("feedbackChart");


    if (!canvas) {

        return;

    }


    if (feedbackChartInstance) {

        feedbackChartInstance.destroy();

    }


    feedbackChartInstance =
        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels: [
                    "Pending",
                    "Reviewed",
                    "Flagged"
                ],

                datasets: [{

                    data: [

                        stats.pending || 0,

                        stats.reviewed || 0,

                        stats.flagged || 0

                    ]

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: "bottom"

                    }

                }

            }

        });

}


// =====================================================
// ADMIN - AI ANALYTICS
// =====================================================

async function loadAnalytics() {

    try {

        const response =
            await fetch("/api/admin/analytics");

        const result =
            await response.json();


        if (!result.success) {

            return;

        }


        createAnalyticsChart(
            "sentimentChart",
            "Sentiment",
            result.sentiment
        );


        createAnalyticsChart(
            "categoryChart",
            "Category",
            result.category
        );


        createAnalyticsChart(
            "priorityChart",
            "Priority",
            result.priority
        );


    } catch (error) {

        console.error(
            "Analytics error:",
            error
        );

    }

}


// Store chart instances so we don't create duplicates

const analyticsCharts = {};


function createAnalyticsChart(
    canvasId,
    label,
    data
) {

    const canvas =
        document.getElementById(canvasId);


    if (!canvas) {

        return;

    }


    if (analyticsCharts[canvasId]) {

        analyticsCharts[canvasId].destroy();

    }


    const labels =
        data.map(function (item) {

            return (
                item.sentiment ||
                item.category ||
                item.priority
            );

        });


    const values =
        data.map(function (item) {

            return item.count;

        });


    analyticsCharts[canvasId] =
        new Chart(canvas, {

            type: "doughnut",

            data: {

                labels: labels,

                datasets: [{

                    label: label,

                    data: values

                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        position: "bottom"

                    }

                }

            }

        });

}


// =====================================================
// ADMIN - FLAG FEEDBACK
// =====================================================

async function flagFeedback(id) {

    try {

        const response = await fetch(
            `/api/admin/feedback/${id}/flag`,
            {
                method: "PUT"
            }
        );


        const result =
            await response.json();


        alert(result.message);


        if (result.success) {

            loadAdminFeedback();

            loadAdminStats();

            loadAnalytics();

        }


    } catch (error) {

        console.error(
            "Flag error:",
            error
        );

    }

}


// =====================================================
// ADMIN - REVIEW FEEDBACK
// =====================================================

async function reviewFeedback(id) {

    try {

        const response = await fetch(
            `/api/admin/feedback/${id}/review`,
            {
                method: "PUT"
            }
        );


        const result =
            await response.json();


        alert(result.message);


        if (result.success) {

            loadAdminFeedback();

            loadAdminStats();

            loadAnalytics();

        }


    } catch (error) {

        console.error(
            "Review error:",
            error
        );

    }

}


// =====================================================
// ADMIN - INITIAL LOAD
// =====================================================

if (
    document.getElementById("feedbackTable")
) {

    loadAdminFeedback();

    loadAdminStats();

    loadAnalytics();

}


// =====================================================
// REGISTER
// =====================================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const name =
                document.getElementById("name").value.trim();


            const email =
                document.getElementById("email").value.trim();


            const password =
                document.getElementById("password").value;


            try {

                const response =
                    await fetch("/api/register", {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            name: name,

                            email: email,

                            password: password

                        })

                    });


                const result =
                    await response.json();


                document.getElementById(
                    "registerMessage"
                ).textContent =
                    result.message;


                if (result.success) {

                    registerForm.reset();

                }


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                document.getElementById(
                    "registerMessage"
                ).textContent =
                    "Unable to register. Please try again.";

            }

        }
    );

}


// =====================================================
// FEEDBACK SUBMISSION + AI ANALYSIS
// =====================================================

if (feedbackForm) {

    feedbackForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const feedbackText =
                document
                    .getElementById("feedbackText")
                    .value
                    .trim();


            const message =
                document.getElementById("message");


            const analysisBox =
                document.getElementById(
                    "analysisResult"
                );


            try {

                const response =
                    await fetch("/api/feedback", {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body: JSON.stringify({

                            feedback_text:
                                feedbackText

                        })

                    });


                const result =
                    await response.json();


                console.log(
                    "API response:",
                    result
                );


                message.textContent =
                    result.message;


                if (result.success) {

                    feedbackForm.reset();


                    if (
                        analysisBox &&
                        result.analysis
                    ) {

                        analysisBox.innerHTML = `

                            <h3>
                                AI Feedback Analysis
                            </h3>

                            <p>
                                <strong>
                                    Sentiment:
                                </strong>

                                ${result.analysis.sentiment}

                            </p>

                            <p>
                                <strong>
                                    Category:
                                </strong>

                                ${result.analysis.category}

                            </p>

                            <p>
                                <strong>
                                    Priority:
                                </strong>

                                ${result.analysis.priority}

                            </p>

                        `;


                        analysisBox.style.display =
                            "block";

                    }

                }


            } catch (error) {

                console.error(
                    "Feedback error:",
                    error
                );


                message.textContent =
                    "Unable to submit feedback. Please try again.";

            }

        }
    );

}


// =====================================================
// USER DASHBOARD
// =====================================================

async function loadMyFeedback() {

    try {

        const response =
            await fetch("/api/my-feedback");


        const result =
            await response.json();


        const container =
            document.getElementById(
                "userFeedback"
            );


        if (!container) {

            return;

        }


        if (!result.success) {

            container.innerHTML = `

                <p>
                    ${result.message}
                </p>

            `;

            return;

        }


        if (
            result.feedback.length === 0
        ) {

            container.innerHTML = `

                <p>
                    You have not submitted
                    any feedback yet.
                </p>

            `;

            return;

        }


        container.innerHTML = "";


        result.feedback.forEach(
            function (item) {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "feedback-card";


                card.innerHTML = `

                    <h3>
                        Feedback #${item.id}
                    </h3>


                    <p>

                        <strong>
                            Feedback:
                        </strong>

                        ${item.feedback_text}

                    </p>


                    <p>

                        <strong>
                            Sentiment:
                        </strong>

                        ${item.sentiment ||
                            "Pending"}

                    </p>


                    <p>

                        <strong>
                            Category:
                        </strong>

                        ${item.category ||
                            "Pending"}

                    </p>


                    <p>

                        <strong>
                            Priority:
                        </strong>

                        ${item.priority ||
                            "Pending"}

                    </p>


                    <p>

                        <strong>
                            Status:
                        </strong>

                        ${item.status}

                    </p>


                    <p>

                        <strong>
                            Date:
                        </strong>

                        ${item.created_at}

                    </p>

                `;


                container.appendChild(card);

            }
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

}


if (
    document.getElementById("userFeedback")
) {

    loadMyFeedback();

}