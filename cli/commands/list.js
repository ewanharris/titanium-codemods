module.exports = {
	async action ({ _argv }) {
		const fs = require('fs-extra');
		const path = require('path');
		// Read in out list of transforms
		const transforms = fs.readdirSync(path.join(__dirname, '..', '..', 'transforms'))
			.map(transform => ({
				name: path.basename(transform, '.js')
			}));
		for (const transform of transforms) {
			console.log(transform.name);
		}
	}
};
