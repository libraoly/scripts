const require_sleep = require("./sleep-DoAkpd7Z.cjs");
let consola = require("consola");
consola = require_sleep.__toESM(consola, 1);
const COMMON_FORM = {
	method: "BuildRequest",
	propertyKey: "changye",
	redirect: "QueyThreeTableBalance",
	areaId: "3287eecc-7fe5-468c-a2db-ec98aeaefb04"
};
const HEADERS = {
	Accept: "application/json, text/plain, */*",
	"Accept-Language": "en-US,en;q=0.9",
	Origin: "http://system.es-it.cn",
	"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.62"
};
const TableName = {
	electricity: "electricity",
	water: "water"
};
//#endregion
//#region src/tasks/balance/api.ts
/**
* 查询余额（带自动重试与指数退避）
*
* @param options 查询参数及配置
* @returns 余额字符串或 null
*/
async function fetchBalance(options) {
	const { carno, timeout = 60, retries = 3, backoff = 5, commonForm = COMMON_FORM, headers = HEADERS, client = require_sleep.httpClient, kyOptions } = options;
	const { tableId, tableName: tableNameRaw } = options;
	const tableName = typeof tableNameRaw === "object" && tableNameRaw !== null && "value" in tableNameRaw ? String(tableNameRaw.value) : String(tableNameRaw ?? "");
	if (!carno) throw new Error("[fetchBalance] Missing required parameter: \"carno\"");
	if (!tableId) throw new Error("[fetchBalance] Missing required parameter: \"tableId\"");
	if (!tableName) throw new Error("[fetchBalance] Missing required parameter: \"tableName\"");
	const targetUrl = options.baseUrl ?? "http://system.es-it.cn/WebSolution/EasyLife/data.aspx";
	const form = {
		...commonForm,
		carno,
		tableId,
		tableName
	};
	const timeoutMs = timeout < 1e3 ? timeout * 1e3 : timeout;
	let lastError = null;
	for (let attempt = 1; attempt <= retries; attempt++) try {
		const raw = await client.postForm(targetUrl, form, {
			headers,
			timeout: timeoutMs,
			...kyOptions
		});
		if (raw && typeof raw === "object" && "body" in raw && raw.body && "data" in raw.body && raw.body.data) return raw.body.data.balance ?? null;
		return null;
	} catch (error) {
		lastError = error;
		if (attempt >= retries) throw error;
		const delayMs = Math.max(0, backoff ** attempt * 1e3);
		if (delayMs > 0) await require_sleep.sleep(delayMs);
	}
	if (lastError) throw lastError;
	return null;
}
//#endregion
//#region src/tasks/balance/electricity.ts
/**
* 查询电费余额
*
* @param options 可选覆盖配置
* @returns 余额字符串或 null
*/
async function getElectricityBalance(options) {
	return fetchBalance({
		carno: options?.carno ?? require_sleep.useEnv("ELECTRICITY_CARNO"),
		tableId: options?.tableId ?? require_sleep.useEnv("ELECTRICITY_TABLE_ID"),
		tableName: TableName.electricity,
		timeout: 120,
		retries: 10,
		backoff: 30,
		...options
	});
}
//#endregion
//#region src/tasks/balance/water.ts
/**
* 查询水费余额
*
* @param options 可选覆盖配置
* @returns 余额字符串或 null
*/
async function getWaterBalance(options) {
	return fetchBalance({
		carno: options?.carno ?? require_sleep.useEnv("WATER_CARNO"),
		tableId: options?.tableId ?? require_sleep.useEnv("WATER_TABLE_ID"),
		tableName: TableName.water,
		timeout: 120,
		retries: 5,
		...options
	});
}
//#endregion
//#region src/tasks/balance/index.ts
const logger = consola.default.withTag("Balance");
/**
* 执行余额查询任务（可同时查询电费和水费，并支持 Bark / Gotify 等渠道通知与日志输出）
*
* @param options 运行配置选项
* @returns 查询结果
*/
async function runBalanceCheck(options = {}) {
	const { electricity: checkElectricity = true, water: checkWater = true, bark = false, gotify = false, notifyTitle = "水电费余额通知", notifyMessage } = options;
	const shouldSendBark = Boolean(bark);
	const shouldSendGotify = Boolean(gotify);
	let electricityBalance = null;
	let waterBalance = null;
	let success = true;
	const errors = {};
	if (checkElectricity) try {
		electricityBalance = await getElectricityBalance(typeof checkElectricity === "object" ? checkElectricity : void 0);
		logger.info(`电费余额: ${electricityBalance ?? "无数据"} 元`);
	} catch (error) {
		success = false;
		errors.electricity = error;
		logger.error("查询电费余额失败:", error);
	}
	if (checkWater) try {
		waterBalance = await getWaterBalance(typeof checkWater === "object" ? checkWater : void 0);
		logger.info(`水费余额: ${waterBalance ?? "无数据"} 元`);
	} catch (error) {
		success = false;
		errors.water = error;
		logger.error("查询水费余额失败:", error);
	}
	if (shouldSendBark) try {
		const lines = [];
		if (checkElectricity) lines.push(`⚡ 电费余额: ${electricityBalance ?? "查询失败"} 元`);
		if (checkWater) lines.push(`💧 水费余额: ${waterBalance ?? "查询失败"} 元`);
		const body = notifyMessage ?? lines.join("\n");
		const barkOpt = typeof bark === "object" && bark !== null ? bark : void 0;
		const barkPayload = {
			title: notifyTitle,
			body,
			...barkOpt?.group ? { group: barkOpt.group } : {},
			...barkOpt?.icon ? { icon: barkOpt.icon } : {},
			...barkOpt?.url ? { url: barkOpt.url } : {},
			...barkOpt?.level ? { level: barkOpt.level } : {},
			...barkOpt?.sound ? { sound: barkOpt.sound } : {},
			...barkOpt?.badge !== void 0 ? { badge: barkOpt.badge } : {}
		};
		if (barkOpt) await require_sleep.sendToBark(barkPayload, barkOpt);
		else await require_sleep.sendToBark(barkPayload);
		logger.success("Bark 通知发送成功");
	} catch (error) {
		errors.notify = error;
		errors.notifyBark = error;
		logger.warn("发送 Bark 通知失败:", error);
	}
	if (shouldSendGotify) try {
		const lines = [];
		if (checkElectricity) lines.push(`⚡ **电费余额**: ${electricityBalance ?? "查询失败"} 元`);
		if (checkWater) lines.push(`💧 **水费余额**: ${waterBalance ?? "查询失败"} 元`);
		const message = notifyMessage ?? lines.join("\n");
		const gotifyOpt = typeof gotify === "object" && gotify !== null ? gotify : void 0;
		const priority = typeof gotifyOpt?.priority === "number" ? gotifyOpt.priority : void 0;
		const gotifyPayload = {
			title: notifyTitle,
			message,
			...priority !== void 0 ? { priority } : {},
			extras: { "client::display": { contentType: "text/markdown" } }
		};
		if (gotifyOpt) await require_sleep.sendToGotify(gotifyPayload, gotifyOpt);
		else await require_sleep.sendToGotify(gotifyPayload);
		logger.success("Gotify 通知发送成功");
	} catch (error) {
		errors.notifyGotify = error;
		if (!errors.notify) errors.notify = error;
		logger.warn("发送 Gotify 通知失败:", error);
	}
	return {
		timestamp: Date.now(),
		success,
		...checkElectricity ? { electricity: electricityBalance } : {},
		...checkWater ? { water: waterBalance } : {},
		...Object.keys(errors).length > 0 ? { errors } : {}
	};
}
//#endregion
Object.defineProperty(exports, "getElectricityBalance", {
	enumerable: true,
	get: function() {
		return getElectricityBalance;
	}
});
Object.defineProperty(exports, "getWaterBalance", {
	enumerable: true,
	get: function() {
		return getWaterBalance;
	}
});
Object.defineProperty(exports, "runBalanceCheck", {
	enumerable: true,
	get: function() {
		return runBalanceCheck;
	}
});
