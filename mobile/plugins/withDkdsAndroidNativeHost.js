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
import android.content.Context
import android.net.Uri
import android.os.Debug
import android.os.Process
import android.provider.OpenableColumns
import android.provider.DocumentsContract
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.ByteArrayOutputStream
import java.net.InetAddress
import java.net.HttpURLConnection
import java.net.URL
import java.net.ServerSocket
import java.net.Socket
import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject
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


private object DkdsMcpServer {
  private data class Pending(val latch: CountDownLatch = CountDownLatch(1), @Volatile var body: String? = null, @Volatile var ok: Boolean = true)
  @Volatile private var socket: ServerSocket? = null
  @Volatile private var token: String = ""
  @Volatile private var port: Int = 0
  @Volatile private var error: String = ""
  private val pending = ConcurrentHashMap<String, Pending>()

  private fun localAddress(): String {
    try {
      val nets = java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces())
      for (net in nets) if (net.isUp && !net.isLoopback) {
        for (addr in java.util.Collections.list(net.inetAddresses)) if (addr is java.net.Inet4Address && addr.isSiteLocalAddress && !addr.isLoopbackAddress) return addr.hostAddress ?: "127.0.0.1"
      }
    } catch (_: Throwable) {}
    return "127.0.0.1"
  }

  @Synchronized fun start(context: ReactApplicationContext, requestedToken: String): WritableMap {
    if (socket?.isClosed == false && port > 0) return status()
    val cleanToken = requestedToken.trim()
    if (cleanToken.length < 12) throw IllegalArgumentException("MCP Token 至少需要 12 个字符。")
    token = cleanToken; error = ""
    val server = ServerSocket().apply { reuseAddress = true; bind(java.net.InetSocketAddress("0.0.0.0", 8766), 24) }
    socket = server; port = server.localPort
    thread(name = "dkds-mcp-server", isDaemon = true) {
      while (!server.isClosed) {
        try { val client = server.accept(); thread(name = "dkds-mcp-client", isDaemon = true) { serve(context, client) } }
        catch (e: Throwable) { if (!server.isClosed) error = e.message ?: e.javaClass.simpleName }
      }
    }
    return status()
  }

  @Synchronized fun stop() { try { socket?.close() } catch (_: Throwable) {}; socket = null; port = 0; token = ""; pending.values.forEach { it.latch.countDown() }; pending.clear() }
  fun status(): WritableMap {
    val running = socket?.isClosed == false && port > 0
    return WritableNativeMap().apply { putBoolean("running", running); putInt("port", if (running) port else 0); putString("url", if (running) "http://" + localAddress() + ":" + port + "/mcp" else ""); putString("error", error); putString("tokenHeader", "x-dkds-token") }
  }
  fun respond(id: String, ok: Boolean, body: String): Boolean { val row = pending[id] ?: return false; row.ok = ok; row.body = body; row.latch.countDown(); return true }

  private fun serve(context: ReactApplicationContext, client: Socket) {
    client.use { sock ->
      try {
        sock.soTimeout = 20000
        val input = BufferedInputStream(sock.getInputStream())
        val first = readLine(input) ?: return
        val headers = linkedMapOf<String,String>()
        while (true) { val line = readLine(input) ?: break; if (line.isEmpty()) break; val idx=line.indexOf(':'); if(idx>0) headers[line.substring(0,idx).trim().lowercase()] = line.substring(idx+1).trim() }
        val parts=first.split(" "); val method=parts.getOrNull(0) ?: ""; val path=parts.getOrNull(1) ?: ""
        if(method!="POST" || path.substringBefore('?')!="/mcp") return write(sock,404,"{\\\"error\\\":\\\"Not Found\\\"}")
        if(headers["x-dkds-token"] != token) return write(sock,401,"{\\\"error\\\":\\\"Unauthorized\\\"}")
        val length=(headers["content-length"]?.toIntOrNull() ?: 0).coerceAtLeast(0)
        if(length<=0 || length>16*1024*1024) return write(sock,413,"{\\\"error\\\":\\\"Invalid body size\\\"}")
        val bytes=ByteArray(length); var offset=0; while(offset<length){ val n=input.read(bytes,offset,length-offset); if(n<0) break; offset+=n }
        if(offset!=length) return write(sock,400,"{\\\"error\\\":\\\"Incomplete request\\\"}")
        val protocol=headers["mcp-protocol-version"] ?: "2025-06-18"
        if(protocol!="2025-06-18" && protocol!="2025-11-25") return write(sock,400,"{\\\"error\\\":\\\"Unsupported MCP protocol\\\"}")
        val requestId=UUID.randomUUID().toString(); val wait=Pending(); pending[requestId]=wait
        val payload=WritableNativeMap().apply { putString("id",requestId); putString("body",String(bytes,StandardCharsets.UTF_8)); putString("protocolVersion",protocol) }
        val event=WritableNativeMap().apply { putString("event","mcpRequest"); putMap("payload",payload) }
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("DkdsNativeHostEvent",event)
        if(!wait.latch.await(120,TimeUnit.SECONDS)) { pending.remove(requestId); return write(sock,504,"{\\\"error\\\":\\\"Core MCP timeout\\\"}") }
        pending.remove(requestId); val body=wait.body ?: "null"; write(sock, if(wait.ok) 200 else 500, body, protocol)
      } catch (e: Throwable) { error=e.message ?: e.javaClass.simpleName; try { write(sock,500,"{\\\"error\\\":\\\"MCP server error\\\"}") } catch (_: Throwable) {} }
    }
  }
  private fun readLine(input: BufferedInputStream): String? {
    val out=ByteArrayOutputStream(); while(true){ val b=input.read(); if(b<0)return if(out.size()==0)null else String(out.toByteArray(),StandardCharsets.US_ASCII); if(b==10)break; if(b!=13){if(out.size()>8192)throw IllegalArgumentException("HTTP header line too long");out.write(b)} }; return String(out.toByteArray(),StandardCharsets.US_ASCII)
  }
  private fun write(sock: Socket, status: Int, body: String, protocol: String = "2025-06-18") {
    val data=body.toByteArray(StandardCharsets.UTF_8); val phrase=when(status){200->"OK";400->"Bad Request";401->"Unauthorized";404->"Not Found";413->"Payload Too Large";504->"Gateway Timeout";else->"Error"}
    val out=BufferedOutputStream(sock.getOutputStream()); val head="HTTP/1.1 "+status+" "+phrase+"\\r\\nContent-Type: application/json; charset=utf-8\\r\\nContent-Length: "+data.size+"\\r\\nMCP-Protocol-Version: "+protocol+"\\r\\nConnection: close\\r\\n\\r\\n"; out.write(head.toByteArray(StandardCharsets.US_ASCII)); out.write(data); out.flush()
  }
}

class DkdsNativeHostModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  private val openRequest = 7311
  private val saveRequest = 7312
  private val treeRequest = 7313
  private var openPromise: Promise? = null
  private var treePromise: Promise? = null
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


  @ReactMethod fun openDocumentTree(promise: Promise) {
    val activity = reactApplicationContext.currentActivity ?: return promise.reject("E_NO_ACTIVITY", "Android 文件界面当前不可用。")
    if (treePromise != null) return promise.reject("E_PICKER_BUSY", "已有文件夹选择操作正在进行。")
    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply { addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or Intent.FLAG_GRANT_PREFIX_URI_PERMISSION) }
    treePromise = promise
    try { activity.startActivityForResult(intent, treeRequest) } catch (error: Throwable) { treePromise = null; promise.reject("E_OPEN_TREE", error) }
  }

  @ReactMethod fun listDocumentTree(treeUri: String, relativePath: String, promise: Promise) {
    thread(name="dkds-list-tree",isDaemon=true) {
      try { promise.resolve(listTree(Uri.parse(treeUri), relativePath)) } catch (error: Throwable) { promise.reject("E_LIST_TREE", error) }
    }
  }

  @ReactMethod fun smbDiscover(promise: Promise) { thread(name="dkds-smb-discover",isDaemon=true) { try { promise.resolve(DkdsSmbService.discover()) } catch(e:Throwable){ promise.reject("E_SMB_DISCOVER",DkdsSmbService.message(e),e) } } }
  @ReactMethod fun smbListShares(connection: ReadableMap, promise: Promise) { thread(name="dkds-smb-shares",isDaemon=true) { try { promise.resolve(DkdsSmbService.listShares(connection)) } catch(e:Throwable){ promise.reject("E_SMB_SHARES",DkdsSmbService.message(e),e) } } }
  @ReactMethod fun smbList(connection: ReadableMap, path: String, promise: Promise) { thread(name="dkds-smb-list",isDaemon=true) { try { promise.resolve(DkdsSmbService.list(connection,path)) } catch(e:Throwable){ promise.reject("E_SMB_LIST",DkdsSmbService.message(e),e) } } }
  @ReactMethod fun smbRead(connection: ReadableMap, paths: ReadableArray, promise: Promise) { thread(name="dkds-smb-read",isDaemon=true) { try { promise.resolve(DkdsSmbService.read(connection,paths)) } catch(e:Throwable){ promise.reject("E_SMB_READ",DkdsSmbService.message(e),e) } } }

  @ReactMethod fun agentSetSecret(key: String, value: String, promise: Promise) {
    try { setSecret(key,value); promise.resolve(true) } catch(e:Throwable){ promise.reject("E_AGENT_SECRET",e) }
  }
  @ReactMethod fun agentGetSecret(key: String, promise: Promise) {
    try { promise.resolve(getSecret(key)) } catch(e:Throwable){ promise.reject("E_AGENT_SECRET",e) }
  }
  @ReactMethod fun agentHttpJson(endpoint: String, headersJson: String, bodyJson: String, timeoutMs: Double, promise: Promise) {
    thread(name="dkds-agent-http",isDaemon=true) {
      try {
        val url=URL(endpoint); if(url.protocol!="https" && url.protocol!="http") throw IllegalArgumentException("AI Endpoint 必须使用 http/https。")
        val connection=(url.openConnection() as HttpURLConnection).apply { requestMethod="POST"; connectTimeout=timeoutMs.toInt().coerceIn(3000,120000); readTimeout=timeoutMs.toInt().coerceIn(3000,120000); doOutput=true; setRequestProperty("Content-Type","application/json; charset=utf-8"); setRequestProperty("Accept","application/json") }
        val headers=JSONObject(headersJson.ifBlank{"{}"}); val keys=headers.keys(); while(keys.hasNext()){ val key=keys.next(); connection.setRequestProperty(key,headers.optString(key,"")) }
        val bytes=bodyJson.toByteArray(StandardCharsets.UTF_8); connection.outputStream.use{it.write(bytes)}
        val status=connection.responseCode; val stream=if(status in 200..399) connection.inputStream else connection.errorStream; val response=stream?.bufferedReader(StandardCharsets.UTF_8)?.use{it.readText()} ?: ""
        promise.resolve(WritableNativeMap().apply { putBoolean("ok",status in 200..299); putInt("status",status); putString("statusText",connection.responseMessage ?: ""); putString("bodyJson",response.ifBlank{"null"}) })
        connection.disconnect()
      } catch(e:Throwable){ promise.reject("E_AGENT_HTTP",e) }
    }
  }

  @ReactMethod fun mcpStatus(promise: Promise) { promise.resolve(DkdsMcpServer.status()) }
  @ReactMethod fun mcpStart(token: String, promise: Promise) { thread(name="dkds-mcp-start",isDaemon=true){ try{promise.resolve(DkdsMcpServer.start(context,token))}catch(e:Throwable){promise.reject("E_MCP_START",e)} } }
  @ReactMethod fun mcpStop(promise: Promise) { DkdsMcpServer.stop(); promise.resolve(true) }
  @ReactMethod fun mcpRespond(id: String, ok: Boolean, body: String, promise: Promise) { promise.resolve(DkdsMcpServer.respond(id,ok,body)) }

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

    if (requestCode == treeRequest) {
      val promise = treePromise ?: return
      treePromise = null
      val uri = if (resultCode == Activity.RESULT_OK) data?.data else null
      if (uri == null) return promise.resolve(null)
      var persistable=false
      try { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION); persistable=true } catch (_:Throwable) {}
      promise.resolve(WritableNativeMap().apply { putString("uri",uri.toString()); putString("name",treeName(uri)); putBoolean("persistable",persistable) })
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


  private fun treeName(tree: Uri): String = try {
    val doc=DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree)); var name="文件夹"
    context.contentResolver.query(doc,arrayOf(DocumentsContract.Document.COLUMN_DISPLAY_NAME),null,null,null)?.use{c->if(c.moveToFirst()) name=c.getString(0) ?: name}; name
  } catch (_:Throwable) { "文件夹" }

  private fun resolveTreeDirectory(tree: Uri, relativePath: String): Uri {
    var documentId=DocumentsContract.getTreeDocumentId(tree)
    for(part in relativePath.replace('\\\\','/').split('/').filter{it.isNotBlank()}) {
      if(part=="..") throw IllegalArgumentException("文件夹路径无效。")
      val children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,documentId); var next:String?=null
      context.contentResolver.query(children,arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE),null,null,null)?.use{c->while(c.moveToNext()){if(c.getString(1)==part && c.getString(2)==DocumentsContract.Document.MIME_TYPE_DIR){next=c.getString(0);break}}}
      documentId=next ?: throw IllegalArgumentException("找不到文件夹："+part)
    }
    return DocumentsContract.buildDocumentUriUsingTree(tree,documentId)
  }
  private fun listTree(tree: Uri, relativePath: String): WritableArray {
    val dir=resolveTreeDirectory(tree,relativePath); val documentId=DocumentsContract.getDocumentId(dir); val children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,documentId); val rows=WritableNativeArray()
    val projection=arrayOf(DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE,DocumentsContract.Document.COLUMN_SIZE,DocumentsContract.Document.COLUMN_LAST_MODIFIED)
    context.contentResolver.query(children,projection,null,null,null)?.use{c->while(c.moveToNext()){
      val childId=c.getString(0); val name=c.getString(1) ?: childId; val mime=c.getString(2) ?: ""; val directory=mime==DocumentsContract.Document.MIME_TYPE_DIR; val childUri=DocumentsContract.buildDocumentUriUsingTree(tree,childId); val nextPath=(relativePath.trim('/').let{if(it.isEmpty()) name else it+"/"+name})
      rows.pushMap(WritableNativeMap().apply{putString("uri",childUri.toString());putString("name",name);putString("path",nextPath);putBoolean("directory",directory);putString("mimeType",mime);putDouble("size",if(c.isNull(3))0.0 else c.getLong(3).toDouble());putDouble("modifiedAt",if(c.isNull(4))0.0 else c.getLong(4).toDouble());putBoolean("persistable",true)})
    }}
    return rows
  }

  private val secretAlias="DKDSAgentSecretKey"
  private fun secretKey(): SecretKey {
    val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}; val existing=store.getKey(secretAlias,null) as? SecretKey; if(existing!=null)return existing
    val generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore"); generator.init(KeyGenParameterSpec.Builder(secretAlias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); return generator.generateKey()
  }
  private fun setSecret(key:String,value:String){
    val prefs=context.getSharedPreferences("dkds-agent-secrets",Context.MODE_PRIVATE); if(value.isEmpty()){prefs.edit().remove(key).apply();return}; val cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,secretKey()); val payload=cipher.iv+cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8)); prefs.edit().putString(key,Base64.encodeToString(payload,Base64.NO_WRAP)).apply()
  }
  private fun getSecret(key:String):String{
    val raw=context.getSharedPreferences("dkds-agent-secrets",Context.MODE_PRIVATE).getString(key,"") ?: ""; if(raw.isEmpty())return ""; val payload=Base64.decode(raw,Base64.DEFAULT); if(payload.size<13)return ""; val iv=payload.copyOfRange(0,12); val data=payload.copyOfRange(12,payload.size); val cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE,secretKey(),GCMParameterSpec(128,iv)); return String(cipher.doFinal(data),StandardCharsets.UTF_8)
  }

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


function smbJavaSource(packageName) {
  return fs.readFileSync(path.join(__dirname, 'DkdsSmbService.template'), 'utf8').replace(/__PACKAGE__/g, packageName);
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
    fs.writeFileSync(path.join(packageDir, 'DkdsSmbService.java'), smbJavaSource(packageName), 'utf8');

    const appGradle = path.join(mod.modRequest.platformProjectRoot, 'app', 'build.gradle');
    if (fs.existsSync(appGradle)) {
      let gradle = fs.readFileSync(appGradle, 'utf8');
      const dependency = 'implementation \"eu.agno3.jcifs:jcifs-ng:2.1.10\"';
      if (!gradle.includes('eu.agno3.jcifs:jcifs-ng:2.1.10')) {
        const marker = 'dependencies {';
        if (!gradle.includes(marker)) throw new Error('Cannot add jcifs-ng dependency to Android app/build.gradle.');
        gradle = gradle.replace(marker, `${marker}\n    ${dependency}`);
        fs.writeFileSync(appGradle, gradle, 'utf8');
      }
    }

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

module.exports.__test = { kotlinSource, smbJavaSource };
