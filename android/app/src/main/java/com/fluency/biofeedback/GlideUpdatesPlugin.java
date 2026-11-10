package com.fluency.biofeedback;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "GlideUpdates")
public class GlideUpdatesPlugin extends Plugin {
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private static final String RELEASE_API = "https://api.github.com/repos/baranaikooo/glide/releases/latest";
    private static final Pattern RELEASE_TAG = Pattern.compile("^v1\\.0\\.(\\d+)$");
    private static final Pattern APK_URL = Pattern.compile(
        "^https://github\\.com/baranaikooo/glide/releases/download/v1\\.0\\.\\d+/glide-native\\.apk$"
    );

    private PackageInfo installed() throws Exception {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
    }

    @PluginMethod
    public void getVersion(PluginCall call) {
        try {
            PackageInfo info = installed();
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            result.put("versionCode", PackageInfoCompat.getLongVersionCode(info));
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Nepodarilo sa zistiť verziu aplikácie.", error);
        }
    }

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        // Native networking avoids WebView CORS differences and never blocks the UI thread.
        network.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(RELEASE_API).openConnection();
                connection.setConnectTimeout(8000);
                connection.setReadTimeout(8000);
                connection.setUseCaches(false);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "Glide-Android-Updater");
                int status = connection.getResponseCode();
                if (status != 200) throw new Exception("Release server returned " + status);
                ByteArrayOutputStream body = new ByteArrayOutputStream();
                try (InputStream stream = connection.getInputStream()) {
                    byte[] buffer = new byte[4096];
                    int count;
                    while ((count = stream.read(buffer)) != -1) {
                        body.write(buffer, 0, count);
                        if (body.size() > 1024 * 1024) throw new Exception("Release response too large");
                    }
                }
                JSONObject release = new JSONObject(body.toString(StandardCharsets.UTF_8.name()));
                JSObject result = new JSObject();
                result.put("available", false);
                Matcher tag = RELEASE_TAG.matcher(release.optString("tag_name"));
                if (!release.optBoolean("draft") && !release.optBoolean("prerelease") && tag.matches()) {
                    long build = Long.parseLong(tag.group(1));
                    long versionCode = 100 + build;
                    JSONArray assets = release.optJSONArray("assets");
                    if (assets != null && versionCode > PackageInfoCompat.getLongVersionCode(installed())) {
                        for (int i = 0; i < assets.length(); i++) {
                            JSONObject asset = assets.getJSONObject(i);
                            String url = asset.optString("browser_download_url");
                            if ("glide-native.apk".equals(asset.optString("name")) &&
                                "uploaded".equals(asset.optString("state")) &&
                                asset.optLong("size") > 0 && APK_URL.matcher(url).matches() &&
                                url.contains("/" + release.getString("tag_name") + "/")) {
                                result.put("available", true);
                                result.put("versionCode", versionCode);
                                result.put("versionName", "1.0." + build);
                                result.put("downloadUrl", url);
                                break;
                            }
                        }
                    }
                }
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Aktualizáciu teraz nemožno skontrolovať. Skús to s pripojením na internet.", error);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void downloadUpdate(PluginCall call) {
        String url = call.getString("url", "");
        if (!APK_URL.matcher(url).matches()) {
            call.reject("Neplatná adresa aktualizácie.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            try {
                // Download the exact release asset directly; no GitHub navigation is needed.
                getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                call.resolve();
            } catch (Exception error) {
                call.reject("Nepodarilo sa otvoriť stiahnutie aktualizácie.", error);
            }
        });
    }

    @Override
    protected void handleOnResume() {
        notifyListeners("resume", new JSObject());
    }

    @Override
    protected void handleOnDestroy() {
        network.shutdownNow();
    }
}
