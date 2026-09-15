import { a as httpClient, i as useEnv, n as sendToGotify, o as toURLSearchParams, r as sendToBark, t as sleep } from "./sleep-JD37t-H8.mjs";
import consola from "consola";
import { createStorage } from "unstorage";
import fsDriver from "unstorage/drivers/fs";
import { format } from "date-fns";
/**
* 创建基于文件系统 (fs) 的通用持久化存储实例
*
* @param options 配置项（默认 base 为 ./.data）
*/
function createFileStorage(options = {}) {
	const base = options.base ?? useEnv("STORAGE_BASE_DIR", "./.data");
	return createStorage({ driver: fsDriver({
		base,
		...options
	}) });
}
/**
* 默认核心文件持久化存储实例
*/
const storage = createFileStorage();
//#endregion
//#region src/tasks/eva/constants.ts
const BASE_URL = "https://api-dmall.lynkco.com/portal/api/item/render/dynamic";
const DEFAULT_ITEM_ID = "5310000100239002";
const DEFAULT_APP_CODE = "3fa3314998bd4195a9fe2df3e85e6a12";
const DEFAULT_PROVINCE_ID = "110000";
const DEFAULT_CITY_ID = "110100";
const DEFAULT_REGION_ID = "110101";
const DEFAULT_JUMP_URL = "lynkco://h5/?routeUrl=https://app.lynkco.com/app-h5/dist/web/pages/attachment-mall/detail/page-web.html?id=5310000100239002";
const DEFAULT_BARK_GROUP = "领克商城";
const DEFAULT_BARK_LEVEL = "timeSensitive";
const DEFAULT_BARK_TITLE = "领克商城 Eva 库存提醒";
const TITLE_IN_STOCK = "🎉 发现 Eva 机器人现货！";
const TITLE_NO_STOCK = "ℹ️ Eva 机器人当前暂无库存";
const TITLE_OUT_OF_STOCK = "⚠️ Eva 机器人已售罄！";
const TITLE_RAPID_DECREASE = "⚡ Eva 机器人库存快速变化！";
const TITLE_STOCK_INCREASED = "📦 Eva 机器人补货增加！";
const EVA_STORAGE_PREFIX = "eva:stock";
const DEFAULT_RAPID_CHANGE_THRESHOLD = 5;
const EVA_SKU_MAP = {
	"5310000100278003": "Eva 高亮黑",
	"5310000100278002": "Eva 极地白"
};
const DEFAULT_HEADERS = {
	Accept: "*/*",
	"Accept-Language": "en-US,en;q=0.9",
	"Content-Type": "application/json",
	Host: "api-dmall.lynkco.com",
	Origin: "https://app.lynkco.com",
	Referer: "https://app.lynkco.com/",
	"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 x-cordova-platform/ios cordova-6 appVersionCode/4.2.7 appVersionName/40207132",
	"acl-app": "BUYER",
	Authentication: "AppId=59701c08ed454a43a9b",
	appVersionCode: "4.2.7",
	appVersionName: "40207132"
};
const EVA_ITEM_ID_ENV_NAME = "EVA_ITEM_ID";
const EVA_USER_ID_ENV_NAME = "EVA_USER_ID";
const EVA_APP_CODE_ENV_NAME = "EVA_APP_CODE";
const EVA_TOKEN_ENV_NAME = "EVA_TOKEN";
//#endregion
//#region src/tasks/eva/api.ts
/**
* 查询领克商城指定 SKU 的 Eva 机器人库存（内置指数退避重试机制）
*
* @param options 查询配置参数
* @returns SKU 库存信息实体
*/
async function fetchEvaStock(options) {
	const { skuId: rawSkuId, provinceId = DEFAULT_PROVINCE_ID, cityId = DEFAULT_CITY_ID, regionId = DEFAULT_REGION_ID, timeout = 30, retries = 3, backoff = 2, headers, baseUrl = BASE_URL, client = httpClient, kyOptions } = options;
	const skuId = String(rawSkuId ?? "").trim();
	if (!skuId) throw new Error("[fetchEvaStock] Missing required parameter: \"skuId\"");
	const itemId = String(options.itemId ?? useEnv("EVA_ITEM_ID", "5310000100239002"));
	const userId = options.userId ?? useEnv("EVA_USER_ID", "");
	const appCode = options.appCode ?? useEnv("EVA_APP_CODE", "3fa3314998bd4195a9fe2df3e85e6a12");
	const token = options.token ?? useEnv("EVA_TOKEN", "");
	const queryParams = {
		provinceId,
		cityId,
		regionId,
		itemId,
		skuId
	};
	if (userId) queryParams.userId = userId;
	const targetUrl = `${baseUrl}?${toURLSearchParams(queryParams).toString()}`;
	const requestHeaders = {
		...DEFAULT_HEADERS,
		Authorization: `APPCODE ${appCode}`,
		...headers
	};
	if (token) {
		requestHeaders.token = token;
		requestHeaders.svcsid = token;
	}
	const timeoutMs = timeout < 1e3 ? timeout * 1e3 : timeout;
	let lastError = null;
	for (let attempt = 1; attempt <= retries; attempt++) try {
		const skuData = (await client.get(targetUrl, {
			headers: requestHeaders,
			timeout: timeoutMs,
			...kyOptions
		}))?.data;
		const stock = typeof skuData?.selectedSkuStock === "number" ? skuData.selectedSkuStock : 0;
		const inStock = stock > 0;
		return {
			skuId,
			skuName: EVA_SKU_MAP[skuId] ?? `SKU ${skuId}`,
			stock,
			inStock,
			price: skuData?.price,
			originalPrice: skuData?.originalPrice,
			warnStatus: skuData?.warnStatus
		};
	} catch (error) {
		lastError = error;
		if (attempt >= retries) throw error;
		const delayMs = Math.max(0, backoff ** attempt * 1e3);
		if (delayMs > 0) await sleep(delayMs);
	}
	if (lastError) throw lastError;
	throw new Error("[fetchEvaStock] Unexpected execution termination without result");
}
//#endregion
//#region src/tasks/eva/events.ts
/**
* 根据最新查询结果与上一次存储的历史记录，判定当前库存状态变动事件
*
* @param current 当前查询到的 SKU 库存信息
* @param previous 上一次保存的记录（若首次查询则可能为 null 或 undefined）
* @param options 配置选项
*/
function determineStockEvent(current, previous, options = {}) {
	const { rapidChangeThreshold = 5, date = /* @__PURE__ */ new Date() } = options;
	const targetDate = typeof date === "number" ? new Date(date) : date;
	const formattedTime = format(targetDate, "yyyy-MM-dd HH:mm:ss");
	const timestamp = targetDate.getTime();
	const currentStock = current.stock;
	const previousStock = previous?.stock;
	const diff = previousStock !== void 0 ? currentStock - previousStock : 0;
	let eventType;
	let title;
	let message;
	if (previousStock === void 0) {
		eventType = "INITIAL";
		if (currentStock > 0) {
			title = TITLE_IN_STOCK;
			message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`;
		} else {
			title = TITLE_NO_STOCK;
			message = `【${current.skuName}】当前暂无现货 (0 件)，持续缺货中。\n${formattedTime}`;
		}
	} else if (previousStock === 0 && currentStock > 0) {
		eventType = "RESTOCKED";
		title = TITLE_IN_STOCK;
		message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`;
	} else if (previousStock > 0 && currentStock === 0) {
		eventType = "OUT_OF_STOCK";
		title = TITLE_OUT_OF_STOCK;
		message = `【${current.skuName}】当前已售罄无货 (0 件)，已从有库存转为缺货。\n${formattedTime}`;
	} else if (previousStock > currentStock && currentStock > 0 && Math.abs(diff) >= rapidChangeThreshold) {
		eventType = "RAPID_DECREASE";
		title = TITLE_RAPID_DECREASE;
		message = `【${current.skuName}】库存剧烈变动：从 ${previousStock} 件快速减至 ${currentStock} 件（减少 ${Math.abs(diff)} 件），库存紧张请尽快选购！\n${formattedTime}`;
	} else if (currentStock > previousStock && previousStock > 0) {
		eventType = "STOCK_INCREASED";
		title = TITLE_STOCK_INCREASED;
		message = `【${current.skuName}】库存增加补货：从 ${previousStock} 件增至 ${currentStock} 件（增加 ${diff} 件），点击立即打开领克 App 选购！\n${formattedTime}`;
	} else if (currentStock > 0) {
		eventType = "STILL_IN_STOCK";
		title = TITLE_IN_STOCK;
		message = `【${current.skuName}】当前有现货 (${currentStock} 件)，点击立即打开领克 App 选购！\n${formattedTime}`;
	} else {
		eventType = "STILL_OUT_OF_STOCK";
		title = TITLE_NO_STOCK;
		message = `【${current.skuName}】当前暂无现货 (0 件)，持续缺货中。\n${formattedTime}`;
	}
	return {
		skuId: current.skuId,
		skuName: current.skuName,
		eventType,
		previousStock,
		currentStock,
		diff,
		timestamp,
		formattedTime,
		title,
		message
	};
}
/**
* 判断指定 SKU 事件是否应当触发通知推送
*/
function shouldNotifySku(event, options) {
	const { bark, gotify, notifyPolicy = "onChange", onlyInStock } = options;
	if (!Boolean(bark) && !Boolean(gotify)) return false;
	if (onlyInStock === true && event.currentStock <= 0) return false;
	switch (notifyPolicy) {
		case "always": return true;
		case "inStock": return event.currentStock > 0;
		default:
			if (event.eventType === "RESTOCKED" || event.eventType === "OUT_OF_STOCK" || event.eventType === "RAPID_DECREASE" || event.eventType === "STOCK_INCREASED") return true;
			if (event.eventType === "INITIAL") return event.currentStock > 0 || onlyInStock === false;
			return false;
	}
}
//#endregion
//#region src/tasks/eva/index.ts
const logger = consola.withTag("Eva");
/**
* 格式化 SKU 列表输入为统一的 [skuId, skuName] 二维数组
*/
function resolveSkuEntries(skus) {
	if (!skus) return Object.entries(EVA_SKU_MAP);
	if (Array.isArray(skus)) return skus.map((skuId) => {
		const id = String(skuId);
		return [id, EVA_SKU_MAP[id] ?? `SKU ${id}`];
	});
	return Object.entries(skus).map(([id, name]) => [String(id), String(name)]);
}
/**
* 执行领克商城 Eva 机器人库存监控巡检
*
* @param options 任务调度配置选项
* @returns 巡检聚合结果（包含各 SKU 当前库存、状态转移事件、历史记录及通知错误）
*/
async function runEvaStockCheck(options = {}) {
	const { skus, itemId, fetchOptions, saveRecord = true, storage: storage$1 = storage, rapidChangeThreshold, bark = false, gotify = false, notifyTitle, notifyMessage } = options;
	const shouldSendBark = Boolean(bark);
	const shouldSendGotify = Boolean(gotify);
	const skuEntries = resolveSkuEntries(skus);
	const stocks = {};
	const events = {};
	const records = {};
	const errors = {};
	let success = true;
	for (const [skuId, fallbackName] of skuEntries) try {
		const info = await fetchEvaStock({
			skuId,
			...itemId ? { itemId } : {},
			...fetchOptions
		});
		if (fallbackName && (!info.skuName || info.skuName.startsWith("SKU "))) info.skuName = fallbackName;
		stocks[skuId] = info;
		const statusText = info.inStock ? `现货 ${info.stock} 件` : "缺货 (0 件)";
		logger.info(`[${info.skuName}] 当前库存: ${statusText}`);
		const storageKey = `${EVA_STORAGE_PREFIX}:${skuId}`;
		const event = determineStockEvent(info, await storage$1.getItem(storageKey), { rapidChangeThreshold });
		events[skuId] = event;
		const record = {
			skuId: info.skuId,
			skuName: info.skuName,
			stock: info.stock,
			inStock: info.inStock,
			price: info.price,
			warnStatus: info.warnStatus,
			timestamp: event.timestamp,
			formattedTime: event.formattedTime
		};
		records[skuId] = record;
		if (saveRecord) await storage$1.setItem(storageKey, record);
		if (shouldNotifySku(event, options)) {
			const title = typeof notifyTitle === "function" ? notifyTitle(event) : notifyTitle ?? event.title;
			const body = typeof notifyMessage === "function" ? notifyMessage(event) : notifyMessage ?? event.message;
			if (shouldSendBark) try {
				const barkOpt = typeof bark === "object" && bark !== null ? bark : void 0;
				const barkPayload = {
					title,
					body,
					url: barkOpt?.url ?? "lynkco://h5/?routeUrl=https://app.lynkco.com/app-h5/dist/web/pages/attachment-mall/detail/page-web.html?id=5310000100239002",
					group: barkOpt?.group ?? "领克商城",
					level: barkOpt?.level ?? "timeSensitive",
					...barkOpt?.icon ? { icon: barkOpt.icon } : {},
					...barkOpt?.sound ? { sound: barkOpt.sound } : {},
					...barkOpt?.badge !== void 0 ? { badge: barkOpt.badge } : {}
				};
				if (barkOpt) await sendToBark(barkPayload, barkOpt);
				else await sendToBark(barkPayload);
				logger.success(`[${info.skuName}] Bark 通知发送成功 (${event.eventType}): ${title}`);
			} catch (err) {
				errors[`notify:${skuId}`] = err;
				errors[`notifyBark:${skuId}`] = err;
				logger.warn(`[${info.skuName}] 发送 Bark 通知失败:`, err);
			}
			if (shouldSendGotify) try {
				const gotifyOpt = typeof gotify === "object" && gotify !== null ? gotify : void 0;
				const priority = typeof gotifyOpt?.priority === "number" ? gotifyOpt.priority : void 0;
				const clickUrl = gotifyOpt?.url ?? "lynkco://h5/?routeUrl=https://app.lynkco.com/app-h5/dist/web/pages/attachment-mall/detail/page-web.html?id=5310000100239002";
				const gotifyPayload = {
					title,
					message: body,
					...priority !== void 0 ? { priority } : {},
					extras: {
						"client::display": { contentType: "text/markdown" },
						...clickUrl ? { "client::notification": { click: { url: clickUrl } } } : {}
					}
				};
				if (gotifyOpt) await sendToGotify(gotifyPayload, gotifyOpt);
				else await sendToGotify(gotifyPayload);
				logger.success(`[${info.skuName}] Gotify 通知发送成功 (${event.eventType}): ${title}`);
			} catch (err) {
				errors[`notifyGotify:${skuId}`] = err;
				if (!errors[`notify:${skuId}`]) errors[`notify:${skuId}`] = err;
				logger.warn(`[${info.skuName}] 发送 Gotify 通知失败:`, err);
			}
		}
	} catch (error) {
		success = false;
		errors[skuId] = error;
		logger.error(`[SKU ${skuId}] 查询库存失败:`, error);
	}
	return {
		hasStock: Object.values(stocks).some((item) => item.inStock),
		stocks,
		events,
		records,
		timestamp: Date.now(),
		success,
		...Object.keys(errors).length > 0 ? { errors } : {}
	};
}
//#endregion
export { TITLE_IN_STOCK as C, TITLE_STOCK_INCREASED as D, TITLE_RAPID_DECREASE as E, EVA_USER_ID_ENV_NAME as S, TITLE_OUT_OF_STOCK as T, EVA_APP_CODE_ENV_NAME as _, BASE_URL as a, EVA_STORAGE_PREFIX as b, DEFAULT_BARK_LEVEL as c, DEFAULT_HEADERS as d, DEFAULT_ITEM_ID as f, DEFAULT_REGION_ID as g, DEFAULT_RAPID_CHANGE_THRESHOLD as h, fetchEvaStock as i, DEFAULT_BARK_TITLE as l, DEFAULT_PROVINCE_ID as m, determineStockEvent as n, DEFAULT_APP_CODE as o, DEFAULT_JUMP_URL as p, shouldNotifySku as r, DEFAULT_BARK_GROUP as s, runEvaStockCheck as t, DEFAULT_CITY_ID as u, EVA_ITEM_ID_ENV_NAME as v, TITLE_NO_STOCK as w, EVA_TOKEN_ENV_NAME as x, EVA_SKU_MAP as y };
