const { CLI } = require('cli-kit');
const { version } = require('../package.json');

const cli = new CLI({
	args: [
	],
	options: {
	},
	version
});

cli.exec()
	.then(async ({ argv }) => {
		console.log('Ready to rock and roll!');
	})
	.catch(error => {
		console.log(error);
	});
