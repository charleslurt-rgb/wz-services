/*

WZ SERVICES
Frontend application

*/

/* =========================================
CONFIGURATION
========================================= */

const WZ_CONFIG = {

/* TODO: Replace with your Discord invite */
discordInvite:
    "https://discord.gg/FYqjJuFSeS",

/* Launch promotion */
launchDiscountPercent: 30,

/*
   Starter discount code.

   IMPORTANT:
   This frontend value is only for display.

   Real discount validation should happen
   inside api/commission.js when deployed.
*/
launchDiscountCode:
    "WZLAUNCH30"

};

/* =========================================
PRICING
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
ELEMENTS
========================================= */

const serviceSelect =
document.getElementById("service");

const packageSelect =
document.getElementById("package");

const pricePreview =
document.getElementById("pricePreview");

const discountPreview =
document.getElementById("discountPreview");

const discountInput =
document.getElementById("discount");

const discountMessage =
document.getElementById("discountMessage");

const applyDiscountButton =
document.getElementById("applyDiscount");

const commissionForm =
document.getElementById("commissionForm");

const formStatus =
document.getElementById("formStatus");

const selectedPrice =
document.getElementById("selectedPrice");

const selectedDiscount =
document.getElementById("selectedDiscount");

/* =========================================
PACKAGE OPTIONS
========================================= */

const packageOptions = {

discordServer: [
    ["starter", "Starter"],
    ["professional", "Professional"],
    ["complete", "Complete"]
],

customBot: [
    ["basic", "Basic Bot"],
    ["advanced", "Advanced Bot"],
    ["professional", "Professional Bot"]
],

branding: [
    ["basic", "Basic Logo"],
    ["custom", "Custom Logo"],
    ["premium", "Premium Branding"]
],

customQuote: [
    ["custom", "Custom Quote"]
]

};

/* =========================================
FORMAT PRICE
========================================= */

function formatPrice(service, packageId) {

const item =
    PRICING[service]?.[packageId];

if (!item) {
    return null;
}


if (item.usdMin !== undefined) {

    return {
        text:
            `$${item.usdMin.toFixed(2)}–$${item.usdMax.toFixed(2)}`,

        ltc:
            `≈ ${item.ltcMin.toFixed(3)}–${item.ltcMax.toFixed(3)} LTC`,

        value:
            item.usdMin
    };

}


return {
    text:
        `$${item.usd.toFixed(2)}`,

    ltc:
        `≈ ${item.ltc.toFixed(3)} LTC`,

    value:
        item.usd
};

}

/* =========================================
UPDATE PACKAGES
========================================= */

function updatePackages() {

if (!serviceSelect || !packageSelect) {
    return;
}

const service =
    serviceSelect.value;

packageSelect.innerHTML =
    `<option value="">Select a package</option>`;


if (!service) {
    updatePrice();
    return;
}


const options =
    packageOptions[service] || [];


options.forEach(([value, label]) => {

    const option =
        document.createElement("option");

    option.value = value;
    option.textContent = label;

    packageSelect.appendChild(option);

});


updatePrice();

}

/* =========================================
UPDATE PRICE
========================================= */

function updatePrice() {

if (!serviceSelect || !packageSelect) {
    return;
}

const service =
    serviceSelect.value;

const packageId =
    packageSelect.value;


if (
    !service ||
    !packageId ||
    service === "customQuote"
) {

    pricePreview.textContent =
        service === "customQuote"
            ? "Custom quote"
            : "Select a package";

    discountPreview.textContent =
        service === "customQuote"
            ? "We'll provide a custom price."
            : "No discount applied";

    selectedPrice.value = "";

    return;
}


const price =
    formatPrice(service, packageId);


if (!price) {
    pricePreview.textContent =
        "Price unavailable";
    return;
}


pricePreview.textContent =
    `${price.text}  ${price.ltc}`;

selectedPrice.value =
    price.value.toFixed(2);


discountPreview.textContent =
    "No discount applied";


/*
   Reset displayed discount when
   package changes.
*/

discountMessage.textContent = "";
selectedDiscount.value = "";

}

/* =========================================
DISCOUNT
========================================= */

function applyDiscount() {

const code =
    discountInput.value
        .trim()
        .toUpperCase();


const service =
    serviceSelect.value;

const packageId =
    packageSelect.value;


if (!code) {

    discountMessage.textContent =
        "Enter a discount code.";

    return;
}


if (!service || !packageId) {

    discountMessage.textContent =
        "Select a service and package first.";

    return;
}


if (
    code !==
    WZ_CONFIG.launchDiscountCode
) {

    discountMessage.textContent =
        "Invalid discount code.";

    selectedDiscount.value = "";

    return;
}


if (service === "customQuote") {

    discountMessage.textContent =
        "Discount codes cannot be applied to custom quotes.";

    return;
}


const price =
    formatPrice(service, packageId);


if (!price) {
    return;
}


const discount =
    price.value *
    (WZ_CONFIG.launchDiscountPercent / 100);


const total =
    price.value - discount;


pricePreview.textContent =
    `$${total.toFixed(2)} after discount`;


discountPreview.textContent =
    `${WZ_CONFIG.launchDiscountPercent}% OFF • Save $${discount.toFixed(2)}`;


discountMessage.textContent =
    "Discount applied.";


selectedDiscount.value =
    code;

}

/* =========================================
QUICK ORDER BUTTONS
========================================= */

document
.querySelectorAll(".order-button")
.forEach(button => {

    button.addEventListener("click", () => {

        const service =
            button.dataset.service;

        const packageId =
            button.dataset.package;


        serviceSelect.value =
            service;

        updatePackages();

        packageSelect.value =
            packageId;

        updatePrice();


        document
            .getElementById("order")
            .scrollIntoView({
                behavior: "smooth"
            });

    });

});

/* =========================================
CUSTOM QUOTE
========================================= */

const customQuoteButton =
document.getElementById(
"customQuoteButton"
);

if (customQuoteButton) {

customQuoteButton.addEventListener(
    "click",
    () => {

        serviceSelect.value =
            "customQuote";

        updatePackages();

        packageSelect.value =
            "custom";

        updatePrice();

        document
            .getElementById("order")
            .scrollIntoView({
                behavior: "smooth"
            });

    }
);

}

/* =========================================
SELECT EVENTS
========================================= */

if (serviceSelect) {

serviceSelect.addEventListener(
    "change",
    updatePackages
);

}

if (packageSelect) {

packageSelect.addEventListener(
    "change",
    updatePrice
);

}

if (applyDiscountButton) {

applyDiscountButton.addEventListener(
    "click",
    applyDiscount
);

}

/* =========================================
COMMISSION SUBMISSION
========================================= */

if (commissionForm) {

commissionForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const button =
            commissionForm.querySelector(
                "button[type='submit']"
            );


        const originalText =
            button.textContent;


        const order = {

            customer:
                document
                    .getElementById("customer")
                    .value
                    .trim(),

            email:
                document
                    .getElementById("email")
                    .value
                    .trim(),

            service:
                serviceSelect.value,

            package:
                packageSelect.value,

            description:
                document
                    .getElementById("description")
                    .value
                    .trim(),

            budget:
                document
                    .getElementById("budget")
                    .value
                    .trim(),

            payment:
                document
                    .getElementById("payment")
                    .value,

            discount:
                discountInput.value
                    .trim()
                    .toUpperCase()
        };


        button.disabled = true;
        button.textContent =
            "Sending commission...";


        showStatus(
            "Sending your commission...",
            false
        );


        try {

            const response =
                await fetch(
                    "/api/commission",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(order)
                    }
                );


            const result =
                await response.json();


            if (
                !response.ok ||
                !result.success
            ) {

                throw new Error(
                    result.error ||
                    "Commission submission failed."
                );

            }


            showStatus(
                "Commission received! We'll review it and contact you soon.",
                false
            );


            commissionForm.reset();

            packageSelect.innerHTML =
                `<option value="">Select a package</option>`;

            pricePreview.textContent =
                "Select a package";

            discountPreview.textContent =
                "No discount applied";

            discountMessage.textContent =
                "";

        }


        catch (error) {

            console.error(error);

            showStatus(
                "We couldn't submit your commission. Please try again or contact us through Discord.",
                true
            );

        }


        finally {

            button.disabled = false;

            button.textContent =
                originalText;

        }

    }
);

}

/* =========================================
STATUS MESSAGE
========================================= */

function showStatus(message, error) {

if (!formStatus) {
    return;
}

formStatus.hidden = false;

formStatus.textContent =
    message;

formStatus.style.color =
    error
        ? "#ff8f8f"
        : "#ffffff";

}

/* =========================================
BACK TO TOP
========================================= */

const backToTop =
document.getElementById(
"backToTop"
);

window.addEventListener(
"scroll",
() => {

    if (
        window.scrollY > 500
    ) {

        backToTop.classList.add(
            "show"
        );

    } else {

        backToTop.classList.remove(
            "show"
        );

    }

}

);

if (backToTop) {

backToTop.addEventListener(
    "click",
    () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);

}

/* =========================================
INITIALIZE
========================================= */

updatePackages();