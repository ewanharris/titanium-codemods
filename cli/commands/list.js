module.exports = {
	async action ({ _argv }) {
		const path = require('path');
		const utils = require('../../lib/utils');
		// Read in out list of transforms
		const transforms =  utils.listTransforms()
			.map(transform => ({
				name: path.basename(transform, '.js')
			}));
		for (const transform of transforms) {
			console.log(transform.name);
		}
	}
};
