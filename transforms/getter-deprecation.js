const fs = require('fs-extra');
const path = require('path');
const tiappDir = require('tiapp-dir');
const utils = require('../lib/utils.js');

const lookupMap = new Map();
let jsca;

module.exports = function (file, api, options) {
	let madeChanges = false;
	let sdkPath;
	if (!options.sdkPath) {
		const projectDirectory = tiappDir.sync(file.path);
		const sdkVersion = utils.getSDKVersion(projectDirectory);
		const sdkInfo = utils.getSDKInfo(sdkVersion);
		sdkPath = sdkInfo.path;
	} else {
		sdkPath = options.sdkPath;
	}

	jsca = fs.readJSONSync(path.join(sdkPath, 'api.jsca'));
	const j = api.jscodeshift;
	const root = j(file.source);
	try {
		root.find(j.CallExpression)
			.forEach(convertToPropertyAccess);
	} catch (error) {
		console.error(`Ran into problem transforming ${file.path}`);
		console.error(error);
	}

	function convertToPropertyAccess(node) {
		// Get the object that the function is called on
		const object = node.value.callee.object;
		// Get the function call
		const call = node.value.callee.property;

		// If it's just a function call by itself like openWindow() that has not object
		if (!call) {
			return;
		}

		// If it's like $.placeholder[sections.length > 0 ? 'hide' : 'show']();
		if (!call.name) {
			return;
		}

		// We only care about getters
		if (!call.name.startsWith('get')) {
			return;
		}
		// Look for a potential replacement by looping through the api.jsca file
		const replacement = lookupCall(object, call.name);

		if (!replacement) {
			return;
		}

		// Construct our new expression
		const statement = j.memberExpression(
			object,
			j.identifier(replacement)
		);

		// Copy over comments to the new expression to ensure code stays the same
		statement.comments = node.value.comments;

		// Replace the statement
		j(node)
			.replaceWith(
				statement
			);
		madeChanges = true;
	}
	return madeChanges ? root.toSource() : null;
};

function lookupCall(parent, call) {
	if (lookupMap.has(call)) {
		return lookupMap.get(call);
	}

	// TODO: Allow Alloy.Globals.x.get and Alloy.CFG.x.get
	let namespace = constructNamespace(parent);
	if (/exports|Alloy|Widget|require/.test(namespace)) {
		return;
	}
	if (!namespace.startsWith('Ti')) {
		namespace = null;
	}
	let replacementCall;
	for (const api of jsca.types) {
		if (namespace && namespace !== api.name) {
			continue;
		}
		for (const func of api.functions) {
			if (func.name === call && func.deprecated) {
				replacementCall = call.replace(/^get/, '');
				replacementCall = replacementCall.charAt(0).toLowerCase() + replacementCall.slice(1);
				lookupMap.set(call, replacementCall);
			}
		}
	}

	return replacementCall;
}

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
	}

	return apiName ? apiName.replace(/^Ti\./, 'Titanium.') : null;
}
