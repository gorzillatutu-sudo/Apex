package com.apexcut.mobile;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/** Copies an exported file from the app cache into the phone: video -> Movies/<folder>, image (PNG / GIF) -> Pictures/<folder>, anything else (ZIP / XML) -> Downloads/<folder>. */
@CapacitorPlugin(name = "GallerySaver")
public class GallerySaverPlugin extends Plugin {

    @PluginMethod
    public void save(final PluginCall call) {
        final String uri = call.getString("uri");
        final String name = call.getString("name", "ApexCut.mp4");
        final String mime = call.getString("mime", "video/mp4");
        final String folder = call.getString("folder", "Apex Cut");
        if (uri == null) { call.reject("No file"); return; }
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    String path = Uri.parse(uri).getPath();
                    File src = new File(path == null ? uri : path);
                    if (!src.exists()) { call.reject("File not found"); return; }
                    String out;
                    if (Build.VERSION.SDK_INT >= 29) out = saveQ(src, name, mime, folder);
                    else out = saveLegacy(src, name, mime, folder);
                    JSObject r = new JSObject();
                    r.put("uri", out);
                    call.resolve(r);
                } catch (Exception e) {
                    call.reject(e.getMessage() == null ? "Save failed" : e.getMessage());
                }
            }
        }).start();
    }

    private String saveQ(File src, String name, String mime, String folder) throws Exception {
        ContentResolver cr = getContext().getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        Uri col;
        if (mime.startsWith("video/")) {
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/" + folder);
            col = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        } else if (mime.startsWith("image/")) {
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/" + folder);
            col = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        } else {
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + folder);
            col = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
        }
        v.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri item = cr.insert(col, v);
        if (item == null) throw new Exception("Could not create the Gallery entry");
        try {
            InputStream in = new FileInputStream(src);
            OutputStream os = cr.openOutputStream(item);
            if (os == null) { in.close(); throw new Exception("Could not open the Gallery file"); }
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
            os.flush(); os.close(); in.close();
            ContentValues done = new ContentValues();
            done.put(MediaStore.MediaColumns.IS_PENDING, 0);
            cr.update(item, done, null, null);
        } catch (Exception e) {
            try { cr.delete(item, null, null); } catch (Exception ignored) {}
            throw e;
        }
        return item.toString();
    }

    private String saveLegacy(File src, String name, String mime, String folder) throws Exception {
        String base0 = mime.startsWith("video/") ? Environment.DIRECTORY_MOVIES : mime.startsWith("image/") ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS;
        File dir = new File(Environment.getExternalStoragePublicDirectory(base0), folder);
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("Could not create the folder");
        File dst = new File(dir, name);
        int i = 1;
        String base = name, ext = "";
        int dot = name.lastIndexOf('.');
        if (dot > 0) { base = name.substring(0, dot); ext = name.substring(dot); }
        while (dst.exists()) dst = new File(dir, base + " (" + (i++) + ")" + ext);
        InputStream in = new FileInputStream(src);
        OutputStream os = new java.io.FileOutputStream(dst);
        byte[] buf = new byte[1 << 16];
        int n;
        while ((n = in.read(buf)) > 0) os.write(buf, 0, n);
        os.flush(); os.close(); in.close();
        MediaScannerConnection.scanFile(getContext(), new String[]{dst.getAbsolutePath()}, null, null);
        return dst.getAbsolutePath();
    }
}
