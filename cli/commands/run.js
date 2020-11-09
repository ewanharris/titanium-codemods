module.exports = {
	options: {
		'--dry-run': 'perform a dry run, not changing any files',
		'--run-all': 'run all codemods',
		// FIXME: This should be a multiple that gives us an array.
		'--exclude [dir1,dir2]': 'comma separated list of directories to exclude, resolved relative to the project directory',
		'--transforms [transform1,transform2]': 'comma separated list of transforms to run',
		'--project-dir [project-dir]': {
			desc: 'project directory to run on',
			default: '.'
		},
		'--force': {
			desc: 'force running of the changes even if uncommited changes exist in the directory',
			default: false
		}
	},
	async action ({ argv }) {
		const chalk = require('chalk');
		const fs = require('fs');
		const { prompt } = require('enquirer');
		const globby = require('globby');
		const path = require('path');
		const { transformFiles } = require('../transformFiles');
		const tiappxml = require('tiapp.xml');
		const utils = require('../../lib/utils');

		const {
			dryRun,
			exclude,
			force,
			runAll,
			transforms: userTransforms,
			projectDir
		} = argv;
		const realProjectDir = path.resolve(projectDir);
		// Attempt to resolve the tiapp.xml as a way of project validation
		const tiappLocation = path.join(realProjectDir, 'tiapp.xml');
		if (!fs.existsSync(tiappLocation)) {
			console.error(`tiapp.xml does not exist at ${tiappLocation}. Are you pointing to a valid directory?`);
			process.exitCode = 1;
			return;
		}

		if (await utils.hasGitChanges(realProjectDir) && !force) {
			console.error(`Uncommited changes at ${realProjectDir}, please commit or stash your changes`);
			console.error('Alternatively you can run with "--force" to override this check');
			process.exitCode = 1;
			return;
		}

		// Read in out list of transforms
		const transforms = utils.listTransforms()
			.map(transform => ({
				name: path.basename(transform, '.js'),
				value: { name: path.basename(transform, '.js'), path: transform }
			}));
		let transformsToRun;

		// Prompt for what transforms to run if node are given, or default to all if `--run-all` is given.
		// TODO: Come up with defaults per SDK-line and auto select based off that?
		if (!runAll && !userTransforms) {
			const selected = await prompt({
				type: 'multiselect',
				name: 'transforms',
				message: 'Select transforms',
				choices: transforms,
				initial: transforms, // set all the transforms as initially selected
				result(names) {
					return names.map(name => this.find(name).value);
				},
				styles: {
					em: chalk.cyan
				}
			});

			if (!selected.transforms.length) {
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

		console.log(`Using ${chalk.cyan(sdkVersion)} for API lookup`);

		// Check if we're codemod-ing an Alloy or Classic project
		let sourceDir;
		if (fs.existsSync(path.join(realProjectDir, 'app'))) {
			// It's an alloy app
			sourceDir = path.resolve(path.join(realProjectDir, 'app'));
		} else {
			// It's a classic app
			sourceDir = path.resolve(path.join(realProjectDir, 'Resources'));
		}

		// Create the glob pattern used to lookup the files
		const globPattern = `${sourceDir}/**/*.js`;
		const excludePaths = [];
		if (exclude) {
			const excludesArray = exclude.split(',');
			for (const exclude of excludesArray) {
				const excludePath = path.resolve(path.join(realProjectDir, exclude));
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
			console.log(`Running ${chalk.cyan(transform.name)}`);
			await transformFiles({
				files,
				transformPath: path.join(__dirname, '..', '..', 'transforms', transform.path),
				flags
			});
		}
		return;
	}
};
