const execa = require('execa');
const path = require('path');
const debug = require('debug')('titanium-codemods:transform');

async function transformFiles({ files, flags, transformPath }) {
	const jscodeShiftBin = require.resolve('.bin/jscodeshift');
	const args = [ '--ignore-pattern=**/node_modules/**', '--no-babel', '-t', transformPath, ...files ];

	if (flags.dryRun) {
		args.push('--dry');
	}

	debug(`Running ${jscodeShiftBin} ${args.join(' ')}`);
	const out = await execa(jscodeShiftBin, args, {
		stdio: 'inherit'
	});
	debug(out.error);
}

module.exports = {
	transformFiles
};
