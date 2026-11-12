package com.soliterax.kentustasi;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.DisplayCutout;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Kent Ustası - oyun HTML5 canvas ile yazıldı ve uygulama içine gömülü
 * (assets/game). Bu Activity oyunu tam ekran bir WebView'da çalıştırır,
 * kaydı uygulama dosyalarına yazar ve geri tuşu / duraklatma olaylarını
 * oyuna iletir. İnternet izni gerekmez.
 */
public class MainActivity extends Activity {

    private static final String GAME_URL = "file:///android_asset/game/index.html";
    private static final String SAVE_FILE = "kentustasi_save.json";

    private WebView web;
    private boolean pageReady = false;
    private int insetTop, insetRight, insetBottom, insetLeft;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#16324A"));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setHapticFeedbackEnabled(false);
        web.setOnLongClickListener(v -> true); // metin seçme menüsünü kapat
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(false);

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // oyun dışına gezinmeye izin verme
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                pushInsets();
            }
        });

        web.setOnApplyWindowInsetsListener((v, insets) -> {
            readInsets(insets);
            pushInsets();
            return insets;
        });

        web.loadUrl(GAME_URL);
        applyImmersive();
    }

    /** Çentik / delik kamera boşluklarını oyuna CSS değişkeni olarak aktarır. */
    private void readInsets(WindowInsets insets) {
        insetTop = insetRight = insetBottom = insetLeft = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && insets != null) {
            DisplayCutout c = insets.getDisplayCutout();
            if (c != null) {
                insetTop = c.getSafeInsetTop();
                insetRight = c.getSafeInsetRight();
                insetBottom = c.getSafeInsetBottom();
                insetLeft = c.getSafeInsetLeft();
            }
        }
    }

    private void pushInsets() {
        if (!pageReady) return;
        float d = getResources().getDisplayMetrics().density;
        String js = String.format(Locale.US,
                "window.CB&&CB.setInsets&&CB.setInsets(%.1f,%.1f,%.1f,%.1f)",
                insetTop / d, insetRight / d, insetBottom / d, insetLeft / d);
        web.evaluateJavascript(js, null);
    }

    @SuppressWarnings("deprecation")
    private void applyImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) applyImmersive();
    }

    @Override
    protected void onPause() {
        if (pageReady) web.evaluateJavascript("window.CB&&CB.main&&CB.main.pause()", null);
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        if (pageReady) web.evaluateJavascript("window.CB&&CB.main&&CB.main.resume()", null);
        applyImmersive();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidBridge");
            web.destroy();
        }
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (!pageReady) { super.onBackPressed(); return; }
        // önce oyuna sor: açık panel / mod varsa onu kapatsın
        web.evaluateJavascript("(window.CB&&CB.onBack)?CB.onBack():false", value -> {
            if (!"true".equals(value)) confirmExit();
        });
    }

    private void confirmExit() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.exit_title)
                .setMessage(R.string.exit_message)
                .setPositiveButton(R.string.exit_yes, (d, i) -> {
                    web.evaluateJavascript("window.CB&&CB.save&&CB.save.write()", v -> finish());
                })
                .setNegativeButton(R.string.exit_no, (d, i) -> applyImmersive())
                .setOnDismissListener(d -> applyImmersive())
                .show();
    }

    /** JavaScript tarafından çağrılan köprü: kalıcı kayıt ve titreşim. */
    private final class Bridge {

        @JavascriptInterface
        public synchronized void saveGame(String json) {
            File target = new File(getFilesDir(), SAVE_FILE);
            if (json == null || json.isEmpty()) {
                //noinspection ResultOfMethodCallIgnored
                target.delete();
                return;
            }
            // önce geçici dosyaya yaz, sonra yer değiştir: yarım kalan yazma kaydı bozmasın
            File tmp = new File(getFilesDir(), SAVE_FILE + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) {
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            } catch (Exception e) {
                return;
            }
            if (!tmp.renameTo(target)) {
                //noinspection ResultOfMethodCallIgnored
                target.delete();
                //noinspection ResultOfMethodCallIgnored
                tmp.renameTo(target);
            }
        }

        @JavascriptInterface
        public synchronized String loadGame() {
            File f = new File(getFilesDir(), SAVE_FILE);
            if (!f.exists()) return "";
            try (FileInputStream in = new FileInputStream(f)) {
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
                return new String(bos.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                return "";
            }
        }

        @SuppressWarnings("deprecation")
        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (v == null || !v.hasVibrator()) return;
                int d = Math.max(1, Math.min(ms, 200));
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(d, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(d);
                }
            } catch (Exception ignored) {
                // titreşim isteğe bağlı
            }
        }
    }
}
