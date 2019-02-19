module.exports = {
	args: [
		{
			name: 'src',
			desc: 'path to the application directory',
			required: true
		}
	],
	options: {
		'--dry-run': 'perform a dry run, not changing any files',
		'--run-all': 'run all codemods',
		// FIXME: This should be a multiple that gives us an array.
		'--exclude <dir1,dir2>': 'comma separated list of directories to exclude, resolved relative to the project directory',
		'--transforms <transform1,transform2>': 'comma separated list of transforms to run'
	},
	async action ({ argv }) {
		const fs = require('fs');
		const inquirer = require('inquirer');
		const globby = require('globby');
		const path = require('path');
		const { transformFiles } = require('../transformFiles');
		const tiappxml = require('tiapp.xml');
		const utils = require('../../lib/utils');

		const {
			dryRun,
			exclude,
			runAll,
			src,
			transforms: userTransforms
		} = argv;

		// Attempt to resolve the tiapp.xml as a way of project validation
		const tiappLocation = path.join(src, 'tiapp.xml');
		if (!fs.existsSync(tiappLocation)) {
			throw new Error(`tiapp.xml does not exist at ${tiappLocation}. Are you pointing to a valid directory?`);
		}

		// Read in out list of transforms
		const transforms = fs.readdirSync(path.join(__dirname, '..', '..', 'transforms'))
			.map(transform => ({
				checked: true,
				name: path.basename(transform, '.js'),
				value: { name: path.basename(transform, '.js'), path: transform }
			}));
		let transformsToRun;

		// Prompt for what transforms to run if node are given, or default to all if `--run-all` is given.
		// TODO: Come up with defaults per SDK-line and auto select based off that?
		if (!runAll && !userTransforms) {
			const selected = await inquirer.prompt({
				type: 'checkbox',
				message: 'Select transforms',
				name: 'transforms',
				choices: transforms
			});
			if (!selected.transforms) {
				console.log('None selected');
				return;
			}
			transformsToRun = selected.transforms;
		} else if (userTransforms) {
			transformsToRun = transforms.filter(transform => userTransforms.includes(transform.name))
				.map(transform => transform.value);
		} else {
			transformsToRun = transforms.map(transform => transform.value);
		}

		// Load the tiapp and get the SDK version to ensure it's installed as we require the `api.jsca` file.
		const tiapp = tiappxml.load(tiappLocation);
		const sdkVersion = tiapp.sdkVersion;
		const sdk = utils.getSDKInfo(sdkVersion);
		if (!sdk) {
			throw new Error(`Please ensure the sdk version (${sdkVersion}) is installed.`);
		}

		console.log(`Using ${sdkVersion} for api.jsca file`);

		// Check if we're codemod-ing an Alloy or Classic project
		let sourceDir;
		if (fs.existsSync(path.join(src, 'app'))) {
			// It's an alloy app
			sourceDir = path.resolve(path.join(src, 'app'));
		} else {
			// It's a classic app
			sourceDir = path.resolve(path.join(src, 'Resources'));
		}

		// Create the glob pattern used to lookup the files
		const globPattern = `${sourceDir}/**/*.js`;
		const excludePaths = [];
		if (exclude) {
			const excludesArray = exclude.split(',');
			for (const exclude of excludesArray) {
				const excludePath = path.resolve(path.join(src, exclude));
				if (!fs.existsSync(excludePath)) {
					console.warn(`Unknown exclude path ${excludePath}`);
					continue;
				}
				if (fs.statSync(excludePath).isDirectory()) {
					excludePaths.push(`!${excludePath}/**/*.js`);
				} else {
					excludePaths.push(`!${excludePath}`);
				}
			}
		}

		// Lookup the files
		const files = await globby([ globPattern, ...excludePaths ]);
		if (!files.length) {
			throw new Error('There are no files to transform');
		}

		// Translate flags for jscodeshift
		const flags = {};
		if (dryRun) {
			flags.dryRun = true;
		}

		// Run the codemods!
		for (const transform of transformsToRun) {
			console.log(`Running ${transform.name}`);
			await transformFiles({
				files,
				transformPath: path.join(__dirname, '..', '..', 'transforms', transform.path),
				flags
			});
		}
		return;
	}
};
