package com.dkds.agent;

import org.json.JSONArray;
import org.json.JSONObject;

import javax.net.ssl.HttpsURLConnection;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Separate Android app_process helper. It has no server, no KXCI interface
 * and no arbitrary remote-command facility. Installation is locally opt-in.
 */
public final class DkdsUpdater {
    private static final String OWNER_REPO = "davidkane0526/DK-Data-Studio";
    private static final String PACKAGE_NAME = "com.dk.datastudio";
    private static final String API = "https://api.github.com/repos/" + OWNER_REPO + "/releases?per_page=30";
    private static final File ROOT = new File("/data/adb/dkds-agent");
    private static final File LOG = new File(ROOT, "logs/update.log");
    private static final Pattern TAG = Pattern.compile("4200-preview-[0-9]+");
    private static final Pattern ASSET = Pattern.compile("(DK-Data-Studio-arm64-v8a-release\\.apk|DK-Data-Studio-4200-[a-f0-9]{12}-arm64\\.apk)");
    private static final Pattern DIGEST = Pattern.compile("sha256:[a-f0-9]{64}");
    private static final long MAX_APK = 180L * 1024 * 1024;
    private static final int MAX_JSON = 2 * 1024 * 1024;
    private static final int TIMEOUT = 30000;

    private DkdsUpdater() {}

    private static void message(String text) {
        String line = new java.util.Date() + " " + text.replace('\n',' ').replace('\r',' ') + "\n";
        System.out.print(line);
        try {
            File parent = LOG.getParentFile();
            if (!parent.isDirectory()) parent.mkdirs();
            if (LOG.exists() && LOG.length() > 512000) {
                File old = new File(parent, "update.previous.log");
                if (old.exists()) old.delete();
                LOG.renameTo(old);
            }
            try (FileOutputStream out = new FileOutputStream(LOG, true)) {
                out.write(line.getBytes(StandardCharsets.UTF_8));
            }
        } catch (Exception ignore) {}
    }

    private static String execute(int timeout, String... cmd) throws Exception {
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Thread drainer = new Thread(() -> {
            try (InputStream in = p.getInputStream()) {
                byte[] buffer = new byte[4096];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    if (out.size() < 8192) out.write(buffer, 0, Math.min(n, 8192 - out.size()));
                }
            } catch (Exception ignore) {}
        }, "dkds-updater-capture");
        drainer.setDaemon(true);
        drainer.start();
        if (!p.waitFor(timeout, java.util.concurrent.TimeUnit.SECONDS)) {
            p.destroyForcibly();
            throw new IllegalStateException(cmd[0] + " timeout");
        }
        drainer.join(1000);
        String answer = new String(out.toByteArray(), StandardCharsets.UTF_8).trim();
        if (p.exitValue() != 0) throw new IllegalStateException(cmd[0] + " failed exit=" + p.exitValue() + " " + answer);
        return answer;
    }

    private static boolean trusted(String host) {
        return host.equals("api.github.com") || host.equals("github.com")
            || host.equals("release-assets.githubusercontent.com")
            || host.equals("objects.githubusercontent.com");
    }

    private static HttpsURLConnection open(String urlString) throws Exception {
        URL url = new URL(urlString);
        for (int attempt = 0; attempt < 6; attempt++) {
            if (!url.getProtocol().equals("https") || !trusted(url.getHost()))
                throw new SecurityException("HTTPS host not allowed");
            HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
            con.setInstanceFollowRedirects(false);
            con.setConnectTimeout(10000);
            con.setReadTimeout(TIMEOUT);
            con.setRequestProperty("User-Agent", "DKDS-KernelSU-Agent/0.3");
            con.setRequestProperty("Accept", "application/vnd.github+json");
            int status = con.getResponseCode();
            if (status == 301 || status == 302 || status == 303 || status == 307 || status == 308) {
                String next = con.getHeaderField("Location");
                con.disconnect();
                if (next == null) throw new SecurityException("Redirect without location");
                url = new URL(url, next);
                continue;
            }
            if (status != 200) {
                con.disconnect();
                throw new IllegalStateException("GitHub HTTP " + status);
            }
            return con;
        }
        throw new SecurityException("Too many redirects");
    }

    private static byte[] readLimited(InputStream in, int limit) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] b = new byte[8192];
        for (int n; (n = in.read(b)) >= 0;) {
            if (out.size() + n > limit) throw new SecurityException("Response exceeds size limit");
            out.write(b, 0, n);
        }
        return out.toByteArray();
    }

    private static String hash(File file) throws Exception {
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] bytes = new byte[32768];
            for (int n; (n = in.read(bytes)) >= 0;) sha.update(bytes,0,n);
        }
        StringBuilder h = new StringBuilder();
        for (byte b : sha.digest()) h.append(String.format(Locale.ROOT,"%02x", b & 255));
        return h.toString();
    }

    private static final class Release {
        String tag, url, digest;
        long size;
    }

    private static Release discover() throws Exception {
        HttpsURLConnection con = open(API);
        try (InputStream in = con.getInputStream()) {
            JSONArray releases = new JSONArray(new String(readLimited(in, MAX_JSON), StandardCharsets.UTF_8));
            for (int i = 0; i < releases.length(); i++) {
                JSONObject rel = releases.getJSONObject(i);
                String tag = rel.optString("tag_name", "");
                if (!TAG.matcher(tag).matches() || !rel.optBoolean("prerelease") || rel.optBoolean("draft")) continue;
                JSONArray assets = rel.optJSONArray("assets");
                if (assets == null) continue;
                for (int j = 0; j < assets.length(); j++) {
                    JSONObject a = assets.getJSONObject(j);
                    String name = a.optString("name","");
                    String digest = a.optString("digest","").toLowerCase(Locale.ROOT);
                    String url = a.optString("browser_download_url","");
                    long size = a.optLong("size", 0);
                    if (!ASSET.matcher(name).matches()) continue;
                    if (!DIGEST.matcher(digest).matches()) throw new SecurityException("Release asset lacks SHA-256 digest");
                    if (size < 1024*1024 || size > MAX_APK) throw new SecurityException("Unexpected APK size");
                    URL parsed = new URL(url);
                    String exactPath = "/" + OWNER_REPO + "/releases/download/" + tag + "/" + name;
                    if (!parsed.getProtocol().equals("https") || !parsed.getHost().equals("github.com")
                            || !parsed.getPath().equals(exactPath) || parsed.getQuery()!=null)
                        throw new SecurityException("Unexpected asset URL");
                    Release found = new Release();
                    found.tag = tag;
                    found.url = url;
                    found.digest = digest.substring(7);
                    found.size = size;
                    return found;
                }
            }
        } finally { con.disconnect(); }
        throw new IllegalStateException("No acceptable GitHub 4200 preview APK release");
    }

    private static File installedBaseApk() throws Exception {
        String paths = execute(10,"pm","path",PACKAGE_NAME);
        String[] lines = paths.split("\\r?\\n");
        if (lines.length != 1 || !lines[0].startsWith("package:") || !lines[0].endsWith("/base.apk"))
            throw new IllegalStateException("Split or missing installed APK; automatic update disabled");
        File base = new File(lines[0].substring(8));
        if (!base.isFile()) throw new IllegalStateException("Installed APK unreadable");
        return base;
    }

    private static void copyAndVerify(File input, File dest, String sha) throws Exception {
        try (FileInputStream in = new FileInputStream(input); FileOutputStream out = new FileOutputStream(dest)) {
            byte[] b = new byte[32768];
            for (int n; (n=in.read(b))>=0;) out.write(b,0,n);
            out.getFD().sync();
        }
        if (!hash(dest).equals(sha)) throw new SecurityException("Backup digest verification failed");
    }

    private static void download(Release rel, File dest) throws Exception {
        HttpsURLConnection con = open(rel.url);
        try (InputStream in = con.getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
            long nTotal = 0;
            byte[] b = new byte[32768];
            for (int n; (n = in.read(b))>=0;) {
                nTotal += n;
                if (nTotal>MAX_APK) throw new SecurityException("APK too large");
                out.write(b, 0, n);
            }
            out.getFD().sync();
            if (nTotal != rel.size || !hash(dest).equals(rel.digest))
                throw new SecurityException("APK size or SHA-256 mismatch");
        } finally { con.disconnect(); }
    }

    private static void run(String mode) throws Exception {
        if (!"check".equals(mode) && !"install".equals(mode)) throw new IllegalArgumentException("check or install");
        File previous = installedBaseApk();
        String before = hash(previous);
        Release release = discover();
        if (before.equals(release.digest)) {
            message("CURRENT " + release.tag + " installed checksum matches");
            return;
        }
        message("AVAILABLE " + release.tag + " expected_sha256=" + release.digest);
        if (mode.equals("check")) return;

        // Local user opt-in must be exact. The daemon defaults to observe-only.
        File allow = new File(ROOT, "update.mode");
        String setting;
        try (InputStream in = new FileInputStream(allow)) {
            setting = new String(readLimited(in, 32), StandardCharsets.US_ASCII).trim();
        }
        if (!setting.equals("install"))
            throw new SecurityException("Automatic installation disabled; update.mode must equal install");

        File staging = new File(ROOT, "candidate.part");
        File candidate = new File(ROOT, "candidate.apk");
        File backup = new File(ROOT, "previous-base.apk");
        try {
            download(release, staging);
            if (candidate.exists() && !candidate.delete()) throw new IllegalStateException("Cannot replace staged APK");
            if (!staging.renameTo(candidate)) throw new IllegalStateException("Cannot stage verified APK");
            if (backup.exists() && !backup.delete()) throw new IllegalStateException("Cannot replace previous backup");
            copyAndVerify(previous, backup, before);
            message("BACKUP previous-base.apk sha256=" + before);
            message("INSTALLING " + release.tag + " using Package Manager signing verification");
            String result = execute(180,"pm","install","-r",candidate.getAbsolutePath());
            if (!result.contains("Success")) throw new IllegalStateException("Package Manager did not confirm success");
            String after = hash(installedBaseApk());
            if (!after.equals(release.digest)) throw new SecurityException("Installed checksum mismatch");
            message("INSTALLED " + release.tag + " successfully; main UI still requires independent health validation");
        } finally {
            if (staging.exists()) staging.delete();
        }
    }

    public static void main(String[] args) {
        try {
            if (args.length != 1) throw new IllegalArgumentException("Usage: check|install");
            if (!ROOT.isDirectory()) throw new IllegalStateException("Agent root missing");
            run(args[0]);
        } catch (Throwable error) {
            message("FAILED " + error.getClass().getSimpleName() + ": " + error.getMessage());
            System.exit(1);
        }
    }
}
