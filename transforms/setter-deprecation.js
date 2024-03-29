const chalk = require('chalk');
const diff = require('jest-diff');
const path = require('path');

const { findTiAppAndSdkVersion, lookupCall, loadJSCA } = require('./utils/transform-utils');

module.exports = function (file, api, options) {
	let madeChanges = false;
	let sdkInfo;
	let relativePath;

	if (!options.sdkPath) {
		const projectInfo = findTiAppAndSdkVersion(file.path);
		relativePath = path.resolve(projectInfo.projectDirectory, file.path);
		sdkInfo = projectInfo.sdkInfo;
	}

	// Check and read in our JSCA file for checking against;
	loadJSCA(sdkInfo, options);

	const j = api.jscodeshift;
	const root = j(file.source);
	const original = root.toSource();
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

		// If it's just a function call like openWindow() that has not object
		if (!call) {
			return;
		}

		// If it's like $.placeholder[sections.length > 0 ? 'hide' : 'show']();
		if (!call.name) {
			return;
		}

		// We only care about getters
		if (!call.name.startsWith('set')) {
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
			j.assignmentExpression(
				'=',
				j.identifier(replacement),
				...node.value.arguments
			)
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

	const changedSource = root.toSource();
	if (madeChanges && options.dry) {
		const changes = diff(changedSource, original, {
			aAnnotation: 'After',
			bAnnotation: 'Before',
			expand: false,
			contextLines: 1
		});
		console.log(`Showing changes for ${chalk.cyan(relativePath)}`);
		console.log(changes);
	}
	return madeChanges ? changedSource : null;
};
