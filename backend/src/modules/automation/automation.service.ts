
import fetch from 'node-fetch';

export const callAutomationWebhook = async (payload: any, type: string) => {
    const url = process.env.AUTOMATION_WEBHOOK_URL;
    if (!url) {
        console.warn("AUTOMATION_WEBHOOK_URL not set. Skipping webhook call.");
        return;
    }

    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: `new_${type}_partner`, data: payload })
        });
    } catch (error) {
        console.error("Failed to call automation webhook:", error);
    }
};

export const simulateHighDemand = async (zone: string) => {
    const url = process.env.AUTOMATION_WEBHOOK_URL;
    if (!url) {
        return { success: false, message: "Automation URL not configured." };
    }

    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "high_demand_alert",
                data: { zone, incentive: 50, timestamp: new Date().toISOString() }
            })
        });
        return { success: true, message: "High demand webhook triggered." };
    } catch (error) {
        console.error("Failed to trigger high demand webhook:", error);
        return { success: false, message: "Failed to trigger automation webhook." };
    }
};
