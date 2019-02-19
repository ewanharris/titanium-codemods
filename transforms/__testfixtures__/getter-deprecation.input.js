if (audioRecorder.getPaused()) {
	return `${Ti.App.getName()} ${Ti.App.getVersion()} ${Ti.Platform.getName()} ${Ti.Platform.getVersion()}`;
}
Ti.FileSystem.getFile()
