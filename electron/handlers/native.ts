import { app, ipcMain, dialog, shell, nativeTheme, screen } from 'electron'
import { join } from 'path'
import { windowManager } from '../managers/window'
import {
  ModuleManager,
  getJanDataFolderPath,
  getJanExtensionsPath,
  init,
  AppEvent,
  NativeRoute,
  SelectFileProp,
} from '@janhq/core/node'
import { SelectFileOption } from '@janhq/core'
import { menu } from '../utils/menu'

const isMac = process.platform === 'darwin'

export function handleAppIPCs() {
  /**
   * Handles the "openAppDirectory" IPC message by opening the app's user data directory.
   * The `shell.openPath` method is used to open the directory in the user's default file explorer.
   * @param _event - The IPC event object.
   */
  ipcMain.handle(NativeRoute.openAppDirectory, async (_event) => {
    shell.openPath(getJanDataFolderPath())
  })

  /**
   * Handles the "setNativeThemeLight" IPC message by setting the native theme source to "light".
   * This will change the appearance of the app to the light theme.
   */
  ipcMain.handle(NativeRoute.setNativeThemeLight, () => {
    nativeTheme.themeSource = 'light'
  })

  ipcMain.handle(NativeRoute.setCloseApp, () => {
    windowManager.mainWindow?.close()
  })

  ipcMain.handle(NativeRoute.setMinimizeApp, () => {
    windowManager.mainWindow?.minimize()
  })

  ipcMain.handle(NativeRoute.setMaximizeApp, async () => {
    if (windowManager.mainWindow?.isMaximized()) {
      // const bounds = await getBounds()
      // windowManager.mainWindow?.setSize(bounds.width, bounds.height)
      // windowManager.mainWindow?.setPosition(Number(bounds.x), Number(bounds.y))
      windowManager.mainWindow.restore()
    } else {
      windowManager.mainWindow?.maximize()
    }
  })

  /**
   * Handles the "setNativeThemeDark" IPC message by setting the native theme source to "dark".
   * This will change the appearance of the app to the dark theme.
   */
  ipcMain.handle(NativeRoute.setNativeThemeDark, () => {
    nativeTheme.themeSource = 'dark'
  })

  /**
   * Opens a URL in the user's default browser.
   * @param _event - The IPC event object.
   * @param url - The URL to open.
   */
  ipcMain.handle(NativeRoute.openExternalUrl, async (_event, url) => {
    shell.openExternal(url)
  })

  /**
   * Opens a URL in the user's default browser.
   * @param _event - The IPC event object.
   * @param url - The URL to open.
   */
  ipcMain.handle(NativeRoute.openFileExplore, async (_event, url) => {
    shell.openPath(url)
  })

  /**
   * Relaunches the app in production - reload window in development.
   * @param _event - The IPC event object.
   * @param url - The URL to reload.
   */
  ipcMain.handle(NativeRoute.relaunch, async (_event) => {
    ModuleManager.instance.clearImportedModules()

    if (app.isPackaged) {
      app.relaunch()
      app.exit()
    } else {
      for (const modulePath in ModuleManager.instance.requiredModules) {
        delete require.cache[
          require.resolve(join(getJanExtensionsPath(), modulePath))
        ]
      }
      init({
        // Function to check from the main process that user wants to install a extension
        confirmInstall: async (_extensions: string[]) => {
          return true
        },
        // Path to install extension to
        extensionsPath: getJanExtensionsPath(),
      })
      windowManager.mainWindow?.reload()
    }
  })

  ipcMain.handle(NativeRoute.selectDirectory, async () => {
    const mainWindow = windowManager.mainWindow
    if (!mainWindow) {
      console.error('No main window found')
      return
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select a folder',
      buttonLabel: 'Select Folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (canceled) {
      return
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle(
    NativeRoute.selectFiles,
    async (_event, option?: SelectFileOption) => {
      const mainWindow = windowManager.mainWindow
      if (!mainWindow) {
        console.error('No main window found')
        return
      }

      const title = option?.title ?? 'Select files'
      const buttonLabel = option?.buttonLabel ?? 'Select'
      const props: SelectFileProp[] = ['openFile']

      if (option?.allowMultiple) {
        props.push('multiSelections')
      }

      if (option?.selectDirectory) {
        props.push('openDirectory')
      }
      console.debug(`Select files with props: ${props}`)
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title,
        buttonLabel,
        properties: props,
        filters: option?.filters,
      })

      if (canceled) return

      return filePaths
    }
  )

  ipcMain.handle(
    NativeRoute.hideQuickAskWindow,
    async (): Promise<void> => windowManager.hideQuickAskWindow()
  )

  ipcMain.handle(
    NativeRoute.sendQuickAskInput,
    async (_event, input: string): Promise<void> => {
      windowManager.mainWindow?.webContents.send(
        AppEvent.onUserSubmitQuickAsk,
        input
      )
    }
  )

  ipcMain.handle(NativeRoute.showOpenMenu, function (e, args) {
    if (!isMac && windowManager.mainWindow) {
      menu.popup({
        window: windowManager.mainWindow,
        x: args.x,
        y: args.y,
      })
    }
  })

  ipcMain.handle(
    NativeRoute.hideMainWindow,
    async (): Promise<void> => windowManager.hideMainWindow()
  )

  ipcMain.handle(
    NativeRoute.showMainWindow,
    async (): Promise<void> => windowManager.showMainWindow()
  )

  ipcMain.handle(
    NativeRoute.quickAskSizeUpdated,
    async (_event, heightOffset: number): Promise<void> =>
      windowManager.expandQuickAskWindow(heightOffset)
  )

  ipcMain.handle(NativeRoute.ackDeepLink, async (_event): Promise<void> => {
    windowManager.ackDeepLink()
  })
}
