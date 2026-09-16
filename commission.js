/*

WZ SERVICES
Vercel Commission API

IMPORTANT:

Do NOT put your Discord webhook URL in this file.

When you deploy to Vercel, create an environment
variable named:

DISCORD_WEBHOOK_URL

Example:

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

The webhook stays on the server instead of being
exposed to website visitors.
*/

/* =========================================
SERVER-SIDE PRICING
========================================= */

const PRICING = {

discordServer: {

    starter: {
        name: "Starter",
        usd: 0.70,
        ltc: 0.020
    },

    professional: {
        name: "Professional",
        usd: 3.50,
        ltc: 0.065
    },

    complete: {
        name: "Complete",
        usd: 7.00,
        ltc: 0.130
    }

},


customBot: {

    basic: {
        name: "Basic Bot",
        usdMin: 0.70,
        usdMax: 3.50,
        ltcMin: 0.020,
        ltcMax: 0.065
    },

    advanced: {
        name: "Advanced Bot",
        usd: 4.90,
        ltc: 0.091
    },

    professional: {
        name: "Professional Bot",
        usd: 8.40,
        ltc: 0.156
    }

},


branding: {

    basic: {
        name: "Basic Logo",
        usd: 2.00,
        ltc: 0.037
    },

    custom: {
        name: "Custom Logo",
        usd: 5.00,
        ltc: 0.093
    },

    premium: {
        name: "Premium Branding",
        usd: 10.00,
        ltc: 0.186
    }

}

};

/* =========================================
DISCOUNT CODES
========================================= */

const DISCOUNTS = {

WZLAUNCH30: {
    type: "percent",
    value: 30,

    /*
       NOTE:

       A real "first 20 customers" limit
       requires persistent storage.

       This starter version does NOT attempt
       to count redemptions.
    */

    maxUses: 20
}

};

/* =========================================
HELPERS
========================================= */

function jsonResponse(data, status = 200) {

return new Response(
    JSON.stringify(data),
    {
        status,

        headers: {
            "Content-Type":
                "application/json"
        }
    }
);

}

function isValidEmail(email) {

return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}

function getPricing(service, packageId) {

return (
    PRICING[service] &&
    PRICING[service][packageId]
);

}

/* =========================================
API
========================================= */

export default async function handler(request) {

if (request.method !== "POST") {

    return jsonResponse(
        {
            success: false,
            error: "Method not allowed."
        },
        405
    );

}


try {

    const body =
        await request.json();


    const customer =
        String(body.customer || "")
            .trim();

    const email =
        String(body.email || "")
            .trim();

    const service =
        String(body.service || "")
            .trim();

    const packageId =
        String(body.package || "")
            .trim();

    const description =
        String(body.description || "")
            .trim();

    const budget =
        String(body.budget || "")
            .trim();

    const payment =
        String(body.payment || "")
            .trim();

    const discountCode =
        String(body.discount || "")
            .trim()
            .toUpperCase();


    /* =====================================
       BASIC VALIDATION
    ===================================== */

    if (!customer) {

        return jsonResponse(
            {
                success: false,
                error: "Customer name is required."
            },
            400
        );

    }


    if (
        !email ||
        !isValidEmail(email)
    ) {

        return jsonResponse(
            {
                success: false,
                error: "A valid email is required."
            },
            400
        );

    }


    if (!service) {

        return jsonResponse(
            {
                success: false,
                error: "Service is required."
            },
            400
        );

    }


    if (!description) {

        return jsonResponse(
            {
                success: false,
                error: "Project description is required."
            },
            400
        );

    }


    /* =====================================
       CUSTOM QUOTE
    ===================================== */

    if (service === "customQuote") {

        const webhook =
            process.env.DISCORD_WEBHOOK_URL;


        if (!webhook) {

            return jsonResponse(
                {
                    success: false,
                    error:
                        "Discord webhook is not configured."
                },
                500
            );

        }


        const quotePayload = {

            username: "WZ Services",

            embeds: [
                {
                    title:
                        "📋 CUSTOM QUOTE REQUEST",

                    color: 0xffffff,

                    fields: [

                        {
                            name: "👤 Customer",
                            value:
                                customer
                        },

                        {
                            name: "📧 Email",
                            value:
                                email
                        },

                        {
                            name: "🛠️ Request",
                            value:
                                description
                        },

                        {
                            name: "💰 Budget",
                            value:
                                budget ||
                                "Not provided"
                        },

                        {
                            name: "💳 Payment Method",
                            value:
                                payment ||
                                "Not provided"
                        }

                    ],

                    footer: {
                        text:
                            "WZ Services"
                    },

                    timestamp:
                        new Date().toISOString()
                }
            ]

        };


        const discordResponse =
            await fetch(
                webhook,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            quotePayload
                        )
                }
            );


        if (
            !discordResponse.ok
        ) {

            throw new Error(
                "Discord webhook failed."
            );

        }


        return jsonResponse({
            success: true,
            type: "custom_quote"
        });

    }


    /* =====================================
       FIXED PRICE SERVICE
    ===================================== */

    const item =
        getPricing(
            service,
            packageId
        );


    if (!item) {

        return jsonResponse(
            {
                success: false,
                error:
                    "Invalid service or package."
            },
            400
        );

    }


    /*
       Basic Bot is a price range and therefore
       requires manual pricing.
    */

    let baseUsd =
        item.usd;

    let baseLtc =
        item.ltc;

    let priceText;


    if (
        item.usdMin !== undefined
    ) {

        priceText =
            `$${item.usdMin.toFixed(2)}–$${item.usdMax.toFixed(2)} ` +
            `(manual final price)`;

    } else {

        priceText =
            `$${baseUsd.toFixed(2)}`;

    }


    /* =====================================
       DISCOUNT
    ===================================== */

    let discountAmount = 0;
    let discountPercent = 0;


    if (discountCode) {

        const discount =
            DISCOUNTS[discountCode];


        if (!discount) {

            return jsonResponse(
                {
                    success: false,
                    error:
                        "Invalid discount code."
                },
                400
            );

        }


        if (
            item.usdMin !== undefined
        ) {

            return jsonResponse(
                {
                    success: false,
                    error:
                        "Discounts cannot be automatically applied to price-range packages."
                },
                400
            );

        }


        if (
            discount.type ===
            "percent"
        ) {

            discountPercent =
                discount.value;

            discountAmount =
                baseUsd *
                (
                    discount.value /
                    100
                );

        }

    }


    const finalUsd =
        baseUsd -
        discountAmount;


    /* =====================================
       DISCORD WEBHOOK
    ===================================== */

    const webhook =
        process.env.DISCORD_WEBHOOK_URL;


    if (!webhook) {

        return jsonResponse(
            {
                success: false,
                error:
                    "Discord webhook is not configured on the server."
            },
            500
        );

    }


    const orderId =
        `WZ-${Date.now().toString(36).toUpperCase()}`;


    const embed = {

        title:
            "📋 COMMISSION ORDER",

        color:
            0xffffff,

        fields: [

            {
                name: "👤 Customer",
                value:
                    customer
            },

            {
                name: "📧 Email",
                value:
                    email
            },

            {
                name: "🛠️ Service",
                value:
                    item.name
            },

            {
                name: "📦 Package",
                value:
                    item.name
            },

            {
                name: "💡 Project Description",
                value:
                    description
            },

            {
                name: "💰 Budget",
                value:
                    budget ||
                    "Not provided"
            },

            {
                name: "💳 Payment Method",
                value:
                    payment ||
                    "Not provided"
            },

            {
                name: "💵 Base Price",
                value:
                    priceText
            },

            {
                name: "🏷️ Discount",
                value:
                    discountPercent
                        ? `${discountPercent}% OFF (${discountCode})`
                        : "None"
            },

            {
                name: "💰 Current Total",
                value:
                    item.usdMin !== undefined
                        ? "Manual quote required"
                        : `$${finalUsd.toFixed(2)}`
            },

            {
                name: "🆔 Order ID",
                value:
                    orderId
            }

        ],

        description:
            "Please provide:\n" +
            "• Final price\n" +
            "• Estimated delivery time\n" +
            "• Payment instructions",

        footer: {
            text:
                "WZ Services • https://discord.gg/FYqjJuFSeS"
        },

        timestamp:
            new Date().toISOString()

    };


    const discordResponse =
        await fetch(
            webhook,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        username:
                            "WZ Services",

                        embeds: [
                            embed
                        ]
                    })
            }
        );


    if (
        !discordResponse.ok
    ) {

        throw new Error(
            "Discord webhook request failed."
        );

    }


    /* =====================================
       SUCCESS
    ===================================== */

    return jsonResponse({

        success: true,

        orderId,

        price: {
            usd:
                item.usdMin !== undefined
                    ? null
                    : Number(
                        finalUsd.toFixed(2)
                    ),

            ltc:
                item.usdMin !== undefined
                    ? null
                    : baseLtc
        },

        discount: {
            code:
                discountCode ||
                null,

            percent:
                discountPercent,

            amount:
                Number(
                    discountAmount.toFixed(2)
                )
        }

    });

}


catch (error) {

    console.error(
        "Commission API error:",
        error
    );


    return jsonResponse(
        {
            success: false,
            error:
                "Unable to process commission."
        },
        500
    );

}

}