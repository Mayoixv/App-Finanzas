package com.mayoixv.finanzas;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;
import java.util.regex.Pattern;

/**
 * Recibe las notificaciones (con el permiso que el usuario activa en Android) y guarda solo las de Gmail y de las
 * apps de los bancos que traen un monto. Todas las demás se ignoran y nada sale del teléfono.
 * La app las lee y las pasa a "Por confirmar" cuando se abre (BankNotificationsPlugin.drain).
 */
public class BankNotificationListener extends NotificationListenerService {
    /** Gmail y la app de Qik. Para otro banco, se agrega aquí su paquete. */
    static final Set<String> PACKAGES = new HashSet<>(Arrays.asList("com.google.android.gm", "com.qik.android.app"));
    static final String FILE = "bank-notifications.jsonl";
    /** Si la app no se abre en mucho tiempo, no se guardan más que estas (las más viejas se pierden). */
    private static final int MAX_BYTES = 256 * 1024;
    private static final Pattern MONEY = Pattern.compile("(RD\\$|DOP|US\\$|USD|\\$\\s?\\d)");

    /** El plugin, mientras la app está abierta, para avisarle al momento. */
    static volatile BankNotificationsPlugin plugin;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (!PACKAGES.contains(sbn.getPackageName())) return;
        Bundle extras = sbn.getNotification().extras;
        StringBuilder text = new StringBuilder();
        append(text, extras.getCharSequence(Notification.EXTRA_TITLE));
        append(text, extras.getCharSequence(Notification.EXTRA_TEXT));
        append(text, extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        append(text, extras.getCharSequence(Notification.EXTRA_SUB_TEXT));
        CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
        if (lines != null) for (CharSequence line : lines) append(text, line);
        String all = text.toString();
        if (!MONEY.matcher(all).find()) return;

        try {
            JSONObject item = new JSONObject();
            item.put("text", all);
            item.put("receivedAt", isoNow());
            item.put("package", sbn.getPackageName());
            save(item);
            PurchaseNotifier.maybeNotify(this, all);
            BankNotificationsPlugin p = plugin;
            if (p != null) p.onPosted();
        } catch (Exception e) {
            // Un aviso que no se pudo guardar se pierde; nunca debe tumbar el servicio.
        }
    }

    private static void append(StringBuilder sb, CharSequence part) {
        if (part == null || part.length() == 0) return;
        if (sb.indexOf(part.toString()) >= 0) return;
        if (sb.length() > 0) sb.append('\n');
        sb.append(part);
    }

    /** Mismo candado que BankNotificationsPlugin.drain, para no leer el archivo mientras se escribe. */
    private void save(JSONObject item) throws Exception {
        synchronized (BankNotificationListener.class) {
            File file = new File(getFilesDir(), FILE);
            if (file.length() > MAX_BYTES) return;
            try (FileOutputStream out = new FileOutputStream(file, true)) {
                out.write((item.toString() + "\n").getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    private static String isoNow() {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date());
    }
}
