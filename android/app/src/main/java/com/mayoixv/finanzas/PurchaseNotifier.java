package com.mayoixv.finanzas;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Notificación propia "Compra por confirmar" cuando llega el aviso de una compra del banco. Al tocarla se abre
 * "Por confirmar". Si el correo y la app del banco avisan la misma compra, se notifica una sola vez.
 */
final class PurchaseNotifier {
    static final String CHANNEL = "compras_banco";
    static final String PREFS = "bank_notifications";
    static final String PREF_NOTIFY = "notify_purchases";
    static final String EXTRA_ROUTE = "finanzas_route";
    private static final long DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

    // Monto y comercio de los avisos de Qik, Banreservas y Popular (el detalle lo lee la app con parseBankAlert).
    private static final Pattern QIK = Pattern.compile("transacci[oó]n de \\*?(RD\\$|US\\$|\\$)\\s*([\\d,]+\\.\\d{2})\\*? en \\*?(.+?)\\*? con tu tarjeta", Pattern.CASE_INSENSITIVE);
    private static final Pattern RESERVAS_AMOUNT = Pattern.compile("Monto: (DOP|USD)\\s*([\\d,]+\\.\\d{2})", Pattern.CASE_INSENSITIVE);
    private static final Pattern RESERVAS_SHOP = Pattern.compile("Comercio: (.+?)(?= Fecha de transacci|$)", Pattern.CASE_INSENSITIVE);
    private static final Pattern POPULAR = Pattern.compile("utilizar su tarjeta[\\s\\S]*?(RD\\$|US\\$)\\s*([\\d,]+\\.\\d{2})", Pattern.CASE_INSENSITIVE);

    /** Últimas compras notificadas (clave → hora), para no repetir. */
    private static final Map<String, Long> recent = new LinkedHashMap<>();

    private PurchaseNotifier() {}

    static boolean enabled(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(PREF_NOTIFY, true);
    }

    static void setEnabled(Context ctx, boolean on) {
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        e.putBoolean(PREF_NOTIFY, on);
        e.apply();
    }

    /** Si el texto es una compra (no un reverso), muestra la notificación. */
    static void maybeNotify(Context ctx, String raw) {
        if (!enabled(ctx) || !NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return;
        String text = raw.replace('|', ' ').replaceAll("\\s+", " ");
        if (text.toLowerCase().contains("reversada")) return;

        String amount = null;
        String shop = "";
        Matcher m = QIK.matcher(text);
        if (m.find()) {
            amount = money(m.group(1), m.group(2));
            shop = m.group(3).trim();
        } else if ((m = RESERVAS_AMOUNT.matcher(text)).find() && text.toLowerCase().contains("presenta un consumo")) {
            amount = money(m.group(1), m.group(2));
            Matcher s = RESERVAS_SHOP.matcher(text);
            if (s.find()) shop = s.group(1).trim();
        } else if ((m = POPULAR.matcher(text)).find()) {
            amount = money(m.group(1), m.group(2));
        }
        if (amount == null) return;
        // Solo el monto: el correo y la app del banco escriben el comercio distinto.
        if (isDuplicate(amount)) return;

        ensureChannel(ctx);
        Intent open = new Intent(ctx, MainActivity.class);
        open.putExtra(EXTRA_ROUTE, "/por-confirmar");
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        String body = shop.isEmpty() ? amount + ". Toca para elegir su categoría." : amount + " en " + shop + ". Toca para elegir su categoría.";
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_finanzas)
                .setContentTitle("Compra por confirmar")
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setContentIntent(tap)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER);
        try {
            NotificationManagerCompat.from(ctx).notify((int) (System.currentTimeMillis() & 0x7fffffff), b.build());
        } catch (SecurityException ignored) {
            // Sin permiso de notificaciones (Android 13+): la compra igual queda en "Por confirmar".
        }
    }

    private static String money(String symbol, String value) {
        boolean pesos = symbol.equalsIgnoreCase("RD$") || symbol.equalsIgnoreCase("DOP");
        return (pesos ? "RD$" : "US$") + value;
    }

    private static synchronized boolean isDuplicate(String key) {
        long now = System.currentTimeMillis();
        for (Iterator<Map.Entry<String, Long>> it = recent.entrySet().iterator(); it.hasNext(); ) {
            if (now - it.next().getValue() > DUPLICATE_WINDOW_MS) it.remove();
        }
        if (recent.containsKey(key)) return true;
        recent.put(key, now);
        return false;
    }

    private static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Compras del banco", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Avisa cuando llega una compra para confirmar");
        nm.createNotificationChannel(ch);
    }
}
