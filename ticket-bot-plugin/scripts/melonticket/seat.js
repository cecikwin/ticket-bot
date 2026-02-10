window.isSuccess = false; // 是否成功

// 选座范围配置：
// 只在前几排 / 后几排中选择可用座位
const TARGET_FROM = 'front';     // 'front' = 靠舞台最近的几排，'back' = 最远的几排

async function sleep(t) {
    return await new Promise(resolve => setTimeout(resolve, t));
}

function theFrame() {
    if (window._theFrameInstance == null) {
      window._theFrameInstance = document.getElementById('oneStopFrame').contentWindow;
    }
  
    return window._theFrameInstance;
}

function getConcertId() {
    return document.getElementById("prodId").value;
}

function openRangeList() {
    if (window.isSuccess) {
        return;
    }
    let frame = theFrame();
    // 查找 class 包含 seat_name 但不包含 open 的元素
    let sectionToOpen = frame.document.querySelector(".seat_name:not(.open)");

    // 如果找到了，就点击它
    if (sectionToOpen) {
        sectionToOpen.click();
    }
    return;
}

function clickOnArea(area) {
    let frame = theFrame();
    let section = frame.document.getElementsByClassName("area_tit");
    for (let i = 0; i < section.length; i++) {
        let reg = new RegExp(area + "\$","g");
        if (section[i].innerHTML.match(reg)) {
            section[i].parentElement.click();
            return;
        }
    }
}

async function findSeat() {
    let frame = theFrame();
    let canvas = frame.document.getElementById("ez_canvas");
    if (!canvas) {
        return false;
    }
    let seatNodeList = canvas.getElementsByTagName("rect");
    await sleep(750);

    const rects = Array.from(seatNodeList);

    // 1. 根据 y 坐标分排：收集所有 rect 的 y 值，去重并排序
    const rowYs = Array.from(
        new Set(
            rects
                .map(r => parseFloat(r.getAttribute("y")))
                .filter(y => !isNaN(y))
        )
    ).sort((a, b) => a - b);

    if (rowYs.length === 0) {
        return false;
    }

    // 获取配置的排数，如果没有配置则使用默认值 4
    let concertId = getConcertId();
    let data = await get_stored_value(concertId);
    const TARGET_ROW_COUNT = data && data["target-row-count"] ? parseInt(data["target-row-count"]) : 4;

    // 2. 选出目标几排（前 TARGET_ROW_COUNT 排 / 后 TARGET_ROW_COUNT 排）
    let targetRows;
    if (TARGET_FROM === 'front') {
        targetRows = rowYs.slice(0, TARGET_ROW_COUNT);
    } else {
        targetRows = rowYs.slice(-TARGET_ROW_COUNT);
    }

    // 判断某个 rect 是否在目标排内（给一点容差避免小数误差）
    const isInTargetRows = (rect) => {
        const y = parseFloat(rect.getAttribute("y"));
        return targetRows.some(rowY => Math.abs(rowY - y) < 0.5);
    };

    // 3. 只在目标排内寻找颜色合适的座位
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const fillColor = rect.getAttribute("fill");

        // 不在目标排，跳过
        if (!isInTargetRows(rect)) {
            continue;
        }

        // 在目标排并且颜色不是 #DDDDDD / none，才会点击
        if (fillColor !== "#DDDDDD" && fillColor !== "none") {
            console.log("Rect with different fill color found in target rows:", rect);
            const clickEvent = new Event('click', { bubbles: true });

            rect.dispatchEvent(clickEvent);
            frame.document.getElementById("nextTicketSelection").click();
            return true;
        }
    }

    return false;
}

async function checkCaptchaFinish() {
    if (document.getElementById("certification").style.display != "none") {
        await sleep(1000);
        checkCaptchaFinish();
        return;
    }
    let frame = theFrame();
    await sleep(500);
    frame.document.getElementById("nextTicketSelection").click();
    return;
}

async function searchSeat(data) {
    for (sec of data.section) {
        openRangeList();
        clickOnArea(sec);
        if (await findSeat()) {
            checkCaptchaFinish();
            return;
        }
        await sleep(750 + Math.random() * 500);
    }
    await searchSeat(data);
}

async function waitForVerifyCaptchaClose() {
    console.log("waitForVerifyCaptchaClose");
    console.log(window.document.getElementById("certification").style.display);
    if (window.document.getElementById("certification").style.display == "none") {
        return;
    }
    await sleep(1000);
    await waitForVerifyCaptchaClose();
}

async function waitFirstLoad() {
    let concertId = getConcertId();
    let data = await get_stored_value(concertId);
    let feishuBotId = data["feishu-bot-id"];
    console.log("feishuBotId:", feishuBotId);
    if (!data) {
        return;
    }
    await sleep(5000);
    await waitForVerifyCaptchaClose();
    openRangeList();
    await sleep(1000);
    await searchSeat(data);
    sendFeiShuMsg(feishuBotId, `[${new Date().toLocaleString()}]抢票成功`);
}


waitFirstLoad();