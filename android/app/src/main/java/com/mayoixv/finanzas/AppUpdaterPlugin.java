package com.mayoixv.finanzas;

import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Actualiza la app desde los Releases de GitHub: descarga el APK y abre el instalador de Android.
 * Android solo acepta la actualización si viene firmada con la misma llave, así que un APK ajeno no se instala.
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    /** La versión de depuración (la del teléfono del desarrollador) tiene otra firma: no puede instalar los Releases. */
    @PluginMethod
    public void info(PluginCall call) {
        boolean debuggable = (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        JSObject ret = new JSObject();
        ret.put("canUpdate", !debuggable);
        // La versión completa trae el lector de avisos del banco; la de testers no (ver productFlavors).
        boolean completa;
        try {
            getContext().getPackageManager().getServiceInfo(new ComponentName(getContext(), BankNotificationListener.class), 0);
            completa = true;
        } catch (PackageManager.NameNotFoundException e) {
            completa = false;
        }
        ret.put("completa", completa);
        call.resolve(ret);
    }

    /**
     * Si Android aún no deja que Kuarto instale apps, abre ese permiso y devuelve needsPermission (el usuario vuelve y
     * toca Actualizar otra vez). Si ya puede, descarga el APK y abre el instalador.
     */
    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) {
            call.reject("Dirección de descarga inválida");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }
        // En su propio hilo: los demás plugins (como la base de datos) no esperan a que termine la descarga.
        new Thread(() -> {
            try {
                File dir = new File(getContext().getCacheDir(), "updates");
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
                File apk = new File(dir, "kuarto.apk");
                download(url, apk);
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                Intent install = new Intent(Intent.ACTION_VIEW);
                install.setDataAndType(uri, "application/vnd.android.package-archive");
                install.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(install);
                JSObject ret = new JSObject();
                ret.put("needsPermission", false);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("No se pudo descargar la actualización", e);
            }
        }).start();
    }

    /** Sigue las redirecciones de GitHub hacia su servidor de archivos (solo https). */
    private static void download(String address, File to) throws Exception {
        String current = address;
        for (int hops = 0; hops < 5; hops++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                current = conn.getHeaderField("Location");
                conn.disconnect();
                if (current == null || !current.startsWith("https://")) throw new Exception("Redirección inválida");
                continue;
            }
            if (code != 200) throw new Exception("HTTP " + code);
            try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(to)) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            } finally {
                conn.disconnect();
            }
            return;
        }
        throw new Exception("Demasiadas redirecciones");
    }
}
