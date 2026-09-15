//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let ky = require("ky");
ky = __toESM(ky, 1);
let destr = require("destr");
let std_env = require("std-env");
//#region src/core/client/client.ts
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
	const kyResolved = resolveKy(ky.default);
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
//#region src/core/env/env.ts
function useEnv(key, fallback = void 0) {
	const rawValue = std_env.env[key];
	if (rawValue === void 0 && fallback === void 0) throw new Error(`[useEnv] Missing required environment variable: "${key}"`);
	if (rawValue === void 0 && fallback !== void 0) return fallback;
	return (0, destr.destr)(rawValue);
}
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
		...parseKeys(payload.device_keys),
		...parseKeys(payload.device_key)
	];
	if (explicitKeys.length > 0) return Array.from(new Set(explicitKeys));
	const envKeys = [...parseKeys(useEnv(BARK_DEVICE_KEYS_ENV_NAME, []))];
	return Array.from(new Set(envKeys));
}
/**
* 规整 Host 基础地址（仅定义 Host，去除末尾斜杠及误传的 /push）
*/
function normalizeHost$1(base) {
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
	const host = normalizeHost$1(base);
	const finalPayload = { ...payload };
	if (keys.length === 0) throw new Error("[sendToBark] Missing device_keys. Please provide device_keys in payload, options, or BARK_DEVICE_KEYS environment variable.");
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
	const resolvedUrl = typeof payloadOrBody === "object" ? payloadOrBody.url ?? options?.url : options?.url;
	const resolvedLevel = typeof payloadOrBody === "object" ? payloadOrBody.level ?? options?.level : options?.level;
	const resolvedSound = typeof payloadOrBody === "object" ? payloadOrBody.sound ?? options?.sound : options?.sound;
	const resolvedBadge = typeof payloadOrBody === "object" ? payloadOrBody.badge ?? options?.badge : options?.badge;
	const rawPayload = typeof payloadOrBody === "string" ? {
		body: payloadOrBody,
		group: defaultGroup,
		icon: defaultIcon,
		...resolvedUrl ? { url: resolvedUrl } : {},
		...resolvedLevel ? { level: resolvedLevel } : {},
		...resolvedSound ? { sound: resolvedSound } : {},
		...resolvedBadge !== void 0 ? { badge: resolvedBadge } : {}
	} : {
		...payloadOrBody,
		group: payloadOrBody.group ?? defaultGroup,
		icon: payloadOrBody.icon ?? defaultIcon,
		...resolvedUrl ? { url: resolvedUrl } : {},
		...resolvedLevel ? { level: resolvedLevel } : {},
		...resolvedSound ? { sound: resolvedSound } : {},
		...resolvedBadge !== void 0 ? { badge: resolvedBadge } : {}
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
const GOTIFY_DEFAULT_PRIORITY_ENV_NAME = "GOTIFY_DEFAULT_PRIORITY";
/**
* 规整 Host 基础地址（去除末尾斜杠及误传的 /message）
*/
function normalizeHost(base) {
	if (!base || typeof base !== "string" || base.trim().length === 0) throw new Error("[sendToGotify] Missing apiBase. Please provide apiBase in options or GOTIFY_API_BASE / GOTIFY_URL environment variable.");
	let host = base.trim().replace(/\/+$/, "");
	if (host.endsWith("/message")) host = host.slice(0, -8).replace(/\/+$/, "");
	try {
		new URL(host);
	} catch {
		throw new Error(`[sendToGotify] Invalid base host URL: "${base}"`);
	}
	return host;
}
/**
* 提取并校验 Gotify Application Token
*/
function extractToken(options) {
	const explicitToken = options?.appToken ?? options?.token;
	if (explicitToken && String(explicitToken).trim().length > 0) return String(explicitToken).trim();
	const envToken = useEnv("GOTIFY_APP_TOKEN", "") || useEnv("GOTIFY_TOKEN", "");
	const parsed = String(envToken).trim();
	if (parsed.length > 0) return parsed;
	throw new Error("[sendToGotify] Missing app token. Please provide appToken in options or GOTIFY_APP_TOKEN / GOTIFY_TOKEN environment variable.");
}
/**
* 解析计算消息优先级
*/
function resolvePriority(payloadPriority, optionsPriority) {
	if (typeof payloadPriority === "number") return payloadPriority;
	if (typeof optionsPriority === "number") return optionsPriority;
	const envPriority = useEnv(GOTIFY_DEFAULT_PRIORITY_ENV_NAME, "");
	if (envPriority !== void 0 && envPriority !== null && envPriority !== "") {
		const num = Number(envPriority);
		if (!Number.isNaN(num)) return num;
	}
	return 5;
}
/**
* 将入参消息或载荷规整为标准 GotifyPayload，并混入快捷配置与 Extras
*/
function buildPayload(payloadOrMessage, options) {
	const basePayload = typeof payloadOrMessage === "string" ? {
		message: payloadOrMessage,
		...options?.title ? { title: options.title } : {}
	} : {
		...payloadOrMessage,
		...options?.title && !payloadOrMessage.title ? { title: options.title } : {}
	};
	basePayload.priority = resolvePriority(basePayload.priority, options?.priority);
	const extras = { ...basePayload.extras };
	if (options?.markdown) {
		const currentDisplay = extras["client::display"];
		extras["client::display"] = {
			contentType: currentDisplay?.contentType ?? "text/markdown",
			...currentDisplay
		};
	}
	if (options?.url || options?.bigImageUrl) {
		const currentNotification = extras["client::notification"];
		const existingClick = currentNotification?.click;
		const clickUrl = existingClick?.url ?? options?.url;
		extras["client::notification"] = {
			...currentNotification,
			...clickUrl ? { click: {
				...existingClick,
				url: clickUrl
			} } : existingClick ? { click: existingClick } : {},
			...options?.bigImageUrl && !currentNotification?.bigImageUrl ? { bigImageUrl: options.bigImageUrl } : {}
		};
	}
	if (Object.keys(extras).length > 0) basePayload.extras = extras;
	return basePayload;
}
async function sendToGotify(payloadOrMessage, options) {
	const host = normalizeHost(options?.apiBase ?? (useEnv("GOTIFY_API_BASE", "") || useEnv("GOTIFY_URL", "") || useEnv("GOTIFY_BASE_URL", "")));
	const token = extractToken(options);
	const finalPayload = buildPayload(payloadOrMessage, options);
	const targetUrl = `${host}/message`;
	const client = options?.client ?? httpClient;
	try {
		return await client.post(targetUrl, {
			json: finalPayload,
			headers: { "X-Gotify-Key": token },
			timeout: options?.timeout,
			...options?.kyOptions
		});
	} catch (error) {
		if (error instanceof ky.HTTPError && error.response) try {
			const errBody = await error.response.json();
			const desc = errBody.errorDescription || errBody.error || error.message;
			const code = errBody.errorCode ?? error.response.status;
			throw new Error(`Gotify request failed [${code}]: ${desc}`);
		} catch (parseError) {
			if (parseError instanceof Error && parseError.message.startsWith("Gotify request failed")) throw parseError;
			throw new Error(`Gotify request failed [${error.response.status}]: ${error.message}`);
		}
		throw error;
	}
}
//#endregion
//#region src/core/utils/sleep.ts
/**
* 辅助延时函数（毫秒）
*
* @param ms 延时毫秒数
*/
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
//#endregion
Object.defineProperty(exports, "__toESM", {
	enumerable: true,
	get: function() {
		return __toESM;
	}
});
Object.defineProperty(exports, "httpClient", {
	enumerable: true,
	get: function() {
		return httpClient;
	}
});
Object.defineProperty(exports, "sendToBark", {
	enumerable: true,
	get: function() {
		return sendToBark;
	}
});
Object.defineProperty(exports, "sendToGotify", {
	enumerable: true,
	get: function() {
		return sendToGotify;
	}
});
Object.defineProperty(exports, "sleep", {
	enumerable: true,
	get: function() {
		return sleep;
	}
});
Object.defineProperty(exports, "toURLSearchParams", {
	enumerable: true,
	get: function() {
		return toURLSearchParams;
	}
});
Object.defineProperty(exports, "useEnv", {
	enumerable: true,
	get: function() {
		return useEnv;
	}
});
