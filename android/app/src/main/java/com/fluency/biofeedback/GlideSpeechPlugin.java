package com.fluency.biofeedback;

import android.content.Intent;
import android.media.AudioFormat;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelFileDescriptor;
import android.speech.RecognitionListener;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.util.ArrayList;

@CapacitorPlugin(name = "GlideSpeech")
public class GlideSpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private Attempt active;

    @PluginMethod
    public void transcribe(PluginCall call) {
        String encoded = call.getString("pcm");
        if (encoded == null || encoded.length() > 1_280_000) {
            resolve(call, "");
            return;
        }
        final byte[] pcm;
        try {
            pcm = Base64.decode(encoded, Base64.NO_WRAP);
        } catch (IllegalArgumentException ignored) {
            resolve(call, "");
            return;
        }
        main.post(() -> start(call, pcm));
    }

    private void start(PluginCall call, byte[] pcm) {
        if (active != null) active.finish("");
        if (Build.VERSION.SDK_INT < 33 || pcm.length == 0 || pcm.length % 2 != 0
                || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            resolve(call, "");
            return;
        }
        Attempt attempt = new Attempt(call);
        active = attempt;
        main.postDelayed(attempt.timeout, 8000);
        try {
            attempt.recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            attempt.recognizer.setRecognitionListener(attempt);
            Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                    .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "sk-SK")
                    .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            attempt.recognizer.checkRecognitionSupport(request, getContext().getMainExecutor(),
                    new RecognitionSupportCallback() {
                @Override public void onSupportResult(RecognitionSupport support) {
                    if (active != attempt) return;
                    boolean slovakInstalled = support.getInstalledOnDeviceLanguages().stream()
                            .anyMatch(lang -> lang.equalsIgnoreCase("sk") || lang.equalsIgnoreCase("sk-SK"));
                    if (slovakInstalled) attempt.listen(request, pcm);
                    else attempt.finish("");
                }
                @Override public void onError(int error) { attempt.finish(""); }
            });
        } catch (RuntimeException ignored) {
            attempt.finish("");
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        main.post(() -> {
            if (active != null) active.finish("");
            call.resolve();
        });
    }

    @Override protected void handleOnPause() {
        main.post(() -> { if (active != null) active.finish(""); });
    }

    @Override protected void handleOnDestroy() {
        main.post(() -> { if (active != null) active.finish(""); });
    }

    private static void resolve(PluginCall call, String text) {
        call.resolve(new JSObject().put("text", text));
    }

    private final class Attempt implements RecognitionListener {
        private final PluginCall call;
        private final Runnable timeout = () -> finish("");
        private final ArrayList<String> segments = new ArrayList<>();
        private SpeechRecognizer recognizer;
        private ParcelFileDescriptor input;
        private ParcelFileDescriptor output;

        Attempt(PluginCall call) { this.call = call; }

        void listen(Intent request, byte[] pcm) {
            try {
                ParcelFileDescriptor[] pipe = ParcelFileDescriptor.createPipe();
                input = pipe[0];
                output = pipe[1];
                request.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, input)
                       .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1)
                       .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, AudioFormat.ENCODING_PCM_16BIT)
                       .putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, 16000)
                       .putExtra(RecognizerIntent.EXTRA_SEGMENTED_SESSION, RecognizerIntent.EXTRA_AUDIO_SOURCE);
                recognizer.startListening(request);
                ParcelFileDescriptor sink = output;
                new Thread(() -> {
                    try (ParcelFileDescriptor.AutoCloseOutputStream stream =
                                 new ParcelFileDescriptor.AutoCloseOutputStream(sink)) {
                        stream.write(pcm);
                    } catch (IOException ignored) { /* The recognizer may close the pipe early. */ }
                }, "GlideSpeechAudio").start();
            } catch (IOException | RuntimeException ignored) {
                finish("");
            }
        }

        void finish(String text) {
            if (active != this) return;
            active = null;
            main.removeCallbacks(timeout);
            if (recognizer != null) {
                try { recognizer.destroy(); } catch (RuntimeException ignored) {}
            }
            close(input);
            close(output);
            resolve(call, text);
        }

        private void close(ParcelFileDescriptor fd) {
            if (fd != null) {
                try { fd.close(); } catch (IOException ignored) {}
            }
        }

        private String best(Bundle results) {
            ArrayList<String> words = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            return words == null || words.isEmpty() ? "" : words.get(0);
        }

        @Override public void onResults(Bundle results) {
            String text = best(results);
            finish(text.isBlank() ? String.join(" ", segments) : text);
        }
        @Override public void onSegmentResults(Bundle results) { segments.add(best(results)); }
        @Override public void onEndOfSegmentedSession() { finish(String.join(" ", segments)); }
        @Override public void onError(int error) { finish(""); }
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rms) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onPartialResults(Bundle results) {}
        @Override public void onEvent(int eventType, Bundle params) {}
    }
}
