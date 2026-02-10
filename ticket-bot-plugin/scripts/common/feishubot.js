async function sendFeiShuMsg(webhookUrl,msg) {
    if (!webhookUrl) {
        console.log("WEBHOOK_URL未设置");
        return;
    }

    // Use background script to bypass CORS restrictions
    chrome.runtime.sendMessage({
        action: 'sendFeishuWebhook',
        data: {
            webhookUrl: webhookUrl,
            msg: msg
        }
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('发送消息错误:', chrome.runtime.lastError);
        } else if (response && response.success) {
            console.log('结果:', response.data);
        } else if (response && !response.success) {
            console.error('错误:', response.error);
        }
    });
}