const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function findFile(root, name) {
  if (!fs.existsSync(root)) return null;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) return full;
  }
  return null;
}

function kotlinSource(packageName) {
  return `package ${packageName}

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Debug
import android.os.Process
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.uimanager.ViewManager
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import kotlin.concurrent.thread

private object DkdsLocalWebServer {
  @Volatile private var socket: ServerSocket? = null
  @Volatile private var port: Int = 0
  @Volatile private var lastError: String = ""

  @Synchronized fun start(context: ReactApplicationContext): String {
    if (socket?.isClosed == false && port > 0) return "http://127.0.0.1:$port/"
    lastError = ""
    try {
      context.assets.open("dkds/index.html").use { stream ->
        if (stream.read() < 0) throw IllegalStateException("本机网页版入口文件为空。")
      }
    } catch (error: Throwable) {
      lastError = "APK 未包含完整网页版资源：\${error.message ?: error.javaClass.simpleName}"
      throw IllegalStateException(lastError, error)
    }
    val candidates = listOf(45910, 0)
    var created: ServerSocket? = null
    var bindError: Throwable? = null
    for (candidate in candidates) {
      try {
        created = ServerSocket().apply {
          reuseAddress = true
          bind(java.net.InetSocketAddress(InetAddress.getLoopbackAddress(), candidate), 24)
        }
        break
      } catch (error: Throwable) { bindError = error }
    }
    val server = created ?: run {
      lastError = "无法绑定 Android 本机回环端口：\${bindError?.message ?: "unknown"}"
      throw IllegalStateException(lastError, bindError)
    }
    socket = server
    port = server.localPort
    thread(name = "dkds-local-web", isDaemon = true) {
      while (!server.isClosed) {
        try {
          val client = server.accept()
          thread(name = "dkds-local-web-client", isDaemon = true) { serve(context, client) }
        } catch (error: Throwable) {
          if (!server.isClosed) lastError = "本机网页服务连接异常：\${error.message ?: error.javaClass.simpleName}"
        }
      }
    }
    return "http://127.0.0.1:$port/"
  }

  fun markError(error: Throwable) { lastError = error.message ?: error.javaClass.simpleName }
  fun error(): String = lastError

  @Synchronized fun stop() {
    try { socket?.close() } catch (_: Throwable) {}
    socket = null
    port = 0
    lastError = ""
  }

  fun status(): Pair<Boolean, String> {
    val running = socket?.isClosed == false && port > 0
    return Pair(running, if (running) "http://127.0.0.1:$port/" else "")
  }

  private fun serve(context: ReactApplicationContext, client: Socket) {
    client.use { socket ->
      socket.soTimeout = 5000
      val reader = BufferedReader(InputStreamReader(BufferedInputStream(socket.getInputStream()), StandardCharsets.US_ASCII))
      val first = reader.readLine() ?: return
      while (true) {
        val line = reader.readLine() ?: break
        if (line.isEmpty()) break
      }
      val parts = first.split(" ")
      val method = parts.getOrNull(0) ?: ""
      if (method != "GET" && method != "HEAD") return response(socket, 405, "text/plain; charset=utf-8", "Method Not Allowed".toByteArray())
      val raw = parts.getOrNull(1)?.substringBefore('?') ?: "/"
      if (raw == "/__dkds_health") return response(socket, 200, "text/plain; charset=utf-8", "ok".toByteArray())
      val decoded = try { URLDecoder.decode(raw, "UTF-8") } catch (_: Throwable) { raw }
      val relative = decoded.trimStart('/').ifEmpty { "index.html" }
      if (relative.split('/').any { it == ".." }) return response(socket, 403, "text/plain; charset=utf-8", "Forbidden".toByteArray())
      val assetPath = "dkds/$relative"
      val bytes = try { context.assets.open(assetPath).use { it.readBytes() } } catch (_: Throwable) {
        return response(socket, 404, "text/plain; charset=utf-8", "Not Found".toByteArray())
      }
      response(socket, 200, mime(relative), if (method == "HEAD") ByteArray(0) else bytes, if (method == "HEAD") bytes.size else bytes.size)
    }
  }

  private fun mime(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
    "html" -> "text/html; charset=utf-8"
    "js" -> "application/javascript; charset=utf-8"
    "css" -> "text/css; charset=utf-8"
    "json" -> "application/json; charset=utf-8"
    "svg" -> "image/svg+xml"
    "png" -> "image/png"
    "ico" -> "image/x-icon"
    "woff2" -> "font/woff2"
    else -> "application/octet-stream"
  }

  private fun response(socket: Socket, status: Int, mime: String, body: ByteArray, contentLength: Int = body.size) {
    val phrase = when (status) { 200 -> "OK"; 403 -> "Forbidden"; 404 -> "Not Found"; 405 -> "Method Not Allowed"; else -> "Error" }
    val output = BufferedOutputStream(socket.getOutputStream())
    val header = "HTTP/1.1 $status $phrase\\r\\nContent-Type: $mime\\r\\nContent-Length: $contentLength\\r\\nCache-Control: no-store\\r\\nConnection: close\\r\\nX-Content-Type-Options: nosniff\\r\\n\\r\\n"
    output.write(header.toByteArray(StandardCharsets.US_ASCII))
    output.write(body)
    output.flush()
  }
}

class DkdsNativeHostModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  private val openRequest = 7311
  private val saveRequest = 7312
  private var openPromise: Promise? = null
  private var savePromise: Promise? = null
  private var saveBytes: ByteArray? = null

  init { context.addActivityEventListener(this) }
  override fun getName() = "DkdsNativeHost"

  @ReactMethod fun openDocuments(types: ReadableArray?, multiple: Boolean, promise: Promise) {
    launchDocuments(types, multiple, false, promise)
  }

  @ReactMethod fun openDocumentsExtended(types: ReadableArray?, multiple: Boolean, promise: Promise) {
    launchDocuments(types, multiple, true, promise)
  }

  private fun launchDocuments(types: ReadableArray?, multiple: Boolean, includeThirdParty: Boolean, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.reject("E_NO_ACTIVITY", "Android 文件界面当前不可用。")
    if (openPromise != null) return promise.reject("E_PICKER_BUSY", "已有文件选择操作正在进行。")
    val mimeTypes = mutableListOf<String>()
    if (types != null) for (index in 0 until types.size()) types.getString(index)?.let { if (it.isNotBlank()) mimeTypes.add(it) }
    fun configure(intent: Intent, persistable: Boolean) = intent.apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = if (mimeTypes.size == 1) mimeTypes[0] else "*/*"
      if (mimeTypes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
      putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      if (persistable) addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    val saf = configure(Intent(Intent.ACTION_OPEN_DOCUMENT), true)
    val intent = if (includeThirdParty) {
      val content = configure(Intent(Intent.ACTION_GET_CONTENT), false)
      Intent.createChooser(saf, "选择数据文件").apply { putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(content)) }
    } else saf
    openPromise = promise
    try { activity.startActivityForResult(intent, openRequest) }
    catch (error: Throwable) { openPromise = null; promise.reject("E_OPEN_DOCUMENT", error) }
  }

  @ReactMethod fun readDocument(uri: String, promise: Promise) {
    thread(name = "dkds-read-document", isDaemon = true) {
      try {
        val bytes = context.contentResolver.openInputStream(Uri.parse(uri))?.use { it.readBytes() }
          ?: throw IllegalStateException("无法读取所选文档。")
        promise.resolve(Base64.encodeToString(bytes, Base64.NO_WRAP))
      } catch (error: Throwable) { promise.reject("E_READ_DOCUMENT", error) }
    }
  }

  @ReactMethod fun createDocument(name: String, mimeType: String, content: String, encoding: String, promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.reject("E_NO_ACTIVITY", "Android 文件界面当前不可用。")
    if (savePromise != null) return promise.reject("E_PICKER_BUSY", "已有保存操作正在进行。")
    val bytes = try { decodeContent(content, encoding) } catch (error: Throwable) { return promise.reject("E_ENCODE_DOCUMENT", error) }
    val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = mimeType.ifBlank { "application/octet-stream" }
      putExtra(Intent.EXTRA_TITLE, name)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }
    savePromise = promise
    saveBytes = bytes
    try { activity.startActivityForResult(intent, saveRequest) }
    catch (error: Throwable) { savePromise = null; saveBytes = null; promise.reject("E_CREATE_DOCUMENT", error) }
  }

  @ReactMethod fun writeDocument(uri: String, content: String, encoding: String, promise: Promise) {
    try {
      writeBytes(Uri.parse(uri), decodeContent(content, encoding))
      promise.resolve(uri)
    } catch (error: Throwable) { promise.reject("E_WRITE_DOCUMENT", error) }
  }

  @ReactMethod fun runtimeStatus(promise: Promise) {
    thread(name = "dkds-runtime-status", isDaemon = true) {
      try {
        val info = Debug.MemoryInfo()
        Debug.getMemoryInfo(info)
        val pssBytes = info.totalPss.toDouble() * 1024.0
        val javaRuntime = Runtime.getRuntime()
        val javaUsed = (javaRuntime.totalMemory() - javaRuntime.freeMemory()).toDouble()
        val nativeHeap = Debug.getNativeHeapAllocatedSize().toDouble()
        val component = WritableNativeMap().apply {
          putString("id", "android:process")
          putString("type", "process")
          putInt("pid", Process.myPid())
          putString("label", "Android 应用进程")
          putString("pluginId", "")
          putString("activityId", "")
          putDouble("workingSetBytes", pssBytes)
          putDouble("privateBytes", pssBytes)
          putDouble("peakWorkingSetBytes", pssBytes)
        }
        val components = WritableNativeArray().apply { pushMap(component) }
        val memory = WritableNativeMap().apply {
          putDouble("workingSetBytes", pssBytes)
          putDouble("privateBytes", pssBytes)
          putDouble("javaHeapUsedBytes", javaUsed)
          putDouble("nativeHeapUsedBytes", nativeHeap)
          putDouble("jsHeapUsedBytes", 0.0)
          putDouble("jsHeapLimitBytes", 0.0)
        }
        promise.resolve(WritableNativeMap().apply {
          putString("runtime", "android")
          putString("platform", "Android")
          putBoolean("isPackaged", true)
          putInt("processCount", 1)
          putMap("memory", memory)
          putArray("components", components)
        })
      } catch (error: Throwable) { promise.reject("E_RUNTIME_STATUS", error) }
    }
  }

  @ReactMethod fun webStatus(promise: Promise) {
    val (running, url) = DkdsLocalWebServer.status()
    promise.resolve(WritableNativeMap().apply { putBoolean("running", running); putString("url", url); putString("error", DkdsLocalWebServer.error()) })
  }

  @ReactMethod fun startWebVersion(openBrowser: Boolean, promise: Promise) {
    thread(name = "dkds-web-start", isDaemon = true) {
      try {
        val url = DkdsLocalWebServer.start(context)
        if (openBrowser) context.runOnUiQueueThread {
          try {
            val view = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            val activity = reactApplicationContext.currentActivity
            if (activity != null) activity.startActivity(Intent.createChooser(view, "打开 DK Data Studio 网页版"))
            else context.startActivity(view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
          } catch (_: Throwable) {}
        }
        promise.resolve(url)
      } catch (error: Throwable) { DkdsLocalWebServer.markError(error); promise.reject("E_WEB_VERSION", error) }
    }
  }

  @ReactMethod fun stopWebVersion(promise: Promise) { DkdsLocalWebServer.stop(); promise.resolve(true) }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode == openRequest) {
      val promise = openPromise ?: return
      openPromise = null
      if (resultCode != Activity.RESULT_OK || data == null) return promise.resolve(WritableNativeArray())
      val uris = mutableListOf<Uri>()
      data.data?.let { uris.add(it) }
      data.clipData?.let { clip -> for (index in 0 until clip.itemCount) uris.add(clip.getItemAt(index).uri) }
      val rows: WritableArray = WritableNativeArray()
      uris.distinct().forEach { uri ->
        var persistable = false
        try { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); persistable = true } catch (_: Throwable) {}
        rows.pushMap(documentInfo(uri, persistable))
      }
      promise.resolve(rows)
      return
    }
    if (requestCode == saveRequest) {
      val promise = savePromise ?: return
      val bytes = saveBytes ?: ByteArray(0)
      savePromise = null
      saveBytes = null
      val uri = if (resultCode == Activity.RESULT_OK) data?.data else null
      if (uri == null) return promise.resolve(null)
      try {
        try { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION) } catch (_: Throwable) {}
        writeBytes(uri, bytes)
        promise.resolve(uri.toString())
      } catch (error: Throwable) { promise.reject("E_WRITE_DOCUMENT", error) }
    }
  }

  override fun onNewIntent(intent: Intent) {}

  private fun documentInfo(uri: Uri, persistable: Boolean): WritableMap {
    var name = uri.lastPathSegment ?: "document"
    var size = 0.0
    var mime = context.contentResolver.getType(uri) ?: ""
    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) {
        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
        val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
        if (nameIndex >= 0) name = cursor.getString(nameIndex) ?: name
        if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) size = cursor.getLong(sizeIndex).toDouble()
      }
    }
    return WritableNativeMap().apply {
      putString("uri", uri.toString()); putString("name", name); putDouble("size", size); putString("mimeType", mime); putBoolean("persistable", persistable)
    }
  }

  private fun decodeContent(content: String, encoding: String): ByteArray =
    if (encoding == "base64") Base64.decode(content, Base64.DEFAULT) else content.toByteArray(StandardCharsets.UTF_8)

  private fun writeBytes(uri: Uri, bytes: ByteArray) {
    context.contentResolver.openOutputStream(uri, "wt")?.use { it.write(bytes); it.flush() }
      ?: throw IllegalStateException("无法写入所选文档。")
  }
}

class DkdsNativeHostPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> = listOf(DkdsNativeHostModule(reactContext))
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;
}

module.exports = function withDkdsAndroidNativeHost(config) {
  config = withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    manifest.application = manifest.application || [{ $: {} }];
    manifest.application[0].$ = manifest.application[0].$ || {};
    manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    if (!manifest['uses-permission'].some(row => row?.$?.['android:name'] === 'android.permission.INTERNET')) {
      manifest['uses-permission'].push({ $: { 'android:name': 'android.permission.INTERNET' } });
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    const packageName = mod.modRequest.projectName && config.android?.package
      ? config.android.package
      : (config.android?.package || 'com.dk.datastudio');
    const javaRoot = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java');
    const packageDir = path.join(javaRoot, ...packageName.split('.'));
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, 'DkdsNativeHostModule.kt'), kotlinSource(packageName), 'utf8');

    const mainApplication = findFile(javaRoot, 'MainApplication.kt');
    if (!mainApplication) throw new Error('MainApplication.kt was not generated by Expo prebuild.');
    let source = fs.readFileSync(mainApplication, 'utf8');
    if (!source.includes('DkdsNativeHostPackage()')) {
      const marker = 'PackageList(this).packages.apply {';
      if (!source.includes(marker)) throw new Error('Cannot register DkdsNativeHostPackage in MainApplication.kt.');
      source = source.replace(marker, `${marker}\n              add(DkdsNativeHostPackage())`);
      fs.writeFileSync(mainApplication, source, 'utf8');
    }
    return mod;
  }]);
};
