import consola from "consola";
import ky from "ky";
import { destr } from "destr";
import { env } from "std-env";
//#region src/core/client.ts
/**
* 将对象键值对转换为 URLSearchParams，自动过滤 null 与 undefined
*
* @param data 表单对象或 URLSearchParams 实例
*/
function toURLSearchParams(data) {
	if (data instanceof URLSearchParams) return data;
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(data)) if (value !== void 0 && value !== null) searchParams.append(key, String(value));
	return searchParams;
}
/**
* 在 CJS/ESM 混用编译环境（如 rolldown/tsdown 构建输出）中安全获取 ky 实例
*/
function resolveKy(k) {
	const maybe = k;
	if (typeof maybe?.default?.default?.create === "function") return maybe.default.default;
	if (typeof maybe?.default?.create === "function") return maybe.default;
	return k;
}
/**
* 创建基于 ky 的通用 HTTP 客户端实例
*
* @param options 配置选项
*/
function createHttpClient(options = {}) {
	const { kyInstance, ...kyOptions } = options;
	const kyResolved = resolveKy(ky);
	const instance = kyInstance ?? kyResolved.create({
		retry: {
			limit: 2,
			methods: [
				"get",
				"post",
				"put",
				"delete",
				"patch",
				"head"
			],
			statusCodes: [
				408,
				413,
				429,
				500,
				502,
				503,
				504
			],
			retryOnTimeout: true
		},
		...kyOptions
	});
	return {
		get raw() {
			return instance;
		},
		request(url, reqOptions) {
			return instance(url, reqOptions);
		},
		get(url, reqOptions) {
			return instance.get(url, reqOptions).json();
		},
		post(url, reqOptions) {
			return instance.post(url, reqOptions).json();
		},
		postForm(url, data, reqOptions) {
			const body = toURLSearchParams(data);
			return instance.post(url, {
				...reqOptions,
				body
			}).json();
		},
		put(url, reqOptions) {
			return instance.put(url, reqOptions).json();
		},
		patch(url, reqOptions) {
			return instance.patch(url, reqOptions).json();
		},
		delete(url, reqOptions) {
			return instance.delete(url, reqOptions).json();
		},
		extend(extOptions) {
			return createHttpClient({ kyInstance: instance.extend(extOptions) });
		}
	};
}
/**
* 默认通用 HTTP 客户端实例
*/
const httpClient = createHttpClient();
//#endregion
//#region src/core/env.ts
function useEnv(key, fallback = void 0) {
	const rawValue = env[key];
	if (rawValue === void 0 && fallback === void 0) throw new Error(`[useEnv] Missing required environment variable: "${key}"`);
	if (rawValue === void 0 && fallback !== void 0) return fallback;
	return destr(rawValue);
}
const BARK_DEVICE_KEY_ENV_NAME = "BARK_DEVICE_KEY";
const BARK_DEVICE_KEYS_ENV_NAME = "BARK_DEVICE_KEYS";
/**
* 将入参规整解析为非空字符串 Key 数组
*/
function parseKeys(input) {
	if (!input) return [];
	if (Array.isArray(input)) return input.flatMap((item) => parseKeys(item));
	if (typeof input === "string") return input.split(",").map((k) => k.trim()).filter((k) => k.length > 0);
	return [String(input).trim()].filter((k) => k.length > 0);
}
/**
* 提取所有来源的 Device Keys 并去重
*/
function extractDeviceKeys(payload, options) {
	const explicitKeys = [
		...parseKeys(options?.deviceKeys),
		...parseKeys(options?.deviceKey),
		...parseKeys(payload.device_keys),
		...parseKeys(payload.device_key)
	];
	if (explicitKeys.length > 0) return Array.from(new Set(explicitKeys));
	const envKeys = [...parseKeys(useEnv(BARK_DEVICE_KEYS_ENV_NAME, "")), ...parseKeys(useEnv(BARK_DEVICE_KEY_ENV_NAME, ""))];
	return Array.from(new Set(envKeys));
}
/**
* 规整 Host 基础地址（仅定义 Host，去除末尾斜杠及误传的 /push）
*/
function normalizeHost(base) {
	let host = base.replace(/\/+$/, "");
	if (host.endsWith("/push")) host = host.slice(0, -5).replace(/\/+$/, "");
	try {
		new URL(host);
	} catch {
		throw new Error(`[sendToBark] Invalid base host URL: "${base}"`);
	}
	return host;
}
/**
* 根据 Host 与 Device Key 数量决策最终请求 URL 及 JSON Payload
* - 单个 key: 使用完整 url (例如: https://api.day.app/:device_key)
* - 多个 key: 使用 push 批量推送端点 (例如: https://api.day.app/push)
*/
function resolveEndpoint(base, payload, keys) {
	const host = normalizeHost(base);
	const finalPayload = { ...payload };
	if (keys.length === 0) throw new Error("[sendToBark] Missing device_key. Please provide device_key in payload, options, or BARK_DEVICE_KEY environment variable.");
	if (keys.length === 1) {
		const key = keys[0];
		delete finalPayload.device_key;
		delete finalPayload.device_keys;
		return {
			targetUrl: `${host}/${key}`,
			finalPayload
		};
	}
	delete finalPayload.device_key;
	finalPayload.device_keys = keys;
	return {
		targetUrl: `${host}/push`,
		finalPayload
	};
}
async function sendToBark(payloadOrBody, options) {
	const base = options?.apiBase ?? (useEnv("BARK_API_BASE", "") || "https://api.day.app");
	const defaultGroup = options?.group ?? (useEnv("BARK_GROUP", "") || "Scripts");
	const defaultIcon = options?.icon ?? (useEnv("BARK_ICON", "") || "https://s41.ax1x.com/2026/09/12/pneJPOK.png");
	const rawPayload = typeof payloadOrBody === "string" ? {
		body: payloadOrBody,
		group: defaultGroup,
		icon: defaultIcon
	} : {
		...payloadOrBody,
		group: payloadOrBody.group ?? defaultGroup,
		icon: payloadOrBody.icon ?? defaultIcon
	};
	const { targetUrl, finalPayload } = resolveEndpoint(base, rawPayload, extractDeviceKeys(rawPayload, options));
	const result = await (options?.client ?? httpClient).post(targetUrl, {
		json: finalPayload,
		timeout: options?.timeout,
		...options?.kyOptions
	});
	if (result.code !== 200) throw new Error(`Bark request failed [${result.code}]: ${result.message}`);
	return result;
}
//#endregion
//#region src/core/utils.ts
/**
* 辅助延时函数（毫秒）
*
* @param ms 延时毫秒数
*/
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
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
	const { carno, timeout = 60, retries = 3, backoff = 5, commonForm = COMMON_FORM, headers = HEADERS, client = httpClient, kyOptions } = options;
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
		if (delayMs > 0) await sleep(delayMs);
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
		carno: options?.carno ?? useEnv("ELECTRICITY_CARNO"),
		tableId: options?.tableId ?? useEnv("ELECTRICITY_TABLE_ID"),
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
		carno: options?.carno ?? useEnv("WATER_CARNO"),
		tableId: options?.tableId ?? useEnv("WATER_TABLE_ID"),
		tableName: TableName.water,
		timeout: 120,
		retries: 5,
		...options
	});
}
//#endregion
//#region src/tasks/balance/index.ts
const logger = consola.withTag("Balance");
/**
* 执行余额查询任务（可同时查询电费和水费，并支持 Bark 通知与日志输出）
*
* @param options 运行配置选项
* @returns 查询结果
*/
async function runBalanceCheck(options = {}) {
	const { electricity: checkElectricity = true, water: checkWater = true, notify = false, notifyTitle = "水电费余额通知", notifyGroup, notifyIcon } = options;
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
	if (notify) try {
		const lines = [];
		if (checkElectricity) lines.push(`⚡ 电费余额: ${electricityBalance ?? "查询失败"} 元`);
		if (checkWater) lines.push(`💧 水费余额: ${waterBalance ?? "查询失败"} 元`);
		await sendToBark({
			title: notifyTitle,
			body: lines.join("\n"),
			...notifyGroup ? { group: notifyGroup } : {},
			...notifyIcon ? { icon: notifyIcon } : {}
		});
		logger.success("Bark 通知发送成功");
	} catch (error) {
		errors.notify = error;
		logger.warn("发送 Bark 通知失败:", error);
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
export { runBalanceCheck as t };
