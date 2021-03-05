const fs = require('fs-extra');
const path = require('path');
const tiappDir = require('tiapp-dir');
const utils = require('../../lib/utils.js');

const lookupMap = new Map();
let jsca;

function constructNamespace(parent) {
	let apiName;
	if (parent.type === 'CallExpression') {
		const callee = parent.callee;
		if (callee.type === 'MemberExpression') {
			if (callee.object) {
				apiName = callee.object.name;
			}

			if (callee.property) {
				apiName = `${apiName}.${callee.property.name}`;
			}
		} else if (callee.type === 'Identifier') {
			apiName = callee.name;
		}
	} else if (parent.type === 'MemberExpression') {
		if (parent.object) {
			apiName = constructNamespace(parent.object);
		}

		if (parent.property) {
			apiName = `${apiName}.${parent.property.name}`;
		}
	} else if (parent.type === 'Identifier') {
		apiName = parent.name;
	} else if (parent.type === 'ThisExpression') {
		apiName = 'this';
	}

	return apiName ? apiName.replace(/^Ti\./, 'Titanium.') : null;
}

function lookupCall(parent, call) {
	if (lookupMap.has(call)) {
		return lookupMap.get(call);
	}

	// TODO: Allow Alloy.Globals.x.get and Alloy.CFG.x.get
	let namespace = constructNamespace(parent);
	if (/exports|Alloy|Widget|require/.test(namespace)) {
		return;
	}

	if (namespace && !namespace.startsWith('Ti')) {
		namespace = null;
	}

	let replacementCall;
	for (const api of jsca.types) {
		if (namespace && namespace !== api.name) {
			continue;
		}
		for (const func of api.functions) {
			// "is" based APIs were never actually marked as deprecated in the JSCA files so always
			// assume they are deprecated. I'm sure that'll be fine right...right???
			const deprecated = func.name.startsWith('is') ? true : func.deprecated;
			if (func.name === call && deprecated) {
				replacementCall = call.replace(/^(get|set|is)/, '');
				replacementCall = replacementCall.charAt(0).toLowerCase() + replacementCall.slice(1);
				lookupMap.set(call, replacementCall);
			}
		}
	}

	return replacementCall;
}

function findTiAppAndSdkVersion(filePath) {
	const projectDirectory = tiappDir.sync(filePath);
	const sdkVersion = utils.getSDKVersion(projectDirectory);
	const sdkInfo = utils.getSDKInfo(sdkVersion);

	return  { projectDirectory, sdkInfo };
}

function loadJSCA (sdkInfo, options) {
	let sdkPath = options.sdkPath;
	if (!sdkPath) {
		sdkPath = sdkInfo.path;
	}
	jsca = fs.readJSONSync(path.join(sdkPath, 'api.jsca'));
}

module.exports = {
	constructNamespace,
	findTiAppAndSdkVersion,
	lookupCall,
	loadJSCA
};
