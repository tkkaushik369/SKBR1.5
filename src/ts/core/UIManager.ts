export class UIManager {
	public static setUserInterfaceVisible(value: boolean): void {
		const uiContainer = document.getElementById('ui-container')
		if (uiContainer !== null) uiContainer.style.display = value ? 'block' : 'none'
	}

	public static setLoadingScreenVisible(value: boolean): void {
		const loadingScreen = document.getElementById('loading-screen')
		if (loadingScreen !== null) loadingScreen.style.display = value ? 'flex' : 'none'
	}

	public static setFPSVisible(value: boolean): void {
		const statsBox = document.getElementById('statsBox')
		if (statsBox !== null) statsBox.style.display = value ? 'block' : 'none'
		const dataGui = document.getElementById('dat-gui-container')
		if (dataGui !== null) dataGui.style.top = value ? '48px' : '0px'
	}
}
