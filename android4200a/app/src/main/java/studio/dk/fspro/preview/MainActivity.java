package studio.dk.fspro.preview;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;

/** Dedicated, offline FS-Pro UI. The bridge can only discover a 4200A; it cannot source. */
public final class MainActivity extends Activity {
    private static final String TAG = "DKTS-FSPro";
    private static final String APP_ORIGIN = "https://appassets.androidplatform.net/";
    private static final String ENTRY = APP_ORIGIN + "src/4200a-fspro/index.html";
    private static final int PICK_JSON = 7108;
    private WebView webView;
    private ReadonlyInstrumentBridge nativeBridge;
    private ValueCallback<Uri[]> pendingFiles;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .setDomain("appassets.androidplatform.net")
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setLoadsImagesAutomatically(true);
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                Intent picker = new Intent(Intent.ACTION_GET_CONTENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                picker.setType("application/json");
                try {
                    startActivityForResult(Intent.createChooser(picker, "选择 4200A 原始记录"), PICK_JSON);
                    return true;
                } catch (RuntimeException ex) {
                    pendingFiles = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            private boolean allowed(String url) {
                return url != null && url.startsWith(APP_ORIGIN);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !allowed(req.getUrl().toString());
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                String url = req.getUrl().toString();
                if (!allowed(url)) return new WebResourceResponse("text/plain", "UTF-8",
                    403, "Blocked", java.util.Collections.emptyMap(),
                    new ByteArrayInputStream(new byte[0]));
                return loader.shouldInterceptRequest(req.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!ENTRY.equals(url)) return;
                Log.i(TAG, "FS-Pro preview loaded; output permissions disabled");
            }
        });
        nativeBridge = new ReadonlyInstrumentBridge(this, webView);
        webView.addJavascriptInterface(nativeBridge, "DKTSReadOnlyNative");
        setContentView(webView);
        webView.loadUrl(ENTRY);
        hideStatusBar();
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_JSON || pendingFiles == null) return;
        ValueCallback<Uri[]> pending = pendingFiles;
        pendingFiles = null;
        Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
        pending.onReceiveValue(uri == null ? null : new Uri[]{uri});
    }

    @SuppressWarnings("deprecation")
    private void hideStatusBar() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController c = getWindow().getInsetsController();
                if (c != null) {
                    c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    c.hide(WindowInsets.Type.statusBars());
                }
            } else {
                getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    WindowManager.LayoutParams.FLAG_FULLSCREEN);
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
            }
        } catch (RuntimeException ex) {
            Log.w(TAG, "Status bar integration unavailable", ex);
        }
    }

    @Override protected void onResume() {
        super.onResume();
        hideStatusBar();
    }

    @Override protected void onDestroy() {
        if (pendingFiles != null) { pendingFiles.onReceiveValue(null); pendingFiles = null; }
        if (nativeBridge != null) nativeBridge.shutdown();
        if (webView != null) {
            webView.removeJavascriptInterface("DKTSReadOnlyNative");
            webView.destroy();
        }
        super.onDestroy();
    }
}
