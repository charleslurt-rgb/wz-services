export default async function handler(request, response) {
    // Only allow POST
    if (request.method !== "POST") {
        return response.status(405).json({
            success: false,
            error: "Method Not Allowed"
        });
    }

    try {
        const webhook = process.env.DISCORD_WEBHOOK_URL;

        if (!webhook) {
            return response.status(500).json({
                success: false,
                error: "Discord webhook is not configured on the server."
            });
        }

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

        const orderId = `WZ-${Date.now().toString(36).toUpperCase()}`;

        const embed = {
            title: "New WZ Services Commission",
            description: description.slice(0, 4000),
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

        // Give Discord a maximum of 10 seconds to respond.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

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

        return response.status(200).json({
            success: true,
            message: "Commission received.",
            orderId
        });

    } catch (error) {
        console.error("Commission API error:", error);

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
