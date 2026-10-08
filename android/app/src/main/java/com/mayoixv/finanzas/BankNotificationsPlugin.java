package com.mayoixv.finanzas;

import android.content.Intent;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/** Puente entre BankNotificationListener y la app: permiso, abrir los ajustes de Android y leer lo guardado. */
@CapacitorPlugin(name = "BankNotifications")
public class BankNotificationsPlugin extends Plugin {

    /** Pantalla a abrir cuando la app arrancó desde la notificación "Compra por confirmar". */
    private String pendingRoute;

    @Override
    public void load() {
        BankNotificationListener.plugin = this;
        pendingRoute = routeOf(getActivity().getIntent());
    }

    /** Con la app ya abierta, tocar la notificación avisa a la app para que navegue. */
    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String route = routeOf(intent);
        if (route == null) return;
        JSObject data = new JSObject();
        data.put("route", route);
        notifyListeners("open", data);
    }

    private static String routeOf(Intent intent) {
        if (intent == null) return null;
        String route = intent.getStringExtra(PurchaseNotifier.EXTRA_ROUTE);
        intent.removeExtra(PurchaseNotifier.EXTRA_ROUTE);
        return route;
    }

    @PluginMethod
    public void takeRoute(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("route", pendingRoute);
        pendingRoute = null;
        call.resolve(ret);
    }

    @PluginMethod
    public void getNotifyPurchases(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", PurchaseNotifier.enabled(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void setNotifyPurchases(PluginCall call) {
        PurchaseNotifier.setEnabled(getContext(), Boolean.TRUE.equals(call.getBoolean("enabled", true)));
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (BankNotificationListener.plugin == this) BankNotificationListener.plugin = null;
    }

    /** Llamado por el servicio cuando guarda un aviso con la app abierta. */
    void onPosted() {
        notifyListeners("posted", new JSObject());
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        boolean on = NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("enabled", on);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /** Devuelve los avisos guardados y vacía el archivo. */
    @PluginMethod
    public void drain(PluginCall call) {
        JSArray items = new JSArray();
        synchronized (BankNotificationListener.class) {
            File file = new File(getContext().getFilesDir(), BankNotificationListener.FILE);
            if (file.exists()) {
                try (BufferedReader in = new BufferedReader(new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = in.readLine()) != null) {
                        if (line.trim().isEmpty()) continue;
                        try {
                            items.put(new JSONObject(line));
                        } catch (Exception ignored) {
                            // Una línea dañada no impide leer las demás.
                        }
                    }
                } catch (Exception e) {
                    call.reject("No se pudieron leer los avisos guardados", e);
                    return;
                }
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
        }
        JSObject ret = new JSObject();
        ret.put("items", items);
        call.resolve(ret);
    }
}
