
const RULE_ID = 1;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addRefererRule') {
        const { targetUrl, refererUrl } = request.data;

        const newRule = {
            id: RULE_ID,
            priority: 1,
            action: {
                type: 'modifyHeaders',
                requestHeaders: [{
                    header: 'Referer',
                    operation: 'set',
                    value: refererUrl,
                }],
            },
            condition: {
                urlFilter: targetUrl,
                resourceTypes: ['xmlhttprequest'],
            },
        };

        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID],
            addRules: [newRule],
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error adding rule:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('Referer rule added successfully.');
                sendResponse({ success: true });
            }
        });
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === 'removeRefererRule') {
        chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [RULE_ID]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('Error removing rule:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else {
                console.log('Referer rule removed successfully.');
                sendResponse({ success: true });
            }
        });
        return true; // Indicates that the response is sent asynchronously
    } else if (request.action === 'sendFeishuWebhook') {
        const { webhookUrl, msg } = request.data;
        
        if (!webhookUrl) {
            sendResponse({ success: false, error: 'WEBHOOK_URL未设置' });
            return;
        }

        const payload = {
            msg_type: 'text',
            content: {
                text: msg
            }
        };

        fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(json => {
            console.log('Feishu webhook结果:', json);
            sendResponse({ success: true, data: json });
        })
        .catch(err => {
            console.error('Feishu webhook错误:', err);
            sendResponse({ success: false, error: err.message });
        });

        return true; // Indicates that the response is sent asynchronously
    }
});
