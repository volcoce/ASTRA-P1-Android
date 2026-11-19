package org.astra.publicapp;

import android.app.Activity;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
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
 * Conteneur natif minimal : un seul domaine HTTPS virtuel, aucune permission Internet.
 * Le JS ne reçoit PAS de pont natif (@JavascriptInterface), ce qui limite l'exposition.
 */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String BASE = "https://" + HOST + "/assets/";
    private WebView webView;

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

        getWindow().setStatusBarColor(Color.rgb(248, 245, 252));
        getWindow().setNavigationBarColor(Color.rgb(248, 245, 252));
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        );

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(248, 245, 252));
        // Android 15+ impose l'edge-to-edge : réserver les zones des barres système.
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout()
                );
                root.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                root.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // requis pour l'interface ASTRA
        settings.setDomStorageEnabled(true); // journal local
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
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isLocalAsset(request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocalAsset(uri)) return forbidden();
                WebResourceResponse response = loader.shouldInterceptRequest(uri);
                return response != null ? response : forbidden();
            }
        });
        webView.loadUrl(BASE + "index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
