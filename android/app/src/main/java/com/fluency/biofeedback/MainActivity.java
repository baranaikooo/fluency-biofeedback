package com.fluency.biofeedback;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSION_REQUEST_RECORD_AUDIO = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Vyžiadanie systémového oprávnenia pre mikrofón pri štarte aplikácie
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.MODIFY_AUDIO_SETTINGS
            }, PERMISSION_REQUEST_RECORD_AUDIO);
        }

        // 2. Nastavenie AudioManagera pre správne smerovanie WebAudio do slúchadiel / reproduktorov
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.setMode(AudioManager.MODE_NORMAL);
            }
        } catch (Exception ignored) {}

        // 3. Spracovanie Deep Linku (návrat z Google overenia)
        handleDeepLinkIntent(getIntent(), 0);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent, 0);
    }

    private void handleDeepLinkIntent(Intent intent, final int attempt) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }
        Uri data = intent.getData();
        if (data == null) {
            return;
        }

        final String uriStr = data.toString();
        dispatchDeepLinkToWeb(uriStr, attempt);
    }

    private void dispatchDeepLinkToWeb(final String uriStr, final int attempt) {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().post(new Runnable() {
                @Override
                public void run() {
                    String quoted = JSONObject.quote(uriStr);
                    String js = "(function() { " +
                        "if (typeof window.handleNativeDeepLink === 'function') { " +
                        "  window.handleNativeDeepLink(" + quoted + "); " +
                        "} else { " +
                        "  window.__pendingDeepLink = " + quoted + "; " +
                        "} " +
                        "})();";
                    getBridge().getWebView().evaluateJavascript(js, null);
                }
            });
        } else if (attempt < 15) {
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    dispatchDeepLinkToWeb(uriStr, attempt + 1);
                }
            }, 250);
        }
    }
}
