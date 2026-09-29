package com.simiono.clefhanger

import android.Manifest
import android.content.pm.PackageManager
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.PI
import kotlin.math.max
import kotlin.math.sin

/** Android I/O boundary. Lesson rules and pitch classification live in Rust. */
class MainActivity : FlutterActivity() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val recording = AtomicBoolean(false)
    private var recorder: AudioRecord? = null
    private var captureThread: Thread? = null
    private var sink: EventChannel.EventSink? = null
    private var pendingStart: MethodChannel.Result? = null
    private val sampleRate = 16_000
    private val permissionCode = 8104

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, "clefhanger/audio_samples")
            .setStreamHandler(object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink) { sink = events }
                override fun onCancel(arguments: Any?) { sink = null; stopCapture() }
            })
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "clefhanger/native")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "startMic" -> startMic(result)
                    "openSettings" -> {
                        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
                        startActivity(intent)
                        result.success(null)
                    }
                    "stopMic" -> {
                        pendingStart?.error("mic_cancelled", "Microphone request cancelled.", null)
                        pendingStart = null
                        stopCapture()
                        result.success(null)
                    }
                    "playTone" -> {
                        val frequency = call.argument<Double>("frequency")
                        if (frequency == null || frequency !in 80.0..1000.0) {
                            result.error("bad_frequency", "Expected an audible note", null)
                        } else {
                            playTone(frequency)
                            result.success(null)
                        }
                    }
                    "readProgress" -> {
                        val key = call.argument<String>("key") ?: "first-steps"
                        result.success(getPreferences(0).getString("progress.$key", null))
                    }
                    "writeProgress" -> {
                        val key = call.argument<String>("key") ?: "first-steps"
                        val value = call.argument<String>("value") ?: "{}"
                        if (getPreferences(0).edit().putString("progress.$key", value).commit()) {
                            result.success(null)
                        } else {
                            result.error("storage_failed", "Could not save local progress.", null)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun startMic(result: MethodChannel.Result) {
        if (recording.get()) { result.success(null); return }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            pendingStart = result
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), permissionCode)
            return
        }
        startCapture(result)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != permissionCode) return
        val result = pendingStart ?: return
        pendingStart = null
        if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startCapture(result)
        else result.error("mic_denied", "Microphone permission denied. Allow it in Android Settings, then retry.", null)
    }

    private fun startCapture(result: MethodChannel.Result) {
        val minBytes = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
        if (minBytes <= 0) { result.error("mic_unavailable", "This device cannot start mono microphone input.", null); return }
        try {
            val input = AudioRecord(
                MediaRecorder.AudioSource.MIC, sampleRate, AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT, max(minBytes, 8192)
            )
            if (input.state != AudioRecord.STATE_INITIALIZED) {
                input.release()
                result.error("mic_unavailable", "Microphone initialization failed.", null)
                return
            }
            recorder = input
            input.startRecording()
            recording.set(true)
            captureThread = Thread {
                val chunk = ShortArray(2048)
                while (recording.get()) {
                    val count = input.read(chunk, 0, chunk.size)
                    if (count > 0) {
                        val bytes = ByteBuffer.allocate(count * 2).order(ByteOrder.LITTLE_ENDIAN)
                        repeat(count) { bytes.putShort(chunk[it]) }
                        val packet = bytes.array()
                        mainHandler.post { if (recording.get()) sink?.success(packet) }
                    } else if (count < 0) {
                        mainHandler.post { sink?.error("mic_read", "Microphone capture stopped.", count) }
                        break
                    }
                }
            }.apply { name = "ClefHanger microphone"; start() }
            result.success(null)
        } catch (error: SecurityException) {
            stopCapture()
            result.error("mic_denied", error.message ?: "Microphone permission denied.", null)
        } catch (error: Exception) {
            stopCapture()
            result.error("mic_unavailable", error.message ?: "Could not start microphone.", null)
        }
    }

    private fun stopCapture() {
        if (!recording.getAndSet(false) && recorder == null) return
        val input = recorder
        recorder = null
        try { input?.stop() } catch (_: IllegalStateException) { }
        try { input?.release() } catch (_: Exception) { }
        captureThread = null
    }

    /** Short piano-like reference tone. Dart blocks scoring until sound + acoustic tail ends. */
    private fun playTone(frequency: Double) {
        Thread {
            val length = (sampleRate * 0.58).toInt()
            val pcm = ShortArray(length) { index ->
                val t = index.toDouble() / sampleRate
                val envelope = (1.0 - index.toDouble() / length).let { it * it }
                val wave = sin(2 * PI * frequency * t) + 0.25 * sin(4 * PI * frequency * t)
                (wave * envelope * 9000).toInt().coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt()).toShort()
            }
            var output: AudioTrack? = null
            try {
                output = AudioTrack.Builder()
                    .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                    .setAudioFormat(AudioFormat.Builder().setEncoding(AudioFormat.ENCODING_PCM_16BIT).setSampleRate(sampleRate).setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .setBufferSizeInBytes(pcm.size * 2)
                    .build()
                output.write(pcm, 0, pcm.size)
                output.play()
                Thread.sleep(700)
            } catch (_: Exception) {
                // Audio output can disappear while this short tone is playing.
            } finally {
                try { output?.stop() } catch (_: IllegalStateException) { }
                output?.release()
            }
        }.apply { name = "ClefHanger reference note"; start() }
    }

    override fun onPause() {
        // The runtime permission dialog also pauses this activity. Keep a pending
        // permission request alive; Flutter cancels it if the app truly hides.
        if (pendingStart == null) stopCapture()
        super.onPause()
    }

    override fun onDestroy() {
        stopCapture()
        super.onDestroy()
    }
}
