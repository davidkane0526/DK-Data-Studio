package studio.dk.fspro.preview;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Transport has NO generic write/query operation; only IDN/OPT in connect(). */
public final class ReadonlyInstrumentBridge {
    private static final String APP_ENTRY =
        "https://appassets.androidplatform.net/src/4200a-fspro/index.html";
    private static final String IDN = "*IDN?\0";
    private static final String OPT = "*OPT?\0";
    private static final int MAX_RESPONSE = 65536;
    private static final java.util.regex.Pattern HOST = java.util.regex.Pattern.compile(
        "^[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*$");
    private static final java.util.regex.Pattern IPV4 = java.util.regex.Pattern.compile(
        "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$");
    private final Context context;
    private final WebView view;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile boolean stopped = false;
    private Socket socket;
    private String idn = "";
    private String options = "";
    private JSONObject route = new JSONObject();
    private String connectionType = "";

    ReadonlyInstrumentBridge(Context context, WebView view) {
        this.context = context.getApplicationContext();
        this.view = view;
    }

    @JavascriptInterface
    public void request(String serialized) {
        if (serialized == null || serialized.length() > 8192 || stopped) return;
        main.post(() -> {
            if (stopped || !APP_ENTRY.equals(view.getUrl())) return;
            worker.execute(() -> {
                int id = -1;
                JSONObject answer = new JSONObject();
                try {
                    JSONObject input = new JSONObject(serialized);
                    id = input.getInt("id");
                    String op = input.getString("op");
                    JSONObject arguments = input.optJSONObject("payload");
                    if (arguments == null) arguments = new JSONObject();
                    JSONObject value;
                    switch (op) {
                        case "connect": value = connect(arguments); break;
                        case "disconnect": value = disconnect(); break;
                        case "status": value = status(); break;
                        default: throw new SecurityException("Operation not allowed by read-only 4200A bridge");
                    }
                    answer.put("ok", true);
                    answer.put("value", value);
                } catch (Exception ex) {
                    try {
                        answer.put("ok", false);
                        answer.put("error", String.valueOf(ex.getMessage()).split("\n")[0]);
                    } catch (Exception ignored) {}
                }
                try { answer.put("id", id); } catch (Exception ignored) {}
                final String result = answer.toString();
                main.post(() -> {
                    if (stopped || !APP_ENTRY.equals(view.getUrl())) return;
                    view.evaluateJavascript(
                        "window.DK4200AndroidReceive?.(" + JSONObject.quote(result) + ")", null);
                });
            });
        });
    }

    private static String requireHost(String hostname) {
        if (hostname == null || hostname.length() < 1 || hostname.length() > 253 ||
            !HOST.matcher(hostname).matches())
            throw new IllegalArgumentException("Invalid instrument IPv4 or DNS hostname");
        if (IPV4.matcher(hostname).matches()) requireIpv4(hostname);
        return hostname;
    }

    private static void requireIpv4(String value) {
        if (!IPV4.matcher(value).matches())
            throw new IllegalArgumentException("Local address must be IPv4");
        for (String part : value.split("\\.")) {
            int n = Integer.parseInt(part);
            if (n < 0 || n > 255) throw new IllegalArgumentException("Invalid IPv4 octet");
        }
    }

    private static int integer(JSONObject args, String key, int fallback, int min, int max) throws Exception {
        int n = args.has(key) ? args.getInt(key) : fallback;
        if (n < min || n > max) throw new IllegalArgumentException(key + " out of range");
        return n;
    }

    private boolean live() {
        return socket != null && socket.isConnected() && !socket.isClosed();
    }

    private void closeActive() {
        Socket old = socket;
        socket = null;
        idn = "";
        options = "";
        route = new JSONObject();
        connectionType = "";
        if (old != null) try { old.close(); } catch (Exception ignored) {}
    }

    private static byte[] readResponse(Socket sock) throws Exception {
        InputStream input = sock.getInputStream();
        ByteArrayOutputStream output = new ByteArrayOutputStream(512);
        while (output.size() < MAX_RESPONSE) {
            int b = input.read();
            if (b < 0) throw new IllegalStateException("KXCI connection closed during reply");
            if (b == 0) return output.toByteArray();
            output.write(b);
        }
        throw new IllegalStateException("KXCI reply exceeds byte limit");
    }

    private static byte[] fixedRead(Socket sock, String command) throws Exception {
        if (!IDN.equals(command) && !OPT.equals(command))
            throw new SecurityException("Unapproved KXCI command");
        OutputStream output = sock.getOutputStream();
        output.write(command.getBytes(StandardCharsets.US_ASCII));
        output.flush();
        return readResponse(sock);
    }

    private static JSONObject frame(String command, byte[] bytes, int index) throws Exception {
        return new JSONObject()
            .put("command", command)
            .put("payloadBase64", Base64.getEncoder().encodeToString(bytes))
            .put("readOrder", index);
    }

    private static boolean hasLinkLocal(LinkProperties info) {
        if (info == null) return false;
        for (LinkAddress addr : info.getLinkAddresses()) {
            if (addr.getAddress() != null && addr.getAddress().getHostAddress().startsWith("169.254."))
                return true;
        }
        return false;
    }

    private static int routePriority(ConnectivityManager manager, Network network, boolean targetLinkLocal) {
        NetworkCapabilities c = manager.getNetworkCapabilities(network);
        LinkProperties p = manager.getLinkProperties(network);
        int score = 0;
        if (c != null && c.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) score += 100;
        if (c != null && c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) score += 30;
        if (targetLinkLocal && hasLinkLocal(p)) score += 120;
        return score;
    }

    private JSONObject connect(JSONObject args) throws Exception {
        closeActive();
        String host = requireHost(args.optString("host", "169.254.111.118").trim());
        int port = integer(args,"port",1225,1,65535);
        int timeout = integer(args,"timeoutMs",5000,250,30000);
        String mode = args.optString("networkMode","auto").trim().toLowerCase(Locale.ROOT);
        if (!mode.equals("auto") && !mode.equals("ethernet") &&
            !mode.equals("wifi") && !mode.equals("interface"))
            throw new IllegalArgumentException("Unknown Android network mode");
        String iface = args.optString("interfaceName","").trim();
        String localAddress = args.optString("localAddress","").trim();
        String serial = args.optString("expectedSerial","").trim();
        if (iface.length() > 100 || serial.length() > 128)
            throw new IllegalArgumentException("Invalid interface or instrument serial");
        if (mode.equals("interface") && iface.isEmpty())
            throw new IllegalArgumentException("Select a network interface");
        if (!localAddress.isEmpty()) requireIpv4(localAddress);
        ConnectivityManager manager = (ConnectivityManager)
            context.getSystemService(Context.CONNECTIVITY_SERVICE);
        boolean linkLocal = host.startsWith("169.254.");
        List<Network> candidates = new ArrayList<>();
        if (manager != null) {
            for (Network net : manager.getAllNetworks()) {
                NetworkCapabilities caps = manager.getNetworkCapabilities(net);
                LinkProperties link = manager.getLinkProperties(net);
                boolean ethernet = caps != null &&
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET);
                boolean wifi = caps != null &&
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                String name = link == null ? "" : link.getInterfaceName();
                boolean include = (mode.equals("auto") && (ethernet || wifi)) ||
                    (mode.equals("ethernet") && ethernet) ||
                    (mode.equals("wifi") && wifi) ||
                    (mode.equals("interface") && iface.equals(name));
                if (include) candidates.add(net);
            }
            if (mode.equals("auto")) candidates.sort((a,b) ->
                Integer.compare(routePriority(manager,b,linkLocal),routePriority(manager,a,linkLocal)));
        }
        if (!mode.equals("auto") && candidates.isEmpty())
            throw new IllegalStateException("Requested Android Network was not available");
        String errors = "";
        for (int index=0; index<=candidates.size(); index++) {
            if (index == candidates.size() && !mode.equals("auto")) break;
            Network network = index<candidates.size()?candidates.get(index):null;
            Socket attempt = null;
            try {
                attempt = network==null?new Socket():network.getSocketFactory().createSocket();
                attempt.setTcpNoDelay(true);
                attempt.setSoTimeout(timeout);
                if (!localAddress.isEmpty()) attempt.bind(new InetSocketAddress(
                    InetAddress.getByName(localAddress),0));
                attempt.connect(new InetSocketAddress(host,port),Math.min(timeout,2500));
                byte[] idBytes = fixedRead(attempt,IDN);
                String identity = new String(idBytes,StandardCharsets.UTF_8).trim();
                String[] parts = identity.split(",",-1);
                if (parts.length < 4 || !parts[0].trim().equals("KEITHLEY INSTRUMENTS") ||
                    !parts[1].trim().equals("KI4200A") ||
                    (!serial.isEmpty() && !parts[2].trim().equals(serial)))
                    throw new SecurityException("4200A identity or expected serial mismatch");
                byte[] optBytes = fixedRead(attempt,OPT);
                String optText = new String(optBytes,StandardCharsets.UTF_8).trim();
                if (optText.isEmpty() || optText.split(",",-1).length>8)
                    throw new IllegalStateException("Invalid *OPT? module inventory");
                socket = attempt; idn = identity; options = optText;
                connectionType = network==null?"system-routing":"network-bound";
                LinkProperties details = network==null?null:manager.getLinkProperties(network);
                route = new JSONObject()
                    .put("localAddress",attempt.getLocalAddress().getHostAddress())
                    .put("remoteAddress",host)
                    .put("remotePort",port)
                    .put("interfaceName",details==null?"":details.getInterfaceName())
                    .put("routeStrategy",connectionType);
                JSONArray frames = new JSONArray()
                    .put(frame("*IDN?",idBytes,0))
                    .put(frame("*OPT?",optBytes,1));
                return new JSONObject()
                    .put("schema","dkts.4200a.readonly-discovery.v2")
                    .put("verifiedIdentity",true).put("connected",true)
                    .put("idn",identity).put("options",optText)
                    .put("route",route).put("rawFrames",frames)
                    .put("executionAuthorized",false);
            } catch (Exception ex) {
                if (attempt != null) try { attempt.close(); } catch (Exception ignored) {}
                String message = String.valueOf(ex.getMessage());
                // A device identity mismatch is a hard stop, not a reason to try another network.
                if (ex instanceof SecurityException) throw ex;
                errors += (errors.isEmpty()?"":" | ") + message;
            }
        }
        throw new IllegalStateException("4200A connection failed: "+errors.substring(0,Math.min(250,errors.length())));
    }

    private JSONObject disconnect() throws Exception {
        boolean existed = live();
        closeActive();
        return new JSONObject().put("connected",false).put("wasConnected",existed);
    }

    private JSONObject status() throws Exception {
        return new JSONObject()
            .put("connected",live())
            .put("idn",live()?idn:JSONObject.NULL)
            .put("options",live()?options:JSONObject.NULL)
            .put("route",live()?route:JSONObject.NULL)
            .put("executionAuthorized",false);
    }

    void shutdown() {
        stopped = true;
        closeActive();
        worker.shutdownNow();
    }
}
