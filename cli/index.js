const { CLI } = require('cli-kit');
const { version } = require('../package.json');

const cli = new CLI({
	commands: `${__dirname}/commands`,
	desc: 'titanium-codemods is a tool to make Titanium SDK updates easier',
	help: true,
	helpExitCode: 2,
	name: 'titanium-codemods',
	version
});

cli.exec()
	.catch(error => {
		console.log(error)
	});
