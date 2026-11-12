package com.fluency.biofeedback;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "GlideAuthStorage")
public class GlideAuthStoragePlugin extends Plugin {
    private static final String ALIAS = "glide-auth-storage-v1";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE);
    }

    private String key(PluginCall call) {
        String key = call.getString("key", "");
        if (!key.matches("sb-[a-z0-9]+-auth-token(?:-user|-code-verifier)?")) {
            throw new IllegalArgumentException("Invalid session key");
        }
        return key;
    }

    private SecretKey secretKey(boolean create) throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        SecretKey existing = (SecretKey) store.getKey(ALIAS, null);
        if (existing != null || !create) return existing;
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build());
        return generator.generateKey();
    }

    @PluginMethod
    public synchronized void get(PluginCall call) {
        try {
            String key = key(call);
            String stored = preferences().getString(key, null);
            JSObject result = new JSObject();
            SecretKey secret = stored == null ? null : secretKey(false);
            if (secret != null) {
                String[] parts = stored.split(":", 2);
                Cipher cipher = Cipher.getInstance(TRANSFORMATION);
                cipher.init(Cipher.DECRYPT_MODE, secret, new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
                cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
                byte[] value = cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP));
                result.put("value", new String(value, StandardCharsets.UTF_8));
            } else if (stored != null && !preferences().edit().remove(key).commit()) {
                throw new IllegalStateException("Could not remove restored ciphertext");
            }
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not read Glide session");
        }
    }

    @PluginMethod
    public synchronized void set(PluginCall call) {
        try {
            String key = key(call);
            String value = call.getString("value");
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey(true));
            cipher.updateAAD(key.getBytes(StandardCharsets.UTF_8));
            String stored = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":"
                    + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!preferences().edit().putString(key, stored).commit()) {
                throw new IllegalStateException("Could not save ciphertext");
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not save Glide session");
        }
    }

    @PluginMethod
    public synchronized void remove(PluginCall call) {
        try {
            if (!preferences().edit().remove(key(call)).commit()) {
                throw new IllegalStateException("Could not remove ciphertext");
            }
            call.resolve();
        } catch (Exception error) {
            call.reject("Could not remove Glide session");
        }
    }
}
