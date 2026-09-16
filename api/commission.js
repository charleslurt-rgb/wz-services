import nodemailer from "nodemailer";

export default async function handler(request, response) {
    // Only allow POST
    if (request.method !== "POST") {
        return response.status(405).json({
            success: false,
            error: "Method Not Allowed"
        });
    }

    try {
        // =========================================================
        // ENVIRONMENT VARIABLES
        // =========================================================

        const webhook = process.env.DISCORD_WEBHOOK_URL;
        const gmailUser = process.env.GMAIL_USER;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD;

        if (!webhook) {
            return response.status(500).json({
                success: false,
                error: "Discord webhook is not configured on the server."
            });
        }

        if (!gmailUser || !gmailPassword) {
            return response.status(500).json({
                success: false,
                error: "Gmail is not configured on the server."
            });
        }

        // =========================================================
        // FORM DATA
        // =========================================================

        const {
            customer,
            email,
            service,
            package: packageId,
            description,
            budget,
            payment,
            discount
        } = request.body || {};

        // Basic validation
        if (!customer || !email || !service || !description) {
            return response.status(400).json({
                success: false,
                error: "Missing required commission information."
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(String(email))) {
            return response.status(400).json({
                success: false,
                error: "Invalid customer email address."
            });
        }

        // =========================================================
        // ORDER ID
        // =========================================================

        const orderId =
            `WZ-${Date.now().toString(36).toUpperCase()}`;

        const submittedAt = new Date().toISOString();

        // =========================================================
        // DISCORD WEBHOOK
        // =========================================================

        const embed = {
            title: "New WZ Services Commission",
            description: String(description).slice(0, 4000),
            color: 0xffffff,

            fields: [
                {
                    name: "Customer",
                    value: String(customer).slice(0, 1024),
                    inline: true
                },
                {
                    name: "Email",
                    value: String(email).slice(0, 1024),
                    inline: true
                },
                {
                    name: "Service",
                    value: String(service).slice(0, 1024),
                    inline: true
                },
                {
                    name: "Package",
                    value: String(packageId || "Custom Quote").slice(0, 1024),
                    inline: true
                },
                {
                    name: "Budget",
                    value: String(budget || "Not provided").slice(0, 1024),
                    inline: true
                },
                {
                    name: "Payment Method",
                    value: String(payment || "Not provided").slice(0, 1024),
                    inline: true
                },
                {
                    name: "Discount",
                    value: String(discount || "None").slice(0, 1024),
                    inline: true
                },
                {
                    name: "Order ID",
                    value: orderId,
                    inline: true
                }
            ],

            footer: {
                text: "WZ Services • Commission System"
            },

            timestamp: submittedAt
        };

        // Give Discord a maximum of 10 seconds
        const controller = new AbortController();

        const timeout = setTimeout(() => {
            controller.abort();
        }, 10000);

        let discordResponse;

        try {
            discordResponse = await fetch(webhook, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    username: "WZ Services",
                    embeds: [embed]
                }),

                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!discordResponse.ok) {
            const discordText = await discordResponse.text();

            console.error(
                "Discord webhook failed:",
                discordResponse.status,
                discordText
            );

            return response.status(502).json({
                success: false,
                error: "Discord webhook rejected the commission.",
                discordStatus: discordResponse.status
            });
        }

        // =========================================================
        // GMAIL
        // =========================================================

        const transporter = nodemailer.createTransport({
            service: "gmail",

            auth: {
                user: gmailUser,
                pass: gmailPassword
            }
        });

        // =========================================================
        // EMAIL TO YOU
        // =========================================================

        const ownerEmail = {
            from: `"WZ Services" <${gmailUser}>`,
            to: gmailUser,

            subject:
                `New Commission ${orderId} — ${customer}`,

            text: `
NEW WZ SERVICES COMMISSION

Order ID:
${orderId}

Customer:
${customer}

Email:
${email}

Service:
${service}

Package:
${packageId || "Custom Quote"}

Budget:
${budget || "Not provided"}

Payment Method:
${payment || "Not provided"}

Discount:
${discount || "None"}

Description:
${description}

Submitted:
${submittedAt}
            `.trim(),

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 650px;
                    margin: auto;
                    padding: 30px;
                    background: #ffffff;
                    color: #111111;
                    border: 1px solid #e5e5e5;
                    border-radius: 16px;
                ">

                    <h1>
                        New Commission
                    </h1>

                    <p>
                        A new WZ Services commission has been submitted.
                    </p>

                    <div style="
                        background: #f5f5f5;
                        padding: 18px;
                        border-radius: 12px;
                        margin: 20px 0;
                    ">

                        <p>
                            <strong>Order ID:</strong>
                            ${escapeHtml(orderId)}
                        </p>

                        <p>
                            <strong>Customer:</strong>
                            ${escapeHtml(customer)}
                        </p>

                        <p>
                            <strong>Email:</strong>
                            ${escapeHtml(email)}
                        </p>

                        <p>
                            <strong>Service:</strong>
                            ${escapeHtml(service)}
                        </p>

                        <p>
                            <strong>Package:</strong>
                            ${escapeHtml(packageId || "Custom Quote")}
                        </p>

                        <p>
                            <strong>Budget:</strong>
                            ${escapeHtml(budget || "Not provided")}
                        </p>

                        <p>
                            <strong>Payment:</strong>
                            ${escapeHtml(payment || "Not provided")}
                        </p>

                        <p>
                            <strong>Discount:</strong>
                            ${escapeHtml(discount || "None")}
                        </p>

                    </div>

                    <h2>
                        Description
                    </h2>

                    <div style="
                        background: #f5f5f5;
                        padding: 18px;
                        border-radius: 12px;
                        white-space: pre-wrap;
                    ">
                        ${escapeHtml(description)}
                    </div>

                    <p style="
                        color: #888;
                        font-size: 13px;
                        margin-top: 25px;
                    ">
                        Submitted ${escapeHtml(submittedAt)}
                    </p>

                </div>
            `
        };

        // =========================================================
        // CONFIRMATION EMAIL TO CUSTOMER
        // =========================================================

        const customerEmail = {
            from: `"WZ Services" <${gmailUser}>`,
            to: email,

            subject:
                `Commission Received — ${orderId}`,

            text: `
Hi ${customer},

We've received your WZ Services commission request.

Order ID:
${orderId}

Service:
${service}

Package:
${packageId || "Custom Quote"}

Budget:
${budget || "Not provided"}

Payment Method:
${payment || "Not provided"}

We'll review your request and contact you with the next steps.

Thank you for choosing WZ Services!
            `.trim(),

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 650px;
                    margin: auto;
                    padding: 30px;
                    background: #ffffff;
                    color: #111111;
                    border: 1px solid #e5e5e5;
                    border-radius: 16px;
                ">

                    <h1>
                        Commission Received
                    </h1>

                    <p>
                        Hi <strong>${escapeHtml(customer)}</strong>,
                    </p>

                    <p>
                        We've successfully received your
                        WZ Services commission request.
                    </p>

                    <div style="
                        background: #f5f5f5;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 25px 0;
                    ">

                        <p>
                            <strong>Order ID:</strong>
                            ${escapeHtml(orderId)}
                        </p>

                        <p>
                            <strong>Service:</strong>
                            ${escapeHtml(service)}
                        </p>

                        <p>
                            <strong>Package:</strong>
                            ${escapeHtml(packageId || "Custom Quote")}
                        </p>

                        <p>
                            <strong>Budget:</strong>
                            ${escapeHtml(budget || "Not provided")}
                        </p>

                        <p>
                            <strong>Payment Method:</strong>
                            ${escapeHtml(payment || "Not provided")}
                        </p>

                    </div>

                    <p>
                        We'll review your request and contact you
                        with the next steps.
                    </p>

                    <p>
                        Thank you for choosing
                        <strong>WZ Services</strong>!
                    </p>

                    <hr style="
                        border: none;
                        border-top: 1px solid #eeeeee;
                        margin: 30px 0;
                    ">

                    <p style="
                        color: #888;
                        font-size: 13px;
                    ">
                        This is an automated confirmation email.
                    </p>

                </div>
            `
        };

        // =========================================================
        // SEND EMAILS
        // =========================================================

        await transporter.sendMail(ownerEmail);

        await transporter.sendMail(customerEmail);

        // =========================================================
        // SUCCESS
        // =========================================================

        return response.status(200).json({
            success: true,
            message:
                "Commission received. Discord and email notifications sent.",
            orderId
        });

    } catch (error) {

        console.error(
            "Commission API error:",
            error
        );

        if (error?.name === "AbortError") {
            return response.status(504).json({
                success: false,
                error: "Discord webhook request timed out."
            });
        }

        return response.status(500).json({
            success: false,
            error: "Internal server error."
        });
    }
}


/*
 * =========================================================
 * HTML ESCAPE
 * =========================================================
 *
 * Prevents customer-submitted text from being interpreted
 * as HTML inside the emails.
 */

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
