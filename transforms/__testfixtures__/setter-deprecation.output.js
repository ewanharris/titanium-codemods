$.indicatorLight.indicatorColor = colors[_.random(0, colors.length - 1)];
$.myLabel.textAlign = 'center';

setTimeout(function() {
	console.log('I\'m a timeout')
}, 1000)

Ti.App.Properties.setBool('notchanged', true);
