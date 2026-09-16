import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method Not Allowed"
        });
    }

    try {
        const {
            customer,
            email,
            service,
            package: packageId,
            description,
            budget,
            payment,
            discount
        } = req.body || {};

        if (!customer || !email || !service || !description) {
            return res.status(400).json({
                success: false,
                error: "Missing required commission information."
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(String(email))) {
            return res.status(400).json({
                success: false,
                error: "Invalid email address."
            });
        }

        const webhook = process.env.DISCORD_WEBHOOK_URL;
        const gmailUser = process.env.GMAIL_USER;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD;

        if (!webhook) {
            return res.status(500).json({
                success: false,
                error: "DISCORD_WEBHOOK_URL is missing."
            });
        }

        if (!gmailUser) {
            return res.status(500).json({
                success: false,
                error: "GMAIL_USER is missing."
            });
        }

        if (!gmailPassword) {
            return res.status(500).json({
                success: false,
                error: "GMAIL_APP_PASSWORD is missing."
            });
        }

        const orderId =
            `WZ-${Date.now().toString(36).toUpperCase()}`;

        /*
         * =====================================================
         * 1. DISCORD WEBHOOK
         * =====================================================
         */

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

            timestamp: new Date().toISOString()
        };

        const discordController = new AbortController();

        const discordTimeout = setTimeout(() => {
            discordController.abort();
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

                signal: discordController.signal
            });
        } finally {
            clearTimeout(discordTimeout);
        }

        if (!discordResponse.ok) {
            const discordError = await discordResponse.text();

            console.error(
                "Discord webhook error:",
                discordResponse.status,
                discordError
            );

            return res.status(502).json({
                success: false,
                error: "Discord webhook rejected the commission."
            });
        }

        /*
         * =====================================================
         * 2. GMAIL CONNECTION
         * =====================================================
         */

        const transporter = nodemailer.createTransport({
            service: "gmail",

            auth: {
                user: gmailUser,
                pass: gmailPassword
            }
        });

        /*
         * =====================================================
         * 3. VERIFY GMAIL
         * =====================================================
         */

        try {
            await transporter.verify();
        } catch (gmailError) {
            console.error(
                "Gmail authentication error:",
                gmailError
            );

            return res.status(500).json({
                success: false,
                error: "Gmail authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD."
            });
        }

        /*
         * =====================================================
         * 4. EMAIL TO YOU
         * =====================================================
         */

        await transporter.sendMail({
            from: `"WZ Services" <${gmailUser}>`,

            to: gmailUser,

            replyTo: email,

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
            `.trim()
        });

        /*
         * =====================================================
         * 5. CONFIRMATION EMAIL TO CUSTOMER
         * =====================================================
         */

        await transporter.sendMail({
            from: `"WZ Services" <${gmailUser}>`,

            to: email,

            subject:
                `Commission Received — ${orderId}`,

            text: `
Hi ${customer},

We've received your WZ Services commission request.

Order ID: ${orderId}

Service: ${service}

Package: ${packageId || "Custom Quote"}

Budget: ${budget || "Not provided"}

Payment Method: ${payment || "Not provided"}

We'll review your request and contact you with the next steps.

Thank you for choosing WZ Services!
            `.trim()
        });

        /*
         * =====================================================
         * 6. SUCCESS
         * =====================================================
         */

        return res.status(200).json({
            success: true,
            message: "Commission received successfully.",
            orderId
        });

    } catch (error) {

        console.error(
            "COMMISSION FUNCTION ERROR:",
            error
        );

        if (error?.name === "AbortError") {
            return res.status(504).json({
                success: false,
                error: "Discord webhook request timed out."
            });
        }

        return res.status(500).json({
            success: false,
            error: error?.message || "Internal server error."
        });
    }
}
