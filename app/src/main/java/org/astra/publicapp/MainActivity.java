package org.astra.publicapp;

import android.app.Activity;
import android.annotation.SuppressLint;
import android.webkit.JavascriptInterface;
import android.window.OnBackInvokedDispatcher;
import android.content.pm.ApplicationInfo;
import android.content.Intent;
import android.graphics.Color;
import android.content.res.Configuration;
import android.graphics.Insets;
import android.view.WindowInsetsController;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/**
 * Conteneur natif minimal : actifs locaux HTTPS, réseau autorisé seulement pour le géocodage de villes.
 * Le seul pont natif active le contraste des icônes système. Aucun accès aux fichiers, comptes ou réseau.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/assets/";
    private WebView webView;
    private FrameLayout root;
    // Raw physical pixels from Android, converted to CSS pixels for the WebView.
    private int insetTop, insetBottom, insetLeft, insetRight;

    private static final int LIGHT_BAR_FLAGS =
            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;

    private void applySystemBarTheme(boolean dark) {
        int background = dark ? Color.rgb(16, 31, 42) : Color.rgb(248, 239, 213);
        if (root != null) root.setBackgroundColor(background);
        if (webView != null) webView.setBackgroundColor(background);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(dark ? 0 : LIGHT_BAR_FLAGS, LIGHT_BAR_FLAGS);
            }
        } else {
            int layout = View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            getWindow().getDecorView().setSystemUiVisibility(layout | (dark ? 0 : light));
        }
    }

    /** Keep the unpadded WebView edge-to-edge, but tell the page where NOT to
     * place text and touch targets. Do not duplicate CSS env() insets. */
    private void publishSafeArea() {
        if (webView == null || !(BASE + "index.html").equals(webView.getUrl())) return;
        float density = getResources().getDisplayMetrics().density;
        int top = (int) Math.ceil(insetTop / density);
        int bottom = (int) Math.ceil(insetBottom / density);
        int left = (int) Math.ceil(insetLeft / density);
        int right = (int) Math.ceil(insetRight / density);
        webView.evaluateJavascript(
                "(function(){var el=document.documentElement;if(!el)return;"
                + "el.classList.add('astra-native-webview');"
                + "el.style.setProperty('--astra-native-inset-top','" + top + "px');"
                + "el.style.setProperty('--astra-native-inset-bottom','" + bottom + "px');"
                + "el.style.setProperty('--astra-native-inset-left','" + left + "px');"
                + "el.style.setProperty('--astra-native-inset-right','" + right + "px');"
                + "})();", null);
    }

    /** Constrained native styling channel. It never reads user data or files. */
    private final class NativeUiBridge {
        @JavascriptInterface
        public void setDarkMode(boolean dark) {
            runOnUiThread(() -> {
                if (webView != null && (BASE + "index.html").equals(webView.getUrl())) {
                    applySystemBarTheme(dark);
                }
            });
        }
    }

    private static boolean isAttributionLink(Uri uri) {
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return false;
        String host = uri.getHost();
        return "open-meteo.com".equalsIgnoreCase(host) || "www.open-meteo.com".equalsIgnoreCase(host);
    }

    private static boolean isGeocodingApi(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && "geocoding-api.open-meteo.com".equalsIgnoreCase(uri.getHost())
                && "/v1/search".equals(uri.getPath())
                && uri.getUserInfo() == null;
    }

    private static boolean isLocalAsset(Uri url) {
        return url != null
                && "https".equalsIgnoreCase(url.getScheme())
                && HOST.equalsIgnoreCase(url.getHost())
                && url.getEncodedPath() != null
                && url.getEncodedPath().startsWith("/assets/")
                && !url.getEncodedPath().contains("..")
                && !url.getEncodedPath().contains("%2e")
                && !url.getEncodedPath().contains("%2E");
    }

    private static WebResourceResponse forbidden() {
        return new WebResourceResponse(
                "text/plain", "UTF-8", 403, "Forbidden",
                Collections.singletonMap("Cache-Control", "no-store"),
                new ByteArrayInputStream("Blocked".getBytes(StandardCharsets.UTF_8))
        );
    }


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw the actual WebView behind the notch/status bar AND the three
        // navigation buttons. Android 15+ enforces this; make older devices match.
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            );
        }
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setNavigationBarContrastEnforced(false); // no three-button scrim
            getWindow().setStatusBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams params = getWindow().getAttributes();
            params.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                    ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(params);
        }
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        root = new FrameLayout(this);
        webView = new WebView(this);
        boolean dark = (getResources().getConfiguration().uiMode
                & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        applySystemBarTheme(dark);

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                insetLeft = safe.left;
                insetTop = safe.top;
                insetRight = safe.right;
                insetBottom = safe.bottom;

                // The keyboard is a separate inset: resize the WebView, not the
                // system-bar margins. Pass IME=0 to WebView to prevent double resize.
                int imeBottom = insets.isVisible(WindowInsets.Type.ime())
                        ? insets.getInsets(WindowInsets.Type.ime()).bottom : 0;
                root.setPadding(0, 0, 0, imeBottom);
                publishSafeArea();
                // JS/CSS has already received the bar and cutout dimensions.
                // Zero these types for the child WebView, preserving dispatch.
                // Otherwise recent WebViews can apply a second safe-area offset.
                return new WindowInsets.Builder(insets)
                        .setInsets(WindowInsets.Type.systemBars()
                                | WindowInsets.Type.displayCutout(), Insets.NONE)
                        .setInsets(WindowInsets.Type.ime(), Insets.NONE).build();
            }
            // adjustResize handles the keyboard on Android 8-10.
            root.setPadding(0, 0, 0, 0);
            insetLeft = insets.getSystemWindowInsetLeft();
            insetTop = insets.getSystemWindowInsetTop();
            insetRight = insets.getSystemWindowInsetRight();
            insetBottom = insets.getStableInsetBottom();
            if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                android.view.DisplayCutout cutout = insets.getDisplayCutout();
                insetLeft = Math.max(insetLeft, cutout.getSafeInsetLeft());
                insetTop = Math.max(insetTop, cutout.getSafeInsetTop());
                insetRight = Math.max(insetRight, cutout.getSafeInsetRight());
                insetBottom = Math.max(insetBottom, cutout.getSafeInsetBottom());
            }
            publishSafeArea();
            // CSS owns the bar padding here too. Keep notification delivery
            // but clear duplicate insets before they reach older WebViews.
            return insets.replaceSystemWindowInsets(0, 0, 0, 0);
        });

        webView.addJavascriptInterface(new NativeUiBridge(), "ASTRA_NATIVE_UI");
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // requis pour l'interface ASTRA
        settings.setDomStorageEnabled(true); // journal local
        // Honor viewport width=device-width rather than a legacy desktop viewport.
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setSafeBrowsingEnabled(true);
        webView.setWebChromeClient(new WebChromeClient()); // confirm() pour restaurer le journal

        boolean debugging = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debugging);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if ((BASE + "index.html").equals(url)) publishSafeArea();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isAttributionLink(uri)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (Exception ignored) { /* Browser not installed; do not navigate in the WebView. */ }
                    return true;
                }
                return !isLocalAsset(uri);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // Autoriser seulement la recherche explicite d'une ville via HTTPS.
                // Les navigations externes restent bloquées ci-dessus.
                if ("GET".equalsIgnoreCase(request.getMethod()) && isGeocodingApi(uri)) return null;
                if (!isLocalAsset(uri)) return forbidden();
                WebResourceResponse response = loader.shouldInterceptRequest(uri);
                return response != null ? response : forbidden();
            }
        });
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::navigateBackOrFinish
            );
        }
        webView.loadUrl(BASE + "index.html");
    }

    private void navigateBackOrFinish() {
        final WebView page = webView;
        if (page == null) { finish(); return; }
        // ASTRA is a single-page UI. WebView history alone cannot close a
        // sheet, exit zoom, or return from Explorer: ask that UI first.
        if ((BASE + "index.html").equals(page.getUrl())) {
            page.evaluateJavascript(
                    "(function(){try{return Boolean(window.ASTRA_HANDLE_BACK && window.ASTRA_HANDLE_BACK())}catch(e){return false}})()",
                    handled -> {
                        if ("true".equals(handled) || isFinishing()) return;
                        if (webView != null && webView.canGoBack()) webView.goBack();
                        else finish();
                    }
            );
        } else if (page.canGoBack()) {
            page.goBack();
        } else {
            finish();
        }
    }

    @SuppressLint("GestureBackNavigation")
    @Override
    public void onBackPressed() {
        navigateBackOrFinish();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        root = null;
        super.onDestroy();
    }
}